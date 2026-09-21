import { Matrix4, Quaternion, Vector3 } from "three";
import type { BodyLayer } from "../body/BodyLayer";
import type { ExploreMotion } from "./exploreTypes";

/**
 * A teaching simulation: rigid rotation of whole render groups about a declared pivot and axis.
 *
 * This exists so a learner can SEE and CAUSE the kind of movement a joint category is named for, using the anatomy that is
 * already loaded. It moves groups, not bones-within-groups, and it knows nothing about anatomy: pivot, axes, limits and the
 * groups themselves come from the lesson content.
 *
 * It is NOT a biomechanical model and must never be presented as one. Nothing here touches a validated rig, a manifest or
 * any geometry - only the local matrix of a group node, which BodyLayer restores on exit.
 */
export class TeachingMotion {
  private primary: number;
  private secondary: number;
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchQuat = new Quaternion();
  private readonly pivot: Vector3;
  private readonly axisA: Vector3;
  private readonly axisB: Vector3;

  constructor(
    private readonly body: BodyLayer,
    private readonly motion: ExploreMotion,
  ) {
    this.primary = motion.resetDeg.primary;
    this.secondary = motion.resetDeg.secondary ?? 0;
    this.pivot = new Vector3(...motion.pivot);
    this.axisA = new Vector3(...motion.primaryAxis).normalize();
    this.axisB = new Vector3(...(motion.secondaryAxis ?? [0, 1, 0])).normalize();
  }

  get angles(): { primary: number; secondary: number } {
    return { primary: this.primary, secondary: this.secondary };
  }

  /** True when the learner has pushed a `resist` joint as far as it will go, i.e. essentially nowhere. */
  get atLimit(): boolean {
    const [lo, hi] = this.motion.limitsDeg.primary;
    return this.primary <= lo + 1e-6 || this.primary >= hi - 1e-6;
  }

  private clamp(value: number, range: [number, number]): number {
    return Math.min(range[1], Math.max(range[0], value));
  }

  /** Absolute angles in degrees; returns what was actually applied after clamping. */
  set(primaryDeg: number, secondaryDeg?: number): { primary: number; secondary: number } {
    this.primary = this.clamp(primaryDeg, this.motion.limitsDeg.primary);
    if (secondaryDeg !== undefined && this.motion.limitsDeg.secondary) this.secondary = this.clamp(secondaryDeg, this.motion.limitsDeg.secondary);
    this.apply();
    return this.angles;
  }

  /** Relative change, for drag and keyboard input. */
  nudge(primaryDeltaDeg: number, secondaryDeltaDeg = 0): { primary: number; secondary: number } {
    return this.set(this.primary + primaryDeltaDeg, this.motion.limitsDeg.secondary ? this.secondary + secondaryDeltaDeg : undefined);
  }

  /**
   * One step of spring-back for a `resist` joint. Returns true while it is still moving, so the caller keeps rendering.
   * This is what makes "it does not really move" feel like a property of the joint rather than a broken control.
   */
  relax(): boolean {
    if (!this.motion.springBack) return false;
    const target = this.motion.resetDeg.primary;
    if (Math.abs(this.primary - target) < 0.01) {
      if (this.primary !== target) this.set(target);
      return false;
    }
    this.set(this.primary + (target - this.primary) * this.motion.springBack);
    return true;
  }

  reset(): void {
    this.set(this.motion.resetDeg.primary, this.motion.resetDeg.secondary);
  }

  /** Restore the delivered position of every group this motion touches. */
  release(): void {
    for (const groupId of this.motion.groups) this.body.setGroupTransform(groupId, null);
  }

  private apply(): void {
    const deg = Math.PI / 180;
    // rotate about the pivot: T(pivot) . R(secondary) . R(primary) . T(-pivot)
    const m = this.scratchMatrix.identity().makeTranslation(this.pivot.x, this.pivot.y, this.pivot.z);
    if (this.motion.limitsDeg.secondary) m.multiply(new Matrix4().makeRotationFromQuaternion(this.scratchQuat.setFromAxisAngle(this.axisB, this.secondary * deg)));
    m.multiply(new Matrix4().makeRotationFromQuaternion(this.scratchQuat.setFromAxisAngle(this.axisA, this.primary * deg)));
    m.multiply(new Matrix4().makeTranslation(-this.pivot.x, -this.pivot.y, -this.pivot.z));
    for (const groupId of this.motion.groups) this.body.setGroupTransform(groupId, m);
  }
}
