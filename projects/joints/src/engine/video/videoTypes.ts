// Runtime view of content/schemas/video-lesson.schema.json (schema 2, format "video").
// A lesson is chapters of shots. Each shot is a complete, declarative scene description, so any point of the timeline can
// be reconstructed directly (seeking never replays earlier animation).

export type BodyView = "front" | "frontRight" | "right" | "backRight" | "left" | "frontLeft";
export type JointView = "oblique" | "anterior" | "axisPositive" | "axisNegative";
export type PoseValue = number | "sourcePose" | "neutral";
export type ShotEasing = "easeInOutCubic" | "easeOutCubic" | "linear" | "hold";

export interface ShotCamera {
  /** body: whole body; site: a body joint site; closeUp / focus / movement: the validated joint asset. */
  preset: "body" | "site" | "closeUp" | "focus" | "movement";
  site?: string;
  structures?: string[];
  view: BodyView | JointView;
  /** Framing multiplier at shot start / end (end != start = slow push-in or pull-back). */
  scale: number;
  endScale?: number;
  extentM?: number;
  /** Travel time from the previous camera (0 = cut). Seeking always cuts. */
  transitionMs: number;
  /** Screen composition (projection offset); default centre. */
  compose?: "center" | "left" | "right";
  /** Extra upward view component (look down onto the subject). */
  elevation?: number;
}

export interface ShotBody {
  visible: boolean;
  shell: boolean;
  /** Body refs: structureId, region:<id>, skeleton. */
  highlight: string[];
  dimOthers: boolean;
  hidden: string[];
}

export interface PoseKey {
  atMs: number;
  pose: Record<string, PoseValue>;
  ease: ShotEasing;
}

export interface ShotJoint {
  visible: boolean;
  /** Hide body structures that the joint asset shows (shared source objects). */
  handOver: boolean;
  detail: boolean;
  /** Detail/joint structure refs to show even when their tier layer is off. */
  reveal: string[];
  highlight: string[];
  poseKeys: PoseKey[];
}

export interface ShotLabels {
  anchors: string[];
  bands: string[];
  focus: string[];
  sites: { siteId: string; textKey: string }[];
}

export interface ShotOverlays {
  axis: boolean;
  neutralDirection: boolean;
  currentDirection: boolean;
  motionArrow: boolean;
  angleBadge: boolean;
  arc: boolean;
  ticks: boolean;
  bands: string[];
  concepts: string[];
  conceptLoopMs: number;
}

export interface ShotCaption {
  eyebrowKey?: string;
  titleKey?: string;
  textKey?: string;
  noteKey?: string;
  appearAtMs: number;
  style: "title" | "statement" | "lower";
}

export interface PoseCheck {
  type: "poseTarget";
  dof: string;
  target: number;
  tolerance: number;
  holdMs: number;
  promptKey: string;
  correctKey: string;
  incorrectKey: string;
}

export interface ShotInteraction {
  mode: "passive" | "guided";
  promptKey?: string;
  /** Learner input pauses the film; it resumes after this much idle time (or the Resume button). */
  resumeAfterIdleMs: number;
  check?: PoseCheck;
  /** Hold at the end of the shot until the check is answered correctly (or the learner continues). */
  waitForCheck: boolean;
}

export interface Shot {
  id: string;
  durationMs: number;
  a11yKey: string;
  camera: ShotCamera;
  body: ShotBody;
  joint: ShotJoint;
  labels: ShotLabels;
  overlays: ShotOverlays;
  caption: ShotCaption;
  interaction: ShotInteraction;
  /**
   * The spoken explanation (Step 16B). The caption is a short headline the learner can hold; this is the fuller sentence
   * or two that says what is being looked at, what is happening and why it matters. It is an ordinary locale string with
   * a provenance class, so it is reviewed exactly like a caption - narration still introduces no unreviewed claim.
   * When absent the caption is spoken, as before.
   */
  narrationKey?: string;
  /**
   * "speech": `durationMs` is written by the narration build from the measured length of this shot's clip plus a floor,
   * so a teaching beat never ends mid-sentence and never holds a dead frame. "authored" (the default) keeps the authored
   * duration - transitions and learner-paced shots decide their own length.
   */
  durationFrom?: "authored" | "speech";
  /** Visual floor for a speech-timed shot: the picture needs this long even if the sentence is short. */
  minDurationMs?: number;
}

/**
 * The teaching shape a joint chapter follows, declared as content (Step 16B).
 *
 * Every category is taught in the same order - arrive at the place, look at the join, watch it move, hear why that
 * shape produces that movement, then name it - and every category hands the learner something to do. The engine does
 * not branch on this; it is the contract the four chapters are written against and the thing tests assert, so a
 * category cannot quietly fall back to being introduced rather than taught.
 */
export interface ChapterTeaching {
  /** shotId: the camera travels to the site while the narration says where we are going. */
  arrive: string;
  /** shotId: the join itself, still, framed large enough to read as two structures. */
  look: string;
  /** shotId: the movement the category is named for. */
  movement: string;
  /** shotId: why that shape allows that movement. */
  reason: string;
  /** shotId: the category is named, after the reason rather than before it. */
  name: string;
  /** exploreId: the learner does it themselves. */
  explore: string;
}

export interface Chapter {
  /** The nine teaching beats: hook, concept, the four categories, compare, recall, body map. */
  id: "hook" | "what_is_joint" | "fixed" | "pivot" | "ball_socket" | "hinge" | "compare" | "recall" | "body_map";
  number: string;
  titleKey: string;
  shots: Shot[];
  /** Present on the four category chapters. */
  teaching?: ChapterTeaching;
}

export interface VideoLesson {
  schema: 2;
  format: "video";
  lessonId: string;
  jointId: string;
  bodyAssetId: string;
  localeId: string;
  titleKey: string;
  subtitleKey: string;
  curriculum: { status: "draft" | "reviewed" | "approved"; sourceIds: string[]; figureReference: string; noteKey: string };
  reducedMotion: { camera: "cut"; pose: "keyframes"; concepts: "static"; captions: "instant" };
  chapters: Chapter[];
  /** Learner-controlled joint explorations, one per joint category (Step 14). */
  explores?: ExploreConfig[];
  /** Retrieval sequence that replaces the passive recap (Step 14). */
  recall?: RecallConfig;
}

import type { ExploreConfig } from "../explore/exploreTypes";
import type { RecallConfig } from "../explore/RecallSequence";
export type { ExploreConfig, RecallConfig };

export type Provenance = "source-excerpt" | "figure-reference" | "draft-enrichment" | "ui";

export interface LocaleString {
  text: string;
  provenance: Provenance;
  sourceId?: string;
}

export interface VideoLocale {
  schema: 1;
  localeId: string;
  language: string;
  provenanceLegend: Record<Provenance, string>;
  sources: Record<string, { description: string; verifiedAgainstTextbook: boolean }>;
  strings: Record<string, LocaleString>;
}
