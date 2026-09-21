# Responsive UI review — the site label is never hidden

## 1. The defect

Carried forward from the Step-16A audit: at 1280×800 the exploration panel runs to x = 424, while the site label was
placed at x = 364–399. The learner read *"…ot joint · top of the neck"* — the first 25 to 60 pixels of the label were
behind the panel.

Reproduced and measured before any change, at all seven widths the brief lists:

| Width | Labels hidden behind the panel |
|---|---|
| 1280 | 3 (fixed, pivot, ball) |
| 1440 | 3 |
| 1024 | 3 |
| 768 | 3 |
| 412 | 3 |
| 390 | 3 |
| 320 | 3 |

## 2. Root cause

`layoutLabels()` knew about vertical insets only — `insetTop` and `insetBottom`, which keep labels clear of the top bar
and the player. It had no concept of a panel occupying part of the stage, so a label anchored near the panel was placed
exactly where the anchor projected, and the panel was drawn on top of it.

## 3. The fix

Two small additions, no visual redesign:

1. **`layoutLabels()` takes an optional `reserved` rectangle.** Before the vertical de-overlap runs, a label whose box
   intersects that rectangle is slid **right**, past the panel's edge — the leader line lengthens and the label stays
   attached to the same anchor. On a narrow layout the panel spans the full width and there is nowhere to go sideways,
   so the label is lifted **above** the panel instead, or dropped below it if the space above is shorter than the label.
   If neither fits it is left where it is: the existing clamp still applies, and a cramped label beats one pushed off
   screen.

2. **The panel measures itself and publishes its rectangle.** `FilmShell` attaches a `ResizeObserver` to the
   exploration panel and the recall panel, converts their rectangle into stage coordinates, and hands it to
   `LabelSystem.reserved`. The rectangle is part of the layout cache key, so a resize re-lays out. It is cleared the
   moment no panel is open.

The label system is otherwise untouched: same anchors, same priorities, same de-overlap, same leader lines.

## 4. Measured after

`qa/step16d/check_label_clipping.mjs` and `step16d-polish` §10, across **7 widths × 4 explorations = 28 checks**:

| Width | Behind the panel | Off screen | Horizontal scroll |
|---|---|---|---|
| 1280×800 | **0** | 0 | no |
| 1440×900 | **0** | 0 | no |
| 1024×768 | **0** | 0 | no |
| 768×1024 | **0** | 0 | no |
| 412×844 | **0** | 0 | no |
| 390×844 | **0** | 0 | no |
| 320×800 | **0** | 0 | no |

The test fails if a label is hidden, off screen, or if the page scrolls sideways, at any of those widths.

## 5. The rest of the responsive programme

Re-run and unchanged:

- `step14-responsive`: every panel clears the player at 390 px and 412 px — 0 under, 0 clipped, 0 below the 44 px
  target, no horizontal scroll.
- `step12-motion-visual`: captures and layout checks at 390×844, 412×915, 768×1024, 1280×800 and 1440×900.
- `step12-a11y`: target size ≥ 44 px, reflow at 320 px, captions readable.
- `film.spec`: mobile viewport — no horizontal scroll, controls reachable, subject centred.

## 6. One other layout change in this step

While a dialog is open the top bar is faded out and made non-interactive. On a narrow layout the dialog covered the
chapter title completely, so it was text nobody could read — and, measured over the rendered frame, text at 1.68:1
that could never pass. It stays in the DOM and stays focusable, so focus still returns to the control that opened the
dialog; `step12-a11y` asserts that and passes.

## 7. What this fix does not cover, found in the §27 capture pass

The label is no longer hidden. **The bone it points at still is, on a phone.**

At 390×844 the exploration panel is a centred card at y 212–574 with a 90 %-opaque background, and the joint site
projects to (195, 253) — inside it. `document.elementFromPoint` at the site returns the panel, not the canvas. The
same holds for three of the four explorations at 412×844.

It compounds a second measurement: the shot is fitted to the viewport's **width**, so at 390 px the camera sits 2.1×
further back than at 1280 px and the target occupies **20 % of the frame height instead of 57 %**.

Neither is a regression — the framing rule, the panel geometry and `--film-player-clear` are unchanged from Step 16C —
but together they are why this step closes CONDITIONAL. Measured in full in
[visual-cleanup-review.md](visual-cleanup-review.md) §3.
