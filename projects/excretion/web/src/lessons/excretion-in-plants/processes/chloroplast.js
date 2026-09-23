import * as THREE from 'three';
import { easeInOutSine, smoothstep } from '../../../animation/easing.js';
import { forEachBirth, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';
import { lifeScale, shellPoint } from './flow.js';

/**
 * PHOTOSYNTHESIS IN A CHLOROPLAST (08_chloroplast, subcellular scale).
 * Source: C10 p. 81 (carbon dioxide + water → food, in sunlight, with chlorophyll),
 * p. 98 (oxygen is generated during photosynthesis); C9 Ch. 2 p. 18 (chlorophyll is in
 * the disc-shaped membranes). A visual cue, not biochemistry: no intermediate steps.
 *   light    sunlight falls on the chloroplast; the disc stacks (chlorophyll) glow;
 *            carbon dioxide and water arrive: water is used at the discs, CO2 in the stroma
 *   form     oxygen appears at the discs
 *   release  oxygen leaves the chloroplast (towards the cell and the air spaces)
 */
export class Photosynthesis {
  constructor(world) {
    this.world = world;
    this.discs = world.node('CP_Disc_Stacks');
    const discMesh = meshesOf(this.discs)[0];
    this.sites = surfaceTable(discMesh, 140, 81, { filter: (p, n) => n.z > -0.2 });
    this.center = world.pos('ANCHOR_CP_Stroma');
    this.discCenter = world.pos('ANCHOR_CP_Discs');
    this.out = world.pos('ANCHOR_CP_Out');
    this.co2 = world.pool('CO2_Molecule', 'chloroplast', 60, { emissiveK: 0.6, lighten: 0.12 });
    this.water = world.pool('Water_Droplet', 'chloroplast', 60, { emissiveK: 0.25, opacity: 0.95 });
    this.o2 = world.pool('O2_Molecule', 'chloroplast', 120, { color: '#6cc6f2', emissive: '#1f6e96', emissiveK: 0.45 });
    // one broad, soft shaft of sunlight from the upper right
    const len = 3.2;
    const geo = new THREE.CylinderGeometry(0.55, 1.05, len, 40, 8, true);
    geo.translate(0, -len / 2, 0);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      const f = -pos.getY(i) / len;
      colors.set([1, 0.93, 0.72, Math.pow(f, 1.4) * (1 - Math.pow(Math.max(0, f - 0.9) / 0.1, 2))], i * 4);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(geo, this.mat);
    const dir = new THREE.Vector3(0.45, 1, 0.35).normalize();
    const start = this.discCenter.clone().addScaledVector(dir, len);
    shaft.position.copy(start);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), this.discCenter.clone().sub(start).normalize());
    shaft.userData.noLook = true;
    shaft.visible = false;
    this.shaft = shaft;
    world.stageGroup('chloroplast').add(shaft);
    this.tmp = new THREE.Vector3();
    // V2.2: one CO2 and one water drop drift in slowly and carry labels (the lesson names them here)
    this.tCO2 = world.track('TRACK_CP_CO2', 'chloroplast');
    this.tWater = world.track('TRACK_CP_Water', 'chloroplast');
    this.heroCO2 = [this.center.clone().add(new THREE.Vector3(-0.15, 0.95, 0.45)), this.stromaPoint(3)];   // from above: in view on phones too
    this.heroWater = [this.center.clone().add(new THREE.Vector3(0.9, 0.7, 0.45)), this.sites[5].p.clone()];
    this.tCO2.position.copy(this.heroCO2[0]);
    this.tO2 = world.track('TRACK_CP_O2', 'chloroplast');
    const s0 = this.sites[0];
    this.tO2.position.copy(s0.p).addScaledVector(s0.n, 0.04);
    this.tWater.position.copy(this.heroWater[0]);
  }

  /** the two labelled substances: arrive slowly, then are used up at the end of the shot */
  heroes(local, span) {
    const end = Math.max(4, span - 1.0);
    const put = (pool, [a, b], t0, track, k) => {
      const e = easeInOutSine(smoothstep(t0, end, local));
      const p = a.clone().lerp(b, e);
      const s = Math.min(1, Math.max(0, (local - t0 + 0.4) / 0.4)) * (1 - smoothstep(end, end + 0.6, local));
      if (s > 0.01) pool.add(p, 0.1 * s, local * 0.4, k);
      track.position.copy(p);
    };
    put(this.co2, this.heroCO2, 1.0, this.tCO2, 9001);
    put(this.water, this.heroWater, 1.4, this.tWater, 9002);
  }

  light(local, span) {
    return smoothstep(0.2, 1.4, local) * (1 - smoothstep(span - 0.6, span, local) * 0);
  }

  /** A point in the stroma, between the disc stacks (not on a disc). */
  stromaPoint(k, out = new THREE.Vector3()) {
    const s = this.sites[Math.floor(rand(k, 17) * this.sites.length)];
    return out.copy(s.p).addScaledVector(s.n, 0.1 + rand(k, 18) * 0.08).lerp(this.center, 0.15);
  }

  /**
   * CO2 and water come in from outside and are used up. Water goes to the disc-shaped
   * membranes (where light is absorbed); CO2 is used in the stroma around them, not on the
   * discs (biological-accuracy-audit.md C-05). Neither step is named in the lesson.
   */
  inputs(local, span, rate) {
    const p = this.tmp;
    const fade = span - 0.4;
    forEachBirth({ t: local, start: 0.8, end: fade, rate, life: 3.4, salt: 5 }, (k, age, x) => {
      const isCO2 = rand(k, 8) < 0.5;
      const site = isCO2 ? this.stromaPoint(k) : this.sites[Math.floor(rand(k, 6) * this.sites.length)].p;
      const from = shellPoint(this.center, 1.2, k, 7, new THREE.Vector3(), new THREE.Vector3(0.2, 0.6, 0.9));
      const e = easeInOutSine(Math.min(1, x / 0.8));
      p.lerpVectors(from, site, e);
      const used = x > 0.8 ? Math.max(0, 1 - (x - 0.8) / 0.2) : 1;
      const s = Math.min(1, x / 0.1) * used;
      if (isCO2) this.co2.add(p, 0.075 * s, age * 0.6, k);
      else this.water.add(p, 0.075 * s, age * 0.3, k + 500);
    });
  }

  render({ mode, local, span }) {
    this.co2.begin();
    this.water.begin();
    this.o2.begin();
    const L = mode === 'light' ? this.light(local, span) : 0.85;
    this.mat.opacity = 0.16 * L;
    this.shaft.visible = L > 0.01;
    this.world.addHighlight([this.discs], 0.25 + 0.5 * L);
    const p = this.tmp;
    if (mode === 'light') {
      this.heroes(local, span);
      this.inputs(local, span, 2.2);
    } else if (mode === 'form') {
      this.inputs(local, span, 1.6);
      for (let k = 0; k < 16; k++) {
        const s = this.sites[(k * 9) % this.sites.length];
        const a = local - (1.2 + k * 0.22);
        if (a < 0) continue;
        p.copy(s.p).addScaledVector(s.n, 0.04 + 0.01 * Math.sin(local * 2 + k));
        this.o2.add(p, 0.06 * Math.min(1, a / 0.4), a * 0.3, k);
        if (k === 0) this.tO2.position.copy(p);
      }
    } else if (mode === 'release') {
      forEachBirth({ t: local, start: -1.5, end: span - 0.8, rate: 4.5, life: 3.6, salt: 12 }, (k, age, x) => {
        const s = this.sites[Math.floor(rand(k, 13) * this.sites.length)];
        const target = this.out.clone().add(new THREE.Vector3((rand(k, 14) - 0.5) * 0.9, (rand(k, 15) - 0.3) * 0.4, (rand(k, 16) - 0.5) * 0.4));
        const e = easeInOutSine(x);
        p.copy(s.p).addScaledVector(s.n, 0.04).lerp(target, e);
        this.o2.add(p, 0.06 * lifeScale(x, 0.08, 0.2), age * 0.4, k);
      });
    }
    this.co2.end();
    this.water.end();
    this.o2.end();
  }

  hide() {
    this.co2.clear();
    this.water.clear();
    this.o2.clear();
    this.shaft.visible = false;
  }
}
