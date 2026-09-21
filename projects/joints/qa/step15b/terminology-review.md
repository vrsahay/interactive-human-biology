# Terminology review — what the learner reads, before and after

## Rule applied

The learner understands the **body relationship** first. Anatomical names live on the labels, in a secondary layer, or in
the expert material — not in the sentence that is doing the teaching. Every changed line is `draft-enrichment` and
carries the DRAFT badge; none is presented as NCERT wording, and no new curriculum claim was made.

## Changed lines

| Key | Before | After |
|---|---|---|
| `hinge.bones` | "At the elbow, the humerus meets the radius and the ulna." | **"The elbow is where the upper-arm bone meets two bones in the forearm."** |
| `hinge.axis` | "The forearm turns around one line: the hinge axis." | **"This blue line shows the direction the elbow bends around. We call that line the axis."** |
| `hinge.axis_note` | "Blue line: the hinge axis fitted to this 3D model." | *(removed from the learner flow; kept verbatim in the Sources dialog)* |
| `hinge.flexion` | "Bending the elbow is called flexion." | **"When the elbow bends, that is called flexion."** |
| `hinge.extension` | "Straightening it again is called extension." | **"When it straightens again, that is called extension."** |
| `explore.hinge.explanation` | "The elbow bends and straightens in one direction, like a door hinge." | **"Bending is flexion. Straightening is extension. A hinge joint does both, in one direction."** |
| `pivot.text` | "Where the skull meets the backbone, a pivot joint lets the head turn around an axis." | **"The upper bone turns around the one below it. Your head turns with it."** |
| `pivot.bones` | *(new)* | **"At the top of the neck, one small bone sits on top of another."** |
| `hinge.return` | *(no caption at all)* | **"The elbow settles back to rest."** |
| `hinge.bands_note` | "The thin coloured lines are schematic ligament bands, not real tissue." | **"The thin coloured lines mark where the ligaments run. They are a guide, not real tissue."** |
| `ui.explore_status_teaching` | "Interactive teaching simulation" | **"Teaching simulation"** |
| `ui.explore_status_validated` | "Validated 3D rig" | **"3D joint model"** |
| `ui.teaching_view` | *(new)* | **"Teaching view: the moving marks show the kind of movement."** |
| `ui.explore_teaching_note` | *(new)* | **"This shows the movement pattern. The bones are real; the movement is a demonstration."** |

## Anatomical names in learner captions

**Before:** one caption named three bones at once (`hinge.bones`).
**After:** **zero.** A test asserts that no caption anywhere contains *humerus, radius, ulna, scapula, atlas, femur,
tibia* or *patella*.

They are still on screen where the lesson needs them. In `hinge.bones` the anchor labels laid out on the model are
**Humerus**, **Radius** and **Ulna** — the same test asserts all three are still there. The learner reads the
relationship in the sentence and the names off the picture.

Plain-English equivalents the lesson already used, and still uses: *upper arm bone / upper-arm bone*, *shoulder bone*,
*two bones in the forearm*, *the bones of the skull*, *the backbone*, *one small bone*.

## "Axis"

**Before:** used at 1:08 and 2:00, explained nowhere, with a note about being "fitted to this 3D model".

**After:** used **once**, in the shot where the blue line is on screen, and explained before it is named — show the line,
say what it does, then name it. The pivot chapter no longer uses the word at all, so nothing precedes the explanation.

A test asserts: the first caption to use the word says "line" before it says "axis"; the axis overlay is actually
rendered in that shot; and no earlier shot uses the word.

No coordinate systems, no vectors, no degrees of freedom reach the learner.

## Flexion and extension — decision: **teach and reuse**

They were kept rather than removed because they name exactly what the learner watches and then performs, and the one
source-backed sentence in the same chapter is about bending and straightening.

- Taught, tied to the action: *"When the elbow bends, that is called flexion."* / *"When it straightens again, that is
  called extension."*
- Reused where the learner does both, in the elbow exploration: *"Bending is flexion. Straightening is extension. A hinge
  joint does both, in one direction."*

The engine's internal `flexion` DOF name is unchanged and did not drive this wording. A test asserts both terms are
attached to their action and that both appear again in the exploration.

## Reviewer vocabulary in learner captions

A test asserts that **no caption** contains *validated*, *rig*, *schematic*, *scientifically* or *accurate*.

| | Before | After |
|---|---|---|
| Captions containing "schematic" | 19 | **0** |
| Captions containing "validated" or "rig" | 4 | **0** |
| Captions containing an anatomical Latin name | 1 | **0** |

## Reading load

| | Step 14B | Step 15B |
|---|---|---|
| Shots | 39 | 40 |
| Median caption length | 8 words | 8 words |
| Longest caption | 27 words (`ball.shoulder`) | 27 words (`ball.shoulder`, unchanged) |
| Small-print notes under captions | 22 | **2** |

`ball.shoulder` was left alone deliberately: it is long, but every word in it is plain, and rewriting a sentence that a
beginner did not stumble on was outside this pass.

## Provenance

All 14 changed or new strings are `draft-enrichment` except the four `ui.*` ones, which carry no educational claim. The
hip's classification was not touched and remains **PENDING EXPERT CONFIRMATION**. The single source-backed sentence
(`source.elbow_hinge`) is unchanged, in the same shot, with the same `sourceId`.
