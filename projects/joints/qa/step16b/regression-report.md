# Step 16B regression report

Branch `step16b-teaching-depth`, from `step16a-reference-audit` (`4828b3b`), which is `step15b-learner-clarity-complete`
(`b8ca17e`) plus the read-only Step-16 audit. Chrome 152 headless with the real GPU (ANGLE D3D11), same machine as
every previous step.

## Result

| Suite | Result |
|---|---|
| Typecheck (`tsc` app + tests) | clean |
| Unit (`vitest`) | **98 passed, 0 failed** |
| End-to-end (`playwright test`) | **93 passed, 0 failed** (83 before this step + 10 new) |
| Step-16B teaching proofs | 10 new tests |
| Console errors across the suite | 0 |
| Frozen source and asset files | **29 of 29 byte-identical** |
| Master blend | `f7313dab…`, matches its pin |
| `git diff` over `public/assets/joints`, `public/assets/body`, `public/assets/shared`, `blender` | **0 files** |

## The ten Step-16B proofs

`tests/e2e/step16b-teaching.spec.ts`. Each checks the shipped content **and** the running build.

| # | Proves |
|---|---|
| 1 | All four categories declare the same teaching shape, the beats appear in that order, each chapter has at least six shots and 90+ spoken words, the three lighter chapters are within 1.5× of each other, and none is under a third of the elbow chapter |
| 2 | Every category's reason beat is a real sentence (18+ words), connects shape to movement, and is spoken — and the naming never precedes the reason |
| 3 | Every exploration has a task, a confirmation and a spoken cue; every goal is inside the joint's own limits; the three non-elbow chapters hand over at a real shot; and **doing the task with the keyboard alone** flips it to done and shows the confirmation |
| 4 | Every `narr.*` string is `draft-enrichment`, none fabricates a citation, the single source-excerpt is still the only one, and nothing teaches or asks the hip while its classification is pending |
| 5 | On the default route the landing card holds the lesson, nothing plays and **no audio is running** before the gesture; after the gesture the film plays, audio is running, the autoplay block is clear, and the clip is the one the film is on |
| 6 | With animation frames throttled to ~5 fps, lesson time tracks wall clock at 0.85–1.15×; the test fails if the harness is not actually dropping frames |
| 7 | At the shoulder's look beat the joint site is in frame and both the humerus and the scapula each span more than 15 % of the viewport width |
| 8 | Each comparison beat has exactly one indicator, is framed on its site at scale ≤ 4.5, and its structures fill more than 25 % of the frame; the summary carries no indicators and at least four labels |
| 9 | `End` on the timeline reaches the completion card, all three of its actions are reachable by tabbing in order, and Enter on *Replay* restarts the lesson |
| 10 | The elbow still has one DOF named `flexion`, range 0–145°, the only `validated-rig` exploration still drives the rig and displaces no groups, and 0/45/90/145 are reached exactly |

## Tests that had to change, and why

Six files. Every change is recorded here; none weakens an invariant.

**1. Renamed shots.** `fixed.detail` became `fixed.name`, `ball.shoulder` became `ball.move`, and `ball.hip` was
removed. Eight specs referenced them by id and now reference the new ones (`ball.why` replaces `ball.hip` where a second
ball-and-socket state was wanted). No assertion changed.

**2. `tests/unit/video-lesson.test.ts`** — the shot count is 52 instead of 40, and the camera-site sequence is asserted
as *order plus repetition count* (each category now visits its site six times) rather than as a fixed list. One
assertion was **added**: every `narr.*` string must be `draft-enrichment`.

**3. `tests/unit/narration.test.ts`** — the allowed-keys rule now accepts a shot's `narrationKey` in place of its
caption keys, and **adds** two checks: every spoken string except the interaction prompt must carry content provenance
(never `ui`), and a new test asserts that every speech-timed shot is spoken at rate 1.0, is exactly
`ceil(max(floor, lead + speech + tail)/100)*100` long, and has no dead tail. Stricter than before.

**4. `tests/e2e/step15b-clarity.spec.ts`** — `learnerText()` now includes the spoken explanation as well as the caption.
Every Step-15B invariant (no Latin in learner text, "axis" explained before it is named, "on top of"/"turns around",
flexion/extension tied to the action, no reviewer vocabulary) is therefore checked over **more** text than before, not
less. Two tests open an exploration from the beat before the handover rather than from the handover beat itself.

**5. `tests/e2e/step14b-lesson.spec.ts`** — §3-4 opens each exploration from the button on the beat before the handover.
§7's closing assertion changed from "the closing beat shows four indicators" to "the closing beat carries **no**
indicators and at least four labels", because the summary deliberately stopped relying on marks 10–30 px wide.

**6. `tests/e2e/step12-motion-visual.spec.ts`** — the full-lesson traversal now steps past an open exploration the way
it already stepped past the recall panel and the held check. Without it the traversal stalled at the first handover.

**7. `tests/e2e/film.spec.ts`** — `map.all` is asserted to mark all four categories by **label** instead of by
indicator; two seek offsets moved because the shots after them changed.

**8. Contrast sweeps extended.** `step12-a11y` adds `.film-subtitle`, the landing card and the completion card, with two
new states to reach them; `step14-a11y` adds `.film-explore__task`, `.film-explore__task-label` and
`.film-explore__done`.

## Elbow regression

Unchanged and re-verified: `gate3-pose-consistency`, `reference-poses` (0 / 45 / 90 / 145), `step12-delivery` handover
and LOD behaviour, `film` drag behaviour, `step13-bugsweep`, and the Step-14 explore suite asserting the hinge
exploration drives `flexion` with `displacedGroups === []`.

`git diff step15b-learner-clarity-complete HEAD -- public/assets/joints blender public/assets/body public/assets/shared`
→ **0 files.** The pivot, fitted axis, neutral offset, DOF, range, geometry, manifest and controller are untouched.
Step 16B §10 additionally asserts all of it against the running build.

## Accessibility

| Check | Result |
|---|---|
| axe — lesson, dialog and interactive states at 1280×800 and 390×844 | **0 violations** |
| axe — explore, task and recall panel states at both widths (12 states) | **0 violations** |
| Measured contrast over the rendered frame — lesson text, 9 states × 2 widths | **346 runs, 0 below threshold** |
| Measured contrast — explore and recall panels | **120 runs, 0 below threshold** |
| **New:** spoken-line subtitle (`.film-subtitle`) | lowest **13.08:1** (needed a feathered scrim — see below) |
| **New:** landing card (`film-start__*`) | lowest **6.84:1** |
| **New:** completion card (`.film-end__title`) | **16.21:1** |
| **New:** exploration task (`.film-explore__task`, `__task-label`) | **16.35:1**, **9.41:1** |
| Keyboard-only journey, focus visible, no traps, completion announced | pass |
| Reduced motion across all 52 shots | pass |
| Target size ≥ 44 px, reflow at 320 px | pass |
| Phone layout at 390 and 412 px: nothing under the controls, nothing clipped, no horizontal scroll | pass |

**Two defects the new contrast sweep found and this step fixed:**

1. The subtitle measured **2.65:1** over lit bone on wide screens — plain text with only a shadow. It now has the same
   feathered backdrop the caption got in Step 13, and measures 13.08:1.
2. The caption was still rendered *behind* the landing card and the completion card, so the sweep was measuring text a
   learner cannot read. It is no longer rendered while either card is up.

## Performance

No asset was added by this step. The narration bundle grew from 765 KB to **1493 KB** across 76 clips (52 shots + 24
cues), which is fetched **per clip after the film starts** and does not enter the path to the first 3D frame.

A full A/B against the previous candidate was **not** run in this step. The reason is the one recorded since Step 12R:
this machine's CPU benchmark drifts by a factor of four between sessions, so a cross-session number is meaningless, and
a meaningful A/B means rebuilding the baseline from its tag and alternating runs — which is a step of its own. What can
be said without measurement:

- **Bytes before the first 3D frame are unchanged**: no new GLB, texture, font or script.
- **The Step-12 emulated phone ×4 misses are unchanged and still open** — first meaningful 3D 2742 ms against 2500 ms,
  drag p95 45.1 ms against 22 ms — and no real Android device or iPad has been measured. Nothing here is a mobile
  certification.
- The clock change removes work rather than adding it: the film reads a timestamp the render loop already had.

## Content shape

| | Step 15B | Step 16B |
|---|---|---|
| Chapters | 9 | 9 (unchanged) |
| Shots | 40 | **52** |
| Film duration | 4:40 | **6:25** |
| Spoken words | 356 | **878** |
| Spoken words per second | 1.27 | **2.28** |
| Shots with a spoken explanation of their own | 0 | **45** |
| Silent shots | 0 | **0** |
| Clips compressed to fit their shot | some | **none — every clip is at rate 1.0** |
| Narration clips | 40 shots + 16 cues | **52 shots + 24 cues**, 0 overruns, 0 orphans |
| Locale strings | 199 | **287** |
| Categories with a reason beat | 1 of 4 | **4 of 4** |
| Categories with a learner task | 1 of 4 | **4 of 4** |
| First learner interaction | 2:41 | **0:49** |
