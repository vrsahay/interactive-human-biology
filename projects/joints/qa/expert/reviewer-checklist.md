# Expert sign-off checklist — Types of Joints

**Product state: FROZEN.** Build identity and hashes: [frozen-build.json](frozen-build.json). Nothing in this checklist
changes the product; it records what a qualified reviewer decides.

**Every item below is `Status: PENDING`. No decision has been pre-filled, and automated evidence is not a decision.**

Allowed decisions: **PASS** · **PASS_WITH_NOTE** · **REQUEST_FIX** · **NOT_APPLICABLE**

How to use this sheet: open the film (the frozen build), read the evidence pointer, then fill in Reviewer, Comments and
Decision. Screenshots of the frozen build are listed in [review-manifest.json](review-manifest.json). Where an item needs
you to look at a specific frame, the manifest names the file.

What this product claims about itself, so you can check the claim rather than guess it:

- The **elbow** is a validated procedural hinge rig driven from Blender-verified geometry.
- The **skull, neck (C1/C2), shoulder, hip and knee** are **schematic teaching representations**. They have **no validated
  rig** and are not animated.
- Exactly **one** sentence is source-backed. Everything else is **draft enrichment** and badged DRAFT.
- The elbow range is an **approximate teaching range**, not a universal anatomical maximum.

---

## Section A — ANATOMY

### A1. Structure names are correct
Evidence: 17 labelled anchors in the validated manifest; 7 shown to the learner (Humerus, Radius, Ulna, Elbow joint,
Articular capsule of elbow joint, Radial collateral ligament, Ulnar collateral ligament). Names originate from the source
atlas object names. Region markers are suffixed "(region)". See `qa/expert/step13_review.json` item 1 and
`qa/visual/step12/film/06b_hinge_elbow_bones.png`.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A2. Anatomical side is correct
Evidence: all 49 joint structures are right-side; the lesson makes 59 anatomy references, 39 explicitly right-side and 0
left-side; medial/lateral was derived from the model (the distal-humerus extreme nearer the midline is medial), not assumed.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A3. Anatomical placement of each highlighted structure
Evidence: skull shot highlights the frontal and right parietal bones (a cranial suture); pivot highlights the upper-neck
region; shoulder highlights the right humerus and scapula; hip highlights the right femur and pelvis; knee highlights the
right knee region. Frames: `02_fixed_skull.png`, `03_pivot_upper_neck.png`, `04_ball_socket_shoulder.png`,
`05_ball_socket_hip.png`, `07_hinge_knee.png`.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A4. Movement direction is credible
Evidence: one degree of freedom; controller 0° = true extension; flexion increases as the forearm travels anteriorly;
neutral offset 13.62510376997268° (ISB-based). Frames: `elbow_000.png` → `elbow_145.png`.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A5. Movement plane is credible
Evidence: a single fitted hinge axis from functional-congruence optimisation against the humerus over 0–145° with a
penetration penalty (`qa/reports/elbow_r.pivot_fit.json`). Frame: `06c_hinge_elbow_axis.png`.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A6. Hinge-axis credibility (the axis shown on screen)
Evidence: the on-screen blue line is labelled "Blue line: the hinge axis fitted to this 3D model." It is not presented as a
clinical axis. The real elbow axis is not a perfect fixed hinge; the lesson teaches a single-axis simplification.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A7. 0° pose = true extension
Evidence: `elbow_000.png`, `elbow_r_closeup_000.png`; olecranon 0.21 mm into its fossa at 0°; runtime matches Blender to
0.0002 mm.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A8. 45° pose
Evidence: `elbow_045.png`, `elbow_r_closeup_045.png`, `elbow_r_overview_045.png`.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A9. 90° pose (the angle the learner is asked to reach)
Evidence: `elbow_090.png`, `elbow_r_closeup_090.png`, `elbow_r_context_090.png`.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A10. 145° pose (approximate teaching maximum)
Evidence: `elbow_145.png`, `elbow_r_closeup_145.png`; maximum articular overlap across the range is 1.724 mm at the
coronoid fossa at 145°.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A11. Elbow bone relationships (humerus / radius / ulna)
Evidence: `06b_hinge_elbow_bones.png`; caption "At the elbow, the humerus meets the radius and the ulna."
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A12. Elbow capsule representation
Evidence: `06d_hinge_elbow_support.png`; label "Articular capsule of elbow joint"; the capsule is source geometry, not a
schematic overlay.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A13. Radial collateral ligament (RCL)
Evidence: source geometry present; the on-screen band is schematic and labelled "Radial collateral ligament / Schematic
ligament band".
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A14. Ulnar collateral ligament (UCL)
Evidence: source geometry present; the on-screen band is schematic and labelled "Ulnar collateral ligament / Schematic
ligament band". On a 390 px screen the label layout keeps the radial band label and drops the ulnar one.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A15. Annular ligament
Evidence: present in the validated asset as `annular_ligament_radius_r` with the label "Annular ligament of radius", and
driven by the controller — but **never labelled or pointed out to the learner**.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A16. Schematic band representation is acceptable
Evidence: both bands declare `representation: schematic`, `deformationSimulation: false`; the caption states "The thin
coloured lines are schematic ligament bands, not real tissue."; no string anywhere describes band length as strain,
measured biomechanics or tissue deformation.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A17. Body → elbow handoff
Evidence: 30 body bones are handed over to the joint asset; each body copy reports `handedOver` (no duplicate anatomy);
bounding-box deviation at the source pose ≤ 2 mm for humerus, radius, ulna and the carpals.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A18. Missing / unused elbow landmarks
Evidence: present in the validated asset with labels but never shown: **Head of radius, Olecranon, Coronoid process,
Capitulum (region), Trochlea (region), Annular ligament of radius**. Decide whether the elbow chapter should name any of
them for the teaching goal.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### A19. Schematic joint limitations are sufficiently clear to a learner
This is the question the product most needs answered. The current statements are:

| Joint | What the product does | What it tells the learner |
|---|---|---|
| Fixed (skull) | Static highlight + a schematic ring marker; no motion | "Schematic indicator: it shows the kind of movement only. This part of the body is not animated." |
| Pivot (neck, C1/C2) | Schematic rotation arrow; **no validated C1/C2 rig** | same schematic note |
| Ball-and-socket (shoulder) | Schematic multi-direction arcs; **no validated shoulder rig** | same schematic note |
| Ball-and-socket (hip) | Schematic multi-direction arcs; **no validated hip rig** | same schematic note |
| Hinge (knee) | Schematic single-plane arc; **no validated knee rig** | same schematic note |
| Hinge (elbow) | **Validated procedural hinge rig**, Blender-verified | fitted axis labelled as fitted; real poses |
| Recap | All six markers at once | "Schematic indicators mark the four joint types. Only the elbow moves from a validated 3D rig." |

One exception is recorded: `recap.pullback` shows all six markers for 7.5 s and is a deliberately silent shot with no
caption, so it carries no note; it runs straight into `recap.compare`, which does.

- Status: PENDING
- Reviewer:
- Evidence: frames `02_fixed_skull.png`, `03_pivot_upper_neck.png`, `04_ball_socket_shoulder.png`, `05_ball_socket_hip.png`, `07_hinge_knee.png`, `08_recap_full_body.png`, `08b_recap_compare.png`
- Comments:
- Decision:

### A20. Draft landmark package for formal Gate 3
**FORMAL GATE 3: PENDING EXPERT LANDMARK APPROVAL.** The file stays `qa/elbow_r.poses.draft.json` and is deliberately not
renamed to `qa/elbow_r.poses.json`; it carries no `approvedBy`, so Gate 3 reads it for reporting only and formal validation
stays inactive. Each landmark needs your approval individually.

| # | Landmark | Structure | Reference | Definition | Proposed tolerance | Decision |
|---|---|---|---|---|---|---|
| 1 | olecranon_tip | ulna_r | mesh vertex 399 | most proximal ulna vertex | 2.0 mm | PENDING |
| 2 | coronoid_tip | ulna_r | mesh vertex 228 | most anterior ulna vertex in the proximal 15 % | 2.5 mm | PENDING |
| 3 | ulnar_styloid | ulna_r | mesh vertex 324 | most distal ulna vertex | 3.0 mm | PENDING |
| 4 | radial_styloid | radius_r | mesh vertex 56 | most distal radius vertex | 3.0 mm | PENDING |
| 5 | radial_head_centre | radius_r | derived centroid | centroid of the proximal 8 % of the radius | 3.0 mm | PENDING |
| 6 | medial_epicondyle | humerus_r | mesh vertex 743 | distal-humerus extreme nearer the midline | 2.0 mm | PENDING |
| 7 | lateral_epicondyle | humerus_r | mesh vertex 164 | opposite extreme | 2.0 mm | PENDING |
| 8 | third_metacarpal_head | metacarpal_3_r | mesh vertex 294 | most distal vertex | 4.0 mm | PENDING |

Intended Gate 3 use: drive the controller to 0°, 45°, 90° and 145°, transform each approved landmark by its structure's
world matrix, and compare against reviewer-approved positions within the approved tolerance. Vertex indices are valid only
for the manifest SHA recorded in the draft file.

- Status: PENDING
- Reviewer:
- Evidence: `qa/elbow_r.poses.draft.json`
- Comments (per-landmark corrections welcome):
- Decision (approve all / approve some / REQUEST_FIX):

---

## Section B — CURRICULUM

Full per-string sheet: [curriculum-review.md](curriculum-review.md) (41 educational strings; 73 interface strings excluded).

### B1. The four-category taxonomy is right for this lesson
The lesson teaches exactly four categories: **Fixed · Pivot · Ball-and-socket · Hinge**. This is intentional and matches
the project owner's approved figure.

Official NCERT material also contains further categories: the Science Laboratory Manual (Classes VI–VIII, Activity 27)
names "Gliding joint" and "Partially movable joint"; NCERT Class XI Biology adds gliding, saddle and the
fibrous/cartilaginous/synovial classes. The NCERT Class VI Exemplar (Body Movement) uses exactly these four.

**Nothing has been added.** Gliding, partially movable, saddle and the structural classes are absent by design. If you want
any of them, say so explicitly here.

- Status: PENDING
- Reviewer:
- Evidence: `qa/expert/content_provenance.json` → curriculumVerification
- Comments:
- Decision:

### B2. "Hip as ball-and-socket" — PENDING EXPERT CONFIRMATION
The lesson states "The hip is another ball-and-socket joint." and labels the hip site accordingly.

**No NCERT source reachable online states this.** NCERT Class XI asks students to name the joint between femur and
acetabulum but publishes no answer; the Class XI exemplar model answer says only that the pelvic girdle "articulates with
femur through acetabulum". The claim is corroborated only by StatPearls (NCBI Bookshelf), which is **not NCERT and must not
be cited as NCERT**.

The claim has **not** been removed: it is in the approved figure and is anatomically standard. It needs either an NCERT
citation or your approval on anatomical grounds.

- Status: PENDING
- Reviewer:
- Evidence: `ball.label.hip`, `ball.text.hip`, `recap.label.ball`; frame `05_ball_socket_hip.png`
- Comments:
- Decision:

### B3. Elbow range wording and its reference
Recorded external reference: **Zwerus et al., "Normative values and affecting factors for the elbow range of motion",
Shoulder & Elbow, 2019, 11(3):215–224, DOI 10.1177/1758573217728711.** Mean active flexion of the dominant hand 146°
across 352 healthy adults; the paper cites a literature range of 130–154° and reports that elbow range varies with age,
sex and BMI.

The study supports the **reasonableness of an approximate teaching range around 145°**. It does **not** establish that 145°
is a universal anatomical maximum, and it does not validate this model's geometry.

Learner-facing semantics remain: **Approximate teaching range: 0–145°**. The caption reads "0-145 deg is an approximate
teaching range for this model; adult elbow flexion varies between people (see Sources)."

Note: the validated manifest still records `rangeStatus: "approximate, pending cited reference"`. It was deliberately left
unchanged because editing it would require re-promoting a frozen, SHA-pinned asset for a wording field.

- Status: PENDING
- Reviewer:
- Decision required: **PASS** or **REQUEST_FIX**
- Comments:
- Decision:

### B4. The one source-backed sentence
> "The elbow bends and straightens in one direction, similar to a door hinge."

Used verbatim as the caption of `hinge.source` and nowhere else. The repository contains no NCERT files, so this wording
has never been checked against the textbook.

- Status: PENDING
- Reviewer:
- Evidence: frame `06_hinge_elbow_source.png`
- Comments:
- Decision:

### B5. Draft enrichment wording (18 strings)
Every one renders with a DRAFT badge. They are the lesson's explanatory voice and none is curriculum wording.

- Status: PENDING
- Reviewer:
- Evidence: [curriculum-review.md](curriculum-review.md)
- Comments:
- Decision:

### B6. Figure-reference names (17 strings)
Joint category names and body locations only — no artwork, wording or layout is reused from the figure.

- Status: PENDING
- Reviewer:
- Evidence: [curriculum-review.md](curriculum-review.md)
- Comments:
- Decision:

### B7. Age-appropriateness and reading level
The lesson targets school learners. Captions are short statements; the pivot chapter uses the school-level NCERT phrasing
("where the neck joins the head") rather than the Class XI refinement ("between atlas and axis").

- Status: PENDING
- Reviewer:
- Evidence: [curriculum-review.md](curriculum-review.md)
- Comments:
- Decision:

### B8. Nothing is presented as NCERT that is not
Evidence: a unit test rejects any non-interface string matching "NCERT says", "chapter N" or "page N"; the Sources dialog
states the curriculum status is draft and that the reference files are absent.

- Status: PENDING
- Reviewer:
- Evidence: `qa/expert/content_provenance.json`
- Comments:
- Decision:

---

## Section C — LEARNING EXPERIENCE

Watch the film end to end: **intro → fixed → pivot → ball-and-socket → hinge (elbow, then knee) → recap**. 6 chapters,
22 shots, about 3 minutes.

### C1. Does the full-body opening orient the learner?
Evidence: `01_intro_full_body.png`, `01b_intro_joint_map.png`. The film opens on the whole skeleton inside a translucent
body shell, then maps the joints before any explanation.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### C2. Does the camera movement explain where each joint is?
Evidence: each chapter begins with a travel shot from the body to the site, then holds. Reduced motion replaces travel with
a cut.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### C3. Is each chapter focused on one concept?
Evidence: fixed = no movement; pivot = turning; ball-and-socket = many directions (shoulder, then hip); hinge = one
direction (elbow in depth, then knee); recap = the four together.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### C4. Is the elbow clearly the most technically validated section?
Evidence: the elbow chapter is 9 shots with real poses, a fitted axis, an angle badge and an interactive moment; the other
joints are single schematic shots.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### C5. Are schematic sections clearly identified? (see also A19)
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### C6. Are captions readable?
Evidence: 201 measured contrast rows over the rendered scene, 0 failures, tightest 3.50:1 against 3:1 for large text;
caption text 17–18.6 px on a 320 px screen; a caption-size setting offers a larger option.
- Status: PENDING
- Reviewer:
- Evidence: `qa/reports/step12.accessibility.json`
- Comments:
- Decision:

### C7. Does the learner understand the four categories by the end?
- Status: PENDING
- Reviewer:
- Evidence: `08b_recap_compare.png`
- Comments:
- Decision:

### C8. Does the recap reinforce the concept?
Evidence: `recap.compare` names all four categories in one line and labels all six sites on the body; `recap.check` then
asks the learner to reproduce 90° on the one rigged joint.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

### C9. Are controls subordinate to the anatomy?
Evidence: intended priority anatomy > current concept > caption > controls; the player is a low-contrast strip that fades
while playing; 0 caption-over-player and 0 label-over-UI overlaps at five viewports.
Known note: on a 390 px screen the caption panel occupies roughly the lower third in text-heavy shots.
- Status: PENDING
- Reviewer:
- Evidence: `qa/visual/step12/regression/390x844/*`
- Comments:
- Decision:

### C10. Does the interaction happen at the right moment?
Evidence: two interactive moments — `hinge.try` (after flexion and extension have been shown) and `recap.check` (the 90°
question at the end). Both are signposted by their captions and both hold the film until the learner continues.
- Status: PENDING
- Reviewer:
- Evidence: `09_check.png`
- Comments:
- Decision:

### C11. Elbow hero sequence, shot by shot
Sequence: body handoff → bones → axis → flexion → extension (45°/90°/145° along the way) → interactive moment →
supporting structures → return to neutral → knee.

Verified mechanically (no reviewer judgement needed, listed so you can confirm what you see):

| Check | Result |
|---|---|
| No duplicated bones at handoff | 30 body bones handed over, every body copy `handedOver` |
| No jump at handoff | joint asset aligned with the body at the source pose, ≤ 2 mm bbox deviation |
| Correct axis | fitted axis matches Blender to 0.0012° |
| Correct flexion direction | +X, 0° = true extension, verified against Blender at 4 poses |
| 90° interaction | answering at 90° returns "correct", at 20° "incorrect" |
| 145° endpoint | reached; max articular overlap 1.724 mm |
| Labels | Humerus, Radius, Ulna, Elbow joint, capsule, both ligament bands |
| Schematic bands | both labelled "Schematic ligament band" |
| Capsule / ligaments | capsule is source geometry; ligaments shown as schematic bands |
| Context hiding | context tier never requested by the film; body context dimmed, not duplicated |
| Reset to neutral | `hinge.return` steps the pose back; the joint is hidden in later chapters |

- Status: PENDING
- Reviewer:
- Evidence: frames `06_hinge_elbow_source.png` → `06d_hinge_elbow_support.png`, `elbow_000/045/090/145.png`
- Comments:
- Decision:

### C12. Accessibility from a teaching standpoint
Evidence: axe 0 violations; keyboard-only completion; reduced motion honoured; exactly one semantic quiz prompt.
**Not tested: NVDA and VoiceOver** — see [screen-reader-checklist.md](screen-reader-checklist.md). Note that the 3D label
overlay is `aria-hidden`, so a screen-reader user never hears anatomy label names; all teaching content must reach them
through captions and announcements.
- Status: PENDING
- Reviewer:
- Evidence: as above
- Comments:
- Decision:

---

## Section D — NARRATION (added after the first freeze)

The film now speaks each shot's caption in a synthesized Indian-English female voice
(**en-IN-Chirp3-HD-Aoede**, Google Cloud Text-to-Speech). 21 clips, MP3 24 kHz mono, 292 KB, generated at build time by
`pipeline/audio/build_narration.ts` and shipped as static audio — no API key and no speech service is present at runtime.

**Content rule:** the spoken text is assembled only from strings that already exist in the locale (caption title, caption
text, interaction prompt). No narration sentence was written, so narration introduces no new educational claim and
inherits the captions' provenance. A unit test enforces this and rejects any attempt to speak a note key.

**Deliberate omission:** the schematic and provenance notes ("this part of the body is not animated", the DRAFT status) are
**not spoken**. At the frozen shot durations, speaking them would require up to 2.1x speech compression. A learner who only
listens therefore does not hear the schematic disclaimers; they remain on screen. This needs your explicit decision.

### D1. Voice and delivery are appropriate for the audience
Evidence: en-IN-Chirp3-HD-Aoede, female, Indian English, natural speaking rate (1.00) on every clip; longest clip
`recap.compare` 8.36 s inside a 10 s shot.
- Status: PENDING
- Reviewer:
- Evidence: `public/assets/audio/narration/narration.json`; listen to the film end to end
- Comments:
- Decision:

### D2. Pronunciation of anatomical terms
Terms the voice must say correctly: humerus, radius, ulna, flexion, extension, pivot, ball-and-socket, hinge, skull,
vertebrae. A synthetic voice is not guaranteed to stress anatomical Latin correctly, and nobody has checked it.
- Status: PENDING
- Reviewer:
- Evidence: clips `hinge.bones.mp3`, `hinge.flexion.mp3`, `hinge.extension.mp3`, `pivot.rotate.mp3`
- Comments:
- Decision:

### D3. Narration duplicating the caption is the right choice
The voice reads the same sentence the caption shows. That keeps provenance intact and helps emerging readers, but it means
a sighted reader hears what they are already reading.
- Status: PENDING
- Reviewer:
- Evidence: any shot
- Comments:
- Decision:

### D4. The schematic disclaimers being unspoken is acceptable
See the deliberate omission above. The alternatives are compressed speech (up to 2.1x) or lengthening those shots, which
would un-freeze the film's timing and its visual, playthrough and performance evidence.
- Status: PENDING
- Reviewer:
- Evidence: `fixed.detail`, `pivot.rotate`, `ball.shoulder`, `ball.hip`, `hinge.knee`, `recap.compare`
- Comments:
- Decision:

### D5. Narration control and audio behaviour
Evidence: a 44 px toggle in the top bar beside Sources and Settings, `aria-pressed`, choice persisted; narration pauses
with the film and while the learner holds the joint; a finished clip never replays inside its shot; audio starts only after
a user gesture (browser autoplay policy, and the control also satisfies WCAG 1.4.2).
- Status: PENDING
- Reviewer:
- Evidence: `tests/e2e/narration.spec.ts`
- Comments:
- Decision:

### D6. Narration and screen readers together
A screen-reader user will hear the narration voice and their screen reader at the same time. This interaction has **not**
been tested (no screen reader was available) and belongs in the manual screen-reader pass.
- Status: PENDING
- Reviewer:
- Evidence: [screen-reader-checklist.md](screen-reader-checklist.md)
- Comments:
- Decision:

---

## Reviewer sign-off

- Reviewer name:
- Qualification / role:
- Date:
- Overall recommendation (circle one): PASS · PASS_WITH_NOTE · REQUEST_FIX
- Items requiring a fix before release:
- Signature:
