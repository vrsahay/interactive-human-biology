// Step 16B: widen the lesson schema for the teaching-depth pass.
//   - a shot may carry a spoken explanation (narrationKey) separate from its headline caption
//   - a shot may declare that its length comes from that speech, with a visual floor
//   - a category chapter declares the teaching shape it follows
//   - an exploration may carry a learner task and the shot that hands over to it
import { readFileSync, writeFileSync } from "node:fs";
const P = "content/schemas/video-lesson.schema.json";
const s = JSON.parse(readFileSync(P, "utf8"));

const shot = s.definitions.shot.properties;
shot.narrationKey = { $ref: "#/definitions/textKey", description: "Spoken explanation for this shot: what is being looked at, what is happening and why it matters. An ordinary locale string with a provenance class. When absent the caption is spoken." };
shot.durationFrom = { enum: ["authored", "speech"], description: "\"speech\" lets the narration build write durationMs from the measured clip plus a floor, so a teaching beat never ends mid-sentence and never holds a dead frame." };
shot.minDurationMs = { type: "number", minimum: 1000, maximum: 60000, description: "Visual floor for a speech-timed shot." };

s.definitions.chapter.properties.teaching = {
  type: "object",
  additionalProperties: false,
  description: "The teaching shape a category chapter follows: arrive, look, movement, reason, name, explore. Declared as content so a category cannot quietly fall back to being introduced rather than taught.",
  required: ["arrive", "look", "movement", "reason", "name", "explore"],
  properties: {
    arrive: { type: "string" },
    look: { type: "string" },
    movement: { type: "string" },
    reason: { type: "string" },
    name: { type: "string" },
    explore: { type: "string" },
  },
};

const ex = s.properties.explores.items.properties;
ex.openAtShotId = { type: "string", description: "Reaching this shot hands the film over to the exploration." };
ex.task = {
  type: "object",
  additionalProperties: false,
  description: "The one thing the learner is asked to do here. Without it an exploration is movement with no purpose.",
  required: ["promptKey", "doneKey", "goal"],
  properties: {
    promptKey: { $ref: "#/definitions/textKey" },
    doneKey: { $ref: "#/definitions/textKey" },
    goal: {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: {
        kind: { enum: ["attempt", "reach", "twoWay"] },
        primaryDeg: { type: "number", exclusiveMinimum: 0, maximum: 180 },
        secondaryDeg: { type: "number", exclusiveMinimum: 0, maximum: 180 },
      },
    },
  },
};

writeFileSync(P, `${JSON.stringify(s, null, 1)}\n`);
console.log("schema patched");
