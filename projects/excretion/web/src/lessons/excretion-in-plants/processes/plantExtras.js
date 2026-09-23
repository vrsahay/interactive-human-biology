import * as THREE from 'three';
import { forEachBirth, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';
import { lifeScale } from './flow.js';

/**
 * C10 p. 83: gases are also exchanged across the surface of stems and roots (not only
 * through stomata). Small gas symbols cross the stem and root surfaces, both ways.
 */
export class SurfaceGas {
  constructor(world) {
    this.world = world;
    this.stem = world.node('Stem_Main');
    this.roots = world.node('Roots');
    this.points = [
      ...surfaceTable(meshesOf(this.stem)[0], 80, 101, { filter: (p, n) => n.z > 0 }),
      ...surfaceTable(meshesOf(this.roots)[0], 80, 102, { filter: (p) => p.y < -0.04 }),
    ];
    this.o2 = world.pool('O2_Molecule', 'plant', 60, { color: '#6cc6f2', emissive: '#1f6e96', emissiveK: 0.45 });
    this.co2 = world.pool('CO2_Molecule', 'plant', 60, { emissiveK: 0.5, lighten: 0.15 });
  }

  render({ local, span }) {
    this.o2.begin();
    this.co2.begin();
    const p = new THREE.Vector3();
    forEachBirth({ t: local, start: 0.4, end: span - 0.6, rate: 10, life: 2.6, salt: 31 }, (k, age, x) => {
      const s = this.points[Math.floor(rand(k, 32) * this.points.length)];
      const inward = rand(k, 33) < 0.5;
      const d = inward ? 0.13 * (1 - x) : 0.13 * x;
      p.copy(s.p).addScaledVector(s.n, 0.004 + d);
      (inward ? this.co2 : this.o2).add(p, 0.02 * lifeScale(x, 0.15, 0.3), age, k);
    });
    this.world.addHighlight([this.stem, this.roots], 0.35);
    this.o2.end();
    this.co2.end();
  }

  hide() {
    this.o2.clear();
    this.co2.clear();
  }
}

/**
 * C10 p. 89: at night, when there is no photosynthesis, CO2 elimination is the major
 * exchange. Plant scale: grey CO2 drifts slowly away from the leaves (no route named).
 */
export class NightCO2 {
  constructor(world) {
    this.world = world;
    const leaves = world.group('@leaves').filter((n) => n.name !== 'Leaf_Old').filter((_, i) => i % 3 === 0);
    this.points = leaves.flatMap((n, i) => surfaceTable(meshesOf(n)[0], 10, 140 + i));
    this.pool = world.pool('CO2_Molecule', 'plant', 90, { emissiveK: 0.6, lighten: 0.18 });
    this.trackAnchor = world.track('TRACK_RESP_CO2', 'plant');
    const s0 = this.points[0];
    this.trackAnchor.position.copy(s0.p).addScaledVector(s0.n.y < 0 ? s0.n.clone().negate() : s0.n, 0.02);
  }

  /** V2.2 'form': respiration makes CO2 in the leaves. By day it is not given out, so it stays. */
  form(local, shot) {
    const t0 = shot?.sentenceStarts?.[2] != null ? (shot.sentenceStarts[2] + 350) / 1000 - 0.2 : 5.8;
    const p = new THREE.Vector3();
    const n = Math.min(24, this.points.length);
    for (let k = 0; k < n; k++) {
      const a = local - (t0 + k * 0.1);
      if (a < 0) continue;
      const s = this.points[k];
      const nrm = s.n.y < 0 ? s.n.clone().negate() : s.n;
      p.copy(s.p).addScaledVector(nrm, 0.02 + 0.006 * Math.sin(local * 2 + k));
      this.pool.add(p, 0.034 * Math.min(1, a / 0.5), local * 0.3, k);
    }
  }

  render({ mode, local, span, shot }) {
    this.pool.begin();
    if (mode === 'form') {
      this.form(local, shot);
      this.pool.end();
      return;
    }
    const p = new THREE.Vector3();
    forEachBirth({ t: local, start: -2, end: span - 0.6, rate: 5, life: 4.2, salt: 41 }, (k, age, x) => {
      const s = this.points[Math.floor(rand(k, 42) * this.points.length)];
      const n = s.n.y < 0 ? s.n.clone().negate() : s.n;
      p.copy(s.p).addScaledVector(n, 0.012 + 0.04 * Math.min(1, x * 3));
      p.x += (rand(k, 43) - 0.5) * 0.12 * x;
      p.z += (rand(k, 44) - 0.5) * 0.12 * x;
      p.y += 0.26 * x;
      this.pool.add(p, 0.036 * lifeScale(x, 0.12, 0.3), age * 0.5, k);
    });
    this.pool.end();
  }

  hide() {
    this.pool.clear();
  }
}
