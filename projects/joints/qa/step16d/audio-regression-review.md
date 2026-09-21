# Audio regression review — Step 16D

Narration text changed in this step, so every clip was re-synthesised and the Step-16C guarantees were re-checked from
scratch. **None of the Step-16C audio work was undone.**

---

## 1. What changed in the audio

| | Before | After |
|---|---|---|
| Shot clips | 52 | 52 |
| Cue clips | 24 | 24 |
| Clips re-synthesised | — | all 76 (the build regenerates them) |
| Shot clips whose text changed | — | 4 (`fixed.try`, `ball.move`, `map.all`, and `hinge.try` via its prompt) |
| Map shots that gained their own spoken line | — | 4 (`map.fixed/pivot/ball/hinge`) |
| Cue clips whose text changed | — | 4 (every `explore.*.task`) |
| Speaking rate | 1.0 everywhere | **1.0 everywhere** — nothing compressed |
| Clips that overrun their shot | 0 | **0** |
| Silent shots | 0 | **0** |
| Orphaned clips left in the build | 0 | **0** |
| Total narration bytes | 1 493 KB | **1 435 KB** |

Shot lengths were re-derived from the new clips for 20 speech-timed shots. The lesson is 6:23, two seconds shorter
than before — no shot was padded and none was cut short of its speech.

## 2. The Step-16C invariants, re-verified

| Invariant | How it was checked | Result |
|---|---|---|
| **B — at most one narration owner** | `step16c-invariants` §B: 2 800+ samples at 50 Hz through a playthrough including an exploration handover | max **1**, overlaps **0** |
| **E — no stale narration around an exploration** | §E: inside the panel the shot clip is silent and the cue owns the floor; on return the cue is stopped and ownership released | pass |
| **C — caption, visual and narration resolve from the same lesson time** | §C over six seek cases, §C2 over four chapter jumps | 10 of 10 agree, 0 stale clips |
| **D — dropped frames do not slow the lesson, and narration follows it** | §D at 15, 10, 5 and 4 fps | lesson 0.85–1.15× wall clock, narration 0.8–1.2× lesson |

Plus the whole `narration` suite: the clip is positioned by the film clock, a finished clip is not revived, the
narration toggle is a real toggle, and narration is silent while the film is paused or held for the learner.

## 3. The events the brief lists, each checked

| Event | Behaviour |
|---|---|
| Lesson start | the landing card's gesture starts the film and the first clip together; the first clip is prefetched while the card is on screen, so it does not start late |
| Shot transition | the clip is re-pointed on the shot change; the next shot's clip has already been prefetched |
| Chapter transition | same path as a seek; the old clip is stopped by the `src` change and the lead-in timer is cleared |
| Pause | clip paused where it is; the lesson clock is held at the same instant |
| Resume | re-positioned from lesson time before playing |
| Seek forward / backward | `seeks` increments, the key changes, the clip is re-positioned; if the lesson is past the end of the clip it stays silent rather than talking over the next cut |
| Explore entry | the film pauses, its clip stops, then the task cue takes ownership — and the handover waits until the shot has finished its sentence |
| Explore task | the task cue now speaks **the task only**; it used to append the drag instruction, which for the fixed joint was the same sentence twice |
| Explore return | the cue is stopped, ownership released, the shot key cleared, the film's clip re-positioned from lesson time |
| Recall | each question, correction and reveal replaces the last; the completion line keeps the floor while the film moves on to the body map |
| Replay | seek to 0, ownership reset, handovers and the recall re-armed |
| Completion | the last clip finishes and nothing restarts it |

## 4. What was listened for, and not found

The brief's list of symptoms, checked against the 50 Hz sample record and the transcript analysis:

| Symptom | Result |
|---|---|
| A repeated sentence | **none** — 0 unintended near-duplicates across the lesson, 0 exact duplicates, 0 cues repeating their instruction |
| Double voice | **none** — max 1 owner over 2 800+ samples |
| Stale narration | **none** — 0 samples playing a clip that does not belong to the current shot, across seeks and chapter jumps |
| Unexpected gap | **none** — 0 silent shots; the only stall is the 0.4 s initial decode of the first clip |
| Abrupt cut | **none** — every clip is at rate 1.0 and fits its shot; the handover waits for the shot to finish speaking |
| Narration on the wrong shot | **none** — the clip's `src` matches the shot in 10 of 10 navigation checks |
| Narration continuing after a transition | **none** — the `src` change stops the old clip and the lead-in timer is cleared on every key change |

## 5. Loading

Unchanged from Step 16C and still lazy: one clip ahead is prefetched on each shot change (~25 KB), and the first clip
is prefetched as soon as the narration manifest resolves, while the landing card is on screen. Total narration is
1 435 KB across 76 clips, fetched per clip after the film starts, and none of it is on the path to the first 3D frame.
