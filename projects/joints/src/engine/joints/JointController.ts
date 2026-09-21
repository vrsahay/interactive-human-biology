import { EventBus } from "../core/EventBus";
import type { DofSpec } from "../assets/manifestTypes";
import { clampDof, parseDof, type Dof } from "./dof";

export type InputSource = "slider" | "drag" | "keyboard" | "preset" | "animation" | "api" | "reset" | "lesson";

/** Inputs that come from the learner (subject to the interaction policy). */
export const LEARNER_SOURCES: ReadonlySet<InputSource> = new Set<InputSource>(["slider", "drag", "keyboard", "preset"]);

export interface DofChange {
  jointId: string;
  dofId: string;
  value: number;
  previous: number;
  requested: number;
  clamped: boolean;
  source: InputSource;
}

export interface JointControllerEvents {
  change: DofChange;
  pose: { jointId: string; values: Readonly<Record<string, number>> };
}

/**
 * Generic DOF owner. The ONLY way to change a joint pose is setDof(); subclasses implement applyPose() which maps the
 * current values onto the scene graph. One setDof call that changes a value = exactly one applyPose + one `pose` event.
 */
export abstract class JointController {
  readonly events = new EventBus<JointControllerEvents>();
  protected readonly dofMap: Map<string, Dof>;
  protected readonly values = new Map<string, number>();

  protected constructor(readonly jointId: string, readonly jointType: string, dofSpecs: readonly DofSpec[]) {
    if (!dofSpecs.length) throw new Error(`${jointId}: joint has no DOFs`);
    this.dofMap = new Map(dofSpecs.map((s) => [s.id, parseDof(s)]));
    for (const d of this.dofMap.values()) this.values.set(d.id, d.neutral);
  }

  get dofs(): Dof[] {
    return [...this.dofMap.values()];
  }

  dof(id: string): Dof {
    const d = this.dofMap.get(id);
    if (!d) throw new Error(`${this.jointId}: unknown dof ${id}`);
    return d;
  }

  getDof(id: string): number {
    this.dof(id);
    return this.values.get(id)!;
  }

  limits(id: string): { min: number; max: number } {
    const d = this.dof(id);
    return { min: d.min, max: d.max };
  }

  neutralPose(): Record<string, number> {
    return Object.fromEntries(this.dofs.map((d) => [d.id, d.neutral]));
  }

  currentPose(): Record<string, number> {
    return Object.fromEntries(this.values);
  }

  isNeutral(epsilon = 1e-6): boolean {
    return this.dofs.every((d) => Math.abs(this.values.get(d.id)! - d.neutral) <= epsilon);
  }

  /** Single entry point for every input path. Returns the applied (clamped) value. */
  setDof(id: string, requested: number, source: InputSource = "api"): number {
    const dof = this.dof(id);
    const value = clampDof(dof, requested);
    const previous = this.values.get(id)!;
    if (value === previous) return value;
    this.values.set(id, value);
    this.applyPose();
    const clamped = value !== requested;
    this.events.emit("change", { jointId: this.jointId, dofId: id, value, previous, requested, clamped, source });
    this.events.emit("pose", { jointId: this.jointId, values: this.currentPose() });
    return value;
  }

  resetToNeutral(source: InputSource = "reset"): void {
    for (const d of this.dofs) this.setDof(d.id, d.neutral, source);
  }

  /** Temporarily applies the neutral pose (no events) - used when binding late-loaded tiers at their exported neutral transforms. */
  withNeutralPose<T>(fn: () => T): T {
    return this.withPose(this.neutralPose(), fn);
  }

  /** Temporarily applies a (clamped) pose without emitting events, runs fn, then restores the live pose. */
  withPose<T>(pose: Record<string, number>, fn: () => T): T {
    const saved = new Map(this.values);
    for (const [id, v] of Object.entries(pose)) this.values.set(id, clampDof(this.dof(id), v));
    this.applyPose();
    try {
      return fn();
    } finally {
      for (const [k, v] of saved) this.values.set(k, v);
      this.applyPose();
    }
  }

  protected abstract applyPose(): void;
}
