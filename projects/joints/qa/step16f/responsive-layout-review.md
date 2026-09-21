# Responsive layout review — Step 16F

`qa/step16f/capture_hierarchy.mjs` covers 9 widths × 13 shots = **117 checks**, one or more shots from every chapter
including all four joint chapters. Results are in `qa/reports/step16f.hierarchy.after.json`, with the Step-16E baseline
measured the same way in `step16f.hierarchy.before.json`.

## 1. The rule, and the result

For every check, the heading must:

- sit **below** the chapter line;
- be **left-aligned** with the top bar's first item, within 4 px;
- **not overlap** the spoken subtitle, the player, or any painted site label;
- **not cover the shot's joint site**;
- be **inside the viewport**;
- cause **no horizontal scroll**.

| Width | Headline px | Sentence px | Heading occupies (y) | Problems |
|---|---|---|---|---|
| 320×844 | 22 | 17 | 58–145 | **0** |
| 360×800 | 22 | 17 | 58–145 | **0** |
| 390×844 | 22 | 17 | 58–123 | **0** |
| 412×844 | 22 | 17 | 58–123 | **0** |
| 430×932 | 22 | 17 | 58–123 | **0** |
| 768×1024 | 22 | 17 | 58–102 | **0** |
| 1024×768 | 24.6 | 18 | 74–143 | **0** |
| 1280×800 | 30.7 | 22 | 74–159 | **0** |
| 1440×900 | 34 | 24 | 74–166 | **0** |
| **All** | | | | **0 of 117** |

The heading's own background is transparent at every width. The only shade is an edge-less pseudo-element:

- **Desktop:** a radial feather behind the text.
- **≤ 900 px:** the top bar's vertical fade, continued behind the heading, which contrast on a phone required (see
  `text-hierarchy-review.md` §5.3). It sits under the top bar, never over it.

## 2. Before, measured the same way

| Width | Heading px | Where | Background |
|---|---|---|---|
| 320–768 | 30 | y 317–710: mid to lower screen, stacked above the subtitle | opaque box, `rgba(8,10,14,0.8)` |
| 1024 | 36.9 | y 497–572 | a card-like feathered shade |
| 1280 | 46.1 | y 511–604 | same |
| 1440 | 51.8 | y 590–704 | same |

The old placement also had four cases of a painted site label overlapping the caption box. The new one has none.

## 3. How the lesson's other layers fared

| Layer | Check | Result |
|---|---|---|
| Chapter indicator | readable, never overlapped by the heading | 117 / 117 |
| Anatomy | the shot's joint site is never under the heading | 117 / 117 |
| Spoken subtitle | never overlapped; unchanged position at the bottom | 117 / 117 |
| Site labels | never under the heading (the heading reserves its rectangle, as an open panel does) | 117 / 117 |
| Controls | untouched; ≥ 44 px is asserted by `step12-a11y`, `step14-responsive` and `step16e-mobile` | see the regression report |
| Horizontal scroll | none | 117 / 117 |
| Exploration panels (phone) | the heading is not rendered while an exploration or the recall challenge is open, as before | unchanged; `step16e-mobile` re-run |

## 4. What a phone gained

The subtitle no longer has a 30 px heading box stacked on top of it. On a 390×844 phone the band between the chapter
line and the spoken sentence (about y 125–560) is now free for the anatomy; before, the heading box took y 409–530 out
of the middle of it. The camera did not change: this is space given back by the text, not by reframing.
