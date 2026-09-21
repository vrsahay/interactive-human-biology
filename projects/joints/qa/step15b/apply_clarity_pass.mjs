// Step 15B: the five learner-clarity fixes, applied to content only.
//
// Authoring script, kept as the record of exactly what changed and why. It touches the lesson and the locale. It does not
// touch the validated elbow rig, its manifest, its geometry, or any Blender or production asset.
//
//   node qa/step15b/apply_clarity_pass.mjs
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "content/lessons/hinge-elbow.json";
const LOCALE = "content/locales/en/hinge-elbow.json";
const lesson = JSON.parse(readFileSync(LESSON, "utf8"));
const locale = JSON.parse(readFileSync(LOCALE, "utf8"));

const byId = new Map();
for (const c of lesson.chapters) for (const s of c.shots) byId.set(s.id, s);
const before = {
  schematicNotes: lesson.chapters.flatMap((c) => c.shots).filter((s) => s.caption.noteKey === "note.schematic_indicator").length,
  recapNotes: lesson.chapters.flatMap((c) => c.shots).filter((s) => s.caption.noteKey === "note.recap_schematic").length,
};

const setString = (key, text, provenance) => {
  locale.strings[key] = { text, provenance };
};

// ---------------------------------------------------------------------------- FIX 1
// The same technical disclaimer sat under 15 captions, and a second one under 4 more. It is honest and it is for a
// reviewer, not for a Class 10 learner: "schematic indicator" is not a word they have, and being told repeatedly that
// what they are watching is not animated invites the question "then what am I looking at?".
//
// The information does not go away. It moves to two places that state it once:
//   - a compact persistent status on the stage, shown for as long as indicators are on screen (FilmShell);
//   - the Sources & draft status dialog, which keeps the full technical wording for a teacher or reviewer.
// Both note strings stay in the locale and stay in the expert package.
let cleared = 0;
for (const c of lesson.chapters) {
  for (const s of c.shots) {
    if (s.caption.noteKey === "note.schematic_indicator" || s.caption.noteKey === "note.recap_schematic") {
      delete s.caption.noteKey;
      cleared++;
    }
  }
}
// The persistent status, and the plain-language version of the same fact for the Explore panel.
setString("ui.teaching_view", "Teaching view: the moving marks show the kind of movement.", "ui");
setString("ui.explore_status_teaching", "Teaching simulation", "ui");
setString("ui.explore_status_validated", "3D joint model", "ui");
setString("ui.explore_teaching_note", "This shows the movement pattern. The bones are real; the movement is a demonstration.", "ui");
// Kept, reworded out of reviewer language: it is a one-off clarification about a specific thing on screen.
setString("hinge.bands_note", "The thin coloured lines mark where the ligaments run. They are a guide, not real tissue.", "draft-enrichment");

// ---------------------------------------------------------------------------- FIX 2
// Three unfamiliar names at once, in a lesson that says "upper arm bone" thirty seconds earlier. The body relationship
// comes first; the names stay on the labels that are already on screen in that shot (humerus, radius, ulna).
setString("hinge.bones", "The elbow is where the upper-arm bone meets two bones in the forearm.", "draft-enrichment");

// ---------------------------------------------------------------------------- FIX 3
// "Axis" was used twice before it was ever explained. The pivot chapter no longer needs the word (see fix 4), so the
// term is introduced once, in the shot that shows the blue line: show the line, say what it does, then name it.
setString("hinge.axis", "This blue line shows the direction the elbow bends around. We call that line the axis.", "draft-enrichment");
delete byId.get("hinge.axis").caption.noteKey; // "the hinge axis fitted to this 3D model" moves to the sources dialog

// ---------------------------------------------------------------------------- FIX 4
// The pivot was the weakest example: you saw a head turn, which looks like a head on a stick. The chapter now shows the
// two bones on their own first, so the learner can see one sitting on the other, and only then turns the upper one.
// No new rig: the rotation is the existing group-driven teaching simulation.
setString("pivot.bones", "At the top of the neck, one small bone sits on top of another.", "draft-enrichment");
setString("pivot.text", "The upper bone turns around the one below it - and your head turns with it.", "draft-enrichment");
setString("a11y.pivot.bones", "Close view of the first two neck bones, seen from the front and right. They are highlighted; the skull is dimmed behind them.", "ui");

const pivot = lesson.chapters.find((c) => c.id === "pivot");
const travel = pivot.shots[0];
const rotate = pivot.shots[1];
if (!pivot.shots.some((s) => s.id === "pivot.bones")) {
  const bones = structuredClone(rotate);
  bones.id = "pivot.bones";
  bones.a11yKey = "a11y.pivot.bones";
  bones.durationMs = 6000;
  // closer, from the front-right and level, so the two bones read as two objects rather than as the base of a skull
  bones.camera = { transitionMs: 2200, preset: "site", site: "pivot.upper_neck", view: "frontRight", scale: 2.3, endScale: 2.0, compose: "right", elevation: 0.15 };
  bones.overlays = { ...bones.overlays, concepts: [] }; // nothing moves yet: this beat is "look at the two bones"
  bones.labels = { ...bones.labels, sites: [] };
  bones.caption = { appearAtMs: 700, style: "statement", textKey: "pivot.bones" };
  pivot.shots.splice(1, 0, bones);
}
// and the rotation beat pulls back a little so the head is in frame while the two bones stay legible
rotate.camera = { transitionMs: 1800, preset: "site", site: "pivot.upper_neck", view: "frontRight", scale: 3.6, endScale: 3.3, compose: "right", elevation: 0.3 };
travel.camera = { ...travel.camera, view: "frontRight" };

// ---------------------------------------------------------------------------- FIX 5
// The terms were dropped in and never used again. They are now tied to the action that earns them, and reused once in
// the exploration where the learner performs both.
setString("hinge.flexion", "When the elbow bends, that is called flexion.", "draft-enrichment");
setString("hinge.extension", "When it straightens again, that is called extension.", "draft-enrichment");
setString("explore.hinge.explanation", "Bending is flexion. Straightening is extension. A hinge joint does both, in one direction.", "draft-enrichment");

// ---------------------------------------------------------------------------- the 5.5 s silence at 3:04
// Root cause, from the shot itself: `hinge.return` is a deliberate transition - the camera moves for 1.5 s and the elbow
// animates back to its resting pose between 0.9 s and 4.2 s - but it carries no caption at all. No caption means no
// narration clip, so the beat is silent, and its last 1.3 s is a completely static frame. It reads as a stall.
// It stays a transition. It now says what it is doing (which also gives it a narration clip), and the dead tail after
// the motion ends is trimmed rather than the beat being cut short.
setString("hinge.return", "The elbow settles back to rest.", "draft-enrichment");
const ret = byId.get("hinge.return");
ret.durationMs = 4600; // motion ends at 4200 ms; 400 ms to settle, instead of 1300 ms of nothing
ret.caption = { appearAtMs: 300, style: "lower", textKey: "hinge.return" };

writeFileSync(LESSON, JSON.stringify(lesson, null, 1) + "\n");
writeFileSync(LOCALE, JSON.stringify(locale, null, 1) + "\n");

const shots = lesson.chapters.flatMap((c) => c.shots);
console.log(`captions carrying a technical disclaimer: ${before.schematicNotes + before.recapNotes} -> ${shots.filter((s) => s.caption.noteKey === "note.schematic_indicator" || s.caption.noteKey === "note.recap_schematic").length} (cleared ${cleared})`);
console.log(`notes remaining on shots: ${shots.filter((s) => s.caption.noteKey).map((s) => `${s.id} (${s.caption.noteKey})`).join(", ")}`);
console.log(`shots: ${shots.length}, duration ${Math.round(shots.reduce((a, s) => a + s.durationMs, 0) / 1000)} s`);
console.log(`silent shots: ${shots.filter((s) => !s.caption.textKey && !s.caption.titleKey).map((s) => s.id).join(", ") || "none"}`);
