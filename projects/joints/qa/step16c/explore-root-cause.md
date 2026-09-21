# Explore movement leakage — root cause

Measured against the running `step16b-teaching-depth-complete` build (`1120d0e`) **before any code was changed**.

---

## 1. What was reported

> In the Ball-and-socket Explore, moving the arm causes the surrounding/full skeleton context to move with it.

## 2. What was measured

### 2a. The transform hierarchy is clean — this is not a parenting bug

`qa/step16c/reproduce_explore_leak.mjs` opens each exploration, records the **live world matrix and world bounding box
of all 35 render groups** from the scene graph, drives the teaching motion through its full range, and re-measures.

| Exploration | Groups measured | Groups that moved | **Unexpected** |
|---|---|---|---|
| `explore.fixed` | 35 | 1 | **0** |
| `explore.pivot` | 35 | 3 | **0** |
| `explore.ball` | 35 | 4 | **0** |
| `explore.hinge` | 35 | 0 (the rig moves, not a body group) | **0** |

Group membership is also correct and tight:

| Group | Structures | Contents |
|---|---|---|
| `skeleton.005…` | 1 | `body.humerus_right` |
| `skeleton.004…` | 1 | `body.radius_right` |
| `skeleton.006…` | 1 | `body.ulna_right` |
| `skeleton.003.bone.closeup.elbow_r_core` | 27 | the right wrist and hand bones only |
| `skeleton.015.bone.closeup.skull` | 22 | skull bones (no vertebrae) |
| `skeleton.016.bone.closeup.skull.fixed.skull` | 2 | `body.frontal_bone`, `body.parietal_bone_right` |
| `skeleton.033.teeth.closeup.skull` | 28 | teeth only |

No group contains context anatomy. Group nodes are **siblings** under one parent (`BodyLayer.group`), never nested, so
no group inherits another group's displacement. The torso, spine, pelvis, opposite arm and neck vertebrae never change
world transform. **The hypothesis in the brief — a shared parent, bad group membership, inherited transforms — is
disproved by measurement.**

### 2b. What actually moves: the camera

`qa/step16c/reproduce_explore_drag2.mjs` opens each exploration and performs a **real pointer drag** across the stage,
the way a learner does, then measures the camera.

| Exploration | Interaction policy | Camera position moved | Teaching motion moved |
|---|---|---|---|
| `explore.fixed` | `passive` | **1.14** world units | 0° |
| `explore.pivot` | `passive` | **2.10** | 0° |
| `explore.ball` | `passive` | **2.28** | 0° |
| `explore.hinge` | `free` | **1.14** | 0° |

A second run through the UI path (`reproduce_explore_drag.mjs`), where the React drag handler is attached, shows the
ball exploration doing **both** at once: the four target groups rotate *and* the camera swings 0.74 units.

**That is the reported symptom.** The camera orbits around the body, so every bone sweeps across the frame. To a
learner it is indistinguishable from "the whole skeleton moved" — and it is worse than that, because the context and
the target move *together*, which destroys the very relationship the exploration exists to teach.

---

## 3. The root cause, exactly

**Two consumers share one pointer stream, and neither takes ownership.**

The chain, traced through the code:

1. `AppVideoRuntime.openExplore()` sets the interaction policy for a teaching simulation to
   `{ mode: "passive", picking: false, dofRange: {} }` (`src/engine/video/AppVideoRuntime.ts:398`).
2. `App.learnerOwnsJoint` is `this.interactionPolicy.mode !== "passive"` → **false**
   (`src/engine/core/App.ts:713`).
3. `App.dragTargetFor(structureId)` returns `null` immediately when `!this.learnerOwnsJoint`
   (`src/engine/core/App.ts:720`), so **no structure is ever a drag target during a teaching-simulation exploration**.
4. `InteractionController.pointerDown()` classifies a gesture as `"joint"` only when `dragTargetFor` returns a target;
   otherwise it classifies it as `"orbit"` (`src/engine/interaction/InteractionController.ts:71-77`).
5. `setOrbitEnabled(false)` is called **only** on the `"joint"` branch, so for a teaching simulation it is never called
   and `OrbitControls` stays enabled for the whole gesture.
6. Independently, `FilmShell`'s exploration pointer effect listens on the *same* stage element and feeds the same
   pointer deltas to `ExploreSession.drag()` (`src/ui/video/FilmShell.tsx`, the `pointerdown/move/up` effect).

So one drag is consumed twice: once by `OrbitControls` (camera orbits the body) and once by the exploration (target
group rotates).

For the **hinge** exploration the policy is `free`, so a drag that lands on a driven bone is correctly claimed by the
InteractionController and orbit is disabled for that gesture — but a drag that *misses* the bone still orbits, which
inside an exploration produces the same symptom.

### Why it was never caught

- The existing Step-14 explore tests drive the motion through the QA API (`exploreStep`), which never generates a
  pointer event, so `OrbitControls` is never involved.
- The world-transform measurement that would have caught it did not exist: `bodyBox()` returned the **manifest**
  bounding box, which is static by construction and cannot show displacement. The live `groupWorldState()` probe used
  above was added for this investigation.

---

## 4. What the fix must be, and what it must not be

It must be an **ownership** fix, not a hierarchy fix — the hierarchy is already correct:

> While an exploration is open, the pointer belongs to the joint. `OrbitControls` must be disabled for the duration of
> the session and restored on exit.

It must **not** be done by:

- moving a shared parent (nothing shares a parent — already verified);
- changing the camera framing to hide the sweep (the sweep would still be there);
- hiding context with opacity or visibility (the brief forbids it, and the context is the point).

The free-look mode in the five non-category chapters (`timeline.setExplore(true)`, "Drag to look around") is a
different thing and must keep orbiting.

---

## 5. Evidence

| File | What it holds |
|---|---|
| `qa/reports/step16c.explore_leak.json` | per-group world matrix + bbox before/after, all four explorations |
| `qa/reports/step16c.explore_drag.json` | UI-path drag: target groups *and* camera both move |
| `qa/reports/step16c.explore_drag2.json` | deterministic drag: camera moves 1.14–2.28 units in every exploration |
| `qa/visual/step16c/*.png` | before / mid / after frames of each drag |
