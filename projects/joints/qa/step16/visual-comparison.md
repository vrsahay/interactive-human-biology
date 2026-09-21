# Visual design comparison

Principles, not templates. Nothing here is a recommendation to copy a layout.

---

## 1. Side by side

| | Reference | Ours |
|---|---|---|
| Background | near-black, flat, with a faint radial vignette | dark navy gradient |
| Model treatment | warm pinks and bone-white, with non-focus structures dropped to a translucent ghost | warm bone and tan, with non-focus structures dimmed to a dark olive |
| Type | one geometric sans; large semibold title, small-caps mono for the scene counter | one sans; large semibold caption, small-caps for chapter and product name |
| Accent | a single coral/red, used for the progress rule, the label rims and the primary button | a single amber/gold, used for chapter numbers, indicators and the progress fill |
| Caption treatment | plain text on the background, top-left; subtitle plain text bottom-centre | a large opaque rounded **panel** bottom-left |
| Labels | dark pill, thin leader line to a small ring on the structure, **name + small-caps gloss** | dark pill with a short leader to a dot, **name only** |
| Controls | one auto-hiding bar | one permanent bar plus a permanent 9-item chapter strip |
| Transitions | 2.4 s cross-fade of both the 3D and the text | per-shot camera transition; text swaps |

---

## 2. Hierarchy

**Reference.** Exactly one thing is large: the scene title. Everything else is small. The 3D model is the only
high-contrast object in the middle of the frame, so the eye goes there by default and the text is read
peripherally.

**Ours.** Two things are large and high-contrast: the caption panel (an opaque slab occupying the lower-left
quarter) and the *Explore this joint* pill. The model is often the third most prominent object in its own
frame. In `concept.meet` the caption panel is the brightest object on screen and the elbow it describes is at
the right edge.

**Principle to take:** *the subject should be the most prominent thing in the frame; text should be legible
without competing.* The reference achieves this by putting text on the background rather than on a panel, and
by keeping it small.

---

## 3. Labels — the clearest single difference

The reference's label is a two-line object when the word needs it:

```
  Pharynx
  THROAT
```
```
  Conchae
  CURVED SHELVES OF BONE
```

Exactly five terms in the entire lesson carry a gloss — `conchae`, `pharynx`, `larynx`, `trachea`, `alveoli`
— and they are exactly the five a Class-10 learner would not know. *Ribs*, *Lungs*, *Diaphragm*, *Bronchi*,
*Blood capillaries* carry none, because they need none.

Ours labels joint **sites** well (`Ball-and-socket joint · shoulder` — category plus location, which is the
right information) but labels **bones** as bare Latin (`Humerus`, `Radius`, `Ulna` in `hinge.bones` and
`hinge.return`) while the caption for the same shot carefully says "the upper-arm bone". The two halves of the
mapping are both on screen and nothing joins them.

**Principle:** gloss the unfamiliar term inside the label, at the moment the structure appears, and only for
terms that need it.

---

## 4. Leader lines and placement

The reference always draws a thin line from a small ring **on** the structure to a pill placed **off** it,
outside its silhouette. With three labels on screen (`exhalation`: Lungs / Ribs / Diaphragm) none overlaps the
model.

Ours places the pill adjacent to the anchor dot and, in three of the shots inspected, over the structure it
points at (`fixed.detail`, `pivot.rotate`, `ball.shoulder`). Our `map.all` does it correctly — six labels
stacked down the left with long leaders — which shows the layout engine can already do it.

---

## 5. Panels

The reference has no panel during teaching. Its Explore panel is a full-width sheet *below* the viewport on a
narrow window, so it never covers the model.

Our panels (explore, recall, flexion) are floating cards over the 3D view, and in every capture inspected they
occlude part of the subject:

- `explore_pivot_open.png` — the panel clips the label to "…ot joint · top of the neck";
- `recall_1_question.png` — the question panel covers the lower half of the skull the question is about;
- `06_hinge__hinge.check.png` — the flexion panel takes the right third while the learner is being asked to
  act on the elbow.

**Principle:** a panel that explains a structure should not cover it. Either reserve space and let the camera
compose around it, or dock the panel outside the render area.

---

## 6. Transitions

The reference cross-fades the 3D *and* the text over 2.4 s while the next scene's narration has already
started (`leadMs`). The result is that the lesson never visibly stops.

Our chapter changes are marked by a 6 s travel shot with a title and no speech. The orientation value is real
(see `camera-comparison.md` §2) but the lesson visibly pauses four times.

---

## 7. Visual emphasis of the thing being taught

The reference makes the subject *itself* the emphasis: non-focus structures drop to a ghost, the subject keeps
full saturation, and the camera closes on it. Emphasis is carried by the model.

We add emphasis *on top of* the model — a dashed ring, an arc, a rotation ring, an axis line — over a subject
that is often small in frame. Where the overlay is large and singular this works beautifully (`hinge.axis`).
Where it is small or multiplied it fails (`compare.together`, `fixed.detail`).

**Principle:** frame so the structure carries the emphasis; use an overlay to name a direction, not to
substitute for a legible subject.

---

## 8. Amount of UI

See `information-density-comparison.md` for the count (5 persistent elements versus 15). The transferable
principle, stated the way the brief asks for it:

> **The reference keeps non-essential controls hidden during the teaching sequence and returns them on
> demand.** It does not remove them; it removes their claim on attention.

---

## 9. What our visual design already does better

- **The DRAFT / TEACHING SIMULATION / 3D JOINT MODEL badge system.** The reference draws schematic and
  validated content in the same style with no distinction anywhere. Ours is legible, consistent and
  contrast-measured, and it is a commitment the reference has not made.
- **Measured contrast.** 341 measured runs over the rendered frame, 0 below threshold, including the two
  elements added in Step 15B (7.42:1 and 9.28:1). No equivalent evidence exists for the reference.
- **Responsive behaviour.** Tested at 1280, 1440, 768, 412, 390 and 320 px with no clipping, no horizontal
  scroll and 44 px targets. The reference reflows acceptably but has no such record.
- **`map.all`** is a better multi-label frame than anything in the reference.
