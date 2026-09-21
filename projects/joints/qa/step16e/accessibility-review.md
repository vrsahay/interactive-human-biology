# Accessibility review — Step 16E

This step changed three things a keyboard or screen-reader user meets on a narrow screen:

- the player steps aside while an exploration is open;
- the elbow's second angle readout is visually hidden there;
- a portrait tablet lays the panel out in two columns.

Each was checked, and one real defect it exposed was fixed.

**No real screen reader was used. NVDA = NOT TESTED. VoiceOver = NOT TESTED. TalkBack = NOT TESTED.** No
screen-reader certification is claimed.

---

## 1. Focus, when the player steps aside

On a narrow screen the "Explore this joint" button lives in the player, so it disappears when the exploration opens.
Left alone, a keyboard user would have been focused on nothing.

| Behaviour | How |
|---|---|
| The control that asked for the exploration is recorded when it is asked for | before the browser can blur it |
| If that control is no longer rendered once the panel is open, focus moves to the panel | the panel is a labelled `<section tabindex="-1">`, so the screen reader reads its name |
| Tab order inside the panel | Reset, then Return to the lesson; the elbow's slider comes first when present |
| On return, if focus has nowhere to be, it goes back to the control that opened the exploration | it has reappeared with the player |
| On a wide screen | nothing changes: the opener stays visible, so focus is not moved |

Asserted by `step16e-mobile` "keyboard on a phone…" at 390×844. The test opens the exploration with Enter and checks
each of the following:

- the player is hidden;
- focus is inside the panel;
- the task is announced;
- Tab reaches Reset, then Return;
- Escape closes the panel;
- the player returns;
- focus is back on "Explore this joint".

## 2. Nothing a screen reader hears was removed

| Change | Visually | Accessibility tree |
|---|---|---|
| Player hidden during an exploration (narrow only) | gone | gone, correctly: its only relevant control there was a second "Return to the lesson", and the panel's own Return remains |
| Elbow's orange angle readout (narrow only) | hidden, because the slider directly below shows the same angle | **kept**: it is the `role="status"` live region that announces the angle as it changes, and the slider keeps its own value text |
| Tablet two-column panel | explanation beside the slider, key hint beside the buttons | **same DOM order**, so the reading order and the Tab order are unchanged |

## 3. The defect found, and fixed

The `step14-a11y` contrast sweep measured the panel's **"Return to the lesson" at 1.27:1** at 390×844 in all four
explorations.

**Cause.** `.film-btn:hover` (specificity 0,2,0) outranked `.film-btn--primary` (0,1,0), so a hovered primary button
lost its light fill: dark text on a near-transparent dark background. The rule is old. It went unnoticed because
nothing ever put a pointer on a primary button and left it there.

This step exposed it. The panel now takes the player's place, so the learner's finger, still where "Explore this
joint" was, rests on "Return to the lesson". Touch browsers keep `:hover` after a tap.

**Fix.** The primary button has its own hover: a white fill under the same dark text. The contrast sweep passes again.
The rule applies at every width, so the same latent defect on desktop is gone too.

## 4. Results

| Check | Result |
|---|---|
| axe, desktop and mobile: intro, dialogs, interactive elbow, quiz, explore | **0 violations** |
| axe, every explore panel and both recall states, both widths | **0 violations** |
| Keyboard only: the whole lesson completed without a pointer, focus visible, no traps, completion announced | **pass** |
| Dialogs: focus in, Tab contained, Escape closes, focus returns to the opener | **pass** |
| Keyboard on a phone: focus into the panel and back to the opener (new) | **pass** |
| Target size ≥ 44 px | **pass**. The smallest panel control across 9 widths × 4 explorations is ≥ 44 px, asserted per width by `step16e-mobile` |
| Reflow at 320 px, no horizontal scroll | **pass**, and asserted at all 9 required widths |
| Measured contrast over the rendered scene: captions, panels, controls | **0 below threshold** after the fix |
| Reduced motion over the entire film | **pass**, unchanged. An exploration still cuts rather than travels under reduced motion |
| Exploration task announced once on entry | **pass** |
| Escape returns from an exploration | **pass** |

## 5. Still not claimed

| | |
|---|---|
| NVDA | **NOT TESTED** |
| VoiceOver | **NOT TESTED** |
| TalkBack | **NOT TESTED** |
| Real phones and tablets | **NOT TESTED**. Every narrow-layout result here is viewport emulation in one desktop Chrome |
| WCAG conformance | **not claimed** |
