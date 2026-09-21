import type { JointManifestModel } from "../assets/ManifestLoader";
import type { AnchorSpec, StructureSpec, TierName } from "../assets/manifestTypes";

/**
 * Manifest motionBehavior vocabulary -> whether the structure's geometry stays anatomically correct when the joint is posed.
 *  - stationary / moves_with_*: rigidly correct at every pose (fixed segment or carried by the controller).
 *  - *_stationary placeholders (cross_joint_stationary, context_stationary): exported at neutral and NOT tracked; they
 *    must be hidden while the joint is away from neutral.
 * Unknown behaviours are treated as not tracking (fail safe: hidden during motion).
 */
export function tracksPose(motionBehavior: string): boolean {
  if (motionBehavior === "stationary" || motionBehavior === "stationary_joint_center") return true;
  if (motionBehavior.startsWith("moves_with_")) return true;
  return false;
}

export interface VisibilityState {
  tiers: Record<TierName, boolean>;
  /** Show non-tracking structures even while posed (off by default). */
  keepNonTrackingDuringMotion: boolean;
}

export interface MotionState {
  /** Joint pose differs from neutral. */
  posed: boolean;
  /** A motion gesture/animation is in progress (drag, preset animation). */
  moving: boolean;
}

export const DEFAULT_VISIBILITY: VisibilityState = { tiers: { core: true, detail: false, context: false }, keepNonTrackingDuringMotion: false };

/** Pure visibility rules driven by tier, motionBehavior and anchor visibility metadata - never by object names. */
export class VisibilityPolicy {
  constructor(private readonly manifest: JointManifestModel) {}

  structureVisible(s: StructureSpec, state: VisibilityState, motion: MotionState): boolean {
    if (!state.tiers[s.tier]) return false;
    if ((motion.posed || motion.moving) && !tracksPose(s.motionBehavior) && !state.keepNonTrackingDuringMotion) return false;
    return true;
  }

  /**
   * Lesson presentation override composed with the authoritative rules: "hide" always hides; "show" enables the
   * structure even if its tier layer is off, but the motion rule still hides non-tracking structures while posed/moving.
   */
  structureVisibleWithOverride(s: StructureSpec, override: "default" | "show" | "hide", state: VisibilityState, motion: MotionState): boolean {
    if (override === "hide") return false;
    const tiers = override === "show" ? { ...state.tiers, [s.tier]: true } : state.tiers;
    return this.structureVisible(s, { ...state, tiers }, motion);
  }

  /** Structures hidden purely because of the motion rule (for UI messaging). */
  hiddenByMotion(state: VisibilityState, motion: MotionState): StructureSpec[] {
    if (!(motion.posed || motion.moving) || state.keepNonTrackingDuringMotion) return [];
    return this.manifest.structures.filter((s) => state.tiers[s.tier] && !tracksPose(s.motionBehavior));
  }

  anchorLabelVisible(a: AnchorSpec, structureVisible: (id: string) => boolean, motion: MotionState): boolean {
    if (motion.moving && a.visibility.hideDuringMotion) return false;
    if (a.visibility.requiresStructureVisible && !structureVisible(a.structureId)) return false;
    return true;
  }
}
