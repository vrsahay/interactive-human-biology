# Curriculum review — reviewer sheet for `step15b-learner-clarity-complete`

Every item is **PENDING**. The full machine-readable inventory of every learner-facing string, split by provenance, is
`strings-inventory.json` in this directory. Nothing below is an approval.

---

## 0. Provenance, stated plainly

The lesson declares itself `curriculum.status: "draft"`. Three kinds of text reach a learner:

| | Kind | Count | What it means |
|---|---|---|---|
| **A** | **Source-backed** | **1** | Reproduced from a curriculum excerpt supplied by the project owner, with a declared `sourceId`. |
| — | **Figure-reference** | **13** | Category names and site labels that follow the supplied NCERT figure's *taxonomy and locations only*. No artwork, wording or layout was reused. |
| **B** | **Draft enrichment** | **61** | **Written for this lesson.** Not NCERT wording. Carries a DRAFT badge on screen. This is the bulk of the teaching text and the main thing you are being asked to check. **Fourteen of these were changed or added by the Step-15B clarity pass** — see `qa/step15b/terminology-review.md` for the before/after table. |
| **C** | **Interface-only** | **8** | Button labels, status words, prompts. No educational claim. |

**The one source-backed sentence** is `source.elbow_hinge`: *"The elbow bends and straightens in one direction, similar to
a door hinge."* Its declared source is `brief-excerpt-hinge` — an excerpt supplied by the project owner in the project
brief. **`verifiedAgainstTextbook: false`**: the original NCERT files are not in the repository and nobody has checked
this sentence against a physical or official copy.

**The 13 figure-reference strings** are the four category names (Fixed, Pivot, Ball-and-socket, Hinge), the four Explore
titles, the four body-map labels, and the lesson title.

Draft enrichment is never presented as NCERT content anywhere: on screen it carries a DRAFT badge whose tooltip reads
*"Draft explanatory text written for this lesson. Not curriculum wording. Requires subject-expert review before
release."*

- [ ] **C0.1** The A / figure-reference / B / C split is honest and correctly applied. — **PENDING**
- [ ] **C0.2** Nothing that is draft enrichment is being passed off as sourced curriculum content. — **PENDING**
- [ ] **C0.3** The single source-backed sentence is used correctly and in context (shot `hinge.source`). — **PENDING**
- [ ] **C0.4** `verifiedAgainstTextbook: false` must be resolved before release — by whom, and against which edition? — **PENDING**

---

## 1. The nine-chapter teaching sequence

| # | Chapter | Learner-facing spine |
|---|---|---|
| 01 | Two joints, two movements | "Your shoulder can swing your arm in almost any direction." → "Your elbow mainly bends and straightens." → "Both are joints. So why do they move so differently?" |
| 02 | What is a joint? | "A joint is a place where two bones meet." → "The way the bones meet decides how they can move." → "You have joints like these all over your body. We will look at four kinds." |
| 03 | Fixed joint | "The bones of the skull meet at fixed joints. These bones do not move against each other." |
| 04 | Pivot joint | "Where the skull meets the backbone, a pivot joint lets the head turn around an axis." |
| 05 | Ball-and-socket joint | "At the shoulder, the rounded top of the upper arm bone sits in a hollow of the shoulder blade…" + "The hip is another ball-and-socket joint." |
| 06 | Hinge joint | the source-backed sentence, then bones → axis → flexion → extension → your turn → the 90° check → capsule and ligaments → the knee |
| 07 | Comparing the four | "Fixed: almost no movement at all." / "Pivot: turning around the bone below." / "Ball-and-socket: movement in many directions." / "Hinge: bending and straightening one way." → "The type of joint tells you the pattern of movement." |
| 08 | Recall challenge | five questions, movement first, category withheld |
| 09 | The body map | each site named in turn, then all together |

A mechanical check in the test suite asserts that **no narration in chapters 01 or 02 contains the words fixed, pivot,
ball-and-socket or hinge** — the phenomenon is presented before the vocabulary by construction, not by intention.

- [ ] **C1.1** The sequence is appropriate for a Class 10 learner. — **PENDING**
- [ ] **C1.2** It teaches **movement → joint type** rather than **label → definition**. If not, say where it slips. — **PENDING**
- [ ] **C1.3** The hook is effective and not gimmicky. — **PENDING**
- [ ] **C1.4** "A joint is a place where two bones meet" is an adequate and correct definition at this level. — **PENDING**
- [ ] **C1.5** "The way the bones meet decides how they can move" is a fair statement of the principle. — **PENDING**
- [ ] **C1.6** The comparison chapter's four one-line characterisations are correct. — **PENDING**
- [ ] **C1.7** The retrieval challenge is pedagogically sound and its five questions are fair. — **PENDING**
- [ ] **C1.8** The body map works as a closing summary. — **PENDING**

---

## 2. The taxonomy

The lesson teaches **four** categories and no others:

**Fixed · Pivot · Ball-and-socket · Hinge**

Deliberately absent: **gliding**, **saddle**, **partially movable / cartilaginous**. This step did not add them and was
instructed not to.

- [ ] **C2.1** **Is keeping exactly these four categories appropriate for the intended lesson?** — **PENDING**
- [ ] **C2.2** If a category should be added, which, and where in the sequence? — **PENDING**
- [ ] **C2.3** If a category should be renamed (for example "immovable" rather than "fixed"), say so. — **PENDING**
- [ ] **C2.4** The four one-line movement characterisations are complete enough not to mislead. — **PENDING**

---

## 3. Specific claims to check

Each of these is draft enrichment unless marked otherwise.

| Claim | Where |
|---|---|
| "The bones of the skull meet at fixed joints. These bones do not move against each other." | 03 |
| "At the top of the neck, one small bone sits on top of another." / "The upper bone turns around the one below it. Your head turns with it." | 04 |
| "At the shoulder, the rounded top of the upper arm bone sits in a hollow of the shoulder blade." | 05 |
| **"The hip is another ball-and-socket joint."** | 05 — **PENDING EXPERT CONFIRMATION** |
| "The elbow bends and straightens in one direction, similar to a door hinge." | 06 — **source-backed (A)** |
| "The elbow is where the upper-arm bone meets two bones in the forearm." (the names stay on the labels) | 06 |
| "This blue line shows the direction the elbow bends around. We call that line the axis." | 06 |
| "When the elbow bends, that is called flexion." / "When it straightens again, that is called extension." — reused in the elbow exploration | 06 |
| "0-145 deg is an approximate teaching range for this model; adult elbow flexion varies between people." | 06 — see §5 |
| "A joint capsule and ligaments surround the elbow." | 06 |
| "The knee is another hinge joint." | 06 |
| "Hinge: the knee bends and straightens, like the elbow." | 08 |

**The hip.** Research during Step 13 could not reach an NCERT source stating that the hip is a ball-and-socket joint
(the canonical chapter page returned 404). The claim is therefore marked **PENDING EXPERT CONFIRMATION** and the hip is
deliberately **never used as a recall question** — the lesson does not test a learner on a claim it cannot source.

- [ ] **C3.1** Every claim in the table is factually correct. — **PENDING**
- [ ] **C3.2** The hip claim: confirm, correct, or require removal. — **PENDING**
- [ ] **C3.3** Introducing "flexion" and "extension" as named terms is appropriate at this level. — **PENDING**
- [ ] **C3.4** Not introducing abduction, adduction, rotation or plane names is the right choice. — **PENDING**

---

## 4. Narration

Mechanically verified in this build (evidence, not approval):

- **38 of 39 shots speak.** The only silent shot, `hinge.return`, is a wordless transition with no caption and no
  instructional text; a test asserts it is the only silent one, so a future beat cannot be added mute by accident.
- **16 learner-paced cue clips** cover the four Explore instructions and every recall question, correction and reveal.
  Before Step 14B all of that was silent.
- **0 clips overrun their shot.**
- **Every spoken string is also on screen**, and no narration sentence was authored: spoken text is assembled only from
  locale strings the captions already show. Narration therefore cannot introduce an educational claim that provenance has
  not marked.
- The provenance notes (the schematic notes, the DRAFT badge) are deliberately **not** spoken. They are marks for a
  reader, and speaking them would need up to 2.1× compression against the shot durations.

Voice: `en-IN-Chirp3-HD-Aoede` (Google Cloud Text-to-Speech), MP3 24 kHz mono. The API key is supplied through the
environment at build time and is never written to a file, a manifest or the web build; a unit test greps the build output
for it.

- [ ] **C4.1** Pacing is right for a Class 10 learner. — **PENDING**
- [ ] **C4.2** The voice and delivery are acceptable for the intended audience. — **PENDING**
- [ ] **C4.3** Captions and narration correspond helpfully. — **PENDING**
- [ ] **C4.4** Leaving the provenance notes unspoken is acceptable. — **PENDING**
- [ ] **C4.5** A synthetic Indian-English voice is appropriate for this audience. — **PENDING**

---

## 5. The 0–145° range

Learner-facing wording, unchanged since Step 12:

> **"0-145 deg is an approximate teaching range for this model; adult elbow flexion varies between people."**

Recorded reference, unchanged: **Zwerus EL, Willigenburg NW, Scholtes VA, Somford MP, Eygendaal D, van den Bekerom MPJ,
"Normative values and affecting factors for the elbow range of motion", *Shoulder & Elbow* 11(3):215–224 (2019),
doi:10.1177/1758573217728711, PMCID PMC6555111.** Mean active flexion of the dominant arm 146° across 352 healthy
adults; literature range 130–154°; range varies with age, sex and BMI.

What that reference does and does not do: it supports the **reasonableness of a teaching range**. It does **not** validate
this model's geometry, its fitted axis or its limits. The joint manifest still records
`range_status: "approximate, pending cited reference"` and states that a cited anatomical source is required before
release.

This must not be rewritten as a universal anatomical maximum.

- [ ] **C5.1** Decision: **PASS** / **REQUEST_FIX**. — **PENDING**
- [ ] **C5.2** The learner-facing wording is acceptable, or supply a replacement. — **PENDING**
- [ ] **C5.3** Is Zwerus et al. the right reference to cite here, or should another be used? — **PENDING**

---

## 6. Interface strings (C)

Ten strings carry no educational claim: *Explore this joint · Reset · Return to the lesson · Validated 3D rig ·
Interactive teaching simulation · Use the arrow keys to move, R to reset, Escape to return · Which type of joint is
this? · Drag the forearm to bend the elbow* and the two lesson-title strings.

Two of them do carry weight, because they are the on-screen statement of what is validated:

- **"Validated 3D rig"** — shown only for the elbow.
- **"Interactive teaching simulation"** — shown for the other three.

- [ ] **C6.1** Those two status phrases are the right words for a Class 10 learner and their teacher. — **PENDING**
- [ ] **C6.2** The instruction wording in each Explore is clear and unambiguous. — **PENDING**

---

## 7. Completeness and scope

- [ ] **C7.1** The lesson is complete enough for its stated scope (one lesson, four categories, one validated joint). — **PENDING**
- [ ] **C7.2** Anything a Class 10 learner needs that is missing. — **PENDING**
- [ ] **C7.3** Anything present that should not be at this level. — **PENDING**
- [ ] **C7.4** The lesson is suitable to put in front of a class in its current DRAFT state, with the DRAFT badges
      visible — or it is not. — **PENDING**
