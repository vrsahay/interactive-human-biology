# Step 16C regression report

Branch `step16c-explore-isolation-audio`, from `step16b-teaching-depth-complete` (`1120d0e`). Chrome 152 headless with
the real GPU (ANGLE D3D11), same machine as every previous step.

## Result

| Suite | Result |
|---|---|
| Typecheck (`tsc` app + tests) | clean |
| Unit (`vitest`) | **98 passed, 0 failed** |
| End-to-end (`playwright test`) | **102 passed, 0 failed** (93 before this step + 9 new) |
| Step-16C invariants | 9 new tests |
| Console errors across the suite | 0 |
| Frozen source and asset files | **29 of 29 byte-identical** |
| Master blend | `f7313dab…`, matches its pin |
| Content, audio, GLBs, manifests, Blender | **not touched — `git diff` over all of them is empty** |

## The nine Step-16C invariants

`tests/e2e/step16c-invariants.spec.ts`. Each is written so that it fails if the defect returns.

| Test | Invariant | Proves |
|---|---|---|
| **A1** | A | For each of the four explorations: a real pointer drag changes no render group outside the session's declared targets, the camera position and target do not move, `orbitEnabled` is false while the panel is open and true again once it closes |
| **A2** | A | Driving each teaching simulation moves at least one group, every moved group is a declared target, and all 31–34 context groups keep their world matrix within 1 × 10⁻⁴ |
| **A3** | A | The structures the brief names — scapula, opposite humerus, frontal bone, mandible, hip bone, femur, atlas — move by exactly 0 during a shoulder drag |
| **B** | B | Over 2 833 samples of a playthrough including an exploration handover, the number of audible narration elements never exceeds 1 |
| **C** | C | After six seek cases (within a shot, into another, across chapters, exactly on a boundary, 1 ms before one, the lesson end) the timeline's shot, the caption's `data-shot` and the clip's `src` all name the same shot |
| **C2** | C | The same after four chapter jumps (03→05, 05→04, 06→01, 01→09); no stale clip, never two owners |
| **D** | D | At 15, 10, 5 and 4 fps, lesson time tracks the wall clock and the clip advances with lesson time |
| **E** | E | Inside an exploration the shot clip is silent and a cue owns the floor; on return the cue is stopped and ownership is released |
| **F** | F | One DOF `flexion` 0–145°, poses 0/45/90/145 exact, the only `validated-rig` exploration, `displacedGroups === []` |

## Measured, before and after

### Explore isolation

| Exploration | Camera moved per drag, before | after | Unexpected groups, before | after |
|---|---|---|---|---|
| fixed | 1.14 world units | **0** | 0 | **0** |
| pivot | 2.10 | **0** | 0 | **0** |
| ball-and-socket | 2.28 (0.74 through the UI path) | **0** | 0 | **0** |
| hinge | 1.14 | **0** | 0 | **0** |

The render-group transforms were already correct and are unchanged: 0 of 35 groups ever moved outside the declared
targets, before or after. What was wrong was input ownership, and what the learner saw was the camera.

### Narration

| | Before | After |
|---|---|---|
| Samples with two owners audible | 196 (≈3.9 s) | **0** |
| `currentTime` assignments on the first clip, first 9 s | 353 | **2** |
| `seeking` / `seeked` / `waiting` cycles on it | 353 each | **2 each** |
| Stalls (clip reports playing, position frozen ≥ 200 ms) | 5.9 s + 1.4 s + 1.3 s | **one, 0.4 s** |
| Worst clip-vs-lesson offset per shot | 6.20 / 3.65 / 1.77 s | **0.29–0.34 s on all 10 shots** |
| Stale clip after a transition | 0 | **0** |

### Frame drop

| fps | Lesson ÷ wall clock | Narration ÷ lesson |
|---|---|---|
| 15 | 0.996 | 1.003 |
| 10 | 1.002 | 0.998 |
| 5 | 0.962 | 1.040 |
| 4 | 0.988 | 1.010 |

## Tests that had to change, and why

Three files. None weakens an invariant; two of them were passing for the wrong reason.

**1. `tests/e2e/step12-a11y.spec.ts`** — *"live announcements: selection in Explore is announced"*. It opened the hinge
chapter's **joint exploration** and clicked a bone. A joint exploration sets `picking: false` deliberately — the
learner is there to move the joint, not to select bones — so selection cannot happen inside one. The test was passing
on a race: `openExplore()` is async and the click was landing before the policy change did. It now uses **free-look
Explore**, which is the mode the announcement belongs to and the mode Step 12 wrote it for, and asserts
`picking === true` before clicking so it cannot drift back into a race. The assertion about the live region is
unchanged.

**2. `tests/e2e/step12-motion-visual.spec.ts`** — the reduced-motion traversal measures "did the camera move while this
shot played" 700 ms after arrival. Three beats now hand the learner a panel on arrival (the three exploration
handovers and the recall), and opening a panel moves the camera to the site *by design*. The traversal now closes any
such panel and re-seeks to the shot before measuring, so it measures the shot's own camera behaviour. Without it,
`recall.challenge` read as a 3.01-unit dolly.

**3. `tests/e2e/step16b-teaching.spec.ts` §3** — the handover now fires only once the handover shot has finished
speaking, so the test reaches that shot near its end (`durationMs − 150`) instead of at 600 ms. Everything it asserts
is unchanged.

## Elbow regression

Unchanged and re-verified: `gate3-pose-consistency`, `reference-poses` (0 / 45 / 90 / 145), `step12-delivery` handover
and LOD behaviour, `film` drag behaviour, `step13-bugsweep`, the Step-14 explore suite, and Step-16C §F against the
running build.

`git diff` over `public/assets/joints`, `public/assets/body`, `public/assets/shared`, `blender`, `content` and
`public/assets/audio` → **0 files**. The geometry, hierarchy, pivot, axis, neutral offset, controller, `flexion` DOF
and 0–145° range are untouched.

## Accessibility

Full programme re-run: axe 0 violations across every state at both widths, measured contrast 0 below threshold for the
lesson text and for the explore/task/recall panels, keyboard-only journey, dialogs, reduced motion across all 52 shots,
44 px targets, 320 px reflow, responsive layout at 390 / 412 / 768 / 1280 / 1440. Details and the one test correction
are in `accessibility-review.md`.

## Performance

No asset was added or changed, so bytes before the first 3D frame are unchanged. The changes remove work rather than
adding it:

- the drift corrector now issues **2** `currentTime` assignments on the first clip instead of 353, and **2** media
  seek cycles instead of 353;
- `play()` is called only when the element is paused, instead of once per frame;
- `seekTo()` holds at most one `loadedmetadata` listener instead of accumulating them.

Against that, one clip ahead (~25 KB) is prefetched on each shot change, and the first clip is prefetched while the
landing card is on screen. Lazy loading is preserved — clips are still fetched per shot, not bundled.

`development performance measurements` passes as before. No A/B against the previous candidate was run, for the reason
recorded since Step 12R: this machine's CPU benchmark drifts by a factor of four between sessions, so a cross-session
number is meaningless.

## Files changed

| | |
|---|---|
| Engine | `src/engine/core/App.ts` (+24), `src/engine/video/AppVideoRuntime.ts` (+4), `src/engine/video/NarrationPlayer.ts` (+95), `src/engine/body/BodyLayer.ts` (+22, QA probe) |
| UI | `src/ui/video/FilmShell.tsx` (+29), `src/ui/video/filmQa.ts` (+10, QA hooks) |
| Tests | `tests/e2e/step16c-invariants.spec.ts` (new), `step12-a11y.spec.ts`, `step12-motion-visual.spec.ts`, `step16b-teaching.spec.ts` |
| QA | `qa/step16c/*`, `qa/visual/step16c/*`, `qa/reports/step16c.*` |
| **Not changed** | content, locale, schema, narration audio, GLBs, manifests, Blender, `qa/expert/step15`, `qa/expert/step15b` |

190 lines added, 14 removed across six source files and three specs.
