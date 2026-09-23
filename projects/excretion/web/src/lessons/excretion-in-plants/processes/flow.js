import * as THREE from 'three';
import { forEachBirth, rand } from '../../../animation/ParticleField.js';

/**
 * Shared helpers for the V2 close-up processes.
 * A route is authored in Blender as PATH_<name>_00…NN empties (START → CHANGE → DESTINATION);
 * particles are pure functions of time along it, so pause / scrub / replay are exact.
 */
export function pathCurve(world, prefix) {
  const pts = [];
  for (let i = 0; i < 60; i++) {
    const n = world.find(`${prefix}_${String(i).padStart(2, '0')}`);
    if (!n) break;
    pts.push(n.getWorldPosition(new THREE.Vector3()));
  }
  if (pts.length < 2) throw new Error(`[flow] path ${prefix} has ${pts.length} points`);
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

/** u along the curve closest to a point (coarse search; used once at build time). */
export function nearestU(curve, p, steps = 200) {
  let best = 0;
  let bd = Infinity;
  const q = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    curve.getPointAt(i / steps, q);
    const d = q.distanceToSquared(p);
    if (d < bd) {
      bd = d;
      best = i / steps;
    }
  }
  return best;
}

/** Pop in, hold, fade out, over a normalised life x. */
export function lifeScale(x, inFrac = 0.1, outFrac = 0.12) {
  if (x < inFrac) return x / inFrac;
  if (x > 1 - outFrac) return Math.max(0, (1 - x) / outFrac);
  return 1;
}

/**
 * A stream along `curve`. Each particle k may start at its own point `starts[k]`
 * and converge onto the curve by `joinU` (so many sources feed one route).
 */
export function streamAlong(pool, curve, local, {
  rate, life, start = 0, end = Infinity, salt = 1, from = 0, to = 1, size = 0.03,
  starts = null, joinU = 0.25, spread = 0.02, spin = 0.6, sizeFn = null,
}) {
  const p = new THREE.Vector3();
  const s0 = new THREE.Vector3();
  forEachBirth({ t: local, start, end, rate, life, salt }, (k, age, x) => {
    const u = from + (to - from) * x;
    curve.getPointAt(Math.min(1, Math.max(0, u)), p);
    if (starts && starts.length) {
      const src = starts[Math.floor(rand(k, salt + 31) * starts.length)];
      curve.getPointAt(Math.min(1, Math.max(0, from)), s0);
      const w = Math.max(0, 1 - (u - from) / Math.max(1e-3, joinU - from));
      p.addScaledVector(src.clone().sub(s0), w * w * (3 - 2 * w));
    }
    p.x += (rand(k, salt + 1) - 0.5) * spread;
    p.y += (rand(k, salt + 2) - 0.5) * spread;
    p.z += (rand(k, salt + 3) - 0.5) * spread;
    const s = sizeFn ? sizeFn(x, k, u) : lifeScale(x);
    pool.add(p, size * s, age * spin, k + salt * 1000);
  });
}

/** Deterministic points on a sphere shell (for substances arriving from outside). */
export function shellPoint(center, r, k, salt, out = new THREE.Vector3(), bias = null) {
  const u = rand(k, salt) * 2 - 1;
  const a = rand(k, salt + 1) * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  out.set(s * Math.cos(a), u, s * Math.sin(a));
  if (bias) out.add(bias).normalize();
  return out.multiplyScalar(r).add(center);
}
