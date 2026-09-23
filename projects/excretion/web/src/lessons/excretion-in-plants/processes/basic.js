import * as THREE from 'three';
import { easeInOutCubic, smoothstep } from '../../../animation/easing.js';
import { InstancedPool, envelope, rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';

/** Ch 01: life processes also produce substances the plant does not need. */
export class IntroWastes {
  constructor(world) {
    this.world = world;
    this.pool = world.pool('Waste_Crystal', 'plant', 48);
    const leaves = world.group('@leaves').filter((n) => n.name !== 'Leaf_Old').slice(0, 14);
    const sources = [...leaves, world.node('Stem_Main'), world.node('Branch_01'), world.node('Branch_02'), world.node('Branch_03')];
    this.points = [];
    sources.forEach((n, i) => {
      const m = meshesOf(n)[0];
      for (const s of surfaceTable(m, 3, 900 + i)) this.points.push(s);
    });
  }

  render({ local, span, T }) {
    this.pool.begin();
    const out = 1 - smoothstep(span - 0.9, span, local);
    const n = Math.min(this.points.length, 34);
    for (let k = 0; k < n; k++) {
      const { p, n: nrm } = this.points[(k * 7) % this.points.length];
      const born = 0.9 + k * 0.08;
      const a = local - born;
      if (a < 0) continue;
      const grow = Math.min(1, a / 0.35);
      const pulse = 1 + 0.14 * Math.sin(T * 3 + k);
      const pos = p.clone().addScaledVector(nrm, 0.012 + 0.004 * Math.sin(T * 1.6 + k));
      this.pool.add(pos, 0.03 * grow * pulse * out, T * 0.6, k);
    }
    this.pool.end();
  }

  hide() {
    this.pool.clear();
  }
}

/** Ch 02: a small schematic of the human kidneys beside the heading. */
export class Figure {
  constructor(world) {
    this.world = world;
  }

  render() {
    this.world.ui.showFigure(true);
  }

  hide() {
    this.world.ui.showFigure(false);
  }
}

/** Ch 02: leaves, then stem and branches, then roots light up as they are named. */
export class PartsTour {
  constructor(world) {
    this.world = world;
    this.leaves = world.group('@leaves');
    this.stem = [world.node('Stem_Main'), ...world.group('@branches')];
    this.roots = [world.node('Roots')];
  }

  render({ local }) {
    const w = this.world;
    if (local >= 1.5 && local < 3.0) w.addHighlight(this.leaves);
    else if (local >= 3.0 && local < 4.6) w.addHighlight(this.stem);
    else if (local >= 4.6) w.addHighlight(this.roots);
  }

  hide() {}
}

/** Ch 07: a thin ring marks where the stem will be cut. */
export class CutRing {
  constructor(world) {
    const geo = new THREE.TorusGeometry(0.064, 0.0036, 8, 64);   // V2.4: fits the thicker woody trunk (DA-10)
    geo.rotateX(Math.PI / 2);
    this.ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xe2a95c, transparent: true, opacity: 0, depthWrite: false }));
    this.ring.position.copy(world.pos('ANCHOR_Stem_Cut'));
    this.ring.userData.noLook = true;
    this.ring.visible = false;
    world.stageGroup('plant').add(this.ring);
  }

  render({ local }) {
    const e = smoothstep(1.2, 2.4, local);
    this.ring.visible = e > 0.01;
    this.ring.material.opacity = 0.95 * e;
    this.ring.scale.setScalar(1.7 - 0.7 * easeInOutCubic(e));
  }

  hide() {
    this.ring.visible = false;
  }
}

/** Ch 07: the intact outer piece of the stem lifts away (the cutaway). */
export class StemCover {
  constructor(world) {
    this.world = world;
    this.cover = world.node('Stem_Cover');
    this.home = this.cover.position.clone();
    this.meshes = meshesOf(this.cover);
  }

  render({ local }) {
    const e = easeInOutCubic(smoothstep(1.4, 3.4, local));
    this.cover.position.copy(this.home).add(new THREE.Vector3(0, 0.8 * e, 0));
    this.world.looks.target(this.meshes, 'fade', Math.max(0, 1 - e * 1.3));
  }

  hide() {
    this.cover.position.copy(this.home);
  }
}

export { rand, envelope };
