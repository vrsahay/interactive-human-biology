import { Box3, MathUtils, Sphere, Vector3, type Object3D } from "three";

/** Distance at which a sphere of `radius` fits the frustum on both axes, with a margin (>1 leaves breathing room). */
export function fitDistance(radius: number, fovDeg: number, aspect: number, margin = 1.1): number {
  const halfV = MathUtils.degToRad(fovDeg) / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  return (radius * margin) / Math.sin(Math.min(halfV, halfH));
}

/** World-space bounding sphere of the given objects (precise per-vertex box, then its sphere). */
export function boundingSphereOf(objects: readonly Object3D[], target = new Sphere()): Sphere {
  const box = new Box3();
  const tmp = new Box3();
  for (const o of objects) {
    o.updateWorldMatrix(true, false);
    tmp.setFromObject(o, true);
    if (!tmp.isEmpty()) box.union(tmp);
  }
  if (box.isEmpty()) return target.set(new Vector3(), 0.1);
  return box.getBoundingSphere(target);
}

export interface CameraShot {
  target: Vector3;
  position: Vector3;
  /** Suggested orbit distance limits for this shot. */
  minDistance: number;
  maxDistance: number;
}

/** Place the camera on `direction` (unit, pointing from target towards camera) so the sphere fits. */
export function shotForSphere(sphere: Sphere, direction: Vector3, fovDeg: number, aspect: number, margin = 1.1): CameraShot {
  const distance = fitDistance(sphere.radius, fovDeg, aspect, margin);
  return {
    target: sphere.center.clone(),
    position: sphere.center.clone().addScaledVector(direction.clone().normalize(), distance),
    minDistance: Math.max(sphere.radius * 0.6, 0.03),
    maxDistance: distance * 3,
  };
}

/**
 * Tight fit for a box seen along `direction` (unit, target -> camera) with the given up vector: every box corner lands
 * inside the frustum (with margin). Better than a bounding sphere for long, thin subjects such as a whole limb.
 */
export function shotForBox(box: Box3, direction: Vector3, up: Vector3, fovDeg: number, aspect: number, margin = 1.06): CameraShot {
  const center = box.getCenter(new Vector3());
  const back = direction.clone().normalize();
  const right = up.clone().cross(back).normalize();
  const camUp = back.clone().cross(right).normalize();
  const tanV = Math.tan(MathUtils.degToRad(fovDeg) / 2) / margin;
  const tanH = tanV * aspect;
  let distance = 0;
  let radius = 0;
  for (let i = 0; i < 8; i++) {
    const corner = new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
    const z = corner.dot(back);
    distance = Math.max(distance, z + Math.abs(corner.dot(right)) / tanH, z + Math.abs(corner.dot(camUp)) / tanV);
    radius = Math.max(radius, corner.length());
  }
  return {
    target: center,
    position: center.clone().addScaledVector(back, distance),
    minDistance: Math.max(radius * 0.3, 0.03),
    maxDistance: distance * 3,
  };
}

export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Interpolate between two camera shots by orbiting about the (lerped) target: direction slerp + distance lerp.
 * Deterministic for any t, so a timeline can place the camera at an arbitrary time (seeking) without tweens.
 */
export function interpolateShot(a: CameraShot, b: CameraShot, t: number, out: { position: Vector3; target: Vector3 } = { position: new Vector3(), target: new Vector3() }): { position: Vector3; target: Vector3 } {
  const k = Math.min(1, Math.max(0, t));
  out.target.lerpVectors(a.target, b.target, k);
  const da = a.position.clone().sub(a.target);
  const db = b.position.clone().sub(b.target);
  const ra = da.length();
  const rb = db.length();
  da.divideScalar(ra || 1);
  db.divideScalar(rb || 1);
  const angle = da.angleTo(db);
  let dir: Vector3;
  if (angle < 1e-6) dir = da;
  else {
    const axis = new Vector3().crossVectors(da, db);
    if (axis.lengthSq() < 1e-12) axis.set(0, 1, 0);
    dir = da.applyAxisAngle(axis.normalize(), angle * k);
  }
  out.position.copy(out.target).addScaledVector(dir, ra + (rb - ra) * k);
  return out;
}
