import * as THREE from 'three';
import { FilmCamera } from '../camera/FilmCamera.js';
import { easeInOutCubic } from '../animation/easing.js';
import { el } from '../ui/FilmUI.js';
import { meshesOf, partNodeOf } from '../scene/Looks.js';
import { CUE } from '../narration/script.js';
import { surfaceAnchor } from './SurfaceAnchor.js';

/**
 * Explore (platform pattern): a temporary bottom-left panel. The film pauses,
 * the camera travels to the chosen model, the learner can turn/zoom it and tap
 * parts. Only models already taught are available (each unlocks after the shot
 * that teaches it). Closing restores the exact film frame (the film camera is a
 * function of time) and hands the narration back to the film.
 */
export class ExploreController {
  constructor(app, { models, parts }) {
    this.app = app;
    this.models = models;
    this.parts = parts;
    this.active = false;
    this.soil = 'solid';
  }

  unlocked(m) {
    const shot = this.app.timeline.byId.get(m.after);
    return this.app.progress.furthest >= (shot ? shot.end - 1 : Infinity);
  }

  open(modelId = null) {
    const app = this.app;
    const avail = this.models.filter((m) => this.unlocked(m));
    if (!avail.length) {
      app.ui.showHint('Explore opens once the plant has been introduced. Keep watching!');
      setTimeout(() => app.ui.showHint(''), 2600);
      return;
    }
    this.active = true;
    this.wasPlaying = app.film.playing;
    app.film.pause();
    app.film.hold('explore');
    app.world.owner = this;
    this.time = app.progress.furthest;
    app.ui.quietWords(true);
    app.ui.setPill('Return to the lesson');
    app.labels.clear();
    const stageNow = app.world.current;
    // the requested model if it has been taught, else the one for the current stage, else the latest taught
    const pick = (modelId && avail.find((m) => m.id === modelId)) || avail.find((m) => m.stage === stageNow) || avail[avail.length - 1];
    this.select(pick.id, { speak: false });
    app.ui.announce('Explore. Choose a model and tap its parts. Press Escape to return to the lesson.');
    app.cue(CUE.exploreIntro);
  }

  select(id, { speak = true } = {}) {
    const app = this.app;
    const m = this.models.find((x) => x.id === id);
    if (!m || !this.unlocked(m)) return;
    if (!app.world.stageReady(m.stage)) {
      app.ui.showHint('Loading the model…');
      app.world.waitStage(m.stage).then(() => {
        app.ui.showHint('');
        if (this.active) this.select(id, { speak });
      });
      return;
    }
    if (speak) app.cue(CUE.exploreModel(m.id));
    this.model = m;
    this.selected = null;
    this.soil = m.soil || 'solid';
    app.world.showStage(m.stage);
    // travel to the model framing, then free orbit
    const from = { ...app.camera.pose };
    const to = app.camera.resolve(m.preset);
    this.travel = { from, to, t: 0, dur: app.camera.reduced ? 0.01 : 1.1 };
    app.orbit.disable();
    this.partsMap = new Map();
    app.world.stages[m.stage].traverse((o) => {
      const n = partNodeOf(o);
      if (o.isMesh && n && m.parts.includes(n.userData.part)) {
        if (!this.partsMap.has(n.userData.part)) this.partsMap.set(n.userData.part, new Set());
        this.partsMap.get(n.userData.part).add(n);
      }
    });
    app.picker.enable([...this.partsMap.values()].flatMap((s) => [...s]), { onPick: (node, point) => this.selectPart(node.userData.part, node, point) });
    this.render();
    app.labels.set(m.focus?.length ? [{ anchor: m.focus[0], text: this.parts[this.partOf(m.focus[0])]?.title || m.title, dir: 'right' }] : []);
    app.labels.showAll();
  }

  partOf(nodeName) {
    return this.app.assets.find(nodeName)?.userData.part;
  }

  selectPart(part, node = null, point = null) {
    const nodes = [...(this.partsMap.get(part) || [])];
    this.selected = { part, nodes };
    const info = this.parts[part];
    // V2.4 label audit: the label points at a VISIBLE point ON the selected structure (not its
    // bounding-box centre, which for rings and shells is the hollow middle); a tapped point first
    const anchor = (info?.labelAnchor && this.app.assets.find(info.labelAnchor)) ||
      surfaceAnchor({ nodes, stage: this.app.world.stages[this.model.stage], camera: this.app.stage.camera, prefer: point ? { point } : null });
    this.app.labels.set([{ anchor, text: info?.title || part, dir: info?.labelDir || 'right', focus: true }]);
    this.app.labels.showAll();
    this.renderInfo(info);
    this.app.ui.announce(`${info?.title}. ${info?.what} ${info?.learned || ''}`);
  }

  highlight() {
    if (this.selected) return this.selected.nodes.flatMap(meshesOf);
    return (this.model.focus || []).flatMap((n) => meshesOf(this.app.assets.get(n)));
  }

  render() {
    const ui = this.app.ui;
    const list = el('ul', { class: 'film-list' }, this.models.map((m) => {
      const ok = this.unlocked(m);
      return el('li', {}, el('button', {
        type: 'button', 'aria-pressed': String(m.id === this.model.id), disabled: !ok,
        onClick: () => this.select(m.id),
      }, m.title, el('small', {}, ok ? '' : 'Later in the lesson')));
    }));
    this.info = el('div', { class: 'film-info', 'aria-live': 'polite' }, el('p', {}, this.model.about));
    const partBtns = el('div', { class: 'film-parts', role: 'group', 'aria-label': 'Parts' },
      [...this.partsMap.keys()].map((p) => el('button', { class: 'film-btn', type: 'button', onClick: () => this.selectPart(p) }, this.parts[p]?.title || p)));
    ui.explore.replaceChildren(
      el('h2', {}, 'Explore'),
      list,
      el('h2', { style: 'margin-top:6px' }, this.model.title),
      partBtns,
      this.info,
      el('p', { style: 'font-size:12.5px;color:var(--film-ink-3)' }, 'Drag to turn · pinch or scroll to zoom · tap a part'),
      el('div', { class: 'film-row' },
        el('button', { class: 'film-btn', type: 'button', onClick: () => this.select(this.model.id) }, 'Reset view'),
        el('button', { class: 'film-btn film-btn--primary', type: 'button', onClick: () => this.close() }, 'Return to the lesson')));
    ui.explore.hidden = false;
  }

  renderInfo(info) {
    if (!info) return;
    this.info.replaceChildren(
      el('h3', {}, info.title),
      el('p', {}, info.what),
      info.learned ? el('p', { class: 'learned' }, el('b', {}, 'From the lesson: '), info.learned) : '');
  }

  update(dt) {
    if (!this.active) return;
    const app = this.app;
    const tr = this.travel;
    if (tr) {
      tr.t += dt;
      const e = easeInOutCubic(Math.min(1, tr.t / tr.dur));
      app.camera.apply(FilmCamera.lerpPose(tr.from, tr.to, e));
      if (e >= 1) {
        this.travel = null;
        app.orbit.enable({ target: tr.to.target, ...(this.model.orbit || {}) });
      }
    }
  }

  close() {
    if (!this.active) return;
    const app = this.app;
    this.active = false;
    app.orbit.disable();
    app.picker.disable();
    app.narration.stopCue();
    app.world.owner = null;
    app.ui.explore.hidden = true;
    app.ui.quietWords(false);
    app.ui.setPill('Explore');
    app.labels.setShot(app.film.shot);
    app.film.release('explore');
    app.looks.snap = true;
    if (this.wasPlaying) app.film.play();
    app.ui.pill.focus();
  }
}

export { THREE };
