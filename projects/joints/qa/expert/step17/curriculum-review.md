# Curriculum review — `step16g-narration-repetition-fixed`

Every item is **PENDING**. `strings-inventory.json` in this directory lists every learner-reachable string, split by
provenance, with where it appears and whether it is spoken. Record decisions in
`expert-review-status.json → curriculum`.

---

## 0. Provenance, stated plainly

The lesson declares `curriculum.status: "draft"`. Four kinds of text reach a learner:

| | Kind | Learner-reachable | Meaning |
|---|---|---|---|
| **A** | Source-backed | **1** | reproduced from a curriculum excerpt supplied by the project owner, with a declared `sourceId` |
| — | Figure reference | **22** | category names, chapter titles and site labels that follow the supplied NCERT figure's taxonomy and locations only. No artwork, wording or layout reused |
| **B** | **Draft enrichment** | **125** | **written for this lesson; not NCERT wording.** This is the bulk of the teaching text and the main thing you are asked to check |
| **C** | Interface | **8** | buttons, status words, prompts; no educational claim |

The locale file holds 126 draft-enrichment strings. The 126th, `hinge.axis_note`, is not referenced anywhere in the
lesson or the code, so no learner sees it. It is kept, with its provenance, and flagged for cleanup.

**What a learner sees of provenance.** Nothing while the lesson plays. The DRAFT badges and the per-caption disclaimer
were removed from the teaching surface in Step 16D. The classification is still on every caption as
`data-provenance`, and it is shown to teachers under **Settings → For teachers → Sources & draft status** (capture
`teacher_sources.png`).

**The one source-backed sentence** is `source.elbow_hinge`: *"The elbow bends and straightens in one direction, similar
to a door hinge."* It is the on-screen heading of shot `hinge.source`. Its source is `brief-excerpt-hinge`, an excerpt
supplied in the project brief. **`verifiedAgainstTextbook: false`**: the NCERT files are not in the repository, and
nobody has checked this sentence against an official copy. The narration for that shot is a draft paraphrase: *"The
elbow bends and straightens in one direction, the way a door swings on its hinges."*

- [ ] **C0.1** The A / figure / B / C split is honest and correctly applied. — **PENDING**
- [ ] **C0.2** Nothing that is draft enrichment is passed off as sourced curriculum. — **PENDING**
- [ ] **C0.3** The source-backed sentence is used correctly; paraphrasing it in the narration is acceptable. — **PENDING**
- [ ] **C0.4** Who resolves `verifiedAgainstTextbook: false`, and against which edition? — **PENDING**
- [ ] **C0.5** Keeping provenance off the learner's screen, and available to teachers under Settings, is the right
      balance. — **PENDING**

## 1. Draft-enrichment inventory — a decision per line

`strings-inventory.json → B_draftEnrichment` lists all **125** learner-reachable draft lines. Each entry records its key,
text, every place it appears, whether it is spoken, and `expertDecision: "PENDING"`, with these options:

| Decision | Meaning |
|---|---|
| `acceptable` | correct and suitable as written |
| `needs revision` | the idea is right, the wording is not; supply the correction |
| `unsupported` | the claim needs a source before it can stay |
| `needs removal` | should not be in this lesson |

No classification has been changed, and none may be changed automatically. A draft line never becomes source-backed
without a declared, checked source.

**Lines changed recently, so never reviewed:**

| Key | Now | Changed in | Why |
|---|---|---|---|
| `narr.ball.move` | "From this one joint, the arm can move in many directions: forward, backwards, out sideways, and right round." | 16E | replaced the unsourced claim that the shoulder gives "more freedom than any other" joint |
| `narr.fixed.try` | "Watch the join itself. Nothing slides, nothing bends, nothing shifts at all." | 16D | removed a repeated sentence |
| `narr.map.all` | "Four joins, four shapes, four kinds of movement. The shape of the join is what decides." | 16D | stopped reading the on-screen list aloud |
| `narr.map.fixed` / `.pivot` / `.ball` / `.hinge` | the four sentences previously shown as body-map captions, now spoken | 16D | moved, not rewritten |
| every `narr.*` spoken line, and every `*.head` headline | the chapter-by-chapter teaching text | 16B | the category chapters were deepened to arrive → look → movement → why → name → task |

**Consistency points noticed while packaging.** They were not changed, because this step changes no content:

- [ ] **C1.1** The scapula is "a hollow of the **shoulder bone**" in the `ball.name` heading, but "the **shoulder
      blade**" in the `ball.bones` narration. Pick one. — **PENDING**
- [ ] **C1.2** The fixed chapter says "Almost no movement" (heading), "nothing shifts at all" (narration), "cannot move"
      and "do not move against each other". Is that consistent, and consistent with the exploration's ±0.5° that springs
      back? — **PENDING**
- [ ] **C1.3** In the fixed exploration the task (*"Try to move the two skull bones apart."*) and the instruction
      (*"Try to move the skull bones."*) are near-duplicates on screen. — **PENDING**
- [ ] **C1.4** "upper arm bone" and "upper-arm bone" are both used. — **PENDING**
- [ ] **C1.5** Every draft line: acceptable / needs revision / unsupported / needs removal (in `strings-inventory.json`). — **PENDING**

## 2. The lesson, as a learner meets it

The headings and spoken lines per chapter are in [teaching-methodology-review.md](teaching-methodology-review.md) §2.
For the curriculum questions:

- [ ] **C2.1** Class 10 appropriateness. — **PENDING**
- [ ] **C2.2** Vocabulary. The lesson uses **joint, bone, flexion, extension, axis** and the four category names. It
      names only the humerus, radius and ulna (as 3D labels), and not abduction, adduction or plane names. — **PENDING**
- [ ] **C2.3** Clarity. — **PENDING**
- [ ] **C2.4** Correctness of every WHY explanation. For example: skull edges "lock into each other, and tough fibres
      hold them"; the pivot "turns around one line running straight up through both bones"; the ball-and-socket "can
      roll and turn in every direction at once"; the elbow's humeral end "is like a spool, and the forearm bone wraps
      around it". — **PENDING**
- [ ] **C2.5** Completeness for the stated scope. — **PENDING**
- [ ] **C2.6** Teaching order: movement is shown before the category is named. A test asserts that chapters 01 and 02
      never speak the words fixed, pivot, ball-and-socket or hinge. — **PENDING**
- [ ] **C2.7** The examples (skull suture, top of the neck, shoulder, elbow, knee) are useful and correct. — **PENDING**
- [ ] **C2.8** The recall challenge (chapter 08) is fair; see §4. — **PENDING**
- [ ] **C2.9** The final body map works as a summary. — **PENDING**

## 3. The four-category taxonomy

**Fixed · Pivot · Ball-and-socket · Hinge**, and no others. **Gliding**, **saddle** and **partially movable** are
deliberately absent. They are not to be added unless you ask for them.

- [ ] **C3.1** Is exactly this taxonomy appropriate for **this** lesson? — **PENDING**
- [ ] **C3.2** If a category should be added or renamed, which, and where. — **PENDING**
- [ ] **C3.3** The four one-line characterisations in chapter 07 and on the body map are complete enough not to
      mislead. — **PENDING**

## 4. Recall challenge

Five questions. The category is never named in a question (a test checks the words mechanically). Site labels and
movement marks are off, and the answer appears only after the learner names it.

| # | Joint | Question | Answer | Reveal |
|---|---|---|---|---|
| 1 | skull | These skull bones hardly move at all. | Fixed | Fixed: the bones hold firm, so there is little or no movement. |
| 2 | neck | The head turns around the bone below it. | Pivot | Pivot: one bone rotates around another. |
| 3 | shoulder | The arm moves in many directions. | Ball and socket | Ball-and-socket: the rounded end sits in a socket, so it moves many ways. |
| 4 | elbow | This joint bends and straightens in one direction. | Hinge | Hinge: it bends and straightens in one main direction. |
| 5 | knee | This joint in the leg bends and straightens one way. | Hinge | Hinge: the knee bends and straightens, like the elbow. |

A wrong answer: *"Not that one. Look at how it moves."* The learner tries again; nothing is scored.

- [ ] **C4.1** The questions and reveals are correct and fair. — **PENDING**
- [ ] **C4.2** Two "hinge" answers (elbow, knee) help rather than confuse. — **PENDING**

## 5. The hip

**PENDING EXPERT CONFIRMATION.** The right hip is labelled "Ball and socket" on the final body map only. No narration or
caption names it, no reachable NCERT source states the classification, and it is never a recall question.

- [ ] **C5.1** Confirm, correct, or require removal. — **PENDING**

## 6. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Findings | |
| Decision | |
