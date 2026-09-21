# Explore regression review — Step 16D

This step touched the exploration panel's layout (it now publishes its rectangle so labels are laid out clear of it)
and its task cue (which no longer repeats the drag instruction). Nothing else about an exploration changed, and the
Step-16C guarantees were re-verified rather than assumed.

---

## 1. Transform isolation — re-verified with pointer input

The brief asks for this to be checked with real pointer interactions, not only the QA API. `step16c-invariants` §A1
drags across the stage with the mouse, for each of the four explorations, and re-measures the live world matrix and
world bounding box of all 35 render groups plus the camera.

| Exploration | Groups measured | Declared targets | Moved | **Unexpected** | **Camera moved** |
|---|---|---|---|---|---|
| `explore.fixed` | 35 | 1 | 1 | **0** | **0** |
| `explore.pivot` | 35 | 3 | 3 | **0** | **0** |
| `explore.ball` | 35 | 4 | 4 | **0** | **0** |
| `explore.hinge` | 35 | 0 (the validated rig, not a body group) | 0 | **0** | **0** |

§A2 additionally drives each teaching simulation through the session and requires that **every** context group — 31 to
34 of them — keeps its world matrix within 1 × 10⁻⁴. §A3 checks the structures the Step-16C brief named for the
shoulder: scapula, opposite humerus, frontal bone, mandible, hip bone, femur, atlas — all **exactly 0**.

`orbitEnabled` is asserted `false` while a panel is open and `true` again the moment it closes, so the input-ownership
fix cannot regress silently.

**Target moves, context stays still.** No full-body camera swing from the same pointer event.

## 2. The validated elbow

Unchanged, and checked in three places in this run: `step16c-invariants` §F, `step16d-polish` §7/11, and the standing
`reference-poses` and `gate3-pose-consistency` suites.

| | |
|---|---|
| DOF | one, `flexion`, 0–145° |
| Reference poses | 0 / 45 / 90 / 145 reached exactly |
| `displacedGroups` while its exploration is open | **`[]`** |
| Status | `validated-rig` |
| Geometry, rig, pivot, axis, neutral offset, controller, manifest, GLBs | **untouched — `git diff` over the asset directories is empty** |

## 3. The panel itself

| | Before | After |
|---|---|---|
| Content | joint name · status badge · plain meaning of that status · **Your task** · how to move it · readout · what it demonstrates · keyboard hint · Reset · Return | unchanged |
| DRAFT badges in the panel | 0 | **0** |
| Sources controls in the panel | 0 | **0** |
| Site labels hidden behind it | **6 across 7 widths** | **0** |
| Spoken task cue | task + drag instruction | **task only** |

The status distinction the brief requires is intact: three explorations declare `teaching-simulation` and show the
*Teaching simulation* badge with its one plain line; the elbow declares `validated-rig` and shows *3D joint model*.
`step15b-clarity` §7 and §8 still assert both, and that no learner-facing text anywhere says "validated", "rig",
"schematic", "scientifically" or "accurate".

## 4. Guided tasks, unchanged

| Exploration | Task | Goal |
|---|---|---|
| Fixed | "Try to move the two skull bones apart." | any movement — it springs back |
| Pivot | "Turn the head as if you were looking over one shoulder." | 40° on the primary axis |
| Ball-and-socket | "Move the arm in two different directions." | 25° and 15° on the two axes |
| Hinge | "Bend the elbow until it is about half-way — around 90 degrees." | 85° on the validated DOF |

All four are still completable **from the keyboard alone**, still announce their confirmation, and still carry
`data-done` for the tests. The 90° check inside the hinge chapter is untouched, and so is the five-question recall
challenge.

## 5. What was re-run

`step14-explore` (entry, movement, reset, exit and the stated status for each of the four; one explore control and one
set of joint controls at a time; keyboard-only operation; an exploration never changes where the lesson is),
`step14-recall`, `step14-a11y`, `step14-responsive`, `step14b-lesson`, `step13-bugsweep`, `step16b-teaching` §3 and
`step16c-invariants` in full.
