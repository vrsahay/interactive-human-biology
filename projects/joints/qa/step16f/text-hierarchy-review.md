# Text hierarchy review — Step 16F

A typography and layout change only. No string, key, provenance class, narration clip, camera, animation, exploration,
panel or asset changed.

---

## 1. What the learner saw before

| | 1280×800 | 390×844 |
|---|---|---|
| Top left | "TYPES OF JOINTS · 04 PIVOT JOINT", 12–13 px | "04 PIVOT JOINT", 13 px |
| The topic heading | **46 px** (up to 52 px at 1440), lower-left at y 511–604, on a feathered dark backdrop that read as a rounded card (`inset -28px -44px`, 0.86 opacity) | **30 px** in an **opaque box** (`rgba(8,10,14,0.8)`, blur) in the middle of the screen, y 409–530 |
| The spoken sentence | bottom, above the player | bottom, stacked directly under the heading box |

The largest text on screen was a heading sitting on the anatomy. It read like a presentation slide: chapter → huge
card → anatomy.

## 2. What the learner sees now

```
TYPES OF JOINTS   04  PIVOT JOINT          ← chapter line, unchanged
The top of the neck                        ← current topic, medium, top left
(Teaching view: … — only when shown)       ← the existing status line, now stacked under the topic

                 [ anatomy ]               ← the dominant element, centre

     Now down to the top of the neck, …    ← the spoken sentence, bottom, unchanged
```

| | Desktop | Phone |
|---|---|---|
| Chapter line | unchanged | unchanged |
| Topic heading, when the shot's caption is a headline (`titleKey`: 22 shots) | `clamp(24px, 2.4vw, 34px)`: **24.6 px** at 1024, **30.7 px** at 1280, **34 px** at 1440 | **22 px** |
| Topic, when the shot's caption is a sentence (`textKey` only: 29 shots) | `clamp(18px, 1.72vw, 24px)`: **18 / 22 / 24 px**, max 38 characters per line | **17 px** |
| Opening title shot (`intro.title`: title and subtitle) | same grammar: title as heading, subtitle one step smaller beneath it | same |
| Position | left 32 px (aligned with the top bar), top 74 px, width up to `min(540px, 42vw)` | left and right 16 px, top 58 px |
| Background | **no card**: a feathered radial shade with no edges, behind the text only, for contrast over bright bone | **no box**: the opaque box is gone. In its place is the same edge-less vertical fade the top bar already uses, continued down behind the heading while a caption is shown (see §5.3) |
| Teaching-view status | stacked beneath the topic, in the same column | same |

The target in the brief was about 28–36 px on desktop, scaling down. Headline topics are 30.7 px at 1280 and 34 px at
1440; on narrow screens they drop to 22 px, the same scale as the existing panel titles. Sentence-length topics sit one
step smaller, because the longest is 133 characters: at heading size it would have been five lines.

## 3. The same grammar everywhere

Every chapter renders its caption in the same place with the same rules:

- Hook
- What is a joint?
- Fixed
- Pivot
- Ball-and-socket
- Hinge
- Compare
- Recall
- Body map

There is no per-chapter placement: the position lives in one container, `.film-lead`, and the old per-style positions
(`--title` centred-left, `--statement` and `--lower` at the bottom) were removed rather than overridden. The style
names remain on the element, so any content-level styling still works.

## 4. What was deliberately kept

- **Every caption string and key, unchanged.** The caption still carries `data-testid="film-caption"`, `data-shot`,
  `data-text-key` and `data-provenance`. The DOM order is now caption, then status, which is also the order a screen
  reader reads them.
- **The fade.** The caption still eases in; it now drops 6 px into place rather than rising 10 px from the bottom.
- **The large-captions setting.** Rescaled to the new sizes (title up to 40 px, sentence up to 28 px) instead of
  enlarging the old bottom block.
- **The top bar, the subtitle, the player and every panel**: untouched.

## 5. Two things the move required

1. **Labels.** A site label sitting near the top of the frame could now land under the heading. On the body map at
   320 px, "Fixed" at the skull did. With no panel open, the heading now hands its rectangle to the label layout,
   through the same mechanism an open panel already used (Step 16D).

   Doing this exposed two latent faults in that mechanism, both fixed:
   - The vertical de-overlap pass did not know about the reserved rectangle, so it could push a label straight back
     underneath. A label that shares the rectangle's columns now keeps a floor or ceiling on the side where it sits. A
     new unit test fails without this.
   - `LabelSystem.invalidate()` only drops the cache. On a paused film nothing re-rendered, so the new layout never
     ran. The heading's publisher now asks for a render.

2. **Dialogs.** On a phone a dialog covers the top-left area. The lead fades with the top bar while a dialog is open,
   as the chapter title already did (Step 16D), so no text sits unreadable behind a dialog.

3. **Contrast on a phone.** The first full run failed `step12-a11y` "measured text contrast over the rendered scene"
   at 390×844, where the anatomy reaches the top of the frame and the small radial shade was not enough:

   | Text | Contrast |
   |---|---|
   | the intro subtitle | 2.67:1 |
   | the `hinge.support` provenance note | 2.37:1 |
   | the body-map recap | 4.48:1 |

   The opaque box had been what guaranteed contrast. On narrow screens, the heading now sits on a vertical fade
   (0.88 → 0.82 → transparent) from the top of the frame to 34 px below the heading. It is the top bar's own
   treatment, continued, with no edges and no box. It fades in with the caption, and does not fade under reduced
   motion. The contrast sweep then passed.

4. **Stacking.** That fade was first painted over the top bar, dimming "04 PIVOT JOINT" and the narration and settings
   icons on a phone: the lead and the top bar shared z-index 3, and the lead came later in the DOM. The contrast sweep
   did not catch it, because it compares text against the scene, not against an overlay. The lead now sits one layer
   under the top bar (z-index 2), and `step16f-hierarchy` asserts that stacking order directly. A hit test could not
   catch it, because the shade is `pointer-events: none`.
