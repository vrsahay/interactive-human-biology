# Reviewer checklist — `step16g-narration-repetition-fixed`

**Candidate build:** tag `step16g-narration-repetition-fixed`, commit `11560e3`.
**Package:** `qa/expert/step17/`. `review-manifest.json` records the candidate, the commit that added this package, and a
diff proving that no product file changed between them.

This is the **final review package**. It describes the Step-16G learner experience and nothing earlier. The packages
for Steps 13, 15, 15B and 16E (`qa/expert/`, `qa/expert/step15/`, `qa/expert/step15b/`, `qa/expert/step16e/`) are kept
unchanged as the record of the builds they described. None of them is the build you are reviewing.

**Nothing in this package is an approval.** Every decision starts **PENDING**. A passing automated test is evidence you
may weigh; it can never stand in for your judgement, and no item may be moved off PENDING because a test passed.

---

## How to use this

1. Open the captures in `qa/visual/step17_review/`: 151 images, each listed with its SHA-256 in
   `review-manifest.json`. Better still, use the running build: `npm run build`, then serve `dist/`.
   The captures are reproducible with `node qa/expert/step17/capture_review_set.mjs`.
2. Work through the specialist sheets below. Each holds the detailed items and the evidence behind them:

   | Area | Sheet |
   |---|---|
   | Anatomy, including the elbow, its handover and the teaching representations | [anatomy-review.md](anatomy-review.md) |
   | Curriculum, wording, the draft-enrichment inventory, the taxonomy and the hip | [curriculum-review.md](curriculum-review.md) |
   | Teaching methodology: the nine chapters | [teaching-methodology-review.md](teaching-methodology-review.md) |
   | Narration, including the Step-16G playback fix | [narration-review.md](narration-review.md) |
   | Camera and visual teaching | [camera-review.md](camera-review.md) |
   | The four explorations | [explore-review.md](explore-review.md) |
   | Elbow landmarks: formal Gate 3 | [landmark-review.md](landmark-review.md) |
   | Accessibility: human validation | [accessibility-review.md](accessibility-review.md) |
   | Mobile experience | [mobile-review.md](mobile-review.md) |
   | Performance | [performance-review.md](performance-review.md) |
   | Asset and audio licence: RELEASE BLOCKER | [asset-provenance-review.md](asset-provenance-review.md) |

3. Record each decision in `expert-review-status.json`: your name, the date, the decision and your reasoning.
4. If an item is outside your field, leave it PENDING and say so. Four kinds of reviewer are needed: curriculum,
   anatomy, accessibility and licensing. None should sign for another.

Every decision is one of **PASS**, **REQUEST_FIX**, **REJECT** or **NOT MY FIELD**. None is pre-selected.

---

## 0. What is validated and what is not

| | Status |
|---|---|
| **Right elbow (hinge)** | **VALIDATED PROCEDURAL RIG**: one degree of freedom (`flexion`), fitted axis, 0–145° approximate teaching range. On screen: the neutral badge **"3D joint model"** |
| Skull suture (fixed) | **TEACHING SIMULATION**. On screen: **"Teaching simulation"** plus one plain line |
| Head on C1/C2 (pivot) | **TEACHING SIMULATION** |
| Right shoulder (ball-and-socket) | **TEACHING SIMULATION** |
| Knee, hip | shown and named; **not animated by any rig**; schematic movement marks only |

**Skull, C1/C2, shoulder, hip and knee are not validated procedural rigs**, and nothing in the lesson says they are.

- [ ] **0.1** I understand which content is validated and which is a teaching simulation. — **PENDING**
- [ ] **0.2** The on-screen wording keeps that distinction honest without burdening a learner. — **PENDING**

## 1. Anatomy — [anatomy-review.md](anatomy-review.md)

- [ ] **1.1** Names, placement and laterality (every shown joint is the **right** side). — **PENDING**
- [ ] **1.2** Bone relationships and movement directions, and movement planes where implied. — **PENDING**
- [ ] **1.3** The fitted elbow axis, and the elbow at 0°, 45°, 90° and 145°. — **PENDING**
- [ ] **1.4** The capsule; the radial and ulnar collateral ligament bands; the annular ligament (not shown). — **PENDING**
- [ ] **1.5** The schematic bands read as schematic. — **PENDING**
- [ ] **1.6** The full-body → elbow handover. — **PENDING**
- [ ] **1.7** The fixed, pivot, shoulder, knee and hip representations, each as what it is. — **PENDING**

## 2. Curriculum — [curriculum-review.md](curriculum-review.md)

- [ ] **2.1** Class 10 appropriateness, vocabulary, clarity, correctness, completeness. — **PENDING**
- [ ] **2.2** Every learner-reachable **draft-enrichment** line (125, in `strings-inventory.json`): acceptable, needs
      revision, unsupported, or needs removal. — **PENDING**
- [ ] **2.3** The single source-backed sentence, and its `verifiedAgainstTextbook: false`. — **PENDING**

## 3. Four-category taxonomy

**Fixed · Pivot · Ball-and-socket · Hinge.** Gliding, saddle and "partially movable" are deliberately absent. They are
not to be added unless you ask for them.

- [ ] **3.1** These four categories are appropriate for this specific lesson. — **PENDING**

## 4. Hip classification

The right hip is highlighted in chapters 02 and 07. It is **classified** in one place: the site label "Ball and socket"
on the final body map (chapter 09). No narration or caption names the hip. No reachable NCERT source states the
classification. It is **PENDING EXPERT CONFIRMATION**, and it is deliberately never a recall question.

- [ ] **4.1** Confirm, correct, or require removal. — **PENDING**

## 5. Teaching methodology — [teaching-methodology-review.md](teaching-methodology-review.md)

- [ ] **5.1** The nine chapters teach **what → where → movement → why → try → recall**, not label → definition →
      recap. — **PENDING**

## 6. Narration — [narration-review.md](narration-review.md)

Step 16G fixed a real playback bug in which narration could replay a word ("… joints … joints"). The evidence is in
the sheet. **Please listen to the whole lesson.** Automated measurement does not replace a human ear.

- [ ] **6.1** Clarity, pacing and naturalness through the whole lesson. — **PENDING**
- [ ] **6.2** Narration explains rather than merely labels; any repetition you hear is useful, not accidental. — **PENDING**

## 7. Camera — [camera-review.md](camera-review.md)

- [ ] **7.1** Subject clarity, orientation, close-ups, transitions and movement visibility, in every chapter. — **PENDING**

## 8. Explore — [explore-review.md](explore-review.md)

- [ ] **8.1** Each of the four explorations: interaction, task, reset, return, purpose. — **PENDING**
- [ ] **8.2** A learner cannot mistake a teaching simulation for validated biomechanics. — **PENDING**

## 9. Landmarks — formal Gate 3 — [landmark-review.md](landmark-review.md)

**FORMAL GATE 3 = PENDING EXPERT LANDMARK APPROVAL.** `qa/elbow_r.poses.draft.json` remains a draft.

- [ ] **9.1** The eight landmarks, their definitions, tolerances and membership. — **PENDING**

## 10. The 0–145° range

On screen: *"0-145 deg is an approximate teaching range for this model; adult elbow flexion varies between people (see
Sources)."* The reference kept in the project is Zwerus et al. (2019), *Shoulder & Elbow* 11(3):215–224. It supports the
reasonableness of a teaching range. It does not validate this model, and 145° is not presented as a universal
anatomical maximum.

- [ ] **10.1** Decision on the range as presented: **PASS** or **REQUEST_FIX**. — **PENDING**

## 11. Accessibility — [accessibility-review.md](accessibility-review.md)

**NVDA = NOT TESTED. VoiceOver = NOT TESTED. TalkBack = NOT TESTED.**

- [ ] **11.1** Human screen-reader walkthroughs, if certification is required. — **PENDING**

## 12. Mobile experience — [mobile-review.md](mobile-review.md)

Every mobile result in this package is **emulated** in desktop Chrome. **Android = NOT TESTED. iPad = NOT TESTED.**

- [ ] **12.1** Mobile usability, judged on real devices. — **PENDING**

## 13. Performance — [performance-review.md](performance-review.md)

**Step 12 = FAIL** and unchanged: emulated phone ×4 first meaningful 3D 2742 ms p50; drag p95 45.1 ms.

- [ ] **13.1** What real-device evidence is required, and whether the misses block release. — **PENDING**

## 14. Licensing — RELEASE BLOCKER — [asset-provenance-review.md](asset-provenance-review.md)

The source anatomy's licence is **unknown**. The terms for the synthesized narration audio are not established.

- [ ] **14.1** Anatomy asset: source, author, licence, permitted use, attribution, acquisition record. — **PENDING**
- [ ] **14.2** Narration audio: redistribution terms and attribution. — **PENDING**

**No public-release certification may be issued while §14 is open.**

## 15. Overall

- [ ] **15.1** Overall expert decision on `step16g-narration-repetition-fixed`. — **PENDING**
- [ ] **15.2** Anything you require fixed before you would sign off. — **PENDING**

Reviewer name, field and date: _______________________________________________
