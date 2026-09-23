import * as THREE from 'three';
import { easeInOutCubic, smoothstep } from '../../../animation/easing.js';
import { meshesOf } from '../../../scene/Looks.js';
import { pathCurve, streamAlong } from './flow.js';

/**
 * XYLEM, MAGNIFIED (11_xylem, micro scale).
 * Source: C9 Ch. 3 p. 33 (xylem: tracheids, vessels, xylem parenchyma, fibres; parenchyma is
 * the only living component; thick lignified walls); C10 p. 94 (xylem carries water);
 * C10 p. 98 (other waste products are stored as resins and gums, especially in old xylem).
 *   water  water rises through a younger vessel
 *   resin  waste products move from the living cells into the older xylem, where resins and
 *          gums build up in the tubes (the fill is a clipping plane rising through the
 *          Blender-authored resin/gum mesh). Stored, not removed.
 * Outside its shots the resin is shown as already stored (Explore, later chapters), but
 * hidden before the lesson has shown it forming.
 */
export class XylemFlow {
  constructor(world, renderer) {
    this.world = world;
    renderer.localClippingEnabled = true;
    this.waterCurve = pathCurve(world, 'PATH_XY_Water');
    this.wasteCurve = pathCurve(world, 'PATH_XY_Waste');
    this.resin = meshesOf(world.node('Resin_Gum_In_Old_Xylem'));
    const box = new THREE.Box3();
    for (const m of this.resin) box.expandByObject(m);
    this.y0 = box.min.y - 0.01;
    this.y1 = box.max.y + 0.01;
    this.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.y1);
    for (const m of this.resin) for (const mat of [].concat(m.material)) mat.clippingPlanes = [this.plane];
    this.young = world.node('Vessels_Young');
    this.parenchyma = world.node('Xylem_Parenchyma');
    this.drops = world.pool('Water_Droplet', 'xylem', 60, { emissiveK: 0.3, opacity: 0.95 });
    this.wastes = world.pool('Waste_Crystal', 'xylem', 40, { emissiveK: 0.25 });
    this.stored = false;
    this.fill(0);
  }

  fill(k) {
    this.plane.constant = this.y0 + (this.y1 - this.y0) * k;
  }

  render({ mode, local, span }) {
    this.drops.begin();
    this.wastes.begin();
    if (mode === 'water') {
      streamAlong(this.drops, this.waterCurve, local, { rate: 3, life: 4.5, start: -4, end: span - 0.6, salt: 3, size: 0.05, spread: 0.12 });
      this.world.addHighlight([this.young], 0.3);
      this.fill(this.stored ? 1 : 0);
    } else if (mode === 'resin') {
      streamAlong(this.wastes, this.wasteCurve, local, { rate: 2.4, life: 2.8, start: 0.5, end: Math.max(1, span - 2.5), salt: 5, size: 0.045, spread: 0.03, spin: 1.2 });
      this.world.addHighlight([this.parenchyma], 0.25);
      this.fill(easeInOutCubic(smoothstep(1.6, Math.max(3, span - 1.2), local)));
    } else if (mode === 'stored') {
      this.fill(1);
    }
    this.drops.end();
    this.wastes.end();
  }

  /** before the lesson shows resin forming: empty; after: full (set by World from lesson time) */
  settle(done) {
    this.stored = done;
  }

  hide() {
    this.drops.clear();
    this.wastes.clear();
    this.fill(this.stored ? 1 : 0);
  }
}
