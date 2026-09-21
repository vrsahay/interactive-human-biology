# Step 13 — expert review checklist

Generated 2026-09-18. **Reviewer: NONE — no subject-matter expert has reviewed this lesson. Every judgement below that needs anatomical or curriculum authority is marked PENDING_EXPERT.**

Types of Joints, video-first lesson (6 chapters, 22 shots). Elbow = validated procedural rig. Skull, C1/C2, shoulder, hip and knee = schematic teaching demonstrations, no rig (Step 13 Phase T: none were built).

Machine-readable form: [step13_review.json](step13_review.json). Provenance audit: [content_provenance.json](content_provenance.json).

## Summary

| Status | Items |
|---|---|
| PENDING_EXPERT | 5 of 14 |
| PASS | 5 of 14 |
| PASS_WITH_NOTE | 4 of 14 |

No PENDING_EXPERT item has been converted to PASS. Automated evidence is not an expert pass.

| # | Category | Status | Reviewer required |
|---|---|---|---|
| 1 | Structures named correctly | **PENDING_EXPERT** | yes |
| 2 | Correct anatomical side | **PASS** | no |
| 3 | Movement direction credible | **PENDING_EXPERT** | yes |
| 4 | Movement plane credible | **PENDING_EXPERT** | yes |
| 5 | Movement range credible | **PENDING_EXPERT** | yes |
| 6 | Schematic bands clearly labelled | **PASS** | no |
| 7 | Captions match source-backed curriculum wording | **PASS** | no |
| 8 | Draft enrichment clearly distinguished | **PASS** | no |
| 9 | Important anatomy for the teaching goal is present | **PENDING_EXPERT** | yes |
| 10 | Visual hierarchy supports learning | **PASS_WITH_NOTE** | no |
| 11 | Nothing misleading is presented as measured anatomy | **PASS_WITH_NOTE** | no |
| 12 | Interactions do what the film claims | **PASS** | no |
| 13 | Recap reinforces the categories | **PASS_WITH_NOTE** | no |
| 14 | Accessibility behaviour remains usable | **PASS_WITH_NOTE** | yes |

## Items

### 1. Structures named correctly — PENDING_EXPERT

Reviewer required: **yes**

Evidence:
- 17 anchors in the validated manifest carry display labels: Humerus, Radius, Ulna, Elbow joint, Head of radius, Olecranon, Coronoid process, Capitulum (region), Trochlea (region), Articular capsule of elbow joint, Radial collateral ligament, Ulnar collateral ligament, Annular ligament of radius, plus four schematic band-end anchors.
- Labels actually shown to the learner across the elbow chapter: Humerus, Radius, Ulna, Elbow joint, Articular capsule of elbow joint, Radial collateral ligament (+ Schematic ligament band), Ulnar collateral ligament (+ Schematic ligament band).
- Names originate from the source anatomy atlas object names; the two region labels are explicitly suffixed '(region)' because they mark an area of the humerus, not a separate mesh.
- qa/reports/elbow_r.gate3.step12.json: all 17 anchors compared against the Blender rig at 0/45/90/145 deg, max deviation below 0.001 mm.

Notes: Internally consistent and honestly qualified, but no anatomist has confirmed that each label names the structure a reader would expect. 'Capitulum (region)' and 'Trochlea (region)' in particular are area markers on the humerus mesh.

### 2. Correct anatomical side — PASS

Reviewer required: **no**

Evidence:
- All 49 joint structures are right-side (_r suffix, 49/49).
- The lesson makes 59 anatomy references (camera sites, body highlights, site labels): 39 explicitly right-side, 0 left-side.
- The skull shot highlights body.frontal_bone (a midline bone) and body.parietal_bone_right — consistent.
- Medial/lateral was derived from the model rather than assumed when building the draft landmark package: of the two distal-humerus extremes along the flexion axis, the medial one is the one nearer the body midline (x = -0.1837 vs -0.2488), so medial = -flexion axis for this right elbow (qa/elbow_r.poses.draft.json).

Notes: The lesson never shows a left-side joint, so a left/right mix-up cannot arise.

### 3. Movement direction credible — PENDING_EXPERT

Reviewer required: **yes**

Evidence:
- One degree of freedom, flexion about the controller's +X axis; controller 0 deg = true extension (Step 6 decision, qa/reports/elbow_r.neutral_offset.json, neutral offset 13.62510376997268 deg is ISB-based).
- The forearm travels anteriorly as flexion increases (manifest pivot.flexionTravelDirWorld).
- Runtime matches the Blender rig at 0/45/90/145 deg to below 0.001 mm (Gate 3).
- The film labels the two directions in the learner's language: 'Bending the elbow is called flexion.' / 'Straightening it again is called extension.'

Notes: Direction is internally verified against Blender, but whether the motion reads as anatomically credible is an expert judgement. No forearm pronation/supination is modelled; the lesson never claims it.

### 4. Movement plane credible — PENDING_EXPERT

Reviewer required: **yes**

Evidence:
- A single fitted hinge axis, obtained by functional-congruence optimisation (Nelder-Mead) of the ulnar-notch and radial-head vertices against the humerus over 0-145 deg with a penetration penalty (manifest pivot.method, qa/reports/elbow_r.pivot_fit.json).
- Maximum articular overlap across the range is 1.724 mm (coronoid fossa at 145 deg); the olecranon sits 0.21 mm into its fossa at 0 deg (Step 6).
- The on-screen axis is labelled as what it is: 'Blue line: the hinge axis fitted to this 3D model.'

Notes: The real elbow axis is not a perfect fixed hinge (it carries a small valgus/rotational component). The lesson teaches a single-axis hinge deliberately, and says the axis is fitted to this model. A reviewer must accept that simplification for the teaching goal.

### 5. Movement range credible — PENDING_EXPERT

Reviewer required: **yes**

Evidence:
- Controller range 0-145 deg (validated manifest dof 'flexion').
- External normative reference recorded in Step 13: Zwerus et al., 'Normative values and affecting factors for the elbow range of motion', Shoulder & Elbow 11(3):215-224 (2019), doi:10.1177/1758573217728711, PMCID PMC6555111 — mean active flexion of the dominant hand 146 deg across 352 healthy adults, literature range 130-154 deg, and range varies with age, sex and BMI.
- Learner-facing wording is approximate, not absolute: '0-145 deg is an approximate teaching range for this model; adult elbow flexion varies between people (see Sources).'
- The Sources dialog states that the reference supports the choice of teaching range and does not validate this model's geometry.

Notes: The reference makes 0-145 deg a reasonable teaching range; it does not validate this model's axis or limits. The validated manifest still records rangeStatus 'approximate, pending cited reference' — deliberately unchanged, because editing it would require re-promoting the frozen, SHA-pinned elbow asset for a wording field (Step 13 Phase A). Update it the next time the joint asset is legitimately rebuilt.

### 6. Schematic bands clearly labelled — PASS

Reviewer required: **no**

Evidence:
- Both bands are declared schematic in the validated manifest: representation 'schematic', deformationSimulation false, contentLabel 'Schematic ligament band'.
- In hinge.support the learner now sees 'Radial collateral ligament / Schematic ligament band' and 'Ulnar collateral ligament / Schematic ligament band' (Step 13 fix, see fixesApplied).
- The caption note in the same shot reads 'The thin coloured lines are schematic ligament bands, not real tissue.' with a DRAFT badge.
- No string anywhere describes band length as strain, measured biomechanics or tissue deformation (Phase H search over all 114 locale strings).

Notes: On a 390 px screen the label layout keeps the radial band label and drops the ulnar one; the caption note still states that the lines are schematic.

### 7. Captions match source-backed curriculum wording — PASS

Reviewer required: **no**

Evidence:
- Exactly one string is source-backed: 'The elbow bends and straightens in one direction, similar to a door hinge.' It is used verbatim as the caption of hinge.source and nowhere else.
- No string invents a citation: a unit test rejects any non-UI string matching /NCERT says|chapter \d|page \d/.
- The curriculum block records status 'draft' with sourceIds ['brief-excerpt-hinge'] and the figure reference.

Notes: The mechanism is verified. Approval of the wording itself is item 1 of the reviewer's curriculum pass, and the NCERT files are still absent from the repository (see curriculumVerification).

### 8. Draft enrichment clearly distinguished — PASS

Reviewer required: **no**

Evidence:
- 18 of 114 strings are draft enrichment; every one renders with a DRAFT badge (visible in qa/visual/step12/regression/* and qa/visual/step13/*).
- The Sources dialog lists the provenance legend for source excerpt, NCERT figure reference and draft.
- qa/expert/content_provenance.json classifies all 114 strings: SOURCE 18, DRAFT_ENRICHMENT 18, UI 73, SYSTEM 5, unclassified 0.
- Step 13 removed no provenance badge.

Notes: The 18 SOURCE strings are 1 verbatim brief excerpt plus 17 figure-reference names (joint categories and body locations only).

### 9. Important anatomy for the teaching goal is present — PENDING_EXPERT

Reviewer required: **yes**

Evidence:
- Present in the validated asset and labelled in the manifest, but never shown to the learner: Head of radius, Olecranon, Coronoid process, Capitulum (region), Trochlea (region), Annular ligament of radius.
- Shown: Humerus, Radius, Ulna, Elbow joint, Articular capsule, Radial and Ulnar collateral ligaments.
- The knee, shoulder, hip, neck and skull are shown as whole-bone highlights with schematic indicators; no sub-structures are named.

Notes: For a school-level 'types of joints' lesson, naming the olecranon or capitulum may be out of scope — but that is a curriculum decision, not a technical one. A reviewer must decide whether the elbow chapter should name any articular landmarks.

### 10. Visual hierarchy supports learning — PASS_WITH_NOTE

Reviewer required: **no**

Evidence:
- Expected priority anatomy > current concept > caption > controls holds in the captures: the anatomy occupies the frame, the highlighted structure is the only lit anatomy while the rest is dimmed, captions sit in a scrim, and the player chrome is a low-contrast strip.
- Labels are placed by a layout that clamps within the frame, avoids overlaps (0 label overlaps in all five viewport reports) and dims occluded labels.
- Automated layout checks at 5 viewports: 0 caption-over-player, 0 caption-over-panel, 0 label-over-UI, 0 offscreen labels, 0 horizontal scroll (qa/reports/step12.visual_regression.*.json).

Notes: On a 390x844 screen the caption panel occupies roughly the lower third in text-heavy shots (e.g. ball.shoulder), which compresses the anatomy. It does not overlap the subject, and no UI was added in Step 13.

### 11. Nothing misleading is presented as measured anatomy — PASS_WITH_NOTE

Reviewer required: **no**

Evidence:
- DEFECT FOUND AND FIXED in Step 13: a deferred elbow attach could complete while a schematic chapter was on screen, and the joint's initial layers then showed the fitted elbow hinge axis and the schematic bands during the ball-and-socket and pivot chapters. Fixed in App.attachJoint (the arriving asset no longer switches overlays on) with a defence in AppVideoRuntime.prepareShot; proven at 5 schematic shots by tests/e2e/step13-bugsweep.spec.ts.
- Every captioned shot that shows a schematic indicator now carries a schematic note (Step 13 fix: fixed.detail, ball.hip, recap.compare had none). Enforced by a unit test.
- The fitted axis is labelled 'the hinge axis fitted to this 3D model'; the bands are labelled 'Schematic ligament band'; the concept indicators are labelled 'Schematic indicator: it shows the kind of movement only. This part of the body is not animated.'
- Only the elbow is animated from a validated rig; recap.compare states this explicitly.

Notes: recap.pullback shows all six schematic indicators for 7.5 s and is a deliberately silent shot with no caption, so it has nowhere to put the note; it runs straight into recap.compare, which carries it. Listed as a reviewer decision, not silently accepted (the unit test asserts this is the only exception).

### 12. Interactions do what the film claims — PASS

Reviewer required: **no**

Evidence:
- 'Your turn: bend and straighten the elbow.' — dragging the forearm bends the elbow and never orbits; dragging a stationary structure orbits and never changes the pose (tests/e2e/film.spec.ts).
- 'Try it: bend the elbow to about 90 deg.' — answering at 90 deg returns 'correct', at 20 deg returns 'incorrect' (step13-bugsweep).
- Every input path goes through JointController.setDof; the slider, keyboard and drag share it.
- Explore: entering, selecting a structure and returning restores guided state, clears the selection and restores the shot camera to within 0.000 m (step13-bugsweep).
- Chapter markers seek and reconstruct each section; learner intent on a chapter preloads the elbow before the jump.

Notes: State-hygiene observation, not visible to a learner: the controller keeps its last angle while the joint is hidden (91 deg observed during fixed.detail after leaving the hinge chapter). In such shots the joint asset, its overlays, the angle badge and the slider are all absent, which the sweep asserts.

### 13. Recap reinforces the categories — PASS_WITH_NOTE

Reviewer required: **no**

Evidence:
- recap.compare names all four categories in one line — 'Fixed: no movement / Pivot: turning / Ball and socket: many directions / Hinge: one direction' — with the six site labels Fixed, Pivot, Ball and socket (x2), Hinge (x2) on the body.
- recap.check then asks the learner to reproduce 90 deg on the one joint that is really rigged.
- The recap carries the new note 'Schematic indicators mark the four joint types. Only the elbow moves from a validated 3D rig.'

Notes: The recap repeats the taxonomy but does not re-state the body locations in words (they appear only as on-body labels). A reviewer may want the hip/shoulder/elbow/knee named again in the summary line.

### 14. Accessibility behaviour remains usable — PASS_WITH_NOTE

Reviewer required: **yes**

Evidence:
- axe (wcag2a/2aa/21a/21aa/22aa + best-practice): 0 violations across 12 scopes, desktop and mobile.
- Measured contrast over the rendered scene: 196 text rows, 0 failures, tightest 5.25:1 against 4.5:1 required.
- Keyboard: the whole lesson completes with visible focus, no traps, completion announced; dialogs trap Tab, Escape closes, focus returns to the opener.
- Targets >= 44 px; reflow at 320 px with no overflow; caption text 17-18.6 px.
- Reduced motion: every shot cuts on entry, no dolly during playback, static indicators, stepped poses, 0 s caption transitions; the learner setting overrides the system preference.
- Exactly one semantic quiz prompt in the DOM and in the accessibility tree at 1280x800, 768x1024, 390x844 and 320x640.

Notes: Two gaps a reviewer must close: (a) real screen-reader testing is NOT_AVAILABLE (no NVDA or VoiceOver in this environment) — see qa/release/screen-reader-checklist.md; (b) the 3D label overlay is aria-hidden, so a screen-reader user never hears anatomy label names — all educational content must therefore be carried by the captions and announcements. That is the current design; a reviewer should confirm it is acceptable.

## Defects found in Step 13 and fixed

### RED (misleading: a measured artefact shown over a schematic teaching shot)

**Finding.** A deferred elbow attach leaked the fitted hinge axis overlay (and schematic band layer) into shots that request neither — observed during the ball-and-socket chapter.

**Fix.** src/engine/core/App.ts attachJoint() now turns the axis and band layers off when the asset binds; src/engine/video/AppVideoRuntime.ts prepareShot() re-applies the on-screen shot's joint presentation after a deferred attach.

**Verification.** tests/e2e/step13-bugsweep.spec.ts asserts, at ball.shoulder, ball.hip, pivot.rotate, fixed.detail and hinge.knee, that the joint is attached and yet no axis overlay and no joint structure is visible.

### AMBER (inconsistent honesty: identical indicators disclaimed in some shots and not others)

**Finding.** Shots showing schematic concept indicators without a schematic note: fixed.detail, ball.hip, recap.compare (pivot.rotate, ball.shoulder and hinge.knee already had one).

**Fix.** Attached note.schematic_indicator to fixed.detail and ball.hip, and a new note.recap_schematic to recap.compare; generalised the indicator wording so it covers the static skull marker as well as movement arrows.

**Verification.** tests/unit/video-lesson.test.ts asserts every captioned indicator shot has a note whose text contains 'schematic', with recap.pullback listed as the single documented exception.

### AMBER (requested content silently dropped, and the schematic marking weakened)

**Finding.** hinge.support requested a schematic band label whose title duplicated the radial-collateral-ligament anchor label; the layout kept the anchor label, so the words 'Schematic ligament band' never reached the screen.

**Fix.** Removed the duplicate anchor label from that shot and labelled both bands.

**Verification.** Probe of the built app: hinge.support now lays out 'Radial collateral ligament / Schematic ligament band', 'Ulnar collateral ligament / Schematic ligament band' and 'Articular capsule of elbow joint' (qa/visual/step13/hinge.support__1280x800.png).

### AMBER (uncaught error on a real input race)

**Finding.** Step 12R: the app threw an uncaught 'setPointerCapture: No active pointer' error when a pointer id was gone by the time the handler ran.

**Fix.** Guarded in src/engine/interaction/InteractionController.ts; the drag continues without capture.

**Verification.** 0 console errors across all 6 perf-lab profiles and all e2e suites.

## Observed and deliberately not changed

- **recap.pullback shows six schematic indicators with no caption and therefore no schematic note.** — It is a deliberately silent 7.5 s transitional pullback; adding a caption would change the film's rhythm. It leads directly into recap.compare, which carries the note. Action: Reviewer decision.

- **The elbow controller keeps its last angle while the joint is hidden.** — Not visible to a learner (no joint asset, overlay, badge or slider in those shots), and resetting the pose on every seek could discard a learner's own interaction. Action: Recorded as a state-hygiene note.

- **The validated manifest still says rangeStatus 'approximate, pending cited reference' although an external reference now exists.** — Editing it means re-promoting the frozen, SHA-pinned elbow asset (and regenerating Gate 2/Gate 3 evidence) for a wording field. Phase A forbids touching the validated core without an actual defect. Action: Update when the joint asset is next legitimately rebuilt. The learner-facing wording and the Sources dialog already carry the reference.

## Curriculum verification (Phase C)

Checked 2026-09-18. **Canonical source: NOT AVAILABLE. The Class 6 Science chapter 'Body Movements' is no longer published on ncert.nic.in: the chapter page renders but its PDF (fesc108.pdf) and the whole book return HTTP 404, and the current Curiosity textbooks for Classes 6-8 contain no types-of-joints content. The repository still has no NCERT reference files.**

| Claim | Status |
|---|---|
| hinge = elbow and knee | **CONFIRMED (NCERT)** |
| pivot = joint between head and neck | **CONFIRMED (NCERT)** |
| fixed = bones of the skull, immovable | **CONFIRMED (NCERT)** |
| ball-and-socket = shoulder | **CONFIRMED (NCERT)** |
| ball-and-socket = hip | **NOT CONFIRMED FROM ANY NCERT SOURCE** |

Official NCERT sources consulted:
- **S1** NCERT Laboratory Manual, Science, Classes VI-VIII - Theme 3 'The world of the living', ACTIVITY 27 — https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classVItoVIII/science/fhelm204.pdf (pp. 75-77 (from the running headers); edition year not confirmed)
- **S2** NCERT Exemplar Problems, Science, Class VI - 'Body Movement' (Unit 8), with the published answer key — https://ncert.nic.in/pdf/publication/exemplarproblem/classVI/science/feep208.pdf (pp. questions 45-48, answers 121-123; edition year not confirmed)
- **S3** NCERT Biology, Class XI - 'Locomotion and Movement', chapter 17, section 17.4 Joints — https://ncert.nic.in/textbook/pdf/kebo117.pdf (pp. 227; edition year document stamped 'Reprint 2026-27')
- **S4** NCERT Exemplar Problems, Biology, Class XI - chapter 20 'Locomotion and Movement', answers in chapter 23 — https://ncert.nic.in/pdf/publication/exemplarproblem/classXI/biology/keep420.pdf (pp. questions 114-115, answers from 129; edition year files stamped '2025-26')

Extra categories in official material: YES. S1 names 'Gliding joint' and 'Partially movable joint'; S3/S4 add gliding, saddle and the fibrous/cartilaginous/synovial classes. Only S2 (Class VI Exemplar) uses exactly the four categories this lesson teaches. Per the Step 13 brief the lesson deliberately keeps the four categories of the approved figure and does NOT add the others.

- NOT NCERT: Anatomy, Joints (Juneja, Munjal, Hubbard) - StatPearls, NCBI Bookshelf — https://www.ncbi.nlm.nih.gov/books/NBK507893/. NOT an NCERT source. Must never be cited as NCERT.

### The hip

Status: **NOT CONFIRMED FROM ANY NCERT SOURCE**. Corroborated by N1 (StatPearls, NOT NCERT). Affected strings: ball.label.hip, ball.text.hip, recap.label.ball.

PENDING_EXPERT. The claim is retained because it is in the project owner's approved curriculum figure and is anatomically standard, but it is NOT verifiable from NCERT material reachable online. A reviewer must either supply the NCERT citation or approve the claim on anatomical grounds.

## Provenance counts

| Bucket | Strings |
|---|---|
| SOURCE | 18 |
| UI | 73 |
| SYSTEM | 5 |
| DRAFT_ENRICHMENT | 18 |

Only source-backed sentence: "The elbow bends and straightens in one direction, similar to a door hinge."

