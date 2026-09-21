import type { PoseKey, PoseValue } from "./videoTypes";

const EASE: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

export type ResolvePose = (value: PoseValue, dof: string) => number;

/**
 * Pose at `localMs` from time-ordered keys. A segment's easing is the easing of the key it arrives at; "hold" arrives as a
 * step. Reduced motion samples keyframes only (no in-between sweep). Pure and deterministic: seeking = sampling.
 */
export function samplePoseKeys(keys: readonly PoseKey[], localMs: number, resolve: ResolvePose, reduced = false): Record<string, number> {
  if (!keys.length) return {};
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].atMs <= localMs) i++;
  const k = keys[i];
  const out: Record<string, number> = {};
  for (const [dof, v] of Object.entries(k.pose)) out[dof] = resolve(v, dof);
  const next = keys[i + 1];
  if (!next || reduced || next.ease === "hold" || localMs < k.atMs) return out;
  const span = next.atMs - k.atMs;
  const f = span <= 0 ? 1 : EASE[next.ease]((localMs - k.atMs) / span);
  for (const [dof, v] of Object.entries(next.pose)) {
    const to = resolve(v, dof);
    const from = out[dof] ?? to;
    out[dof] = from + (to - from) * f;
  }
  return out;
}

export const easeInOutCubic = EASE.easeInOutCubic;
