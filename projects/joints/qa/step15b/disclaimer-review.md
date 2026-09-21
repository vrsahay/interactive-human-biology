# Disclaimer review — where the honesty text went

The rule this step worked to: **preserve honesty, separate learner-facing explanation from reviewer metadata.** Nothing
was deleted from the system; one thing moved out of the teaching flow.

## Before

| Note | Appearances | Text |
|---|---|---|
| `note.schematic_indicator` | **15 captions** | *"Schematic indicator: it shows the kind of movement only. This part of the body is not animated."* |
| `note.recap_schematic` | **4 captions** | *"Schematic indicators mark the four joint types. Only the elbow moves from a validated 3D rig."* |
| **Total** | **19 of 38 captions** | |

Also learner-facing: `hinge.axis_note` — *"Blue line: the hinge axis fitted to this 3D model."*

## After

| Note | Appearances in captions |
|---|---|
| `note.schematic_indicator` | **0** |
| `note.recap_schematic` | **0** |
| `hinge.axis_note` | **0** |

The two notes and the fitted-axis wording are **still in the locale and still in the expert package**. They are shown to
a teacher or reviewer in the Sources & draft status dialog, verbatim.

## Where each fact is now stated

| Fact | Learner sees | Reviewer / teacher sees |
|---|---|---|
| The moving marks show a kind of movement, not a measured one | Persistent stage status while any indicator is on screen: *"Teaching view: the moving marks show the kind of movement."* | Sources dialog: both original notes, verbatim |
| The skull / neck / shoulder interactions are demonstrations | Once, on opening that exploration: *"This shows the movement pattern. The bones are real; the movement is a demonstration."* + the badge **"Teaching simulation"** | `status: "teaching-simulation"` in the lesson, `data-status` on the panel, the expert package |
| Only the elbow is a validated rig | Nothing. Its exploration is badged **"3D joint model"**, which claims nothing | Sources dialog, the lesson's explore configs, `review-manifest.json`, `checkExploreConfigs()` |
| The blue line is fitted to this model | *"This blue line shows the direction the elbow bends around. We call that line the axis."* | Sources dialog: *"The blue line at the elbow is the hinge axis fitted to this 3D model."* |

## What still enforces the distinction

None of this was weakened:

- `overlays.concepts` still declares, per shot, which content is schematic — 19 shots.
- `explores[].status` is still `validated-rig` for the elbow and `teaching-simulation` for the other three.
- `checkExploreConfigs()` still **fails the build** if a group-driven exploration declares itself a validated rig.
- `data-status` is still on the exploration panel, for assistive technology and for tests.
- The badge text for a teaching simulation still contains the words "teaching simulation".
- The validated rig's badge is asserted **not** to say "validated", "accurate", "real" or "correct".

## The invariant is stronger than it was

The Step-13 rule was *every captioned shot showing indicators carries a note*. It said nothing about shots without
captions, and it put reviewer vocabulary in front of a learner 19 times.

The Step-15B rule is *whenever indicators are on screen, the status is on screen* — checked against the running build,
for every shot that shows one, captioned or not (`tests/e2e/step15b-clarity.spec.ts` §1). The content-side companion test
asserts that no reviewer-language note has crept back under a caption and that no remaining note is used more than once
(`tests/unit/video-lesson.test.ts`).

## Accessibility of the new status

The persistent status is ordinary text in the document, so a screen reader reaches it in the normal flow. Its measured
contrast over the rendered scene is **7.42:1** at its worst (required 4.5:1); the exploration's plain note measures
**9.28:1**. Both are now included in the measured-contrast sweep so they cannot drift.

## Remaining learner-facing notes, and why they stayed

Two, each used exactly once, each about something specific on screen at that moment:

- `hinge.range_note` — *"0-145 deg is an approximate teaching range for this model; adult elbow flexion varies between
  people (see Sources)."* This is a fact about human bodies that a learner should have, not reviewer metadata.
- `hinge.bands_note` — reworded out of reviewer language to *"The thin coloured lines mark where the ligaments run. They
  are a guide, not real tissue."* It stops a learner believing the coloured lines are anatomy.
