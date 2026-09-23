import * as THREE from 'three';
import { InstancedPool } from '../../animation/ParticleField.js';
import { meshesOf, partNodeOf } from '../../scene/Looks.js';
import { el } from '../../ui/FilmUI.js';
import { IntroWastes, Figure, PartsTour, CutRing, StemCover } from './processes/basic.js';
import { Sunlight, Oxygen } from './processes/oxygen.js';
import { Water } from './processes/water.js';
import { Vacuole } from './processes/vacuole.js';
import { LeafFall } from './processes/leafFall.js';
import { Resin } from './processes/resin.js';
import { Soil } from './processes/soil.js';
import { NightCO2, SurfaceGas } from './processes/plantExtras.js';
import { Photosynthesis } from './processes/chloroplast.js';
import { LeafInside } from './processes/leafInside.js';
import { Stoma, StomaGas } from './processes/stoma.js';
import { RootFlow, HairFlow } from './processes/roots.js';
import { XylemFlow } from './processes/xylem.js';
import { CUE } from '../../narration/script.js';

/**
 * The lesson's stages. V2: one stage per scale-specific GLB (the plant stage also holds the
 * soil). Only one stage is shown at a time; every GLB is authored around the origin.
 */
export const STAGE_ASSETS = {
  plant: ['plant', 'soil'],
  leaf: ['leaf'],
  stoma: ['stoma'],
  leafInternal: ['leafInternal'],
  cell: ['cell'],
  chloroplast: ['chloroplast'],
  stem: ['stem'],
  xylem: ['xylem'],
  root: ['root'],
  rootHairs: ['rootHairs'],
};

/** Background load order: the order the lesson first needs them. */
export const LOAD_ORDER = ['leaf', 'leafInternal', 'chloroplast', 'stoma', 'rootHairs', 'root', 'cell', 'stem', 'xylem'];

/** Processes and the stage each one lives on (built when that stage's model arrives). */
const PROCESS_DEFS = {
  intro: ['plant', (w) => new IntroWastes(w)],
  figure: ['plant', (w) => new Figure(w)],
  partsTour: ['plant', (w) => new PartsTour(w)],
  sunlight: ['plant', (w) => new Sunlight(w)],
  oxygen: ['plant', (w) => new Oxygen(w)],
  surfaceGas: ['plant', (w) => new SurfaceGas(w)],
  nightCO2: ['plant', (w) => new NightCO2(w)],
  water: ['plant', (w) => new Water(w)],
  leafFall: ['plant', (w) => new LeafFall(w)],
  cutRing: ['plant', (w) => new CutRing(w)],
  soil: ['plant', (w) => new Soil(w)],
  photosynthesis: ['chloroplast', (w) => new Photosynthesis(w)],
  leafInside: ['leafInternal', (w) => new LeafInside(w)],
  stoma: ['stoma', (w) => new Stoma(w)],
  stomaGas: ['stoma', (w) => new StomaGas(w)],
  vacuole: ['cell', (w) => new Vacuole(w)],
  stemCover: ['stem', (w) => new StemCover(w)],
  resin: ['stem', (w) => new Resin(w)],
  xylemFlow: ['xylem', (w) => new XylemFlow(w, w.app.stage.renderer)],
  rootFlow: ['root', (w) => new RootFlow(w)],
  hairFlow: ['rootHairs', (w) => new HairFlow(w)],
};

/**
 * Topic runtime for Excretion in Plants. The film engine asks it to:
 *   applyView(shot)        stage, soil shell, highlight, dim, insets, night
 *   renderTracks(tracks)   run the processes for this instant
 *   followPose(...)        moving camera framings
 *   openInteraction(...)   the "Your turn" moments
 *   stageReady / waitStage the film waits (briefly) if a stage's model is still loading
 * Explore and Recall take over the view while they are open (viewOwned).
 */
export class World {
  constructor(app) {
    this.app = app;
    const { assets, stage, looks } = app;
    this.assets = assets;
    this.looks = looks;
    this.ui = app.ui;
    this.stages = {};
    this.ready = new Set();
    this.waiters = new Map();
    this.processes = {};
    this.insets = {};
    this.groups = { '@leaves': [], '@branches': [] };
    this.stageMeshes = {};
    for (const id of Object.keys(STAGE_ASSETS)) {
      const g = new THREE.Group();
      g.name = `STAGE_${id}`;
      g.visible = false;
      stage.scene.add(g);
      this.stages[id] = g;
    }
    this.templates = assets.scene('waste');
    this.current = null;
    this.extraHl = [];
    this.hover = null;
    this.night = 0;
    this.nightTarget = 0;
    // attach whatever is already loaded (the core), and the rest as it arrives
    for (const id of assets.assets.keys()) this.attachAsset(id);
    assets.onAsset = (id) => this.attachAsset(id);
  }

  // ------------------------------------------------------------ stages
  attachAsset(id) {
    for (const [stageId, ids] of Object.entries(STAGE_ASSETS)) {
      if (!ids.includes(id) || this.ready.has(stageId)) continue;
      if (!ids.every((a) => this.assets.loaded(a))) continue;
      const g = this.stages[stageId];
      ids.forEach((a) => g.add(this.assets.scene(a)));
      this.app.stage.scene.updateMatrixWorld(true);
      this.looks.registerTree(g);
      if (stageId === 'plant') this.setupPlant();
      this.ready.add(stageId);
      if (this.timeline) this.buildProcesses(stageId);
      this.stageMeshes[stageId] = meshesOf(g).filter((m) => !m.userData.noLook && !m.isInstancedMesh);
      if (this.app.stage.precompileGroup) this.app.stage.precompileGroup(g);
      for (const fn of this.waiters.get(stageId) || []) fn();
      this.waiters.delete(stageId);
      this.app.bus?.emit('world:stage', stageId);
    }
  }

  setupPlant() {
    const plant = this.assets.scene('plant');
    plant.traverse((o) => {
      if (o.userData.part === 'leaf') this.groups['@leaves'].push(o);
      if (o.userData.part === 'branch') this.groups['@branches'].push(o);
    });
    this.soilFront = meshesOf(this.node('Soil_Front'));
    // V2.2: the "Soil" label points into the soil on the cut face, clear of the roots and stem
    // (two spots: wide screens use the open soil left of the roots; portrait screens, where that is
    // off-screen, the soil below the roots. Both are more than 0.1 from any root.)
    this.soilLabel = this.assets.register('LABEL_Soil', new THREE.Object3D());
    this.soilLabel.position.set(-0.48, -0.36, -0.09);
    this.stages.plant.add(this.soilLabel);
  }

  /** A runtime label anchor that a process moves (e.g. riding on one particle). */
  track(name, stage) {
    const existing = this.assets.find(name);
    if (existing) return existing;
    const o = this.assets.register(name, new THREE.Object3D());
    this.stages[stage].add(o);
    return o;
  }

  stageReady(id) {
    return this.ready.has(id || 'plant');
  }

  waitStage(id) {
    if (this.stageReady(id)) return Promise.resolve();
    this.assets.loadLazy([...STAGE_ASSETS[id]]); // move it to the front of the queue
    STAGE_ASSETS[id].forEach((a) => this.assets.ensure(a));
    return new Promise((res) => this.waiters.set(id, [...(this.waiters.get(id) || []), res]));
  }

  stageOf(shot) {
    return shot?.view?.stage || 'plant';
  }

  buildProcesses(stageId) {
    for (const [name, [st, make]] of Object.entries(PROCESS_DEFS)) {
      if (st === stageId && !this.processes[name]) this.processes[name] = make(this);
    }
    const st = this.app.stage;
    const mk = (preset) => {
      const cam = new THREE.PerspectiveCamera(34, 1, 0.01, 60);
      const p = this.app.camera.resolve(preset, { aspect: false });
      cam.position.copy(p.pos);
      cam.lookAt(p.target);
      return cam;
    };
    // picture-in-picture windows used by the final summary
    if (stageId === 'cell') this.insets.cell = st.addInset('cell', this.stages.cell, mk('insetCell'));
    if (stageId === 'stem') this.insets.stem = st.addInset('stem', this.stages.stem, mk('insetStem'));
  }

  // ------------------------------------------------------------ helpers
  node(name) {
    return this.assets.get(name);
  }

  find(name) {
    return this.assets.find(name);
  }

  pos(name) {
    return this.node(name).getWorldPosition(new THREE.Vector3());
  }

  group(name) {
    return this.groups[name] || [];
  }

  resolve(names) {
    return (names || []).flatMap((n) => (n.startsWith('@') ? this.group(n) : [this.find(n)].filter(Boolean)));
  }

  stageGroup(id) {
    return this.stages[id];
  }

  template(name) {
    return meshesOf(this.templates.getObjectByName(name))[0];
  }

  pool(name, stage, capacity, { onTop = false, opacity = 1, color = null, emissive = null, emissiveK = 0.25, lighten = 0 } = {}) {
    const tpl = this.template(name);
    const mat = Array.isArray(tpl.material) ? tpl.material.map((m) => m.clone()) : tpl.material.clone();
    for (const m of [].concat(mat)) {
      if (color) m.color.set(color);
      if (lighten) m.color.lerp(new THREE.Color(1, 1, 1), lighten);
      if (m.emissive) (emissive ? m.emissive.set(emissive) : m.emissive.copy(m.color)).multiplyScalar(emissiveK);
      if (opacity < 1) {
        m.transparent = true;
        m.opacity = opacity;
        m.depthWrite = false;
      }
      if (onTop) m.depthTest = false;
    }
    const p = new InstancedPool(tpl.geometry.clone(), mat, capacity, this.stages[stage], `${name}_pool`);
    if (onTop) p.mesh.renderOrder = 20;
    return p;
  }

  showStage(id) {
    if (this.current === id) return;
    this.current = id;
    for (const [k, g] of Object.entries(this.stages)) g.visible = k === id;
    this.app.filmEl.dataset.stage = id;
  }

  addHighlight(nodes, amount = 1) {
    this.extraHl.push({ meshes: nodes.filter(Boolean).flatMap(meshesOf), amount });
  }

  // ------------------------------------------------------- film interface
  init(timeline) {
    this.timeline = timeline;
    for (const id of this.ready) this.buildProcesses(id);
  }

  /** lesson-time state that a process keeps between shots (so scrubbing lands right) */
  settleFor(tMs) {
    const at = (id) => this.timeline.byId.get(id);
    const vt = at('vacuole.try');
    if (this.processes.vacuole && vt && this.shotId !== 'vacuole.try') this.processes.vacuole.settle(tMs >= vt.end);
    const rs = at('resin.store');
    if (this.processes.xylemFlow && rs) this.processes.xylemFlow.settle(tMs >= rs.end);
  }

  enterShot(shot) {
    this.shotId = shot.id;
    this.settleFor(shot.start);
  }

  applyView(shot, local, t) {
    const v = shot.view || {};
    this.showStage(v.stage || 'plant');
    const L = this.looks;
    this.extraHl = [];
    this.nightTarget = v.night ? 1 : 0;
    if (v.soil === 'shell' && this.soilFront) {
      L.target(this.soilFront, 'fade', 0.14);
      L.target(this.soilFront, 'shell', 1);
    }
    this.pendingHighlight = this.resolve(v.highlight).flatMap(meshesOf);
    // dim: true = full, or a number 0..1 (a softer focus that keeps each tissue's own colour readable)
    this.pendingDim = v.dim === true ? 1 : +v.dim || 0;
    this.viewShot = shot;
    this.insetView = v.insets || [];
  }

  renderTracks(active, tMs, shot) {
    const T = tMs / 1000;
    const byProcess = new Map(active.map((tr) => [tr.process, tr]));
    for (const [name, proc] of Object.entries(this.processes)) {
      const tr = byProcess.get(name);
      if (tr) {
        proc.render({
          mode: tr.mode,
          local: (tMs - tr.start) / 1000,
          span: (Math.min(tr.end, this.timeline.total) - tr.start) / 1000,
          track: tr,
          T,
          shot,
        });
      } else if (proc.live != null) {
        // a "Your turn" is driving this process while the film waits
        proc.render({ mode: 'live', local: 0, span: 1, track: null, T, shot });
      } else proc.hide();
    }
    this.finishView();
  }

  /** highlight/dim resolved after processes had their say */
  finishView() {
    const L = this.looks;
    const hl = new Set(this.pendingHighlight || []);
    for (const m of hl) L.target([m], 'hl', 1);
    for (const x of this.extraHl) {
      for (const m of x.meshes) {
        L.target([m], 'hl', Math.max(L.entry(m)?.tgt.hl || 0, x.amount));
        hl.add(m);
      }
    }
    if (this.hover) for (const m of meshesOf(this.hover)) L.target([m], 'hl', 0.7);
    if (this.pendingDim) {
      const keep = new Set([...hl]);
      L.target((this.stageMeshes[this.current] || []).filter((m) => !keep.has(m) && !m.name.startsWith('Resin')), 'dim', this.pendingDim);
    }
    this.updateInsets();
  }

  updateInsets() {
    const st = this.app.stage;
    const narrow = st.width < 900;
    for (const [id, inset] of Object.entries(this.insets)) {
      const want = this.insetView.includes(id) ? 1 : 0;
      // V2.4 (DA-22): after a seek/scrub the windows jump to their state (no ghost fading in other shots)
      if (this.looks.snap || this.app.film?.lastSnap) inset.opacity = want;
      else inset.opacity += (want - inset.opacity) * 0.12;
      if (inset.opacity < 0.01) continue;
      const lab = this.app.labels.screen.get(id);
      if (!lab) continue;
      const size = narrow ? 84 : 132;
      inset.size = size;
      let x = lab.dir === 'left' ? lab.left - size / 2 - 10 : lab.left + lab.w + size / 2 + 10;
      x = Math.max(size / 2 + 8, Math.min(st.width - size / 2 - 8, x));
      inset.x = x;
      inset.y = Math.max(size / 2 + 70, Math.min(st.height - 190, lab.top + lab.h / 2));
    }
  }

  followPose(follow, tMs, shot) {
    const tr = this.timeline.tracks.find((x) => x.process === follow.process && tMs >= x.start && tMs < x.end);
    const local = tr ? (tMs - tr.start) / 1000 : 0;
    const span = tr ? (tr.end - tr.start) / 1000 : shot.duration / 1000;
    return this.processes[follow.process].followPose(local, span);
  }

  cameraOwned() {
    return !!this.owner;
  }

  viewOwned() {
    return !!this.owner;
  }

  /** Explore/Recall render the world as the lesson has taught it so far. */
  renderOwned(tMs) {
    const shot = this.timeline.locate(tMs);
    this.looks.resetTargets();
    this.extraHl = [];
    this.nightTarget = 0;
    this.pendingHighlight = this.owner.highlight ? this.owner.highlight() : [];
    this.pendingDim = false;
    this.insetView = [];
    if (this.owner.soil === 'shell' && this.soilFront) {
      this.looks.target(this.soilFront, 'fade', 0.14);
      this.looks.target(this.soilFront, 'shell', 1);
    }
    this.settleFor(tMs);
    const active = this.timeline.activeTracks(tMs).filter((tr) => tr.end === Infinity || tr.process === 'stemCover');
    this.renderTracks(active, tMs, shot);
  }

  /** night: the lights dim and cool (set per shot with view.night) */
  tickNight(dt) {
    const k = this.looks.snap || this.app.film?.lastSnap ? 1 : 1 - Math.exp(-dt * 2.2);
    this.night += (this.nightTarget - this.night) * k;
    this.app.stage.setNight?.(this.night);
    this.app.filmEl.dataset.night = this.night > 0.5 ? '1' : '0';
  }

  // --------------------------------------------------------- interactions
  openInteraction(shot, done) {
    const kind = shot.interaction.kind;
    this.app.ui.quietWords(true);
    const finish = () => {
      this.closeInteraction();
      done();
    };
    this.interaction = { kind, finish };
    if (kind === 'recall') return this.app.recall.open(finish);
    if (kind === 'sunlight') return this.taskSunlight(shot, finish);
    if (kind === 'guardCells') return this.taskGuardCells(shot, finish);
    if (kind === 'storeWaste') return this.taskStoreWaste(shot, finish);
    if (kind === 'findTissue') return this.taskFindTissue(shot, finish);
    finish();
  }

  closeInteraction() {
    const it = this.interaction;
    if (!it) return;
    this.interaction = null;
    it.cleanup?.();
    this.app.narration.stopCue();
    this.app.picker.disable();
    this.hover = null;
    const panel = this.app.ui.interact;
    panel.hidden = true;
    panel.replaceChildren();
    this.app.ui.quietWords(false);
    if (this.processes.sunlight) this.processes.sunlight.live = null;
    if (this.processes.oxygen) this.processes.oxygen.live = null;
    if (this.processes.stoma) this.processes.stoma.live = null;
  }

  panel(shot, ...body) {
    const ui = this.app.ui;
    const status = el('p', { class: 'film-status', role: 'status' });
    const chip = el('span', { class: 'film-chip' }, 'Your task');
    const cont = el('button', { class: 'film-btn film-btn--primary', type: 'button', onClick: () => this.interaction?.finish() }, 'Continue');
    ui.interact.replaceChildren(chip, el('h2', {}, shot.heading?.title || 'Your turn'), el('p', {}, shot.interaction.task), ...body, status, el('div', { class: 'film-row' }, cont));
    ui.interact.hidden = false;
    return {
      status,
      chip,
      cont,
      complete: (msg) => {
        chip.classList.add('is-done');
        chip.textContent = 'Done';
        status.className = 'film-status is-good';
        status.textContent = msg;
        ui.announce(msg);
        // move on once the confirmation has been heard (and read), never over it
        const it = this.interaction;
        const spoken = this.app.cue(CUE.taskDone(shot.id));
        const read = new Promise((r) => setTimeout(r, 2400));
        Promise.all([spoken, read]).then(() => {
          if (it && this.interaction === it) it.finish();   // V2.4: a late completion after the panel closed does nothing
        });
      },
    };
  }

  slider(label, from, to, aria) {
    const readout = el('span', { class: 'film-slider__value' }, '0%');
    const input = el('input', { type: 'range', min: '0', max: '100', value: '0', step: '1', 'aria-label': aria });
    const box = el('div', { class: 'film-slider' },
      el('div', { class: 'film-slider__head' }, el('span', {}, label), readout),
      input,
      el('div', { class: 'film-slider__scale' }, el('span', {}, from), el('span', {}, to)));
    return { box, input, readout };
  }

  taskSunlight(shot, finish) {
    const S = this.processes.sunlight;
    const O = this.processes.oxygen;
    let value = 0;
    let heldSince = null;
    let done = false;
    const { box, input, readout } = this.slider('Sunlight', 'Dark', 'Bright', 'Sunlight on the leaf');
    const ui = this.panel(shot, box);
    S.live = 0;
    O.live = true;
    input.addEventListener('input', () => {
      value = +input.value;
      readout.textContent = `${value}%`;
      input.setAttribute('aria-valuetext', `${value} percent sunlight`);
    });
    this.interaction.tick = (dt) => {
      S.live = value / 100;
      O.tickLive(dt, value / 100);
      if (!done && value >= 85) {
        heldSince ??= performance.now();
        if (performance.now() - heldSince > 600) {
          done = true;
          ui.complete(shot.interaction.done);
        }
      } else heldSince = null;
    };
    setTimeout(() => input.focus(), 50);
    void finish;
  }

  /** Your turn at the stoma: water into the guard cells opens the pore (C10 p. 83). */
  taskGuardCells(shot, finish) {
    const S = this.processes.stoma;
    let value = 0;
    let shown = 0;
    let heldSince = null;
    let done = false;
    const { box, input, readout } = this.slider('Water in the guard cells', 'Little', 'A lot', 'Water in the guard cells');
    const ui = this.panel(shot, box);
    S.live = 0;
    input.addEventListener('input', () => {
      value = +input.value;
      readout.textContent = `${value}%`;
      input.setAttribute('aria-valuetext', `${value} percent: the pore is ${value > 70 ? 'open' : value > 25 ? 'partly open' : 'closed'}`);
    });
    this.interaction.tick = (dt) => {
      shown += (value / 100 - shown) * (1 - Math.exp(-dt * 4));
      S.live = shown;
      if (!done && value >= 85 && shown > 0.8) {
        heldSince ??= performance.now();
        if (performance.now() - heldSince > 600) {
          done = true;
          ui.complete(shot.interaction.done);
        }
      } else heldSince = null;
    };
    this.interaction.cleanup = () => {
      S.live = null;
    };
    setTimeout(() => input.focus(), 50);
    void finish;
  }

  taskStoreWaste(shot, finish) {
    const V = this.processes.vacuole;
    V.openTask();
    const targets = V.extraPositions().map((p, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.copy(p);
      m.userData.part = 'task_waste';
      m.userData.index = i;
      m.userData.noLook = true;
      this.stages.cell.add(m);
      return m;
    });
    let ui;
    const store = (i) => {
      if (V.storeOne(i)) {
        const left = V.remaining();
        ui.status.className = 'film-status';
        ui.status.textContent = left ? `${left} left to store` : '';
        if (!left) setTimeout(() => ui.complete(shot.interaction.done), 1500);
      }
    };
    const btn = el('button', { class: 'film-btn', type: 'button', onClick: () => {
      const i = V.extra.findIndex((x) => x.state === 'waiting');
      if (i >= 0) store(i);
    } }, 'Store a waste');
    ui = this.panel(shot, el('div', { class: 'film-row', style: 'margin-bottom:6px' }, btn));
    ui.status.textContent = '3 left to store';
    this.app.picker.enable(targets, { onPick: (node) => store(node.userData.index) });
    this.interaction.tick = (dt) => V.tickLive(dt);
    this.interaction.cleanup = () => {
      targets.forEach((t) => t.removeFromParent());
      V.settle(true);
    };
    void finish;
  }

  taskFindTissue(shot, finish) {
    const spec = shot.interaction;
    const parts = new Map();
    this.stages.stem.traverse((o) => {
      const n = partNodeOf(o);
      if (o.isMesh && n && ['bark', 'phloem', 'xylem', 'old_xylem', 'pith', 'resin'].includes(n.userData.part)) {
        if (!parts.has(n.userData.part)) parts.set(n.userData.part, new Set());
        parts.get(n.userData.part).add(n);
      }
    });
    let solved = false;
    let ui;
    const choose = (part) => {
      if (solved) return;
      const right = part === spec.target || part === 'resin';
      const nodes = [...(parts.get(part) || [])];
      this.hover = nodes[0] || null;
      if (right) {
        solved = true;
        ui.complete(spec.done);
      } else {
        ui.status.className = 'film-status is-warm';
        ui.status.textContent = spec.wrong;
        this.app.ui.announce(spec.wrong);
        this.app.cue(CUE.taskWrong(shot.id));
      }
    };
    ui = this.panel(shot, el('div', { class: 'film-row', role: 'group', 'aria-label': 'Choose a tissue', style: 'margin-bottom:6px' },
      spec.choices.map((c) => el('button', { class: 'film-btn', type: 'button', onClick: () => choose(c.part) }, c.label))));
    this.app.picker.enable([...parts.values()].flatMap((s) => [...s]), { onPick: (node) => choose(node.userData.part) });
    void finish;
  }

  tick(dt) {
    if (this.soilLabel) {
      const portrait = this.app.stage.width / Math.max(1, this.app.stage.height) < 0.9;
      this.soilLabel.position.set(portrait ? -0.3 : -0.48, portrait ? -0.52 : -0.36, -0.09);
    }
    this.interaction?.tick?.(dt);
    this.tickNight(dt);
  }
}
