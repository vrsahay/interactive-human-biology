# Frame-drop synchronisation

## What was preserved

The Step-16B separation stands, untouched:

- **Render-frame time** keeps its clamp. `RenderLoop` still limits its own frame delta to 100 ms, because a camera
  tween or a pose animation must never be flung across the scene by one long gap. **The clamp was not removed.**
- **Lesson time** comes from the frame timestamp instead, in `AppVideoRuntime.startClock`. Dropped frames cost frames,
  not lesson time: the next rendered frame shows the moment the lesson has actually reached, because every shot is
  reconstructed declaratively from its local time rather than replayed.
- A gap longer than 4 s is treated as a suspended page and skipped rather than fast-forwarded.

## What Step 16C adds

Narration is now measured against the **same** lesson timeline under the same throttling, not just the lesson clock
against the wall clock. Narration was never an independent clock — `sync()` has always positioned the clip **from**
lesson time — but before this step the corrector that did the positioning could pin the clip at zero, so "the lesson
keeps time" and "the narration keeps time" were not the same statement. Now both are asserted together.

## The test

`tests/e2e/step16c-invariants.spec.ts` §D. Animation frames are throttled **after** the film has loaded, so the test
measures the clock and not the loader:

```ts
window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 1000 / fps);
```

Both ends of the measurement are taken on a frame boundary, so the measurement's own phase cannot be mistaken for the
clock's behaviour. Two ratios are asserted over a five-second window at each rate:

- **lesson ÷ wall clock** must be 0.85–1.15;
- **narration ÷ lesson** must be 0.8–1.2 — the clip has to advance with the lesson, not on its own.

## Measured

| Frames per second | Lesson advanced | Wall clock | Clip advanced | Lesson ÷ wall | Narration ÷ lesson |
|---|---|---|---|---|---|
| 15 | 5 050 ms | 5 069 ms | 5.07 s | **0.996** | **1.003** |
| 10 | 5 114 ms | 5 106 ms | 5.10 s | **1.002** | **0.998** |
| 5 | 5 018 ms | 5 216 ms | 5.22 s | **0.962** | **1.040** |
| 4 | 5 199 ms | 5 263 ms | 5.25 s | **0.988** | **1.010** |

At four frames per second — fifteen times slower than a healthy device — five seconds of wall clock produce five
seconds of lesson and five seconds of narration. For comparison, the Step-16A audit measured the pre-16B build at
**0.125×** at 1.6 fps.

## What this does and does not mean

- Shot transitions and captions stay correct because they are resolved from lesson time, not accumulated: the
  `step12-motion-visual` traversal walks all 52 shots and checks the framing, the indicators and the caption transition
  on each one.
- It is **not** a device certification. The throttle is a synthetic one on this machine. Step 12's emulated phone ×4
  misses are unchanged and still open, and no real Android device or iPad has been measured.
