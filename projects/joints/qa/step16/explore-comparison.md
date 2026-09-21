# Explore comparison

The two products mean almost opposite things by the word "Explore". This is the category where we are most
clearly ahead in one dimension and most clearly behind in another.

---

## 1. What each one is

### Reference — *Explore the model*: a labelled part browser

Entered from the landing card or the end card, or from the control bar at any time.

- **31 parts**, each with a plain-English description of one or two sentences. Examples, verbatim from its
  data: *"A dome of muscle under the lungs. It contracts and flattens when we breathe in, and relaxes upward
  when we breathe out."* · *"Twelve pairs of ribs protect the lungs. They move up and out when we breathe
  in."* · *"Curved shelves of bone in the nasal cavity that make the air swirl over the moist lining."*
- Parts are **grouped into categories** (`NOSE & THROAT`, `BREATHING MUSCLES & CHEST`, …).
- A **search box** filters the list as you type.
- Selecting a part: the camera reframes to it, the part lights up, everything else ghosts, a label anchors to
  it with a leader line, and the panel shows its name and description.
- **Click the model directly** to select a part; drag to rotate; scroll to zoom.
- `Show all` restores the whole model; `Back to lesson` returns.
- Nothing is animated and nothing is manipulated. It is a reference work.

### Ours — *Explore this joint*: a movement instrument

- **Four explorations**: `fixed`, `pivot`, `ball_socket` (teaching simulations) and `hinge` (the validated
  rig).
- The hinge exploration is **direct manipulation of a real single-DOF joint**: drag the forearm or the
  slider, 0–145°, live angle readout, arrow-key support, `R` to reset, `Escape` to return, with the
  explanation *"Bending is flexion. Straightening is extension. A hinge joint does both, in one direction."*
  and a `3D JOINT MODEL` badge.
- The other three drive render groups about an axis and are badged `TEACHING SIMULATION` with the line
  *"This shows the movement pattern. The bones are real; the movement is a demonstration."*
- In the five chapters that have no exploration (`hook`, `what_is_joint`, `compare`, `recall`, `body_map`)
  the same button gives **free orbit only** — the panel is replaced by the hint
  *"Drag to look around · Return to film view"* and the button becomes *Resume film*.

---

## 2. Interaction philosophy, compared

| | Reference | Ours |
|---|---|---|
| Core verb | **look up** | **do** |
| Unit | a named part | a joint's movement |
| Coverage | 31 parts across the whole model | 4 joints |
| Does it teach? | yes — every part carries an explanation | partly — three of four carry one sentence; the hinge carries two |
| Can the learner find a part they remember from the lesson? | yes, by name, by search, or by clicking it | **no** — there is no part list, no search, and clicking a bone does not select it |
| Does the learner produce the phenomenon? | no | **yes, at the elbow** |
| Is there a task? | no | no |
| Freedom | high, but bounded by a list | low, and bounded by one DOF |
| Purpose obvious on entry? | yes — a list of parts and a search box explain themselves | yes for the four joints; **no** for the other five chapters, where the button opens something with nothing in it |

---

## 3. Does Explore feel like a continuation of the lesson?

**Reference: yes, weakly.** It is the same model, the same labels and the same voice of writing, so it reads
as the lesson's appendix. But it is entirely disconnected from the narrative — nothing in it refers to the
journey, and there is no reason to open any particular part.

**Ours: yes, strongly, in the four joint chapters.** The exploration opens on the joint the film is already
looking at, with the same label, and asks the learner to perform the movement that was just described. Since
Step 15B the hinge exploration reuses *flexion* and *extension*, the words taught 40 s earlier. That is a
genuinely good continuation and is better than anything in the reference.

**Ours: no, in the other five.** Opening Explore during `compare` or `recall` produces a free-orbit mode with
no content, no task and no explanation. The button is equally prominent there.

---

## 4. Is the interaction constrained appropriately?

- **Reference:** yes. You cannot break anything; the only freedom is which part to look at.
- **Ours, hinge:** yes, and this is a strength — 0–145°, one axis, clamped, with the neutral offset applied.
  The learner cannot produce an anatomically impossible pose.
- **Ours, the other three:** appropriately constrained *and* honestly labelled, which matters. The risk is the
  opposite one — the constraint is so tight (one axis, one slider) that after five seconds there is nothing
  left to do.

**Neither product has too much freedom. Both have too little purpose.**

---

## 5. Does the learner learn something by exploring?

- **Reference:** yes, incidentally — 31 short descriptions are real content, and the search box makes the
  model usable as a revision tool after the lesson.
- **Ours:** yes at the elbow — bending it yourself and watching the angle readout is the strongest single
  learning moment in either product. Elsewhere, moving a slider through one axis for a few seconds is a
  demonstration, not a discovery.

In neither case is the learner asked to *find out* anything. Nothing sets a goal, nothing checks a result,
nothing is retained afterwards. The reference's Explore is a dictionary; ours is a toy at three sites and an
instrument at the fourth.

---

## 6. Should our Explore include guided tasks rather than only movement controls?

**On the evidence, yes** — and we already have the proof inside the film. `hinge.check` ("Try it: bend the
elbow to about 90°" with *Check my pose*) is a guided task with a pass condition, it exists, it works, and it
is the only place in either product where a learner does something and finds out whether they were right.
That machinery (`check: { type: "poseTarget", dof, target, tolerance, holdMs }`) is confined to one shot of
one chapter.

Candidate shapes, described only:

- a task per exploration — *"turn the head as far as it will go"*, *"find the position where the elbow will
  not bend any further"*, *"move the shoulder in two different directions"*;
- a wrong-answer probe that teaches the category boundary — *"try to make the elbow rotate like the neck"*;
- a part list for the joint being explored, so the learner can ask "which bone is this?" the way the reference
  lets them;
- a reason to return: something the exploration records, which the recall challenge then draws on.

**Nothing here was implemented. No file outside `qa/step16/` was modified.**

---

## 7. Is the reference's Explore fundamentally different from ours?

Yes, and the difference is not one of quality.

- The reference's model is a **static anatomical atlas**: 31 parts, each with a description, nothing moves,
  everything is nameable and findable. That is the right Explore for a system whose content is *structure*.
- Ours is a **movement instrument**: four joints, each with a controllable degree of freedom. That is the
  right Explore for a subject whose content is *movement*.

The gap is that the reference's Explore is **complete for its subject** and ours is not for its subject: our
subject is "joints", our model contains many more than four, and the learner cannot name, find or look at any
of them. The reference's principle worth taking is not the part list — it is that **Explore answers the
question the learner actually has at that moment**, and can be entered with a purpose rather than only from a
button that is always there.
