# Step 15B regression report

Branch `step15b-learner-clarity`, from the `step14b-complete` candidate (`d6ec8d8`). Chrome 152 headless with the real
GPU (ANGLE D3D11), same machine as every previous step.

## Result

| Suite | Result |
|---|---|
| Typecheck (`tsc` app + tests) | clean |
| Unit (`vitest`) | **97 passed** |
| End-to-end (`playwright test`) | **83 passed, 0 failed** (75 before this step + 8 new) |
| Step-15B clarity proofs | 8 passed |
| Console errors across the suite | 0 |
| Frozen source and asset files | **29 of 29 byte-identical** |
| Master blend | `f7313dab…`, matches its pin |

## The eight clarity proofs

`tests/e2e/step15b-clarity.spec.ts`. Each one checks the shipped content **and** the running build.

| # | Proves |
|---|---|
| 1 | No caption carries a reviewer-language disclaimer, no note is used twice, and the persistent status is on screen for every shot that shows indicators — including uncaptioned ones |
| 2 | No caption contains humerus, radius, ulna, scapula, atlas, femur, tibia or patella, and those labels are still laid out on the model in the shot that needs them |
| 3 | The first caption to say "axis" explains the line before naming it, the axis overlay is actually rendered in that shot, and no earlier shot uses the word |
| 4 | The pivot chapter has a bones beat with no indicator and a rotation beat with one; both light exactly `body.atlas_c1` and `body.axis_c2`; they are framed differently; the words say "on top of" and "turns around" and never "dens" |
| 5 | Flexion and extension are attached to the action that produces them, and both reappear in the exploration where the learner performs them |
| 6 | No shot in the lesson is silent; `hinge.return` carries a caption and runs 4300–4800 ms |
| 7 | Indicators are still declared per shot, the explore statuses are still `validated-rig` / `teaching-simulation`, `data-status` is still on the panel, and the Sources dialog still carries "validated 3D rig", "schematic" and "fitted to this 3D model" |
| 8 | No caption contains *validated*, *rig*, *schematic*, *scientifically* or *accurate*; each teaching simulation still says so on screen; the validated rig's badge says none of *validated*, *accurate*, *real*, *correct* |

## Tests that had to change, and why

**One.** `tests/e2e/step14b-lesson.spec.ts` §11 allowed `hinge.return` as the single documented silent shot. It is no
longer silent, so the exception list is now asserted empty — a stricter assertion than before.

**One unit test rewritten, deliberately.** The Step-13 honesty invariant was *"every captioned shot that shows schematic
indicators carries a schematic note"*. That rule is what put reviewer language under 19 captions, and it said nothing
about uncaptioned shots. It is replaced by two checks that are together stronger:

- content side (`tests/unit/video-lesson.test.ts`): indicators are still declared per shot; the persistent status string
  exists, mentions movement and stays under 14 words; both reviewer-language strings still exist in the locale; **no**
  caption carries one; and every remaining note is used exactly once.
- runtime side (`step15b-clarity` §1): whenever indicators are on screen, the status is on screen — for every such shot,
  captioned or not.

Everything else passed unchanged.

## Elbow regression

Unchanged and re-verified: `gate3-pose-consistency`, `reference-poses` (0 / 45 / 90 / 145), `step12-delivery` handover
and LOD behaviour, `film` drag behaviour, `step13-bugsweep`, and the Step-14 explore suite asserting the hinge
exploration drives `flexion` with `displacedGroups === []`.

`git diff step14b-complete HEAD -- public/assets/joints blender public/assets/body public/assets/shared` → **0 files.**
The pivot, fitted axis, neutral offset, DOF, range, geometry, manifest and controller are untouched. The only thing that
changed about the elbow is the words above it.

## Accessibility

Re-run in full; results unchanged, plus the new text is now measured.

| Check | Result |
|---|---|
| axe — 12 lesson/dialog states at 1280×800 and 390×844 | **0 violations** |
| axe — 12 explore/recall panel states at both widths | **0 violations** |
| Measured contrast over the rendered frame — lesson text | 237 runs, **0 below threshold** |
| Measured contrast — explore and recall panels | 104 runs, **0 below threshold** |
| **New:** persistent teaching status (`.film-teachmark`) | 4 runs, lowest **7.42:1** (required 4.5:1) |
| **New:** exploration teaching note (`.film-explore__teaching`) | 6 runs, lowest **9.28:1** |
| Keyboard-only journey: all nine chapters, the guided check, the end announced | pass |
| Reduced motion across all 40 shots | pass |
| Target size ≥ 44 px, reflow at 320 px | pass |
| Phone layout at 390 and 412 px: no panel under the controls, nothing clipped, no horizontal scroll | pass |

**No accessible status information was lost.** The persistent status is ordinary text in the document, so a screen reader
reaches it in normal flow; `data-status` is still on the exploration panel; the teaching-simulation badge still says so
in words. Both new elements were added to the measured-contrast sweep so they cannot drift.

## Performance

A/B against the `step14b-complete` build, rebuilt from its tag, alternating on the reference profile
(`igpu-broadband`: 1280×800, DPR 1, no CPU throttle, 50 Mbps emulated).

| Pass | Build | CPU bench (ms) | First 3D (ms) | Intro (ms) | Bytes before first 3D | Elbow ready (ms) | Elbow drag | Orbit | Recap |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Step 14B | 358 | 2000 | 2942 | 567 KB | 1398 | 59.8 fps / p95 18.3 ms | 53.0 fps | 60 fps |
| 1 | Step 15B | 125 | 712 | 1255 | 568 KB | 628 | 60.0 fps / p95 18.2 ms | 59.4 fps | 60 fps |
| 2 | Step 14B | **81** | 532 | 967 | 548 KB | 466 | 60.0 fps / p95 17.1 ms | 58.7 fps | 60 fps |
| 2 | Step 15B | **81** | 522 | 972 | 548 KB | 490 | 60.0 fps / p95 17.1 ms | 59.3 fps | 60 fps |

Pass 2 is the comparable one — both builds at a CPU benchmark of 81 ms. **No measurable difference:** first 3D within
10 ms, intro within 5 ms, drag identical, orbit within 0.6 fps, bytes identical. Pass 1 ran on a loaded machine and its
absolute numbers are not usable, as in every previous step.

Bytes before the first 3D frame are unchanged at 548 KB: this step added **no asset**. Narration grew from 765 KB to
761 KB across 56 clips (one new shot clip, one trimmed, several re-synthesized), fetched per clip after the film starts.

**The Step-12 emulated phone ×4 misses are unchanged and still open** — first meaningful 3D 2742 ms against 2500 ms,
drag p95 45.1 ms against 22 ms — and no real Android device or iPad has been measured. Nothing here is a mobile
certification.

## Content shape

| | Step 14B | Step 15B |
|---|---|---|
| Chapters | 9 | 9 (unchanged) |
| Shots | 39 | 40 (`pivot.bones` added) |
| Film duration | 4:35 | 4:40 |
| Captions carrying a technical disclaimer | 19 | **0** |
| Small-print notes under captions | 22 | 2 |
| Silent shots | 1 | **0** |
| Narration clips | 38 shots + 16 cues | **40 shots + 16 cues**, 0 overruns |
| Locale strings | 194 | 198 |
| New/changed learner strings | — | 14 (all `draft-enrichment` or `ui`) |
