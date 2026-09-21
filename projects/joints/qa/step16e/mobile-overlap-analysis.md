# Mobile overlap analysis — Step 16E

The Step-16D visual pass found that on a phone the exploration panel sits over the joint the learner is asked to move.
This document reproduces that on the `f3c2ed2` build and traces it to its cause before anything was changed.

Raw data: `qa/reports/step16e.mobile_overlap.before.json` (the build at `f3c2ed2` plus two read-only QA hooks) and
`qa/reports/step16e.mobile_overlap.after.json`. Script: `qa/step16e/reproduce_mobile_overlap.mjs`.

---

## 1. Reproduced

For every required width and every exploration, opened from its button the way a learner opens it, the script
recorded:

- the panel's bounds;
- the projected bounds of the target (the parts the learner moves);
- the camera distance;
- the composition in force;
- what `document.elementFromPoint` returns at the joint site.

| Width | fixed | pivot | ball | hinge | What a pointer at the joint site hits |
|---|---|---|---|---|---|
| 320×844 | **100 %** covered | **100 %** | **100 %** | **100 %** | the panel, in all four |
| 360×800 | **100 %** | **100 %** | **100 %** | **100 %** | the panel, in all four |
| 390×844 | **100 %** | **100 %** | **100 %** | **100 %** | the panel, in all four |
| 412×844 | 0 % | **92 %** | **100 %** | **78 %** | the panel in three of four |
| 430×932 | 0 % | 0 % | **46 %** | **50 %** | the canvas |
| 768×1024 | 0 % | 0 % | 2 % | **27 %** | the canvas |
| 1024×768 | **10 %** | 0 % | 0 % | 0 % | the canvas |
| 1280×800 | 0 % | 0 % | 0 % | 0 % | the canvas |
| 1440×900 | 0 % | 0 % | 0 % | 0 % | the canvas |

*Covered* is the share of the target's projected box that lies under the panel.

At 390×844, the width the brief names:

| | |
|---|---|
| Top bar | y 0–80 |
| Exploration panel | y 163–574 (hinge) to 212–574 (fixed), a 90 %-opaque card |
| Player | y 600–844, **244 px**: the chapter strip wraps to two rows |
| Joint site | projected to (195, 253), **inside the panel** in all four explorations |
| Target size | the skull cap **37 px** tall (4.4 % of the height); the head **35 px** |
| Could the learner see the target while the task was active? | **No.** In the fixed exploration the frame showed the label, the card, and the skeleton's legs below it |

## 2. Traced — three causes that compound

### 2.1 The reserved band was a constant, and the UI had outgrown it

`AppVideoRuntime.composeLift()` reserves a fixed fraction at the bottom of a narrow screen for an open panel: **0.40**.
The subject is composed into the remaining 60 %, so its centre lands at 30 % of the height — y 253 on an 844 px
screen, which is exactly where the site was measured.

That constant dates from the Step-11/14 panel. The panel has since gained a status line, a task, an instruction, an
explanation and a key hint, and it sits on top of a 244 px player. Together, the top bar, the panel and the player
now take **68–78 %** of a 390×844 screen, not 40 %. The top bar was never counted at all.

### 2.2 The old composition shrank the subject along the wrong axis

`applyShift()` scaled the subject by `(h − lift) / h`, whichever side the framing had been fitted to. A site
framing fits its sphere to the viewport's **shorter** side. In portrait that is the width, and the 506 px band above
the reserved 40 % was taller than the 390 px width. The ×0.6 shrink therefore bought no clearance; it only made the
target smaller.

### 2.3 The view offset silently changed the camera's aspect

The old composition widened the virtual frame to `h + lift` pixels and rendered its lower part. three.js's
`PerspectiveCamera.setViewOffset(fullWidth, fullHeight, …)` also sets **`camera.aspect = fullWidth / fullHeight`**.
At 390×844 the aspect became 390 / 1182 = **0.33** instead of 0.46.

`openExplore()` applied that composition *before* asking the director for the exploration's framing. The framing was
then fitted for a 0.33 aspect, so the camera stood **1.39× further back** than the exploration's own framing sphere
requires:

| 390×844, fixed exploration (sphere radius 0.30 m, FOV 32°) | Camera distance |
|---|---|
| The fit for the real aspect, 0.462 | 2.285 |
| The fit for the aspect the old offset left behind, 0.330 | **3.185 — measured** |

This is also the part of the Step-16D finding that read as "the camera pushes back aggressively on narrow screens".

**Combined at 390×844:** a subject ×0.6 smaller than it needed to be, about 1.4× further away than it needed to be,
centred on a line the panel covered.

## 3. What was *not* the cause

| Suspect | Finding |
|---|---|
| The framing spheres or the delivery manifest | Unchanged, and not involved. The sphere radius is `SITE_SCALE_M × scale`, exactly as authored |
| An anisotropic stretch from the view offset | Checked numerically: the projected sphere is round (v/h ratio 1.000). three.js compensates by setting the aspect, which is what caused 2.3 |
| Input or hit-testing in the panel | The panel correctly takes pointer events over its own area. The problem was that its area was over the joint |
| The Step-16C orbit lock | Intact: `orbitEnabled` is `false` for every open exploration at every width |

## 4. A related path found while tracing

The runtime's resize hook re-framed the **shot** underneath an open exploration, while the exploration's panel stayed
on screen. Rotating a phone mid-task would have dropped the learner back into the film's framing. The fix relies on
composition surviving a resize, so this path was corrected with it. See
[camera-composition-review.md](camera-composition-review.md) §4.
