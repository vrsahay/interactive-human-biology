# Pivot teaching review

## What was wrong

The pivot chapter was one shot after the travel. A learner saw a head turn, with an arrow circling above it, from behind
and above — the two neck bones small, pale and half-hidden under the base of the skull. The caption said *"Where the
skull meets the backbone, a pivot joint lets the head turn around an axis."*

Three problems in one beat:

1. **It looks like a head on a stick.** Rotation was visible; *one bone turning around another* was not, and that is what
   makes a pivot joint a pivot joint.
2. **The two structures were never looked at.** They were highlighted, but never framed on their own, so the learner had
   nothing to attach "one bone turns around another" to.
3. **It used "axis" before the lesson explained it** (see `terminology-review.md`).

By contrast the fixed/skull chapter next door shows two bones and the join between them unmistakably. The pivot was the
weakest example in the lesson.

## What it is now

Three beats. The middle one is new; the rotation is the **same group-driven teaching simulation** as before.

| Beat | Camera | What moves | Words |
|---|---|---|---|
| `pivot.travel` (6.0 s) | site `pivot.upper_neck`, `backRight`, 4.2 → 3.7, elevation 0.20 | camera only | "Pivot joint" |
| **`pivot.bones`** (6.0 s, new) | site `pivot.upper_neck`, `backRight`, **2.5 → 2.1**, elevation 0.05 | **nothing** — this beat is for looking | *"At the top of the neck, one small bone sits on top of another."* |
| `pivot.rotate` (9.0 s) | site `pivot.upper_neck`, `backRight`, 3.4 → 3.1, elevation 0.25 | the rotation indicator | *"The upper bone turns around the one below it. Your head turns with it."* |

The sequence the brief asked for, in order: identify the neck joint → isolate the two structures → see them as two
separate bones, one resting on the other, with nothing moving → pull back so the head is in frame while the bones stay
legible → show the rotational path → the chapter title names it a pivot.

## How the framing was chosen

By looking at renders of the candidates, not by reasoning about them. Eight framings were rendered and compared:
`qa/visual/step15b/pivot_trials/`.

| Trial | Result |
|---|---|
| `frontRight` (the first attempt) | **Unusable.** The mandible and cheekbone occlude the two vertebrae almost completely; only slivers of pale bone are visible behind the jaw. |
| `right` / `left` / `frontLeft` | Better, but the jaw still cuts across one or both bones. |
| `backRight`, elevation 0.30 | The old problem: looking down on the skull, the bones read as the base of the head. |
| **`backRight`, elevation 0.00–0.10, scale 2.0–2.5** | **Chosen.** From behind and level, the two bones read clearly as two separate objects, one sitting on the other, with the skull above and the rest of the spine dimmed below. |

The final beat starts at 2.5 and pushes to 2.1, so the head is present for context at the start and the two bones fill
the frame by the end.

## What it does not claim

- **No new rig.** The rotation is the existing group-driven teaching simulation: the skull and teeth render groups turn
  about the vertical axis through the site anchor, and the atlas and axis stay still. It is still declared
  `status: "teaching-simulation"` and still badged **"Teaching simulation"** in its exploration.
- **No C1/C2 mechanics are asserted.** The words say what is on screen — one bone above another, the upper one turning —
  and no more. The dens, the ring, the transverse ligament and the atlanto-axial articulation are not described; a test
  asserts the word "dens" does not appear.
- **No anatomical names** are introduced in the captions. The site label still reads "Pivot joint · top of the neck".
- The persistent teaching status is on screen during the rotation beat, as it is for every shot with indicators.

## Verified

`tests/e2e/step15b-clarity.spec.ts` §4 asserts, in the shipped content and against the running build:

- the chapter has at least three beats, including `pivot.bones` and `pivot.rotate`;
- the bones beat declares **no** indicator and the rotation beat declares one;
- both beats light the same structures, and at runtime those resolve to exactly `body.atlas_c1` and `body.axis_c2`;
- the two beats are framed differently;
- the captions say "on top of" and "turns around", and say nothing about the dens.

Captures: `qa/visual/step15b/pivot.bones.png`, `qa/visual/step15b/pivot.rotate.png`, and the eight trials.
