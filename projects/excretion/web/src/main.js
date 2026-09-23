import './ui/film.css';
import { EventBus } from './core/EventBus.js';
import { Stage } from './scene/Stage.js';
import { Looks } from './scene/Looks.js';
import { AssetLoader } from './assets/AssetLoader.js';
import { FilmCamera } from './camera/FilmCamera.js';
import { Picker } from './interaction/Picker.js';
import { OrbitRig } from './interaction/OrbitRig.js';
import { Timeline } from './film/Timeline.js';
import { Film } from './film/Film.js';
import { NarrationPlayer } from './narration/NarrationPlayer.js';
import { FilmUI, el } from './ui/FilmUI.js';
import { FilmLabels } from './ui/FilmLabels.js';
import { ExploreController } from './lessons/ExploreController.js';
import { RecallController } from './lessons/RecallController.js';
import { LESSON } from './lessons/excretion-in-plants/lesson-data.js';
import { PRESETS } from './lessons/excretion-in-plants/shots.js';
import { World, LOAD_ORDER } from './lessons/excretion-in-plants/world.js';
import { EXPLORE, PARTS } from './lessons/excretion-in-plants/explore-data.js';
import { RECALL } from './lessons/excretion-in-plants/recall-data.js';
import { TEACHER_SOURCES } from './data/ncert-content-map.js';

const params = new URLSearchParams(location.search);

async function loadJSON(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function boot() {
  const filmEl = document.getElementById('film');
  const bus = new EventBus();
  // Narration: Google Cloud TTS clips rendered at build time (pipeline/narration).
  // ?qa-audio=fixture swaps in generated test tones (dev server only) to test sync without clips.
  const audioBase = params.get('qa-audio') === 'fixture' ? '/__qa/audio/' : './audio/excretion/';
  const narrationManifest = await loadJSON(`${audioBase}narration.json`);
  const timeline = new Timeline(LESSON, { clips: narrationManifest?.shots || {} });
  const app = { bus, timeline, filmEl, progress: { furthest: 0 } };
  const narration = new NarrationPlayer(narrationManifest, audioBase);
  app.narration = narration;
  app.cue = (key) => narration.playCue(key);

  const ui = new FilmUI({
    root: document.getElementById('ui'),
    filmEl,
    lesson: LESSON,
    timeline,
    sources: TEACHER_SOURCES,
    handlers: {
      hasVoice: () => narration.available,
      onStart: () => start(),
      onPlay: () => {
        if (app.explore?.active) return app.explore.close();
        if (app.recall?.active) return;
        app.film.toggle();
      },
      onReplay: () => {
        app.explore?.close();
        hideEnd();
        narration.stopAll();
        app.film.completed.clear();
        app.film.seek(0, { play: true });
      },
      onChapter: (id) => {
        app.explore?.close();
        hideEnd();
        app.film.seekChapter(id);
      },
      onSeek: (ms) => {
        app.explore?.close();
        hideEnd();
        app.film.seek(ms);
      },
      time: () => app.film.t,
      onExplore: () => (app.explore.active ? app.explore.close() : app.explore.open()),
      onVoice: () => {
        narration.setEnabled(!narration.enabled);
        ui.setVoice(narration.enabled);
      },
      onWords: (v) => (app.film.words = v),
      onMotion: (v) => setMotion(v),
      onDialog: (open) => (open ? app.film.hold('dialog') : app.film.release('dialog')),
      onEscape: () => {
        if (app.explore?.active) app.explore.close();
        else if (app.recall?.active) app.recall.close();
      },
    },
  });
  app.ui = ui;
  ui.setNarration(narration.available);

  const stage = new Stage(document.getElementById('stage'));
  app.stage = stage;
  const assets = new AssetLoader('./');
  app.assets = assets;
  try {
    // V2: only the core models (plant, soil, symbols) before the first frame; the close-ups follow
    await assets.loadCore((p) => ui.loadProgress(p));
  } catch (err) {
    console.error(err);
    ui.loadError('The 3D models could not be loaded. Please reload the page.');
    return;
  }

  app.looks = new Looks();
  app.camera = new FilmCamera(stage.camera, assets, PRESETS);
  app.labels = new FilmLabels(document.getElementById('labels'), stage.camera, assets);
  const world = new World(app);
  app.world = world;
  world.init(timeline);
  stage.precompile(Object.values(world.stages));
  app.perf = { coreReadyMs: Math.round(performance.now()), assets: assets.timings };
  assets.loadLazy(LOAD_ORDER).then(() => (app.perf.allReadyMs = Math.round(performance.now())));
  app.picker = new Picker(stage.renderer.domElement, stage.camera, { setHover: (n) => (world.hover = n) }, filmEl);
  app.orbit = new OrbitRig(stage.camera, stage.renderer.domElement, app.camera);
  app.film = new Film({ timeline, camera: app.camera, looks: app.looks, labels: app.labels, narration, ui, world, bus });
  app.explore = new ExploreController(app, { models: EXPLORE, parts: PARTS });
  app.recall = new RecallController(app, RECALL);
  narration.onChange = () => ui.setVoice(narration.enabled, narration.blocked);

  // ------------------------------------------------------------- motion
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPref = 'system';
  function setMotion(v) {
    motionPref = v;
    const reduce = v === 'reduce' || (v === 'system' && mq.matches);
    app.camera.reduced = reduce;
    document.body.dataset.motion = reduce ? 'reduce' : 'full';
  }
  mq.addEventListener?.('change', () => setMotion(motionPref));
  setMotion('system');

  // -------------------------------------------------------- composition
  // desktop: subject sits right of the top-left heading (compose 'right');
  // phones: subject centred in the band between the heading and the bottom UI.
  function compose() {
    const w = stage.width;
    const h = stage.height;
    const narrow = w <= 900;
    const shot = app.film.shot;
    let x = 0;
    let y = 0;
    let zoom = 1;
    const panelOpen = !ui.explore.hidden || !ui.recall.hidden || !ui.interact.hidden;
    if (!narrow) {
      const right = shot?.camera?.compose === 'right' && !app.explore.active;
      x = right ? 0.16 * w : 0;
      if (!ui.explore.hidden || !ui.recall.hidden) x = 0.18 * w; // panel bottom-left: subject to the right
      if (!ui.interact.hidden) x = -0.08 * w; // panel bottom-right
    } else {
      const top = Math.min(h * 0.4, (ui.lead.getBoundingClientRect().bottom || 120) + 8);
      const panel = [ui.explore, ui.recall, ui.interact].find((p) => !p.hidden);
      const bottomUi = panel ? h - panel.getBoundingClientRect().top + 8 : ui.player.offsetHeight + 70;
      y = (bottomUi - top) / 2;
      const free = (h - top - bottomUi) / (h * 0.6);
      zoom = Math.max(0.66, Math.min(1, free));
      if (panelOpen) zoom = Math.min(zoom, 0.9);
    }
    app.camera.setComposeTarget(x, y, zoom);
  }

  // ---------------------------------------------------------- frame loop
  stage.onFrame((dt) => {
    world.tick(dt);
    app.explore.update(dt);
    app.recall.update(dt);
    app.film.update(dt);
    app.orbit.update();
    compose();
    app.camera.updateCompose(dt, stage.width, stage.height, app.film.lastSnap);
    app.labels.reserved = ui.reservedRect();
    app.labels.update(stage.width, stage.height);
    if (app.film.t > app.progress.furthest && app.film.playing) app.progress.furthest = app.film.t;
    ui.setPlaying(app.film.playing && !app.film.holds.has('explore'));
  });
  stage.onResize(() => ui.nudgeMarks());
  // a lesson is watched, not just heard: when the page is hidden the film (and so its voice) pauses
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && app.film.playing && !app.qa?.pumping) {
      app.film.pause();
      narration.stopCue();
    }
  });
  bus.on('film:seek', (t) => {
    app.progress.furthest = Math.max(app.progress.furthest, t);
  });
  bus.on('film:end', () => showEnd());

  // --------------------------------------------------------------- end card
  function showEnd() {
    const score = app.progress.recallScore;
    ui.end.replaceChildren(
      el('p', { class: 'film-card__eyebrow' }, 'Lesson complete'),
      el('h2', {}, 'No single organ. Many ways.'),
      el('p', {}, 'A plant releases oxygen, loses excess water, stores wastes in vacuoles and old xylem, sheds some with its leaves, and excretes some into the soil.'),
      score != null ? el('p', {}, `Recall: ${score} of ${RECALL.questions.length} right first time.`) : '',
      el('div', { class: 'film-row' },
        el('button', { class: 'film-btn film-btn--primary', type: 'button', onClick: () => ui.handlers.onReplay() }, 'Watch again'),
        el('button', { class: 'film-btn', type: 'button', onClick: () => {
          hideEnd();
          app.film.completed.delete('recall.open');
          app.film.seekShot('recall.open', { play: true });
        } }, 'Try the recall again'),
        el('button', { class: 'film-btn', type: 'button', onClick: () => {
          hideEnd();
          app.explore.open('plant');
        } }, 'Explore the plant')));
    ui.end.hidden = false;
    ui.quietWords(true);
    ui.announce('Lesson complete.');
    ui.end.querySelector('button').focus();
  }
  function hideEnd() {
    if (!ui.end.hidden) ui.quietWords(false);
    ui.end.hidden = true;
  }

  // --------------------------------------------------------------- start
  function start() {
    ui.hideStart();
    // the Start click is the user gesture that lets audio play
    if (!params.has('mute')) narration.unlock();
    else {
      narration.setEnabled(false);
      ui.setVoice(false);
    }
    app.film.play();
    const at = params.get('shot');
    if (at) app.film.seekShot(at, { play: true });
  }

  app.film.seek(0, { play: false });
  stage.start();
  ui.ready();
  window.app = params.has('qa') ? app : undefined;
  if (params.has('qa')) {
    const { QA } = await import('./qa/QA.js');
    app.qa = new QA(app);
  }
  if (params.has('autostart')) start();
}

boot();
