// Step 14B: restructure the lesson from six chapters into the nine-chapter teaching arc.
//
// This is an authoring script, not a runtime one. It is kept because it is the record of exactly which existing shots
// moved where and which beats are new: every reused shot is cloned from the current content (so its validated camera,
// highlight sets and overlays are carried over untouched), and every new beat is written out here in full.
//
//   node qa/step14/restructure_lesson.mjs
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "content/lessons/hinge-elbow.json";
const lesson = JSON.parse(readFileSync(LESSON, "utf8"));

const byId = new Map();
for (const c of lesson.chapters) for (const s of c.shots) byId.set(s.id, s);
const take = (id) => {
  const s = byId.get(id);
  if (!s) throw new Error(`no such shot: ${id}`);
  return structuredClone(s);
};
/** Clone an existing shot and rename it (the shot keeps its validated camera, body refs and overlays). */
const rename = (id, newId, a11yKey) => {
  const s = take(id);
  s.id = newId;
  s.a11yKey = a11yKey ?? `a11y.${newId}`;
  return s;
};

// Highlight sets are copied from shots the build already validates: body presentation acts on render groups, and a
// referenced set has to contain every member of each group it touches.
const SKULL = take("fixed.detail").body.highlight;
const NECK = take("pivot.rotate").body.highlight;
const SHOULDER = take("ball.shoulder").body.highlight;
const ELBOW = take("hinge.source").body.highlight;

const EMPTY_JOINT = { visible: false, handOver: false, detail: false, reveal: [], highlight: [], poseKeys: [] };
const NO_OVERLAYS = { axis: false, neutralDirection: false, currentDirection: false, motionArrow: false, angleBadge: false, arc: false, ticks: false, bands: [], concepts: [], conceptLoopMs: 4000 };
const PASSIVE = { mode: "passive", resumeAfterIdleMs: 2500, waitForCheck: false };

/** A body-or-site shot: everything a new teaching beat needs, with the lesson's own defaults. */
function shot({ id, durationMs, camera, highlight = [], hidden = [], shell = false, concepts = [], sites = [], caption, interaction = PASSIVE, conceptLoopMs = 4000 }) {
  return {
    id,
    durationMs,
    a11yKey: `a11y.${id}`,
    camera,
    body: { visible: true, shell, highlight, dimOthers: highlight.length > 0, hidden },
    joint: { ...EMPTY_JOINT },
    labels: { anchors: [], bands: [], focus: [], sites },
    overlays: { ...NO_OVERLAYS, concepts, conceptLoopMs },
    caption,
    interaction,
  };
}

const siteCam = (site, view, scale, endScale, extra = {}) => ({ transitionMs: 2000, preset: "site", site, view, scale, endScale, ...extra });
const bodyCam = (view, scale, endScale, extra = {}) => ({ transitionMs: 2000, preset: "body", view, scale, endScale, ...extra });

// ---------------------------------------------------------------- 01 HOOK
// A question the learner can feel in their own body, before any terminology. Shoulder, then elbow, then the contrast.
const hook = [
  take("intro.title"),
  shot({
    id: "hook.shoulder",
    durationMs: 6500,
    camera: siteCam("ball_socket.shoulder_right", "frontRight", 9.5, 8.4, { compose: "left", elevation: 0.12 }),
    highlight: SHOULDER,
    concepts: ["ball_socket.shoulder_right"],
    caption: { appearAtMs: 900, style: "lower", textKey: "hook.shoulder", noteKey: "note.schematic_indicator" },
  }),
  shot({
    id: "hook.elbow",
    durationMs: 6500,
    camera: siteCam("hinge.elbow_right", "right", 6.4, 5.6, { compose: "right", elevation: 0.1 }),
    highlight: ELBOW,
    concepts: ["hinge.elbow_right"],
    caption: { appearAtMs: 900, style: "lower", textKey: "hook.elbow", noteKey: "note.schematic_indicator" },
  }),
  shot({
    id: "hook.question",
    durationMs: 6000,
    camera: bodyCam("frontRight", 1.06, 1.0, { elevation: 0.05 }),
    concepts: ["ball_socket.shoulder_right", "hinge.elbow_right"],
    caption: { appearAtMs: 600, style: "statement", textKey: "hook.question" },
  }),
];

// ---------------------------------------------------------------- 02 WHAT IS A JOINT?
// The answer to the hook's question, shown rather than defined: two bones meeting, then the idea that how they meet
// decides how they move. The existing joint map closes the chapter.
const concept = [
  shot({
    id: "concept.meet",
    durationMs: 6500,
    camera: siteCam("hinge.elbow_right", "right", 4.3, 3.8, { compose: "right", elevation: 0.15 }),
    highlight: ELBOW,
    caption: { appearAtMs: 800, style: "statement", textKey: "concept.meet" },
  }),
  shot({
    id: "concept.different",
    durationMs: 7000,
    camera: siteCam("ball_socket.shoulder_right", "frontRight", 14, 12, { elevation: 0.2 }),
    highlight: [...SKULL, ...NECK, ...SHOULDER],
    concepts: ["fixed.skull", "pivot.upper_neck", "ball_socket.shoulder_right"],
    caption: { appearAtMs: 800, style: "statement", textKey: "concept.different", noteKey: "note.schematic_indicator" },
  }),
  take("intro.map"),
];

// ---------------------------------------------------------------- 03-06 the four joints (unchanged shots)
const fixed = [take("fixed.travel"), take("fixed.detail")];
const pivot = [take("pivot.travel"), take("pivot.rotate")];
const ball = [take("ball.travel"), take("ball.shoulder"), take("ball.hip")];
// The guided pose check moves out of the old recap and into the chapter it is actually about, straight after the free try.
const hinge = [
  take("hinge.travel"),
  take("hinge.source"),
  take("hinge.bones"),
  take("hinge.axis"),
  take("hinge.flexion"),
  take("hinge.extension"),
  take("hinge.try"),
  rename("recap.check", "hinge.check"),
  take("hinge.support"),
  take("hinge.return"),
  take("hinge.knee"),
];

// ---------------------------------------------------------------- 07 COMPARE
// One movement pattern at a time, each named only after it has been seen, then the four together. This chapter teaches
// the mapping the lesson exists for: joint type = movement pattern.
const compareSite = (id, site, view, scale, endScale, textKey, sites) =>
  shot({
    id,
    durationMs: 5000,
    camera: siteCam(site, view, scale, endScale),
    highlight: { "compare.fixed": SKULL, "compare.pivot": NECK, "compare.ball": SHOULDER, "compare.hinge": ELBOW }[id],
    concepts: [site],
    sites,
    caption: { appearAtMs: 700, style: "lower", textKey },
  });

const compare = [
  { ...rename("recap.pullback", "compare.pullback"), durationMs: 6000 },
  compareSite("compare.fixed", "fixed.skull", "right", 3.6, 3.3, "compare.fixed", [{ siteId: "fixed.skull", textKey: "recap.label.fixed" }]),
  compareSite("compare.pivot", "pivot.upper_neck", "frontRight", 6.5, 6.0, "compare.pivot", [{ siteId: "pivot.upper_neck", textKey: "recap.label.pivot" }]),
  compareSite("compare.ball", "ball_socket.shoulder_right", "frontRight", 8.5, 7.8, "compare.ball", [{ siteId: "ball_socket.shoulder_right", textKey: "recap.label.ball" }]),
  compareSite("compare.hinge", "hinge.elbow_right", "right", 5.4, 5.0, "compare.hinge", [{ siteId: "hinge.elbow_right", textKey: "recap.label.hinge" }]),
  shot({
    id: "compare.together",
    durationMs: 8000,
    camera: bodyCam("frontRight", 1.12, 1.05, { elevation: 0.05 }),
    concepts: ["fixed.skull", "pivot.upper_neck", "ball_socket.shoulder_right", "hinge.elbow_right"],
    caption: { appearAtMs: 700, style: "statement", textKey: "compare.together", noteKey: "note.recap_schematic" },
  }),
];

// ---------------------------------------------------------------- 08 RECALL CHALLENGE
// Its own chapter. The film hands over to the retrieval panel, which owns the framing for each question.
const recall = [
  shot({
    id: "recall.open",
    durationMs: 5000,
    camera: bodyCam("frontRight", 1.1, 1.06, { elevation: 0.05 }),
    caption: { appearAtMs: 500, style: "statement", textKey: "recall.open" },
  }),
  shot({
    id: "recall.challenge",
    durationMs: 6000,
    camera: bodyCam("frontRight", 1.06, 1.04, { elevation: 0.05 }),
    caption: { appearAtMs: 300, style: "lower", textKey: "recall.start_hint" },
  }),
];

// ---------------------------------------------------------------- 09 FINAL BODY MAP
// The memory anchor, after the recall rather than instead of it: the whole body, each site named in turn, then all of them.
const mapSite = (id, site, textKey, labelKey) =>
  shot({
    id,
    durationMs: 4000,
    camera: bodyCam("frontRight", 1.1, 1.06, { elevation: 0.05 }),
    concepts: [site],
    sites: [{ siteId: site, textKey: labelKey }],
    caption: { appearAtMs: 400, style: "lower", textKey },
  });

const bodyMap = [
  shot({
    id: "map.intro",
    durationMs: 5000,
    camera: bodyCam("front", 1.2, 1.12),
    shell: true,
    caption: { appearAtMs: 600, style: "statement", textKey: "map.intro" },
  }),
  mapSite("map.fixed", "fixed.skull", "map.fixed", "recap.label.fixed"),
  mapSite("map.pivot", "pivot.upper_neck", "map.pivot", "recap.label.pivot"),
  mapSite("map.ball", "ball_socket.shoulder_right", "map.ball", "recap.label.ball"),
  mapSite("map.hinge", "hinge.elbow_right", "map.hinge", "recap.label.hinge"),
  rename("recap.compare", "map.all"),
];

lesson.chapters = [
  { id: "hook", number: "01", titleKey: "chapter.hook", shots: hook },
  { id: "what_is_joint", number: "02", titleKey: "chapter.what_is_joint", shots: concept },
  { id: "fixed", number: "03", titleKey: "chapter.fixed", shots: fixed },
  { id: "pivot", number: "04", titleKey: "chapter.pivot", shots: pivot },
  { id: "ball_socket", number: "05", titleKey: "chapter.ball_socket", shots: ball },
  { id: "hinge", number: "06", titleKey: "chapter.hinge", shots: hinge },
  { id: "compare", number: "07", titleKey: "chapter.compare", shots: compare },
  { id: "recall", number: "08", titleKey: "chapter.recall", shots: recall },
  { id: "body_map", number: "09", titleKey: "chapter.body_map", shots: bodyMap },
];

lesson.recall.chapterId = "recall";
lesson.recall.shotId = "recall.challenge";

writeFileSync(LESSON, JSON.stringify(lesson, null, 1) + "\n");
const shots = lesson.chapters.flatMap((c) => c.shots);
console.log(`${lesson.chapters.length} chapters, ${shots.length} shots, ${Math.round(shots.reduce((a, s) => a + s.durationMs, 0) / 1000)} s`);
for (const c of lesson.chapters) console.log(` ${c.number} ${c.id.padEnd(14)} ${c.shots.length} shots  ${c.shots.map((s) => s.id).join(", ")}`);
