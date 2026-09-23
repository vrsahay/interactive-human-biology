import { smoothstep } from '../animation/easing.js';

const VEIL_TONE = { stem: 'stem', xylem: 'stem', root: 'soil', rootHairs: 'soil' };

/**
 * The film: one clock, shots laid end to end, everything else derived from it.
 *
 * Each frame:  time → shot → camera pose, view (stage, highlight, dim, shell),
 *              process tracks, labels, heading, caption line, veil, narration.
 * Because every layer is a function of the clock, play/pause/scrub/replay and
 * returning from Explore are exact. Seeking cuts the camera (no travel).
 *
 * The narration follows the clock (NarrationPlayer); each clip fits inside its shot,
 * so the film never waits for audio. Holds stop the clock without stopping the world:
 *   'interaction'  a "Your turn" task is open
 *   'explore' | 'recall' | 'dialog'
 */
export class Film {
  constructor({ timeline, camera, looks, labels, narration, ui, world, bus }) {
    Object.assign(this, { timeline, camera, looks, labels, narration, ui, world, bus });
    this.t = 0;
    this.playing = false;
    this.holds = new Set();
    this.shot = null;
    this.startPose = null;
    this.completed = new Set();
    this.seekCount = 0;
    this.seeking = true;
    this.ended = false;
    this.words = 'captions';
  }

  get total() {
    return this.timeline.total;
  }

  /** The clock is moving (narration may speak). */
  get running() {
    return this.playing && this.holds.size === 0 && !this.ended;
  }

  play() {
    if (this.ended) this.seek(0);
    this.playing = true;
    this.bus.emit('film:play');
  }

  pause() {
    this.playing = false;
    this.bus.emit('film:pause');
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  hold(reason) {
    this.holds.add(reason);
  }

  release(reason) {
    this.holds.delete(reason);
  }

  seek(ms, { play = this.playing } = {}) {
    this.t = Math.max(0, Math.min(this.total - 1, ms));
    this.seeking = true;
    this.seekCount++;
    this.ended = false;
    this.holds.delete('interaction');
    this.world.closeInteraction?.();
    this.narration.stopCue();
    this.narration.stopFilm();
    this.looks.snap = true;
    if (play) this.playing = true;
    this.bus.emit('film:seek', this.t);
  }

  seekShot(id, opts) {
    const s = this.timeline.byId.get(id);
    if (s) this.seek(s.start, opts);
  }

  seekChapter(id, opts) {
    const c = this.timeline.chapters.find((x) => x.id === id);
    if (c) this.seek(c.start, opts);
  }

  seekSection(id, opts) {
    const s = this.timeline.sections.find((x) => x.id === id);
    if (s) this.seek(s.start, opts);
  }

  enterShot(shot) {
    const natural = !this.seeking && this.shot && shot.index === this.shot.index + 1;
    this.startPose = natural ? { ...this.camera.pose } : null;
    this.shot = shot;
    this.world.enterShot?.(shot, { natural });
    this.labels.setShot(shot);
    this.ui.setShot(shot, this.timeline.sectionAt(shot.start));
    const next = this.timeline.shots[shot.index + 1];
    if (next) this.narration.prefetch(next.id);
    this.bus.emit('film:shot', shot);
  }

  update(dt) {
    const tl = this.timeline;
    // ---- clock
    if (this.running) {
      // the shot at the clock's time (not the last rendered one: after a seek they differ)
      const cur = tl.locate(this.t);
      let next = this.t + dt * 1000;
      if (cur && next >= cur.end - 1 && cur.interaction && !this.completed.has(cur.id)) {
        // a "Your turn" must be done before the film moves on
        next = cur.end - 1;
        this.openInteraction(cur);
      }
      if (next >= tl.total - 1) {
        next = tl.total - 1;
        if (!this.holds.size) {
          this.ended = true;
          this.playing = false;
          this.bus.emit('film:end');
        }
      }
      this.t = next;
    }

    // ---- shot
    const shot = tl.locate(this.t);
    if (shot !== this.shot) this.enterShot(shot);
    const local = this.t - shot.start;
    // V2.2: a shot may change scale part-way (view.then = { atMs, stage, cameraTarget }), e.g. the
    // pull-back vacuole → cell → LEAF. The second part shows its own model and framing; narration,
    // captions and processes still belong to the shot.
    const then = shot.view?.then;
    const seg = then && local >= then.atMs ? then : null;
    const vShot = seg ? { ...shot, view: { ...shot.view, stage: seg.stage, highlight: [], dim: false }, camera: seg.cameraTarget } : shot;
    const vLocal = seg ? local - seg.atMs : local;
    const vDur = seg ? shot.duration - seg.atMs : shot.duration;
    // V2: a close-up's model loads in the background; if it is not here yet, wait for it
    const stageId = this.world.stageOf?.(vShot);
    const ready = !stageId || this.world.stageReady(stageId);
    if (!ready && !this.holds.has('assets')) {
      this.hold('assets');
      this.ui.showHint('Loading the next model…');
      this.world.waitStage(stageId).then(() => {
        this.release('assets');
        this.ui.showHint('');
        this.looks.snap = true;
        this.seeking = true;
      });
    }
    const snap = this.seeking;
    if (ready) this.seeking = false;
    this.lastSnap = snap;

    // ---- camera (Explore / Recall own the camera while open)
    if (!ready && !this.world.viewOwned?.()) {
      this.looks.resetTargets();
      this.looks.apply(1);
      this.narration.sync(shot.id, local, false, `${shot.id}#${this.seekCount}`);
      return;
    }
    if (!this.world.cameraOwned?.()) {
      const follow = vShot.camera.follow ? this.world.followPose(vShot.camera.follow, this.t, shot, local) : null;
      const pose = this.camera.evalShot(vShot.camera, vLocal, vDur, seg ? null : this.startPose, follow);
      this.camera.apply(pose);
    }

    // ---- view + processes
    if (this.world.viewOwned?.()) {
      this.world.renderOwned(this.world.owner.time ?? this.t);
    } else {
      this.looks.resetTargets();
      this.world.applyView(vShot, vLocal, this.t);
      this.world.renderTracks(tl.activeTracks(this.t), this.t, shot);
    }
    this.looks.apply(snap ? 1 : dt);

    // ---- words and overlays
    const veil = shot.view?.veil;
    let v = 0;
    if (veil === 'in') v = smoothstep(shot.duration - 1000, shot.duration - 80, local);
    else if (veil === 'out') v = 1 - smoothstep(0, 1000, local);
    else if (veil === 'inout') v = Math.max(1 - smoothstep(0, 1000, local), smoothstep(shot.duration - 1000, shot.duration - 80, local));
    if (then) v = Math.max(v, local < then.atMs ? smoothstep(then.atMs - 700, then.atMs, local) : 1 - smoothstep(then.atMs, then.atMs + 900, local));
    this.ui.setVeil(v, VEIL_TONE[vShot.view?.stage] || (shot.section === 'resin' ? 'stem' : 'leaf'));
    this.ui.setHeading(shot, local);
    const line = this.words === 'all' ? tl.wordsAt(shot, local) : tl.captionAt(shot, local);
    this.ui.setCaption(line, `${shot.id}:${tl.sentenceAt(shot, local)}`);
    this.labels.setTime(local);
    this.narration.sync(shot.id, local, this.running, `${shot.id}#${this.seekCount}`);
    this.ui.setTime(this.t, tl.total, tl.chapterAt(this.t), tl.sectionAt(this.t));
  }

  openInteraction(shot) {
    if (this.holds.has('interaction')) return;
    this.hold('interaction');
    this.world.openInteraction(shot, () => {
      this.completed.add(shot.id);
      this.release('interaction');
    });
  }
}
