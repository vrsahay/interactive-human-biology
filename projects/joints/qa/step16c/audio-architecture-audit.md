# Audio architecture audit

The whole playback path, traced and then measured. Root causes are in `audio-root-cause.md`; this is the architecture
they sit in, before and after.

---

## 1. The path

```
VideoTimeline (lesson clock)
  -> emits `state` on every frame
     -> FilmShell's state handler
        -> NarrationPlayer.sync(shotId, localMs, running, key)   [shot clip]
  -> emits `shot` on every shot change
     -> FilmShell announces it, and prefetches the NEXT shot's clip
FilmShell interactions
  -> enterExplore / recall / task completion
     -> NarrationPlayer.playCue(localeKey)                       [learner-paced line]
```

## 2. The elements

| | Element | Used for | Started by | Stopped by |
|---|---|---|---|---|
| shot clip | `NarrationPlayer.audio` | the narration of the current shot | `sync()` when the film is running | `sync()` when it is not, `stop()`, a cue taking ownership |
| cue | `NarrationPlayer.cueAudio` | exploration instruction and task, task confirmation, recall question / reveal / correction / completion | `playCue()` | `stopCue()`, its own `ended`, the next `playCue()` |

Two elements exist because a learner-paced line has to be able to speak **while the film is paused** — the film's own
element is paused exactly then, and one element could not do both.

## 3. The ownership model (Step 16C)

Before: nothing arbitrated. `playCue()` never touched the shot clip, and `sync()` never asked whether a cue was
speaking. Measured result: 196 samples (≈3.9 s) of two voices at once at the first exploration handover.

Now there is exactly one owner, held in `NarrationPlayer.owner`:

| Owner | Meaning | Entered by | Left by |
|---|---|---|---|
| `none` | nothing is speaking | start-up, `stop()`, a cue finishing | — |
| `film` | the shot clip has the floor | `sync()` after it has positioned and started the clip | `stop()`, a cue taking over |
| `cue` | a learner-paced line has the floor | `playCue()` | `stopCue()`, the cue's `ended` event |

The transitions enforce the rule:

- **`playCue()` takes ownership first and calls `stop()` before it starts the cue**, so the shot clip is already silent
  when the cue begins.
- **`sync()` returns immediately while `owner === "cue"`**, after pausing the shot clip. The film cannot talk over a
  cue and cannot resume mid-word behind one.
- **Releasing a cue clears the shot key as well** (`currentKey = ""`), so the next `sync()` takes the "new position"
  branch and re-positions the clip from lesson time instead of resuming wherever it was paused.

`diagnostics()` exposes `owner` and `owners` — the number of elements actually audible — so the invariant is
measurable. `owners` must never exceed 1.

## 4. Synchronisation to lesson time

The lesson timeline is the single source of truth. Narration never advances the lesson and never runs on its own
schedule; it is positioned **from** lesson time on every emit.

- **Entering a shot / after a seek** (`key` changed): the element's `src` is pointed at that shot's clip if it is not
  already, the position is set to `localMs − leadInMs`, and playback starts — or waits out a negative lead-in on a
  timer, or stays silent if the lesson is already past the end of the clip.
- **Within a shot** (`key` unchanged): the clip is corrected towards `localMs − leadInMs` **only when a correction can
  take effect** — see §5.
- **Paused, held for a check, or the learner has the joint**: `running` is false and the clip is paused. The lesson
  clock is held at the same time, so the two stay together.

## 5. The drift corrector, before and after

| | Before | After |
|---|---|---|
| Called at | every emit (~60 Hz) | every emit (~60 Hz) |
| Guard: element mid-seek | none | **skipped while `audio.seeking`** |
| Guard: element has data | none | **skipped while `readyState < 2`** |
| Rate limit | none | **at most one correction per 700 ms** |
| `play()` | every emit | **only when the element is actually paused** |
| Pending `loadedmetadata` listeners | one per call, removed only on fire | **at most one, replaced on each call** |

The first three are the fix. Assigning `currentTime` restarts the element's seek; issuing the next assignment 16 ms
later cancels the work that would have closed the drift. Measured on the first clip of the lesson: **353 `currentTime`
assignments and 353 seeking/seeked/waiting cycles in nine seconds, with the clip frozen at 0.00 for 5.9 of them.**
After: **2 assignments, 2 seek cycles, one stall of 0.4 s** — the unavoidable initial decode.

## 6. Loading

Lazy loading is preserved — clips are still fetched per shot, not bundled — with two additions:

- **One clip ahead.** On every `shot` event the next shot's clip is prefetched (`NarrationPlayer.prefetch`, a
  `fetch(..., { cache: "force-cache" })` that warms the HTTP cache). About 25 KB.
- **The first clip during the landing card.** The first shot has no predecessor to warm it, and the landing card is on
  screen for as long as the learner takes to press *Start lesson*, so the current clip is prefetched as soon as the
  narration manifest resolves.

A clip that fails to load is not an error state: `sync()` finds no entry, stops the element and returns. The lesson
continues with captions and subtitles.

## 7. What happens at each event

| Event | Shot clip | Cue |
|---|---|---|
| **Start lesson** | positioned at 0 and started, inside the click handler so the browser grants audio | — |
| **Pause** | paused where it is; lesson clock held | — |
| **Resume** | re-positioned from lesson time, then played | — |
| **Seek within a shot** | `seeks` increments → new key → re-positioned | — |
| **Seek to another shot** | `src` re-pointed, re-positioned | — |
| **Chapter jump** | same as a seek; the old clip is stopped by the `src` change | — |
| **Explore opens** | film pauses → `running` false → clip paused; then `playCue` takes ownership | instruction/task cue speaks alone |
| **Task completed** | still silent (`owner === "cue"`) | confirmation replaces the task cue |
| **Explore closes** | ownership released, key cleared, clip re-positioned from lesson time | stopped |
| **Recall question** | film paused → clip paused; cue owns | question, then reveal or correction |
| **Recall completed** | waits for the completion line to finish | the completion line keeps the floor while the film moves to the body map |
| **Replay** | seek to 0, ownership reset | — |
| **Lesson end** | clip finishes; nothing restarts it | — |
| **Frames dropped** | the lesson clock still tracks the wall clock, and the clip is corrected towards it | — |

## 8. Measured, after

| | Result |
|---|---|
| Maximum simultaneous owners over 2 833 samples | **1** |
| Overlap samples | **0** (was 196) |
| Stalls during a 60 s playthrough | **1, of 0.4 s**, on the first clip (was 5.9 s + 1.4 s + 1.3 s) |
| Worst clip-vs-lesson offset, all 10 shots | **0.29–0.34 s**, all inside tolerance |
| Stale clip after any seek or chapter jump | **0** |
| Clip belongs to the current shot after 6 seek cases and 4 chapter jumps | **10 of 10** |
