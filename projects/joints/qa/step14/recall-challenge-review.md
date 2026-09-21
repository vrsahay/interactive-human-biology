# Recall challenge review

## What it is now

Chapter **08 — Recall challenge**, a chapter of its own between the comparison and the body map.

`recall.open` says *"Your turn. Name each joint from the way it moves."* `recall.challenge` follows, and reaching it
**hands the film over**: the clock stops and the panel opens by itself. The learner does not have to notice a control.
(They can still start early from `recall.open`, and a learner who scrubs back into the chapter is offered it again.)

## The five questions

| # | Framed and highlighted | Asked | Answer | Revealed after answering |
|---|---|---|---|---|
| 1 | Frontal + right parietal bone | "These skull bones hardly move at all." | Fixed | "Fixed: the bones hold firm, so there is little or no movement." |
| 2 | Atlas + axis | "The head turns around the bone below it." | Pivot | "Pivot: one bone rotates around another." |
| 3 | Humerus + scapula | "The arm moves in many directions." | Ball-and-socket | "Ball-and-socket: the rounded end sits in a socket, so it moves many ways." |
| 4 | Humerus + radius + ulna | "This joint bends and straightens in one direction." | Hinge | "Hinge: it bends and straightens in one main direction." |
| 5 | Femur, tibia, fibula, patella, menisci | "This joint in the leg bends and straightens one way." | Hinge | "Hinge: the knee bends and straightens, like the elbow." |

The fifth question is new in 14B and is doing a specific job: two different joints with the **same** answer. A learner who
has been memorising "elbow = hinge" has to notice that the category is about the movement, not the location.

The hip is deliberately **not** used as a question. Its ball-and-socket classification is still
`PENDING EXPERT CONFIRMATION` from Step 13 — no reachable NCERT source states it — and a question would assert it.

## The rules it follows

- **Movement first, name second.** Every question describes only what the joint does. A test asserts that no question
  contains the words fixed, pivot, ball-and-socket or hinge: the category is the learner's to supply.
- **Nothing on screen gives it away.** Site labels are cleared, concept indicators are off, the joint asset is hidden.
  Each question frames its own joint and highlights only the bones in question.
- **A wrong answer is not a score.** *"Not that one. Look at how it moves."* The sequence does not advance, the right
  option stays enabled, and the learner tries again. Only a correct answer locks the options and reveals **Next**.
- **Right and wrong are not colour alone.** A ✓ glyph on the chosen-correct option, a ✕ and a dashed border on a wrong
  one, and an `aria-live` status line. (WCAG 1.4.1.)
- **Keyboard-native.** Ordinary buttons, ≥ 44 px, in a labelled group; Escape leaves.
- **Spoken.** Each question, each correction and each reveal has its own narration clip, played the moment the learner
  causes it. Before this step the whole sequence was silent.
- **The film clock never moves while it is open**, and no recall state can survive leaving the chapter — a skull question
  can never be left hanging over the pivot chapter.

## How it ends

Answering the fifth question speaks *"You named every joint from the way it moves."*, closes the panel, seeks to chapter
09 and resumes playback. **The body map is the reward for having recalled, not the thing that teaches.**

Leaving early — Escape, or *Return to the lesson* — does the same thing without the congratulation: the film carries on
into the body map rather than stranding the learner on a paused frame.

## Wording provenance

All question, reveal, correction and completion strings are `draft-enrichment` and carry the DRAFT badge. The four option
labels reuse the existing figure-reference category names. Nothing here states a relationship the lesson has not already
taught: little or no movement, rotation, many directions, one direction.

## Verified

- `tests/e2e/step14-recall.spec.ts` — five steps in order, the category never given away, revealed only after an answer;
  wrong-answer handling; non-colour signalling; the body map arriving after the recall.
- `tests/e2e/step14b-lesson.spec.ts` — recall is its own chapter, the body map is the chapter after it, reaching the
  challenge shot opens the panel and stops the clock, and finishing lands the learner in `body_map` with no recall state
  left behind.
- `tests/e2e/step14-responsive.spec.ts` — Escape ends it and lets the film run on; leaving the chapter ends it without
  starting playback for the learner; the panel clears the controls at 390 and 412 px.
- `tests/e2e/step14-a11y.spec.ts` — axe with the panel open, question state and answered state, at both widths.
