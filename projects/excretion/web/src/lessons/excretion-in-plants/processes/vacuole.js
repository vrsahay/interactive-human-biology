import * as THREE from 'three';
import { easeInOutCubic } from '../../../animation/easing.js';
import { rand } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';

/**
 * WASTE → VACUOLE → STORED (cell scale).
 * Wastes collect in the cytoplasm (on the cut face), then move into the large
 * vacuole and stay there. Vacuole geometry comes from glTF extras authored in
 * Blender (centre, radii, cut plane), so stored wastes always sit in the part of
 * the vacuole the learner can see.
 * The "Your turn" adds three more wastes that the learner moves in by tapping.
 */
export class Vacuole {
  constructor(world) {
    this.world = world;
    const vac = world.node('Vacuole');
    const x = vac.userData;
    this.C = new THREE.Vector3(...(x.center_three || [0.04, -0.04, -0.03]));
    this.R = new THREE.Vector3(...(x.radii_three || [0.34, 0.8, 0.33]));
    this.cutZ = x.cut_z_three ?? 0.16;
    this.nucleus = world.pos('ANCHOR_Nucleus');
    this.vacMeshes = meshesOf(vac);
    this.baseColor = world.looks.baseColor(this.vacMeshes[0]).clone();
    this.fullColor = new THREE.Color('#8a9ee6');
    this.pool = world.pool('Waste_Crystal', 'cell', 40);
    this.cyto = [];
    this.inside = [];
    for (let k = 0; this.cyto.length < 14 && k < 600; k++) {
      const p = new THREE.Vector3(-0.42 + rand(k, 1) * 0.84, -0.98 + rand(k, 2) * 1.96, this.cutZ + 0.03);
      if (this.ell(p.x, p.y) < 1.25 || p.distanceTo(new THREE.Vector3(this.nucleus.x, this.nucleus.y, p.z)) < 0.2) continue;
      this.cyto.push(p);
    }
    for (let k = 0; this.inside.length < 14 && k < 800; k++) {
      const p = new THREE.Vector3(
        this.C.x + (rand(k, 4) * 2 - 1) * this.R.x * 0.8,
        this.C.y + (rand(k, 5) * 2 - 1) * this.R.y * 0.8,
        this.cutZ + 0.02 + rand(k, 6) * (this.C.z + this.R.z - this.cutZ) * 0.7,
      );
      if (this.ell(p.x, p.y, p.z) < 0.8) this.inside.push(p);
    }
    // the learner's three (Your turn)
    this.extra = [0, 1, 2].map((i) => ({ from: this.cyto[11 + i] || this.cyto[i], to: this.inside[11 + i] || this.inside[i], state: 'hidden', t0: 0 }));
    this.clock = 0;
  }

  ell(x, y, z = null) {
    const dx = (x - this.C.x) / this.R.x;
    const dy = (y - this.C.y) / this.R.y;
    const dz = z == null ? 0 : (z - this.C.z) / this.R.z;
    return dx * dx + dy * dy + dz * dz;
  }

  path(from, to, e, out) {
    const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.05, 0.16));
    return new THREE.QuadraticBezierCurve3(from, ctrl, to).getPoint(e, out);
  }

  render({ local, T }) {
    this.clock = T;
    this.pool.begin();
    let filled = 0;
    const pos = new THREE.Vector3();
    for (let k = 0; k < 11; k++) {
      const appear = 0.6 + k * 0.1;
      const move = 3.0 + k * 0.25;
      if (local < appear) continue;
      const bob = new THREE.Vector3(0, 0.008 * Math.sin(T * 1.8 + k), 0);
      if (local < move) {
        this.pool.add(pos.copy(this.cyto[k]).add(bob), 0.075 * Math.min(1, (local - appear) / 0.35), 0, k);
      } else {
        const e = easeInOutCubic(Math.min(1, (local - move) / 2.2));
        this.path(this.cyto[k], this.inside[k], e, pos);
        if (e >= 1) pos.add(bob);
        this.pool.add(pos, 0.075, e * 3, k);
        filled += e;
      }
    }
    // the learner's wastes
    for (const [i, x] of this.extra.entries()) {
      if (x.state === 'hidden') continue;
      if (x.state === 'waiting') this.pool.add(pos.copy(x.from).add(new THREE.Vector3(0, 0.01 * Math.sin(T * 3 + i), 0)), 0.08, 0, 50 + i);
      else {
        const e = x.state === 'moving' ? easeInOutCubic(Math.min(1, (this.liveClock - x.t0) / 1.4)) : 1;
        if (x.state === 'moving' && e >= 1) x.state = 'stored';
        this.path(x.from, x.to, e, pos);
        this.pool.add(pos, 0.075, e * 3, 50 + i);
      }
    }
    this.pool.end();
    const full = Math.min(1, filled / 11);
    for (const m of this.vacMeshes) this.world.looks.setBaseColor(m, this.baseColor.clone().lerp(this.fullColor, full * 0.75));
    this.vacMeshes.forEach((m) => this.world.looks.touch(m));
  }

  /** screen-tap targets for the Your turn */
  extraPositions() {
    return this.extra.map((x) => x.from);
  }

  openTask() {
    for (const x of this.extra) if (x.state === 'hidden') x.state = 'waiting';
  }

  storeOne(i) {
    const x = this.extra[i];
    if (!x || x.state !== 'waiting') return false;
    x.state = 'moving';
    x.t0 = this.liveClock;
    return true;
  }

  tickLive(dt) {
    this.liveClock = (this.liveClock || 0) + dt;
  }

  remaining() {
    return this.extra.filter((x) => x.state === 'waiting').length;
  }

  /** after the task (or when scrubbing past it) the three are simply stored */
  settle(done) {
    for (const x of this.extra) x.state = done ? 'stored' : 'hidden';
  }

  hide() {
    this.pool.clear();
    for (const m of this.vacMeshes) this.world.looks.setBaseColor(m, this.baseColor);
    this.vacMeshes.forEach((m) => this.world.looks.touch(m));
  }
}
