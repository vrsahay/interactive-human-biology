// Step 16B - teaching-depth pass.
//
// Rewrites the four category chapters so each is taught to the same depth and in the same shape
// (arrive -> look -> movement -> reason -> name -> do it), separates the short headline caption from the longer spoken
// explanation, rebuilds the comparison chapter as four readable moments, and gives every exploration a task.
//
// Content only: no engine behaviour, no assets, no rig. Run once from the repo root:
//   node qa/step16b/apply_teaching_depth.mjs
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "content/lessons/hinge-elbow.json";
const LOCALE = "content/locales/en/hinge-elbow.json";
const lesson = JSON.parse(readFileSync(LESSON, "utf8"));
const locale = JSON.parse(readFileSync(LOCALE, "utf8"));

// ------------------------------------------------------------------ strings
// Every new instructional sentence is draft-enrichment: written for this lesson, not curriculum wording, and recorded in
// qa/step16b/reason-statements.md for subject-expert review. Category names stay figure-reference; interface text is ui.
const D = "draft-enrichment";
const F = "figure-reference";
const U = "ui";
const add = (key, text, provenance) => {
  locale.strings[key] = { text, provenance };
};

// ---- chapter 02: a joint is where bones meet (the shot shows three bones; the wording now agrees with the picture)
add("concept.meet", "A joint is a place where bones meet.", D);
add("narr.concept.meet", "A joint is any place where bones meet. Most joints are two bones meeting; here at the elbow, three bones come together.", D);
add("narr.concept.different", "How the bones meet at a joint decides how that joint can move. Change the shape of the join and you change the movement.", D);
add("narr.intro.map", "You have joints like these all over your body. We will look at four kinds, and at what each shape allows.", D);

// ---- chapter 01
add("narr.intro.title", "Every time you move, bones move against each other at a joint. Different joints allow very different movements.", D);
add("narr.hook.shoulder", "Start with the shoulder. Your arm can swing forward, out to the side, and round in a circle.", D);
add("narr.hook.elbow", "Now the elbow, on the same arm. It does one thing: it bends and it straightens.", D);
add("narr.hook.question", "Both are joints in the same arm. So why does one move in every direction and the other in only one?", D);

// ---- chapter 03 fixed
add("fixed.travel.head", "Several bones, one skull", D);
add("narr.fixed.travel", "Go up to the top of the head. The skull looks like a single piece, but it is several separate bones meeting along wavy lines.", D);
add("fixed.bones.head", "Two bones, one join", D);
add("narr.fixed.bones", "These are two of those bones, and this is the line where they meet. Look at how the edges follow each other.", D);
add("fixed.try.head", "Almost no movement", D);
add("narr.fixed.try", "Watch the join itself. Nothing slides and nothing bends. These two bones stay exactly where they are.", D);
add("fixed.why.head", "Why they cannot move", D);
add("narr.fixed.why", "The edges of these bones lock into each other, and tough fibres hold them tightly together. There is no gap for them to slide in, so they cannot move against each other.", D);
add("narr.fixed.name", "A join that holds two bones still like this is called a fixed joint. Its job is strength, not movement: together these bones make one solid case around the brain.", D);
add("fixed.task.head", "Your turn", D);
add("narr.fixed.task", "Try it yourself. See whether you can move these two bones apart.", D);

// ---- chapter 04 pivot
add("pivot.travel.head", "The top of the neck", D);
add("narr.pivot.travel", "Now down to the top of the neck, just under the skull, where the head meets the backbone.", D);
add("pivot.bones.head", "One bone on top of another", D);
add("narr.pivot.bones", "At the top of the neck, one small bone sits on top of another. Nothing is moving yet. The lower bone is the one that stays still.", D);
add("pivot.rotate.head", "The upper bone turns", D);
add("narr.pivot.rotate", "Now the upper bone turns around the one below it, and your head turns with it.", D);
add("pivot.why.head", "Turning, and nothing else", D);
add("narr.pivot.why", "The upper bone turns around one line running straight up through both bones. Turning around that line is the only movement this shape allows, which is why the head swivels here rather than bending.", D);
add("narr.pivot.name", "A joint where one bone turns around another like this is called a pivot joint.", D);
add("pivot.task.head", "Your turn", D);
add("narr.pivot.task", "Try it yourself. Turn the head as if you were looking over one shoulder.", D);

// ---- chapter 05 ball-and-socket
add("ball.travel.head", "Where the arm meets the body", D);
add("narr.ball.travel", "Back up to the shoulder, where the arm meets the body.", D);
add("ball.bones.head", "A round end and a hollow", D);
add("narr.ball.bones", "The top of the upper-arm bone is a smooth, rounded ball. Beside it, the shoulder blade has a shallow hollow, and the ball rests in it.", D);
add("ball.move.head", "Movement in many directions", D);
add("narr.ball.move", "From there the arm can swing forward and back, lift out to the side, and sweep round in a circle.", D);
add("ball.why.head", "Why it moves so freely", D);
add("narr.ball.why", "A rounded end sitting in a hollow can roll and turn in every direction at once. Nothing holds it to a single line, so the arm is not limited to one direction the way the elbow is.", D);
add("narr.ball.name", "A rounded end sitting in a hollow like this is called a ball-and-socket joint.", D);
add("ball.task.head", "Your turn", D);
add("narr.ball.task", "Try it yourself. Move the arm in two different directions.", D);

// ---- chapter 06 hinge
add("hinge.travel.head", "The elbow", D);
add("narr.hinge.travel", "Down the same arm now, to the elbow.", D);
add("narr.hinge.source", "The elbow bends and straightens in one direction, the way a door swings on its hinges.", D);
add("narr.hinge.bones", "The elbow is where the upper-arm bone meets two bones in the forearm.", D);
add("narr.hinge.axis", "This blue line shows the direction the elbow bends around. We call that line the axis.", D);
add("narr.hinge.flexion", "Watch the forearm come up. When the elbow bends like this, the movement is called flexion.", D);
add("narr.hinge.extension", "And as it straightens again, that movement is called extension.", D);
add("hinge.why.head", "Why it bends only one way", D);
add("narr.hinge.why", "Look at the shape of the join. The end of the upper-arm bone is like a spool, and the forearm bone wraps around it. A spool can only turn about its own line, so the elbow can only bend and straighten.", D);
add("hinge.name.label", "Hinge joint", F);
add("narr.hinge.name", "A joint that bends and straightens around one line like this is called a hinge joint.", D);
add("narr.hinge.support", "A joint capsule and ligaments wrap around the elbow. They hold the bones together and keep the movement on that one line.", D);
add("narr.hinge.return", "The elbow settles back to rest.", D);
add("narr.hinge.knee", "The knee is another hinge joint. It is bigger, but it does the same thing: it bends and straightens one way.", D);

// ---- chapter 07 compare (four readable moments, then a summary)
add("narr.compare.pullback", "Four joints, in one body, with four different ways of moving. Look at each one again.", D);
add("compare.fixed.label", "Fixed", F);
add("narr.compare.fixed", "The skull: edges locked together, so almost no movement.", D);
add("compare.pivot.label", "Pivot", F);
add("narr.compare.pivot", "The top of the neck: one bone turning around another.", D);
add("compare.ball.label", "Ball and socket", F);
add("narr.compare.ball", "The shoulder: a round end in a hollow, so movement in many directions.", D);
add("compare.hinge.label", "Hinge", F);
add("narr.compare.hinge", "The elbow: bending and straightening around one line.", D);
add("narr.compare.together", "Four different shapes, four different movements. The shape of the join decides what the joint can do.", D);

// ---- chapter 08 / 09
add("narr.recall.open", "Your turn again. This time you name each joint from the way it moves.", D);
add("narr.map.intro", "Here they are together, in one body.", D);
add("narr.map.all", "Fixed joints hold bones still. Pivot joints turn. Ball-and-socket joints move many ways. Hinge joints bend and straighten one way.", D);

// ---- explore tasks
add("explore.fixed.task", "Try to move the two skull bones apart.", D);
add("explore.fixed.done", "They barely move, and they spring straight back. That is a fixed joint.", D);
add("explore.pivot.task", "Turn the head as if you were looking over one shoulder.", D);
add("explore.pivot.done", "The head turned, and the bone below stayed still. That is a pivot joint.", D);
add("explore.ball.task", "Move the arm in two different directions.", D);
add("explore.ball.done", "One joint, more than one direction. That is a ball-and-socket joint.", D);
add("explore.hinge.task", "Bend the elbow until it is about half-way — around 90 degrees.", D);
add("explore.hinge.done", "That is flexion. Straighten it again and that is extension — one line, two directions.", D);

// ---- interface (Step 16B)
add("ui.start_lesson", "Start lesson", U);
add("ui.start_meta", "9 parts · about 6 minutes", U);
add("ui.start_sound", "Narrated. Turn your sound on.", U);
add("ui.start_thesis", "How the shape of a join decides the movement.", U);
add("ui.complete_title", "Lesson complete", U);
add("ui.complete_replay", "Replay", U);
add("ui.complete_explore", "Explore the body", U);
add("ui.complete_recall", "Try the recall again", U);
add("ui.task", "Your task", U);

// ---- accessibility descriptions for the new shots
const a11y = {
  "a11y.fixed.bones": "Close view of two skull bones meeting along a wavy line. Nothing is moving.",
  "a11y.fixed.try": "The same two skull bones with the fixed-joint indicator pulsing at the join. Neither bone moves.",
  "a11y.fixed.why": "Close view of the join between the two skull bones, held still.",
  "a11y.fixed.name": "The two skull bones, lit, with the fixed joint labelled.",
  "a11y.fixed.task": "The skull, framed for the learner to try moving the bones.",
  "a11y.pivot.why": "The two bones at the top of the neck, with the rotation indicator turning around a vertical line.",
  "a11y.pivot.name": "The top of the neck, lit, with the pivot joint labelled.",
  "a11y.pivot.task": "The head and the top of the neck, framed for the learner to turn the head.",
  "a11y.ball.bones": "Close view of the rounded top of the upper-arm bone resting against the hollow on the shoulder blade.",
  "a11y.ball.move": "The shoulder with the multi-direction indicator sweeping around the top of the upper-arm bone.",
  "a11y.ball.why": "Close view of the rounded end of the upper-arm bone and the hollow it sits in.",
  "a11y.ball.name": "The shoulder, lit, with the ball-and-socket joint labelled.",
  "a11y.ball.task": "The shoulder and upper arm, framed for the learner to move the arm.",
  "a11y.hinge.why": "Close view of the elbow, showing the spool-shaped end of the upper-arm bone and the forearm bone wrapped around it.",
  "a11y.hinge.name": "The elbow at rest with the hinge axis drawn through it.",
};
for (const [k, v] of Object.entries(a11y)) add(k, v, U);

// The delivery manifest's close-up sphere caps how wide a site framing may be: scale <= radiusM / (1.6 * SITE_SCALE_M),
// i.e. 4.5 at the skull, 4.25 at the neck, 4.0 at the shoulder, 5.6 at the elbow. The manifest is frozen, so every
// framing below is written to fit it.
// ------------------------------------------------------------------ shot helpers
const chapter = (id) => lesson.chapters.find((c) => c.id === id);
const shotOf = (chapterId, shotId) => chapter(chapterId).shots.find((s) => s.id === shotId);
const clone = (o) => JSON.parse(JSON.stringify(o));

/** A shot built from an existing one: same declarative shape, only the named fields differ. */
function derive(base, patch) {
  const s = clone(base);
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) Object.assign(s[k], v);
    else s[k] = v;
  }
  return s;
}

/** Instructional beat: the narration decides the length, with a visual floor. */
const speech = (ms) => ({ durationFrom: "speech", minDurationMs: ms });

// ------------------------------------------------------------------ chapter 01 / 02: narration only
Object.assign(shotOf("hook", "intro.title"), { narrationKey: "narr.intro.title", ...speech(8000) });
for (const [id, key] of [["hook.shoulder", "narr.hook.shoulder"], ["hook.elbow", "narr.hook.elbow"], ["hook.question", "narr.hook.question"]]) {
  const s = shotOf("hook", id);
  s.narrationKey = key;
  Object.assign(s, speech(5500));
}
for (const [id, key] of [["concept.meet", "narr.concept.meet"], ["concept.different", "narr.concept.different"], ["intro.map", "narr.intro.map"]]) {
  const s = shotOf("what_is_joint", id);
  s.narrationKey = key;
  Object.assign(s, speech(6000));
}

// ------------------------------------------------------------------ chapter 03: fixed
{
  const c = chapter("fixed");
  const travel = shotOf("fixed", "fixed.travel");
  const detail = shotOf("fixed", "fixed.detail");

  // arrive - the camera teaches while it travels instead of holding a title card
  travel.caption = { appearAtMs: 2200, style: "lower", titleKey: "fixed.travel.head" };
  travel.narrationKey = "narr.fixed.travel";
  Object.assign(travel, speech(6000));

  // look - closer than the old detail shot, nothing moving, no indicator
  const bones = derive(detail, {
    id: "fixed.bones",
    a11yKey: "a11y.fixed.bones",
    camera: { scale: 2.4, endScale: 2.2, elevation: 0.3, transitionMs: 1800 },
    overlays: { concepts: [] },
    caption: { appearAtMs: 700, style: "statement", titleKey: undefined, textKey: undefined, headOnly: undefined },
    narrationKey: "narr.fixed.bones",
    ...speech(6500),
  });
  bones.caption = { appearAtMs: 700, style: "lower", titleKey: "fixed.bones.head" };

  // movement - the indicator returns, and the point is that nothing moves
  const tryIt = derive(bones, {
    id: "fixed.try",
    a11yKey: "a11y.fixed.try",
    camera: { scale: 2.6, endScale: 2.4 },
    overlays: { concepts: ["fixed.skull"] },
    narrationKey: "narr.fixed.try",
    ...speech(6500),
  });
  tryIt.caption = { appearAtMs: 600, style: "lower", titleKey: "fixed.try.head" };

  // reason - the WHY, the beat this chapter never had
  const why = derive(bones, {
    id: "fixed.why",
    a11yKey: "a11y.fixed.why",
    camera: { scale: 2.2, endScale: 2.0, transitionMs: 1400 },
    narrationKey: "narr.fixed.why",
    ...speech(8000),
  });
  why.caption = { appearAtMs: 600, style: "lower", titleKey: "fixed.why.head" };

  // name - after the reason, not before it
  const name = derive(detail, {
    id: "fixed.name",
    a11yKey: "a11y.fixed.name",
    camera: { scale: 3.0, endScale: 2.8, transitionMs: 1400 },
    overlays: { concepts: [] },
    narrationKey: "narr.fixed.name",
    ...speech(6500),
  });
  name.caption = { appearAtMs: 500, style: "statement", textKey: "fixed.text" };

  // hand over
  const task = derive(detail, {
    id: "fixed.task",
    a11yKey: "a11y.fixed.task",
    camera: { scale: 4.0, endScale: 3.8, transitionMs: 1400 },
    overlays: { concepts: [] },
    narrationKey: "narr.fixed.task",
    ...speech(5000),
  });
  task.caption = { appearAtMs: 400, style: "lower", titleKey: "fixed.task.head" };

  c.shots = [travel, bones, tryIt, why, name, task];
  c.teaching = { arrive: "fixed.travel", look: "fixed.bones", movement: "fixed.try", reason: "fixed.why", name: "fixed.name", explore: "explore.fixed" };
}

// ------------------------------------------------------------------ chapter 04: pivot
{
  const c = chapter("pivot");
  const travel = shotOf("pivot", "pivot.travel");
  const bones = shotOf("pivot", "pivot.bones");
  const rotate = shotOf("pivot", "pivot.rotate");

  travel.caption = { appearAtMs: 2200, style: "lower", titleKey: "pivot.travel.head" };
  travel.narrationKey = "narr.pivot.travel";
  Object.assign(travel, speech(6000));

  bones.caption = { appearAtMs: 600, style: "lower", titleKey: "pivot.bones.head" };
  bones.narrationKey = "narr.pivot.bones";
  Object.assign(bones, speech(6500));

  rotate.caption = { appearAtMs: 600, style: "lower", titleKey: "pivot.rotate.head" };
  rotate.narrationKey = "narr.pivot.rotate";
  Object.assign(rotate, speech(7500));

  const why = derive(rotate, {
    id: "pivot.why",
    a11yKey: "a11y.pivot.why",
    camera: { scale: 3.0, endScale: 2.8, transitionMs: 1400 },
    narrationKey: "narr.pivot.why",
    ...speech(9000),
  });
  why.caption = { appearAtMs: 600, style: "lower", titleKey: "pivot.why.head" };

  const name = derive(rotate, {
    id: "pivot.name",
    a11yKey: "a11y.pivot.name",
    camera: { scale: 3.6, endScale: 3.4, transitionMs: 1400 },
    overlays: { concepts: [] },
    narrationKey: "narr.pivot.name",
    ...speech(6000),
  });
  name.caption = { appearAtMs: 500, style: "statement", textKey: "pivot.text" };

  const task = derive(rotate, {
    id: "pivot.task",
    a11yKey: "a11y.pivot.task",
    camera: { view: "frontRight", scale: 4.2, endScale: 4.0, elevation: 0.15, transitionMs: 1600 },
    overlays: { concepts: [] },
    narrationKey: "narr.pivot.task",
    ...speech(5000),
  });
  task.caption = { appearAtMs: 400, style: "lower", titleKey: "pivot.task.head" };

  c.shots = [travel, bones, rotate, why, name, task];
  c.teaching = { arrive: "pivot.travel", look: "pivot.bones", movement: "pivot.rotate", reason: "pivot.why", name: "pivot.name", explore: "explore.pivot" };
}

// ------------------------------------------------------------------ chapter 05: ball-and-socket
// Framing chosen by rendering ten candidates against this build (qa/visual/step16b/ball_trials): from the front at a
// raised elevation the rounded head of the upper-arm bone and the hollow beside it are both readable. The old framing
// (frontRight, scale 2.9) ran the humerus off the bottom of the frame while the sentence described the socket.
{
  const c = chapter("ball_socket");
  const travel = shotOf("ball_socket", "ball.travel");
  const shoulder = shotOf("ball_socket", "ball.shoulder");

  travel.caption = { appearAtMs: 2200, style: "lower", titleKey: "ball.travel.head" };
  travel.narrationKey = "narr.ball.travel";
  Object.assign(travel, speech(6000));

  const bones = derive(shoulder, {
    id: "ball.bones",
    a11yKey: "a11y.ball.bones",
    camera: { view: "front", scale: 2.0, endScale: 1.85, elevation: 0.4, transitionMs: 1800, compose: "right" },
    overlays: { concepts: [] },
    narrationKey: "narr.ball.bones",
    ...speech(8000),
  });
  bones.caption = { appearAtMs: 700, style: "lower", titleKey: "ball.bones.head" };

  const move = derive(shoulder, {
    id: "ball.move",
    a11yKey: "a11y.ball.move",
    camera: { view: "front", scale: 3.9, endScale: 3.6, elevation: 0.3, transitionMs: 1500, compose: "right" },
    overlays: { concepts: ["ball_socket.shoulder_right"] },
    narrationKey: "narr.ball.move",
    ...speech(7000),
  });
  move.caption = { appearAtMs: 600, style: "lower", titleKey: "ball.move.head" };

  const why = derive(bones, {
    id: "ball.why",
    a11yKey: "a11y.ball.why",
    camera: { view: "front", scale: 2.2, endScale: 2.0, elevation: 0.4, transitionMs: 1500 },
    narrationKey: "narr.ball.why",
    ...speech(9000),
  });
  why.caption = { appearAtMs: 600, style: "lower", titleKey: "ball.why.head" };

  const name = derive(move, {
    id: "ball.name",
    a11yKey: "a11y.ball.name",
    camera: { view: "front", scale: 3.2, endScale: 3.0, elevation: 0.3, transitionMs: 1400 },
    overlays: { concepts: [] },
    narrationKey: "narr.ball.name",
    ...speech(6000),
  });
  name.caption = { appearAtMs: 500, style: "statement", textKey: "ball.text.shoulder" };

  const task = derive(move, {
    id: "ball.task",
    a11yKey: "a11y.ball.task",
    camera: { view: "frontRight", scale: 3.9, endScale: 3.7, elevation: 0.2, transitionMs: 1500 },
    overlays: { concepts: [] },
    narrationKey: "narr.ball.task",
    ...speech(5000),
  });
  task.caption = { appearAtMs: 400, style: "lower", titleKey: "ball.task.head" };

  // ball.hip was an eight-second statement with no explanation, and the hip's classification is still PENDING EXPERT
  // CONFIRMATION - so it is removed rather than taught. Nothing asks a learner to classify the hip.
  c.shots = [travel, bones, move, why, name, task];
  c.teaching = { arrive: "ball.travel", look: "ball.bones", movement: "ball.move", reason: "ball.why", name: "ball.name", explore: "explore.ball" };
}

// ------------------------------------------------------------------ chapter 06: hinge keeps its sequence and gains the
// two beats the other three now have: why it bends only one way, and the naming that follows the reason.
{
  const c = chapter("hinge");
  const narration = {
    "hinge.travel": "narr.hinge.travel",
    "hinge.source": "narr.hinge.source",
    "hinge.bones": "narr.hinge.bones",
    "hinge.axis": "narr.hinge.axis",
    "hinge.flexion": "narr.hinge.flexion",
    "hinge.extension": "narr.hinge.extension",
    "hinge.support": "narr.hinge.support",
    "hinge.return": "narr.hinge.return",
    "hinge.knee": "narr.hinge.knee",
  };
  for (const [id, key] of Object.entries(narration)) {
    const s = shotOf("hinge", id);
    s.narrationKey = key;
    // the two learner-paced shots and the transition keep their authored length
    if (id !== "hinge.return") Object.assign(s, speech(Math.min(s.durationMs, 9500)));
  }
  const travel = shotOf("hinge", "hinge.travel");
  travel.caption = { appearAtMs: 2200, style: "lower", titleKey: "hinge.travel.head" };

  const axis = shotOf("hinge", "hinge.axis");
  const why = derive(axis, {
    id: "hinge.why",
    a11yKey: "a11y.hinge.why",
    camera: { scale: 1.45, endScale: 1.3, transitionMs: 1400 },
    narrationKey: "narr.hinge.why",
    ...speech(9500),
  });
  why.caption = { appearAtMs: 600, style: "lower", titleKey: "hinge.why.head" };

  const name = derive(axis, {
    id: "hinge.name",
    a11yKey: "a11y.hinge.name",
    camera: { scale: 1.2, endScale: 1.15, transitionMs: 1200 },
    narrationKey: "narr.hinge.name",
    ...speech(6000),
  });
  name.caption = { appearAtMs: 500, style: "lower", titleKey: "hinge.name.label" };

  const at = c.shots.findIndex((s) => s.id === "hinge.extension");
  c.shots.splice(at + 1, 0, why, name);
  c.teaching = { arrive: "hinge.travel", look: "hinge.bones", movement: "hinge.flexion", reason: "hinge.why", name: "hinge.name", explore: "explore.hinge" };
}

// ------------------------------------------------------------------ chapter 07: four readable moments, then a summary
{
  const c = chapter("compare");
  const pullback = shotOf("compare", "compare.pullback");
  pullback.narrationKey = "narr.compare.pullback";
  Object.assign(pullback, speech(6000));

  const framings = {
    "compare.fixed": { site: "fixed.skull", view: "right", scale: 2.7, endScale: 2.5, elevation: 0.3, head: "compare.fixed.label", narr: "narr.compare.fixed" },
    "compare.pivot": { site: "pivot.upper_neck", view: "backRight", scale: 2.4, endScale: 2.2, elevation: 0.05, head: "compare.pivot.label", narr: "narr.compare.pivot" },
    "compare.ball": { site: "ball_socket.shoulder_right", view: "front", scale: 2.6, endScale: 2.4, elevation: 0.35, head: "compare.ball.label", narr: "narr.compare.ball" },
    "compare.hinge": { site: "hinge.elbow_right", view: "right", scale: 3.2, endScale: 3.0, elevation: 0.1, head: "compare.hinge.label", narr: "narr.compare.hinge" },
  };
  for (const [id, f] of Object.entries(framings)) {
    const s = shotOf("compare", id);
    Object.assign(s.camera, { site: f.site, view: f.view, scale: f.scale, endScale: f.endScale, elevation: f.elevation, transitionMs: 1500 });
    s.caption = { appearAtMs: 500, style: "lower", titleKey: f.head };
    s.narrationKey = f.narr;
    Object.assign(s, speech(6500));
  }

  // The combined view is a summary, not the explanatory shot: four short labels, no indicators to squint at.
  const together = shotOf("compare", "compare.together");
  together.overlays.concepts = [];
  together.labels.sites = [
    { siteId: "fixed.skull", textKey: "recap.label.fixed" },
    { siteId: "pivot.upper_neck", textKey: "recap.label.pivot" },
    { siteId: "ball_socket.shoulder_right", textKey: "recap.label.ball" },
    { siteId: "hinge.elbow_right", textKey: "recap.label.hinge" },
  ];
  together.narrationKey = "narr.compare.together";
  Object.assign(together, speech(8000));
}

// ------------------------------------------------------------------ chapters 08 / 09
shotOf("recall", "recall.open").narrationKey = "narr.recall.open";
Object.assign(shotOf("recall", "recall.open"), speech(5000));
shotOf("body_map", "map.intro").narrationKey = "narr.map.intro";
{
  // The body map stays the memory anchor: labels, not a second teaching screen. Six indicators at 1.08x were not
  // readable, so the summary frame keeps its labels and drops them.
  const all = shotOf("body_map", "map.all");
  all.overlays.concepts = [];
  all.narrationKey = "narr.map.all";
  Object.assign(all, speech(9000));
}

// ------------------------------------------------------------------ explorations: a task each
const tasks = {
  "explore.fixed": { promptKey: "explore.fixed.task", doneKey: "explore.fixed.done", goal: { kind: "attempt" }, openAtShotId: "fixed.task" },
  "explore.pivot": { promptKey: "explore.pivot.task", doneKey: "explore.pivot.done", goal: { kind: "reach", primaryDeg: 40 }, openAtShotId: "pivot.task" },
  "explore.ball": { promptKey: "explore.ball.task", doneKey: "explore.ball.done", goal: { kind: "twoWay", primaryDeg: 25, secondaryDeg: 15 }, openAtShotId: "ball.task" },
  // The hinge chapter already hands the learner the validated elbow inside the film (hinge.try, then the 90 degree
  // check), so its exploration carries the same task without opening itself a second time.
  "explore.hinge": { promptKey: "explore.hinge.task", doneKey: "explore.hinge.done", goal: { kind: "reach", primaryDeg: 85 } },
};
for (const e of lesson.explores) {
  const t = tasks[e.exploreId];
  if (!t) continue;
  e.task = { promptKey: t.promptKey, doneKey: t.doneKey, goal: t.goal };
  if (t.openAtShotId) e.openAtShotId = t.openAtShotId;
}

// ------------------------------------------------------------------ normalise
// A speech-timed shot gets its real length from the narration build, which measures the clip. Until then it must at
// least honour its own visual floor, so the lesson is valid before the audio exists as well as after.
for (const c of lesson.chapters) for (const sh of c.shots) if (sh.durationFrom === "speech" && sh.minDurationMs) sh.durationMs = Math.max(sh.durationMs, sh.minDurationMs);

// ------------------------------------------------------------------ strings this step retires
// The hip beat is gone (its classification is still pending), the four comparison sentences became headlines plus
// spoken lines, and the travel shots no longer carry a chapter eyebrow.
for (const dead of ["ball.label.hip", "ball.text.hip", "compare.fixed", "compare.pivot", "compare.ball", "compare.hinge", "pivot.bones", "chapter.number.02", "chapter.number.03", "chapter.number.04", "chapter.number.05"]) delete locale.strings[dead];

// ------------------------------------------------------------------ write
const used = new Set();
const walk = (v) => {
  if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) (typeof x === "string" && /Key$/.test(k) ? used.add(x) : walk(x));
};
walk(lesson);
for (const k of ["ui.start_lesson", "ui.start_meta", "ui.start_sound", "ui.start_thesis", "ui.complete_title", "ui.complete_replay", "ui.complete_explore", "ui.complete_recall", "ui.task"]) used.add(k);
const orphans = Object.keys(locale.strings).filter((k) => !used.has(k) && !/^ui\./.test(k) && !/^a11y\./.test(k) && !/^note\./.test(k));

writeFileSync(LESSON, `${JSON.stringify(lesson, null, 1)}\n`);
writeFileSync(LOCALE, `${JSON.stringify(locale, null, 1)}\n`);

const shots = lesson.chapters.flatMap((c) => c.shots);
console.log(`chapters ${lesson.chapters.length}  shots ${shots.length}  strings ${Object.keys(locale.strings).length}`);
console.log(`speech-timed shots ${shots.filter((s) => s.durationFrom === "speech").length}  with narrationKey ${shots.filter((s) => s.narrationKey).length}`);
for (const c of lesson.chapters) console.log(`  ${c.number} ${c.id.padEnd(14)} ${c.shots.length} shots  ${(c.shots.reduce((a, s) => a + s.durationMs, 0) / 1000).toFixed(1)}s${c.teaching ? "  teaching declared" : ""}`);
if (orphans.length) console.log(`unused content strings: ${orphans.join(", ")}`);
