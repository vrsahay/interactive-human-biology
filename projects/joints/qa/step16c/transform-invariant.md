# The Explore transform invariant

## The rule

> **While an exploration is open, only the render groups that exploration declares as its motion targets may change
> world transform. Nothing else in the body may move, and the camera may not orbit.**

Excluded from the rule, as the brief allows: the camera's authored framing move when the exploration opens, highlight
and dim states, site labels, and the teaching indicators. Those are presentation, not anatomy.

## How it is enforced

Three layers, of which only the third is new.

### 1. The content declares the targets

`ExploreConfig.motion.groups` lists the render groups the teaching simulation may displace. Build-time validation
(`checkExploreConfigs`) rejects a group id that is not in the body delivery manifest, and rejects a `dof` motion that
names any group at all — the validated rig drives its own asset and must never displace body groups.

### 2. The engine can only move those groups

`TeachingMotion.apply()` composes one matrix and hands it to `BodyLayer.setGroupTransform(groupId, matrix)` for each
declared group, and nothing else. `setGroupTransform` writes the group node's **local** matrix as
`displacement × delivered`, so a group is placed relative to where the delivery put it. Group nodes are siblings under
one parent and are never nested, so no group can inherit another's displacement. `clearGroupTransforms()` restores
every one of them on exit.

This part was already correct, and the Step-16C measurements confirm it: across all four explorations, driven through
their full range, **0 of 35 render groups moved outside the declared targets**.

### 3. The pointer belongs to the exploration (new in Step 16C)

`App.setOrbitLocked(true)` is taken by `AppVideoRuntime.openExplore()` and released by `closeExplore()`. While the lock
is held, `OrbitControls.enabled` is false and the `setOrbitEnabled` callback the InteractionController uses is
`enabled && !orbitLocked`, so nothing can turn orbiting back on for the duration of the session.

This is the layer that was missing. Without it a drag was consumed twice — by the exploration and by OrbitControls — so
the camera swung around the body while the target rotated. See `explore-root-cause.md`.

## How it is measured

`BodyLayer.groupWorldState()` returns, for every loaded render group, the node's **live world matrix** and the **world
bounding box of its meshes**, read from the scene graph. Not from the manifest: the manifest bounding box is static by
construction and cannot show a displacement, which is why the defect survived the Step-14 explore suite.

The test records that state plus the camera before an interaction, performs the interaction, records again, and
compares:

```
dMatrix = max |before.matrixWorld[i] - after.matrixWorld[i]|
dBox    = max |before.bbox[i]        - after.bbox[i]|
moved   = dMatrix > 1e-4  or  dBox > 1e-4
```

**Tolerance: 1 × 10⁻⁴ world units** (0.1 mm on this body, which is about 1.7 m tall). Chosen to be far below anything a
learner could see — the smallest real displacement measured in these explorations is 0.00034 world units for the
fixed joint's deliberate half-degree of give, three times the tolerance, and the ball-and-socket arm moves 0.73.

Camera movement is compared separately and must be **zero** during a drag, because a camera move is precisely what made
the context appear to move.

## What the tests assert

`tests/e2e/step16c-invariants.spec.ts`:

| Test | Assertion |
|---|---|
| **A1** | For each of the four explorations: a real pointer drag changes no group outside the session's declared targets; the camera position and target do not move; `orbitEnabled` is false while the panel is open and true again once it closes. |
| **A2** | For each teaching simulation: driving the motion moves at least one group, every moved group is a declared target, and **every one of the 31–34 context groups keeps its world matrix within tolerance**. |
| **A3** | For the shoulder specifically, the structures the brief names — scapula, opposite humerus, frontal bone, mandible, hip bone, femur, atlas — each measured through their own render group, move by **exactly 0**. |

A1 fails if any context group moves *or* if the camera orbits. A2 fails if nothing moves at all, which stops the test
passing vacuously.

## Measured result

| Exploration | Groups measured | Declared targets | Moved | Unexpected | Camera moved |
|---|---|---|---|---|---|
| `explore.fixed` | 35 | 1 | 1 | **0** | **0** |
| `explore.pivot` | 35 | 3 | 3 | **0** | **0** |
| `explore.ball` | 35 | 4 | 4 | **0** | **0** |
| `explore.hinge` | 35 | 0 (the rig, not a body group) | 0 | **0** | **0** |

Shoulder context, world bounding-box change after a drag **and** a stepped rotation:

```
body.scapula_right 0   body.humerus_left 0   body.frontal_bone 0   body.mandible 0
body.hip_bone_right 0  body.femur_right 0    body.atlas_c1 0
```

Before Step 16C the same drag moved the camera 0.74–2.28 world units in every exploration.
