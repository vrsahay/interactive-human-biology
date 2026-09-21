# Landmark review — formal Gate 3 — `step16g-narration-repetition-fixed`

## Status: **FORMAL GATE 3 = PENDING EXPERT LANDMARK APPROVAL**

Record decisions in `expert-review-status.json → landmarks`.

`qa/elbow_r.poses.draft.json` is a **draft**:

| | |
|---|---|
| SHA-256 | `761a1f1ee799f10adf742f0c4e369851c8d034345e115f187291702c20b88472` |
| Unchanged since | Step 13 (`537ac71`) |
| `approvedBy` | **absent**, by design |
| `qa/elbow_r.poses.json` | **does not exist**. The draft has deliberately not been renamed |

Nothing in this package changes the draft, renames it or approves it.

Coordinates come from the production GLBs in their exported bind pose. Vertex indices are valid only for joint manifest
SHA `009d51528bf5a6d84b2ab14499d4a1346f4cc1bcaff0ab1a0f99b1ccfd135e66`, which is the manifest in this candidate (verified).

---

## 1. The eight proposed landmarks

| Landmark | Bone | Definition method | Palpable | Proposed tolerance |
|---|---|---|---|---|
| `olecranon_tip` | ulna | vertex furthest proximally (opposite the true-extension forearm direction) | yes | 2.0 mm |
| `coronoid_tip` | ulna | most anterior vertex within the proximal 15 % of the bone's length | no | 2.5 mm |
| `ulnar_styloid` | ulna | most distal vertex along the true-extension forearm direction | yes | 3.0 mm |
| `radial_styloid` | radius | most distal vertex along the true-extension forearm direction | yes | 3.0 mm |
| `radial_head_centre` | radius | centroid of vertices in the proximal 8 % of the bone's length (derived, not a surface point) | no | 3.0 mm |
| `medial_epicondyle` | humerus | distal-humerus vertex furthest medially (medial direction derived from the model) | yes | 2.0 mm |
| `lateral_epicondyle` | humerus | distal-humerus vertex furthest laterally | yes | 2.0 mm |
| `third_metacarpal_head` | 3rd metacarpal | most distal vertex along the true-extension forearm direction | yes | 4.0 mm |

**References.**

- Proposed check poses: 0° (true extension), 45°, 90° (the angle the lesson asks for) and 145° (the approximate teaching
  maximum).
- The frame: the fitted flexion axis and the true-extension forearm direction recorded in the joint manifest.

**Tolerance rationale, as drafted.** These are *anatomical identification* tolerances. Runtime-vs-Blender consistency
is already below 0.001 mm, so any real disagreement would come from where a reviewer places a landmark. 2 mm matches the
body/elbow handover tolerance already enforced. Distal and derived references get more room, because a small axis error
is amplified by the lever arm.

## 2. Decisions

- [ ] **L1** Each definition method is anatomically appropriate, in particular the coronoid band (15 %) and the
      radial-head centroid band (8 %). — **PENDING**
- [ ] **L2** The derived medial/lateral epicondyle assignment is correct. — **PENDING**
- [ ] **L3** Each proposed tolerance is acceptable. — **PENDING**
- [ ] **L4** **Membership:** do the ulnar styloid, radial styloid and third metacarpal head, the distal references,
      belong in a formal **elbow** landmark set, or should it stop at the joint? — **PENDING**
- [ ] **L5** The references (poses and frame) are appropriate. — **PENDING**
- [ ] **L6** I approve this landmark set for formal Gate 3. That requires adding `approvedBy`, `approvedAt` and
      per-landmark approved positions, and saving as `qa/elbow_r.poses.json`, **by the reviewer or on their written
      instruction**. — **PENDING**

Until L6 is decided, formal Gate 3 remains **NOT AVAILABLE**.

## 3. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Findings | |
| Decision | |
