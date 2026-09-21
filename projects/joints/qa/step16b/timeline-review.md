# Timeline review — lesson time, render-frame time, and shot length

Two separate timing problems, both from the Step-16 audit.

---

# Part 1 — the frame-driven clock

## What was wrong

`src/engine/core/RenderLoop.ts` clamps its own frame delta:

```ts
const dt = this.lastFrame ? Math.min(100, now - this.lastFrame) : 16.7;
```

That clamp is right for what it was written for: a camera tween or a pose animation must never be flung across the
scene by one long gap. The mistake was feeding the same delta to the **film**. `AppVideoRuntime.startClock` passed the
render loop's dt straight to `VideoTimeline.tick`, so below about 10 fps the lesson advanced 100 ms per frame no matter
how much real time had passed.

Measured during the audit, in the same browser pane, with the same page visible:

| | Frames per second | Film clock |
|---|---|---|
| The reference lesson | throttled | **real time** |
| Ours | 1.6 | **0.125 × real time** |

The narration runs on the audio clock, so the two drift apart: the voice keeps going while the picture crawls. On this
machine, with a real GPU, the film runs at 60 fps and none of this shows. It shows on exactly the class of device
Step 12 is still failing on — the emulated phone at ×4 CPU throttle.

## What shipped

`startClock` now takes true elapsed time from the frame timestamp, which the render loop already passes its tickers:

```ts
const elapsed = now - last;
last = now;
if (elapsed > 0 && elapsed <= AppVideoRuntime.SUSPEND_MS) tick(elapsed);
```

- **Lesson time and render-frame time are separated.** The render loop keeps its clamp for camera tweens and pose
  animation; the film gets the real interval. Dropped frames now cost frames, not lesson time: the next rendered frame
  shows the moment the lesson has actually reached, because every shot is reconstructed declaratively from its local
  time rather than replayed.
- **A gap longer than `SUSPEND_MS` (4 s) is not throttling** — the page was backgrounded, or the machine slept.
  Fast-forwarding through minutes of lesson would be worse than pausing through them, so that tick is skipped and the
  clock re-anchors. Narration is re-positioned from the film's time on the next state emit, so the two stay together
  either way.
- **Explore is untouched.** An exploration pauses the timeline, so no clock runs while the learner has the joint. The
  drag path, the spring-back tick and the keyboard stepping are unchanged.

## Proof

`tests/e2e/step16b-teaching.spec.ts` §6 throttles animation frames to about 5 fps *after* the film has loaded (the
render loop resolves `requestAnimationFrame` at call time, so the patch reaches it), plays a shot, and samples the film
clock on frame boundaries at both ends so the measurement's own phase cannot be mistaken for the clock's behaviour.

| | Before this step | After |
|---|---|---|
| Frames per second under the harness | ~5 | ~5 |
| Lesson time per second of wall clock | ~0.5 × (and 0.125 × at 1.6 fps) | **0.85 – 1.15 ×** |

The test fails if the harness is not actually dropping frames, so it cannot pass by accident on a fast machine.

## A bug this found on the way

Seeking to the very end of the lesson while the target shot's assets were still loading left the film on the last
frame and **never marked the lesson finished** — the buffered branch of `VideoTimeline.seek` returned before the
end-of-lesson check. It had no visible consequence before this step because nothing depended on `ended`; the completion
card does. Fixed in the buffered branch, and covered by §9, which reaches the end with the `End` key and expects the
completion card.

---

# Part 2 — shot length derived from narration

## What was wrong

Shot length was authored and narration was compressed to fit it. The Step-15B timing review traced the 5.5-second
silence at 3:04 to exactly that: `hinge.return` was 5500 ms long with 4200 ms of motion and no caption at all. That
instance was fixed; the mechanism that produced it was not.

## What shipped

A shot may declare `durationFrom: "speech"` with a `minDurationMs` visual floor. The narration build synthesises those
shots at the **natural rate** and writes the lesson back:

```
durationMs = ceil(max(minDurationMs, leadIn + measuredSpeech + tail) / 100) * 100
```

43 of 52 shots are speech-timed. Transitions and learner-paced shots (`hinge.try`, `hinge.check`, `hinge.return`,
`recall.challenge`, the four body-map beats) keep their authored length and the old rate-compression path.

The effect on this run — 28 shots were retimed, in both directions:

| Shot | Authored | Speech-derived |
|---|---|---|
| `fixed.why` | 8000 | **10000** |
| `fixed.name` | 8000 | **10400** |
| `pivot.why` | 9000 | **11000** |
| `ball.why` | 9000 | **11300** |
| `hinge.why` | 9500 | **12500** |
| `fixed.task` | 8000 | **6000** |
| `pivot.task` | 9000 | **5400** |
| `ball.task` | 8500 | **5400** |
| `hinge.name` | 7000 | **6000** |
| `map.all` | 10000 | **9400** |

The beats that had something to explain got longer; the beats that had a short line got shorter. Nothing was padded and
nothing was compressed.

## Proof

`tests/unit/narration.test.ts` asserts, for every speech-timed shot: it is spoken, its speaking rate is exactly 1.0
(never compressed), its duration is exactly the formula above, and the slack after the voice is no more than the tail
plus rounding — so a beat can neither end mid-sentence nor hold a dead frame.

`tests/e2e/step15b-clarity.spec.ts` §6 is unchanged and still asserts that no shot in the lesson is silent and that
`hinge.return` runs between 4300 and 4800 ms.

## Lesson duration

| | Before | After |
|---|---|---|
| Running time | 4:40 (279.6 s) | **6:25 (385.3 s)** |
| Shots | 40 | 52 |
| Mean beat length | 7.0 s | **7.4 s** |
| Spoken words | 356 | **878** |
| Spoken words per second | 1.27 | **2.28** |

The lesson is longer because it now explains. The cutting rate barely moved; what changed is how much each beat says.
