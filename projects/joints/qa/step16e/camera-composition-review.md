# Camera composition review — Step 16E

What changed in how an open exploration is composed, why it is the smallest fix that satisfies the rule, and what it
leaves alone.

---

## 1. Options considered

The brief lists five options (A–E). Each was weighed against one rule: *the learner can see the target, the panel
does not cover it, and the target stays dominant.*

| Option | Verdict |
|---|---|
| **A. Responsive panel placement** | **Used, narrow layouts only.** The film is paused while exploring and the panel already has its own Reset and Return. The 244 px player therefore steps aside, and the panel takes its place at the bottom of the screen. This alone gives the joint back 244 px at 390×844. It also removes the second "Return to the lesson" that the player's toggle showed, which Step 16D had noted |
| B. Compact mobile task panel | **Used sparingly.** On narrow layouts the elbow's orange angle readout is visually hidden, because the slider directly below shows the same number. It stays in the accessibility tree as the live status. On portrait tablets (600–900 px) the same content sits in two columns: explanation beside the slider, key hint beside the buttons. No text was removed and the reading order is unchanged |
| **C. Compose into the free region** | **Used — the core of the fix.** The subject is composed into the band the panel actually leaves, measured from the panel's own rectangle. The fixed 40 % guess is gone |
| D. Collapse the panel while dragging | **Not used.** It would help during a drag but not in the "task state" before one, which the brief also requires. Under A + C the panel never covers the target in any state, so a collapse would add motion and a hidden-content state for no gain |
| E. Reposition the panel from the target projection | **Not used.** The brief warns it is only acceptable if predictable. A panel that moves around with the model is not predictable |

## 2. The composition, as it is now

`AppVideoRuntime.composeForExplore()` runs when an exploration opens, when its panel reports a new rectangle
(`setExploreReserve`), and on resize.

| Layout | Rule |
|---|---|
| **Narrow** (< 900 px) | The band runs from the bottom of the top bar to 12 px above the panel. The subject is centred in that band and is **never magnified**. It is reduced only if the band is shorter than the side the framing was fitted to: `scale = min(1, min(width, band) / min(width, height))` |
| **Wide** (≥ 900 px) | The panel sits beside the subject, so the subject is centred horizontally in the width the panel leaves. The scale is **unchanged** (1.0) |

It is applied through a view offset whose virtual frame is the stage itself (`fullWidth = width`,
`fullHeight = height`). The camera's aspect therefore stays the stage's own aspect, and cause 2.3 cannot recur.

Before the panel has measured itself (the first frame after opening), the same projection is used with the old 40 %
estimate, so the exploration's framing is computed for the true aspect from the very first frame.

## 3. The camera itself — distance, framing, delivery bounds

| | |
|---|---|
| Framing sphere | **Unchanged**: radius `SITE_SCALE_M × camera.scale`, from the lesson, for every exploration |
| Exploration scales (6 / 11 / 12 / 6) | **Unchanged** |
| Delivery manifest, close-up spheres, GLBs | **Unchanged, byte-identical** |
| Camera distance on desktop (≥ 1024 px) | **Unchanged**: 1.088 / 1.995 / 2.177 / 1.088 at every desktop width |
| Camera distance on a phone | **Closer**: 3.185 → 2.284 at 390×844. That is back to the fit the exploration's own sphere asks for, not beyond it |
| Is any narrow-layout camera closer than the reviewed desktop framing? | **No.** Every narrow-layout distance is still greater than its desktop distance: fixed 2.284 vs 1.088, pivot 4.187 vs 1.995, ball 4.568 vs 2.177, hinge 2.284 vs 1.088 |

The brief's warning was against solving this by moving the camera further back, and this fix moves no camera further
back at any width. On phones the camera moved *closer*, but only to the distance the exploration's own framing
sphere asks for at the true aspect. It never goes tighter than the framing already reviewed on desktop.

Orientation is unchanged: same view direction, same elevation, same target point. No anatomy the framing includes is
cropped: the framed circle is placed inside the free band, whose shorter side is its diameter.

## 4. Two paths corrected alongside

**Resize during an exploration.** Previously the resize hook re-placed the camera on the *shot* underneath, with the
panel still open. It now re-frames the exploration and re-composes it.

**Returning to the film.** A shot's camera is computed from the camera's current aspect, which the composition sets.
On return, the shot's own composition is applied first, so the film comes back to the framing it has when it plays.
The old code computed it under the panel's 40 % composition. A new test,
`step16e-mobile` "returning from an exploration on a phone restores the shot's framing exactly", measures a camera
delta of **< 1 × 10⁻³** and an identical composition for all four explorations at 390×844.

## 5. What was left alone

- **Shot composition during the film** (`composeLift` 0.28 / 0.40 for guided shots) is unchanged. It has the same
  aspect side-effect. But it governs every mobile shot in the lesson, it is not what this step was asked to fix, and
  changing it would re-frame 52 shots. Recorded as a follow-up in the status file.
- **The recall panel** still uses the old composition. It is not an Explore task and it is outside this brief. Its
  behaviour is unchanged.
- **Desktop scale** is unchanged. The only desktop difference is that the subject is centred in the space right of the
  panel. At 1280×800 the joint site moves from x = 640 to x = 852, and at 1024×768 this clears a 10 % overlap that
  existed before.
