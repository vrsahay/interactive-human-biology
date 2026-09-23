import * as THREE from 'three';
import { easeInOutSine, smoothstep } from '../../../animation/easing.js';
import { InstancedPool, envelope, forEachBirth, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';

const up = (p, n) => n.y > -0.3;

/**
 * Photosynthesis cue: soft streaks of sunlight fall on the leaf and it glows.
 * A simple visual cue, not a biochemical simulation.
 */
export class Sunlight {
  constructor(world) {
    this.world = world;
    this.leaf = world.node('Leaf_Hero');
    const target = world.pos('ANCHOR_Leaf_Hero');
    const sunDir = new THREE.Vector3(0.25, 1, -0.55).normalize();
    // one soft shaft of light that fades out towards the sky: reads as "sunlight
    // falling on this leaf" without hard bars crossing the subject
    const len = 0.9;
    const geo = new THREE.CylinderGeometry(0.07, 0.13, len, 32, 8, true);
    geo.translate(0, -len / 2, 0);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      const f = -pos.getY(i) / len; // 0 at the sky end, 1 at the leaf
      const a = Math.pow(f, 1.6) * (1 - Math.pow(Math.max(0, f - 0.92) / 0.08, 2));
      colors.set([1, 0.93, 0.7, a], i * 4);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.group = new THREE.Group();
    const shaft = new THREE.Mesh(geo, this.mat);
    const start = target.clone().addScaledVector(sunDir, len);
    shaft.position.copy(start);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(start).normalize());
    shaft.userData.noLook = true;
    this.group.add(shaft);
    this.group.visible = false;
    world.stageGroup('plant').add(this.group);
    this.live = null;
  }

  level(local, span) {
    if (this.live != null) return this.live;
    return smoothstep(0.2, 1.4, local) * (1 - smoothstep(span - 0.8, span, local));
  }

  render({ local, span }) {
    const v = this.level(local, span);
    this.mat.opacity = 0.2 * v;
    this.group.visible = v > 0.01;
    if (v > 0.3) this.world.addHighlight([this.leaf], v * 0.45);
  }

  hide() {
    this.group.visible = false;
  }
}

/**
 * PHOTOSYNTHESIS → OXYGEN → RELEASED INTO THE AIR.
 * mode 'form'    O₂ appears on the leaf surface and waits
 * mode 'release' those molecules rise away, and more keep coming
 * mode 'ambient' gentle release from several leaves (final summary)
 * live           learner's sunlight slider drives the rate (Your turn)
 */
export class Oxygen {
  constructor(world) {
    this.world = world;
    this.pool = world.pool('O2_Molecule', 'plant', 160, { color: '#6cc6f2', emissive: '#1f6e96', emissiveK: 0.4 });
    this.hero = surfaceTable(meshesOf(world.node('Leaf_Hero'))[0], 96, 31, { filter: up }).map(face);
    const extra = ['Leaf_03', 'Leaf_09', 'Leaf_14', 'Leaf_20', 'Leaf_26'].map((n) => world.find(n)).filter(Boolean);
    this.extra = extra.flatMap((n, i) => surfaceTable(meshesOf(n)[0], 24, 70 + i, { filter: up }).map(face));
    this.live = null;
    this.liveBirths = [];
    this.liveClock = 0;
  }

  rise(p, n, age, life, k, size) {
    const x = age / life;
    const e = easeInOutSine(x);
    const pos = p.clone()
      .addScaledVector(n, 0.012 + 0.05 * Math.min(1, x * 3))
      .add(new THREE.Vector3((rand(k, 3) - 0.5) * 0.14 * e + Math.sin(x * 9 + k) * 0.008, 0.4 * x, (rand(k, 4) - 0.5) * 0.14 * e));
    this.pool.add(pos, size * envelope(x), age * 0.8, k);
  }

  render({ mode, local, span }) {
    this.pool.begin();
    if (this.live != null) this.renderLive();
    else if (mode === 'form') {
      for (let k = 0; k < 12; k++) {
        const { p, n } = this.hero[(k * 11) % this.hero.length];
        const a = local - (1.0 + k * 0.14);
        if (a < 0) continue;
        const pos = p.clone().addScaledVector(n, 0.012 + 0.003 * Math.sin(local * 2 + k));
        this.pool.add(pos, 0.0105 * Math.min(1, a / 0.35), 0, k);
      }
    } else if (mode === 'release' || mode === 'ambient') {
      const ambient = mode === 'ambient';
      if (!ambient) {
        // the molecules that formed in the previous shot rise first
        for (let k = 0; k < 12; k++) {
          const { p, n } = this.hero[(k * 11) % this.hero.length];
          const age = local - rand(k, 5) * 0.8;
          if (age >= 0 && age < 3.8) this.rise(p, n, age, 3.8, k, 0.012);
          else if (age < 0) this.pool.add(p.clone().addScaledVector(n, 0.012), 0.012, 0, k);
        }
      }
      const fadeOut = 1 - smoothstep(span - 1.0, span, local);
      forEachBirth({ t: local, start: ambient ? 0 : 0.6, end: span - 1.2, rate: ambient ? 3.2 : 4.2, life: 3.6, salt: 11 }, (k, age) => {
        const src = ambient && rand(k, 12) < 0.6 ? this.extra : this.hero;
        const { p, n } = src[Math.floor(rand(k, 13) * src.length)];
        this.rise(p, n, age, 3.6, k + 100, (ambient ? 0.011 : 0.012) * (ambient ? 1 : Math.max(0.35, fadeOut)));
      });
    }
    this.pool.end();
  }

  /** Your turn: more light → photosynthesis runs → oxygen leaves the leaf. */
  renderLive() {
    const now = this.liveClock;
    this.liveBirths = this.liveBirths.filter((b) => now - b.t < 3.6);
    for (const b of this.liveBirths) {
      const { p, n } = this.hero[b.k % this.hero.length];
      this.rise(p, n, now - b.t, 3.6, b.k, 0.012);
    }
  }

  tickLive(dt, light) {
    this.liveClock += dt;
    const rate = light > 0.15 ? 6 * light : 0;
    this.liveAcc = (this.liveAcc || 0) + dt * rate;
    while (this.liveAcc >= 1) {
      this.liveAcc -= 1;
      this.liveBirths.push({ t: this.liveClock, k: (this.liveK = (this.liveK || 500) + 1) });
    }
  }

  hide() {
    if (this.live == null) this.pool.clear();
  }
}

function face({ p, n }) {
  // the leaf is double-sided: always emit from its upper face
  if (n.y < 0) n.negate();
  return { p, n };
}
