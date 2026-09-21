# Camera and visual storytelling comparison

---

## 1. How each introduces the model

| | Reference | Ours |
|---|---|---|
| Opening frame | Whole respiratory system inside a ghosted ribcage, slightly off-axis (az 24°, el 6°), padding 1.14 → 1.02, **36° slow orbit** through the whole 13.9 s intro | Whole skeleton inside a translucent body shell, front view, scale 1.3 → 1.12, `compose: "right"` |
| Effect | The learner sees the system in its container and the orbit establishes it as a solid object in space | The learner sees the whole body; the orbit-free front view reads as a diagram rather than an object |

Both give context before detail. The reference's orbit does one extra job: it proves the thing is
three-dimensional before any close-up, so later close-ups are understood as parts of that object.

## 2. How the camera moves to the subject

**Reference.** There are no travel shots. Each scene simply starts at its own framing and the previous scene
cross-fades into it over 2.4 s while the narration is already running. Two scenes (`alveoli`, `gasExchange`)
use `alignTo: "heroCut"` with small `azOffset`/`elOffset`, so the second begins from the first's angle — an
explicit continuity device.

**Ours.** Each category chapter opens with a dedicated 6.0 s `*.travel` shot whose only content is the chapter
title. Five of them, 30 s, 11 % of the lesson. They preserve spatial orientation well — the learner watches
the camera fly from the last site to the next across the same body — but they cost 11 % of the running time
and teach nothing.

Verdict: **our travel shots are a real orientation asset and are priced too high.** They do not need deleting;
they need to talk.

## 3. Within-shot camera movement

| | Reference | Ours |
|---|---|---|
| Push-in | **Every one of 13 scenes** has `padding > paddingEnd` | Some shots have `scale → endScale`; most hold |
| Orbit | 4 scenes carry a slow orbit (intro 36°, summary 50°, gasExchange 30°, alveoli 20°) | none during teaching |
| Meaningful move | `bronchioles` pulls *back* as the branches multiply — the camera performs "divides again and again" | `pivot.rotate` pulls back from `pivot.bones` so the head enters frame while the bones stay legible (added in Step 15B) — the one clear instance |

The reference's constant slow push-in has a specific effect: the frame is always closing on the subject, which
reads as attention narrowing, and it keeps a still model from looking like a photograph. Our static framings
make shots with no animation (`fixed.detail`, `ball.hip`) feel like slides.

## 4. Readability of close-ups — chapter by chapter

Assessed from the Step-15B storyboard of the current build (`qa/visual/step15b_review/`, 1280×800).

### 03 Fixed — `fixed.detail`
Framing is good: the skull fills the right two-thirds, the coronal suture is centred, the rest of the skull is
dimmed. **But the subject itself is nearly invisible**: the suture is a hairline, marked by a faint dashed
circle and a 3 px dot. The single most important visual in the chapter — *two bones locked together* — is the
least legible thing in the lesson. Contrast the reference's `trachea`, where the cartilage rings are
unmistakable at a glance.

### 04 Pivot — `pivot.bones` → `pivot.rotate`
Much improved by Step 15B and now the best-directed sequence outside the elbow: look at the two bones from
behind and level, then pull back and rotate. Two residual problems, both visible in the capture:
- the skull above is very dark and very large, and it dominates the frame while the two lit vertebrae occupy
  perhaps 4 % of it;
- the label pill `Pivot joint · top of the neck` sits directly over the right-hand vertebra.

### 05 Ball-and-socket — `ball.shoulder`, `ball.hip`
`ball.shoulder` is the weakest framing in the lesson. The humerus runs out of the bottom of the frame, the
scapula is edge-on so the glenoid hollow — the thing the sentence is about — is not visible at all, and the
label pill overlaps the joint. `ball.hip` is better framed but has nothing to look at: 8 s of a static hip
with an arc.

### 06 Hinge
`hinge.axis` is the single best frame in our lesson: one idea, large, centred, clean, blue line on bone,
nothing else competing. `hinge.bones` and `hinge.support` are similarly good.

`hinge.try` and `hinge.check` are the exception and they are the shots where the learner is being asked to
*act*: the `movement` preset shows the whole arm from a near-sagittal angle in which the forearm crosses the
ribcage and the elbow is a small feature in the middle of a vertical stick. The learner is asked to "bend the
elbow to about 90°" while looking at the least legible view of the elbow in the chapter, with the flexion
panel occupying the right third.

### 07 Compare — `compare.together`
**Four indicators on a full skeleton at scale 1.12.** At 1280×800 the elbow axis is a ~30 px blue tick, the
shoulder arc a few pixels of orange, the pivot ring smaller still. The shot's caption is the thesis of the
lesson — "The type of joint tells you the pattern of movement" — and the picture supporting it is unreadable.

### 09 Body map — `map.all`
Works. Six labels, leader lines, no overlap, everything legible. This is the one multi-label frame that holds
together, and it is worth noting *why*: the labels are short category words, not sentences, and they are laid
out down the left with clear leaders.

## 5. Occlusion and composition

- **`compose: "right"`** pushes the model to the right and leaves a large empty region on the left, into which
  the caption panel is drawn. In `concept.meet` roughly 55 % of the frame is empty background. The reference
  centres the subject and floats small text over the corners, so the model uses the middle of the frame.
- **Label pills overlap the structures they point at** in `fixed.detail`, `pivot.rotate` and `ball.shoulder`.
  The reference always places the pill *outside* the structure with a visible leader line to a dot on it.
- **Panels occlude the subject.** In `explore_pivot_open` the panel truncates the label to "…ot joint · top of
  the neck". In `recall_1_question` the question panel covers the lower half of the skull being asked about.

## 6. What the reference does with the camera that is worth taking

1. Always be pushing in, slowly. It costs nothing and it removes the "slide" feeling from static shots.
2. Use the camera to perform the sentence at least once per chapter (the `bronchioles` pull-back).
3. Start the next shot from where the last one ended when two shots are about the same structure.
4. Return to the opening framing at the end, deliberately, and say so.
5. Frame so the structure being discussed fills a large, central part of the frame — the reference's
   `paddingEnd` values (0.7–1.15) are aggressive.
