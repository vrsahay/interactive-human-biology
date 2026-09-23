import * as THREE from 'three';
import { easeInOutCubic, easeInOutSine, smoothstep } from '../../../animation/easing.js';
import { forEachBirth, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';

/**
 * WATER → PLANT → LEAF → WATER LEAVES THE PLANT (transpiration).
 * The path was authored in Blender (PATH_Water_00…25): soil → root → stem →
 * branch → hero leaf, along the CENTRE of the root, stem, branch, stalk and midrib (inside the plant).
 * Drops are drawn on top (x-ray) inside a pale xylem channel; while they climb, the stem goes
 * see-through (V2.4, DA-08).
 *   enter   drops move from the soil into a root
 *   rise    a lead drop climbs the plant; the CAMERA FOLLOWS it
 *   vapour  at the leaf, water leaves as vapour
 *   cycle   the whole route runs at once
 *   ambient vapour from several leaves (final summary)
 */
export class Water {
  constructor(world) {
    this.world = world;
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const n = world.find(`PATH_Water_${String(i).padStart(2, '0')}`);
      if (!n) break;
      pts.push(n.getWorldPosition(new THREE.Vector3()));
    }
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.drops = world.pool('Water_Droplet', 'plant', 180, { onTop: true, emissiveK: 0.25, opacity: 0.95 });
    this.vapour = world.pool('Vapour_Puff', 'plant', 160, { opacity: 0.5, emissiveK: 0.35 });
    const up = (p, n) => n.y > -0.3;
    this.hero = surfaceTable(meshesOf(world.node('Leaf_Hero'))[0], 80, 41, { filter: up }).map(face);
    const extra = ['Leaf_05', 'Leaf_11', 'Leaf_16', 'Leaf_22', 'Leaf_28'].map((n) => world.find(n)).filter(Boolean);
    this.extra = extra.flatMap((n, i) => surfaceTable(meshesOf(n)[0], 24, 90 + i, { filter: up }).map(face));
    this.leadU = (local, span) => 0.06 + 0.94 * easeInOutCubic(Math.min(1, Math.max(0, (local - 0.4) / Math.max(1, span - 1.6))));
    this.tmp = new THREE.Vector3();
    // V2.4 (DA-08): the water's route inside the plant is shown as a thin pale xylem channel (x-ray), and
    // while a drop climbs the stem and branches are see-through, so the water is read as INSIDE the plant
    // (root → stem → branch → leaf stalk → midrib), never as drops running over the outside.
    const tube = new THREE.TubeGeometry(this.curve, 320, 0.0042, 8, false);
    this.channelIndex = tube.index.count;
    this.channelMat = new THREE.MeshBasicMaterial({ color: '#f1e3b4', transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    this.channel = new THREE.Mesh(tube, this.channelMat);
    this.channel.renderOrder = 19;
    this.channel.userData.noLook = true;
    this.channel.visible = false;
    world.stageGroup('plant').add(this.channel);
    this.stemMeshes = [world.node('Stem_Main'), ...world.group('@branches')].filter(Boolean).flatMap(meshesOf);
  }

  /** show the xylem channel up to u (0..1 along the route) at opacity a */
  showChannel(u, a) {
    this.channel.visible = a > 0.01;
    this.channelMat.opacity = a;
    this.channel.geometry.setDrawRange(0, Math.ceil((this.channelIndex / 6) * u) * 6);
  }

  jitter(k) {
    return new THREE.Vector3((rand(k, 21) - 0.5) * 0.014, (rand(k, 22) - 0.5) * 0.014, (rand(k, 23) - 0.5) * 0.014);
  }

  drop(u, k, size) {
    const pos = this.curve.getPointAt(Math.min(1, Math.max(0, u)), new THREE.Vector3()).add(this.jitter(k));
    this.drops.add(pos, size, 0, k);
  }

  stream(local, { from, to, rate, life, start = 0, end = Infinity, salt = 1, size = 0.021 }) {
    forEachBirth({ t: local, start, end, rate, life, salt }, (k, age, x) => {
      const u = from + (to - from) * x;
      const s = x < 0.08 ? x / 0.08 : x > 0.95 ? (1 - x) / 0.05 : 1;
      this.drop(u, k + salt * 1000, size * s);
    });
  }

  puffs(local, { rate, life = 3.2, start = 0, end = Infinity, salt = 5, ambient = false }) {
    forEachBirth({ t: local, start, end, rate, life, salt }, (k, age, x) => {
      const src = ambient && rand(k, 31) < 0.6 ? this.extra : this.hero;
      const { p, n } = src[Math.floor(rand(k, 32) * src.length)];
      const e = easeInOutSine(x);
      const pos = p.clone().addScaledVector(n, 0.02 + 0.03 * Math.min(1, x * 4))
        .add(new THREE.Vector3((rand(k, 33) - 0.5) * 0.1 * e, 0.3 * x, (rand(k, 34) - 0.5) * 0.1 * e));
      const s = (x < 0.15 ? x / 0.15 : 1) * (0.6 + x * 1.1) * (x > 0.75 ? (1 - x) / 0.25 : 1);
      this.vapour.add(pos, 0.024 * s, age * 0.25, k);
    });
  }

  render({ mode, local, span }) {
    this.drops.begin();
    this.vapour.begin();
    const fade = span - 0.6;
    const inOut = smoothstep(0, 0.8, local) * (1 - smoothstep(span - 0.5, span, local));
    this.showChannel(1, 0);
    if (mode === 'enter') {
      this.stream(local, { from: 0, to: 0.16, rate: 3.2, life: 2.6, start: 0.8, end: fade });
      this.showChannel(0.2, 0.55 * inOut);
    } else if (mode === 'rise') {
      this.stream(local, { from: 0, to: 0.16, rate: 1.5, life: 2.6, end: fade });
      this.stream(local, { from: 0.02, to: 1, rate: 2, life: 9, salt: 2, end: fade });
      this.drop(this.leadU(local, span), 9999, 0.03);
      this.showChannel(1, 0.7 * inOut);
      this.world.looks.target(this.stemMeshes, 'fade', 1 - 0.55 * inOut);
    } else if (mode === 'vapour') {
      this.stream(local, { from: 0.8, to: 1, rate: 2.2, life: 1.8, salt: 3, end: fade });
      this.puffs(local, { rate: 5, start: 0.6, end: fade });
    } else if (mode === 'cycle') {
      this.stream(local, { from: 0, to: 1, rate: 2.4, life: 9, salt: 4, start: -9, end: fade });
      this.showChannel(1, 0.55 * inOut);
      this.puffs(local, { rate: 4, start: -3, end: fade });
    } else if (mode === 'ambient') {
      this.puffs(local, { rate: 3.6, ambient: true, start: 0.3, end: span - 0.8 });
    }
    this.drops.end();
    this.vapour.end();
  }

  /** Camera for the 'rise' shot: trail the lead drop from the side. */
  followPose(local, span) {
    const p = this.curve.getPointAt(this.leadU(local, span), new THREE.Vector3());
    const k = smoothstep(0.75, 1, this.leadU(local, span));
    const off = new THREE.Vector3(0.42, 0.14, 0.82).multiplyScalar(1 - 0.25 * k);
    return { pos: p.clone().add(off), target: p, fov: 34 };
  }

  hide() {
    this.drops.clear();
    this.vapour.clear();
    this.showChannel(1, 0);
  }
}

function face({ p, n }) {
  if (n.y < 0) n.negate();
  return { p, n };
}
