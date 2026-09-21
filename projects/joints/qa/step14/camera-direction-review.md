# Camera direction review

One rule governs every framing in this lesson: **at every moment the learner must be able to say what they are looking
at.** A shot either establishes where something is, or looks closely at it, or shows how it moves — never a bit of each.

The camera is declarative, not animated: a shot names a preset (`body`, `site`, `closeUp`, `focus`, `movement`), a view, a
start scale and an end scale. A smaller scale is closer. `transitionMs` is how long the travel from the previous framing
takes; `0` is a cut. Seeking always cuts, and reduced motion holds the authored end framing, so no learner is ever moved
through a dolly they did not ask for.

## Purpose, chapter by chapter

| # | Chapter | Camera purpose | How it is done |
|---|---|---|---|
| 01 | hook | Put a question in the learner's own body. | Title on the whole skeleton (`front`, 1.30 → 1.12), then **shoulder** (`frontRight`, 3.9 → 3.5, composed left) and **elbow** (`right`, 5.4 → 4.8, composed right) — deliberately opposite compositions, so the two joints read as a contrast and not as a sequence. Then back out to the whole body with both indicators still running. |
| 02 | what is a joint? | Answer it by looking closely, then widening. | The elbow from the **front** (4.3 → 3.9) — the same joint the hook ended on, but a new angle, so it reads as a new idea rather than a repeat. Then the whole body with three indicators, then the existing joint map. |
| 03 | fixed | Whole body → skull → close-up. | `fixed.travel` arrives at the skull over 3.4 s; `fixed.detail` turns to a `right` profile at 3.1 → 2.8 with a 0.35 downward elevation, which is the angle that shows a suture. |
| 04 | pivot | Whole body → neck → close-up from behind and above. | `backRight` with elevation 0.2, then 0.6 — you cannot see the atlas turning on the axis from the front. |
| 05 | ball-and-socket | Whole body → shoulder → close-up, then the hip. | `frontRight` throughout, pushing 3.8 → 2.6; the hip repeats the angle so the two examples are visibly the same kind of joint. |
| 06 | hinge | Whole body → elbow → the validated asset. | The only chapter that leaves the body: after `hinge.source` the camera switches to the joint asset's own presets — `focus` on the bones, `closeUp` on the fitted axis, `movement` (locked on the axis) for flexion, extension, the free try and the check, `closeUp` for the capsule, `focus` to return, then back out to the body for the knee. |
| 07 | compare | Pull back, then reveal one pattern at a time. | `compare.pullback` is a 4 s travel to the whole body with **nothing named**. Then four site framings in the top-to-bottom order the lesson taught them, each with one indicator and one label. `compare.together` returns to the whole body with all four. |
| 08 | recall | Controlled framing per question, chosen by the learner's progress. | The chapter's own shots hold a calm whole-body composition; once the panel opens, **each question frames its own joint** (`presentRecallStep` uses the step's site, view and scale) so the learner is looking at exactly the joint they are being asked about, and nothing else is labelled. |
| 09 | body map | One picture, filling in. | `map.intro` establishes the skeleton inside the body shell (`front`, 1.20 → 1.12). The four naming beats are a **single continuous push-in** — 1.140 → 1.115 → 1.090 → 1.065 → 1.040 with elevation drifting 0.02 → 0.065 and a 1.4 s travel each — so the four names read as one slow move over one picture rather than four cuts to the same frame. `map.all` settles to `front` 1.08 → 1.04 with every label and indicator. |

## Rules the direction follows

- **No random motion.** Every shot's start and end framing is authored. The only in-shot movement is the authored dolly
  between them, eased, and it is switched off entirely under reduced motion.
- **A travel always starts from where the camera actually is.** A cut is an explicit choice (`transitionMs: 0`), used
  once — between `hinge.flexion` and `hinge.extension`, which are the same framing.
- **Consecutive chapters never open on the same framing.** A test asserts it, comparing the real camera position and
  target after seeking to each chapter.
- **The lesson visits five distinct subjects**: the whole body and the four joint sites. The same test asserts that too,
  so a future chapter cannot quietly become another whole-body caption card.
- **A site framing may never be wider than the close-up sphere the body delivery guarantees around that site**, or the
  shot would frame low-detail geometry. The delivery manifest is frozen, so the framings were brought to it: `hook.shoulder`
  came in from 9.5 to 3.9, `compare.pivot` from 6.5 to 4.2, `compare.ball` from 8.5 to 3.9, and the "three joints at once"
  beat became a whole-body shot instead of a wide site framing. A unit test enforces this for every shot.
- **Composition follows the caption.** On wide layouts the subject is pushed left or right so the caption has room; on
  narrow layouts the shift is dropped and the subject is lifted above the stacked panels instead.

## What was not re-authored

The four joint chapters (03–06) keep Step 13's camera direction exactly. It was already doing the job the brief asks for
— locate, approach, look closely, watch it move — and re-cutting validated shots would have risked the one thing in this
product that is validated for no teaching gain.
