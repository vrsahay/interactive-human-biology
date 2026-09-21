# Regression report — Step 16E

Everything was re-run on the exact build being committed. The last change was the primary-button hover rule
(§3). The full suite was run again after it, not only the failing file.

---

## 1. Totals

| | Result |
|---|---|
| `npm run typecheck` (app + tests) | **clean** |
| Unit tests | **98 / 98**, 10 files |
| End-to-end, final run | **116 / 116 passed**, 0 failed, 0 flaky, 21 suites, 15.2 min |
| Console errors in any run | **0** |

## 2. The run before the final one

The first full run gave **115 passed, 1 failed**. `step14-a11y` "measured text contrast of the explore and recall
panels" found **"Return to the lesson" at 1.27:1** at 390×844 in all four explorations.

That was a real defect, which this step's layout exposed; the cause and fix are in
[accessibility-review.md](accessibility-review.md) §3. After the fix, `step12-a11y` and `step14-a11y` passed 11 / 11
on their own, and then the whole suite passed 116 / 116.

## 3. The suites, and what each guards

| Suite | Tests | Guards |
|---|---|---|
| **`step16e-mobile`** (new) | 5 | the eleven proofs §13 asks for, at all 9 required widths |
| `step16d-polish` | 9 | no DRAFT badge; Sources off the teaching surface; metadata underneath; no disclaimer repetition; no accidental narration duplicates; useful repetition kept; one audio owner; no stale narration; labels never hidden at 7 widths; the Step-16C invariants |
| `step16c-invariants` | 9 | **A** only declared groups move · **B** ≤ 1 narration owner · **C** caption, visual and narration agree · **D** dropped frames · **E** no stale narration · **F** the validated elbow |
| `step16b-teaching` | 10 | teaching spine, tasks, checks, the landing gesture, provenance |
| `step15b-clarity` | 8 | learner language, honesty statuses |
| `step14-explore` | 7 | entry, movement, reset, exit, declared status, keyboard-only, lesson position preserved |
| `step14-recall` · `step14-a11y` · `step14-responsive` · `step14b-lesson` | 4 · 3 · 3 · 6 | the recall challenge; axe and contrast on every panel; panels at 390/412; the lesson contract |
| `step13-bugsweep` | 5 | overlay leaks, seek consistency, the explore round trip, the guided check, no duplicate anatomy |
| `step12-a11y` · `step12-delivery` · `step12-motion-visual` | 8 · 8 · 7 | axe, keyboard, dialogs, 44 px, reflow, contrast · tiers, lazy loading, handover, label caching · reduced motion over the whole film, captures at 5 widths |
| `film` · `film-visual` · `narration` · `smoke` | 10 · 1 · 4 · 6 | the film shell; reference frames; narration positioned by the film clock; the vertical slice |
| `reference-poses` · `gate3-pose-consistency` | 1 · 1 | **the elbow at 0 / 45 / 90 / 145**, the rig's pose contract |
| `performance` | 1 | the standing budget |
| **Total** | **116** | |

## 4. The categories §16 names

| Required | Where | Result |
|---|---|---|
| typecheck · all unit tests | `npm run typecheck`, vitest | clean · 98 / 98 |
| all e2e | the full suite | 116 / 116 |
| accessibility · keyboard | `step12-a11y`, `step14-a11y`, `step16e-mobile` keyboard test | pass |
| reduced motion | `step12-motion-visual` | pass |
| console errors | every spec tracks them | 0 |
| Explore isolation | `step16c-invariants` A1–A3, `step16e-mobile` test 2 | pass |
| audio ownership · narration sync | `step16c-invariants` B, C, E; `narration`; `step16d-polish` 7, 8 | pass |
| frame-drop timing | `step16c-invariants` D | pass |
| chapter navigation | `film`, `step13-bugsweep`, `step16c-invariants` C2 | pass |
| responsive layouts | `step16e-mobile` (9 widths), `step14-responsive`, `step12-motion-visual`, `step16d-polish` 10 | pass |
| elbow 0/45/90/145 | `reference-poses`, `gate3-pose-consistency`, `step16c-invariants` F | pass |
| runtime consistency | `step13-bugsweep`, `step16e-mobile` round-trip | pass |
| production asset integrity | §6 below | pass |

## 5. The Step-16C invariants, after this step

| | Result |
|---|---|
| A — only declared target groups move | pass: 0 unexpected groups for a real drag starting on the target, at 390, 412 and 1280 |
| B — at most one narration owner | pass |
| C — visual, caption and narration from the same lesson time | pass |
| D — dropped frames do not slow the lesson | pass |
| E — Explore cannot leave stale narration | pass |
| F — the validated elbow is unchanged | pass: poses exact; `displacedGroups` `[]`; assets byte-identical |

## 6. Production asset integrity

| | Result |
|---|---|
| Frozen files in `qa/expert/frozen-build.json` | **29 / 29 byte-identical** |
| `Human_Body_Master.blend` | **matches its pin** (`f7313dab…`) |
| `git diff f3c2ed2` over `public/assets/joints`, `public/assets/body`, `public/assets/shared`, `blender` | **empty** |
| `git diff f3c2ed2` over `qa/expert/step15`, `qa/expert/step15b`, `qa/expert/frozen-build.json`, `qa/expert/review-status.json` | **empty** |
| New GLBs, rigs or anatomy assets | **0** |
| Blender opened | **no** |

## 7. Performance

| | `f3c2ed2` | Step 16E |
|---|---|---|
| App JS + CSS, raw | 1 071 KB | **1 075 KB** (+4 KB: composition, focus handling, CSS) |
| Narration, 76 clips | 1 435 KB | **1 432 KB** |
| Bytes before the first 3D frame, excluding audio | 545 KB | **547 KB** |
| Audio before the first 3D frame | 36 KB | 8 KB |

The audio difference is not a change. On both builds the landing card prefetches `narration.json` and the first clip
(36 KB). Whether that prefetch lands before or after the first frame is a race.

Method: `qa/step16e/measure_payload.mjs` against both builds, the baseline built from `f3c2ed2` in a separate worktree,
serving `dist` statically without compression; results in `qa/reports/step16e.payload.json`. Times are not reported,
because this machine's CPU benchmark drifts about 4× between sessions. **No device certification is claimed.**

## 8. A correction to the Step-16D record

`qa/step16d/visual-cleanup-review.md` §4 says that "the completion card [renders] cleanly at all three widths". The
`19_completion` frames in `qa/visual/step16d/` do not show the card. The capture script sought to 40 ms before the end
and advanced a **paused** film, and a paused film does not end. The frames show the last shot at 6:23 instead.

The card itself was never broken. `step16b-teaching` asserts that it appears at the end of the lesson, and it passed in
Step 16D and passes here. The Step-16E review capture plays out the last 600 ms and waits for the card, and
`qa/visual/step16e_review/completion.png` shows it.

The Step-16D document is left as it was written, as the record of that step; this is the correction.

## 9. Files changed

| File | Change |
|---|---|
| `src/engine/video/AppVideoRuntime.ts` | `composeForExplore` / `applyBand` / `setExploreReserve`; explorations re-framed on resize; the shot's own composition restored before returning; QA `composition` getter |
| `src/ui/video/FilmShell.tsx` | the panel's rectangle and the top-bar inset published to the runtime (with the observer now disconnected); focus into the panel and back to the opener; `--film-player-h` not zeroed while the player is hidden; readout modifier for the elbow |
| `src/ui/video/film.css` | narrow: the player steps aside, the panel moves to the bottom, the duplicate elbow angle is visually hidden; tablet: two-column panel; primary-button hover contrast |
| `src/ui/video/filmQa.ts` | QA-only `exploreTarget` and `compose` hooks |
| `content/locales/en/hinge-elbow.json` | `narr.ball.move`, one string |
| `content/lessons/hinge-elbow.json` | `ball.move` 8 800 → 7 500 ms, written by the narration build |
| `public/assets/audio/narration/ball.move.mp3`, `narration.json` | the one regenerated clip and its manifest |
| `pipeline/audio/build_narration.ts` | reuse unchanged clips by text and hash; `--all`; an error-message regex had lost its backslash |
| `tests/e2e/step16e-mobile.spec.ts` | new |
| `qa/step16e/*`, `qa/reports/step16e.*` | this step's evidence |
| `qa/reports/step12–16d.*` | regenerated by the test run |
