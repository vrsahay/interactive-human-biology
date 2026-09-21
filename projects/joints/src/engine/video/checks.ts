/** Interactive checks. Pose targets are judged from runtime controller state against content-defined tolerances only. */

export interface PoseTargetSpec {
  id?: string;
  dof: string;
  target: number;
  tolerance: number;
  holdMs: number;
}

export interface PoseCheckResult {
  correct: boolean;
  measured: number;
  error: number;
}

export function evaluatePoseTarget(spec: PoseTargetSpec, pose: Readonly<Record<string, number>>): PoseCheckResult {
  const measured = pose[spec.dof];
  if (measured === undefined || !Number.isFinite(measured)) throw new Error(`pose check: runtime has no value for dof ${spec.dof}`);
  const error = Math.abs(measured - spec.target);
  return { correct: error <= spec.tolerance, measured, error };
}

/** The target counts once the value stays inside the tolerance for holdMs. Time is injected for deterministic tests. */
export class PoseHoldTracker {
  private enteredAt: number | null = null;

  constructor(private readonly spec: PoseTargetSpec) {}

  update(value: number, nowMs: number): boolean {
    if (Math.abs(value - this.spec.target) > this.spec.tolerance) {
      this.enteredAt = null;
      return false;
    }
    if (this.enteredAt === null) this.enteredAt = nowMs;
    return nowMs - this.enteredAt >= this.spec.holdMs;
  }

  reset(): void {
    this.enteredAt = null;
  }
}
