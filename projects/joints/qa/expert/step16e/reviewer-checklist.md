# Reviewer checklist — `step16e-mobile-finalization-complete`

**Candidate build:** tag `step16e-mobile-finalization-complete`, commit `d947e0b`, 2026-09-21.
**Package commit:** the commit that added this directory. `review-manifest.json` records both, and records a diff
proving that no product file changed between them.

This package **supersedes** `qa/expert/step15b/`, which superseded `qa/expert/step15/` and `qa/expert/`. All three are
retained unchanged: each is the honest record of the build it described.

**What changed since the last package:** see [changes-since-step15b.md](changes-since-step15b.md). In one line: every
category is now taught rather than introduced; Explore and narration were made reliable; reviewer noise left the
learner's screen; and on a phone the exploration no longer covers the joint it asks the learner to move.

**Nothing in this package is an approval.** Every item below starts **PENDING**. No automated result may move one.

---

## How to use this

1. Work through the sections below. Keep the captures in `qa/visual/step16e_review/` open, or use the running build.
   There are 109 captures, each listed with its SHA-256 in `review-manifest.json`. Captures live outside git by
   repository policy; regenerate them with `node qa/expert/step16e/capture_review_set.mjs` and check them against the
   recorded hashes. To review off this machine, ship `qa/visual/step16e_review/` with the package.
2. Record every decision in `expert-review-status.json`: your name, the date, the decision, and your reasoning.
3. **A passing automated test is evidence, not approval.** Where automated evidence is quoted, it is so that you can
   weigh it, never so that it can stand in for you.
4. If an item is outside your field, leave it `PENDING` and say so. Four kinds of reviewer are needed: curriculum,
   anatomy, accessibility and licensing. None of them should sign for another.

Every decision is one of **PASS**, **REQUEST_FIX**, **REJECT** or **NOT MY FIELD**. None is pre-selected.

**Sheets that still apply unchanged.** The anatomy assets, the validated elbow, its landmarks and the asset
provenance are **byte-identical** to the Step-15B candidate (hashes in `review-manifest.json → integrity`). For those
sections, the Step-15B reviewer sheets remain the detailed item lists:

- `qa/expert/step15b/anatomy-review.md`
- `qa/expert/step15b/asset-provenance-review.md`
- `qa/expert/step15b/screen-reader-checklist.md`
- `qa/expert/step15b/performance-review.md`

Record your decisions **here**, for this candidate.

---

## 0. What is validated and what is not

| | Status |
|---|---|
| **Right elbow (hinge)** | **VALIDATED PROCEDURAL RIG**: single degree of freedom `flexion`, fitted axis, 0–145° approximate teaching range. On screen: the neutral badge **"3D joint model"** |
| Skull suture (fixed) | **TEACHING SIMULATION** |
| Head on C1/C2 (pivot) | **TEACHING SIMULATION** |
| Right shoulder (ball-and-socket) | **TEACHING SIMULATION** |
| Hip, knee | shown and named; **not animated by any rig** |

- [ ] **0.1** I have understood which content is validated and which is a teaching simulation. — **Status: PENDING**
- [ ] **0.2** The learner now sees **no DRAFT badge and no Sources control** while the lesson plays. Provenance is one
      tap away, under Settings → For teachers (capture `teacher_sources.png`), and is still recorded on every caption.
      Confirm that balance is right: honest to a teacher, quiet to a learner. — **Status: PENDING**
- [ ] **0.3** The badges **"Teaching simulation"** and **"3D joint model"**, and the one plain line shown on entering a
      teaching simulation, will not mislead a Class 10 learner or their teacher. — **Status: PENDING**

## 1. Teaching methodology

Captures `01_hook__*` … `09_body_map__*`, all 52 shots at 1280×800.

| # | Chapter | What it is for |
|---|---|---|
| 01 | Hook | why do a shoulder and an elbow move so differently? |
| 02 | What is a joint? | two bones meet; the shape of the meeting decides the movement |
| 03–06 | Fixed · Pivot · Ball-and-socket · Hinge | the same six beats each: arrive → look → movement → **why** → name → **your task** |
| 07 | Compare | one pattern at a time, then all four |
| 08 | Recall | five questions: shown a joint, name its category |
| 09 | Body map | the memory anchor |

- [ ] **1.1** The sequence suits a Class 10 learner. — **Status: PENDING**
- [ ] **1.2** Each category is now **taught** (a reason for the movement is given), not only introduced. Say where it
      is not. — **Status: PENDING**
- [ ] **1.3** The four learner tasks are sensible and achievable. — **Status: PENDING**
- [ ] **1.4** The length, 6 min 21 s of film plus learner-paced tasks and recall, is appropriate. — **Status: PENDING**
- [ ] **1.5** Useful repetition (introduce → demonstrate → compare → anchor) helps rather than bores. — **Status: PENDING**

## 2. Curriculum and wording

`strings-inventory.json` lists every string a learner can reach, with where it appears and whether it is spoken:

| Class | Count |
|---|---|
| A — source-backed | **1** |
| Figure reference | **22** |
| B — draft enrichment | **125**: written for this lesson, not NCERT wording, and none of the 64 added since Step 15B has been reviewed |
| C — interface | **8** |

- [ ] **2.1** The A string is used correctly and in context. — **Status: PENDING**
- [ ] **2.2** Every B string is factually correct. — **Status: PENDING**
- [ ] **2.3** They are age-appropriate and clear. — **Status: PENDING**
- [ ] **2.4** The **spoken lines** (shown as subtitles) are correct. They are separate strings from the headlines since
      Step 16B. — **Status: PENDING**
- [ ] **2.5** **Changed in Step 16E:** `narr.ball.move` was *"That one joint gives the arm more freedom than any other
      in the body…"*. That is an unsourced comparative claim, and it was removed. It is now *"From this one joint, the
      arm can move in many directions: forward, backwards, out sideways, and right round."* Confirm the replacement,
      or supply wording. — **Status: PENDING**
- [ ] **2.6** In the fixed exploration, the task (*"Try to move the two skull bones apart."*) and the instruction below
      it (*"Try to move the skull bones."*) are near-duplicates on screen. Keep both, or reword one. — **Status: PENDING**
- [ ] **2.7** The four-category taxonomy (Fixed, Pivot, Ball-and-socket, Hinge) is appropriate. Gliding, saddle and
      "partially movable" are deliberately absent. — **Status: PENDING**
- [ ] **2.8** The **hip** as ball-and-socket: no reachable NCERT source states this. It is **PENDING EXPERT
      CONFIRMATION** and is never used as a recall question. Confirm, correct, or remove. — **Status: PENDING**
- [ ] **2.9** `hinge.axis_note` is a draft string that nothing in the lesson references. Keep it for later, or approve its
      removal. — **Status: PENDING**

## 3. Anatomy

Detailed item list: `qa/expert/step15b/anatomy-review.md`. The assets are byte-identical to that candidate. The
captures to use are this package's.

- [ ] **3.1** Names, laterality (all shown joints are **right**) and placement are correct. — **Status: PENDING**
- [ ] **3.2** Bone relationships and movement directions are correct in each demonstration. — **Status: PENDING**
- [ ] **3.3** The elbow at 0°, 45°, 90° and 145° looks right (`elbow_000` … `elbow_145`). — **Status: PENDING**
- [ ] **3.4** Capsule and ligament bands are acceptable, and clearly schematic. — **Status: PENDING**
- [ ] **3.5** The three teaching simulations are acceptable **as teaching simulations**. — **Status: PENDING**
- [ ] **3.6** Knee as hinge, and hip as ball-and-socket (see 2.8). — **Status: PENDING**

## 4. Elbow landmarks (formal Gate 3)

**FORMAL GATE 3 = PENDING EXPERT LANDMARK APPROVAL.** `qa/elbow_r.poses.draft.json` is unchanged and still a draft.
The item list is in `qa/expert/step15b/anatomy-review.md` §4.

- [ ] **4.1** I approve the landmark set, tolerances and membership for formal Gate 3. — **Status: PENDING**

## 5. The 0–145° range

Unchanged wording: *"0-145 deg is an approximate teaching range for this model; adult elbow flexion varies between
people."* The Zwerus et al. (2019) reference supports the reasonableness of a teaching range. It does not validate
this model.

- [ ] **5.1** Decision on the range as presented. — **Status: PENDING**
- [ ] **5.2** The wording does not read as a universal anatomical maximum. — **Status: PENDING**

## 6. Explore experiences, including on a phone

Captures `explore_*_open` / `_moved` at 1280×800, and `phone390_explore_*` / `phone412_explore_*`.

| | Task | Movement model | Status shown |
|---|---|---|---|
| Fixed | try to move the two skull bones apart | ±0.5°, springs back | Teaching simulation |
| Pivot | turn the head as if looking over one shoulder | −60°…+60° | Teaching simulation |
| Ball-and-socket | move the arm in two different directions | −95°…+15° × −40°…+85° | Teaching simulation |
| Hinge | bend the elbow to about 90° | 0–145°, the validated DOF | **3D joint model** |

- [ ] **6.1** Each interaction communicates its concept. — **Status: PENDING**
- [ ] **6.2** No interaction **overstates anatomical validation**. This is the item this package exists to protect. — **Status: PENDING**
- [ ] **6.3** **On a phone** (390×844 and 412×844), the joint is clearly visible and not behind the task card while the
      learner is asked to move it. Measured as 0 % covered; see `qa/step16e/mobile-explore-review.md`. Please judge it
      by eye, and **on a real phone if you can**: none has been used. — **Status: PENDING**
- [ ] **6.4** Reset and return behave sensibly. — **Status: PENDING**

## 7. Retrieval challenge

Five questions: skull → fixed, neck → pivot, shoulder → ball-and-socket, elbow → hinge, knee → hinge. The category is
never named in the question, which is checked mechanically.

- [ ] **7.1** The questions and reveals are correct and fair. — **Status: PENDING**
- [ ] **7.2** Two "hinge" answers (elbow and knee) help rather than confuse. — **Status: PENDING**
- [ ] **7.3** The handling of a wrong answer (`recall_1_wrong`) is appropriate. — **Status: PENDING**

## 8. Narration

Mechanically verified in this candidate: **52 of 52 shots speak**, and **24 learner-paced cues** cover the tasks,
confirmations and every recall step. **0 clips overrun their shot**; every clip is at a speaking rate of 1.0. Every
spoken key is also on screen. There is one narration owner at a time, with no double voice and no stale clip after
navigation.

- [ ] **8.1** Pacing suits a Class 10 learner. — **Status: PENDING**
- [ ] **8.2** The voice and delivery are acceptable. — **Status: PENDING**
- [ ] **8.3** Headline on screen plus a spoken sentence as subtitle helps rather than distracts. — **Status: PENDING**

## 9. Camera and visual teaching

- [ ] **9.1** In every shot the subject is obvious, and the learner knows what to look at. — **Status: PENDING**
- [ ] **9.2** Each movement is visually understandable. — **Status: PENDING**
- [ ] **9.3** On a phone, the framing gives the joint enough of the screen (`phone390_*`, `phone412_*`). — **Status: PENDING**

## 10. Accessibility — human validation

**NVDA = NOT TESTED. VoiceOver = NOT TESTED. TalkBack = NOT TESTED.** No screen-reader certification may be claimed.
Automated evidence (axe 0 violations, keyboard-only completion, focus management, measured contrast) is in
`qa/step16e/accessibility-review.md`. It is not a substitute for any item below.

- [ ] **10.1** NVDA walkthrough completed. — **Status: PENDING**
- [ ] **10.2** VoiceOver walkthrough completed, including on an iPhone. — **Status: PENDING**
- [ ] **10.3** On a phone, focus moving into the exploration card (when the player steps aside), and back, works with a
      screen reader. — **Status: PENDING**
- [ ] **10.4** Live announcements are neither missing nor overwhelming. — **Status: PENDING**

## 11. Performance

Open and unchanged: Step 12's emulated phone ×4 misses (first meaningful 3D 2742 ms p50 against 2500 ms; drag p95
45.1 ms against 22 ms). **No real Android device or iPad has been measured.** Step 16E added 4 KB of JS and CSS and
changed no asset.

- [ ] **11.1** Decide what real-device evidence is required before release, and on what hardware. — **Status: PENDING**

## 12. Asset licence — RELEASE BLOCKER

The item list is in `qa/expert/step15b/asset-provenance-review.md`. Nothing has changed: the licence of the source
anatomy is **unknown**.

- [ ] **12.1** Source, author, licence, permitted use, attribution and acquisition record established. — **Status: PENDING**

**No public-release certification may be issued while §12 is open.**

## 13. Overall

- [ ] **13.1** Overall expert decision on `step16e-mobile-finalization-complete`. — **Status: PENDING**
- [ ] **13.2** Anything you require fixed before you would sign off. — **Status: PENDING**

Reviewer name, field and date: _______________________________________________
