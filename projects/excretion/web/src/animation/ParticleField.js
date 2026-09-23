import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Deterministic hash → [0, 1). Same (k, salt) always gives the same number. */
export function rand(k, salt = 0) {
  let h = (k * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function seededRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stateless emission: particle k is born at start + (k + jitter)/rate and lives
 * `life` seconds. Given only the current time, every live particle is known.
 */
export function forEachBirth({ t, start = 0, end = Infinity, rate, life, salt = 1 }, fn) {
  if (t < start || rate <= 0) return;
  const tEnd = Math.min(t, end);
  const kMax = Math.floor((tEnd - start) * rate);
  const kMin = Math.max(0, Math.floor((t - life - start) * rate) - 1);
  for (let k = kMin; k <= kMax; k++) {
    const born = start + (k + 0.8 * rand(k, salt)) / rate;
    if (born > end) continue;
    const age = t - born;
    if (age < 0 || age > life) continue;
    fn(k, age, age / life);
  }
}

/** A table of surface points sampled once with a fixed seed (deterministic). */
export function surfaceTable(mesh, count, seed, { space = 'world', filter = null } = {}) {
  const sampler = new MeshSurfaceSampler(mesh);
  sampler.setRandomGenerator(seededRng(seed));
  sampler.build();
  mesh.updateWorldMatrix(true, false);
  const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const pts = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  let guard = 0;
  while (pts.length < count && guard++ < count * 20) {
    sampler.sample(p, n);
    const P = p.clone();
    const N = n.clone();
    if (space === 'world') {
      P.applyMatrix4(mesh.matrixWorld);
      N.applyMatrix3(nm).normalize();
    }
    if (filter && !filter(P, N)) continue;
    pts.push({ p: P, n: N });
  }
  return pts;
}

/** One instanced mesh per substance; fill it from scratch every frame. */
export class InstancedPool {
  constructor(geometry, material, capacity, parent, name = 'pool') {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.name = name;
    this.mesh.frustumCulled = false;
    this.mesh.userData.noLook = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.capacity = capacity;
    this.n = 0;
    parent.add(this.mesh);
  }

  begin() {
    this.n = 0;
  }

  add(pos, scale, spin = 0, k = 0) {
    if (this.n >= this.capacity || scale <= 1e-5) return;
    _e.set(rand(k, 7) * 6.28 + spin, rand(k, 8) * 6.28 + spin * 0.7, rand(k, 9) * 6.28);
    _q.setFromEuler(_e);
    _s.set(scale, scale, scale);
    _m.compose(pos, _q, _s);
    this.mesh.setMatrixAt(this.n++, _m);
  }

  end() {
    for (let i = this.n; i < this.mesh.count; i++) this.mesh.setMatrixAt(i, ZERO);
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }

  clear() {
    this.begin();
    this.end();
  }
}

/** Pop in / hold / shrink out over a normalised life. */
export function envelope(x, inFrac = 0.12, outFrac = 0.16) {
  if (x < inFrac) return x / inFrac;
  if (x > 1 - outFrac) return Math.max(0, (1 - x) / outFrac);
  return 1;
}
