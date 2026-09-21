/**
 * Explore configuration: what a learner may do with one joint, expressed as data.
 *
 * The engine stays anatomy-agnostic. Structure ids, render groups, pivots, axes, limits and text keys all arrive from the
 * lesson content and are checked against the body manifest at build time, exactly like the rest of the lesson.
 *
 * Two kinds of movement exist and the difference is never blurred:
 *   - `dof`     the validated joint rig. Movement goes through JointController.setDof and nothing else. Status: validated-rig.
 *   - the rest  a TEACHING SIMULATION: whole render groups are displaced rigidly so the learner can see and cause the kind
 *               of movement the category is named for. It is not a biomechanical model and the UI says so.
 */
export type V3 = [number, number, number];

export type ExploreJointType = "fixed" | "pivot" | "ball_and_socket" | "hinge";

/** Honesty status. Only a joint with a validated rig may be `validated-rig`. */
export type ExploreStatus = "validated-rig" | "teaching-simulation";

/**
 * - `dof`      drive a validated joint DOF (the elbow).
 * - `oneAxis`  rotate the moving groups about one axis (pivot: the head turning).
 * - `twoAxis`  rotate about two axes (ball-and-socket: the arm swinging and lifting).
 * - `resist`   allow a token amount of movement that springs back, so "this joint does not move" is something the learner
 *              feels rather than only reads (fixed).
 */
export type ExploreMotionKind = "dof" | "oneAxis" | "twoAxis" | "resist";

export interface ExploreMotion {
  kind: ExploreMotionKind;
  /** Render groups displaced together. Empty for `dof`. */
  groups: string[];
  /** Rotation centre in body space. */
  pivot: V3;
  /** Primary rotation axis (horizontal drag). */
  primaryAxis: V3;
  /** Secondary rotation axis (vertical drag), `twoAxis` only. */
  secondaryAxis?: V3;
  limitsDeg: { primary: [number, number]; secondary?: [number, number] };
  resetDeg: { primary: number; secondary?: number };
  /** Drag sensitivity; keyboard uses `stepDeg`. */
  degPerPixel: { primary: number; secondary?: number };
  stepDeg: number;
  /** `dof` only: the validated degree of freedom to drive. */
  dofId?: string;
  /** `resist` only: how quickly the token movement returns to zero (fraction per frame). */
  springBack?: number;
}

/**
 * What the learner is asked to do while exploring (Step 16B).
 *
 * Before this, every exploration offered movement and no reason to move. A task gives the movement a purpose and a
 * finish: one instruction, one thing to do, and a confirmation that it is done. The goal is expressed against the
 * session's own readout, so the engine still knows nothing about necks, shoulders or elbows.
 *
 *  - `attempt`  the joint barely moves and springs back; succeeding means having tried (fixed).
 *  - `reach`    take the primary axis past a magnitude (pivot: turn the head; hinge: bend to about 90 degrees).
 *  - `twoWay`   take both axes past a magnitude, so "many directions" is something the learner performs (ball-and-socket).
 */
export type ExploreGoal =
  | { kind: "attempt" }
  | { kind: "reach"; primaryDeg: number }
  | { kind: "twoWay"; primaryDeg: number; secondaryDeg: number };

export interface ExploreTask {
  promptKey: string;
  /** Shown and announced once the goal is met; the learner then returns to the lesson. */
  doneKey: string;
  goal: ExploreGoal;
}

/** Has the learner met the task's goal? `peak` is the largest magnitude reached on each axis so far. */
export function taskDone(goal: ExploreGoal, peak: { primary: number; secondary: number }): boolean {
  if (goal.kind === "attempt") return peak.primary > 0.05;
  if (goal.kind === "reach") return peak.primary >= goal.primaryDeg;
  return peak.primary >= goal.primaryDeg && peak.secondary >= goal.secondaryDeg;
}

export interface ExploreConfig {
  exploreId: string;
  /** Chapter that offers this explore. */
  chapterId: string;
  jointType: ExploreJointType;
  status: ExploreStatus;
  /** Body joint site used to frame the camera. */
  site: string;
  /** Framing for the session: wide enough that the movement itself is visible, not just the joint. */
  camera: { view: string; scale: number; elevation?: number };
  /** Structures lit while exploring; everything else is dimmed. */
  highlight: string[];
  /** Structures that must stay visible as context (the socket side of a joint, the bone being rotated against). */
  context: string[];
  /** Site labels shown during the session. */
  siteLabels: { siteId: string; textKey: string }[];
  titleKey: string;
  instructionKey: string;
  explanationKey: string;
  /** Short status line: "Validated 3D rig" / "Interactive teaching simulation". */
  statusKey: string;
  motion: ExploreMotion;
  /** The one thing the learner is asked to do here (Step 16B). Every category chapter has one. */
  task?: ExploreTask;
  /** Reaching this shot hands the film over to the exploration, the way the recall chapter hands over to its questions. */
  openAtShotId?: string;
}

const isV3 = (v: unknown): v is V3 => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

export interface ExploreValidationSources {
  /** Render group ids that exist in the body delivery manifest. */
  groupIds: Set<string>;
  /** Body structure ids. */
  structureIds: Set<string>;
  /** Body joint site ids. */
  siteIds: Set<string>;
  /** Locale string keys. */
  textKeys: Set<string>;
  /** Chapter ids in the lesson. */
  chapterIds: Set<string>;
  /** DOF ids of the validated joint. */
  dofIds: Set<string>;
}

/**
 * Build-time validation. Keeps the same rule as the rest of the lesson: an unknown reference is an error, never a silent
 * fallback - and a teaching simulation may never claim validated status.
 */
export function checkExploreConfigs(configs: ExploreConfig[], sources: ExploreValidationSources): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of configs) {
    const at = `explore ${c.exploreId}`;
    if (seen.has(c.exploreId)) problems.push(`${at}: duplicate exploreId`);
    seen.add(c.exploreId);
    if (!sources.chapterIds.has(c.chapterId)) problems.push(`${at}: unknown chapterId ${c.chapterId}`);
    if (!sources.siteIds.has(c.site)) problems.push(`${at}: unknown body joint site ${c.site}`);
    for (const id of [...c.highlight, ...c.context]) if (!sources.structureIds.has(id)) problems.push(`${at}: unknown structure ${id}`);
    for (const l of c.siteLabels) {
      if (!sources.siteIds.has(l.siteId)) problems.push(`${at}: unknown site label ${l.siteId}`);
      if (!sources.textKeys.has(l.textKey)) problems.push(`${at}: missing text key ${l.textKey}`);
    }
    for (const k of [c.titleKey, c.instructionKey, c.explanationKey, c.statusKey]) if (!sources.textKeys.has(k)) problems.push(`${at}: missing text key ${k}`);
    if (c.task) {
      for (const k of [c.task.promptKey, c.task.doneKey]) if (!sources.textKeys.has(k)) problems.push(`${at}: missing text key ${k}`);
      const g = c.task.goal;
      if (g.kind === "reach" && !(g.primaryDeg > 0)) problems.push(`${at}: task goal needs a positive primaryDeg`);
      if (g.kind === "twoWay" && !(g.primaryDeg > 0 && g.secondaryDeg > 0)) problems.push(`${at}: twoWay goal needs positive magnitudes on both axes`);
      // A goal the learner cannot reach would leave the task open for ever, so it is checked against the motion limits.
      const reach = Math.max(Math.abs(c.motion.limitsDeg.primary[0]), Math.abs(c.motion.limitsDeg.primary[1]));
      if (g.kind !== "attempt" && g.primaryDeg > reach) problems.push(`${at}: task needs ${g.primaryDeg}° but the primary axis only reaches ${reach}°`);
      if (g.kind === "twoWay") {
        const sec = c.motion.limitsDeg.secondary ? Math.max(Math.abs(c.motion.limitsDeg.secondary[0]), Math.abs(c.motion.limitsDeg.secondary[1])) : 0;
        if (g.secondaryDeg > sec) problems.push(`${at}: task needs ${g.secondaryDeg}° but the secondary axis only reaches ${sec}°`);
      }
      if (c.task.goal.kind === "attempt" && c.motion.kind !== "resist") problems.push(`${at}: an "attempt" task only makes sense on a joint that springs back`);
    }

    const m = c.motion;
    if (!isV3(m.pivot)) problems.push(`${at}: invalid pivot`);
    if (!isV3(m.primaryAxis)) problems.push(`${at}: invalid primaryAxis`);
    if (m.limitsDeg.primary[0] > m.limitsDeg.primary[1]) problems.push(`${at}: primary limits are inverted`);
    if (m.resetDeg.primary < m.limitsDeg.primary[0] || m.resetDeg.primary > m.limitsDeg.primary[1]) problems.push(`${at}: primary reset is outside the limits`);

    if (m.kind === "dof") {
      if (c.status !== "validated-rig") problems.push(`${at}: a rig-driven explore must be marked validated-rig`);
      if (!m.dofId || !sources.dofIds.has(m.dofId)) problems.push(`${at}: unknown dofId ${m.dofId}`);
      if (m.groups.length) problems.push(`${at}: a rig-driven explore must not displace body groups`);
    } else {
      if (c.status !== "teaching-simulation") problems.push(`${at}: displacing body groups is a teaching simulation and must be marked as one`);
      if (!m.groups.length) problems.push(`${at}: no groups to move`);
      for (const g of m.groups) if (!sources.groupIds.has(g)) problems.push(`${at}: unknown render group ${g}`);
    }
    if (m.kind === "twoAxis") {
      if (!isV3(m.secondaryAxis)) problems.push(`${at}: twoAxis needs a secondaryAxis`);
      if (!m.limitsDeg.secondary) problems.push(`${at}: twoAxis needs secondary limits`);
      if (m.resetDeg.secondary === undefined) problems.push(`${at}: twoAxis needs a secondary reset`);
    }
    if (m.kind === "resist" && !m.springBack) problems.push(`${at}: resist needs a springBack fraction`);
  }
  return problems;
}
