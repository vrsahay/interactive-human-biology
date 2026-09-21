import { MathUtils, Vector3, type Camera, type Ray } from "three";

/**
 * Signed angle (deg) of `point` around the hinge, measured from `neutralDir` about `axis` (right-hand rule).
 * Components along the axis are ignored, so any point in the swept volume maps to the flexion plane.
 */
export function angleInHingePlane(point: Vector3, pivot: Vector3, axis: Vector3, neutralDir: Vector3): number {
  const v = point.clone().sub(pivot);
  v.addScaledVector(axis, -v.dot(axis));
  if (v.lengthSq() < 1e-12) return 0;
  const n = neutralDir.clone().addScaledVector(axis, -neutralDir.dot(axis)).normalize();
  const sin = axis.dot(n.clone().cross(v));
  const cos = n.dot(v);
  return MathUtils.radToDeg(Math.atan2(sin, cos));
}

/** Shortest signed difference b - a in degrees, in (-180, 180]. */
export function unwrapDelta(a: number, b: number): number {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Intersection of a ray with the plane through `pivot` perpendicular to `axis`; null when parallel or behind. */
export function intersectHingePlane(ray: Ray, pivot: Vector3, axis: Vector3, target = new Vector3()): Vector3 | null {
  const denom = axis.dot(ray.direction);
  if (Math.abs(denom) < 1e-6) return null;
  const t = pivot.clone().sub(ray.origin).dot(axis) / denom;
  if (t < 0) return null;
  return target.copy(ray.origin).addScaledVector(ray.direction, t);
}

/** Below this |cos(view ray, axis)| the flexion plane is seen nearly edge-on and plane projection becomes unstable. */
export const EDGE_ON_COS = 0.2;

export interface HingeFrame {
  pivot: Vector3;
  axis: Vector3;
  neutralDir: Vector3;
}

/**
 * Screen-space fallback: degrees represented by a pointer movement, using the projected arc tangent at the grab radius.
 * Positive when the pointer moves in the projected direction of increasing flexion.
 */
export function screenDeltaToDegrees(
  deltaPx: { x: number; y: number },
  frame: HingeFrame,
  currentDeg: number,
  grabRadiusM: number,
  camera: Camera,
  viewport: { width: number; height: number },
): number {
  const dir = frame.neutralDir.clone().applyAxisAngle(frame.axis, MathUtils.degToRad(currentDeg));
  const p0 = frame.pivot.clone().addScaledVector(dir, grabRadiusM);
  const stepDeg = 1;
  const dir1 = frame.neutralDir.clone().applyAxisAngle(frame.axis, MathUtils.degToRad(currentDeg + stepDeg));
  const p1 = frame.pivot.clone().addScaledVector(dir1, grabRadiusM);
  const toPx = (p: Vector3) => {
    const n = p.clone().project(camera);
    return { x: (n.x * 0.5 + 0.5) * viewport.width, y: (-n.y * 0.5 + 0.5) * viewport.height };
  };
  const s0 = toPx(p0);
  const s1 = toPx(p1);
  const tx = s1.x - s0.x;
  const ty = s1.y - s0.y;
  const pxPerDeg = Math.hypot(tx, ty);
  if (pxPerDeg < 0.05) return 0;
  return (deltaPx.x * tx + deltaPx.y * ty) / (pxPerDeg * pxPerDeg);
}

/** Tracks one drag gesture; produces successive target angles (unclamped deltas applied to the live DOF). */
export class HingeDragGesture {
  private lastPlaneAngle: number | null = null;
  readonly grabRadiusM: number;

  constructor(private readonly frame: HingeFrame, grabPoint: Vector3) {
    const v = grabPoint.clone().sub(frame.pivot);
    v.addScaledVector(frame.axis, -v.dot(frame.axis));
    this.grabRadiusM = Math.max(0.02, v.length());
    this.lastPlaneAngle = angleInHingePlane(grabPoint, frame.pivot, frame.axis, frame.neutralDir);
  }

  /**
   * Returns the DOF change (deg) for this pointer move. Uses exact plane projection when the plane faces the camera,
   * otherwise the projected-tangent fallback. Never translates anything and uses only the hinge axis.
   */
  step(ray: Ray, deltaPx: { x: number; y: number }, currentDeg: number, camera: Camera, viewport: { width: number; height: number }): number {
    if (Math.abs(ray.direction.dot(this.frame.axis)) >= EDGE_ON_COS) {
      const hit = intersectHingePlane(ray, this.frame.pivot, this.frame.axis);
      if (hit) {
        const angle = angleInHingePlane(hit, this.frame.pivot, this.frame.axis, this.frame.neutralDir);
        const delta = this.lastPlaneAngle === null ? 0 : unwrapDelta(this.lastPlaneAngle, angle);
        this.lastPlaneAngle = angle;
        return delta;
      }
    }
    this.lastPlaneAngle = null;
    return screenDeltaToDegrees(deltaPx, this.frame, currentDeg, this.grabRadiusM, camera, viewport);
  }
}
