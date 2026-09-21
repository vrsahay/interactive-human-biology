# Interaction comparison

---

## 1. Inventory

| Interaction | Reference | Ours |
|---|---|---|
| Start gesture | **Start lesson** button on a landing card | none — the film autoplays |
| Play / pause | yes (button, `Space`) | yes (button, `Space`) |
| Seek | 13-tick segmented scrubber, click to jump | 10-segment progress bar + **9 chapter buttons** |
| Previous scene | yes | via chapter buttons |
| Replay current scene | yes (`R`) | yes |
| Mute | yes (`M`) | narration on/off toggle |
| Fullscreen | yes (`F`) | yes |
| Manipulate the model | **no** | **yes — drag the forearm, or the slider, 0–145°** |
| Orbit the model | in Explore only | any time, via Explore |
| Select a part | in Explore: click the model or the list | **no** |
| Search | in Explore: filter 31 parts | **no** |
| Guided task with a pass condition | **no** | **yes — `hinge.check`, bend to 90° ± 5° held 600 ms, *Check my pose*** |
| Assessment | **no** | **yes — 5-question recall challenge** |
| Completion state | **Lesson Complete** card with Replay / Explore | none |
| Keyboard control of the subject | no (`canvas` is `tabindex="-1"`) | yes (arrow keys in an exploration, `R` reset, `Escape` return) |

---

## 2. When interaction happens

**Reference:** never during the lesson. The 168 s are uninterrupted. Interaction is offered before (landing
card) and after (end card). This is a coherent decision: the lesson is a film, and films are not paused for
exercises.

**Ours:** twice inside chapter 06, at 2:41 and 2:55 — 96 % of the way through the passive material and 58 % of
the way through the lesson. Before that point the learner has watched 161 s and done nothing. The Explore
button is available throughout but nothing ever invites its use.

The asymmetry inside our own lesson is the notable part: **the elbow is participatory and the other three
categories are not.** A learner who has just bent an elbow and been told they were right, then watches an
orange arc appear at a hip for 8 s, will register the difference.

---

## 3. Quality of what we have

### `hinge.try` and `hinge.check` — the best interaction in either product
The learner is told what to do, does it on a real constrained joint, and is told whether it worked. Step 15B
added a 1600 ms hold so the confirmation can be read before the film moves on. Nothing in the reference comes
near this.

Two costs, both visible in the capture `06_hinge__hinge.check.png`:
- the camera is at the `movement` preset, in which the forearm crosses the ribcage and the elbow is a small
  feature near the centre of a vertical stick — the worst view of the elbow in the chapter, used for the shot
  that asks the learner to act on it;
- the flexion panel occupies the right third of the frame.

### The recall challenge — the best assessment in either product
Five questions, each describing a *movement* rather than naming a structure ("These skull bones hardly move at
all"), with the four category names as options, and the camera framing the relevant site behind the panel.
This tests classification from behaviour, which is the actual skill the lesson teaches. Wrong answers are
handled (`recall_1_wrong.png`).

Costs: the panel covers the lower half of the subject it is asking about; the whole challenge is 11 s of
declared film time in chapter 08, so its real duration is entirely learner-paced and invisible on the
progress bar.

### Free-orbit Explore in the five non-joint chapters
An interaction with no content behind it. See `explore-comparison.md` §3.

---

## 4. What the reference's restraint buys, and what it costs

**Buys:** a learner never has to decide anything for 168 s. There is no moment of "am I supposed to do
something here?". Attention is never split between watching and operating.

**Costs:** the learner is a spectator. Nothing is retrieved, nothing is produced, nothing is checked. A week
later, the reference has given them one vivid fact (eighty square metres) and a sequence; ours has given them
five retrieval events and a motor memory of bending an elbow.

Retrieval practice and generation effects are the strongest tools we have and the reference does not use them
at all. **This is the clearest category in which our product is ahead, and it should not be traded away for
calm.**

---

## 5. Keyboard and assistive interaction

| | Reference | Ours |
|---|---|---|
| `lang` | `en` | `en` |
| Landmarks | `header`, `nav` | `main`, `header`, `footer`, `role="img"` on the stage |
| Live region | `aria-live="polite"` on the subtitle | `aria-live="polite"` on an `sr-only` region |
| Control labels | `aria-label` on all 6 controls | `aria-label` on all 13 controls |
| Reduced motion | a `prefers-reduced-motion` block exists | handled across all 40 shots, tested |
| Canvas exposed to AT | no (`role` and `aria-label` absent, `tabindex="-1"`) | `role="img"` with a per-shot `a11yKey` description |
| Keyboard journey through the whole lesson | not tested here; no chapter navigation exists | tested, passes (all nine chapters, the guided check, the end announced) |
| Measured contrast sweep | not performed | 341 measured runs, 0 below threshold |
| Real NVDA / VoiceOver | unknown | **NOT TESTED** — still open from Step 12 |

Ours is the more developed accessibility posture and the audit found nothing to contradict that. The one
regression-shaped detail found today is in `information-density-comparison.md` §3.1: the `sr-only` draft
disclaimer is announced after 36 of 40 captions.
