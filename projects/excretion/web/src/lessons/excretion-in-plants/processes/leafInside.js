import * as THREE from 'three';
import { easeInOutSine } from '../../../animation/easing.js';
import { forEachBirth, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';
import { lifeScale, nearestU, pathCurve, streamAlong } from './flow.js';

/**
 * INSIDE THE LEAF (05_leaf_internal, micro scale): the routes gases and water take.
 * Source: C10 p. 88 (exchange through stomata; large inter-cellular spaces; diffusion),
 * p. 89 (by day, respiration CO2 is used in photosynthesis and O2 release is the major
 * event; at night CO2 elimination is the major exchange), pp. 94–95 (xylem in the leaf
 * replaces water lost through stomata; evaporation from leaf cells), C9 Ch. 3 p. 32.
 *   o2        oxygen from the palisade chloroplasts → air spaces → stoma → air
 *   co2day    CO2 from respiration is taken up by the chloroplasts (used, not released)
 *   co2night  CO2 from the cells → air spaces → stoma → air
 *   water     LIQUID water leaves a vein's xylem → cell to cell → cells at the air space; there it
 *             evaporates → VAPOUR crosses the air space → stoma → air (V2.4: no liquid in air spaces)
 * Every route: START (source) → CHANGE (where it becomes / joins) → DESTINATION (outside).
 */
export class LeafInside {
  constructor(world) {
    this.world = world;
    this.gas = pathCurve(world, 'PATH_LI_Gas');
    const pal = meshesOf(world.node('Chloroplasts_Palisade'))[0];
    // V2.1: the front row of spongy cells is its own (translucent) mesh; CO2 starts in the cells of either
    const spongy = meshesOf(world.find('Spongy_Cells_Front') || world.node('Spongy_Cells'))[0];
    const front = (p, n) => n.z > 0.2;
    this.palSites = surfaceTable(pal, 90, 51, { filter: front }).map((s) => s.p);
    this.spongySites = surfaceTable(spongy, 90, 52, { filter: front }).map((s) => s.p);
    this.cellSites = [...this.palSites.slice(0, 45), ...this.spongySites.slice(0, 45)];
    // where each route reaches the air space next to the stoma (the CHANGE point)
    this.airU = nearestU(this.gas, world.pos('ANCHOR_LI_Air_Space'));
    this.stomaU = nearestU(this.gas, world.pos('ANCHOR_LI_Stoma'));
    this.o2 = world.pool('O2_Molecule', 'leafInternal', 120, { color: '#6cc6f2', emissive: '#1f6e96', emissiveK: 0.45 });
    this.co2 = world.pool('CO2_Molecule', 'leafInternal', 120, { emissiveK: 0.55, lighten: 0.15 });
    this.drops = world.pool('Water_Droplet', 'leafInternal', 90, { emissiveK: 0.25, opacity: 0.95 });
    this.vapour = world.pool('Vapour_Puff', 'leafInternal', 90, { opacity: 0.55, emissiveK: 0.4 });
    this.tmp = new THREE.Vector3();
    this.buildWaterRoutes(world, spongy);
  }

  /**
   * V2.4 (DA-02, DA-03): LIQUID water stays with the tissue: it leaves the xylem and passes from cell to
   * cell (bundle sheath, then spongy cells) to the cells that border the air space above the stoma. Only
   * there, at the cells' surface, does it become VAPOUR, and only vapour crosses the air space and leaves
   * through the stoma. So no liquid drop ever flies through an air space.
   */
  buildWaterRoutes(world, spongy) {
    const air = world.pos('ANCHOR_LI_Air_Space');
    const xylem = world.pos('ANCHOR_LI_Xylem');
    const sheath = meshesOf(world.find('Bundle_Sheath'))[0];
    const front = (p, n) => n.z > 0.35;
    const sites = [...surfaceTable(spongy, 420, 61, { filter: front }), ...(sheath ? surfaceTable(sheath, 80, 62, { filter: front }) : [])]
      .map((s) => s.p.clone().addScaledVector(s.n, 0.012));
    // the evaporating surfaces: front faces of cells at the edge of the air space
    const edge = sites.filter((p) => {
      const d = Math.hypot(p.x - air.x, p.y - air.y);
      return d > 0.13 && d < 0.24 && p.y > air.y - 0.12;
    });
    edge.sort((a, b) => b.x - a.x);
    const ends = [0, 0.25, 0.5, 0.75, 1].map((f) => edge[Math.floor(f * (edge.length - 1))]).filter(Boolean);
    this.waterRoutes = ends.map((end, r) => {
      const pts = [xylem.clone()];
      let cur = xylem.clone();
      for (let step = 0; step < 40 && cur.distanceTo(end) > 0.1; step++) {
        const left = cur.distanceTo(end);
        let best = null;
        let bd = Infinity;
        for (let i = 0; i < sites.length; i++) {
          const c = sites[i];
          const hop = c.distanceTo(cur);
          if (hop < 0.03 || hop > 0.13) continue;
          const score = c.distanceTo(end) + rand(i + r * 997, 63) * 0.04;
          if (c.distanceTo(end) < left - 0.02 && score < bd) {
            bd = score;
            best = c;
          }
        }
        if (!best) break;
        pts.push(best.clone());
        cur = best;
      }
      pts.push(end.clone());
      return { curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5), end: end.clone() };
    });
    this.airCentre = air.clone();
    this.tVapour = world.track('TRACK_LI_Vapour', 'leafInternal');
    // on the vapour column in the middle of the air space, clear of the wet cell surfaces above it
    this.gas.getPointAt(Math.min(1, this.airU + (1 - this.airU) * 0.12), this.tVapour.position);
    this.tVapour.userData.labelOff = true;
  }

  /** liquid water: xylem → cells (arrives and is taken up) · vapour: forms at the cell surfaces, leaves */
  renderWater(local, span, track) {
    const p = this.tmp;
    const R = this.waterRoutes;
    forEachBirth({ t: local, start: -1.5, end: span - 0.6, rate: 3.2, life: 4.2, salt: 21 }, (k, age, x) => {
      const route = R[Math.floor(rand(k, 22) * R.length)];
      const along = Math.min(1, x / 0.8);
      route.curve.getPointAt(easeInOutSine(along), p);
      // taken up by the cell when it gets there
      const s = 0.036 * Math.min(1, x / 0.06) * (x > 0.8 ? Math.max(0, 1 - (x - 0.8) / 0.2) : 1);
      if (s > 0.002) this.drops.add(p, s, 0, k);
    });
    // evaporation starts with the shot that names it ("From the cells, some water evaporates…")
    const tl = this.world.timeline;
    const next = track && track.to !== track.from ? tl?.byId.get(track.to) : null;
    const evapAt = next ? (next.start - track.start) / 1000 : 1.5;
    let out = false;
    forEachBirth({ t: local, start: evapAt, end: span - 0.6, rate: 4.5, life: 5.0, salt: 31 }, (k, age, x) => {
      const route = R[Math.floor(rand(k, 32) * R.length)];
      // 0 → 0.25: the puff forms at the wet cell surface and drifts into the air space; then out with the gas
      if (x < 0.25) {
        p.lerpVectors(route.end, this.airCentre, easeInOutSine(x / 0.25));
      } else {
        const u = this.airU + (1 - this.airU) * ((x - 0.25) / 0.75);
        this.gas.getPointAt(Math.min(1, u), p);
      }
      p.x += (rand(k, 33) - 0.5) * 0.05 * Math.min(1, x * 3);
      p.y += (rand(k, 34) - 0.5) * 0.03 * Math.min(1, x * 3);
      const grow = Math.min(1, x / 0.12);
      this.vapour.add(p, 0.05 * grow * (0.8 + 0.5 * x) * lifeScale(x, 0, 0.1), age * 0.3, k);
      if (x > 0.2) out = true;
    });
    // the label names the vapour in the air space, and waits until the first puffs are there
    this.tVapour.userData.labelOff = !out;
  }

  outward(pool, local, span, { starts, rate, salt, size }) {
    streamAlong(pool, this.gas, local, {
      rate, life: 5.2, start: -2, end: span - 0.6, salt, size, starts, joinU: this.airU, spread: 0.035, from: 0.0, to: 1,
      sizeFn: (x, k, u) => lifeScale(x, 0.06, 0.1),
    });
  }

  render({ mode, local, span, track }) {
    this.o2.begin();
    this.co2.begin();
    this.drops.begin();
    this.vapour.begin();
    if (mode === 'o2') {
      this.outward(this.o2, local, span, { starts: this.palSites, rate: 4.2, salt: 3, size: 0.04 });
    } else if (mode === 'co2day') {
      // respiration CO2 moves from the cells to the chloroplasts and is used there
      const p = this.tmp;
      forEachBirth({ t: local, start: 0.4, end: span - 0.6, rate: 3.4, life: 3.2, salt: 9 }, (k, age, x) => {
        const a = this.spongySites[Math.floor(rand(k, 10) * this.spongySites.length)];
        const b = this.palSites[Math.floor(rand(k, 11) * this.palSites.length)];
        p.lerpVectors(a, b, easeInOutSine(Math.min(1, x / 0.85)));
        const used = x > 0.85 ? Math.max(0, 1 - (x - 0.85) / 0.15) : 1;
        this.co2.add(p, 0.062 * Math.min(1, x / 0.1) * used, age * 0.6, k);
      });
      this.outward(this.o2, local, span, { starts: this.palSites, rate: 3.2, salt: 4, size: 0.034 });
    } else if (mode === 'co2night') {
      // thin and slow: at night most stomata are nearly closed (biological-accuracy-audit C-11)
      this.outward(this.co2, local, span, { starts: this.cellSites, rate: 1.6, salt: 5, size: 0.056 });
    } else if (mode === 'water') {
      this.renderWater(local, span, track);
    }
    this.o2.end();
    this.co2.end();
    this.drops.end();
    this.vapour.end();
  }

  hide() {
    this.o2.clear();
    this.co2.clear();
    this.drops.clear();
    this.vapour.clear();
    if (this.tVapour) this.tVapour.userData.labelOff = true;
  }
}
