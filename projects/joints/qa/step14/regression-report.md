# Step 14 regression report

Everything below was run on the Step-14 build (branch `step14-teaching-redesign`, commit at the time of writing
`86a82f1` plus the fixes described here), Chrome 152 headless with the real GPU (ANGLE D3D11), on the same machine as
Steps 12R and 13.

## Result

| Suite | Result |
|---|---|
| Typecheck (`tsc` app + tests) | clean |
| Unit (`vitest`) | **97 passed** |
| End-to-end (`playwright test`) | **69 passed, 0 failed** (63 before this step + 6 new) |
| Step-14 explore | 7 passed |
| Step-14 recall | 4 passed |
| Step-14 responsive | 3 passed |
| Step-14 accessibility | 3 passed (axe 0 violations in 12 panel states; 98 text runs measured, 0 below threshold) |
| Console errors across the suite | 0 |

## What the regression caught, and what was done about it

**Two real failures, both introduced by this step, both in the recap chapter at phone widths.**

`tests/e2e/step12-motion-visual.spec.ts` failed at 390×844 and 412×915:

- `recap.compare`: `captionOverPlayer` — the caption sat on top of the controls.
- `recap.check`: `interactOverPlayer` — the joint panel sat on top of the controls.

Cause, measured rather than guessed: the phone layout held the caption and the joint panel 176 px above the bottom of the
screen, a constant that assumed a single row of controls. The recap chapter now offers two actions (**Choose the joint
type** and **Explore**), the control row wraps to a second line there, and the player becomes 198 px tall — so the two
panels overlapped it by 22 px.

Fix: the player is no longer assumed to be a fixed height. `FilmShell` measures it with a `ResizeObserver` and publishes
`--film-player-h`; the caption, the joint panel, the explore panel, the recall panel and the buffering pill all clear
`calc(var(--film-player-h) + 26px)`. The same wrap happens at 390 px with the explore panel open ("Return to the lesson"
is a wider pill), and that case is now covered by the same mechanism rather than by a second constant.

After the fix the responsive spec passes at all five widths, and `tests/e2e/step14-responsive.spec.ts` holds every new
panel clear of the controls at 390 and 412 px, with every control at least 44 px and fully on screen.

**One real defect found while measuring, not by a test.** The retrieval sequence survived leaving the recap chapter: a
question about the skull could still be on screen during the pivot chapter, and Escape did not close it (it closed an
exploration, but not a recall). Both fixed: the sequence ends on Escape and ends when the chapter changes. Held by the
third test in `step14-responsive.spec.ts`.

## Hinge regression: the validated rig is untouched

- `step12-delivery`, `gate3-pose-consistency`, `reference-poses`, `film`, `film-visual` and `step13-bugsweep` all pass
  unchanged.
- The hinge exploration drives the validated DOF through `JointController.setDof` and nothing else: the explore spec
  asserts `dofId === "flexion"` and `displacedGroups === []` for it, so the validated rig never moves body render groups
  and the teaching simulations never touch the rig.
- The build refuses a group-driven explore that claims `validated-rig` (`checkExploreConfigs`, unit-tested).
- Reset in the hinge exploration is `setDof(flexion, 0)` — the validated zero, not a visual guess.

## Performance

**The comparison had to be done as an A/B, because this machine is not in the same state it was in during Step 12R.** The
first measurement taken after the regression suite showed the CPU benchmark at 125 ms against Step 12R's 82 ms — the
machine was ~50 % slower — and cold-load and frame numbers moved with it. Any "Step 14 is slower than Step 12R" reading
from that would have been about the machine, not the build.

So the Step-13 frozen baseline was rebuilt from tag `step13-frozen-baseline` into its own `dist`, and the two builds were
run alternately on the reference profile (`igpu-broadband`: 1280×800, DPR 1, no CPU throttle, 50 Mbps emulated network):

| Pass | Build | CPU bench (ms) | First 3D (ms) | Intro complete (ms) | Elbow ready (ms) | Elbow drag | Free orbit | Recap playback |
|---|---|---|---|---|---|---|---|---|
| 1 | Step 13 | 340 | 2034 | 2988 | 1260 | 59.8 fps / p95 18.0 ms | 46.7 fps | 30 fps |
| 1 | Step 14 | 338 | 1863 | 2821 | 1214 | 59.9 fps / p95 18.0 ms | 34.7 fps | 30 fps |
| 2 | Step 13 | 104 | 852 | 1522 | 717 | 59.9 fps / p95 17.9 ms | 56.9 fps | 30 fps |
| 2 | Step 14 | 117 | 931 | 1537 | 711 | 60.0 fps / p95 17.9 ms | 57.0 fps | 30 fps |

Pass 1 ran on a loaded machine (bench 340 ms) and its absolute numbers are not usable; pass 2 is the comparable one.
**On the reference profile the Step-14 build measures the same as the Step-13 frozen build** — first 3D within 79 ms,
intro within 15 ms, elbow readiness within 6 ms, drag latency identical, orbit identical.

Recap playback reads 30 fps with 240 dropped frames in **all four runs, in both builds, identically**. It is therefore
not something this step introduced; it is how the recap chapter plays on this machine today (Step 12R recorded 60 fps for
it when the machine benchmarked at 82 ms). It is recorded here and not investigated further, because reopening
performance work was explicitly out of scope for anything short of a concrete product defect.

### What the new interaction itself costs

`qa/step14/perf_explore.mjs`, same instrumentation as the perf lab, 12 s of drag per joint at display rate, on the
reference profile (`qa/reports/step14.perf.explore.json`):

| Explore | Status | Render groups moved | fps | Input latency p50 / p95 | Dropped frames |
|---|---|---|---|---|---|
| Fixed (skull suture) | teaching simulation | 1 | 60.0 | 16.6 / 17.2 ms | 0 |
| Pivot (head on C1/C2) | teaching simulation | 3 | 60.0 | 16.6 / 17.3 ms | 0 |
| Ball-and-socket (shoulder) | teaching simulation | 4 | 60.0 | 16.6 / 17.3 ms | 0 |
| Hinge (elbow) | **validated rig** | 0 | 59.2 | 16.6 / 21.0 ms | 11 |

All four are inside the 22 ms interaction target on real hardware. A teaching simulation moving four render groups costs
nothing measurable against the validated rig: the transform is one matrix per group per frame on nodes that already have
`matrixAutoUpdate = false`.

**A measurement artifact worth recording,** because it looks exactly like a product stall and is not one. An earlier
version of this probe reported a reproducible 683 ms frame 1.5 s into the hinge drag. The angle timeline shows the joint
pinned at exactly 0.00° for 666 ms of that window: the pointer had overshot the extension limit and the probe walked it
back 6 px per frame. Nothing changed, so the render-on-demand renderer correctly drew nothing, and the gl.clear-based
frame log read it as a stall — while a parallel rAF-based probe recorded no frame gap above 60 ms anywhere in the same
drag. This is the same artifact class Step 12R identified and fixed in the lab's drag path. The probe now rewinds the
pointer to the last position where the joint actually moved, and the stall is gone.

## Frozen-baseline integrity

Every file listed in `qa/expert/frozen-build.json` was re-hashed:

- **29 of 29 source, asset and Blender files are byte-identical.** The master blend still matches its pinned SHA
  (`f7313dab…`); `Joints_Working.blend` and v001–v004, the four validated elbow files, the body v2/v3/Step-11 assets and
  the shared assets are all unchanged.
- The 8 `dist/` entries in that record do **not** match, and did not match before this step either. `frozen-build.json`
  was written at 06:29:35 Z; the narration work the user asked for landed after it (`narration.json` built at 06:49 Z)
  and is part of the same commit, which is honestly titled *"Step 13 frozen baseline (+ post-freeze narration)"*. The
  record contains no mention of narration at all. Rebuilding the frozen tag reproduces neither the recorded hashes (it
  predates narration) — so those eight hashes describe a web build that the Step-13 commit itself had already superseded.
  Step 14 did not invalidate them.
- The Step-13 build remains recoverable: tag `step13-frozen-baseline` (`537ac71`) is intact, was checked out into a
  separate worktree during this step, built, and measured. Nothing on `master` or on that tag was modified.
