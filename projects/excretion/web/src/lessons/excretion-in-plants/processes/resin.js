import * as THREE from 'three';
import { easeInOutSine, easeOutBack } from '../../../animation/easing.js';

/**
 * WASTE → RESINS / GUMS → STORED, ESPECIALLY IN OLD XYLEM.
 * Wastes travel inward from the outer layers; where each arrives in the old
 * xylem, one of the Blender-authored deposits (Resin_01…16) grows. Deposits
 * fill from the centre outward so the eye follows the old xylem.
 */
export class Resin {
  constructor(world) {
    this.world = world;
    this.pool = world.pool('Waste_Crystal', 'stem', 24);
    this.deposits = [];
    for (let i = 1; i <= 40; i++) {
      const n = world.find(`Resin_${String(i).padStart(2, '0')}`);
      if (!n) break;
      this.deposits.push({ node: n, home: n.position.clone(), scale: n.scale.clone() });
    }
    this.deposits.sort((a, b) => Math.hypot(a.home.x, a.home.z) - Math.hypot(b.home.x, b.home.z));
    this.hide();
  }

  grow(dep, k) {
    dep.node.scale.copy(dep.scale).multiplyScalar(Math.max(0.0001, k));
    dep.node.visible = k > 0.01;
  }

  render({ mode, local }) {
    this.pool.begin();
    if (mode === 'stored') {
      // V2: the resin was seen forming in the xylem close-up; here the stem simply holds it
      this.deposits.forEach((dep) => this.grow(dep, 1));
      this.pool.end();
      return;
    }
    const pos = new THREE.Vector3();
    this.deposits.forEach((dep, i) => {
      const end = dep.home;
      const flat = new THREE.Vector3(end.x, 0, end.z);
      const dir = flat.lengthSq() > 1e-6 ? flat.normalize() : new THREE.Vector3(1, 0, 0);
      const onTop = Math.abs(end.y) < 0.01;
      const start = dir.clone().multiplyScalar(0.58).setY(onTop ? 0.04 : end.y);
      const born = 0.4 + i * 0.3;
      const a = local - born;
      if (a < 0) {
        this.grow(dep, 0);
        return;
      }
      if (a < 1.7) {
        const x = a / 1.7;
        const e = easeInOutSine(x);
        pos.lerpVectors(start, end, e);
        pos.y += Math.sin(Math.PI * e) * (onTop ? 0.05 : 0) + (onTop ? 0.02 * (1 - e) : 0);
        const s = x < 0.12 ? x / 0.12 : x > 0.85 ? (1 - x) / 0.15 : 1;
        this.pool.add(pos, 0.03 * s, a * 1.4, i);
      }
      this.grow(dep, a < 1.45 ? 0 : easeOutBack(Math.min(1, (a - 1.45) / 0.8)));
    });
    this.pool.end();
  }

  hide() {
    this.pool.clear();
    this.deposits.forEach((d) => this.grow(d, 0));
  }
}
