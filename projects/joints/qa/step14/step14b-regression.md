# Step 14B regression report

Branch `step14b-teaching-completion`, built from the Step-14 build tagged `step14-conditional` (`25c86a6`). Chrome 152
headless with the real GPU (ANGLE D3D11), same machine as Steps 12R, 13 and 14.

## Result

| Suite | Result |
|---|---|
| Typecheck (`tsc` app + tests) | clean |
| Unit (`vitest`) | **97 passed** |
| End-to-end (`playwright test`) | **75 passed, 0 failed** (69 before this step + 6 new) |
| Step-14B lesson architecture | 6 passed (the 13 required checks) |
| Console errors across the suite | 0 |
| Frozen source and asset files | **29 of 29 byte-identical** |

The new spec is `tests/e2e/step14b-lesson.spec.ts`. It covers the brief's numbered checks: 1–2 the hook and the concept
chapter exist and name no category (asserted against the narration text, not the code); 3–6 every joint chapter offers
its Explore and only the elbow drives the validated DOF; 7 compare isolates one movement at a time then shows four;
8–10 recall is its own chapter, reaching it stops the clock, the body map is the chapter after it and no recall state
survives; 11 every shot with instructional text is narrated and no clip overruns its shot, and every learner-paced line
has a cue; 12–13 consecutive chapters never open on the same framing and the lesson runs without a console error.

## What the regression caught

Restructuring a lesson that 63 existing tests describe broke 13 of them. Most were test expectations that encoded the old
six-chapter shape and were updated. Four were real product problems, and those are worth listing.

**1. The retrieval panel could not open from its own chapter.** `presentRecallStep` lights individual bones, which the
delivery proxy cannot do, and the recall chapter's own shots are plain full-body framings that do not require the grouped
body. A learner jumping straight to chapter 08 got `BodyManifestError: this body presentation needs the grouped
representation`. Fixed by `AppVideoRuntime.ensureGroupedBody()`, awaited by both learner-paced detours — the exploration
had the same latent hole, reachable by a chapter jump.

**2. Nine chapter markers did not fit the controls.** The markers sit where their chapter starts, which is what makes the
strip a map of the film; the recall chapter is a few seconds long, so its marker started closer to its neighbour than a
44 px target is wide and the two overlapped at every desktop width. Marker positions are now nudged apart (forwards, then
backwards so the last one stays on screen), and on a phone the strip wraps onto a second row of equal targets rather than
shrinking below 44 px or scrolling sideways. Caught by `step12-motion-visual` at all five viewports.

**3. A correct guided check snapped straight into the next shot.** The check used to be the last thing in the lesson, so
"That is about 90°. Well done." stayed on screen. Moved into the hinge chapter it was replaced within a frame and no
learner could read it. A correct answer now holds for 1.6 s with the confirmation visible, with the Continue button on
screen for anyone faster.

**4. `End` on the timeline could not reach the end of the lesson.** It seeked to `durationMs - 1`, which never marks the
lesson complete. That did not matter while the final shot was a check that ended the lesson when answered; now it meant a
keyboard user could never reach — or hear — the completion announcement. `End` now means the end.

Two more were found by looking rather than by a test, and both are now covered:

**5. The camera crawled to each recall question.** `presentRecallStep` used the director's default travel, which from a
whole-body framing to a joint site took several seconds — long enough that the question was readable before its joint
arrived. Explore and recall detours now use explicit 1.1 s and 0.9 s moves.

**6. On a narrow layout the panel covered the joint being asked about.** The film's own guided shots lift the subject
above the stacked panels; the two detours bypassed that because they frame the camera directly. Both now apply the same
lift. Verified at 375 px: the highlighted skull sits above the question panel.

## Elbow regression

Unchanged and re-verified: `gate3-pose-consistency`, `reference-poses` (0/45/90/145), `step12-delivery` handover,
`film` drag behaviour and `step13-bugsweep` all pass. The hinge exploration still asserts `dofId === "flexion"` and
`displacedGroups === []`, so the validated rig never moves body geometry and no teaching simulation touches the rig.
The only change in the hinge chapter is that the guided check now lives in it.

## Accessibility

`step12-a11y` and `step14-a11y` both pass unchanged in substance:

- axe over 12 panel states at 1280×800 and 390×844: **0 violations**.
- 98 measured text runs in the new panels against the rendered frame: **0 below the WCAG 1.4.3 threshold**.
- The keyboard journey now walks **all nine chapters** from their markers, reaches the guided check by arrow keys, answers
  it, and reaches the end of the lesson with `End` — completion announced.
- Reduced motion: every one of the 39 shots cuts on entry, holds its framing, freezes the indicators and shows no caption
  transition. The traversal steps past the two beats that hand over to the learner exactly as a learner would.
- Responsive: no panel sits under the controls at 390 or 412 px, every control is ≥ 44 px and on screen, no horizontal
  scroll at any of the five viewports.

## Performance

Measured as an A/B against the Step-14 build, rebuilt from its tag, alternating on the reference profile
(`igpu-broadband`: 1280×800, DPR 1, no CPU throttle, 50 Mbps emulated) — the same method as Step 14, because this
machine's CPU benchmark still moves between runs.

| Pass | Build | CPU bench (ms) | First 3D (ms) | Intro (ms) | Bytes before first 3D | Elbow drag | Free orbit | Recap playback |
|---|---|---|---|---|---|---|---|---|
| 1 | Step 14 | 131 | 766 | 1297 | 543 KB | 49.1 fps / p95 31.1 ms | 54.2 fps | 59.8 fps |
| 1 | Step 14B | 121 | 750 | 1305 | 547 KB | 59.9 fps / p95 18.2 ms | 50.6 fps | 59.9 fps |
| 2 | Step 14 | 151 | 733 | 1255 | 564 KB | 60.0 fps / p95 18.3 ms | 48.8 fps | 60.0 fps |
| 2 | Step 14B | 97 | 639 | 1176 | 547 KB | 60.0 fps / p95 17.7 ms | 51.0 fps | 60.0 fps |

**No measurable difference.** Every gap tracks the CPU benchmark rather than the build; the one outlier (Step 14 pass 1's
49 fps drag) is on the pass with the noisiest machine state and does not reproduce. Bytes before the first 3D frame are
unchanged at ~547 KB: the lesson gained 17 shots and 16 narration clips but **no new geometry, no new textures and no new
asset of any kind** — the audio is 732 KB in total and is fetched per clip, after the film has started.

The Step-12 emulated phone ×4 misses (first 3D 2742 ms vs 2500 ms; interaction p95 45.1 ms vs 22 ms) are **unchanged and
still open**, as is the absence of any real Android or iPad measurement. Nothing here is a mobile certification.

## Frozen-baseline integrity

Re-hashed against `qa/expert/frozen-build.json`:

- **29 of 29** source, asset and Blender files byte-identical. Master still matches its pinned SHA (`f7313dab…`).
- The 8 `dist/` entries still do not match, exactly as recorded in Step 14's report: that record was written before the
  post-freeze narration work that is part of the Step-13 commit itself, and mentions narration nowhere. Step 14B did not
  invalidate them either.
- `step13-frozen-baseline` (`537ac71`) and `step14-conditional` (`25c86a6`) are both intact; the Step-14 build was checked
  out into a worktree, rebuilt and measured during this step without being modified.
- The Step-13 expert-review package in `qa/expert/` was **not regenerated**. It describes the frozen build, which is what
  a reviewer is being asked to sign off; its generator still names that build's shot ids on purpose.
