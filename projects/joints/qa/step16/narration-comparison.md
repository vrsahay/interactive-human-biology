# Narration comparison

Same synthesis voice in both products (`en-IN-Chirp3-HD-Aoede`, Google Cloud TTS), so every difference below
is authorial, not technical.

---

## 1. Measured

| | Reference | Ours |
|---|---|---|
| Spoken words | 427 | 356 |
| Spoken sentences | 31 | 42 |
| Words per second of lesson | **2.54** | **1.27** |
| Words per sentence | **13.8** | **8.5** |
| Words per beat | **32.8** | 8.9 |
| Sentences per beat | 2.4 | 1.05 |
| Beats with no spoken words | 0 | 4 (the travel shots — title only) |
| Sentences stating a reason (*so that / because / which*) | 5 of 13 scenes | 2 of 36 captioned shots |
| Is the spoken text the same as the on-screen text? | **No** — caption and script are separately authored | **Yes** — the caption *is* the script |

---

## 2. The structural difference: one text layer versus two

The reference writes twice.

> **Caption** (top-left, fixed for the scene): "The windpipe. Rings of cartilage keep it from collapsing."
> **Narration** (spoken, subtitled bottom-centre): "The air now travels down the trachea, or windpipe. Rings
> of cartilage in its wall hold the passage open, so that it does not collapse when we breathe in."

The caption is the thing to remember. The narration is the thing to understand. The learner gets a headline
that stays put and a fuller explanation that moves.

We have a rule — established in earlier steps and still worth keeping for provenance — that **no narration
sentence is authored; narration is assembled only from locale strings already on screen.** The effect is that
our caption has to be both the headline and the explanation, and it cannot be both. It is currently the
headline, so the explanation does not exist:

> **Ours, fixed:** "The bones of the skull meet at fixed joints. These bones do not move against each other."

The provenance rule does not actually require one layer. It requires that spoken text be reviewable content
with a provenance class. A second, longer `narration.*` string per shot — authored, `draft-enrichment`,
reviewed by the same expert, and rendered as a subtitle — would satisfy the rule and remove the constraint.
That is a design note, not a change; nothing was modified.

---

## 3. Does the narration answer the three questions?

**"What am I seeing?"**

- Reference: yes, in the first clause of almost every scene. *"Inside the nasal cavity, curved shelves of bone
  called conchae…"*
- Ours: yes. Our captions are good at this and Step 15B made them better.

**"What is happening?"**

- Reference: yes, continuously, and the narration describes the motion that is actually on screen — *"make the
  air swirl around"* while the particles swirl.
- Ours: partly. Where there is a rig or a rotation (`hinge.flexion`, `pivot.rotate`) the words match the
  motion. Where the motion is only a schematic indicator (`ball.shoulder`, `compare.*`), the words describe a
  movement the learner cannot see happening.

**"Why does this matter?"**

- Reference: yes, five times out of thirteen, and every one of those is the memorable sentence of its scene:
  *"so that food does not enter the airway"*, *"so that it does not collapse when we breathe in"*,
  *"so that gas exchange never stops"*, *"If they were spread out, the alveoli would cover about eighty
  square metres."*
- Ours: twice out of thirty-six. `ball.shoulder` ("…so the arm can move in many directions") and
  `concept.different` ("The way the bones meet decides how they can move"). The second is the thesis of the
  entire lesson and it is said once, in seven words, at 0:34, and never returned to.

---

## 4. Does the narration tell the learner what to notice?

The reference directs attention with the *sentence order*: the structure is named first, then the feature, and
the label for that feature fades in as the sentence reaches it. In the `trachea` scene the `Trachea /
WINDPIPE` label is present for the first sentence and `Rings of cartilage` appears with the second.

Ours has no intra-shot narration timing: one caption appears at `appearAtMs` and the clip plays. Because most
shots carry one sentence, there is nothing to sequence. The exception, again, is the hinge chapter, where
`hinge.try` and `hinge.check` genuinely tell the learner what to do.

**Neither product ever says "look at…" explicitly.** The reference does not need to, because the moving air
does it. We do need to, and do not.

---

## 5. Continuous or fragmented?

The reference reads as **one continuous script read aloud**, because it is: the sentences chain
(*"From the nasal cavity, air moves into the pharynx…"*, *"Next, air enters the larynx…"*, *"The air now
travels down…"*, *"At its lower end…"*). Six of thirteen scenes open with a connective referring to the
previous scene.

Ours reads as **36 independent captions**. No caption refers to the previous shot. Concatenating our whole
script produces a list of true statements, not a paragraph. Read aloud end to end, our chapters 03, 04 and 05
are:

> "Fixed joint. The bones of the skull meet at fixed joints. These bones do not move against each other.
> Pivot joint. At the top of the neck, one small bone sits on top of another. The upper bone turns around the
> one below it. Your head turns with it. Ball-and-socket joint. At the shoulder, the rounded top of the upper
> arm bone sits in a hollow of the shoulder bone, so the arm can move in many directions. The hip is another
> ball-and-socket joint."

Every sentence is correct. Nothing connects any of them to the question asked at 0:20.

---

## 6. Tone and vocabulary

Both are appropriate for Class 10 and both avoid jargon in the spoken text. Two differences:

- The reference says **"we"** and **"our"** constantly — *"the air we breathe"*, *"when we swallow"*, *"we lift
  our ribs"*. It is describing the learner's own body. We say "your shoulder", "your elbow", "your head turns
  with it" in the hook and the pivot, then drop into the third person for the rest.
- The reference allows itself one non-essential, memorable fact (eighty square metres). We have none. A Class
  10 learner will remember the 80 m² a week later; there is nothing in our lesson built to be remembered that
  way.

---

## 7. Narration coverage in our build (current, verified)

From `qa/step15b/step15b-status.json` and re-checked in the running build: 40 of 40 shots speak, 16 learner-
paced cues, 0 overruns, 0 orphan clips, no silent shots. Clips are fetched per shot after the film starts
(`intro.title.mp3`, `hook.shoulder.mp3`, `hook.elbow.mp3` observed in the network log within the first 7 s).

The coverage problem is solved. The **content** of what is spoken is the open question.
