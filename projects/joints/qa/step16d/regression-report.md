# Regression report — Step 16D

Everything was re-run from a clean build of the working tree, in one uninterrupted pass.

**A note on method.** An earlier run of this suite was discarded. Partway through it I stashed the working tree and
rebuilt `dist` in order to measure the *baseline* payload, which meant the remaining tests were measuring a mixture of
the old and the new build. That run was stopped and the whole suite re-run against a single build. The numbers below
come from the clean run only.

---

## 1. Totals

| | Result |
|---|---|
| `npm run typecheck` (app + tests) | **clean, exit 0** |
| Unit tests | **98 passed / 98**, 10 files |
| End-to-end tests | **111 passed / 111**, 0 failed, 0 flaky, 20 suites, 11.8 min |
| Console errors during any run | **0** |

## 2. End-to-end, by suite

| Suite | Tests | What it guards |
|---|---|---|
| `smoke` | 6 | the vertical slice: load, select, camera presets, reduced-motion cuts |
| `film` | 10 | the film shell, seeking, mobile viewport, the landing gesture |
| `film-visual` | 1 | the reference frame set |
| `narration` | 4 | clip positioned by the film clock, no revival, toggle, silence while paused |
| `performance` | 1 | the standing budget |
| `reference-poses` | 1 | the elbow at 0 / 45 / 90 / 145 |
| `gate3-pose-consistency` | 1 | the rig's pose contract |
| `step12-a11y` | 8 | axe desktop + mobile, keyboard, dialogs, target size, reflow, measured contrast, announcements |
| `step12-delivery` | 8 | quality tiers, lazy loading, deferred elbow, LOD gating, handover, **label layout caching** |
| `step12-motion-visual` | 7 | reduced motion over the entire film; captures at 5 widths |
| `step13-bugsweep` | 5 | overlay leaks, seek consistency, explore round-trip, the guided check, no duplicate anatomy |
| `step14-explore` | 7 | entry, movement, reset, exit, declared status, keyboard-only, lesson position preserved |
| `step14-recall` | 4 | the five-question challenge |
| `step14-a11y` | 3 | axe over every panel and both recall states |
| `step14-responsive` | 3 | panels clear the player at 390 and 412 |
| `step14b-lesson` | 6 | the lesson contract |
| `step15b-clarity` | 8 | learner language, the honesty statuses, no reviewer words |
| `step16b-teaching` | 10 | the teaching spine, tasks, checks, the landing gesture, provenance |
| `step16c-invariants` | 9 | **A** transform isolation · **B** one narration owner · **C** caption/visual/narration agree · **D** frame drops · **E** no stale narration · **F** the validated elbow |
| `step16d-polish` | 9 | this step's thirteen required proofs |
| **Total** | **111** | |

## 3. The thirteen proofs §29 asks for

| # | Proof | Where | Result |
|---|---|---|---|
| 1 | No learner-facing DRAFT badge during normal playback | `step16d-polish` §1 | **0 of 52 shots** |
| 2 | Sources is not intrusive during teaching | §2 | **0 controls on the teaching surface**; reachable in Settings |
| 3 | Draft metadata still exists underneath | §3 | 126 `draft-enrichment` strings, `data-provenance` on every caption |
| 4 | The `sr-only` disclaimer is not repeated per caption | §4 | **0 of 52** (was 28) |
| 5 | Narration contains no accidental duplicates | §5 | **0 unintended near-duplicates**, 0 exact duplicates |
| 6 | Useful repetition is preserved | §6 | the four category anchors asserted by name |
| 7 | At most one audio owner | §7, `step16c` §B | max **1** over 2 800+ samples at 50 Hz |
| 8 | No stale narration after navigation | §8, `step16c` §C/§C2 | **10 of 10** navigation cases agree, 0 stale clips |
| 9 | Target moves, context stays fixed | §9, `step16c` §A1–A3 | **0 unexpected groups**, 0 camera movement, all 4 explorations |
| 10 | The site label is never hidden, at every required width | §10 | **0** across 7 widths × 4 explorations |
| 11 | Existing elbow behaviour unchanged | §11, `reference-poses`, `gate3` | 0 / 45 / 90 / 145 exact, `displacedGroups` `[]` |
| 12 | Low-FPS timeline stays synchronised | §12, `step16c` §D | lesson 0.85–1.15× wall clock at 15/10/5/4 fps |
| 13 | Captions, narration and visuals aligned | §13, `step16c` §C | agree in every sampled case |

## 4. Production asset integrity

| Check | Result |
|---|---|
| Frozen files in `qa/expert/frozen-build.json` (blend working files, validated elbow, body v2 / v3 / step11, shared) | **29 / 29 byte-identical** |
| `Human_Body_Master.blend` vs its pinned hash | **matches** — `f7313dab…`, 224 401 653 bytes |
| `git diff` over `public/assets/joints`, `public/assets/body`, `public/assets/shared`, `blender` | **empty** |
| New GLBs created | **0** |
| Blender opened or modified | **no** |

## 5. Visual checks

60 frames at 1280×800 / 390×844 / 412×844. Four of the six §27 checks pass at every width; **"no panel covering the
structure" and "target anatomy remains dominant" fail at 390 and 412**. Measured in
[visual-cleanup-review.md](visual-cleanup-review.md); the cause is a pre-existing framing rule (fit to viewport width)
and it is why this step closes CONDITIONAL.

## 6. What changed, and what it could have broken

| File | Change | Guarded by |
|---|---|---|
| `src/ui/video/FilmShell.tsx` | badge removed from the caption; Sources moved into Settings → For teachers; subtitle; panel publishes its rectangle; task UI; landing and completion cards | `step16d-polish`, `film`, `step12-a11y`, `step15b-clarity` |
| `src/ui/video/film.css` | subtitle and its backdrop; top bar faded behind a dialog; explore task styles | `step12-a11y` (contrast, focus return), `step14-responsive` |
| `src/engine/overlays/labelLayout.ts` | `reserved` rectangle pre-pass | `step16d-polish` §10, `step12-delivery` (layout caching) |
| `src/engine/overlays/LabelSystem.ts` | `reserved` field, part of the cache key | same |
| `content/lessons/hinge-elbow.json` | 4 map shots re-pointed to headline captions + spoken lines | `step14b-lesson`, `step16b-teaching`, schema validation |
| `content/locales/en/hinge-elbow.json` | 9 added, 5 changed, 4 retired, **0 reclassified** | the provenance unit tests |
| `pipeline/audio/build_narration.ts` | the task cue speaks the task only; orphan removal | `narration`, `step16c-invariants` §B/§E |
| `public/assets/audio/narration/*` | 68 clips re-synthesised, manifest rewritten | the key-leak unit test, `narration`, `step16c` |

No engine, scene-graph, delivery-tier or rig code was touched.

## 7. Known limitations, unchanged

- NVDA, VoiceOver and TalkBack: **NOT TESTED**.
- Real phones and tablets: **NOT TESTED**. The responsive work is viewport emulation in one desktop browser.
- Step 12's recorded mobile misses are preserved as historical evidence and were not edited.
- Expert review is **PENDING** on every item; nothing was approved, resolved or reclassified in this step.
