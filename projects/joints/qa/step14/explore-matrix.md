# Explore matrix

One Explore system, four joints. The engine (`src/engine/explore/`) knows nothing about anatomy: every id, pivot, axis,
limit and text key below comes from `content/lessons/hinge-elbow.json` and is checked against the body manifest at build
time. Adding a fifth joint is a content change, not an engine change.

**The distinction that must never blur:** the elbow is a *validated rig*; the other three are *teaching simulations* — whole
render groups moved rigidly so a learner can see and cause the kind of movement the category is named for. The build
refuses to let a group-driven explore call itself `validated-rig`, and the status is on screen the whole time.

| | Fixed | Pivot | Ball-and-socket | Hinge |
|---|---|---|---|---|
| **Body example** | Skull — frontal + right parietal (a suture) | Top of the neck — head on C1/C2 | Right shoulder — humerus in the scapula's socket | Right elbow — humerus, radius, ulna |
| **Status** | Teaching simulation | Teaching simulation | Teaching simulation | **Validated 3D rig** |
| **What moves** | The suture pair, by a token amount | Skull + teeth (3 groups); C1/C2 stay still | Humerus + radius + ulna + hand (4 groups); scapula and clavicle stay | Nothing in the body: the validated elbow asset, through `JointController.setDof` |
| **Motion model** | `resist` | `oneAxis` | `twoAxis` | `dof` |
| **Pivot / axis** | Suture region, ±0.5° about the anterior axis | Neck anchor `[0, 1.539, −0.006]`, vertical axis `[0,1,0]` (the manifest's own schematic pivot axis) | Humeral head centre `[−0.164, 1.382, −0.029]`, coronal + sagittal axes | The validated fitted hinge axis (unchanged) |
| **Range** | ±0.5°, springs back | −60° … +60° | −95° … +15° (lift away/across) × −40° … +85° (forward/back) | 0° … 145°, the manifest's own limits |
| **Teaching sequence** | Locate the skull → frame the suture → *try to move it* → it refuses → name it Fixed | Locate the neck → frame head + C1/C2 → turn the head → the bone below stays still → name it Pivot | Locate the shoulder → frame the arm's sweep → swing and lift → many directions, one joint → name it Ball-and-socket | The existing chapter: bones → axis → flexion → 0/45/90/145 → capsule and ligaments → name it Hinge |
| **Explore interaction** | Drag or arrows; it barely moves and returns | Drag left/right, or ←/→; head turns | Drag any direction, or ←/→/↑/↓; arm swings and lifts | Drag the forearm (validated gesture), the validated slider, or ←/→ — all through `setDof` |
| **Instruction shown** | "Try to move the skull bones." | "Drag left and right to turn the head." | "Drag in any direction to move the arm." | "Drag to bend and straighten the elbow." |
| **Reset behaviour** | Returns to 0° (and springs back on release anyway) | Returns to 0°, head facing forward | Returns to 0°/0°, arm at the side | `setDof(flexion, 0)` — true extension, the validated zero |
| **On exit** | Group displacement cleared, shot re-applied, film clock untouched | same | same | Elbow returned to 0°, shot re-applied |
| **Accessibility** | Arrows move, Shift = coarse, **R** resets, **Escape** returns; 44 px controls; status and instruction are text, not colour | same | same | same, plus the validated slider keeps its own `role="slider"` semantics |

## What a learner can tell from each

The point of the matrix is the last row of the lesson's argument: the four are different **because they allow different
movement**, and the learner produces that difference themselves.

- Fixed: *I pushed and nothing happened.*
- Pivot: *I turned it one way and back, around the bone underneath.*
- Ball-and-socket: *I moved it in more than one direction.*
- Hinge: *I could only bend and straighten it.*

## Honesty mechanics still in force

- Every schematic concept indicator keeps its note ("Schematic indicator: it shows the kind of movement only. This part of
  the body is not animated.") — Step 13's mechanism is untouched.
- The ligament bands keep "Schematic ligament band".
- The fitted elbow axis still says it is fitted to this model.
- No teaching simulation is described as scientific, measured, or validated anywhere in content or UI.

## Verified (built app, 1280×800, 0 console errors)

`tests/e2e/step14-explore.spec.ts` — 7 tests: each joint's entry point, status, joint-specific instruction, movement,
reset, exit; no duplicate controls; keyboard-only operation; and that an exploration leaves the lesson's shot, chapter and
clock untouched. Captures in `qa/visual/step14/ui_*.png`.
