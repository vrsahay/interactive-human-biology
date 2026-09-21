import { LEARNER_SOURCES, type InputSource } from "../joints/JointController";

export type InteractionModeName = "passive" | "guided" | "free";

/** Generic runtime interaction policy. Passive: the joint ignores learner input. Guided/free: learner owns the pose. */
export interface InteractionPolicy {
  mode: InteractionModeName;
  picking: boolean;
  /** Optional learner sub-range per DOF (inside controller limits). */
  dofRange: Record<string, [number, number]>;
}

export type Admission = { admitted: true; value: number; learner: boolean } | { admitted: false; reason: "passive" };

/**
 * Decide whether an input may reach JointController.setDof. Non-learner sources (lesson, animation, api, reset) always
 * pass; learner sources are refused in passive mode and clamped to the policy's sub-range otherwise. The controller
 * still applies its own manifest limits afterwards.
 */
export function admitInput(policy: InteractionPolicy, dofId: string, value: number, source: InputSource): Admission {
  if (!LEARNER_SOURCES.has(source)) return { admitted: true, value, learner: false };
  if (policy.mode === "passive") return { admitted: false, reason: "passive" };
  const range = policy.dofRange[dofId];
  const clamped = range ? Math.min(range[1], Math.max(range[0], value)) : value;
  return { admitted: true, value: clamped, learner: true };
}

/** Validate a policy against controller limits; returns problems (empty = valid). */
export function checkInteractionPolicy(policy: InteractionPolicy, limits: (dof: string) => { min: number; max: number }): string[] {
  const problems: string[] = [];
  if (!["passive", "guided", "free"].includes(policy.mode)) problems.push(`unknown interaction mode ${policy.mode}`);
  for (const [dof, [min, max]] of Object.entries(policy.dofRange)) {
    let l: { min: number; max: number };
    try {
      l = limits(dof);
    } catch {
      problems.push(`unknown dof ${dof}`);
      continue;
    }
    if (!(min >= l.min && max <= l.max && min < max)) problems.push(`interaction range ${dof} ${min}..${max} outside controller limits ${l.min}..${l.max}`);
  }
  return problems;
}
