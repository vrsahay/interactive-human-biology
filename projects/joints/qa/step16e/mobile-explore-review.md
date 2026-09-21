# Mobile Explore review — Step 16E

**The rule:** when an exploration asks the learner to move a joint, the learner can see that joint, the task panel
does not cover it, and it stays dominant. See → understand → interact, without guessing what is behind a card.

Root cause in [mobile-overlap-analysis.md](mobile-overlap-analysis.md). The fix in
[camera-composition-review.md](camera-composition-review.md). This document is the evidence that it holds.

**Everything below is viewport emulation in one desktop Chrome. No real phone or tablet was used.**

---

## 1. Definitions, fixed before the fix was measured against them

| Term | Definition |
|---|---|
| Target | the parts the learner moves: the exploration's declared render groups, or the validated elbow asset, projected to the screen |
| Interaction region | the target, clipped to the exploration's own framing circle (its framing sphere around the joint site, projected) and to the viewport. This is what the exploration is authored to show; a hand hanging beyond that radius is cropped off the bottom of the screen by the same framing on desktop |
| **Covered** | the share of the interaction region's area that lies under the panel. **Pass ≤ 2 %** |
| **Interactable** | `document.elementFromPoint` at the grip point (the joint site, or the forearm for the elbow) returns the canvas, **and** a real mouse drag starting there moves the target |
| **Dominant** | prominence (the region's longer side ÷ the viewport's shorter side) is **≥ 0.8 ×** its value at 1280×800, the framing that was reviewed; and the framed circle's diameter is **≥ 50 %** of the viewport's shorter side |

## 2. Required widths — the result

`step16e-mobile` test 1: 9 widths × 4 explorations = **36 cases, all pass**.

| Width | Max covered | Grip hits | Lowest parity | Smallest control | Labels hidden / off screen | Horizontal scroll |
|---|---|---|---|---|---|---|
| 320×844 | **0 %** | canvas ×4 | 0.88 (hinge) | ≥ 44 px | 0 / 0 | no |
| 360×800 | **0 %** | canvas ×4 | 0.81 (ball) | ≥ 44 px | 0 / 0 | no |
| **390×844** | **0 %** | canvas ×4 | 0.91 (pivot) | ≥ 44 px | 0 / 0 | no |
| **412×844** | **0 %** | canvas ×4 | 0.86 (pivot) | ≥ 44 px | 0 / 0 | no |
| 430×932 | **0 %** | canvas ×4 | 1.03 | ≥ 44 px | 0 / 0 | no |
| 768×1024 | **0 %** | canvas ×4 | 0.83 (ball) | ≥ 44 px | 0 / 0 | no |
| 1024×768 | **0 %** | canvas ×4 | 1.00 | ≥ 44 px | 0 / 0 | no |
| 1280×800 | **0 %** | canvas ×4 | 1.00 (reference) | ≥ 44 px | 0 / 0 | no |
| 1440×900 | **0 %** | canvas ×4 | 1.00 | ≥ 44 px | 0 / 0 | no |

The task line is visible and inside the viewport, and no DRAFT badge is visible, in all 36 cases.

### Before and after at the two named widths

| | 390×844 before | 390×844 after | 412×844 before | 412×844 after |
|---|---|---|---|---|
| Explorations whose target was under the panel | **4 of 4** (100 %) | **0 of 4** | **3 of 4** (78–100 %) | **0 of 4** |
| A pointer at the joint site reached | the panel, 4 of 4 | **the canvas, 4 of 4** | the panel, 3 of 4 | **the canvas, 4 of 4** |
| Skull target height (fraction of screen) | 0.044 | **0.100** (2.3×) | 0.047 | **0.106** (2.3×) |
| Head (pivot) | 0.041 | **0.084** (2.0×) | 0.043 | **0.084** |
| Arm (ball) | 0.122 | **0.254** (2.1×) | 0.129 | **0.254** |
| Elbow asset | 0.241 | **0.532** (2.2×) | 0.255 | **0.534** |
| Player during the exploration | visible, 244 px | stepped aside | visible | stepped aside |

## 3. Every state, not only the opening frame

`qa/step16e/capture_explore_states.mjs` → `qa/visual/step16e/` and `qa/reports/step16e.explore_states.json`.

- **Widths:** 390×844, 412×844, 1280×800 and 1440×900.
- **Explorations:** all four.
- **States:** before movement, task in progress, **mid-drag with the button held**, and completed.
- **Frames:** 64 in total.

| Check, over all 64 frames | Result |
|---|---|
| Interaction region under the panel | **0 %** in every frame |
| Grip point reaches the canvas | **64 / 64** |
| Site labels hidden behind the panel / off screen | **0 / 0** |
| DRAFT badges | **0** |
| Horizontal scroll | **none** |
| Task confirmed done in the completed frame | **16 / 16** |

## 4. Pointer and isolation — the target takes the gesture, nothing else does

`step16e-mobile` test 2: at 390×844, 412×844 and 1280×800, for each exploration, a real mouse drag **that starts on
the target**:

| Exploration | Moved (390) | Moved (412) | Camera moved | Context groups moved | Covered, mid-drag |
|---|---|---|---|---|---|
| Fixed | 0.5° (resists by design; the attempt registers) | 0.5° | **0** | **0** | **0 %** |
| Pivot | 18° | 18° | **0** | **0** | **0 %** |
| Ball-and-socket | 30° | 30° | **0** | **0** | **0 %** |
| Hinge (validated) | 56.4° | 56.4° | **0** | **0** | **0 %** |

**The hinge case is the strict one.** The validated elbow's own drag gesture only starts if the pointer lands on a
draggable structure, the forearm, and the test starts there. The panel does not steal the gesture: `elementFromPoint`
at the grip is the canvas. OrbitControls does not steal it either: `orbitEnabled` is `false` and the camera moved
exactly 0. Unrelated anatomy stays fixed, with every non-declared group's world matrix within 1 × 10⁻⁴.

## 5. Per exploration, as the brief lists them

| | Acceptance | Result |
|---|---|---|
| **Fixed** | target visible · task visible · attempt without unrelated movement | skull fills the band above the card at 390; task on screen; attempt registers; 0 context groups moved |
| **Pivot** | neck structures visible · task visible · rotation obvious | head and neck in the band; 18° from one drag, 40° goal reached from the keyboard; the head turns against a still torso |
| **Ball-and-socket** | shoulder not covered · arm seen moving against the torso | shoulder at the band centre, arm and hand above the card at rest and when raised (`390_ball_3_mid.png`) |
| **Hinge** | elbow visible · validated DOF unchanged · 0/45/90/145 unchanged | elbow at the band centre; forearm raised to 88° fully above the card (`390_hinge_4_done.png`); `reference-poses` and `gate3-pose-consistency` pass; the elbow's assets are byte-identical |

## 6. Round trip

Returning to the film on a phone restores the shot exactly: camera delta **0** and an identical composition for all
four explorations at 390×844 (`step16e-mobile` test 4). The old code recomputed the shot under the panel's
composition, so this is stricter than before.

## 7. What a learner on a phone now sees

The joint is in the top half of the screen and the card is in the bottom half. Nothing is behind the card that the
card asks about. The film's controls step aside while the film is paused, and come back, with focus, when the learner
returns. On a desktop the subject is centred in the space beside the panel instead of partly behind it.
