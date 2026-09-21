# Anatomy review — reviewer sheet for `step14b-complete`

Every item here is **PENDING**. Nothing in this document is an anatomical judgement; it states what the build does and
what evidence exists, so that a reviewer can judge it. Decisions go in `expert-review-status.json` and in the checklist.

---

## 0. The distinction that governs this review

> **HINGE / ELBOW = VALIDATED PROCEDURAL RIG**
>
> **FIXED / PIVOT / BALL-AND-SOCKET = TEACHING SIMULATIONS**
>
> **KNEE / HIP / SHOULDER / SKULL / C1–C2 are NOT validated procedural rigs.**

What each term means in this product:

- **Validated procedural rig** — the right elbow. A separate, extracted asset with its own manifest: a fitted flexion
  axis, one degree of freedom, an explicit neutral definition, and a pose pipeline whose runtime output matches Blender
  to below 0.001 mm. The learner drives the actual joint.
- **Teaching simulation** — whole render groups from the body asset, moved rigidly about a chosen pivot so that a
  *kind* of movement can be shown and felt. The bones are real geometry; the motion is a teaching device, not a
  biomechanical simulation. There is no joint surface contact, no ligament constraint and no measured axis.
- **Schematic indicator** — a small animated glyph at a joint site showing the kind of movement. Nothing in the body
  moves. Every captioned shot that shows one carries the note: *"Schematic indicator: it shows the kind of movement only.
  This part of the body is not animated."*

How the build keeps the distinction from blurring:

- `checkExploreConfigs()` fails the build if a group-driven exploration declares itself `validated-rig`.
- The status word is on screen for the whole time an exploration is open ("Validated 3D rig" / "Interactive teaching
  simulation"), and a test asserts it per joint.
- The four shots that show the elbow alongside other joints carry the stronger note: *"Schematic indicators mark the four
  joint types. Only the elbow moves from a validated 3D rig."*

- [ ] **A0.1** The three categories above are described honestly. — **PENDING**
- [ ] **A0.2** The on-screen wording will not lead a learner or teacher to over-trust the teaching simulations. — **PENDING**

---

## 1. Names, laterality and placement

Everything the lesson highlights is **right-sided** where a side exists. The captures to check are listed per shot in
`review-manifest.json`.

| Site | Structures highlighted | Where it appears |
|---|---|---|
| Skull suture | `body.frontal_bone`, `body.parietal_bone_right` | 03 Fixed, 07 Compare, 08 Recall, 09 Body map |
| Upper neck | `body.atlas_c1`, `body.axis_c2` | 04 Pivot, 07, 08, 09 |
| Right shoulder | `body.humerus_right`, `body.scapula_right` | 01 Hook, 05 Ball-and-socket, 07, 08, 09 |
| Right hip | region `hip_right` | 05 Ball-and-socket, 09 |
| Right elbow | `body.humerus_right`, `body.radius_right`, `body.ulna_right` | 01 Hook, 02 What is a joint, 06 Hinge, 07, 08, 09 |
| Right knee | region `knee_right` (femur, tibia, fibula, patella, both menisci) | 06 Hinge, 08 Recall, 09 |

Names shown to the learner: frontal bone, parietal bone, atlas, axis, humerus, radius, ulna, scapula, femur, tibia,
patella. The structure ids come from the source asset's own naming (`"<Structure> | <Side>"`); the lesson never renames a
structure.

- [ ] **A1.1** Every anatomical name shown is correct. — **PENDING**
- [ ] **A1.2** Laterality is correct in every shot (right side throughout). — **PENDING**
- [ ] **A1.3** Every highlighted structure is the structure the caption is talking about. — **PENDING**
- [ ] **A1.4** Bone relationships are correctly shown: humerus–radius–ulna at the elbow; humerus–scapula at the shoulder;
      skull–atlas–axis at the neck; femur–tibia–patella at the knee. — **PENDING**

---

## 2. Movement direction and plane

| Demonstration | Direction shown | Model |
|---|---|---|
| Fixed — skull | ±0.5° about the anterior axis, springs back | teaching simulation, `resist` |
| Pivot — head on C1/C2 | rotation about the vertical axis `[0, 1, 0]` through the neck anchor `[0, 1.539, −0.006]`, −60°…+60°; the atlas and axis stay still while the skull and teeth turn | teaching simulation, `oneAxis` |
| Ball-and-socket — shoulder | two axes about the humeral head centre `[−0.164, 1.382, −0.029]`: −95°…+15° (lift away / across) and −40°…+85° (forward / back); the scapula and clavicle stay still | teaching simulation, `twoAxis` |
| Hinge — elbow | flexion about the **fitted** axis, world direction `[−0.974, 0.198, −0.110]` through pivot `[−0.221, 1.103, −0.035]`, 0–145° | **validated rig**, one DOF |
| Hinge — knee | schematic indicator only, nothing moves | indicator |
| Ball-and-socket — hip | schematic indicator only, nothing moves | indicator |

The pivot axis used for the neck teaching simulation is the body delivery manifest's own schematic pivot axis for that
site. It was not re-derived for this step.

- [ ] **A2.1** Each movement direction is correct. — **PENDING**
- [ ] **A2.2** Each implied movement plane is credible. — **PENDING**
- [ ] **A2.3** The chosen ranges for the three teaching simulations are defensible as teaching devices (they are not
      claimed to be normative ranges anywhere on screen). — **PENDING**
- [ ] **A2.4** Holding the atlas/axis still while the skull turns, and the scapula still while the humerus swings, is the
      right simplification to show. — **PENDING**

---

## 3. The validated elbow

### 3.1 Axis and neutral

- Fitted flexion axis, world `[−0.974, 0.198, −0.110]`, through pivot `[−0.221, 1.103, −0.035]`.
- On screen the axis carries the note: *"Blue line: the hinge axis fitted to this 3D model."*
- Controller `flexion = 0°` is defined as **true anatomical extension**: the ISB humerus and forearm long axes collinear
  in the plane perpendicular to the fitted axis.
- The source anatomy was supplied **flexed**. The neutral offset is `13.625103769972680°` and is reproduced exactly at
  `flexion = source_pose_flexion_deg`. Cross-checks recorded in the manifest: styloid midpoint 14.53°, radius shaft
  16.93°, ulna shaft 25.97° (rejected — the ulnar diaphysis is angled relative to the forearm long axis), and an
  olecranon–fossa contact sweep (0.5 mm contact at −21°, 2 mm at −31° relative to the source pose).
- The offset is applied at rig level (pivot orientation and parent-inverse matrices). **Mesh data is unchanged.**

- [ ] **A3.1** The fitted axis is anatomically credible. — **PENDING**
- [ ] **A3.2** The definition of controller zero as true extension is correct. — **PENDING**
- [ ] **A3.3** The method used to find the neutral offset is sound, and 13.63° is the right answer for this geometry. — **PENDING**
- [ ] **A3.4** Rejecting the ulna-shaft estimate (25.97°) was correct. — **PENDING**

### 3.2 The four review poses

Captures: `elbow_000.png`, `elbow_045.png`, `elbow_090.png`, `elbow_145.png` (1280×800, the validated asset, drag-enabled
shot).

Automated evidence, for weighing only: runtime-vs-Blender pose consistency is below 0.001 mm at every pose
(`qa/reports/elbow_r.gate3.step12.json`); maximum bone overlap at 145° is 1.724 mm between the coronoid process and the
coronoid fossa (`qa/reports/elbow_r.rig_validation.final.json`).

- [ ] **A3.5** 0° — true extension. — **PENDING**
- [ ] **A3.6** 45°. — **PENDING**
- [ ] **A3.7** 90° — the angle the lesson asks the learner to reach. — **PENDING**
- [ ] **A3.8** 145° — the approximate teaching maximum; is 1.7 mm of coronoid/fossa overlap acceptable? — **PENDING**
- [ ] **A3.9** The forearm tracks the humerus plausibly through the whole sweep, not only at the four sampled poses. — **PENDING**

### 3.3 Capsule and ligaments

Shown in `hinge.support` (capture `06_hinge__hinge.support.png`):

- **Joint capsule** — geometry from the source asset, shown as a translucent surface.
- **Radial collateral ligament** — `elbow_r.band.radial_collateral_ligament` → `radial_collateral_ligament_elbow_r`.
- **Ulnar collateral ligament** — `elbow_r.band.ulnar_collateral_ligament` → `ulnar_collateral_ligament_elbow_r`.
- **Annular ligament** — **not shown.** It is not part of the two schematic bands and is not called out anywhere.

On-screen note, unchanged: *"The thin coloured lines are schematic ligament bands, not real tissue."*

- [ ] **A3.10** The capsule representation is acceptable at this level. — **PENDING**
- [ ] **A3.11** The radial collateral ligament band is acceptably placed and labelled. — **PENDING**
- [ ] **A3.12** The ulnar collateral ligament band is acceptably placed and labelled. — **PENDING**
- [ ] **A3.13** **Omitting the annular ligament** is acceptable for a Class 10 lesson — or it must be added. — **PENDING**
- [ ] **A3.14** The bands read unambiguously as schematic. — **PENDING**

### 3.4 Handover

During the elbow chapter the body's own copies of the shared bones are hidden and the validated asset is shown in their
place, at the source pose, so the learner sees no duplicate and no seam. Automated evidence: the delivery tests assert no
duplicate bone and alignment within the handover tolerance.

- [ ] **A3.15** The full-body → validated-elbow handover is anatomically seamless. — **PENDING**

---

## 4. Landmarks — formal Gate 3

**FORMAL GATE 3 = PENDING EXPERT LANDMARK APPROVAL.**

`qa/elbow_r.poses.draft.json` is a **draft**. It has no `approvedBy` field by design and has deliberately not been renamed
to `qa/elbow_r.poses.json`. Nothing in this step changed it.

Coordinates are read from the production GLBs in their exported bind pose; vertex indices are only valid for joint
manifest SHA `009d51528bf5a6d84b2ab14499d4a1346f4cc1bcaff0ab1a0f99b1ccfd135e66`.

| Landmark | Bone | Definition method | Palpable | Proposed tolerance |
|---|---|---|---|---|
| `olecranon_tip` | ulna | vertex furthest proximally (opposite the true-extension forearm direction) | yes | 2.0 mm |
| `coronoid_tip` | ulna | most anterior vertex within the proximal 15% of the bone's length | no | 2.5 mm |
| `ulnar_styloid` | ulna | most distal vertex along the true-extension forearm direction | yes | 3.0 mm |
| `radial_styloid` | radius | most distal vertex along the true-extension forearm direction | yes | 3.0 mm |
| `radial_head_centre` | radius | centroid of vertices in the proximal 8% of the bone's length (derived, not a surface point) | no | 3.0 mm |
| `medial_epicondyle` | humerus | distal-humerus vertex furthest medially (medial direction derived from the model) | yes | 2.0 mm |
| `lateral_epicondyle` | humerus | distal-humerus vertex furthest laterally | yes | 2.0 mm |
| `third_metacarpal_head` | 3rd metacarpal | most distal vertex along the true-extension forearm direction | yes | 4.0 mm |

Proposed poses for a formal check: 0° (true extension), 45° (mid-range), 90° (the angle the lesson asks for), 145°
(approximate teaching maximum).

Tolerance rationale as drafted: these are *anatomical-identification* tolerances, not numerical ones — runtime-vs-Blender
consistency is already below 0.001 mm, so any real disagreement would come from where a reviewer places the landmark.
2 mm matches the elbow/body handover tolerance already enforced; distal and derived references are given more room
because a small axis error is amplified by the lever arm.

Actions the draft itself asks a reviewer for:

- [ ] **A4.1** Confirm or correct each definition method — in particular the coronoid band fraction (15%) and the
      radial-head centroid band (8%). — **PENDING**
- [ ] **A4.2** Confirm the derived medial/lateral epicondyle assignment. — **PENDING**
- [ ] **A4.3** Accept or change each proposed tolerance. — **PENDING**
- [ ] **A4.4** Decide whether the ulnar styloid, radial styloid and third metacarpal head belong in a formal **elbow**
      landmark set, or whether the set should stop at the joint. — **PENDING**
- [ ] **A4.5** Approve the set: add `approvedBy`, `approvedAt` and per-landmark approved positions, and save as
      `qa/elbow_r.poses.json`. Until then Gate 3 stays NOT AVAILABLE. — **PENDING**

---

## 5. The other four representations

### 5.1 Fixed — skull

Frontal bone and right parietal bone at their suture; contact-region marker computed as the centroid of vertices of
either structure within 3 mm of the other, on unsimplified source geometry. The manifest records this as an *approximate
joint-region marker computed from geometry; not a measured joint centre.*

The Explore lets the learner push and feel the bones refuse (±0.5°, springing back). It is labelled a teaching simulation
throughout.

- [ ] **A5.1** Using a frontal/parietal suture as *the* example of a fixed joint is appropriate. — **PENDING**
- [ ] **A5.2** The token ±0.5° "resistance" is a legitimate teaching device and not misleading. — **PENDING**

### 5.2 Pivot — head on C1/C2

The skull and teeth render groups rotate about the vertical axis through the neck anchor; the atlas and axis do not move.

- [ ] **A5.3** This is an acceptable representation of the atlanto-axial pivot at this level. — **PENDING**
- [ ] **A5.4** Rotating the whole skull rather than modelling the dens/atlas relationship is an acceptable
      simplification. — **PENDING**

### 5.3 Ball-and-socket — shoulder

Humerus, radius, ulna and hand rotate as one about the humeral head centre; scapula and clavicle stay still.

- [ ] **A5.5** Acceptable representation of the glenohumeral joint at this level. — **PENDING**
- [ ] **A5.6** Moving the whole arm as a rigid unit (no elbow motion during the shoulder demonstration) is acceptable. — **PENDING**

### 5.4 Knee and hip

Both are **named and indicated only** — a schematic glyph, nothing animated, no exploration. The knee also appears as the
fifth recall question (answer: hinge). The hip does **not** appear as a recall question, because its classification is
unconfirmed.

- [ ] **A5.7** Naming the knee a hinge joint is correct at this level. — **PENDING**
- [ ] **A5.8** Naming the hip a ball-and-socket joint is correct — **currently PENDING EXPERT CONFIRMATION**, because no
      reachable NCERT source states it. Confirm, correct, or require its removal. — **PENDING**

---

## 6. What is not shown

Recorded so that omissions are reviewed rather than assumed:

- The annular ligament (see A3.13).
- Cartilage, synovium and synovial fluid anywhere.
- Muscles and tendons anywhere; no muscle is named in the lesson.
- Any joint surface contact model — the teaching simulations pass through each other's space if pushed, which is why
  their ranges are limited by content rather than by geometry.
- Left-side equivalents of every joint.
- Gliding, saddle and "partially movable" categories, deliberately (see the curriculum sheet).

- [ ] **A6.1** These omissions are acceptable for the stated scope, or you require specific additions. — **PENDING**
- [ ] **A6.2** Nothing omitted makes what *is* shown misleading. — **PENDING**
