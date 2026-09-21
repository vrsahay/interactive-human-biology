# Explore isolation — review, per joint

What a learner now sees in each exploration, and the measurement behind it.
The rule and the tolerance are in `transform-invariant.md`; the cause is in `explore-root-cause.md`.

---

## What changed

One thing, at the ownership level:

> **While an exploration is open, the pointer belongs to the joint.** `App.setOrbitLocked(true)` is taken by
> `AppVideoRuntime.openExplore()` and released by `closeExplore()`. `OrbitControls` cannot be re-enabled while the lock
> is held, because the callback the InteractionController uses is `enabled && !orbitLocked`.

Nothing else was touched. No group membership changed, no scene-graph parent moved, no camera framing was adjusted to
hide anything, and nothing was hidden with opacity or visibility. The render-group transforms were already correct and
are unchanged — see the measurement in `explore-root-cause.md` §2a.

---

## Ball-and-socket — the shoulder

**What the learner sees.** The upper-arm bone swings out from the shoulder, taking the forearm and hand with it. The
shoulder blade, collarbone, ribcage, spine, skull, pelvis, legs and the opposite arm stay exactly where they are.

Captures: `qa/visual/step16c/ball_1_before.png`, `ball_2_mid.png`, `ball_3_after.png` — identical body, identical
camera, arm out to the side.

| Moves | Stays still |
|---|---|
| `body.humerus_right` | everything else — 31 render groups |
| `body.radius_right` | including `body.scapula_right`, the socket side of this very joint |
| `body.ulna_right` | |
| the 27 right wrist and hand bones | |

Measured, after a pointer drag **and** a stepped rotation:

```
body.scapula_right  0      body.humerus_left  0      body.frontal_bone  0
body.mandible       0      body.hip_bone_right 0     body.femur_right   0
body.atlas_c1       0      camera position     0     camera target      0
```

Every one of the structures the brief names is zero to the measurement's precision.

Still `status: "teaching-simulation"`, still badged *Teaching simulation*, still carrying "This shows the movement
pattern. The bones are real; the movement is a demonstration." No new GLB, no shoulder rig.

## Pivot — the top of the neck

**What the learner sees.** The skull turns on the spot. The two neck bones under it, the rest of the spine, the
ribcage, the shoulders and everything below stay put.

Captures: `pivot_1_before.png`, `pivot_2_mid.png`, `pivot_3_after.png`.

| Moves | Stays still |
|---|---|
| `skeleton.015.bone.closeup.skull` — 22 skull bones | `body.atlas_c1`, `body.axis_c2` — the bone it turns on |
| `skeleton.016…fixed.skull` — frontal + right parietal | the rest of the spine, thorax, limbs, pelvis |
| `skeleton.033.teeth.closeup.skull` — 28 teeth | 32 context groups in total |

3 groups moved, 0 unexpected, camera 0.

Still a teaching simulation. No C1/C2 rig was created, and nothing claims validated biomechanics: the words say one
bone turns on another and no more.

## Fixed — the skull

**What the learner sees.** Pushing gives about half a degree, and it springs straight back. Nothing else in the body
responds at all.

Captures: `fixed_1_before.png`, `fixed_2_mid.png`, `fixed_3_after.png`.

| Moves | Stays still |
|---|---|
| `skeleton.016.bone.closeup.skull.fixed.skull` — `body.frontal_bone` + `body.parietal_bone_right`, ±0.5° | the other 34 groups, including the rest of the skull |

1 group moved, 0 unexpected, camera 0. The displacement at the limit measures 0.00034 world units — three times the
1 × 10⁻⁴ tolerance, so the test can tell "it gave a little" from "it did not move", which is exactly the point the
exploration is making.

## Hinge — the elbow

**Unchanged, and verified unchanged.** The learner drives the validated rig through `JointController.setDof` and
nothing else.

| | |
|---|---|
| DOF | one, `flexion`, 0–145° |
| Reference poses | 0 / 45 / 90 / 145 reached exactly |
| `displacedGroups` | **`[]`** — the validated rig never displaces a body group |
| Status | `validated-rig` |
| Geometry, pivot, axis, neutral offset, controller, manifest, GLBs | untouched |

Captures: `hinge_elbow_000.png`, `hinge_elbow_045.png`, `hinge_elbow_090.png`, `hinge_elbow_145.png`.

The only change that reaches the elbow exploration is the orbit lock: a drag that misses the bone no longer swings the
camera. The context stays still there too.

---

## Summary

| Exploration | Groups measured | Declared targets | Moved | **Unexpected** | Camera |
|---|---|---|---|---|---|
| fixed | 35 | 1 | 1 | **0** | **0** |
| pivot | 35 | 3 | 3 | **0** | **0** |
| ball-and-socket | 35 | 4 | 4 | **0** | **0** |
| hinge | 35 | 0 (rig) | 0 | **0** | **0** |

Before Step 16C the same drag moved the camera **0.74 to 2.28 world units** in every one of them.
