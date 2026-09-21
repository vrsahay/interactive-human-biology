import { Vector3 } from "three";
import type { AxisToken, DofSpec, Vec3 } from "../assets/manifestTypes";

export interface Dof {
  readonly id: string;
  readonly axisToken: AxisToken;
  /** Unit local axis the DOF rotates about. */
  readonly axis: Readonly<Vector3>;
  readonly min: number;
  readonly max: number;
  readonly neutral: number;
  readonly unit: "deg";
  readonly rangeStatus: string;
  readonly rangeApproximate: boolean;
}

const AXES: Record<AxisToken, Vec3> = { "+X": [1, 0, 0], "-X": [-1, 0, 0], "+Y": [0, 1, 0], "-Y": [0, -1, 0], "+Z": [0, 0, 1], "-Z": [0, 0, -1] };

export function parseAxisToken(token: string): Vector3 {
  const v = AXES[token as AxisToken];
  if (!v) throw new Error(`invalid axis token ${token}`);
  return new Vector3(...v);
}

/** Normalises a manifest direction; rejects zero / non-finite vectors. */
export function normalizeAxis(v: readonly number[]): Vector3 {
  if (v.length !== 3 || !v.every(Number.isFinite)) throw new Error(`invalid axis ${JSON.stringify(v)}`);
  const out = new Vector3(v[0], v[1], v[2]);
  const len = out.length();
  if (len < 1e-9) throw new Error("axis has zero length");
  return out.divideScalar(len);
}

export function parseDof(spec: DofSpec): Dof {
  if (spec.unit !== "deg") throw new Error(`dof ${spec.id}: unsupported unit ${spec.unit}`);
  if (!(Number.isFinite(spec.min) && Number.isFinite(spec.max) && spec.min < spec.max)) throw new Error(`dof ${spec.id}: invalid range`);
  if (!(spec.neutral >= spec.min && spec.neutral <= spec.max)) throw new Error(`dof ${spec.id}: neutral outside range`);
  return Object.freeze({
    id: spec.id,
    axisToken: spec.axis,
    axis: parseAxisToken(spec.axis),
    min: spec.min,
    max: spec.max,
    neutral: spec.neutral,
    unit: spec.unit,
    rangeStatus: spec.rangeStatus,
    rangeApproximate: /approximate|pending/i.test(spec.rangeStatus),
  });
}

/** Clamp to [min, max]; NaN resolves to neutral so a bad input can never produce an invalid pose. */
export function clampDof(dof: Pick<Dof, "min" | "max" | "neutral">, value: number): number {
  if (Number.isNaN(value)) return dof.neutral;
  return Math.min(dof.max, Math.max(dof.min, value));
}
