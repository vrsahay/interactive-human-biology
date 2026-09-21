import type { BodyLayer } from "../body/BodyLayer";
import type { InputSource } from "../joints/JointController";
import { TeachingMotion } from "./TeachingMotion";
import type { ExploreConfig } from "./exploreTypes";

/**
 * One learner-controlled joint exploration.
 *
 * The same lifecycle serves all four categories - enter, interact, reset, exit - while the movement model differs:
 * the validated joint goes through `setDof`, the others displace render groups as a teaching simulation. Callers get one
 * interface, so the UI does not branch per body part.
 *
 * The session owns nothing permanent: exiting restores every displaced group and the caller re-applies the shot, so an
 * exploration can never leak into the lesson's own state.
 */
export interface ExploreHost {
  body: BodyLayer;
  /** Drive a validated joint DOF (the only path a rig may be moved by). */
  setDof(dofId: string, value: number, source: InputSource): number;
  getDof(dofId: string): number;
  requestRender(): void;
}

export interface ExploreReadout {
  /** Primary value in degrees: the DOF for a rig, the primary rotation for a teaching simulation. */
  primary: number;
  secondary: number | null;
  /** True when a `resist` joint has been pushed to its (tiny) limit. */
  atLimit: boolean;
}

export class ExploreSession {
  private motion: TeachingMotion | null = null;
  private relaxing = false;

  constructor(
    readonly config: ExploreConfig,
    private readonly host: ExploreHost,
  ) {
    if (config.motion.kind !== "dof") this.motion = new TeachingMotion(host.body, config.motion);
  }

  get isTeachingSimulation(): boolean {
    return this.config.status === "teaching-simulation";
  }

  get dofId(): string | null {
    return this.config.motion.kind === "dof" ? (this.config.motion.dofId ?? null) : null;
  }

  readout(): ExploreReadout {
    if (this.motion) {
      const a = this.motion.angles;
      return { primary: a.primary, secondary: this.config.motion.limitsDeg.secondary ? a.secondary : null, atLimit: this.config.motion.kind === "resist" && this.motion.atLimit };
    }
    const dofId = this.dofId;
    return { primary: dofId ? this.host.getDof(dofId) : 0, secondary: null, atLimit: false };
  }

  /** Drag input in screen pixels. Horizontal drives the primary axis, vertical the secondary. */
  drag(dxPx: number, dyPx: number): void {
    const m = this.config.motion;
    if (this.motion) {
      this.relaxing = false;
      this.motion.nudge(dxPx * m.degPerPixel.primary, dyPx * (m.degPerPixel.secondary ?? 0));
    } else if (this.dofId) {
      // The validated rig is driven through the one permitted path, with the manifest's own limits applying.
      this.host.setDof(this.dofId, this.host.getDof(this.dofId) + dxPx * m.degPerPixel.primary, "drag");
    }
    this.host.requestRender();
  }

  /** Keyboard input: one step per press, so every explore is operable without a pointer. */
  step(primarySteps: number, secondarySteps = 0): void {
    const m = this.config.motion;
    if (this.motion) {
      this.relaxing = false;
      this.motion.nudge(primarySteps * m.stepDeg, secondarySteps * m.stepDeg);
    } else if (this.dofId) {
      this.host.setDof(this.dofId, this.host.getDof(this.dofId) + primarySteps * m.stepDeg, "keyboard");
    }
    this.host.requestRender();
  }

  /** Called when a gesture ends: a `resist` joint springs back on its own. */
  endGesture(): void {
    if (this.config.motion.kind === "resist") this.relaxing = true;
  }

  /** Per-frame tick while the session is open. Returns true if it still needs frames. */
  tick(): boolean {
    if (!this.relaxing || !this.motion) return false;
    const moving = this.motion.relax();
    this.relaxing = moving;
    this.host.requestRender();
    return moving;
  }

  reset(): void {
    this.relaxing = false;
    if (this.motion) this.motion.reset();
    else if (this.dofId) this.host.setDof(this.dofId, this.config.motion.resetDeg.primary, "api");
    this.host.requestRender();
  }

  /** Leave no trace: displaced groups return to their delivered position; a rig returns to its reset pose. */
  exit(): void {
    this.relaxing = false;
    if (this.motion) {
      this.motion.release();
      this.motion = null;
    } else if (this.dofId) {
      this.host.setDof(this.dofId, this.config.motion.resetDeg.primary, "api");
    }
    this.host.requestRender();
  }
}
