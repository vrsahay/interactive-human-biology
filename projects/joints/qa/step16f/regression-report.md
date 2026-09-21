# Regression report — Step 16F

## 1. Totals, on the exact build committed

| | Result |
|---|---|
| `npm run typecheck` | **clean** |
| Unit tests | **99 / 99** (98 + 1 new label-layout test) |
| End-to-end | **118 / 118 passed**, 0 failed, 0 flaky, 22 suites, 16.0 min (116 + the 2 new `step16f-hierarchy` tests) |
| Console errors | **0** |
| Hierarchy check (`capture_hierarchy.mjs`) | **0 problems in 117** (9 widths × 13 shots) |

## 2. The runs before the final one

| Run | Result | What it found |
|---|---|---|
| First full run | 115 / 116 | `step12-a11y` contrast failed on a phone, over the heading's text: the intro subtitle 2.67:1, the `hinge.support` note 2.37:1, the recap 4.48:1. Removing the opaque box had removed the contrast it guaranteed. **Fixed** with an edge-less vertical fade behind the heading on narrow screens |
| Visual check after that fix | — | the fade had been painted **over** the top bar, dimming the chapter line and icons on a phone. **Fixed** by stacking the lead under the top bar; the new spec asserts the order |
| Accessibility suites after both fixes | 11 / 11 | — |
| Final full run | **118 / 118** | — |

Three latent defects were found on the way, all in code this step had to use:

- the label de-overlap pass could push a label back under a reserved rectangle;
- `LabelSystem.invalidate()` never requested a render on a paused film;
- my own first measurement of the heading's rectangle was taken mid-fade.

Each is fixed; the first has a unit test that fails without the fix.

## 3. The categories the brief names

| Required | Where | Result |
|---|---|---|
| typecheck · unit | tsc, vitest | clean · 99 / 99 |
| all e2e | full suite | 118 / 118 |
| accessibility | `step12-a11y` (axe desktop and mobile, measured contrast including the caption title, text and note), `step14-a11y` | pass |
| keyboard | `step12-a11y` "keyboard only: the whole lesson…", `step16e-mobile` keyboard test | pass |
| reduced motion | `step12-motion-visual` "every shot: … captions without transitions" | pass |
| responsive layout | `step16f-hierarchy` (5 widths × 7 shots), `capture_hierarchy.mjs` (9 × 13), `step14-responsive`, `step12-motion-visual` captures, `step16e-mobile` (9 widths) | pass |
| console errors | tracked by every spec | 0 |
| controls ≥ 44 px | `step12-a11y` target size, `step16e-mobile` | pass |

## 4. Nothing outside the brief changed

| | vs `7eae594` |
|---|---|
| `content/` (lesson, locale), narration audio and manifest | **unchanged**: `git diff` empty |
| Lesson duration | **381.3 s**, unchanged |
| Caption keys, strings, provenance | unchanged, and asserted by `step16f-hierarchy` test 2 |
| Camera, animation, Explore, panels, mobile Explore layout | untouched; `step16e-mobile`, `step16c-invariants` and `step14-explore` all pass |
| Validated elbow | `reference-poses`, `gate3-pose-consistency` pass; assets byte-identical |
| Frozen assets | **29 / 29** byte-identical; the master blend matches its pin |
| GLBs, Blender, manifests | none created or modified |
| App JS + CSS | 1 075 → **1 076 KB** |

## 5. Files changed

| File | Change |
|---|---|
| `src/ui/video/film.css` | the lead container; caption position and scale; the old per-style positions, card scrim and phone box removed; the phone fade; the large-captions setting rescaled; the teaching-view status flows in the lead; the lead fades behind a dialog |
| `src/ui/video/FilmShell.tsx` | the caption and teaching-view status rendered in one `.film-lead` column; the heading's rectangle published to the label layout when no panel is open, with a render request |
| `src/engine/overlays/labelLayout.ts` | a label that shares a reserved rectangle's columns keeps a floor or ceiling on its side through the de-overlap pass |
| `src/ui/video/filmQa.ts` | QA-only `labelReserved` hook |
| `tests/unit/foundation.test.ts` | +1 test |
| `tests/e2e/step16f-hierarchy.spec.ts` | new, 2 tests |
| `qa/step16f/*`, `qa/reports/step16f.*` | this step's evidence |
