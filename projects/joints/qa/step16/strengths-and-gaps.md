# Strengths, gaps, recommendations and a proposed journey

Nothing in this document has been implemented. It is a decision aid for the next step.

---

# Part 1 — What we already do better

Only observable items. Each was seen in the running build or in the Step-15B storyboard of this build.

| Strength | Evidence | Reference equivalent |
|---|---|---|
| **A validated, manipulable joint.** Single DOF, 0–145°, fitted axis, neutral offset, clamped, draggable by the bone or a slider, with a live angle readout, arrow keys, `R`, `Escape`. | `explore_hinge_open.png`; live drag in the running build | **None.** The reference model cannot be moved at all. |
| **A guided task with a pass condition.** "Bend the elbow to about 90°" → *Check my pose* → confirmation held 1600 ms. | `06_hinge__hinge.check.png` | **None.** |
| **Retrieval practice.** Five questions, each phrased as a *movement*, four category options, wrong answers handled. | `recall_1_question.png` … `recall_5_answered.png` | **None.** No assessment of any kind exists. |
| **Movement-based classification as the teaching goal.** The hook asks why two joints move differently; the recall asks the learner to classify from behaviour. | `hook.question`, chapter 08 | The reference teaches a sequence, not a classification. |
| **A universal explore architecture.** Four explorations sharing one panel, one status vocabulary and one keyboard model; the film hands off and resumes. | `explore_*_open.png` for all four | One explore mode, no handoff from a lesson beat. |
| **Schematic honesty.** `TEACHING SIMULATION` vs `3D JOINT MODEL` badges, a persistent on-stage teaching status, a Sources & draft status dialog, `DRAFT` provenance on every enriched string. | live build; `qa/step15b/disclaimer-review.md` | The reference makes **no** distinction between validated and schematic content anywhere. |
| **Elbow anatomical detail.** Humerus/radius/ulna geometry, the fitted flexion axis drawn on the bone, joint capsule and ligaments. | `hinge.axis`, `hinge.bones`, `hinge.support` | Comparable detail at the alveoli; nothing comparable for a joint. |
| **Accessibility foundation.** `role="img"` on the stage with a per-shot description, `aria-live` region, `main`/`header`/`footer` landmarks, 0 axe violations across 24 states, 341 measured contrast runs with 0 below threshold, reduced motion across all 40 shots, reflow at 320 px, 44 px targets. | `qa/step15b/regression-report.md`; re-probed live today | The reference has `lang`, an `aria-live` subtitle, labelled controls and a reduced-motion block — but the canvas is `tabindex="-1"` with no `role` or description, and there is no measured evidence. |
| **Keyboard interaction with the subject.** Arrow keys drive the joint; `R` resets; `Escape` returns; the whole lesson is keyboard-navigable. | live build | The reference's model is not keyboard-reachable. |
| **Responsive behaviour.** Verified at 1280 / 1440 / 768 / 412 / 390 / 320. | `phone_*.png`; `qa/step15b/regression-report.md` | Reflows acceptably; no record. |

**These should be protected in any future work.** The temptation after an audit like this is to make the
product calmer by removing things; three of the items above are the things that would go first, and they are
the reasons our lesson teaches more durably than the reference's.

---

# Part 2 — Recommendations, by category

Each in the required shape. **None of these is implemented.**

## A. Teaching methodology

### A1 — Give the four categories one repeated shape
- **Current problem.** Chapters 03–06 are taught to wildly different depths (14 s / 21 s / 22.5 s / 98 s) and
  in different shapes. Only the hinge answers *what / where / what it does / how it moves / why it is that
  kind*.
- **Reference pattern.** Every scene has the same internal shape: name the structure → show its distinguishing
  feature → say what that feature is for.
- **Why it helps learning.** A repeated shape lets the learner predict what is coming, which frees working
  memory for the content; and it makes the four categories comparable, which is the whole point of a
  taxonomy.
- **Application to joints.** Each category chapter becomes: *look at the join* (still) → *watch it move* →
  *this is why it is called X*. Chapter 04 already has the first two beats after Step 15B; 03 and 05 do not.
- **Complexity.** Medium. Content, locale strings, camera direction and narration rebuild. No new assets, no
  rig work.

### A2 — Give the lesson a spine
- **Current problem.** The question asked at 0:20 ("why do they move so differently?") is answered once at
  0:34 ("the way the bones meet decides how they can move") and never referred to again. Chapters 03–06 could
  be shuffled without any caption becoming false.
- **Reference pattern.** A journey in which every scene is caused by the previous one.
- **Why it helps learning.** Continuity gives a learner a place to re-enter after attention lapses and turns a
  list into an argument.
- **Application to joints.** A journey is the wrong shape; a **recurring question** is the right one. Return
  to *"the shape of the join decides the movement"* at the start of each category and at the comparison.
- **Complexity.** Low–medium. Words and ordering only.

### A3 — End the lesson explicitly
- **Current problem.** The film simply stops. There is no completion state.
- **Reference pattern.** A *Lesson Complete* card offering Replay and Explore.
- **Why it helps learning.** Closure, and a deliberate next action instead of an empty screen.
- **Application.** An end card offering Replay, Explore, and — uniquely available to us — *Try the recall
  again*.
- **Complexity.** Low.

## B. Narration

### B1 — Separate the caption from the script
- **Current problem.** Our caption is simultaneously the headline and the entire spoken explanation, so it is
  neither. 1.27 spoken words per second against the reference's 2.54.
- **Reference pattern.** A short fixed caption plus a longer, separately authored narration shown as a rolling
  subtitle.
- **Why it helps learning.** Dual coding: a durable short statement to hold, and a fuller spoken explanation
  that supplies the reason.
- **Application to joints.** Add a `narration.*` string per shot, `draft-enrichment`, reviewed by the same
  expert, subtitled. The existing provenance rule is satisfied — the spoken text is still a reviewable locale
  string with a provenance class; it is simply no longer required to be identical to the caption.
- **Complexity.** Medium. ~36 new strings, subtitle UI, narration rebuild, schema and validator change, tests.

### B2 — Say why, not only what
- **Current problem.** 2 of 36 captions give a reason. The reference gives one in 5 of 13 scenes, and those
  are its memorable lines.
- **Reference pattern.** *"…so that it does not collapse when we breathe in."*
- **Why it helps learning.** A reason is reconstructible; a fact is only recallable.
- **Application.** Each category needs the sentence that makes it that category: why fused skull bones cannot
  move; why a peg-in-a-ring turns instead of bending; why a ball in a hollow moves in many directions; why a
  hinge only goes one way. Every one of these is a **curriculum claim and must be expert-reviewed** before it
  is written.
- **Complexity.** Medium, and **gated on expert review**, not on engineering.

### B3 — Give the lesson one memorable fact
- **Current problem.** Nothing in our lesson is built to be remembered a week later.
- **Reference pattern.** "…the alveoli would cover about eighty square metres."
- **Why it helps learning.** One vivid anchor makes the surrounding structure retrievable.
- **Application.** A single sourced, expert-approved fact about joints.
- **Complexity.** Low to build, **gated on sourcing and expert review**.

## C. Camera direction

### C1 — Always be pushing in
- **Current problem.** Static framings make shots with no animation read as slides (`fixed.detail`,
  `ball.hip`).
- **Reference pattern.** Every one of 13 scenes has `padding > paddingEnd`.
- **Why it helps learning.** Continuous slow motion holds attention and signals that the frame is narrowing on
  something.
- **Application.** A default `scale → endScale` drift on every shot.
- **Complexity.** Low. Content-side; the `endScale` field already exists.

### C2 — Fix the framings that fail
- **Current problem.** `ball.shoulder` runs the humerus off the bottom of the frame and never shows the
  glenoid hollow its own sentence is about; `hinge.try`/`hinge.check` ask the learner to act on the elbow from
  the least legible view of it; `compare.together` puts four 10–30 px indicators on a full body;
  `concept.meet` illustrates "two bones meet" with a three-bone joint.
- **Reference pattern.** `paddingEnd` 0.7–1.15 — the subject fills the frame; one idea per frame.
- **Why it helps learning.** A learner cannot notice what they cannot see.
- **Application.** Re-author those four framings against the frozen close-up spheres, as the Step-15B pivot
  work did (eight candidates rendered and compared).
- **Complexity.** Low–medium per shot. `compare.together` may need to become four sequential close framings
  rather than one wide shot. **Does not touch the elbow rig** — `hinge.try`/`hinge.check` are camera-only
  changes.

### C3 — Make the travel shots talk
- **Current problem.** Five travel shots, 30 s, 11 % of the lesson, carry a title and no teaching.
- **Reference pattern.** 2.4 s cross-fades under continuing narration; no dead transitions.
- **Why it helps learning.** Removes four visible stops and returns 20+ s to teaching.
- **Application.** Keep the travel (its orientation value is real) and speak over it — the connective sentence
  that A2 needs has to go somewhere.
- **Complexity.** Low.

## D. Interaction

### D1 — Participation before chapter 06
- **Current problem.** The first 161 s are entirely passive; the only interaction is at 2:41.
- **Reference pattern.** Not applicable — the reference is less interactive than us. This recommendation comes
  from our own evidence, not theirs.
- **Why it helps learning.** Generation effects; and the current asymmetry teaches the learner that three of
  the four categories are not worth engaging with.
- **Application.** One small act per category chapter — turn the head, swing the arm, try to bend the skull.
- **Complexity.** Medium. Reuses the existing exploration machinery; **must not create new rigs** and must
  keep the teaching-simulation badging.

### D2 — Guided tasks in Explore
- **Current problem.** Explore offers movement with no goal, and in five of nine chapters no content at all.
- **Reference pattern.** Its Explore has a purpose (look a part up) even though it has no task.
- **Why it helps learning.** A goal converts free manipulation into a test of understanding.
- **Application.** See `explore-comparison.md` §6. The `poseTarget` check already exists in the schema.
- **Complexity.** Medium.

## E. Information density

### E1 — Hide non-essential controls while teaching
- **Current problem.** 15 persistent elements, 13 of them controls, on screen for all 280 s; nine chapter
  buttons that wrap into two rows at 800 px and collide with the Explore hint text.
- **Reference pattern.** `class="controls hidden"` during teaching; controls return on demand.
- **Why it helps learning.** Fewer competing objects; the model becomes the most prominent thing in its own
  frame.
- **Application.** Auto-hide the control bar and the chapter strip on idle, reveal on pointer/keyboard.
  **Keyboard reachability must be preserved** — the chapter strip is part of our accessibility posture.
- **Complexity.** Medium. UI and a11y tests.

### E2 — Say the draft disclaimer once to assistive tech, as it is said once visually
- **Current problem.** Step 15B removed the reviewer-language disclaimer from the visible captions, but each
  `DRAFT` badge still carries the full sentence in an `sr-only` span — announced after 36 of 40 captions.
- **Reference pattern.** n/a; this is our own inconsistency.
- **Why it helps learning.** A screen-reader user currently hears 36 repetitions of a 20-word notice.
- **Application.** Keep the visible chip; give assistive tech the same single persistent statement the sighted
  learner gets.
- **Complexity.** Low. **Touches the honesty invariants — must be done with the same care as Step 15B and
  re-tested against them.**

### E3 — Slow the cutting rate
- **Current problem.** A shot change every 7.0 s carrying 8.9 spoken words.
- **Reference pattern.** A scene change every 13.0 s carrying 32.8 spoken words.
- **Why it helps learning.** More time per idea and fewer context switches.
- **Application.** Follows automatically from B1 (longer narration → longer shots) if shot length is derived
  from speech length rather than authored.
- **Complexity.** Medium, and **should follow B1 rather than precede it.**

## F. UI

### F1 — Let text sit on the background, not on a slab
- **Current problem.** The caption panel is the brightest object in several frames and the model is third in
  its own shot.
- **Reference pattern.** Small text top-left, subtitle bottom-centre, no panel.
- **Why it helps learning.** The subject should be the most prominent thing in the frame.
- **Complexity.** Low–medium. **Contrast must be re-measured** — our panel is what currently guarantees the
  measured ratios.

### F2 — Never let a panel cover the structure it explains
- **Current problem.** The explore panel clips the pivot label; the recall panel covers the skull the question
  is about; the flexion panel takes the right third during the guided check.
- **Reference pattern.** Its Explore panel is docked below the viewport and never overlaps the model.
- **Complexity.** Medium.

### F3 — Gloss the technical label
- **Current problem.** `Humerus` / `Radius` / `Ulna` appear as bare labels while the caption says "upper-arm
  bone"; nothing joins the two.
- **Reference pattern.** `Pharynx / THROAT` — exactly five glosses, for exactly the five hard words.
- **Why it helps learning.** The technical term is learned *as* the plain one, in one object, at one moment.
- **Complexity.** Low–medium. **Bone names are curriculum content — expert review applies.**

## G. Explore

### G1 — Make Explore answer the learner's actual question
See `explore-comparison.md` §6 and §7. Includes: remove or repurpose the contentless free-orbit mode in the
five non-joint chapters; consider a per-joint part list so the learner can ask "which bone is this?".
**Complexity.** Medium to high.

## H. Assessment and recall

### H1 — Keep it, and use it earlier
- **Current problem.** Our strongest differentiator fires once, at 3:57, after everything is over.
- **Reference pattern.** None — this is ours alone.
- **Why it helps learning.** Spaced retrieval beats massed retrieval.
- **Application.** One question at the end of each category chapter, with the five-question challenge
  retained as the consolidation pass.
- **Complexity.** Medium. The recall machinery exists; the pacing and film-resume behaviour would need care.

---

# Part 3 — The ten most useful changes, ranked

No numeric scores, as instructed.

### 1. CRITICAL TEACHING GAP — the three non-hinge categories are labelled, not taught
- **What is wrong.** Fixed gets 14 s, pivot 21 s, ball-and-socket 22.5 s; hinge gets 98 s. Only hinge answers
  *why it is that kind of joint*. `ball.hip` spends 8 s on nine words.
- **What to change.** Give each category the same shape and comparable time: see the join → see it move →
  hear why it is called that.
- **Why.** A taxonomy taught unevenly is learned as one example plus three names.
- **Learner benefit.** They can classify an unseen joint instead of recognising four pictures.
- **Affects the validated elbow?** **No.**
- **Effort.** Large — content, camera, narration, tests. The single biggest item on this list.

### 2. CRITICAL TEACHING GAP — the narration states facts and almost never gives reasons
- **What is wrong.** 2 of 36 captions give a reason; 1.27 spoken words per second.
- **What to change.** B1 (separate caption from script) then B2 (say why).
- **Why.** Reasons are reconstructible; facts are only recallable.
- **Learner benefit.** They can explain the lesson to someone else.
- **Affects the validated elbow?** **No.**
- **Effort.** Large, and **gated on expert review** of every new claim.

### 3. HIGH-VALUE — verify that narration actually plays on a stock browser
- **What is wrong.** We autoplay with no start gesture. Autoplay was permitted in this browser pane, but the
  default Chrome/Safari policy blocks audible media without a user gesture. If it is blocked in the field, a
  learner watches a 4:40 lesson in silence and never knows.
- **What to change.** Verify first. If blocked, add a landing card with *Start lesson* — which also buys the
  "13 scenes · about 3 min" expectation-setting and the "turn your sound on" prompt.
- **Why.** Everything else in this audit is worthless if the voice is not heard.
- **Learner benefit.** They hear the lesson.
- **Affects the validated elbow?** **No.**
- **Effort.** Verification: small. Landing card: small.

### 4. HIGH-VALUE — the film clock is frame-driven and desynchronises below ~10 fps
- **What is wrong.** `RenderLoop.ts:81` clamps `dt` at 100 ms, so under ~10 fps the film plays in slow motion
  while the narration audio keeps real time. Measured today: 1.6 fps → **0.125× speed**. The reference stayed
  in real time under the same conditions.
- **What to change.** Drive the timeline from a wall clock (and prefer the audio clock where a clip is
  playing), letting frames drop instead of time.
- **Why.** Step 12's emulated phone misses are still open and no real Android device has been measured. This
  is the failure mode that would turn a slow phone into a broken lesson rather than a choppy one.
- **Learner benefit.** The lesson stays in sync on the devices our learners actually own.
- **Affects the validated elbow?** Touches shared engine timing, so **the elbow's pose animation and the
  Gate-3 pose-consistency tests must be re-run**. It does not change geometry, rig, axis, range or manifest.
- **Effort.** Medium, with real regression risk. Engine change — not to be done casually.

### 5. HIGH-VALUE — `compare.together` and `concept.meet` undermine their own captions
- **What is wrong.** `compare.together` supports the lesson's thesis with four indicators of 10–30 px on a
  full body. `concept.meet` illustrates "a joint is a place where **two** bones meet" with a shot of the
  elbow, where three bones meet.
- **What to change.** Re-author both framings; consider replacing `compare.together` with four sequential
  close framings.
- **Why.** A picture that contradicts its caption costs more than no picture.
- **Learner benefit.** The definition and the summary become believable.
- **Affects the validated elbow?** **No** — camera and content only.
- **Effort.** Small to medium.

### 6. HIGH-VALUE — hide non-essential controls during teaching
- **What is wrong.** 15 persistent elements including nine chapter buttons that wrap to two rows at 800 px and
  collide with the Explore hint text.
- **What to change.** Auto-hide on idle; reveal on pointer or keyboard; preserve keyboard reachability.
- **Why.** The model should be the most prominent object in its own frame.
- **Learner benefit.** Less to ignore; a calmer lesson at no cost to content.
- **Affects the validated elbow?** **No.**
- **Effort.** Medium, with accessibility re-testing.

### 7. HIGH-VALUE — gloss technical labels where they appear
- **What is wrong.** `Humerus` on the model while the caption says "upper-arm bone", with nothing joining them.
- **What to change.** Two-line labels — name plus plain gloss — for exactly the terms that need one.
- **Why.** It is the reference's single most effective device and it costs almost nothing.
- **Learner benefit.** They leave knowing both words and that they are the same thing.
- **Affects the validated elbow?** **No** (label text only; the rig and manifest are untouched).
- **Effort.** Small to medium. Expert review applies to the glosses.

### 8. MEDIUM — participation in the three non-hinge categories
- **What is wrong.** 161 s of pure spectating before the first interaction.
- **What to change.** One small act per category chapter, reusing the existing exploration machinery.
- **Why.** Generation effect, and it removes the message that only the elbow is worth engaging with.
- **Learner benefit.** Three more motor memories instead of three more captions.
- **Affects the validated elbow?** **No — and no new rigs may be created.**
- **Effort.** Medium.

### 9. MEDIUM — a completion state, and spaced recall
- **What is wrong.** The film stops with no closure; the five-question challenge fires once, near the end.
- **What to change.** An end card (Replay / Explore / Try the recall again) and one question per category
  chapter.
- **Why.** Closure plus spaced retrieval.
- **Learner benefit.** They know they finished and they retrieve four extra times.
- **Affects the validated elbow?** **No.**
- **Effort.** Medium.

### 10. OPTIONAL POLISH — constant slow push-in, and the draft disclaimer said once to assistive tech
- **What is wrong.** Static shots read as slides; the `sr-only` draft sentence is announced 36 times.
- **What to change.** A default `scale → endScale` drift; one persistent draft statement for assistive tech
  instead of one per caption.
- **Why.** Both are small, cheap and immediately felt by their respective audiences.
- **Learner benefit.** A lesson that does not look like a slideshow; a screen-reader user who is not read the
  same notice 36 times.
- **Affects the validated elbow?** **No.**
- **Effort.** Small each. The `sr-only` change touches the honesty invariants and must be re-tested against
  them.

---

# Part 4 — The special question

> *If we wanted the Joints lesson to feel as clear and explanatory as the respiratory reference while keeping
> our own anatomy, interaction model and validated elbow, what would the ideal lesson experience look like?*

**Described, not specified. No implementation.**

The reference's clarity comes from a spine, a reason in every scene, and a calm frame. Ours would come from
the same three things applied to a classification rather than a journey — plus the two things the reference
does not have and we do: the learner *doing*, and the learner *being asked*.

### The proposed journey

**0. Before it starts (≈0:00).** A landing card: *Types of Joints — how the shape of a join decides the
movement · 9 parts · about 5 minutes · turn your sound on* · **Start lesson** · **Explore the body**.
It sets the expectation, names the thesis, and produces the gesture that guarantees the voice is heard.

**1. The question (≈0:25).** Unchanged in substance — the shoulder swings, the elbow bends, *"Both are joints.
So why do they move so differently?"* This already works. It ends on the thesis: **the shape of the join
decides the movement.** That sentence becomes the lesson's spine and is heard again at the start of every
category.

**2. What a joint is (≈0:30).** *"A joint is a place where bones meet."* Illustrated by a join where exactly
two bones meet, framed large and centred, so the picture and the sentence agree. Then: *"How they meet decides
how they move — and there are four common ways."* Four ways are named once, as a promise of structure.

**3–6. The four categories, in one repeated shape (≈60 s each).** For each of Fixed, Pivot, Ball-and-socket
and Hinge, the same five beats:

  1. **Arrive.** The camera travels from the last site, and *speaks while travelling* — the connective
     sentence that links this category to the thesis.
  2. **Look at the join.** Nothing moving. The two structures framed large enough that a learner can see them
     as two separate objects. Labels carry the technical name and its plain gloss on two lines.
  3. **Watch it move.** The movement itself, framed so the moving part fills the frame, with the schematic
     status on screen and the honesty badging unchanged.
  4. **Hear why.** The sentence that makes it that category — why interlocked edges cannot slide, why a peg in
     a ring turns instead of bending, why a ball in a hollow goes many ways, why a hinge goes one way. **Every
     one of these is a curriculum claim requiring expert approval before it is written.**
  5. **Do it, and be asked.** One small act (turn the head, swing the arm, bend the elbow — the elbow's being
     the validated rig, unchanged), then one question: *"Which type of joint is this?"* Answered, confirmed,
     and the film continues.

  The hinge chapter keeps everything it has — bones, axis, flexion, extension, your turn, the 90° check, the
  capsule, the knee. It stops being the exception and becomes the template the other three were built to
  match.

**7. Compare (≈40 s).** Not four indicators on one body. Four close framings in sequence, each large enough to
read, each replaying its own movement, each with its one-line rule — then a single wide shot with the four
short labels only (the `map.all` treatment, which already works).

**8. Recall (learner-paced).** The five-question challenge, kept exactly as it is. By this point the learner
has already answered four questions in passing, so this is the fifth retrieval, not the first.

**9. The body map and the close (≈35 s).** The four sites labelled on one body, returning to the opening
framing, and the thesis stated one last time: *the shape of the join decides the movement.* Then a
**Lesson Complete** card: *Replay · Explore the body · Try the recall again.*

**Throughout:**
- a short fixed caption top-left and a rolling subtitle of a longer spoken script bottom-centre;
- shot length derived from the length of its narration, with a floor — never a silent tail, never a cut
  mid-thought;
- every shot drifting slowly inwards;
- the control bar and chapter strip hidden while teaching and returning on pointer or key;
- labels glossed where and only where the word is hard;
- no panel covering the structure it is explaining;
- the draft and teaching-simulation honesty surface intact, stated once rather than per caption.

**Estimated running time: 5:30–6:00** — longer than today's 4:40, saying roughly twice as much, and cutting
half as often.

---

# Part 5 — DO NOT CHANGE

Everything below is out of scope for whatever follows this audit unless a separate brief says otherwise.

**Frozen assets and geometry**
- The Step-13 frozen release baseline (`step13-frozen-baseline`, `537ac71`).
- The master blend (`f7313dab…`) and every working blend; the Blender 5.2.2 pin.
- All 29 frozen source and asset files.
- `public/assets/joints`, `public/assets/body`, `public/assets/shared` — the Step-15B diff over these is empty
  and must stay empty unless a brief explicitly opens them.
- Every GLB and the delivery manifests, including the frozen close-up spheres that camera framings must fit.

**The validated elbow**
- The fitted axis, the pivot, the neutral offset (13.62510376997268°), the single `flexion` DOF, the 0–145°
  range, the geometry, the manifest, the controller and the runtime consistency between them.
- The `flexion` DOF name in the engine.
- `qa/elbow_r.poses.draft.json` stays a **draft**. Formal Gate 3 remains **PENDING EXPERT LANDMARK APPROVAL**.

**Review packages and their status**
- `qa/expert/step15/` and `qa/expert/step15b/` — both stay recoverable and unmodified; no reviewer decision is
  pre-filled by us.
- The asset licence remains a **RELEASE BLOCKER — PENDING**.
- The hip's ball-and-socket classification remains **PENDING EXPERT CONFIRMATION**.
- NVDA and VoiceOver remain **NOT TESTED**.
- Step 12 remains **FAIL**.

**Commitments that must survive any redesign**
- The schematic-honesty system: `TEACHING SIMULATION` vs `3D JOINT MODEL`, the persistent teaching status, the
  Sources & draft status dialog, the `DRAFT` provenance badge and the honesty invariants that hold them.
- No new rigs, no new joint assets, no new categories.
- Narration key handling: the TTS key is supplied only through the `TTS_KEY` environment variable at build
  time and is never written to a file, a manifest or the web build.
- Spoken content remains reviewable locale content with a provenance class. (Recommendation B1 adds a second
  reviewable string per shot; it does not introduce unreviewed narration.)
- The recall challenge, the guided 90° check, and the validated-elbow exploration.
- The accessibility floor: 0 axe violations, measured contrast above threshold, reduced motion across all
  shots, reflow to 320 px, 44 px targets, full keyboard journey.

**Nothing in this audit is a release decision.** The product is not public-release ready and expert review
remains pending on every item.
