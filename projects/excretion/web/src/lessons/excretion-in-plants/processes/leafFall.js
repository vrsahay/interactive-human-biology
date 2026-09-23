import * as THREE from 'three';
import { easeInOutCubic, easeInOutSine, smoothstep } from '../../../animation/easing.js';
import { rand, surfaceTable } from '../../../animation/ParticleField.js';
import { meshesOf } from '../../../scene/Looks.js';

/**
 * WASTE → STORED IN LEAF → LEAF IS LOST → LEAF FALLS.
 * Wastes travel up INSIDE the stem (it turns see-through while they climb) into the older leaf.
 * V2.4 (DA-11): there they are stored IN the leaf's tissue: as each one arrives it becomes a purple
 * patch coloured into the blade itself, not a crystal sitting on its surface. The leaf ages (yellows).
 * Then it detaches and flutters down to the soil, and the learner SEES the stored wastes leave with it.
 * Everything is a function of time since 'leaves.load' (scrub-safe).
 */
export class LeafFall {
  constructor(world) {
    this.world = world;
    this.leaf = world.node('Leaf_Old');
    this.home = { pos: this.leaf.position.clone(), quat: this.leaf.quaternion.clone() };
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const n = world.find(`PATH_OldLeaf_${String(i).padStart(2, '0')}`);
      if (!n) break;
      pts.push(n.getWorldPosition(new THREE.Vector3()));
    }
    this.path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.travel = world.pool('Waste_Crystal', 'plant', 24, { onTop: true });
    const leafMesh = meshesOf(this.leaf).find((m) => !m.isInstancedMesh);
    // where the stored wastes sit, in the leaf's own (mesh) space, spread over the outer blade
    const cand = surfaceTable(leafMesh, 60, 77, { space: 'local', filter: (p) => p.x > 0.06 }).map(({ p }) => p);
    this.spots = [];
    for (const q of cand) if (this.spots.length < 12 && this.spots.every((o) => o.distanceTo(q) > 0.024)) this.spots.push(q);
    for (let i = 0; this.spots.length < 12; i++) this.spots.push(cand[i]);
    this.waste = { value: new Array(12).fill(0) };
    this.stem = meshesOf(world.node('Stem_Main'));
    // "age" tint (green → yellow-brown) and the stored-waste patches, in the leaf shader
    this.age = { value: 0 };
    const m = leafMesh.material;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uAge = this.age;
      shader.uniforms.uWasteP = { value: this.spots };
      shader.uniforms.uWasteA = this.waste;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLeafPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeafPos = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uAge;\nuniform vec3 uWasteP[12];\nuniform float uWasteA[12];\nvarying vec3 vLeafPos;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 aged = vec3(0.86, 0.64, 0.2) * (lum * 1.9 + 0.08);
          diffuseColor.rgb = mix(diffuseColor.rgb, aged, uAge);
          // stored wastes: purple patches IN the leaf tissue, each with a slightly darker rim
          float wst = 0.0;
          float rim = 0.0;
          for (int i = 0; i < 12; i++) {
            float d = distance(vLeafPos, uWasteP[i]) / 0.0105;
            float a = uWasteA[i];
            wst = max(wst, a * (1.0 - smoothstep(0.6, 1.0, d)));
            rim = max(rim, a * smoothstep(0.55, 0.8, d) * (1.0 - smoothstep(0.8, 1.0, d)));
          }
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.56, 0.24, 0.62) * (0.75 + 0.5 * lum), wst * 0.85);
          diffuseColor.rgb *= 1.0 - 0.3 * rim;`);
    };
    m.customProgramCacheKey = () => 'leaf-age-waste';
    m.needsUpdate = true;
    this.landing = this.computeLanding();
    this.loadCount = 12;
  }

  computeLanding() {
    const a = this.world.pos('ANCHOR_Leaf_Old_Landing');
    const soil = this.world.node('Soil_Back');
    const hit = new THREE.Raycaster(a.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0)).intersectObject(soil, true)[0];
    const y = hit ? hit.point.y : a.y;
    const d = new THREE.Vector3(0.82, 0, -0.42).normalize();
    const upv = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, upv, new THREE.Vector3().crossVectors(d, upv)));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.2));
    return { pos: new THREE.Vector3(a.x, y + 0.012, a.z), quat: q };
  }

  render({ T, track }) {
    const tl = this.world.timeline;
    const loadStart = track.start / 1000;
    const fallStart = tl.byId.get('leaves.fall').start / 1000 + 0.9;
    const t = T - loadStart;
    // 1. wastes travel up inside the stem into the leaf, and are stored in its tissue
    this.travel.begin();
    const w = this.waste.value;
    w.fill(0);
    // V2.4 (DA-16): all the wastes are in while the first sentence is heard (they arrive by ~4.2 s)
    const TRAVEL = 1.5;
    for (let k = 0; k < this.loadCount; k++) {
      const born = 0.5 + k * 0.2;
      const a = t - born;
      if (a < 0) continue;
      if (a < TRAVEL) {
        const x = a / TRAVEL;
        const s = x < 0.1 ? x / 0.1 : x > 0.92 ? (1 - x) / 0.08 : 1;
        this.travel.add(this.path.getPointAt(easeInOutSine(x), new THREE.Vector3()), 0.016 * s, a, k);
      }
      // it becomes part of the leaf as it arrives: the patch fades in while the crystal fades out
      w[k % 12] = Math.max(w[k % 12], smoothstep(TRAVEL - 0.25, TRAVEL + 0.3, a));
    }
    this.travel.end();
    // while wastes climb, the stem is see-through, so they are seen travelling INSIDE it
    const lastIn = 0.5 + (this.loadCount - 1) * 0.2 + TRAVEL;
    const climbing = smoothstep(0.4, 1.0, t) * (1 - smoothstep(lastIn, lastIn + 0.8, t));
    if (climbing > 0.01) this.world.looks.target(this.stem, 'fade', 1 - 0.5 * climbing);
    // V2.4 (DA-16): the leaf starts to age only when the narration says "Time passes, and the leaf grows
    // older" (after the wastes are in), so the yellowing is not read as caused by the wastes
    const load = tl.byId.get(track.from);
    const olderAt = Math.max(lastIn, load?.sentenceStarts?.[1] != null ? load.sentenceStarts[1] / 1000 : 4.5);
    this.age.value = 0.72 * smoothstep(olderAt, olderAt + 4.5, t) + 0.18 * smoothstep(fallStart, fallStart + 3, T);
    // 2. the leaf detaches and falls
    this.pose(T - fallStart);
  }

  pose(f) {
    const leaf = this.leaf;
    const { pos: p0, quat: q0 } = this.home;
    const { pos: p1, quat: q1 } = this.landing;
    if (f <= 0) {
      leaf.position.copy(p0);
      leaf.quaternion.copy(q0);
      return;
    }
    const wob = new THREE.Quaternion();
    if (f < 0.9) {
      // the joint weakens: a small wobble at the leaf stalk
      wob.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(f * Math.PI * 5.5) * 0.07 * (f / 0.9));
      leaf.position.copy(p0);
      leaf.quaternion.copy(q0).multiply(wob);
      return;
    }
    const x = Math.min(1, (f - 0.9) / 3.4);
    leaf.position.lerpVectors(p0, p1, Math.pow(x, 1.35));
    leaf.position.x += Math.sin(x * Math.PI * 3) * 0.07 * (1 - x);
    leaf.position.z += Math.cos(x * Math.PI * 2.4) * 0.03 * (1 - x);
    leaf.quaternion.slerpQuaternions(q0, q1, easeInOutCubic(Math.min(1, x * 1.1)));
    wob.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(x * Math.PI * 4) * 0.45 * (1 - x));
    leaf.quaternion.multiply(wob);
  }

  hide() {
    this.travel.clear();
    this.waste.value.fill(0);
    this.age.value = 0;
    this.pose(0);
  }
}

export { rand };
