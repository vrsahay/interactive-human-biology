import * as THREE from 'three';
import { easeInOutCubic, easeInOutSine, smoothstep } from '../../../animation/easing.js';
import { forEachBirth, rand } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';
import { lifeScale, pathCurve } from './flow.js';

/**
 * THE STOMA (03_stoma, micro scale). Source: C10 p. 83: stomata are tiny pores on the
 * surface of leaves; the opening and closing of the pore is a function of the guard cells;
 * the guard cells swell when water flows into them, causing the pore to open; the pore
 * closes if the guard cells shrink. The shape change is the Blender shape key "Open"
 * (glTF morph target 0) on both guard cells and the pore.
 *   open     water flows into the guard cells; they swell; the pore opens
 *   close    water leaves the guard cells; they shrink; the pore closes
 *   hold     stays open (default) · shut: stays closed
 *   live     the learner's slider sets the water in the guard cells (Your turn)
 */
export class Stoma {
  constructor(world) {
    this.world = world;
    this.guards = ['Guard_Cell_L', 'Guard_Cell_R'].map((n) => world.node(n));
    this.morphs = ['Guard_Cell_L', 'Guard_Cell_R', 'Stoma_Pore'].flatMap((n) => meshesOf(world.node(n))).filter((m) => m.morphTargetInfluences);
    this.gc = ['ANCHOR_Guard_Cell_L', 'ANCHOR_Guard_Cell_R'].map((n) => world.pos(n));
    this.pore = world.pos('ANCHOR_Stoma_Pore');
    this.drops = world.pool('Water_Droplet', 'stoma', 60, { emissiveK: 0.3, opacity: 0.95 });
    // V2.4 (DA-25): the "Guard cell" label anchors ride on the cells as they swell or shrink (they were
    // fixed at the open position, so on a closed stoma the labels pointed beside the cells)
    this.gcAnchors = ['ANCHOR_Guard_Cell_L', 'ANCHOR_Guard_Cell_R'].map((n) => world.find(n)).filter(Boolean);
    this.level = 1;
    this.live = null;
    this.set(1);
  }

  set(v) {
    this.level = v;
    for (const m of this.morphs) m.morphTargetInfluences[0] = v;
    // guard-cell centre line at mid-length: CLOSED_BOW + pole offset → OPEN_BOW + pole offset (03_stoma)
    for (const a of this.gcAnchors) a.position.x = Math.sign(a.position.x) * (0.067 + 0.066 * v);
  }

  /** water moving into (dir 1) or out of (dir -1) the guard cells */
  water(local, span, dir, rate = 5) {
    const p = new THREE.Vector3();
    forEachBirth({ t: local, start: 0.2, end: span - 0.8, rate, life: 1.8, salt: dir > 0 ? 3 : 4 }, (k, age, x) => {
      const side = k % 2;
      const c = this.gc[side];
      const away = c.clone().sub(this.pore).setY(0).normalize();
      const along = new THREE.Vector3(-away.z, 0, away.x).multiplyScalar((rand(k, 5) - 0.5) * 0.36);
      // V2.4 (DA-24): the water comes from the neighbouring cells, INSIDE the leaf: it starts below the
      // epidermis surface (hidden by it) and appears as it enters the see-through guard cell, instead
      // of sliding over the outside of the leaf
      // target: the guard cell's centre line as it is right now (it bows out as the stoma opens)
      const inside = this.pore.clone().addScaledVector(away, 0.067 + 0.066 * this.level)
        .add(along.clone().multiplyScalar(0.4)).setY(this.pore.y - 0.015);
      const outside = inside.clone().addScaledVector(away, 0.2).add(along.clone().multiplyScalar(0.6)).setY(this.pore.y - 0.08);
      const e = easeInOutSine(x);
      if (dir > 0) p.lerpVectors(outside, inside, e);
      else p.lerpVectors(inside, outside, e);
      this.drops.add(p, 0.038 * lifeScale(x, 0.12, 0.25), 0, k);
    });
  }

  render({ mode, local, span }) {
    this.drops.begin();
    let v = 1;
    if (this.live != null) {
      v = this.live;
      this.liveWater?.();
    } else if (mode === 'open') {
      v = easeInOutCubic(smoothstep(0.8, Math.min(span - 0.8, 4.6), local));
      this.water(local, Math.min(span, 5.2), 1);
    } else if (mode === 'close') {
      v = 1 - easeInOutCubic(smoothstep(0.8, Math.min(span - 0.8, 4.6), local));
      this.water(local, Math.min(span, 5.2), -1);
    } else if (mode === 'shut') v = 0;
    this.set(v);
    if (mode === 'open' || mode === 'close' || this.live != null) this.world.addHighlight(this.guards, 0.55);
    this.drops.end();
  }

  hide() {
    this.drops.clear();
    if (this.live == null) this.set(1);
  }
}

/**
 * GASES AND VAPOUR LEAVING THROUGH THE PORE (03_stoma). The rate follows how open the
 * pore is, so a closed stoma lets nothing out.
 *   o2 · co2 · vapour
 */
export class StomaGas {
  constructor(world) {
    this.world = world;
    this.curve = pathCurve(world, 'PATH_Stoma_Out');
    this.pools = {
      o2: world.pool('O2_Molecule', 'stoma', 80, { color: '#6cc6f2', emissive: '#1f6e96', emissiveK: 0.45 }),
      co2: world.pool('CO2_Molecule', 'stoma', 80, { emissiveK: 0.6, lighten: 0.15 }),
      vapour: world.pool('Vapour_Puff', 'stoma', 80, { opacity: 0.55, emissiveK: 0.4 }),
    };
    // label anchors that sit on the two streams (V2.2)
    const o2At = this.curve.getPointAt(0.5);
    const vAt = this.curve.getPointAt(0.62);
    this.tO2 = world.track('TRACK_STOMA_O2', 'stoma');
    this.tO2.position.set(o2At.x - 0.05, o2At.y, o2At.z);
    this.tVapour = world.track('TRACK_STOMA_Vapour', 'stoma');
    this.tVapour.position.set(vAt.x + 0.06, vAt.y, vAt.z);
  }

  /** V2.4 (DA-04): when both leave together, oxygen drifts a little to one side and vapour to the other */
  lane(kind, x) {
    return kind === 'o2' ? -(0.012 + 0.09 * x) : kind === 'vapour' ? 0.012 + 0.09 * x : 0;
  }

  stream(pool, kind, local, span, open, { start = -2.5, salt = 7, rate = 5, lanes = false } = {}) {
    const p = new THREE.Vector3();
    // constant birth rate (deterministic under scrubbing); a narrowing pore thins the stream
    forEachBirth({ t: local, start, end: span - 0.6, rate, life: 3.2, salt }, (k, age, x) => {
      if (rand(k, 10) > open) return;
      this.curve.getPointAt(Math.min(1, x), p);
      const spread = 0.02 + 0.22 * x * x;
      p.x += (rand(k, 8) - 0.5) * spread * (lanes ? 0.6 : 1) + (lanes ? this.lane(kind, x) : 0);
      p.z += (rand(k, 9) - 0.5) * spread;
      const size = kind === 'vapour' ? 0.038 * (0.8 + x) : 0.03;
      pool.add(p, size * lifeScale(x, 0.08, 0.2), age * 0.5, k + salt * 1000);
    });
  }

  render({ mode, local, span, shot }) {
    for (const p of Object.values(this.pools)) p.begin();
    const open = this.world.processes.stoma?.level ?? 1;
    if (mode === 'o2vapour') {
      // oxygen throughout; water vapour joins when the narration reaches “water can be lost”
      const t3 = shot?.sentenceStarts?.[2] != null ? (shot.sentenceStarts[2] + 350) / 1000 - 0.3 : 5.3;
      this.stream(this.pools.o2, 'o2', local, span, open, { rate: 3.5, lanes: true });
      this.stream(this.pools.vapour, 'vapour', local, span, open, { start: t3, salt: 11, rate: 6, lanes: true });
      // the labels ride on their own lanes; "Water vapour" waits until the first puffs are out of the pore
      const o2At = 0.5;
      this.curve.getPointAt(o2At, this.tO2.position);
      this.tO2.position.x += this.lane('o2', o2At) - 0.02;
      const lead = Math.min(0.55, Math.max(0, (local - t3) / 3.2));
      this.curve.getPointAt(lead, this.tVapour.position);
      this.tVapour.position.x += this.lane('vapour', lead) + 0.02;
      this.tVapour.userData.labelOff = lead < 0.3;
    } else {
      this.tVapour.userData.labelOff = false;
      this.stream(this.pools[mode] || this.pools.o2, mode, local, span, open);
    }
    for (const q of Object.values(this.pools)) q.end();
  }

  hide() {
    for (const p of Object.values(this.pools)) p.clear();
    this.tVapour.userData.labelOff = false;
  }
}
