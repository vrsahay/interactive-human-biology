# Learner clarity review — Step 15B

The Step-14B build was watched end to end as a beginner. The methodology held up: a learner finishes able to say that
different joints allow different movements and that there are four kinds, and the retrieval challenge makes sure of it.
Five things got in the way, plus one timing problem. This step fixed those six and changed nothing else.

The pedagogical spine is untouched: **01 Hook · 02 What is a Joint? · 03 Fixed · 04 Pivot · 05 Ball-and-socket ·
06 Hinge · 07 Compare · 08 Recall · 09 Final Body Map.** No chapter was added, no category was added, no rig was created,
and the validated elbow is bit-for-bit what it was.

---

## Fix 1 — the honesty text was on the learner's screen

**What a beginner met.** The same reviewer-language sentence under **15** captions:

> *"Schematic indicator: it shows the kind of movement only. This part of the body is not animated."*

and a second one under **4** more:

> *"Schematic indicators mark the four joint types. Only the elbow moves from a validated 3D rig."*

19 of 38 captions. A Class 10 learner does not have the words "schematic indicator" or "validated 3D rig", and being told
fifteen times that what they are watching is not animated invites exactly the wrong question: *then what am I looking at,
and should I believe it?* It is reassurance written for an expert, printed on a child's page.

**What it is now.** The information is said **once**, in two places, and neither of them is a caption:

- **On the stage**, a compact persistent status, present for exactly as long as the movement marks are — including on
  shots that carry no caption at all:
  > *"Teaching view: the moving marks show the kind of movement."*
- **In Sources & draft status**, the full technical wording, kept verbatim for a teacher or a reviewer: both original
  note strings, the fitted-axis sentence, and a plain statement that the skull, neck and shoulder explorations move whole
  groups of bones rather than being measured joint models.
- **In an exploration**, once on entry, for the three teaching simulations only:
  > *"This shows the movement pattern. The bones are real; the movement is a demonstration."*

**Nothing was deleted.** `overlays.concepts` still declares per shot which content is schematic; the explore configs still
carry `status: "teaching-simulation"` / `"validated-rig"`; `checkExploreConfigs()` still fails the build if a
group-driven exploration claims to be a validated rig; `data-status` is still on the panel for assistive technology and
for tests; both note strings are still in the locale and in the expert package.

**The guarantee got stronger, not weaker.** The old invariant was "every *captioned* indicator shot carries a note" — it
said nothing about uncaptioned ones. The new one is "whenever indicators are on screen, the status is on screen", checked
against the running build for every shot that shows one.

The elbow no longer tells the learner it is validated. Its exploration is labelled **"3D joint model"** — neutral, and it
claims nothing. A test asserts that word does not become "accurate", "real" or "correct".

| | Before | After |
|---|---|---|
| Captions carrying a technical disclaimer | **19** | **0** |
| Places the fact is stated | 19 captions | 1 persistent status + 1 line on entering an exploration + the Sources dialog |
| Underlying metadata | intact | intact |

---

## Fix 2 — three Latin names at once

**Before:** *"At the elbow, the humerus meets the radius and the ulna."* Three unfamiliar words in one sentence, in a
lesson that said "the rounded top of the upper arm bone" thirty seconds earlier.

**After:** *"The elbow is where the upper-arm bone meets two bones in the forearm."*

The names did not disappear — they are **on the model**, on the anchor labels already in that shot: *Humerus*, *Radius*,
*Ulna*. The learner understands the relationship from the sentence and reads the names off the picture. No terminology
dump, no second sentence listing them.

A test asserts that no caption anywhere in the lesson contains humerus, radius, ulna, scapula, atlas, femur, tibia or
patella, **and** that those three labels are still laid out on screen in that shot.

---

## Fix 3 — "axis" was used before it was explained

**Before:** the word appeared at 1:08 (*"lets the head turn around an axis"*) and again at 2:00 (*"the hinge axis"*),
with a note reading *"Blue line: the hinge axis fitted to this 3D model."* Nobody ever said what an axis is, and "fitted
to this 3D model" means nothing to a beginner.

**After:** the pivot chapter no longer needs the word (see Fix 4), so the term is introduced exactly once, in the shot
where the blue line is on screen, in the order the brief asks for — **show the line → say what it does → name it**:

> *"This blue line shows the direction the elbow bends around. We call that line the axis."*

The *"fitted to this 3D model"* wording moved to the Sources dialog. No coordinate systems, no vectors, no degrees.

A test asserts that the first caption to use the word also explains the line **before** naming it, that the axis overlay
is actually on screen in that shot, and that no earlier shot used the word at all.

---

## Fix 4 — the pivot was the weakest teaching

**Before:** one shot. You saw a head turn with an arrow circling it, from behind and above, with the two neck bones small
and half-hidden under the skull. That looks like a head on a stick; nothing showed *one bone turning around another*.

**After:** the chapter is three beats, and the middle one is new.

| Beat | What the learner sees | Words |
|---|---|---|
| `pivot.travel` | travel from the body to the top of the neck | "Pivot joint" |
| **`pivot.bones`** (new) | close on the two bones, from behind and level, skull dimmed, **nothing moving yet** | *"At the top of the neck, one small bone sits on top of another."* |
| `pivot.rotate` | camera pulls back so the head is in frame while the bones stay legible; the rotation indicator runs | *"The upper bone turns around the one below it. Your head turns with it."* |

The framing was chosen by looking, not by guessing: eight candidate framings were rendered
(`qa/visual/step15b/pivot_trials/`). From the front — the first thing tried — the mandible and cheekbone hide the two
vertebrae completely. From behind and level they read unmistakably as two separate bones, one sitting on the other.

**No new rig.** The rotation is the same group-driven teaching simulation as before, and it is still labelled one.
Nothing was claimed about C1/C2 mechanics: the words say what is on screen and no more. There is no mention of the dens,
no ring-and-peg description, and a test asserts the word "dens" does not appear.

---

## Fix 5 — flexion and extension were dropped in and forgotten

**Decision: teach them and use them again.** They name what the learner is watching and then doing, so they earn their
place; and the source-backed sentence in the same chapter is about bending and straightening.

**Before:** *"Bending the elbow is called flexion."* / *"Straightening it again is called extension."* — then never used.

**After:** each term is tied to the action that produces it, and reused once in the exploration where the learner
performs both:

- *"When the elbow bends, that is called flexion."*
- *"When it straightens again, that is called extension."*
- Explore (elbow), after the learner has moved it: *"Bending is flexion. Straightening is extension. A hinge joint does
  both, in one direction."*

The engine's `flexion` DOF name is unchanged and did not drive this wording.

---

## The 5.5-second silence at 3:04 — root cause and fix

**Root cause, from the shot itself, not from guessing.** `hinge.return` is a deliberate transition: the camera moves for
1.5 s and the elbow animates from 0° back to its resting pose between 0.9 s and 4.2 s. But it carried **no caption at
all** — and the narration builder only speaks a shot that has a caption or a prompt. So the beat was silent by
construction, and its last **1.3 s** was a completely static frame with no text and no audio, sitting between two talking
shots. That is what read as a stall.

It was never a pause bug, a scheduling bug or an animation bug. (A separate thing that *does* stop playback — the browser
throttling animation frames while the preview pane is hidden — is an environment behaviour, not this.)

**Fix, keeping it a transition:** it now says what it is doing, which also gives it a narration clip, and the dead tail is
trimmed so the beat ends when its motion does.

- Caption: *"The elbow settles back to rest."*
- Duration **5500 ms → 4600 ms** (motion ends at 4200 ms; 400 ms to settle, instead of 1300 ms of nothing).

**Every one of the 40 shots now speaks.** There is no silent shot left, and a test asserts it stays that way.

---

## What did not change

- The nine chapters, in order.
- The four categories. Nothing added, nothing renamed.
- The Explore system and all four explorations, including which one is the validated rig.
- The validated elbow: geometry, manifest, pivot, fitted axis, neutral offset, DOF, 0–145° range, controller, runtime
  consistency, and the 0 / 45 / 90 / 145 poses.
- Every Blender file and every production asset.
- The hip's classification, which stays **PENDING EXPERT CONFIRMATION**.
- The Step-13 frozen baseline and the Step-15A review package, both left exactly as they were.
