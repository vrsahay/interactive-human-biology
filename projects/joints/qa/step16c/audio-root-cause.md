# Narration break / desynchronisation — root cause

Measured against the running `step16b-teaching-depth-complete` build (`1120d0e`) **before any code was changed**.
`qa/step16c/reproduce_narration.mjs` samples both audio elements and the lesson clock at 50 Hz through a playthrough,
four chapter jumps, two seeks, a pause/resume and an exploration handover — 2 040 samples.
`qa/step16c/reproduce_seek_loop.mjs` instruments `HTMLMediaElement` itself to prove the mechanism.

---

## Finding 1 — the shot clip is held at zero by the code that is supposed to keep it in sync

### What was measured

| Shot | Symptom |
|---|---|
| `intro.title` | `paused: false`, duration 6.22 s, **`currentTime` frozen at 0.00 for 5.9 s** while the lesson ran |
| `hook.question` | played normally for 0.6 s, then **snapped back to 0** and froze for 1.4 s |
| `fixed.bones` | **frozen at 0.00 for 1.3 s** |

476 of 1 848 playing samples were more than 0.35 s out of step with lesson time. The element reports that it is
playing. It is not.

### The mechanism, proven

Instrumenting the media element for the first 9 seconds of the lesson:

```
currentTime assignments on intro.title.mp3: 353
   t=1459  set 0 -> 0.31   readyState=4
   t=1498  set 0 -> 0.33   readyState=4
   t=1502  set 0 -> 0.34   readyState=4
   t=1510  set 0 -> 0.36   readyState=4          ... 353 times, every ~16 ms
media events: {"seeking":353,"seeked":353,"waiting":353,"canplay":353,"playing":353,"loadedmetadata":1}
```

Every assignment reads `from: 0`. The clip never gets past zero because the next seek arrives before it can decode a
single frame.

### The root cause, exactly

`NarrationPlayer.sync()`, on the "same shot, same seek counter" branch
(`src/engine/video/NarrationPlayer.ts:206-219`):

```ts
const expected = (localMs - clip.leadInMs) / 1000;
if (expected >= 0 && expected < clip.durationMs / 1000 && Math.abs(this.audio.currentTime - expected) > DRIFT_TOLERANCE_S) {
  this.seekTo(expected);      // DRIFT_TOLERANCE_S = 0.3
}
void this.play();
```

and it is called from **every** timeline state emit — `FilmShell` calls `player.sync(...)` unconditionally in the
`state` handler, and the 10 Hz throttle further down gates only `setState`, not `sync`. The timeline emits once per
rendered frame, so **the corrector runs at ~60 Hz**.

That produces a self-feeding loop:

1. The clip is not yet decodable at the requested offset (first play of an uncached clip), so `currentTime` stays at 0
   while `expected` grows with lesson time.
2. The drift exceeds 0.3 s → `currentTime = expected`.
3. Assigning `currentTime` **restarts the element's seek**: `seeking` → re-buffer → `waiting`.
4. ~16 ms later the next emit arrives, sees `currentTime` still at 0, and assigns again — cancelling the seek that was
   about to complete.

**The corrector is what prevents the recovery it exists to produce.** Once the drift opens for any reason, it can never
close.

Decisive confirmation: `intro.title` was visited twice in the audit. First visit (cold cache) — frozen for 5.9 s.
Second visit, after a chapter jump back, with the clip cached — drift **−0.03 s**, perfect. The defect is entirely a
cold-clip defect, which is why it is intermittent and why it looks like "narration is sometimes broken".

### A second defect in the same function

`NarrationPlayer.seekTo()` (`:247-257`) registers a `loadedmetadata` listener when `readyState < 1` and **removes it
only when it fires**. Because `sync()` runs at 60 Hz, a clip that is slow to report metadata accumulates a listener per
call, each closing over a stale offset, all of which fire in registration order when metadata finally arrives — the
last write wins, and it is not necessarily the most recent lesson position.

---

## Finding 2 — two narration owners speak at once

### What was measured

**196 samples (≈3.9 s) with both elements playing simultaneously**, all at the same place:

```
shot = fixed.task   clip = fixed.task.mp3   cue = explore.fixed.task
```

### The root cause, exactly

There are two `HTMLAudioElement`s in `NarrationPlayer` — `audio` for shot narration and `cueAudio` for learner-paced
lines — and **nothing arbitrates between them**:

- `playCue()` (`:115-137`) pauses `cueAudio` and starts the new cue. It never touches `this.audio`.
- `sync()` pauses `this.audio` only when the film is not running. It never asks whether a cue is speaking.

The exploration handover then produces the overlap deterministically:

1. The film plays into `fixed.task`; its clip `fixed.task.mp3` starts ("Try it yourself. See whether you can move these
   two bones apart.").
2. The React effect notices `state.shotId === openAtShotId` and calls `enterExplore()`, which is **async** — it awaits
   `runtime.openExplore(config)` (which may await `ensureGroupedBody()`).
3. `playCue(task.promptKey)` runs after that await and starts the second voice.

Between (1) and (3) both elements are audible. `timeline.pause()` is called at the top of `enterExplore`, which does
stop the shot clip — but only after the film has already spoken part of the line, and the *cue* then overlaps whatever
is left of the fade.

### A third defect, in the same family

`nextRecall()` on the final question (`src/ui/video/FilmShell.tsx`) does:

```ts
narrator.current?.playCue(film.lesson.recall!.completeKey);
closeRecall();                       // -> narrator.stopCue()
```

The completion line is stopped in the same call stack that starts it, so the learner hears a fragment of it at most.

---

## Finding 3 — what is *not* wrong

Worth recording, because all three were plausible and all three were checked:

- **No stale clip survives a transition.** 0 samples out of 2 040 had a clip playing that did not belong to the current
  shot. Chapter jumps, forward and backward seeks, and pause/resume all re-point the element correctly. The `shotId |
  seeks` key is doing its job.
- **No shot is mostly silent while playing.** 0 shots exceeded 40 % silence.
- **The lesson clock is not the problem.** The Step-16B frame-timestamp clock kept lesson time correct throughout; the
  audio was the thing that fell behind it.

---

## 4. What the fix must be

1. **One owner.** An explicit owner (`film` / `cue` / `none`). Starting a cue stops the shot clip; the shot clip may not
   resume while a cue owns narration; leaving an exploration releases ownership before the film resumes.
2. **Correct the drift without fighting the element.** Do not re-seek a clip that is already seeking or is not yet
   decodable; rate-limit corrections; use a tolerance that is achievable; and let a cold clip start where the lesson
   actually is, once, rather than 353 times.
3. **One `loadedmetadata` listener at a time.**
4. **Do not add delays.** None of the above is a timing workaround; each removes a specific mechanical fault.

---

## 5. Evidence

| File | What it holds |
|---|---|
| `qa/reports/step16c.narration_audit.json` | 2 040 samples at 50 Hz: lesson clock, shot, clip src/time/paused, cue, cuePlaying |
| `qa/reports/step16c.narration_findings.json` | the summary counts quoted above |
| `qa/reports/step16c.seek_loop.json` | every `currentTime` assignment and every media event on the first clip |
