# Narration synchronisation — review

Root cause in `audio-root-cause.md`; architecture in `audio-architecture-audit.md`. This is what a learner now hears,
and the measurement behind it.

---

## 1. The two defects, and what was done

| Defect | What was done | Not what was done |
|---|---|---|
| The shot clip was pinned at zero by a 60 Hz corrector re-seeking it faster than a seek could complete | The corrector now skips while the element is mid-seek or has no decoded data, and makes at most one correction per 700 ms | No delay was added anywhere, and the tolerance was not widened to hide the drift |
| The shot clip and an exploration cue spoke at once | One explicit owner: `playCue()` stops the shot clip before it starts; `sync()` yields while a cue holds the floor | Neither element was removed; a learner-paced line still needs its own element so it can speak while the film is paused |

Two smaller faults in the same code were fixed with them:

- `seekTo()` registered a `loadedmetadata` listener per call and removed it only when it fired. At 60 Hz a slow clip
  accumulated dozens, each closing over a stale offset. There is now at most one, replaced on each call.
- `sync()` called `play()` on every emit — a promise per frame, and a `play()` issued during a seek can restart that
  seek. It now asks only when the element is actually paused.

And one in the recall flow:

- The completion line was started and then stopped in the same call stack (`playCue(completeKey)` immediately followed
  by `closeRecall()` → `stopCue()`), so the learner heard a fragment of it at most. The panel now closes **without**
  silencing the line, and the body map's own narration waits its turn because the cue still owns the floor.

## 2. The handover no longer cuts the film off mid-sentence

The exploration handover used to fire the instant the lesson reached the handover shot, so the shot's own line
("Try it yourself. See whether you can move these two bones apart.") was cut part-way through and the exploration's cue
started over the top of it.

It now waits until the shot has finished speaking — `localMs >= clip.leadInMs + clip.durationMs`, or 60 % of the shot
when there is no clip. Traced on a plain playthrough of `fixed.task`:

```
local=0     PLAY   fixed.task.mp3   ct=0
local=5578  PAUSE  fixed.task.mp3   ct=4.94      <- the full 4.94 s clip finished
local=5578  SET_SRC cue.explore.fixed.task.mp3
local=5578  PLAY    cue.explore.fixed.task.mp3   <- and only then does the cue start
```

One play, one pause, no re-seeks, no overlap.

## 3. Measured, before and after

Sampled at 50 Hz through a playthrough (`qa/step16c/audit_steady_playback.mjs`), plus the media-element instrumentation
in `qa/step16c/reproduce_seek_loop.mjs`.

| | Before | After |
|---|---|---|
| Samples with two owners audible | **196** (≈3.9 s) | **0** |
| Maximum simultaneous owners | 2 | **1** |
| `currentTime` assignments on the first clip, first 9 s | **353** | **2** |
| `seeking`/`seeked`/`waiting` cycles on that clip | **353 each** | **2 each** |
| Stalls (clip reports playing, position frozen ≥ 200 ms) | `intro.title` 5.9 s, `hook.question` 1.4 s, `fixed.bones` 1.3 s | **one, 0.4 s, on the first clip** |
| Worst clip-vs-lesson offset, per shot | 6.20 s / 3.65 s / 1.77 s | **0.29–0.34 s across all 10 shots** |
| Stale clip after a transition | 0 | **0** |
| Shots mostly silent while playing | 0 | **0** |

The residual 0.29–0.34 s is a constant, not a drift: it is the same on every shot and it is the lead-in model in the
measurement, not a divergence — the clip is started slightly before `leadInMs` has fully elapsed.

The one remaining 0.4 s stall is the browser decoding the very first clip. It cannot be prefetched by the shot before
it because there is none; it is now prefetched as soon as the narration manifest resolves, while the landing card is on
screen, which took it from 5.9 s to 0.4 s.

## 4. Narration and caption

They are intentionally different text (Step 16B: a short headline caption, a longer spoken explanation shown as a
subtitle). What is asserted is that they **resolve from the same lesson time**:

- the caption element carries `data-shot`;
- the timeline state carries `shotId`;
- the narration element's `src` is `<shotId>.mp3`.

After every seek and every chapter jump the test requires all three to name the same shot. Measured across six seek
cases and four chapter jumps: **10 of 10 agree**, 0 stale clips, never more than one owner.

| Seek case | Shot | Caption | Clip |
|---|---|---|---|
| inside the same shot | `fixed.bones` | `fixed.bones` | `fixed.bones.mp3` |
| into another shot | `pivot.rotate` | `pivot.rotate` | `pivot.rotate.mp3` |
| across chapters | `hinge.axis` | `hinge.axis` | `hinge.axis.mp3` |
| exactly on a chapter boundary | `compare.pullback` | `compare.pullback` | `compare.pullback.mp3` |
| one millisecond before it | `hinge.knee` | `hinge.knee` | `hinge.knee.mp3` |
| the end of the lesson | `map.all` | *(end card replaces it)* | `map.all.mp3` |

## 5. Shot duration

The Step-16B principle is unchanged: an instructional shot is as long as its measured speech plus a visual floor, and
`tests/unit/narration.test.ts` still asserts, for all 43 speech-timed shots, that the speaking rate is exactly 1.0,
that the duration is exactly `ceil(max(floor, lead + speech + tail)/100)*100`, and that the slack after the voice never
exceeds the tail plus rounding. Nothing was shortened or lengthened in this step.

What this step adds is the assertion that the *playback* honours it: no clip overruns its shot
(`step14b-lesson` §11), no shot is silent (`step15b-clarity` §6), and now no clip is prevented from playing.
