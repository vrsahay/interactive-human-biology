# Visual regression — Step 16C

Captured at 1280×800 with the real GPU by `qa/step16c/capture_visual_set.mjs`. Every exploration capture is paired with
a measurement taken at the same moment, so "the context stayed still" is a number as well as a picture.

All frames are in `qa/visual/step16c/`.

---

## 1. The explorations: target moves, context stays still

| Capture | Frames | Groups that moved | Unexpected | Camera moved |
|---|---|---|---|---|
| **Ball-and-socket** | `ball_1_before` · `ball_2_mid` · `ball_3_after` | 4 (humerus, radius, ulna, the 27 hand bones) | **0** | **0** |
| **Pivot** | `pivot_1_before` · `pivot_2_mid` · `pivot_3_after` | 3 (skull, frontal + right parietal, teeth) | **0** | **0** |
| **Fixed** | `fixed_1_before` · `fixed_2_mid` · `fixed_3_after` | 1 (frontal + right parietal, ±0.5°) | **0** | **0** |
| **Hinge** | `hinge_1_before` · `hinge_2_mid` · `hinge_3_after` | 0 body groups — the validated rig moves its own asset | **0** | **0** |

**Ball-and-socket, read from the frames.** The upper-arm bone swings out to the side and the forearm and hand follow
it. The skull, mandible, cervical spine, every rib, the sternum, both collarbones, the right shoulder blade, the
pelvis, both femurs and the entire left arm are pixel-identical between `before` and `after`. The camera does not
move: the ribcage occupies exactly the same part of the frame in both.

**Pivot, read from the frames.** The skull turns — the face rotates towards the camera between `before` and `after` —
while the neck vertebrae under it, the shoulders, the ribcage and everything below hold position. The camera is
identical.

**Fixed.** The give is deliberately half a degree, so the two frames differ by almost nothing, which is the point the
exploration is making. The measurement separates "gave a little" from "did not move": the displaced group's world box
changes by 0.00034 world units, three times the 1 × 10⁻⁴ tolerance, while every other group changes by 0.

**Hinge.** Unchanged from every previous step, and verified unchanged.

## 2. The validated elbow at its reference poses

`hinge_elbow_000.png` · `hinge_elbow_045.png` · `hinge_elbow_090.png` · `hinge_elbow_145.png`

Driven through `JointController.setDof` and read back exactly: 0 / 45 / 90 / 145. `displacedGroups` is `[]` at every
one of them — the validated rig never displaces a body render group.

## 3. Narration and navigation states

| Capture | What it shows |
|---|---|
| `narration_shot_beginning` | a narrated shot at 300 ms: headline caption up, subtitle on its first sentence |
| `narration_mid_shot` | the same shot at 5 000 ms: subtitle advanced to the later sentence |
| `narration_shot_transition` | the first frames of the next shot: new caption, new clip, nothing left over |
| `navigation_chapter_jump` | after a jump to chapter 05 |
| `navigation_seek` | after a seek into the hinge chapter |
| `navigation_pause_resume` | after play then pause |

In each, the caption's `data-shot`, the timeline's `shotId` and the narration element's `src` name the same shot — the
same agreement the automated test asserts across six seek cases and four chapter jumps.

## 4. The exploration handover, in sequence

| Capture | What it shows |
|---|---|
| `handover_1_opening` | the panel opening — **after** the shot has finished speaking its line, not over the top of it |
| `handover_2_task` | the task stated: *Your task — Try to move the two skull bones apart*, `data-done="false"` |
| `handover_3_completion` | the task done from the keyboard alone: the confirmation line, `data-done="true"` |
| `handover_4_closing` | back in the lesson, panel gone, cue stopped, film clip re-positioned from lesson time |

## 5. The wider visual regression suite

`step12-motion-visual` re-run in full and passing:

- **Reduced motion across all 52 shots**: every shot cuts on entry, nothing dollies while playing, indicators are
  static at phase 0.125, captions have no transition.
- **Responsive captures and layout checks** at 390×844, 412×915, 768×1024, 1280×800 and 1440×900: nothing under the
  controls, nothing clipped, no horizontal scroll at any width.
- `film-visual` shot-by-shot captures and `reference-poses` deterministic pose snapshots: unchanged.

## 6. One test had to change

The reduced-motion traversal measures "did the camera move while this shot played" by sampling 700 ms after arrival.
Three beats now hand the learner a panel on arrival — the three exploration handovers and the recall — and opening a
panel moves the camera to the site *by design*. The traversal now closes any such panel and re-seeks to the shot before
it measures, so it measures the shot's own camera behaviour rather than an authored handover move. Without that it was
reading `recall.challenge` as a 3.01-unit dolly.
