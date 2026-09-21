# Visual cleanup review — Step 16D §27

60 frames captured at the three required widths, each measured rather than eyeballed:
`qa/visual/step16d/`, with the per-frame numbers in `qa/reports/step16d.visual_set.json`.

**Four of the six required checks pass everywhere. Two fail at the two phone widths.** The failure is a pre-existing
framing rule, not something this step introduced, and it is the reason the step closes CONDITIONAL.

---

## 1. What was captured

| # | Frame | Beat |
|---|---|---|
| 00 | Landing | the start card, before any gesture |
| 01 | Hook | `hook.shoulder` |
| 02 | Fixed | `fixed.bones` |
| 03 | Pivot | `pivot.rotate` |
| 04 | Ball-and-socket | `ball.move` |
| 05 | Hinge | `hinge.flexion` |
| 06 | Compare | `compare.together` |
| 07 | Recall | the challenge, opened |
| 08 | Body map | `map.all` |
| 09–12 | Each exploration, opened | fixed, pivot, ball, hinge |
| 13–16 | Each exploration, moved | after 12 steps of input |
| 17 | Learner task, completed | the hinge task at its goal |
| 18 | Teacher layer | Settings → For teachers → Sources |
| 19 | Completion | the end card |

× 1280×800, 390×844, 412×844 = **60 captures**.

## 2. The checks the brief lists

| Check | 1280×800 | 390×844 | 412×844 |
|---|---|---|---|
| No DRAFT badges during normal learner flow | **0** | **0** | **0** |
| No intrusive Sources panel (Sources controls on the teaching surface) | **0** | **0** | **0** |
| No clipping (labels off screen, or horizontal page scroll) | **0** | **0** | **0** |
| Captions and subtitles within the viewport | **pass** | **pass** | **pass** |
| No panel covering the structure | **pass** | **FAIL** | **FAIL** |
| Target anatomy remains dominant | **pass** | **FAIL** | **FAIL** |

The draft/sources/clipping results hold across all 60 frames, including the four explorations opened and moved. The
teacher layer is reached deliberately, through Settings, and is the only place a provenance marker appears.

## 3. The two that fail, measured

### 3.1 The panel covers the joint site on a phone

`qa/step16d/check_subject_dominance.mjs` projects each exploration's site and asks whether that point lands inside the
panel. 12 checks, **7 fail**:

| Width | fixed | pivot | ball | hinge |
|---|---|---|---|---|
| 1280×800 | clear | clear | clear | clear |
| 412×844 | clear | **covered** | **covered** | **covered** |
| 390×844 | **covered** | **covered** | **covered** | **covered** |

At 390×844 the panel is a centred card at y 212–574 with a 90 %-opaque background, and the skull projects to
(195, 253) — inside it. `document.elementFromPoint` at the site returns the panel, not the canvas. The frame shows the
panel, the label, and the skeleton's legs below it. The bone the sentence is about is not on screen.

The site is `inView` in all 12 cases — the camera is pointing at the right thing. It is the panel that is in the way.

### 3.2 The target shrinks as the viewport narrows

`qa/step16d/probe_narrow_framing.mjs` measures the same shot at seven widths. The framing fits the target to the
**horizontal** extent, so a narrow viewport pushes the camera back and the target collapses vertically:

| Viewport | camera distance | target width | **target height** |
|---|---|---|---|
| 1440×900 | 0.435 | 0.515 | **0.571** |
| 1280×800 | 0.435 | 0.515 | **0.571** |
| 1024×768 | 0.435 | 0.618 | **0.571** |
| 768×1024 | 0.570 | 0.604 | **0.317** |
| 412×844 | 0.865 | 0.614 | **0.212** |
| 390×844 | 0.913 | 0.614 | **0.202** |
| 320×800 | 1.052 | 0.616 | **0.175** |

(`fixed.bones`; fractions of the viewport. The other three shots behave the same way — see
`qa/reports/step16d.narrow_framing.json`.)

The camera sits **2.1× further back** at 390 px than at 1280 px and the skull occupies **20 % of the frame height
instead of 57 %**. Combined with §3.1 this is the whole of the phone problem: the target is both small and behind the
panel.

### 3.3 Why this was not fixed here

Both follow from one rule — fit the framing sphere to the viewport's width — and correcting it means changing how
every shot is framed, then re-validating every framing against the frozen delivery manifest's close-up spheres
(skull 4.5, neck 4.25, shoulder 4.0, elbow 5.6, hip 3.75, knee 3.75). That is camera architecture, not learner-facing
polish, and §32 of this brief says not to redesign the product. It is written up here as the first item of the next
step rather than attempted at the end of this one.

Nothing in Step 16D made it worse: the framing rule, the panel geometry and the `--film-player-clear` offset are all
unchanged from the Step-16C build.

## 4. What the step did clean up, seen in the frames

| | Before | After |
|---|---|---|
| Captions carrying a DRAFT chip | 28 of 52 | **0** |
| Shots offering a Sources control on the teaching surface | 52 of 52 | **0** |
| Persistent learner-facing controls | 17 | 16 |
| Site labels hidden behind a panel (7 widths × 4 explorations) | 6 | **0** |
| Caption doing two jobs (headline + explanation) | every shot | headline on screen, explanation spoken, with 5 named exemptions |
| Top bar competing with an open dialog | chapter title behind the dialog at 1.68:1 | faded, still focusable |

The landing card and the completion card both render cleanly at all three widths, with no badge, no source link and no
reviewer language.

## 5. One observation, not changed

While an exploration is open there are **two controls labelled "Return to the lesson"** — the panel's primary action
and the player-bar toggle, which flips from "Explore this joint" to the same words. Both are visible at 1280 and at
390. They are not identical in behaviour: the panel's button ends a handed-over session, the bar's is an
`aria-pressed` toggle.

This is a design decision rather than a defect, and the existing "one explore control at a time" test passes, so it
was left alone rather than changed at the end of a step. It is worth resolving when the panel layout is next opened.
