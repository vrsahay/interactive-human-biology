/**
 * Reviewer tools, only with ?qa=1 (never on the learner surface).
 *   app.qa.selfTest()          every lesson reference resolves; rules hold
 *   app.qa.advance(seconds)    step the film clock deterministically
 *   app.qa.at(shotId, ms)      jump to a moment
 *   app.qa.capture(name)       save a composited frame to docs/qa/captures (dev server)
 *   app.qa.tour([...])         scripted walkthrough (background; poll app.qa.log)
 */
export class QA {
  constructor(app) {
    this.app = app;
    this.log = [];
    this.results = this.selfTest();
    console.log('[qa] self-test', this.results);
  }

  selfTest() {
    const { timeline, camera, world, assets, labels } = this.app;
    const errors = [];
    const warn = [];
    let checks = 0;
    const check = (ok, msg, soft = false) => {
      checks++;
      if (!ok) (soft ? warn : errors).push(msg);
    };
    for (const name of Object.keys(camera.presets)) {
      try {
        camera.resolve(name);
        check(true);
      } catch (e) {
        check(false, `preset ${name}: ${e.message}`);
      }
    }
    const norm = (t) => (t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    for (const s of timeline.shots) {
      check(!!s.narration, `${s.id}: no narration (every shot is narrated)`);
      check(!!s.heading?.title, `${s.id}: no topic heading`);
      const h = norm(s.heading?.title);
      if (h.split(' ').length > 1) check(!norm(s.narration).includes(h), `${s.id}: heading is read aloud in the narration`);
      check(s.captions.length === 1 || s.captions.length === s.sentences.length, `${s.id}: ${s.captions.length} captions for ${s.sentences.length} spoken sentences`);
      for (const c of s.captions) check(c.split(/\s+/).length <= 12, `${s.id}: caption is not concise (${c})`, true);
      check(s.captions.every((c) => norm(c) !== norm(s.narration)), `${s.id}: caption is the whole transcript`);
      check(s.narration.split(/\s+/).length <= 45, `${s.id}: narration longer than 45 words`, true);
      check((s.heading?.title || '').length <= 60, `${s.id}: heading longer than 60 characters`, true);
      check((s.view?.labels || []).length <= (s.view?.labelsMax || 5), `${s.id}: too many labels`);
      if (s.chapter.sections) check(s.chapter.sections.some((x) => x.id === s.section), `${s.id}: no section in a sectioned chapter`);
      if (!s.camera.follow) check(!!camera.presets[s.camera.preset], `${s.id}: unknown preset ${s.camera.preset}`);
      if (s.camera.from) check(!!camera.presets[s.camera.from], `${s.id}: unknown from-preset ${s.camera.from}`);
      check((s.camera.transitionMs || 0) < s.duration, `${s.id}: camera travel longer than the shot`);
      check((s.heading?.appearAtMs || 0) < s.duration, `${s.id}: heading appears after the shot ends`);
      if (this.app.narration.available) check(!!this.app.narration.clip(s.id), `${s.id}: no narration clip`);
      for (const l of s.view?.labels || []) if (typeof l.anchor === 'string') check(!!assets.find(l.anchor), `${s.id}: label anchor ${l.anchor} missing`);
      for (const n of s.view?.highlight || []) check(n.startsWith('@') ? world.group(n).length > 0 : !!assets.find(n), `${s.id}: highlight ${n} missing`);
      check(!/NCERT|textbook|scientists|studies show|validated|schematic|accurate|placeholder|TODO/i.test([s.narration, s.heading?.title, s.heading?.text, ...s.captions].join(' ')), `${s.id}: reviewer/citation wording on the learner surface`);
    }
    for (const tr of timeline.tracks) check(!!world.processes[tr.process], `track: unknown process ${tr.process}`);
    // no two spoken lines too similar
    const words = (t) => new Set(t.toLowerCase().match(/[a-z']+/g));
    const shots = timeline.shots;
    for (let i = 0; i < shots.length; i++) {
      for (let j = i + 1; j < shots.length; j++) {
        const a = words(shots[i].narration);
        const b = words(shots[j].narration);
        const inter = [...a].filter((w) => b.has(w)).length;
        const jac = inter / (a.size + b.size - inter);
        if (jac >= 0.45) warn.push(`${shots[i].id} ~ ${shots[j].id} similar narration (${jac.toFixed(2)})`);
      }
    }
    void labels;
    const res = { checks, errors, warnings: warn, shots: shots.length, chapters: timeline.chapters.length, sections: timeline.sections.length, clipped: timeline.clipped, totalSec: Math.round(timeline.total / 1000) };
    window.__qa = res;
    return res;
  }

  async advance(seconds, fps = 30) {
    const st = this.app.stage;
    st.manual = true;
    const ch = new MessageChannel();
    const tick = () => new Promise((r) => {
      ch.port1.onmessage = () => r();
      ch.port2.postMessage(0);
    });
    const n = Math.max(1, Math.round(seconds * fps));
    for (let i = 0; i < n; i++) {
      st.step(1 / fps, i === n - 1);
      await tick();
    }
    return this.snapshot();
  }

  async at(shotId, ms = 0, settle = 0.4) {
    const s = this.app.timeline.byId.get(shotId);
    this.app.film.seek(s.start + ms, { play: true });
    return this.advance(settle);
  }

  snapshot() {
    const { film, ui, labels, world } = this.app;
    return {
      t: Math.round(film.t),
      shot: film.shot?.id,
      stage: world.current,
      playing: film.playing,
      holds: [...film.holds],
      heading: ui.capTitle.textContent,
      caption: ui.subText || '',
      chapter: ui.chapterLine.textContent,
      narration: this.app.narration.diagnostics(),
      labels: labels.describe(),
      interact: !ui.interact.hidden,
      explore: !ui.explore.hidden,
      recall: !ui.recall.hidden,
      end: !ui.end.hidden,
    };
  }

  async capture(name, scale = 0.6) {
    const { stage, ui, labels } = this.app;
    stage.renderFrame();
    const gl = stage.renderer.domElement;
    const W = Math.round(stage.width * scale);
    const H = Math.round(stage.height * scale);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const bg = g.createRadialGradient(W * 0.55, H * 0.42, 0, W * 0.55, H * 0.42, Math.max(W, H) * 0.8);
    bg.addColorStop(0, '#232a35');
    bg.addColorStop(0.38, '#1a1f28');
    bg.addColorStop(1, '#0b0e13');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.drawImage(gl, 0, 0, W, H);
    const veil = parseFloat(ui.veil.style.opacity || '0');
    if (veil > 0) {
      g.fillStyle = `rgba(11,14,19,${veil * 0.95})`;
      g.fillRect(0, 0, W, H);
    }
    const f = this.app.filmEl.getBoundingClientRect();
    const text = (elm, color, size, weight = 600, bgc = null) => {
      if (!elm || elm.hidden || !elm.offsetParent) return;
      const r = elm.getBoundingClientRect();
      if (!r.width) return;
      const x = (r.left - f.left) * scale;
      const y = (r.top - f.top) * scale;
      if (bgc) {
        g.fillStyle = bgc;
        g.fillRect(x, y, r.width * scale, r.height * scale);
      }
      g.fillStyle = color;
      g.font = `${weight} ${Math.round(size * scale)}px Segoe UI, sans-serif`;
      const lines = elm.innerText.split('\n').filter(Boolean).slice(0, 12);
      lines.forEach((ln, i) => g.fillText(ln.slice(0, 90), x + 4, y + (i + 1) * size * scale * 1.25, r.width * scale));
    };
    for (const it of labels.items) {
      if (it.el.style.visibility === 'hidden' || !it.on) continue;
      g.strokeStyle = 'rgba(242,240,234,0.6)';
      g.beginPath();
      g.moveTo(+it.line.getAttribute('x1') * scale, +it.line.getAttribute('y1') * scale);
      g.lineTo(+it.line.getAttribute('x2') * scale, +it.line.getAttribute('y2') * scale);
      g.stroke();
      text(it.el, '#f2f0ea', 13, 560, 'rgba(12,15,20,0.9)');
    }
    text(ui.chapterLine, '#e2a95c', 13);
    if (ui.caption.classList.contains('is-on')) {
      text(ui.capEyebrow, '#e2a95c', 12);
      text(ui.capTitle, '#f2f0ea', 30, 640);
      text(ui.capText, 'rgba(242,240,234,.8)', 17, 500);
    }
    if (ui.figure.classList.contains('is-on')) text(ui.figure.querySelector('p'), 'rgba(242,240,234,.8)', 14, 500);
    text(ui.subtitle, '#f2f0ea', 19, 500);
    for (const p of [ui.interact, ui.explore, ui.recall, ui.end]) text(p, '#f2f0ea', 14, 500, 'rgba(12,15,20,0.85)');
    text(ui.timeEl, '#f2f0ea', 13);
    const dataUrl = c.toDataURL('image/jpeg', 0.84);
    await fetch('/__qa/capture', { method: 'POST', body: JSON.stringify({ name, dataUrl }) });
    return name;
  }

  /**
   * Narration sync and ownership, in real time (the audio clock cannot be stepped).
   * Needs the film started by a real click (audio unlock). Every 50 ms it samples:
   * audible voices (must be ≤ 1), rewinds (must stay 0), and whether the clip matches the film.
   */
  /**
   * Real-time clock that works even when the page is hidden (animation frames and timers are
   * throttled there; audio is not): a MessageChannel loop steps the stage by wall-clock time.
   */
  startPump() {
    const st = this.app.stage;
    st.manual = true;
    const ch = new MessageChannel();
    let last = performance.now();
    this.pumping = true;
    this.pumpFrames = 0;
    this.waiters = [];
    ch.port1.onmessage = () => {
      if (!this.pumping) return;
      const now = performance.now();
      if (now - last >= 1000 / 30) {
        // render every 4th step: a hidden page starves the GPU, and this test is about the clock and the audio
        st.step(Math.min((now - last) / 1000, 1.0), this.pumpRender !== false && this.pumpFrames % 4 === 0);
        last = now;
        this.pumpFrames++;
      }
      this.waiters = this.waiters.filter((w) => (now >= w.at ? (w.resolve(), false) : true));
      ch.port2.postMessage(0);
    };
    ch.port2.postMessage(0);
  }

  stopPump() {
    this.pumping = false;
    this.app.stage.manual = false;
    this.waiters.forEach((w) => w.resolve());
  }

  sleep(ms) {
    return new Promise((resolve) => this.waiters.push({ at: performance.now() + ms, resolve }));
  }

  async audioTest() {
    const { film, narration: N, timeline: tl, ui } = this.app;
    this.startPump();
    const wait = (ms) => this.sleep(ms);
    const rep = { steps: [], maxAudible: 0, rewindsBefore: N.stats.rewinds, driftSamples: 0, driftOver: 0, fps: 0 };
    this.audio = rep;
    const until = async (cond, ms = 6000) => {
      const t0 = performance.now();
      while (!cond() && performance.now() - t0 < ms) await wait(50);
      return cond();
    };

    let sampling = true;
    const sampler = (async () => {
      while (sampling) {
        const d = N.diagnostics();
        rep.maxAudible = Math.max(rep.maxAudible, d.audible);
        const shot = film.shot;
        const clip = N.clip(shot.id);
        // settled playback only: not within 400 ms of a jump (the element is still loading/seeking then)
        const settled = performance.now() - (this.lastSeekAt || 0) > 400 && N.film.readyState >= 2 && !N.film.seeking && film.t >= shot.start;
        if (settled && clip && d.owner === 'film' && !d.filmPaused && d.filmSrc === clip.url) {
          const expected = (film.t - shot.start - clip.leadInMs) / 1000;
          rep.driftSamples++;
          const off = d.filmTime - expected;
          // behind by less than a stall while speaking faster is the designed recovery: every word kept
          if (off < -0.45 && off > -1.5 && d.rate > 1) rep.catchingUp = (rep.catchingUp || 0) + 1;
          else if (Math.abs(off) > 0.45) {
            rep.driftOver++;
            if ((rep.drift ||= []).length < 12) rep.drift.push({ shot: shot.id, local: Math.round(film.t - shot.start), at: d.filmTime, expected: +expected.toFixed(2), rate: d.rate, seeking: N.film.seeking, ready: N.film.readyState, sinceSeek: Math.round(performance.now() - (this.lastSeekAt || 0)) });
          }
        }
        await wait(50);
      }
    })();
    this.app.bus.on('film:seek', () => (this.lastSeekAt = performance.now()));
    const expectClip = (label, extra = {}) => {
      const d = N.diagnostics();
      const shot = film.shot;
      const clip = N.clip(shot.id);
      const local = film.t - shot.start;
      const inWords = clip && local > clip.leadInMs + 150 && local < clip.leadInMs + clip.durationMs - 150;
      const off = d.filmTime - (local - clip?.leadInMs) / 1000;
      const aligned = Math.abs(off) < 0.45 || (off < 0 && off > -1.5 && d.rate > 1);
      const ok = !inWords || (d.owner === 'film' && d.audible === 1 && d.filmSrc === clip.url && aligned);
      rep.steps.push({ step: label, ok: ok && Object.values(extra).every(Boolean), shot: shot.id, local: Math.round(local), owner: d.owner, audible: d.audible, src: d.filmSrc, at: d.filmTime, rs: N.film.readyState, holding: N.holdingAhead, key: N.key, stats: { plays: N.stats.filmPlays, repos: N.stats.filmRepositions }, ...extra });
    };
    const check = (label, cond, info = {}) => rep.steps.push({ step: label, ok: !!cond, ...info });

    const f0 = performance.now();
    film.play();
    await wait(2500);
    expectClip('playing from the start');

    // restart
    this.app.ui.handlers.onReplay();
    await wait(200);
    const oldVoice = () => { const d = N.diagnostics(); const c = N.clip(film.shot.id); const own = c && d.filmSrc === c.url && film.t - film.shot.start >= c.leadInMs; return { silent: d.audible === 0 || own, src: d.filmSrc, local: Math.round(film.t - film.shot.start), at: d.filmTime }; };
    let ov = oldVoice();
    check('restart: previous voice silenced, new clip waits for its lead-in', ov.silent && (ov.local >= 350 || N.diagnostics().audible === 0), ov);
    await wait(1200);
    expectClip('restart: first clip speaking, in step with the film');

    // scrubbing: many seeks in quick succession
    for (let i = 0; i < 10; i++) {
      film.seek(((i * 7919) % 97) / 97 * tl.total * 0.8);
      await wait(90);
    }
    await wait(1600);
    expectClip('after fast scrubbing');

    // chapter jump
    film.seekChapter('follow');
    await wait(150);
    ov = oldVoice();
    check('chapter jump: previous voice stopped at once', ov.silent, ov);
    await wait(1100);
    expectClip('chapter jump: new chapter speaking', { src03a: N.diagnostics().filmSrc.startsWith('03a_') });

    // pause / resume
    film.pause();
    await wait(400);
    const pausedAt = N.diagnostics().filmTime;
    check('pause: silent', N.diagnostics().audible === 0);
    film.play();
    await wait(600);
    expectClip('resume: continues, not rewound', { forward: N.diagnostics().filmTime >= pausedAt });

    // Explore: film held, the Explore line speaks alone, then hands back
    this.app.explore.open();
    await wait(500);
    let d = N.diagnostics();
    check('explore: film silent, Explore line speaking', d.owner === 'cue' && d.filmPaused && d.cuePlaying && d.audible === 1, { cue: d.cue });
    this.app.explore.select('plant');
    await wait(400);
    d = N.diagnostics();
    check('explore: newer line replaces the older one', d.cue === 'explore.plant' && d.audible === 1);
    this.app.explore.close();
    await wait(150);
    d = N.diagnostics();
    check('explore closed: Explore line stopped', !d.cuePlaying);
    await wait(1200);
    expectClip('back in the lesson: film voice again');

    // a "Your turn": the confirmation is spoken alone, and the next shot starts after it
    const tryShot = tl.byId.get('oxygen.try');
    film.seek(tryShot.end - 400, { play: true });
    check('your turn: film waits for the task', await until(() => film.holds.has('interaction') && !ui.interact.hidden));
    const input = ui.interact.querySelector('input[type=range]');
    input.value = '100';
    input.dispatchEvent(new Event('input'));
    await wait(1400);
    d = N.diagnostics();
    check('your turn: confirmation spoken alone', d.owner === 'cue' && d.cuePlaying && d.audible === 1, { cue: d.cue });
    const cueMs = N.cue(d.cue)?.durationMs || 0;
    check('your turn: film moved on after the confirmation', await until(() => film.shot.id === tl.shots[tl.byId.get('oxygen.try').index + 1].id, Math.max(2600, cueMs) + 4000), { shot: film.shot.id });
    check('your turn: confirmation had finished first', !N.diagnostics().cuePlaying);
    await wait(900);
    expectClip('next shot speaking after the confirmation');

    // a seek while a line is speaking stops it
    this.app.explore.open();
    await wait(300);
    this.app.explore.close();
    film.seekChapter('what');
    await wait(120);
    check('seek during a cue: cue stopped', !N.diagnostics().cuePlaying);

    rep.fps = Math.round((this.pumpFrames / (performance.now() - f0)) * 1000);
    sampling = false;
    await sampler;
    this.stopPump();
    rep.rewinds = N.stats.rewinds - rep.rewindsBefore;
    rep.pass = rep.steps.every((s) => s.ok) && rep.maxAudible <= 1 && rep.rewinds === 0 && rep.driftOver === 0;
    this.audio = rep;
    return rep;
  }

  async tour(steps, fps = 20) {
    this.log = [];
    for (const s of steps) {
      try {
        if (s.at) {
          const sh = this.app.timeline.byId.get(s.at);
          this.app.film.seek(sh.start + (s.ms || 0), { play: true });
        }
        if (s.wait) await this.advance(s.wait, fps);
        if (s.do) await s.do(this.app);
        if (s.capture) await this.capture(s.capture);
        this.log.push({ step: s.capture || s.at, snap: this.snapshot() });
      } catch (e) {
        this.log.push({ step: s.capture || s.at, error: String(e && e.stack || e) });
      }
    }
    this.log.push('done');
    return this.log;
  }
}
