// Step 14B: the new learner-facing lines, and the a11y descriptions for the new shots.
//
// Provenance discipline (unchanged from Step 13): nothing here asserts anything the lesson did not already teach. Every
// teaching line is `draft-enrichment` and carries the DRAFT badge; chapter titles and screen-reader descriptions are `ui`.
// No line is attributed to NCERT.
import { readFileSync, writeFileSync } from "node:fs";

const LOCALE = "content/locales/en/hinge-elbow.json";
const locale = JSON.parse(readFileSync(LOCALE, "utf8"));

/** Learner-facing teaching lines. Short sentences, no anatomical terminology that the lesson has not introduced. */
const DRAFT = {
  // 01 hook - a question the learner can test on their own body, before any category name
  "hook.shoulder": "Your shoulder can swing your arm in almost any direction.",
  "hook.elbow": "Your elbow mainly bends and straightens.",
  "hook.question": "Both are joints. So why do they move so differently?",
  // 02 what is a joint - shown, not defined
  "concept.meet": "A joint is a place where two bones meet.",
  "concept.different": "The way the bones meet decides how they can move.",
  // 07 compare - one movement pattern at a time, then all four
  "compare.intro": "Four joints. Four different ways of moving.",
  "compare.fixed": "Fixed: almost no movement at all.",
  "compare.pivot": "Pivot: turning around the bone below.",
  "compare.ball": "Ball-and-socket: movement in many directions.",
  "compare.hinge": "Hinge: bending and straightening one way.",
  "compare.together": "The type of joint tells you the pattern of movement.",
  // 08 recall challenge
  "recall.open": "Your turn. Name each joint from the way it moves.",
  "recall.start_hint": "Choose the joint type for each movement.",
  "recall.q.knee": "This joint in the leg bends and straightens one way.",
  "recall.a.knee": "Hinge: the knee bends and straightens, like the elbow.",
  // 09 final body map
  "map.intro": "Here they are, together, in one body.",
  "map.fixed": "Fixed joints hold the skull bones together.",
  "map.pivot": "A pivot joint at the top of the neck turns the head.",
  "map.ball": "A ball-and-socket joint at the shoulder moves many ways.",
  "map.hinge": "A hinge joint at the elbow bends and straightens.",
};

/** Chapter titles and the screen-reader description of every new shot. */
const UI = {
  "chapter.hook": "Two joints, two movements",
  "chapter.what_is_joint": "What is a joint?",
  "chapter.compare": "Comparing the four",
  "chapter.recall": "Recall challenge",
  "chapter.body_map": "The body map",

  "a11y.hook.shoulder": "The right shoulder, seen from the front and right. Curved arrows around the top of the upper arm bone show movement in many directions.",
  "a11y.hook.elbow": "The right elbow, seen from the side. An arc shows the forearm bending in one direction.",
  "a11y.hook.question": "The whole skeleton, with the shoulder and elbow indicators still moving.",
  "a11y.concept.meet": "Close view of the right elbow, where the upper arm bone meets the two forearm bones.",
  "a11y.concept.different": "The head, the top of the neck and the right shoulder together, each with its own movement indicator.",
  "a11y.compare.pullback": "The camera pulls back to the whole body.",
  "a11y.compare.fixed": "The skull, with the fixed-joint indicator, labelled Fixed.",
  "a11y.compare.pivot": "The top of the neck, with the turning indicator, labelled Pivot.",
  "a11y.compare.ball": "The right shoulder, with the many-directions indicator, labelled Ball and socket.",
  "a11y.compare.hinge": "The right elbow, with the bending indicator, labelled Hinge.",
  "a11y.compare.together": "The whole body with all four movement indicators running at once.",
  "a11y.recall.open": "The whole body, with no labels.",
  "a11y.recall.challenge": "The whole body. The recall questions begin.",
  "a11y.map.intro": "The whole skeleton inside a faint outline of the body.",
  "a11y.map.fixed": "The whole body with the skull labelled Fixed.",
  "a11y.map.pivot": "The whole body with the top of the neck labelled Pivot.",
  "a11y.map.ball": "The whole body with the right shoulder labelled Ball and socket.",
  "a11y.map.hinge": "The whole body with the right elbow labelled Hinge.",
  "a11y.hinge.check": "Close-up of the elbow with its angle shown, ready to be bent to about 90 degrees.",
  "a11y.map.all": "All four kinds of movement indicator are shown on the body at once, with every site labelled.",
};

/** Lines that changed because the beat around them changed. */
const REWRITTEN = {
  // the map now closes "what is a joint?" instead of opening the lesson, so it hands over to the four categories
  "intro.where": "You have joints like these all over your body. We will look at four kinds.",
};

let added = 0;
let changed = 0;
for (const [k, text] of Object.entries(DRAFT)) {
  if (!locale.strings[k]) added++;
  locale.strings[k] = { text, provenance: "draft-enrichment" };
}
for (const [k, text] of Object.entries(UI)) {
  if (!locale.strings[k]) added++;
  locale.strings[k] = { text, provenance: "ui" };
}
for (const [k, text] of Object.entries(REWRITTEN)) {
  if (!locale.strings[k]) throw new Error(`rewriting a string that does not exist: ${k}`);
  if (locale.strings[k].provenance !== "draft-enrichment") throw new Error(`refusing to rewrite non-draft string ${k}`);
  locale.strings[k].text = text;
  changed++;
}

// chapter.intro / chapter.recap named chapters that no longer exist
for (const k of ["chapter.intro", "chapter.recap"]) delete locale.strings[k];

writeFileSync(LOCALE, JSON.stringify(locale, null, 1) + "\n");
console.log(`+${added} strings, ${changed} rewritten, ${Object.keys(locale.strings).length} total`);
