# Reviewer checklist — `step14b-complete`

**Candidate build:** tag `step14b-complete`, commit `d6ec8d8e96b745bec53f648fa4b64e55d2678fd9`, 2026-09-18.
**Package commit:** the commit that added this directory. `review-manifest.json` records both, and records a diff proving
that no product file changed between them.

This package **supersedes** the Step-13 package in `qa/expert/` for review purposes. That package is not wrong; it
describes a build that is no longer the candidate. Steps 14 and 14B changed the learner experience: 6 chapters became 9,
a universal Explore system was added for all four categories, the recap became a retrieval challenge in its own chapter,
and all of it gained narration. The Step-13 package is retained unchanged as the record of what was frozen then.

---

## How to use this

1. Work through the sections below with the captures in `qa/visual/step15/` open (69 captures, listed with hashes in
   `review-manifest.json`), or with the running build.
   Captures live outside git by repository policy (every capture set is reproducible); regenerate them with
   `node qa/expert/step15/capture_review_set.mjs` and check them against the SHA-256 recorded for each one in
   `review-manifest.json`. To review off this machine, ship `qa/visual/step15/` with the package.
2. Record every decision in `expert-review-status.json`: your name, the date, the decision, and your reasoning.
3. **A passing automated test is evidence, not approval.** Nothing in this package may be moved off `PENDING` because a
   test passed. Where automated evidence exists it is quoted so you can weigh it, never so it can stand in for you.
4. If an item is outside your field, leave it `PENDING` and say so. Four different kinds of reviewer are needed here
   (curriculum, anatomy, accessibility, licensing) and none of them should sign for another.

Every decision below is one of: **PASS**, **REQUEST_FIX**, **REJECT**, or **NOT MY FIELD**. None is pre-selected.

---

## 0. What is validated and what is not

This distinction governs everything else in the review. Please confirm you have understood it before starting, because
several items only make sense in its light.

| | Status |
|---|---|
| **Right elbow (hinge)** | **VALIDATED PROCEDURAL RIG** — single degree of freedom `flexion`, fitted axis, 0–145° approximate teaching range, driven by the joint controller |
| Skull suture (fixed) | **TEACHING SIMULATION** — whole render groups moved rigidly so a movement can be shown and felt |
| Head on C1/C2 (pivot) | **TEACHING SIMULATION** |
| Right shoulder (ball-and-socket) | **TEACHING SIMULATION** |
| Hip, knee | Shown and named; **not animated by any rig**, schematic indicator only |

**Skull, C1/C2, shoulder, hip and knee are NOT validated procedural rigs.** The build refuses to let a group-driven
exploration declare itself a validated rig, the status is on screen for as long as an exploration is open, and every
schematic indicator carries a note saying that part of the body is not animated.

- [ ] **0.1** I have understood which content is validated and which is a teaching simulation. — **Status: PENDING**
- [ ] **0.2** The on-screen wording of that distinction ("Interactive teaching simulation" / "Validated 3D rig", and the
      schematic notes) is honest and will not mislead a Class 10 learner or their teacher. — **Status: PENDING**

---

## 1. Teaching methodology — the nine chapters

See `curriculum-review.md` §1 and the captures `01_hook__*` … `09_body_map__*`.

| # | Chapter | What it is for |
|---|---|---|
| 01 | Hook | Asks why a shoulder and an elbow move so differently, before any category is named |
| 02 | What is a joint? | Shows two bones meeting, then that how they meet decides how they move |
| 03–06 | Fixed, Pivot, Ball-and-socket, Hinge | Where → what it does → watch it → name it → why → explore |
| 07 | Compare | One movement pattern at a time, then all four |
| 08 | Recall challenge | Five questions: shown a joint moving, name the category |
| 09 | Final body map | The memory anchor, after the recall |

- [ ] **1.1** The sequence is appropriate for a Class 10 learner. — **Status: PENDING**
- [ ] **1.2** The lesson teaches **movement → joint type**, not merely **label → definition**. If you think it still
      teaches the latter, say where. — **Status: PENDING**
- [ ] **1.3** The hook works: a learner has a reason to care before the first category arrives. — **Status: PENDING**
- [ ] **1.4** "What is a joint?" is an adequate concept introduction at this level. — **Status: PENDING**
- [ ] **1.5** The comparison chapter builds the mapping *joint type = movement pattern*. — **Status: PENDING**
- [ ] **1.6** The retrieval challenge is pedagogically sound (see §6). — **Status: PENDING**
- [ ] **1.7** The final body map functions as a summary rather than as the lesson. — **Status: PENDING**
- [ ] **1.8** The lesson length (4 min 35 s of film plus learner-paced detours) is appropriate. — **Status: PENDING**

---

## 2. Curriculum and wording

See `curriculum-review.md` and `strings-inventory.json` (every learner-facing string, split A / B / C).

Counts in the candidate build: **1** source-backed sentence, **13** figure-reference labels, **60** draft-enrichment
teaching lines, **10** interface-only strings.

- [ ] **2.1** Every **A (source-backed)** string is used correctly and in context. — **Status: PENDING**
- [ ] **2.2** Every **B (draft enrichment)** string is factually correct. These are *not* NCERT wording; they were written
      for this lesson and carry a DRAFT badge on screen. — **Status: PENDING**
- [ ] **2.3** They are age-appropriate and clear for Class 10. — **Status: PENDING**
- [ ] **2.4** Terminology is right (including what is deliberately *not* used: no abduction/adduction, no plane names). — **Status: PENDING**
- [ ] **2.5** The lesson is complete enough for its stated scope. — **Status: PENDING**
- [ ] **2.6** **Is the four-category taxonomy — Fixed, Pivot, Ball-and-socket, Hinge — appropriate for this lesson?**
      Gliding, saddle and "partially movable" are deliberately absent. Should they stay absent? — **Status: PENDING**
- [ ] **2.7** The hip is presented as ball-and-socket. No reachable NCERT source states this; it is currently
      **PENDING EXPERT CONFIRMATION** and is deliberately never used as a recall question. Confirm, correct, or remove. — **Status: PENDING**
- [ ] **2.8** The DRAFT badge and the sources dialog communicate provenance honestly to a teacher. — **Status: PENDING**

---

## 3. Anatomy

See `anatomy-review.md` for the full item list and the evidence behind each one.

- [ ] **3.1** Anatomical names are correct. — **Status: PENDING**
- [ ] **3.2** Laterality is correct everywhere (the elbow, shoulder, hip and knee shown are all **right**). — **Status: PENDING**
- [ ] **3.3** Placement of every highlighted structure is correct. — **Status: PENDING**
- [ ] **3.4** Bone relationships are correct (humerus–radius–ulna, humerus–scapula, skull–atlas–axis, femur–tibia–patella). — **Status: PENDING**
- [ ] **3.5** Movement direction is correct in each demonstration. — **Status: PENDING**
- [ ] **3.6** Movement plane is credible where one is implied. — **Status: PENDING**
- [ ] **3.7** The fitted elbow flexion axis is anatomically credible. — **Status: PENDING**
- [ ] **3.8** The elbow at **0°** is true extension and looks right. — **Status: PENDING**
- [ ] **3.9** The elbow at **45°** looks right. — **Status: PENDING**
- [ ] **3.10** The elbow at **90°** looks right. — **Status: PENDING**
- [ ] **3.11** The elbow at **145°** looks right (maximum bone overlap measured at 1.724 mm, coronoid process / coronoid fossa). — **Status: PENDING**
- [ ] **3.12** The elbow **joint capsule** representation is acceptable. — **Status: PENDING**
- [ ] **3.13** The **radial collateral ligament** band is acceptable. — **Status: PENDING**
- [ ] **3.14** The **ulnar collateral ligament** band is acceptable. — **Status: PENDING**
- [ ] **3.15** The **annular ligament**: it is **not shown**. Confirm that omitting it is acceptable at this level, or
      require it. — **Status: PENDING**
- [ ] **3.16** The schematic bands are clearly schematic and cannot be mistaken for real tissue. — **Status: PENDING**
- [ ] **3.17** The full-body → elbow handover is anatomically seamless (no duplicate or missing bone, alignment correct). — **Status: PENDING**
- [ ] **3.18** The **fixed / skull** representation (frontal + right parietal at a suture) is acceptable. — **Status: PENDING**
- [ ] **3.19** The **pivot / neck** representation (head rotating on C1/C2) is acceptable **as a teaching simulation**. — **Status: PENDING**
- [ ] **3.20** The **ball-and-socket / shoulder** representation is acceptable **as a teaching simulation**. — **Status: PENDING**
- [ ] **3.21** The **knee** as an example of a hinge is acceptable. — **Status: PENDING**
- [ ] **3.22** The **hip** as an example of ball-and-socket is acceptable (see 2.7). — **Status: PENDING**
- [ ] **3.23** Landmarks that are *not* shown and structures that are *not* modelled do not create a misleading picture. — **Status: PENDING**
- [ ] **3.24** The validated / schematic distinction is anatomically defensible as presented. — **Status: PENDING**

---

## 4. Elbow landmarks (formal Gate 3)

See `anatomy-review.md` §4 and `qa/elbow_r.poses.draft.json`.

**FORMAL GATE 3 = PENDING EXPERT LANDMARK APPROVAL.** The draft file deliberately has no `approvedBy` field and is
deliberately **not** named `qa/elbow_r.poses.json`. It stays a draft until you approve it.

Eight candidates, with proposed tolerances: olecranon tip (2 mm), coronoid tip (2.5 mm), ulnar styloid (3 mm), radial
styloid (3 mm), radial head centre (3 mm), medial epicondyle (2 mm), lateral epicondyle (2 mm), third metacarpal head
(4 mm).

- [ ] **4.1** Each landmark **definition** is anatomically acceptable. — **Status: PENDING**
- [ ] **4.2** Each proposed **tolerance** is acceptable. — **Status: PENDING**
- [ ] **4.3** The derived medial/lateral epicondyle assignment is correct. — **Status: PENDING**
- [ ] **4.4** The set has the right **membership**: do the ulnar styloid, radial styloid and third metacarpal head belong
      in a formal *elbow* landmark set, or should it stop at the joint? — **Status: PENDING**
- [ ] **4.5** The coronoid band fraction (proximal 15%) and the radial-head centroid band (proximal 8%) are acceptable. — **Status: PENDING**
- [ ] **4.6** I approve this landmark set for formal Gate 3 (which requires adding `approvedBy`, `approvedAt` and
      per-landmark approved positions, and saving as `qa/elbow_r.poses.json`). — **Status: PENDING**

---

## 5. The 0–145° range

Learner-facing wording, unchanged: **"0-145 deg is an approximate teaching range for this model; adult elbow flexion
varies between people."**

Recorded external reference, unchanged from Step 13: Zwerus EL, Willigenburg NW, Scholtes VA, Somford MP, Eygendaal D,
van den Bekerom MPJ, "Normative values and affecting factors for the elbow range of motion", *Shoulder & Elbow*
11(3):215–224 (2019), doi:10.1177/1758573217728711, PMCID PMC6555111. Mean active flexion of the dominant arm 146° across
352 healthy adults; literature range 130–154°; range varies with age, sex and BMI.

That reference supports the *reasonableness of a teaching range*. It does not validate this model's geometry, axis or
limits. The manifest still records `range_status: "approximate, pending cited reference"`.

- [ ] **5.1** Decision on the 0–145° range as presented: **PASS** / **REQUEST_FIX**. — **Status: PENDING**
- [ ] **5.2** The learner-facing wording must not become a universal anatomical maximum. Confirm the current wording is
      acceptable, or supply replacement wording. — **Status: PENDING**

---

## 6. Explore experiences

See `review-manifest.json → explores` and the captures `explore_*_open.png` / `explore_*_moved.png`.

| | Example | Interaction | Movement model | Status shown |
|---|---|---|---|---|
| Fixed | Skull, frontal + right parietal | drag or arrows; it resists | ±0.5°, springs back | Interactive teaching simulation |
| Pivot | Head on C1/C2 | drag left/right, ←/→ | −60° … +60° about the vertical | Interactive teaching simulation |
| Ball-and-socket | Right shoulder | drag any direction, arrows | −95°…+15° × −40°…+85° | Interactive teaching simulation |
| Hinge | Right elbow | drag the forearm, slider, ←/→ | 0–145°, the validated DOF | **Validated 3D rig** |

- [ ] **6.1** Each interaction communicates the underlying concept. — **Status: PENDING**
- [ ] **6.2** No interaction **overstates anatomical validation**. This is the item this whole package exists to protect. — **Status: PENDING**
- [ ] **6.3** The ranges chosen for the three teaching simulations are defensible as teaching devices. — **Status: PENDING**
- [ ] **6.4** Reset and exit behave sensibly (reset returns to the teaching state; exit restores the lesson exactly). — **Status: PENDING**
- [ ] **6.5** The explanation shown after the learner moves the joint is correct. — **Status: PENDING**

---

## 7. Retrieval challenge

Five questions: skull → fixed, neck → pivot, shoulder → ball-and-socket, elbow → hinge, knee → hinge. The category is
never named in the question (mechanically checked), site labels and indicators are off, and the answer is revealed only
after the learner names it. A wrong answer says "Not that one. Look at how it moves." and lets them try again.

- [ ] **7.1** The five questions are correct and fair. — **Status: PENDING**
- [ ] **7.2** Two joints sharing the answer "hinge" (elbow and knee) is a good idea, not a confusing one. — **Status: PENDING**
- [ ] **7.3** The reveals are correct and well worded. — **Status: PENDING**
- [ ] **7.4** Handling a wrong answer this way is appropriate. — **Status: PENDING**

---

## 8. Narration

See `curriculum-review.md` §4 and `review-manifest.json → narrationCoverage`.

Mechanically verified in this build: **38 of 39 shots speak**; the one silent shot (`hinge.return`) is a wordless
transition with no caption; **16 learner-paced cue clips** cover the Explore instructions and every recall question,
correction and reveal; **0 clips overrun their shot**; every spoken key is a string that is also on screen; no narration
sentence was authored — all spoken text is assembled from strings already displayed.

- [ ] **8.1** Pacing is appropriate for a Class 10 learner. — **Status: PENDING**
- [ ] **8.2** The voice is clear and the delivery is acceptable. — **Status: PENDING**
- [ ] **8.3** Narration and captions correspond in a way that helps rather than distracts. — **Status: PENDING**
- [ ] **8.4** Leaving the provenance notes unspoken (they are on screen only) is acceptable. — **Status: PENDING**
- [ ] **8.5** The silent transition is acceptable. — **Status: PENDING**

---

## 9. Camera and visual teaching

See `review-manifest.json → lesson.structure` (every shot's camera block) and the chapter captures.

- [ ] **9.1** In every shot the subject is obvious. — **Status: PENDING**
- [ ] **9.2** The learner always knows what to look at. — **Status: PENDING**
- [ ] **9.3** Each movement is visually understandable. — **Status: PENDING**
- [ ] **9.4** Transitions support learning rather than decorate it. — **Status: PENDING**
- [ ] **9.5** The close-ups are useful and show the right thing. — **Status: PENDING**
- [ ] **9.6** The final body map reads as a summary, not as the main lesson. — **Status: PENDING**

---

## 10. Accessibility — human validation

See `screen-reader-checklist.md`. Automated evidence is recorded there; it is not a substitute for any item below.

**NVDA = NOT TESTED. VoiceOver = NOT TESTED.** No screen-reader certification may be claimed.

- [ ] **10.1** NVDA (Windows) walkthrough completed. — **Status: PENDING**
- [ ] **10.2** VoiceOver (macOS / iOS) walkthrough completed. — **Status: PENDING**
- [ ] **10.3** The shot descriptions (`a11y.*`) describe what is on screen usefully for a blind learner. — **Status: PENDING**
- [ ] **10.4** The learner can complete the whole lesson with a screen reader, including both interactive detours. — **Status: PENDING**
- [ ] **10.5** Live announcements are neither missing nor overwhelming. — **Status: PENDING**

---

## 11. Performance

See `performance-review.md`. Recorded factually; no release recommendation is made or implied.

Open and unchanged: emulated phone ×4 first meaningful 3D **2742 ms p50** against a 2500 ms target, and drag p95
**45.1 ms** against a 22 ms target. **No real Android device and no real iPad has ever been measured.**

- [ ] **11.1** The measured desktop / integrated-GPU behaviour is acceptable for the intended audience. — **Status: PENDING**
- [ ] **11.2** Decide what real-device evidence is required before release, and on what hardware. — **Status: PENDING**
- [ ] **11.3** Decide whether the emulated ×4 misses must be fixed before release or recorded as a known limitation. — **Status: PENDING**

---

## 12. Asset licence — RELEASE BLOCKER

See `asset-provenance-review.md`. **Nothing here is inferred.** The licence of the source anatomy is unknown.

- [ ] **12.1** Source of `Human_Body_Master.blend` established. — **Status: PENDING**
- [ ] **12.2** Author identified. — **Status: PENDING**
- [ ] **12.3** Licence identified, with the licence text. — **Status: PENDING**
- [ ] **12.4** Permitted usage covers this product and its intended distribution. — **Status: PENDING**
- [ ] **12.5** Required attribution determined and implemented. — **Status: PENDING**
- [ ] **12.6** Acquisition record located (invoice, download, subscription, commission). — **Status: PENDING**
- [ ] **12.7** Copyright metadata recorded. — **Status: PENDING**

**No public release certification may be issued while any item in §12 is open.**

---

## 13. Overall

- [ ] **13.1** Overall expert decision on the `step14b-complete` candidate build. — **Status: PENDING**
- [ ] **13.2** List anything you require fixed before you would sign off. — **Status: PENDING**

Reviewer name, field and date: _______________________________________________
