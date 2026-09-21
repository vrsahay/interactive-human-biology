# Timing review — the 5.5-second silence at 3:04

## What was reported

Watching the lesson as a beginner, there was a ~5.5 second stretch around 3:04 with nothing said and nothing apparently
happening. It read as though playback had stopped.

## Investigation

The shot at that point is `hinge.return`, the last beat of the elbow chapter before the knee. Read from the content
rather than guessed at:

| Property | Value |
|---|---|
| `durationMs` | **5500** |
| `camera` | `focus` preset on humerus / radius / ulna, `transitionMs: 1500` |
| `joint.poseKeys` | `0 ms` flexion = neutral (hold) → `900 ms` neutral (linear) → **`4200 ms` sourcePose** (easeInOutCubic) |
| `caption` | `{ appearAtMs: 0, style: "lower" }` — **no `textKey`, no `titleKey`** |
| `interaction` | passive |
| narration clip | **none** |

So the beat is genuinely a transition and something *is* moving for most of it: the camera travels for 1.5 s, and the
elbow animates from true extension back to its resting pose between 0.9 s and 4.2 s.

**Root cause, in two parts:**

1. **It had no caption at all.** `pipeline/audio/build_narration.ts` speaks a shot only if it has a caption title, a
   caption text or an interaction prompt. With none of those, the shot was silent **by construction** — it was the only
   silent shot in the lesson, and it sat between two talking shots.
2. **Its last 1.3 s was dead.** The pose finishes at 4200 ms and the shot runs to 5500 ms, so the final 1300 ms is a
   completely static frame with no text and no audio.

A moving picture with no voice for 4 s, followed by 1.3 s of nothing at all, in a lesson where every other beat talks, is
what "it stopped" felt like.

**It was not** a pause-state bug, a narration scheduling bug, an audio cue problem or an animation-timing problem. The
timeline advances normally through the shot and the pose track plays correctly.

### A separate thing that does look like this, and is not this

While running the build in the desktop Browser pane, playback genuinely crawled — about 2 s of film per 30 s of wall
clock. That is the browser throttling `requestAnimationFrame` for a pane that is not visible; the film's clock rides the
render loop, so it slows with it. Confirmed directly: a script waiting on animation frames timed out with *"The Browser
pane is currently hidden."* It affects any shot, is an environment behaviour rather than a product defect, and is
recorded here so the two are not confused.

## Fix

The beat stays a transition — it is doing real work, returning the elbow to rest before the camera leaves the elbow. It
now **says what it is doing**, which also gives it a narration clip, and the dead tail is trimmed so the beat ends when
its motion does.

| | Before | After |
|---|---|---|
| Caption | none | *"The elbow settles back to rest."* (`draft-enrichment`, DRAFT badge) |
| Narration | silent | 2.6 s clip, well inside the budget |
| `durationMs` | 5500 | **4600** (motion ends at 4200 ms; 400 ms to settle) |
| Silent shots in the lesson | 1 | **0** |

The duration was not simply shortened: 4600 ms is the length of the shot's own animation plus a settle, taken from the
pose track, so the trim removes only the part that had nothing in it.

## Verified

- `tests/e2e/step15b-clarity.spec.ts` §6 asserts **no shot in the lesson is silent**, that `hinge.return` now carries a
  caption, and that its duration is between 4300 and 4800 ms — so neither the silence nor the dead tail can come back.
- `tests/e2e/step14b-lesson.spec.ts` §11, which previously allowed `hinge.return` as the one documented exception, now
  asserts the exception list is empty and that no clip overruns its shot.
- Narration rebuild: **40 of 40 shots speak**, 16 learner-paced cues, **0 overruns**, no orphan clips.

## Lesson duration

4:35 → **4:40**. The new `pivot.bones` beat adds 6.0 s and the `hinge.return` trim removes 0.9 s.
