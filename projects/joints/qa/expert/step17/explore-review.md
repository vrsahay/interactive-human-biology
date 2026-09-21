# Explore review — `step16g-narration-repetition-fixed`

Four explorations: one per category. Every item is **PENDING**. Record decisions in
`expert-review-status.json → explore`.

Captures, four states each:

- `explore_<joint>_1_before`
- `_2_task`
- `_3_mid` (a real pointer drag held on the target)
- `_4_done`

They exist at 1280×800 and, prefixed `w390_` and `w412_`, at two emulated phone widths. The three automatic handovers
are `handover_fixed`, `handover_pivot` and `handover_ball`.

---

## 1. The four

| | Fixed (skull) | Pivot (neck) | Ball-and-socket (shoulder) | Hinge (elbow) |
|---|---|---|---|---|
| **Status shown** | **Teaching simulation** + *"This shows the movement pattern. The bones are real; the movement is a demonstration."* | same | same | **3D joint model** |
| **Declared status** | `teaching-simulation` | `teaching-simulation` | `teaching-simulation` | `validated-rig` |
| **Interaction** | drag or arrow keys; the bones resist | drag left/right or ←/→ | drag in any direction or arrows | drag the forearm, the slider, or ←/→ |
| **Movement model** | ±0.5°, springs back | −60°…+60° about the vertical | −95°…+15° × −40°…+85° | 0–145°, the validated `flexion` DOF |
| **Task** | *"Try to move the two skull bones apart."* | *"Turn the head as if you were looking over one shoulder."* | *"Move the arm in two different directions."* | *"Bend the elbow until it is about half-way — around 90 degrees."* |
| **Task done when** | any attempt | 40° | 25° and 15° on the two axes | 85° |
| **Confirmation** | spoken and shown once the task is done | same | same | same |
| **Opens** | automatically at the end of its chapter, or from "Explore this joint" | same | same | from "Explore this joint". The in-film "your turn" and the 90° check come first |
| **Reset** | returns to the teaching start pose; the task stays done | same | same | same |
| **Return** | "Return to the lesson" (or Escape); the film resumes exactly where it was | same | same | same |
| **Learner purpose** | feel a joint that does not move | feel rotation about one axis | feel movement in many directions | bend the real joint about its one axis |

## 2. Honesty about validation

- The status badge stays on screen for as long as an exploration is open, and it is announced once on entry.
- `checkExploreConfigs()` refuses to build a group-driven exploration that declares itself `validated-rig`.
- No learner-facing text says "validated", "rig", "schematic", "scientifically" or "accurate". A test asserts this.
- The three teaching simulations move whole bones rigidly, with no surface contact and no ligaments. Their ranges are
  limited by content, not by anatomy.

- [ ] **E1** A learner cannot mistake a teaching simulation for validated biomechanics. — **PENDING**
- [ ] **E2** The words "Teaching simulation" and "3D joint model" are the right words for this audience. — **PENDING**

## 3. Target visibility, and the input rules (automated, on this candidate)

| Check | Result |
|---|---|
| The target is visible and not under the task card: 9 widths × 4 explorations, and 4 states at 390, 412, 1280, 1440 | 0 % covered in every case |
| A pointer on the target reaches the 3D view, not the card | every case |
| A drag that starts on the target moves the target | fixed 0.5° (resists), pivot 18°, ball 30°, elbow 56° at 390 px |
| The camera does not orbit from the same drag | 0 movement |
| Unrelated anatomy stays still | 0 of 35 render groups moved outside the declared targets |
| At most one narration owner; the film's clip silent while the task cue speaks | pass (the handover captures record owner = cue) |
| The validated elbow is unchanged: 0 / 45 / 90 / 145 exact, and no body bone displaced | pass |

## 4. The questions

- [ ] **E3** Each interaction communicates its concept. — **PENDING**
- [ ] **E4** Each task has a clear learner purpose and is achievable. — **PENDING**
- [ ] **E5** The teaching-simulation ranges are defensible as teaching devices. — **PENDING**
- [ ] **E6** Reset and return behave sensibly. — **PENDING**
- [ ] **E7** The status is visible enough without being intrusive. — **PENDING**
- [ ] **E8** The target stays visible while the learner works, on desktop and on a phone. — **PENDING**
- [ ] **E9** The fixed exploration's task and instruction near-duplicate each other (see curriculum C1.3). — **PENDING**

## 5. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Findings | |
| Decision | |
