// Step 16D - learner polish, content side.
//
// Removes narration that repeats itself or repeats the caption, and restores the Step-16B two-layer split on the beats
// where it had collapsed (headline and spoken line word for word identical). Every changed line stays
// draft-enrichment; nothing is promoted, nothing is relabelled. See qa/step16d/content-change-log.md.
//
//   node qa/step16d/apply_learner_polish.mjs
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "content/lessons/hinge-elbow.json";
const LOCALE = "content/locales/en/hinge-elbow.json";
const lesson = JSON.parse(readFileSync(LESSON, "utf8"));
const locale = JSON.parse(readFileSync(LOCALE, "utf8"));
const D = "draft-enrichment";
const F = "figure-reference";
const set = (key, text, provenance) => {
  locale.strings[key] = { text, provenance: provenance ?? locale.strings[key]?.provenance ?? D };
};
const shot = (id) => lesson.chapters.flatMap((c) => c.shots).find((s) => s.id === id);

// ------------------------------------------------------------------ 1. repetition inside a single spoken line

// "Your turn: bend and straighten the elbow. Drag the forearm to bend the elbow."
// The prompt repeated the caption instead of adding the one thing the caption does not say: how to do it.
set("hinge.try_prompt", "Drag the forearm, or use the slider.");

// "Watch the join itself. Nothing slides and nothing bends. These two bones stay exactly where they are."
// The third sentence restated the second.
set("narr.fixed.try", "Watch the join itself. Nothing slides, nothing bends, nothing shifts at all.");

// ------------------------------------------------------------------ 2. near-duplicates across the lesson

// hook.shoulder already said "swing forward, out to the side, and round in a circle" two and a half minutes earlier.
// The shoulder chapter should add the reason the hook could not give, not repeat the hook's words.
set("narr.ball.move", "That one joint gives the arm more freedom than any other in the body: forward, backwards, out sideways, and right round.");

// ------------------------------------------------------------------ 3. the third summary pass
// map.fixed/pivot/ball/hinge name all four, one at a time, and then map.all named all four again five seconds later.
// The caption already shows that list. The closing line now carries the lesson's point instead of re-reading it.
set("narr.map.all", "Four joins, four shapes, four kinds of movement. The shape of the join is what decides.");

// ------------------------------------------------------------------ 4. beats where the headline and the spoken line
// were word for word identical, so the learner read and heard exactly the same sentence.

// The body map: the caption becomes the label it is pointing at, the spoken line keeps the sentence.
const mapLines = {
  "map.fixed.label": ["Fixed · skull", "Fixed joints hold the skull bones together."],
  "map.pivot.label": ["Pivot · top of the neck", "A pivot joint at the top of the neck turns the head."],
  "map.ball.label": ["Ball and socket · shoulder", "A ball-and-socket joint at the shoulder moves many ways."],
  "map.hinge.label": ["Hinge · elbow", "A hinge joint at the elbow bends and straightens."],
};
for (const [key, [head, spoken]] of Object.entries(mapLines)) {
  const id = key.replace(/.label$/, "");
  set(key, head, F);
  set(`narr.${id}`, spoken, D);
  const s = shot(id);
  s.caption.textKey = key;
  s.narrationKey = `narr.${id}`;
}

// The elbow's "look" beat: the caption names what is on screen, the spoken line explains it.
set("hinge.bones", "Three bones meet here");

// ------------------------------------------------------------------ write
writeFileSync(LESSON, `${JSON.stringify(lesson, null, 1)}\n`);
writeFileSync(LOCALE, `${JSON.stringify(locale, null, 1)}\n`);

const shots = lesson.chapters.flatMap((c) => c.shots);
console.log(`shots ${shots.length}  strings ${Object.keys(locale.strings).length}  with narrationKey ${shots.filter((s) => s.narrationKey).length}`);
for (const id of [...Object.keys(mapLines), "hinge.bones", "hinge.try", "fixed.try", "ball.move", "map.all"]) {
  const s = shot(id);
  console.log(`  ${id.padEnd(12)} head "${locale.strings[s.caption.titleKey ?? s.caption.textKey]?.text ?? ""}"  narr "${locale.strings[s.narrationKey ?? ""]?.text?.slice(0, 60) ?? ""}"`);
}
