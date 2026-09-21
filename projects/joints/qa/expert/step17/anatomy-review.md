# Anatomy review — `step16g-narration-repetition-fixed`

Every item is **PENDING**. This sheet states what the build shows and what evidence exists; it makes no anatomical
judgement. Record decisions in `expert-review-status.json → anatomy`.

The anatomy assets are **byte-identical** to every candidate since Step 13 (hashes in `review-manifest.json →
integrity`). What has changed since earlier packages is how the lesson frames and words them, and that is what this sheet
describes.

---

## 0. The distinction that governs this review

> **ELBOW = VALIDATED PROCEDURAL RIG**
>
> **FIXED = TEACHING SIMULATION · PIVOT = TEACHING SIMULATION · BALL-AND-SOCKET = TEACHING SIMULATION**
>
> **Skull, C1/C2, shoulder, hip and knee are NOT validated procedural rigs.**

| Term | In this product |
|---|---|
| Validated procedural rig | The right elbow: a separate extracted asset with its own manifest, a fitted flexion axis, one degree of freedom, an explicit neutral definition, and runtime poses that match Blender to below 0.001 mm. The learner drives the actual joint |
| Teaching simulation | Whole render groups from the body asset, moved rigidly about a chosen pivot, so that a *kind* of movement can be shown and felt. The bones are real geometry; the motion is a teaching device. There is no surface contact, no ligament constraint and no measured axis |
| Schematic movement marks | Small animated glyphs at a joint site showing the kind of movement; nothing in the body moves. While they are on screen, a quiet status reads *"Teaching view: the moving marks show the kind of movement."* |

How the build keeps this honest:

- `checkExploreConfigs()` fails the build if a group-driven exploration declares itself `validated-rig`.
- While an exploration is open, its status badge stays on screen: **"Teaching simulation"** with the line *"This shows
  the movement pattern. The bones are real; the movement is a demonstration."*, or **"3D joint model"** for the elbow.
- Tests assert, per joint, the status each exploration declares, and that no learner-facing text says "validated",
  "rig", "schematic", "scientifically" or "accurate".

- [ ] **A0.1** The three kinds above are described honestly. — **PENDING**
- [ ] **A0.2** The on-screen wording will not lead a learner or teacher to over-trust a teaching simulation. — **PENDING**

## 1. Names, placement, laterality, bone relationships

Every shown joint is the **right** side where a side exists.

| Site | What is highlighted | Chapters |
|---|---|---|
| Skull suture | `body.frontal_bone`, `body.parietal_bone_right` (region `skull`) | 02, 03 Fixed, 07, 09 |
| Upper neck | region `upper_neck` (atlas C1, axis C2) | 02, 04 Pivot, 07, 09 |
| Right shoulder | `body.humerus_right`, `body.scapula_right` | 01 Hook, 02, 05 Ball-and-socket, 07, 09 |
| Right elbow | region `elbow_right`; the validated asset in chapter 06 | 01, 02, 06 Hinge, 07, 09 |
| Right knee | region `knee_right` | 02, 06 (`hinge.knee`), 07, 09 |
| Right hip | region `hip_right` | highlighted in 02 and 07; **labelled "Ball and socket" only on the body map (09)**. It no longer appears in chapter 05 |

**Anatomical names a learner actually sees or hears.** The lesson names very few structures, deliberately:

| Where | Names |
|---|---|
| 3D labels, chapter 06 only | **Humerus**, **Radius**, **Ulna**, **Elbow joint**, **Articular capsule of elbow joint** |
| Narration | "upper-arm bone", "shoulder blade" (chapter 05); "the upper-arm bone meets two bones in the forearm" (chapter 06) |
| Site labels | a joint category plus a place: "Fixed joint · skull", "Pivot joint · top of the neck", "Ball-and-socket joint · shoulder", "Hinge joint · elbow", "Hinge joint · knee"; and on the compare and body-map shots the category alone |

**Not named anywhere on screen:** frontal bone, parietal bone, atlas, axis, scapula, clavicle, femur, tibia, patella.
The neck bones are described, not named: *"one small bone sits on top of another"*. Structure identities come from the
source asset's own naming, and the lesson never renames a structure.

- [ ] **A1.1** Every anatomical name shown is correct. — **PENDING**
- [ ] **A1.1b** Naming so few structures (the elbow's three bones and its capsule) is the right level for Class 10; or
      further names (e.g. atlas and axis at the neck) should be added. — **PENDING**
- [ ] **A1.2** Laterality is correct everywhere (right side). — **PENDING**
- [ ] **A1.3** Every highlighted structure is the one the heading and narration are about. — **PENDING**
- [ ] **A1.4** Bone relationships are correct: humerus–radius–ulna; humerus–scapula; skull–atlas–axis; femur–tibia–patella. — **PENDING**

## 2. Movement direction and plane

| Demonstration | What moves | Model |
|---|---|---|
| Fixed: skull | ±0.5° about `[0,0,1]` through `[−0.038, 1.671, 0.027]`, springs back | teaching simulation (`resist`) |
| Pivot: head on C1/C2 | skull and teeth about the vertical axis through `[0, 1.539, −0.006]`, −60°…+60°; atlas and axis still | teaching simulation (`oneAxis`) |
| Ball-and-socket: shoulder | the whole arm about the humeral head `[−0.164, 1.382, −0.029]`: −95°…+15° about `[0,0,1]` and −40°…+85° about `[−1,0,0]`; scapula and clavicle still | teaching simulation (`twoAxis`) |
| Hinge: elbow | flexion about the **fitted** axis `[−0.974, 0.198, −0.110]` through `[−0.221, 1.103, −0.035]`, 0–145° | **validated rig**, one DOF |
| Hinge: knee | schematic marks only; nothing moves | marks |
| Ball-and-socket: hip | schematic marks only; nothing moves | marks |

- [ ] **A2.1** Each movement direction is correct. — **PENDING**
- [ ] **A2.2** Each implied movement plane is credible. — **PENDING**
- [ ] **A2.3** The teaching-simulation ranges are defensible as teaching devices. They are never presented as normative. — **PENDING**
- [ ] **A2.4** Holding atlas/axis still while the skull turns, and the scapula still while the arm swings, is the right simplification. — **PENDING**

## 3. The validated elbow

### 3.1 Axis and neutral

- Fitted flexion axis (world) `[−0.9741, 0.1976, −0.1098]` through pivot `[−0.2214, 1.1034, −0.0348]`.
- On screen, the axis is a blue line. The spoken line (`hinge.axis`) is: *"This blue line shows the direction the elbow
  bends around. We call that line the axis."*
- Controller `flexion = 0°` is **true anatomical extension**: the humerus and forearm long axes are collinear in the
  plane perpendicular to the fitted axis. The source pose is not 0°.
- Neutral offset: **13.625103769972680°**, applied at rig level; mesh data is unchanged. Cross-checks recorded in the
  manifest: styloid midpoint 14.53°, radius shaft 16.93°, ulna shaft 25.97° (rejected: the ulnar diaphysis is angled
  relative to the forearm long axis).

- [ ] **A3.1** The fitted axis is anatomically credible. — **PENDING**
- [ ] **A3.2** Controller zero as true extension is correctly defined. — **PENDING**
- [ ] **A3.3** The neutral-offset method is sound, and 13.63° is right for this geometry. — **PENDING**

### 3.2 The four review poses

Captures: `elbow_000.png`, `elbow_045.png`, `elbow_090.png`, `elbow_145.png`.

Automated evidence, for weighing only:
- runtime-vs-Blender pose consistency is below 0.001 mm (`reference-poses` and `gate3-pose-consistency` both pass on
  this candidate);
- maximum bone overlap at 145° is **1.724 mm**, between the coronoid process and the coronoid fossa.

- [ ] **A3.4** 0°: true extension. — **PENDING**
- [ ] **A3.5** 45°. — **PENDING**
- [ ] **A3.6** 90°: the angle the lesson's check and the elbow task ask for. — **PENDING**
- [ ] **A3.7** 145°: is 1.7 mm of coronoid/fossa overlap acceptable? — **PENDING**
- [ ] **A3.8** The forearm tracks plausibly through the whole sweep, not only at the four poses. — **PENDING**

### 3.3 Capsule and ligaments

Shot `hinge.support` (capture `06_hinge__hinge.support.png`):

| Structure | Shown as |
|---|---|
| Joint capsule | translucent geometry from the source asset |
| Radial collateral ligament | schematic band `elbow_r.band.radial_collateral_ligament` (lateral) |
| Ulnar collateral ligament | schematic band `elbow_r.band.ulnar_collateral_ligament` (medial) |
| Annular ligament | **not shown and not mentioned.** It is in the validated asset (the controller drives it), but it is not one of the two bands and is not called out |

On-screen note (draft enrichment): *"The thin coloured lines mark where the ligaments run. They are a guide, not real
tissue."*

- [ ] **A3.9** The capsule representation is acceptable at this level. — **PENDING**
- [ ] **A3.10** The radial collateral ligament band is acceptably placed and labelled. — **PENDING**
- [ ] **A3.11** The ulnar collateral ligament band is acceptably placed and labelled. — **PENDING**
- [ ] **A3.12** **Not showing the annular ligament** is acceptable for Class 10, or it must be added. — **PENDING**
- [ ] **A3.13** The bands read unambiguously as schematic. — **PENDING**

### 3.4 Handover

During chapter 06, the body's copies of the shared bones are hidden and the validated asset replaces them at the
source pose. There is no duplicate and no seam. Automated evidence: `step12-delivery` "elbow handover is seamless" and
`step13-bugsweep` "no duplicate anatomy" both pass.

- [ ] **A3.14** The full-body → validated-elbow handover is anatomically seamless. — **PENDING**

## 4. The other representations

| | What the learner sees | Items |
|---|---|---|
| **Fixed: skull** (teaching simulation) | frontal and right parietal bones at their suture. The exploration lets the learner push and feel the bones refuse (±0.5°, springing back) | **A4.1** the suture is an appropriate example of a fixed joint — **PENDING** · **A4.2** the token resistance is a legitimate device, not misleading — **PENDING** |
| **Pivot: head on C1/C2** (teaching simulation) | the camera looks at the two bones with nothing moving, then the skull turns. Words: *"one small bone sits on top of another"*, *"the upper bone turns around the one below it"*. The dens, ring and transverse ligament are not mentioned | **A4.3** acceptable representation of the atlanto-axial pivot at this level — **PENDING** · **A4.4** rotating the whole skull, with no dens model, is an acceptable simplification — **PENDING** |
| **Shoulder** (teaching simulation) | humerus, radius, ulna and hand rotate as one about the humeral head; scapula and clavicle still | **A4.5** acceptable glenohumeral representation at this level — **PENDING** · **A4.6** moving the arm as a rigid unit is acceptable — **PENDING** |
| **Knee** | named a hinge; schematic marks only; the fifth recall question | **A4.7** naming the knee a hinge joint is correct at this level — **PENDING** |
| **Hip** | named ball-and-socket; marks only; **never** a recall question | **A4.8** **PENDING EXPERT CONFIRMATION**: confirm, correct or require removal — **PENDING** |

## 5. What is not shown

- The annular ligament (A3.12).
- Cartilage, synovium and synovial fluid.
- Muscles and tendons; no muscle is named.
- Any surface-contact model: the teaching simulations' ranges are limited by content, not geometry.
- Left-side joints.
- Gliding, saddle and "partially movable" categories, deliberately.

- [ ] **A5.1** These omissions are acceptable for the stated scope, or specific additions are required. — **PENDING**
- [ ] **A5.2** Nothing omitted makes what is shown misleading. — **PENDING**

## 6. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Findings | |
| Decision | |
