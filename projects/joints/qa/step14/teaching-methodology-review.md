# Teaching methodology review — Step 14

## The problem this step was given

The Step-13 build taught by **label → definition → recap**. It was technically strong and pedagogically thin: the recap
showed Fixed, Pivot, Ball-and-socket and Hinge on a body, which tells a learner what each joint is *called* without ever
making them see why it belongs in that category. A Class 10 learner could finish it able to repeat four names and unable
to say what makes a hinge a hinge.

## The change

The lesson now argues from movement to name, and it lets the learner produce the movement:

**Before:** watch → read labels → recap.
**Now:** watch → **try it yourself** → recall it from the movement.

Two concrete mechanisms carry that:

1. **An Explore for every category** (not just the elbow). The learner turns the head on C1/C2, swings the arm at the
   shoulder, pushes the skull bones and feels them refuse, and bends the validated elbow. The instruction is specific to
   the joint — "Drag left and right to turn the head", never "drag to explore".
2. **A retrieval recap.** The learner is shown a joint and told how it *moves* ("The head turns around the bone below
   it."), and must name the category before it is revealed. The full body map now comes *after* that, as the conclusion.

## What a Class 10 learner meets, per joint

| Beat | Delivered by | Status |
|---|---|---|
| Where is it in the body | The existing travel shot from the full body to the site | unchanged, already good |
| Zoom in | The site framing | unchanged |
| See the movement | Concept indicator during the chapter, then **the learner moves it in Explore** | **new** |
| Name the joint | Chapter caption | unchanged |
| Explain why | Explore explanation line, tied to the movement just produced | **new** |
| Body example | The chapter's own example (skull, neck, shoulder + hip, elbow + knee) | unchanged |
| Explore | "Explore this joint" in every joint chapter | **new** |
| Return | Return to the lesson; the shot, chapter and clock are exactly as they were | **new** |
| Recall | Four retrieval questions in the recap, movement first | **new** |

## Class-10 design rules, applied

- **Movement before terminology.** Every recall question describes a movement and withholds the name; a test asserts the
  question never contains the category word.
- **Short sentences.** The longest new learner-facing line is 14 words.
- **One idea at a time.** While an exploration is open, the shot caption, the lesson's joint panel and the free-orbit hint
  all stand down, so exactly one thing is asking for attention.
- **Concrete over technical.** "The rounded end sits in a socket, so it moves many ways" rather than abduction/adduction.
  No coordinate or axis language reaches the learner in the teaching simulations.
- **Repetition with variation.** The same four categories are met three times: in the chapter, in the Explore, and in the
  recall — each time in a different mode.
- **Retrieval practice.** The recap is now recall, not review. A wrong answer says "Not that one. Look at how it moves."
  and lets the learner try again rather than scoring them.

## What is deliberately still true

- **Only the elbow is a validated rig.** The other three explores are marked "Interactive teaching simulation" on screen
  for as long as they are open, the build refuses to let them claim otherwise, and Step 13's schematic notes are untouched.
- **No new curriculum claims.** Every new line is `draft-enrichment` and badged DRAFT. The hip's provenance is unchanged
  (still PENDING EXPERT CONFIRMATION from Step 13 — no NCERT source reachable online states the hip is ball-and-socket).
- **No new rigs, no new assets.** The teaching simulations move render groups that were already downloaded.

## Honest gaps (not done in this step)

1. **The 9-chapter restructure is NOT implemented.** The lesson still runs its six chapters (intro, fixed, pivot,
   ball-and-socket, hinge, recap). The requested `01 Hook / 02 What is a joint / 07 Compare / 08 Recall / 09 Final body
   map` structure is not there: there is no opening hook that contrasts a shoulder with an elbow before any terminology,
   and no separate "what is a joint" section. The retrieval sequence lives inside the existing recap chapter instead of
   being its own chapter. This is the largest remaining piece of the brief.
2. **Narration does not cover the new content.** Clips exist per shot from Step 13; the Explore and recall text has no
   audio, so a listening learner gets silence in exactly the new parts.
3. **Camera direction was not re-authored.** Explore framing is new and per-joint, but the chapter-level cinematic
   sequence is unchanged from Step 13.

Because of 1–3 this step is **CONDITIONAL**, not PASS.

## Closed during this step

**Accessibility of the new panels.** Every explore panel and both recall states were re-run through axe at 1280×800 and
390×844: **0 violations** in all twelve states (the one "incomplete" in each is `color-contrast`, which axe cannot judge
over a WebGL canvas — which is why the measured pass below exists). Ninety-eight text runs in the new panels were measured
against the rendered frame: **0 below the WCAG 1.4.3 threshold**, the lowest being a recall option at 5.52:1 against a
required 4.5:1. `tests/e2e/step14-a11y.spec.ts`, `qa/reports/step14.accessibility.json`.

**Phone layout of the new panels.** See `regression-report.md`: the first version of this step put the recap caption and
the explore panel under the player at 390 and 412 px. Fixed, and now held by `tests/e2e/step14-responsive.spec.ts`.
