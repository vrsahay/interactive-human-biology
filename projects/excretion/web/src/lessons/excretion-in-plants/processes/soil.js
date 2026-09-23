import * as THREE from 'three';
import { forEachBirth, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';

/**
 * SOME WASTE SUBSTANCES → ROOT REGION → SURROUNDING SOIL.
 * Kept deliberately schematic and slow: a few small wastes leave the root
 * surfaces and drift a short way into the soil, fading. No mechanism is shown.
 */
export class Soil {
  constructor(world) {
    this.world = world;
    this.pool = world.pool('Soil_Waste_Particle', 'plant', 120);
    this.points = surfaceTable(meshesOf(world.node('Roots'))[0], 160, 61, { filter: (p) => p.y < -0.05 });
  }

  render({ mode, local, span }) {
    this.pool.begin();
    const ambient = mode === 'ambient';
    forEachBirth({ t: local, start: ambient ? 0.2 : 0.8, end: span - 0.8, rate: ambient ? 3.5 : 5, life: 4.6, salt: 17 }, (k, age, x) => {
      const { p, n } = this.points[Math.floor(rand(k, 41) * this.points.length)];
      const dir = n.clone().add(new THREE.Vector3((rand(k, 42) - 0.5) * 0.6, -0.25, (rand(k, 43) - 0.5) * 0.3)).normalize();
      const dist = 0.05 + rand(k, 44) * 0.07;
      const pos = p.clone().addScaledVector(n, 0.006).addScaledVector(dir, dist * (1 - Math.pow(1 - x, 2)));
      pos.y = Math.min(pos.y, -0.02);
      const s = (x < 0.15 ? x / 0.15 : 1) * (x > 0.55 ? Math.max(0, (1 - x) / 0.45) : 1);
      this.pool.add(pos, (0.012 + rand(k, 45) * 0.005) * s, age * 0.5, k);
    });
    this.pool.end();
  }

  hide() {
    this.pool.clear();
  }
}
