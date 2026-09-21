# Reason statements — every "why" this step introduced

The Step-16 audit found that our lesson identified and almost never explained: two of thirty-six captions gave a reason,
against five of thirteen scenes in the reference. This step adds a reason to every joint category.

**Every statement below is new explanatory text written for this lesson. None of it is curriculum wording, none of it is
taken from a source we hold, and every one of them requires subject-expert review before release.** They are all
`draft-enrichment`, they all carry the DRAFT badge on screen, and a test asserts that no `narr.*` string is anything
else.

---

## The four category reasons

These are the beats the audit said were missing: the sentence that connects the **shape of the join** to the
**movement it allows**.

| Chapter | Beat | Exact spoken text | Provenance | Expert review |
|---|---|---|---|---|
| 03 Fixed | `fixed.why` | "The edges of these bones lock into each other, and tough fibres hold them tightly together. There is no gap for them to slide in, so they cannot move against each other." | `draft-enrichment` | **required** |
| 04 Pivot | `pivot.why` | "The upper bone turns around one line running straight up through both bones. Turning around that line is the only movement this shape allows, which is why the head swivels here rather than bending." | `draft-enrichment` | **required** |
| 05 Ball-and-socket | `ball.why` | "A rounded end sitting in a hollow can roll and turn in every direction at once. Nothing holds it to a single line, so the arm is not limited to one direction the way the elbow is." | `draft-enrichment` | **required** |
| 06 Hinge | `hinge.why` | "Look at the shape of the join. The end of the upper-arm bone is like a spool, and the forearm bone wraps around it. A spool can only turn about its own line, so the elbow can only bend and straighten." | `draft-enrichment` | **required** |

### What each one deliberately does not say

- **Fixed.** It describes interlocking edges and fibrous binding in plain words. It does not use the word *suture*, does
  not classify the joint fibrous/cartilaginous/synovial, and makes no claim about fusion with age.
- **Pivot.** It describes what is on screen — one bone above another, the upper one turning about a vertical line — and
  no more. **It does not mention the dens, the ring of the atlas, the transverse ligament or the atlanto-axial
  articulation**, and a test asserts the word "dens" never appears. It does not claim the rotation shown is a measured
  one; the exploration is still badged *Teaching simulation*.
- **Ball-and-socket.** It says a rounded end in a hollow moves many ways. It does not name the glenoid, the labrum or
  the rotator cuff, does not quantify range, and does not compare shoulder to hip.
- **Hinge.** "Like a spool" describes the shape a learner can see in the frame. It does not name the trochlea or the
  trochlear notch and does not claim a single perfect axis — the lesson has always presented the drawn axis as one
  *fitted to this 3D model*, and the Sources dialog still says so.

---

## The naming statements that follow each reason

Naming comes after the explanation now, not before it.

| Beat | Exact spoken text | Provenance |
|---|---|---|
| `fixed.name` | "A join that holds two bones still like this is called a fixed joint. Its job is strength, not movement: together these bones make one solid case around the brain." | `draft-enrichment` |
| `pivot.name` | "A joint where one bone turns around another like this is called a pivot joint." | `draft-enrichment` |
| `ball.name` | "A rounded end sitting in a hollow like this is called a ball-and-socket joint." | `draft-enrichment` |
| `hinge.name` | "A joint that bends and straightens around one line like this is called a hinge joint." | `draft-enrichment` |

`fixed.name` carries one claim beyond the definition — that the skull bones form a protective case around the brain.
It is standard and it is the reason a learner asks for, but it is new text and is flagged with the rest.

---

## Other new explanatory sentences

Each is spoken and subtitled, each is `draft-enrichment`, each needs review. Grouped by what kind of claim it makes.

### Observational — describes what is on screen

`narr.fixed.travel`, `narr.fixed.bones`, `narr.fixed.try`, `narr.pivot.travel`, `narr.pivot.bones`,
`narr.pivot.rotate`, `narr.ball.travel`, `narr.ball.bones`, `narr.ball.move`, `narr.hinge.travel`,
`narr.hinge.bones`, `narr.hinge.axis`, `narr.hinge.flexion`, `narr.hinge.extension`, `narr.hinge.return`,
`narr.compare.*`, `narr.map.intro`.

These say where the camera is and what it is showing. They add no mechanism.

### Definitional — restates the lesson's own thesis

- `narr.concept.meet` — "A joint is any place where bones meet. Most joints are two bones meeting; here at the elbow,
  three bones come together."
  **Why it changed:** the caption used to read *"A joint is a place where two bones meet"* over a shot of the elbow, where
  three bones meet. The picture contradicted the sentence. The caption now says "where bones meet" and the spoken line
  says what the learner is actually looking at.
- `narr.concept.different` — "How the bones meet at a joint decides how that joint can move. Change the shape of the
  join and you change the movement."
- `narr.intro.map`, `narr.intro.title`, `narr.hook.*`, `narr.recall.open`, `narr.map.all`.

### Anatomical, beyond the four reasons — **needs the closest reading**

| Key | Text | Note for the reviewer |
|---|---|---|
| `narr.fixed.travel` | "…The skull looks like a single piece, but it is several separate bones meeting along wavy lines." | "wavy lines" describes the rendered suture line in this model. |
| `narr.hinge.support` | "A joint capsule and ligaments wrap around the elbow. They hold the bones together and keep the movement on that one line." | The second clause is a function claim that the previous caption did not make. |
| `narr.hinge.knee` | "The knee is another hinge joint. It is bigger, but it does the same thing: it bends and straightens one way." | The knee's classification is not in question; the wording is. |
| `narr.ball.bones` | "…Beside it, the shoulder blade has a shallow hollow, and the ball rests in it." | "shallow" is a real property of the glenoid and is new here. |

---

## What was removed rather than explained

**`ball.hip` is gone from the lesson.** It was an eight-second beat whose entire content was "The hip is another
ball-and-socket joint", with no explanation — exactly what the brief asked us not to leave standing. The hip's
classification in this project is still **PENDING EXPERT CONFIRMATION**, so rather than write an explanation for a
classification we are not yet entitled to assert, the beat was removed.

- Nothing in the lesson now teaches the hip.
- Nothing asks a learner to classify the hip: the recall challenge covers skull, neck, shoulder, elbow and knee.
- The strings `ball.text.hip` and `ball.label.hip` were retired with it.
- The body map's hip label is **untouched**, because it is part of the pending item and this step does not resolve it.

A test asserts that no shot frames `ball_socket.hip_right` and that no recall step mentions the hip.

---

## Review checklist for the subject expert

For each of the four category reasons, and each row in the tables above:

1. Is the statement true as written, at Class-10 level?
2. Does it over-claim — does it assert a mechanism this 3D model cannot support?
3. Is the plain-English wording accurate, or has simplification introduced an error?
4. Does it belong in the NCERT scope for this topic, or is it enrichment beyond it?
5. If it should be reworded, what is the correct wording?

Nothing here may be promoted out of `draft-enrichment` without that review.
