import * as THREE from 'three';
import { easeInOutSine, smoothstep } from '../../../animation/easing.js';
import { forEachBirth, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';
import { lifeScale, nearestU, pathCurve, streamAlong } from './flow.js';

/**
 * ONE ROOT, MAGNIFIED (14_root, meso scale).
 * Source: C9 Ch. 3 p. 32 (root hairs increase the surface for absorbing water and minerals);
 * C10 p. 94 (water from the soil moves into the root and into the root xylem, and rises);
 * C10 p. 98 (plants excrete some waste substances into the soil around them).
 *   water  soil water → root hairs → into the root → root xylem → upwards
 *   waste  waste substances leave the root surface into the soil (no mechanism shown)
 */
export class RootFlow {
  constructor(world) {
    this.world = world;
    this.water = pathCurve(world, 'PATH_RT_Water');
    this.waste = pathCurve(world, 'PATH_RT_Waste');
    this.surfaceU = nearestU(this.water, world.pos('ANCHOR_RT_Surface'));
    this.hairs = world.node('Root_Hairs');
    const body = meshesOf(world.node('Root_Body'))[0];
    const hairMesh = meshesOf(this.hairs)[0];
    const axisX = world.pos('ANCHOR_RT_Xylem');
    // hair tips facing the viewer feed the stream (many hairs, one route inward)
    this.tips = surfaceTable(hairMesh, 400, 71, {
      filter: (p) => Math.hypot(p.x - axisX.x, p.z - axisX.z) > 0.16 && p.z > -0.02,
    }).map((s) => s.p);
    this.surface = surfaceTable(body, 160, 72, { filter: (p, n) => n.z > 0.1 && p.y > 0.3 && p.y < 1.2 });
    this.drops = world.pool('Water_Droplet', 'root', 140, { emissiveK: 0.3, opacity: 0.95, onTop: true });
    this.wastes = world.pool('Soil_Waste_Particle', 'root', 80, { emissiveK: 0.25 });
  }

  render({ mode, local, span }) {
    this.drops.begin();
    this.wastes.begin();
    if (mode === 'water') {
      streamAlong(this.drops, this.water, local, {
        rate: 5, life: 5.5, start: -3, end: span - 0.6, salt: 3, size: 0.016, starts: this.tips, from: 0.1,
        joinU: this.surfaceU + 0.06, spread: 0.008,
      });
      this.world.addHighlight([this.hairs], 0.35);
    } else if (mode === 'waste') {
      const p = new THREE.Vector3();
      forEachBirth({ t: local, start: 0.5, end: span - 0.6, rate: 3.2, life: 4.2, salt: 9 }, (k, age, x) => {
        const s = this.surface[Math.floor(rand(k, 10) * this.surface.length)];
        const e = easeInOutSine(x);
        p.copy(s.p).addScaledVector(s.n, 0.01 + 0.26 * e);
        p.y -= 0.04 * e;
        this.wastes.add(p, 0.02 * lifeScale(x, 0.12, 0.35), age * 0.4, k);
      });
      streamAlong(this.wastes, this.waste, local, { rate: 1.2, life: 4, start: 0.3, end: span - 0.6, salt: 11, size: 0.022, spread: 0.01 });
    }
    this.drops.end();
    this.wastes.end();
  }

  hide() {
    this.drops.clear();
    this.wastes.clear();
  }
}

/**
 * ROOT HAIRS AMONG SOIL PARTICLES (15_root_hairs, micro scale).
 *   water  water held round the soil particles → into a root hair → its cell → inward
 *   waste  waste substances from a root surface cell → out into the soil
 */
export class HairFlow {
  constructor(world) {
    this.world = world;
    this.water = pathCurve(world, 'PATH_RH_Water');
    this.waste = pathCurve(world, 'PATH_RH_Waste');
    this.hairs = world.node('RH_Root_Hairs');
    this.soilWater = world.node('RH_Soil_Water');
    const film = meshesOf(this.soilWater)[0];
    this.filmSites = surfaceTable(film, 120, 73, { filter: (p, n) => n.z > 0 }).map((s) => s.p);
    this.drops = world.pool('Water_Droplet', 'rootHairs', 90, { emissiveK: 0.3, opacity: 0.95, onTop: true });
    this.wastes = world.pool('Soil_Waste_Particle', 'rootHairs', 60, { emissiveK: 0.25 });
    // V2.2: waste leaves the top of one surface cell, then spreads sideways into the water between
    // the soil grains (not up along a hair)
    this.wasteFrom = world.pos('PATH_RH_Waste_00');
    this.wasteTo = this.filmSites.filter((p) => {
      const d = p.clone().sub(this.wasteFrom);
      return d.length() > 0.2 && d.length() < 0.6 && Math.abs(d.x) > 0.12 && d.y > 0.05 && d.y < 0.45;
    });
    if (this.wasteTo.length < 4) this.wasteTo = this.filmSites.slice(0, 12);
    this.entryU = 0.12;
    // V2.4.1: the soil's own moisture stays put (it is the static RH_Soil_Water mesh). Only a FEW teaching
    // drops move, and they start in the water held next to the labelled root hair, never in open air.
    const start = world.pos('PATH_RH_Water_00');
    this.teachSites = this.filmSites.filter((p) => p.distanceTo(start) < 0.32);
    if (this.teachSites.length < 3) this.teachSites = [start];
  }

  render({ mode, local, span }) {
    this.drops.begin();
    this.wastes.begin();
    if (mode === 'water') {
      streamAlong(this.drops, this.water, local, {
        rate: 1.5, life: 6.5, start: -4, end: span - 0.6, salt: 5, size: 0.042, starts: this.teachSites, joinU: this.entryU, spread: 0.012,
      });
      this.world.addHighlight([this.hairs], 0.4 * smoothstep(0.5, 1.5, local));
    } else if (mode === 'waste') {
      const p = new THREE.Vector3();
      const from = this.wasteFrom;
      forEachBirth({ t: local, start: 0.4, end: span - 0.6, rate: 2.6, life: 4.4, salt: 13 }, (k, age, x) => {
        const to = this.wasteTo[Math.floor(rand(k, 14) * this.wasteTo.length)];
        const e = easeInOutSine(x);
        const lift = 0.06 * Math.sin(Math.PI * Math.min(1, x * 1.6));
        p.lerpVectors(from, to, e);
        p.y += lift;
        p.z += (rand(k, 15) - 0.5) * 0.04;
        this.wastes.add(p, 0.09 * lifeScale(x, 0.1, 0.25), age * 0.5, k);
      });
    }
    this.drops.end();
    this.wastes.end();
  }

  hide() {
    this.drops.clear();
    this.wastes.clear();
  }
}
