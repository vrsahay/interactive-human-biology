# Recap review — from labelled diagram to retrieval

## What it was

`recap.pullback` → `recap.compare` → `recap.check`. The compare shot named all four categories in one line and put six
labels on the body; the check asked the learner to bend the elbow to 90°. Everything about the four categories was
*given*: the learner read a map and moved on. Nothing asked them to produce the association between a movement and a name,
which is the one thing the lesson exists to teach.

## What it is now

A four-step retrieval sequence, offered in the recap chapter by **"Choose the joint type"**:

| Step | Shown (highlighted, framed, unlabelled) | Asked | Answer | Revealed after answering |
|---|---|---|---|---|
| 1 | Frontal + right parietal bone | "These skull bones hardly move at all." | Fixed | "Fixed: the bones hold firm, so there is little or no movement." |
| 2 | Atlas + axis, head above them | "The head turns around the bone below it." | Pivot | "Pivot: one bone rotates around another." |
| 3 | Humerus + scapula | "The arm moves in many directions." | Ball-and-socket | "Ball-and-socket: the rounded end sits in a socket, so it moves many ways." |
| 4 | Humerus + radius + ulna | "This joint bends and straightens in one direction." | Hinge | "Hinge: it bends and straightens in one main direction." |

Then the full body map returns as the closing visual — the conclusion of the recall, not the substitute for it.

## The rules it follows

- **Movement first, name second.** Each question describes what the joint *does*. A test asserts that no question contains
  the words fixed, pivot, ball-and-socket or hinge: the category is the learner's to supply.
- **The site labels are off during the questions.** The answer cannot be read off the screen.
- **A wrong answer is not a score.** "Not that one. Look at how it moves." The sequence does not advance, the right option
  stays available, and the learner tries again. Only after a correct answer do the options lock and **Next** appear.
- **Right and wrong are not colour alone.** The chosen-correct option gets a ✓ glyph, a wrong one a ✕ and a dashed border,
  and the feedback line is an `aria-live` status. (WCAG 1.4.1.)
- **Answering is keyboard-native.** The options are ordinary buttons, ≥44 px, in a labelled group.
- **The lesson is untouched.** Retrieval runs over the paused recap shot; leaving it re-applies the shot. The film clock
  never moves.

## Wording provenance

All sixteen new strings are `draft-enrichment` (badged DRAFT) except the four option labels, which reuse the existing
figure-reference category names (`recap.label.fixed` etc.). No new curriculum claim was introduced: every reveal restates
the relationship the lesson already teaches — little/no movement, rotation, many directions, one direction.

## Verified

`tests/e2e/step14-recall.spec.ts` — 4 tests: the four-step sequence with the category never given away and revealed only
after an answer; wrong-answer handling; non-colour signalling; and the closing body map. Captures in
`qa/visual/step14/recall_*.png`. 0 console errors.

## Gaps

- The retrieval lives **inside the existing recap chapter**, not as the separate `08 Recall / 09 Final body map` chapters
  the brief describes.
- It is entered from a control rather than flowing automatically out of the recap playback.
- There is no narration for the questions or reveals.
- It is offered by a control in the player row; on a phone that row wraps to two lines in the recap chapter, which is
  now allowed for explicitly rather than overlapping the panels above it (see `regression-report.md`).
- The questions are text about movement; the brief also invites *showing* the movement again in the question (for example
  replaying the teaching simulation behind the prompt). Not implemented.
