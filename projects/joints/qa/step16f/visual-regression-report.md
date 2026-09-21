# Visual regression report — Step 16F

Captures are in `qa/visual/step16f/`, from the same script against both builds:

| Prefix | Build |
|---|---|
| `before_` | the Step-16E candidate (`7eae594`), built in a separate worktree |
| `after_` | this change |

Each prefix has 13 shots at **1280×800** and **390×844**, including every shot the brief names:

| Brief | Shots |
|---|---|
| Pivot | `pivot.travel` ("The top of the neck"), `pivot.bones` |
| Fixed | `fixed.bones`, `fixed.name` |
| Ball-and-socket | `ball.move`, `ball.name` (the longest caption in the lesson, 133 characters) |
| Hinge | `hinge.bones`, `hinge.flexion` |
| Also | `hook.shoulder`, `concept.meet`, `compare.together`, `recall.open`, `map.all` |

## 1. What changed in the frames

| | Before | After |
|---|---|---|
| Largest text on screen | the topic, 46 px (desktop) / 30 px (phone) | the topic, 30.7 px (desktop) / 22 px (phone) — still the clearest text, no longer the loudest element |
| Topic position | lower left, over the anatomy | top left, directly under the chapter line |
| Card or box behind the topic | a rounded feathered shade (desktop), an opaque box (phone) | none: an edge-less radial shade behind the text (desktop), and the top bar's vertical fade continued behind the heading (phone) |
| What reads first | chapter → heading card → anatomy | chapter / topic → anatomy → spoken sentence |
| Anatomy | shared the lower half with the heading | uncontested in the middle of the frame |
| Spoken sentence | bottom | bottom, unchanged |

## 2. Checked by eye, and by measurement

| Check | 1280×800 | 390×844 |
|---|---|---|
| The topic is at the top left in every captured shot | yes (13 / 13) | yes (13 / 13) |
| The anatomy is the dominant element | yes | yes |
| The heading covers the joint the shot is about | never | never |
| A label hidden by the heading | none | none |
| Heading text clipped | none | none |

Contrast of the heading over the rendered scene is measured by `step12-a11y` (the caption title and text selectors are
in its sweep). The result is in the regression report.

## 3. What did not change

These are identical between the before and after frames of the same shot:

- the camera framing;
- the anatomy;
- the site labels, except where one was moved clear of the heading;
- the subtitle;
- the player;
- the top bar.

There is no new asset and no new colour. The warm accent, the display face and the dark-stage palette are unchanged.
