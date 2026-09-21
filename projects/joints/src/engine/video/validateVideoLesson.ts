import { tracksPose } from "../anatomy/VisibilityPolicy";
import type { JointManifestModel } from "../assets/ManifestLoader";
import type { BodyManifest } from "../body/BodyLayer";
import { checkRecallConfig } from "../explore/RecallSequence";
import { checkExploreConfigs } from "../explore/exploreTypes";
import type { PoseValue, Shot, VideoLesson, VideoLocale } from "./videoTypes";

export class VideoLessonValidationError extends Error {
  constructor(message: string, readonly problems: string[]) {
    super(`${message}:\n - ${problems.join("\n - ")}`);
    this.name = "VideoLessonValidationError";
  }
}

export const MAX_ANCHOR_LABELS = 5;
const JOINT_PRESETS = new Set(["closeUp", "focus", "movement"]);
const BODY_VIEWS = new Set(["front", "frontRight", "right", "backRight", "left", "frontLeft"]);
const JOINT_VIEWS = new Set(["oblique", "anterior", "axisPositive", "axisNegative"]);
const MOTION_OVERLAYS = ["axis", "neutralDirection", "currentDirection", "motionArrow", "angleBadge", "arc", "ticks"] as const;

export interface VideoValidationReport {
  /** JSON-schema validation of bundled lesson content happens at build time (vite.config.ts); this report covers references. */
  schemaValidation: "build";
  chapters: number;
  shots: number;
  durationMs: number;
  textKeys: number;
  /** Learner-controlled explorations declared by the lesson (Step 14). */
  explores?: number;
  /** Retrieval steps in the recap (Step 14). */
  recallSteps?: number;
  problems: string[];
}

/** Resolve a pose value token against the joint manifest (no silent fallback). */
export function resolvePoseValue(value: PoseValue, dof: string, manifest: JointManifestModel): number {
  const d = manifest.dof(dof);
  if (value === "neutral") return d.neutral;
  if (value === "sourcePose") return manifest.semantics.source_pose_flexion_deg;
  return value;
}

/** Joint structure refs: structureId or group:<registry group>. */
export function resolveJointRefs(refs: readonly string[], manifest: JointManifestModel, problems: string[], where: string): string[] {
  const out: string[] = [];
  for (const ref of refs) {
    if (ref.startsWith("group:")) {
      const g = manifest.data.registry.groups[ref.slice(6)];
      if (!g) problems.push(`${where}: unknown joint group ${ref}`);
      else out.push(...g);
    } else if (!manifest.structure(ref)) problems.push(`${where}: unknown joint structureId ${ref}`);
    else out.push(ref);
  }
  return [...new Set(out)];
}

function resolveBodyRefs(refs: readonly string[], body: BodyManifest, problems: string[], where: string): string[] {
  const ids = new Set(body.structures.map((s) => s.structureId));
  const out: string[] = [];
  for (const ref of refs) {
    if (ref.startsWith("region:")) {
      const r = body.regions[ref.slice(7)];
      if (!r) problems.push(`${where}: unknown body region ${ref}`);
      else out.push(...r);
    } else if (ref === "skeleton") out.push(...body.structures.filter((s) => s.output === "skeleton").map((s) => s.structureId));
    else if (!ids.has(ref)) problems.push(`${where}: unknown body structureId ${ref}`);
    else out.push(ref);
  }
  return out;
}

/** Body presentation acts on render groups: a referenced set must contain every member of each group it touches. */
function checkGroupAligned(ids: readonly string[], body: BodyManifest, problems: string[], where: string): void {
  if (!ids.length) return;
  const set = new Set(ids);
  const byId = new Map(body.structures.map((s) => [s.structureId, s]));
  const groups = new Set(ids.map((id) => byId.get(id)?.groupId).filter((g): g is string => !!g));
  for (const g of groups) {
    const members = body.groups.find((x) => x.groupId === g)?.structureIds ?? [];
    const missing = members.filter((m) => !set.has(m));
    if (missing.length) problems.push(`${where}: splits body render group ${g} (${missing.length} of ${members.length} structures not referenced)`);
  }
}

/**
 * Every reference of schema-valid lesson + locale content against the joint manifest, the body manifest and the locale.
 * Returns every problem; nothing is ignored. (Schema validity of bundled content is enforced by the build.)
 */
export function validateVideoLesson(lessonData: unknown, localeData: unknown, joint: JointManifestModel, body: BodyManifest): VideoValidationReport {
  const problems: string[] = [];
  const report: VideoValidationReport = { schemaValidation: "build", chapters: 0, shots: 0, durationMs: 0, textKeys: 0, problems };
  const lesson = lessonData as VideoLesson;
  const locale = localeData as VideoLocale;
  if (lesson.jointId !== joint.jointId) problems.push(`lesson jointId ${lesson.jointId} != manifest ${joint.jointId}`);
  if (lesson.bodyAssetId !== body.assetId) problems.push(`lesson bodyAssetId ${lesson.bodyAssetId} != body asset ${body.assetId}`);
  if (lesson.localeId !== locale.localeId) problems.push(`lesson localeId ${lesson.localeId} != locale ${locale.localeId}`);

  const keys = new Set<string>();
  const key = (k: string | undefined, where: string) => {
    if (k === undefined) return;
    keys.add(k);
    const e = locale.strings[k];
    if (!e) problems.push(`${where}: missing text key ${k}`);
    else if (!e.text.trim()) problems.push(`${where}: empty text for ${k}`);
  };
  for (const [k, e] of Object.entries(locale.strings)) {
    if (e.provenance !== "source-excerpt") continue;
    if (!e.sourceId || !locale.sources[e.sourceId]) problems.push(`locale ${k}: source-excerpt without a declared source`);
    else if (!lesson.curriculum.sourceIds.includes(e.sourceId)) problems.push(`locale ${k}: source ${e.sourceId} not declared by the lesson`);
  }
  key(lesson.titleKey, "lesson");
  key(lesson.subtitleKey, "lesson");
  key(lesson.curriculum.noteKey, "lesson");

  const siteIds = new Set(body.jointSites.map((s) => s.siteId));
  const shotIds = new Set<string>();
  const bandIds = new Set(joint.bands.map((b) => b.bandId));
  const exploreIds = new Set((lesson.explores ?? []).map((e) => e.exploreId));
  for (const chapter of lesson.chapters) {
    key(chapter.titleKey, `chapter ${chapter.id}`);
    for (const shot of chapter.shots) {
      report.shots++;
      report.durationMs += shot.durationMs;
      const w = `shot ${shot.id}`;
      if (shotIds.has(shot.id)) problems.push(`${w}: duplicate shot id`);
      shotIds.add(shot.id);
      validateShot(shot, w, { joint, body, problems, key, siteIds, bandIds });
    }
  }
  // Step 16B: a category chapter declares the teaching shape it follows. Every beat must be a shot of that chapter, in
  // order, and the explore it names must exist - so "this category is taught, not introduced" is a build-time fact.
  for (const chapter of lesson.chapters) {
    const teach = chapter.teaching;
    if (!teach) continue;
    const order = chapter.shots.map((s) => s.id);
    const beats: [string, string][] = [["arrive", teach.arrive], ["look", teach.look], ["movement", teach.movement], ["reason", teach.reason], ["name", teach.name]];
    let previous = -1;
    for (const [beat, shotId] of beats) {
      const at = order.indexOf(shotId);
      if (at < 0) {
        problems.push(`chapter ${chapter.id}: teaching.${beat} names ${shotId}, which is not a shot of this chapter`);
        continue;
      }
      if (at < previous) problems.push(`chapter ${chapter.id}: teaching.${beat} (${shotId}) comes before the previous beat`);
      previous = at;
    }
    if (!exploreIds.has(teach.explore)) problems.push(`chapter ${chapter.id}: teaching.explore names unknown exploration ${teach.explore}`);
    const reason = chapter.shots.find((s) => s.id === teach.reason);
    if (reason && !reason.narrationKey && !reason.caption.textKey) problems.push(`chapter ${chapter.id}: the reason beat ${teach.reason} says nothing`);
  }
  // Explore configs (Step 14): every id, group, site and text key must resolve, and a teaching simulation may never be
  // declared a validated rig. Same rule as everywhere else - an unknown reference fails the build, no silent fallback.
  if (lesson.explores?.length) {
    for (const e of lesson.explores) {
      for (const k of [e.titleKey, e.instructionKey, e.explanationKey, e.statusKey, ...e.siteLabels.map((l: { textKey: string }) => l.textKey)]) key(k, `explore ${e.exploreId}`);
      if (e.task) for (const k of [e.task.promptKey, e.task.doneKey]) key(k, `explore ${e.exploreId} task`);
      if (e.openAtShotId && !shotIds.has(e.openAtShotId)) problems.push(`explore ${e.exploreId}: openAtShotId ${e.openAtShotId} is not a shot`);
    }
    problems.push(
      ...checkExploreConfigs(lesson.explores, {
        groupIds: new Set(body.groups.map((g) => g.groupId)),
        structureIds: new Set(body.structures.map((s) => s.structureId)),
        siteIds,
        textKeys: new Set(Object.keys(locale.strings)),
        chapterIds: new Set(lesson.chapters.map((c) => c.id)),
        dofIds: new Set(joint.dofs.map((d) => d.id)),
      }),
    );
    report.explores = lesson.explores.length;
  }
  if (lesson.recall) {
    for (const k of [lesson.recall.promptKey, lesson.recall.correctKey, lesson.recall.incorrectKey, lesson.recall.completeKey]) key(k, "recall");
    for (const o of lesson.recall.options) key(o.labelKey, "recall");
    for (const s of lesson.recall.steps) for (const k of [s.questionKey, s.revealKey]) key(k, `recall step ${s.stepId}`);
    problems.push(
      ...checkRecallConfig(lesson.recall, {
        structureIds: new Set(body.structures.map((s) => s.structureId)),
        siteIds,
        textKeys: new Set(Object.keys(locale.strings)),
        chapterIds: new Set(lesson.chapters.map((c) => c.id)),
      }),
    );
    report.recallSteps = lesson.recall.steps.length;
  }
  report.chapters = lesson.chapters.length;
  report.textKeys = keys.size;
  return report;
}

function validateShot(shot: Shot, w: string, ctx: { joint: JointManifestModel; body: BodyManifest; problems: string[]; key: (k: string | undefined, where: string) => void; siteIds: Set<string>; bandIds: Set<string> }): void {
  const { joint, body, problems, key, siteIds, bandIds } = ctx;
  key(shot.a11yKey, w);
  for (const k of [shot.caption.eyebrowKey, shot.caption.titleKey, shot.caption.textKey, shot.caption.noteKey, shot.interaction.promptKey, shot.narrationKey]) key(k, w);
  if (shot.caption.appearAtMs > shot.durationMs) problems.push(`${w}: caption appears after the shot ends`);
  // A speech-timed shot has no length of its own until the narration build measures its clip, so it must have something to say.
  if (shot.durationFrom === "speech" && !shot.narrationKey && !shot.caption.textKey && !shot.caption.titleKey) problems.push(`${w}: durationFrom "speech" but the shot says nothing`);
  if (shot.minDurationMs !== undefined && shot.minDurationMs > shot.durationMs) problems.push(`${w}: minDurationMs ${shot.minDurationMs} exceeds durationMs ${shot.durationMs}`);

  // camera
  const cam = shot.camera;
  if (cam.preset === "site") {
    if (!cam.site || !siteIds.has(cam.site)) problems.push(`${w}: camera site ${cam.site} is not a body joint site`);
  } else if (cam.site) problems.push(`${w}: camera.site only applies to the site preset`);
  if ((cam.preset === "site" || cam.preset === "body") && !BODY_VIEWS.has(cam.view)) problems.push(`${w}: body camera needs a body view, got ${cam.view}`);
  if (JOINT_PRESETS.has(cam.preset)) {
    if (!JOINT_VIEWS.has(cam.view)) problems.push(`${w}: joint camera needs a joint view, got ${cam.view}`);
    if (!shot.joint.visible) problems.push(`${w}: ${cam.preset} camera frames the joint asset, but joint.visible is false`);
  }
  if (cam.structures) resolveJointRefs(cam.structures, joint, problems, `${w}.camera.structures`);
  if (cam.transitionMs > shot.durationMs) problems.push(`${w}: camera transition longer than the shot`);

  // body
  checkGroupAligned(resolveBodyRefs(shot.body.highlight, body, problems, `${w}.body.highlight`), body, problems, `${w}.body.highlight`);
  checkGroupAligned(resolveBodyRefs(shot.body.hidden, body, problems, `${w}.body.hidden`), body, problems, `${w}.body.hidden`);

  // joint
  const j = shot.joint;
  if (!j.visible && (j.handOver || j.detail || j.reveal.length || j.highlight.length || j.poseKeys.length)) problems.push(`${w}: joint settings given while joint.visible is false`);
  if (j.visible && !j.handOver && shot.body.visible) problems.push(`${w}: joint asset shown over the body without handOver (duplicate anatomy)`);
  if (j.visible && j.handOver) {
    // Handover hides whole render groups: the joint asset's shared source objects must cover them exactly.
    const bySource = new Map(body.structures.map((s) => [s.sourceObject, s.structureId]));
    const shared = joint.structures.filter((s) => s.tier !== "context").map((s) => bySource.get(s.source.object)).filter((x): x is string => !!x);
    checkGroupAligned(shared, body, problems, `${w}.joint.handOver`);
  }
  const revealed = resolveJointRefs(j.reveal, joint, problems, `${w}.joint.reveal`);
  resolveJointRefs(j.highlight, joint, problems, `${w}.joint.highlight`);
  if (j.visible && !j.poseKeys.length) problems.push(`${w}: joint visible without a pose key`);
  let last = -1;
  let posed = false;
  let moving = false;
  let prevValue: number | null = null;
  for (const [i, k] of j.poseKeys.entries()) {
    if (k.atMs < last) problems.push(`${w}.poseKeys[${i}]: keys must be in time order`);
    if (k.atMs > shot.durationMs) problems.push(`${w}.poseKeys[${i}]: key after the shot ends`);
    last = k.atMs;
    for (const [dof, v] of Object.entries(k.pose)) {
      const spec = joint.dofs.find((d) => d.id === dof);
      if (!spec) {
        problems.push(`${w}.poseKeys[${i}]: unknown dof ${dof}`);
        continue;
      }
      const value = resolvePoseValue(v, dof, joint);
      if (!(value >= spec.min && value <= spec.max)) problems.push(`${w}.poseKeys[${i}]: ${dof}=${value} outside controller limits ${spec.min}..${spec.max}`);
      if (value !== spec.neutral) posed = true;
      if (prevValue !== null && value !== prevValue) moving = true;
      prevValue = value;
    }
  }
  if (j.poseKeys.length && j.poseKeys[0].atMs !== 0) problems.push(`${w}: first pose key must be at 0 ms (seekable state)`);
  // Context rule: static (non-tracking) joint anatomy must not be revealed while the joint is posed or moving.
  const staticRevealed = revealed.filter((id) => !tracksPose(joint.structure(id)!.motionBehavior));
  if ((staticRevealed.length || j.detail) && (posed || moving || shot.interaction.mode !== "passive")) problems.push(`${w}: static anatomy (${staticRevealed.join(", ") || "detail tier"}) revealed while the joint is posed, moving or learner-controlled`);
  // The body skin shell does not follow the joint asset.
  if (shot.body.shell && j.visible) problems.push(`${w}: skin shell cannot be shown with the posed joint asset`);

  // labels
  if (shot.labels.anchors.length > MAX_ANCHOR_LABELS) problems.push(`${w}: more than ${MAX_ANCHOR_LABELS} anchor labels`);
  for (const a of [...shot.labels.anchors, ...shot.labels.focus]) if (!joint.anchor(a)) problems.push(`${w}.labels: unknown anchorId ${a}`);
  for (const a of shot.labels.focus) if (!shot.labels.anchors.includes(a)) problems.push(`${w}.labels.focus: ${a} is not shown`);
  if ((shot.labels.anchors.length || shot.labels.bands.length) && !j.visible) problems.push(`${w}: joint anchor labels need the joint asset visible`);
  for (const b of [...shot.labels.bands, ...shot.overlays.bands]) if (!bandIds.has(b)) problems.push(`${w}: unknown bandId ${b}`);
  for (const b of shot.labels.bands) if (!shot.overlays.bands.includes(b)) problems.push(`${w}.labels.bands: band ${b} label without its band overlay`);
  for (const s of shot.labels.sites) {
    if (!siteIds.has(s.siteId)) problems.push(`${w}.labels.sites: unknown site ${s.siteId}`);
    key(s.textKey, `${w}.labels.sites`);
  }

  // overlays
  if (MOTION_OVERLAYS.some((o) => shot.overlays[o]) && !j.visible) problems.push(`${w}: joint motion overlays need the joint asset visible`);
  if (shot.overlays.bands.length && !j.visible) problems.push(`${w}: schematic bands need the joint asset visible`);
  for (const c of shot.overlays.concepts) if (!siteIds.has(c)) problems.push(`${w}.overlays.concepts: unknown site ${c}`);
  if (shot.overlays.concepts.length && !shot.body.visible) problems.push(`${w}: concept indicators need the body visible`);

  // interaction
  if (shot.interaction.mode === "guided" && !j.visible) problems.push(`${w}: guided interaction needs the joint asset visible`);
  const check = shot.interaction.check;
  if (check) {
    for (const k of [check.promptKey, check.correctKey, check.incorrectKey]) key(k, `${w}.check`);
    const spec = joint.dofs.find((d) => d.id === check.dof);
    if (!spec) problems.push(`${w}.check: unknown dof ${check.dof}`);
    else if (!(check.target >= spec.min && check.target <= spec.max)) problems.push(`${w}.check: target ${check.target} outside controller limits`);
    if (shot.interaction.mode !== "guided") problems.push(`${w}.check: a pose check needs guided interaction`);
  }
  if (shot.interaction.waitForCheck && !check) problems.push(`${w}: waitForCheck without a check`);
}

export function assertValidVideoLesson(lessonData: unknown, localeData: unknown, joint: JointManifestModel, body: BodyManifest): { lesson: VideoLesson; locale: VideoLocale; report: VideoValidationReport } {
  const report = validateVideoLesson(lessonData, localeData, joint, body);
  if (report.problems.length) throw new VideoLessonValidationError("video lesson content failed validation", report.problems);
  return { lesson: lessonData as VideoLesson, locale: localeData as VideoLocale, report };
}
