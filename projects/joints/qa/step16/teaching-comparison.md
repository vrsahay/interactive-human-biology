# Teaching methodology comparison

The most important document in this audit. It answers the same ten questions of both products, then explains
*why* the difference in feel is produced, rather than asserting that one is simpler.

---

## 1. The ten questions, answered for both

| Question | Reference | Ours |
|---|---|---|
| **What does the learner know before any terminology?** | That every cell needs oxygen and makes carbon dioxide as waste, and that we are going to follow one breath. Two sentences, no names. | That a shoulder swings in any direction and an elbow only bends, and that both are joints. Three short captions, no names. **Both do this well.** |
| **What question or problem is established?** | *Where does the air go, and what happens to it?* — a journey with a destination. | *Both are joints. So why do they move so differently?* — a genuine question, asked at 0:20. |
| **How is the subject introduced?** | Whole respiratory system in the body, ribcage ghosted, slow orbit, title over it. | Whole skeleton inside a translucent body, title card over it. **Both comparable.** |
| **How does the learner know where to look?** | The air itself is moving through the model as a stream of particles, and the camera is following it. Attention is led by motion, continuously. | A labelled pill appears at the joint site and other structures dim. Attention is directed by dimming and by a static label. |
| **How is movement/process demonstrated?** | The process *is* the animation: air flows, ribs lift, the diaphragm flattens, O₂ crosses into the capillary. The animation carries the content. | Schematic indicators (an arrow, an arc, a rotation ring) drawn over static bone, plus a real rig at the elbow. |
| **When is terminology introduced?** | At the structure, with a plain-English gloss **in the same label** — `Pharynx / THROAT`. Five glossed terms in the whole lesson. | Category names in labels (`Fixed joint · skull`). Bone names appear as bare labels on the model (`Humerus`, `Radius`, `Ulna`) with no gloss, while the caption deliberately says "upper-arm bone". |
| **When is explanation provided?** | In the same breath as the naming: "Rings of cartilage in its wall hold the passage open, **so that it does not collapse when we breathe in**." | Usually not. Captions state *what* ("The bones of the skull meet at fixed joints") and rarely *why*. |
| **When does interaction happen?** | Never during the lesson. Only afterwards, in Explore. | Twice inside chapter 06 (`hinge.try`, `hinge.check`), and via the Explore button at any time. |
| **How is knowledge reinforced?** | One full review scene (19.3 s) that re-walks the whole chain in order, while the camera returns to the opening framing. | A comparison chapter (6 shots), a 5-question recall challenge, and a body-map chapter. **Three reinforcement passes — more than the reference.** |
| **How is the lesson concluded?** | "With every breath, this journey begins again" over the opening shot, then a *Lesson Complete* card with Replay / Explore. | The body map ends on a four-part summary line. There is no completion card and no explicit "you are done". |

---

## 2. Why the reference feels easier to understand

Not because it is simpler. Because of six specific mechanisms, each of which is visible in the data.

### 2.1 It has one spine; we have a list

The reference is a **journey**: nostrils → nasal cavity → pharynx → larynx → trachea → bronchi → bronchioles
→ alveoli → gas exchange → out. Every scene is caused by the previous one. A learner who missed scene 5 can
still place scene 6, because the air is still moving in the same direction.

Ours is a **taxonomy**: four categories, presented one after another. Chapters 03–06 are interchangeable —
nothing about the fixed joint leads to the pivot joint. The only connective tissue is the travel shot, which
is a camera move, not a reason. A learner who drifts during chapter 04 has no thread to pick back up.

This is not a flaw in the subject. Joints *are* a classification. But a classification still needs a spine,
and ours does not yet have one. The candidate spine is already in our own hook: *the shape of the join
decides the movement.* Every chapter could be an answer to that one question, in the same shape:
**this is the join → this is what it allows → that is why it is called this.** At present only the hinge
chapter does that.

### 2.2 The picture is cut to the voice, not the voice to the picture

The reference derives every scene's length from the measured length of its narration (`speechMs`) with a
floor (`minMs`). The consequence is that **no scene ever ends mid-thought and no scene ever waits in
silence.**

We author `durationMs` and build narration to fit it. The consequence is visible in the Step-15B timing
review: `hinge.return` was 5500 ms long with 4200 ms of motion and no caption at all — 5.5 s of nothing,
which is what prompted Step 15B. That instance is fixed; the mechanism that produced it is not.

### 2.3 It explains, we identify

Count of sentences that state a reason (using *so that*, *because*, *which*, *so the*): **5 of the
reference's 13 scenes**. In our 36 captioned shots, the sentences that give a mechanism are
`ball.shoulder` ("…sits in a hollow of the shoulder bone, **so** the arm can move in many directions") and
arguably `concept.different`. Two.

Compare directly, on the same kind of content:

> **Reference, trachea:** "The air now travels down the trachea, or windpipe. Rings of cartilage in its wall
> hold the passage open, so that it does not collapse when we breathe in."
>
> **Ours, fixed:** "The bones of the skull meet at fixed joints. These bones do not move against each other."

The first tells the learner what the thing is, what it is made of, and why it is built that way. The second
tells them a name and a negative fact. A learner can repeat ours; they cannot reconstruct it.

### 2.4 The unfamiliar word is explained where it appears, once

The reference attaches a gloss to exactly five words, in the label, at the moment the structure is on screen.
`Pharynx / THROAT`. `Alveoli / AIR SACS`. No glossary, no separate definition beat, no repetition.

Ours splits the two halves across two places. In `hinge.bones` the caption says "the upper-arm bone meets two
bones in the forearm" while the labels on the model say **Humerus**, **Radius**, **Ulna**. Nothing on screen
connects "upper-arm bone" to "Humerus". Step 15B removed the Latin from the caption — which fixed the
sentence — but the model still shows the bare Latin, so the mapping problem moved rather than closed.

### 2.5 Motion means something

Every animated thing in the reference *is* the content: the air moves because air moves; the diaphragm
flattens because that is what inhaling is; a yellow dot crosses the alveolar wall because that is gas
exchange. Nothing moves decoratively.

Most of our motion is the camera. Of 40 shots, 5 travel shots exist solely to move the camera from one site
to another, and the four category chapters demonstrate movement with a schematic overlay rather than with the
structure itself moving — apart from the pivot's head rotation and the elbow. The learner sees an orange arc
and is told what it means; they do not see a bone do anything.

The elbow is the exception, and it is the best teaching in our lesson.

### 2.6 Less to look at, for longer

The reference shows, during teaching: a scene counter, a title, a one-line caption, a progress underline, a
subtitle, and 0–3 labels. Nothing else.

We show, during teaching, at 1280×800: a product name, chapter number and name, a persistent teaching-status
pill, a narration toggle, a *Sources & draft status* button, a settings gear, a 10-segment progress bar, nine
numbered chapter buttons, play/pause, replay, a time readout, an *Explore this joint* button, a fullscreen
button, a caption panel and a DRAFT badge. Every one of those is on screen for the whole lesson.

See `information-density-comparison.md` for the count and the consequences.

---

## 3. Explainability — can a learner explain it afterwards?

For each of our four categories, can the learner say **what / where / what it does / how it moves / why it is
that kind of joint**? Judged against what is actually said and shown.

| | What | Where | What it does | How it moves | **Why it is that kind** |
|---|---|---|---|---|---|
| **Fixed** | yes | yes (skull) | yes — nothing moves | n/a | **No.** Nothing explains *why* these bones are fixed (interlocking edges, one continuous braincase). The suture is shown as a faint line inside a dashed circle for 8 s. |
| **Pivot** | yes | yes (top of the neck) | yes — the head turns | yes, since Step 15B (`pivot.bones` then `pivot.rotate`) | **Partly.** The learner sees one bone above another and the upper one turning. Nothing says what makes rotation possible rather than bending — no peg, no ring, no constraint is shown. |
| **Ball-and-socket** | yes | yes (shoulder, hip) | yes | **No.** The arm is never moved; an arc is drawn. | **Yes, in words** — "the rounded top … sits in a hollow … so the arm can move in many directions" is the best explanatory sentence in the lesson. But it is asserted, not shown: the hollow is never framed, and the humeral head is never seen sitting in it. |
| **Hinge** | yes | yes (elbow, knee) | yes | **yes — the learner does it themselves** | **Yes.** Bones → axis → flexion → extension → do it yourself → check. This chapter answers all five. |

The pattern is clear: **our hinge chapter teaches; the other three label.** Chapter 06 is 98 s of 280 s (35 %)
and 11 of 40 shots; fixed gets 14 s and 2 shots, pivot 21 s, ball-and-socket 22.5 s. The three chapters that
need the most explaining get the least time.

The reference's equivalent question — can a learner explain the *process* rather than recite labels? — is
answered yes, because the process is what was animated and the reason was said out loud in five of thirteen
scenes.

### Places where our animation shows something but does not explain why

| Shot | Shown | Not explained |
|---|---|---|
| `fixed.detail` | a dashed ring and a dot on a suture | why those bones cannot move |
| `ball.shoulder` | an arc sweeping around the humerus | the hollow the sentence refers to is never framed or labelled |
| `ball.hip` | an arc at the hip, 8 s | nothing at all is said beyond "The hip is another ball-and-socket joint" |
| `pivot.rotate` | the skull rotating about a vertical line | what physically permits rotation and prevents bending |
| `hinge.support` | a capsule and ligaments appear, 10.5 s | what they do; the caption names them and stops |
| `compare.together` | four indicators on a full skeleton at 1.12× scale | at that scale the indicators are 10–20 px; nothing is legible |

---

## 4. What our lesson does that the reference does not teach at all

Stated plainly, because this comparison is not one-directional.

- **The learner performs the movement.** `hinge.try` and `hinge.check` ask the learner to bend the elbow and
  then to hit 90° and have it checked. Nothing in the reference asks the learner to do anything.
- **Retrieval practice.** Five questions, each phrased as a *movement* ("These skull bones hardly move at
  all") with the four category names as options — so the learner classifies from behaviour, which is the
  actual skill. The reference has no assessment whatsoever.
- **Comparison.** Chapter 07 places the four side by side. The reference never compares anything.
- **Honesty about what is simulated.** Every non-validated demonstration is badged *Teaching simulation*; the
  elbow is badged *3D joint model*; a Sources dialog carries the technical wording. The reference makes no
  distinction between its validated and schematic content anywhere.
