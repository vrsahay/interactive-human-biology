# Teaching depth review — the four categories, taught to the same depth

The Step-16 audit's finding, in one line: **the hinge chapter was taught and the other three were introduced.** This
document is the before/after for that.

---

## 1. The teaching shape, declared as content

Every category chapter now carries a `teaching` block in the lesson, naming the shot that plays each beat:

```json
"teaching": {
  "arrive": "fixed.travel",   // the camera travels, and speaks while it travels
  "look":   "fixed.bones",    // the join itself, still, framed large enough to read as two structures
  "movement": "fixed.try",    // the movement the category is named for
  "reason": "fixed.why",      // why that shape produces that movement
  "name":   "fixed.name",     // the category is named, after the reason
  "explore": "explore.fixed"  // the learner does it themselves
}
```

The engine does not branch on it. It is the contract the four chapters are written against, and the build validates it:
every beat must be a shot of that chapter, the beats must appear in that order, the exploration must exist, and the
reason beat must actually say something. A category cannot quietly slide back to being an introduction without failing
the build.

---

## 2. Before and after

| | Fixed | Pivot | Ball-and-socket | Hinge |
|---|---|---|---|---|
| **Shots before** | 2 | 3 | 3 | 11 |
| **Shots after** | **6** | **6** | **6** | **13** |
| **Duration before** | 14.0 s | 21.0 s | 22.5 s | 98.1 s |
| **Duration after** | **49.3 s** | **44.5 s** | **43.9 s** | **115.6 s** |
| **Spoken words before** | 17 | 28 | 33 | 93 |
| **Spoken words after** | **138** | **124** | **118** | **185** |
| **Arrive** | ✓ speaks while travelling | ✓ | ✓ | ✓ |
| **Look (still, no indicator)** | ✓ `fixed.bones` (new) | ✓ `pivot.bones` | ✓ `ball.bones` (new) | ✓ `hinge.bones` |
| **Movement** | ✓ `fixed.try` (new) | ✓ `pivot.rotate` | ✓ `ball.move` | ✓ `hinge.flexion` |
| **Reason — why that shape** | ✓ `fixed.why` (new) | ✓ `pivot.why` (new) | ✓ `ball.why` (new) | ✓ `hinge.why` (new) |
| **Named after the reason** | ✓ `fixed.name` (new) | ✓ `pivot.name` (new) | ✓ `ball.name` (new) | ✓ `hinge.name` (new) |
| **Learner does it** | ✓ handover at `fixed.task` | ✓ at `pivot.task` | ✓ at `ball.task` | ✓ `hinge.try` + the 90° check |

The three chapters that were introductions are now within a factor of 1.12 of each other (49.3 / 44.5 / 43.9 s); before
this step the spread was 14.0 to 22.5 s, and the thinnest of them was **one seventh** of the elbow chapter. It is now
**38 %** of it — and the elbow chapter includes 28 s of learner-paced interaction that the others hand to the
exploration instead.

A test asserts all of this: the beats exist, they are in order, each chapter has at least six shots and at least 90
spoken words, the three lighter chapters are within 1.5× of each other, and none is under a third of the elbow chapter.

---

## 3. What each category now answers

The audit's five questions — *what / where / what it does / how it moves / **why it belongs to that category***.

### 03 Fixed
1. `fixed.travel` — "Go up to the top of the head. The skull looks like a single piece, but it is several separate bones
   meeting along wavy lines."
2. `fixed.bones` — the two bones and the line between them, still, no indicator, at scale 2.4 → 2.2 (the old beat was
   3.1 → 2.8 and carried the indicator from the first frame).
3. `fixed.try` — the indicator returns and the point is that **nothing moves**: "Watch the join itself. Nothing slides
   and nothing bends."
4. `fixed.why` — **the beat that did not exist**: interlocking edges, tough fibres, no gap to slide in.
5. `fixed.name` — "A join that holds two bones still like this is called a fixed joint."
6. `fixed.task` — hands over to the exploration: *try to move the two skull bones apart*.

**Before:** a travel shot with a title card, then eight seconds of "these bones do not move against each other".

### 04 Pivot
Keeps the Step-15B sequence (`pivot.bones` → `pivot.rotate`, which the brief asked us to build on) and adds the two
beats it lacked: `pivot.why` — the upper bone turns about one vertical line and that is the only movement the shape
allows — and `pivot.name`. Then `pivot.task` hands over: *turn the head as if you were looking over one shoulder*.
No C1/C2 rig was created, no mechanics are asserted, and the rotation is still the same group-driven teaching
simulation, still badged as one.

### 05 Ball-and-socket — the biggest change
- **`ball.bones` is new and is the shot the chapter never had**: the rounded head of the upper-arm bone and the hollow
  beside it, framed so both are readable (see `camera-review.md` for how the framing was chosen).
- `ball.move` replaces `ball.shoulder` with a wider framing that keeps the arm in frame while the indicator sweeps.
- `ball.why` explains why a ball in a hollow is not limited to one line.
- `ball.name` names it.
- `ball.task` hands over: *move the arm in two different directions* — the learner performs "many directions" rather
  than being told about it.
- **`ball.hip` is gone.** It was eight seconds of "the hip is another ball-and-socket joint" with no explanation, and
  the hip's classification is still PENDING EXPERT CONFIRMATION. See `reason-statements.md`.

### 06 Hinge
Unchanged in substance — it is the template the other three were rebuilt against. It gains the same two beats they now
have: `hinge.why` (the spool-shaped end of the upper-arm bone and the forearm bone wrapped around it) and `hinge.name`.
Every other shot keeps its id, its framing and its pose track. **The validated elbow is untouched.**

---

## 4. Beats that are now identical across the four

| Beat | Fixed | Pivot | Ball | Hinge |
|---|---|---|---|---|
| Travel speaks instead of showing a title card | ✓ | ✓ | ✓ | ✓ |
| A still "look at the join" beat with no indicator | ✓ | ✓ | ✓ | ✓ |
| A movement beat with exactly one indicator | ✓ | ✓ | ✓ | ✓ (the rig) |
| A reason connecting shape to movement | ✓ | ✓ | ✓ | ✓ |
| Naming after the reason | ✓ | ✓ | ✓ | ✓ |
| A learner task with a pass condition | ✓ | ✓ | ✓ | ✓ |
| Short headline caption + longer spoken explanation | ✓ | ✓ | ✓ | ✓ |
| Speech-derived shot length | ✓ | ✓ | ✓ | ✓ |

---

## 5. Chapter titles no longer pre-empt the naming

The four `*.travel` shots used to carry the category name as their caption title, so the lesson named the category
before it had shown anything. They now carry a location instead — *"Several bones, one skull"*, *"The top of the neck"*,
*"Where the arm meets the body"*, *"The elbow"* — and the naming happens in the `*.name` beat, after the reason. The
chapter strip still shows "03 Fixed joint", because that is navigation, not teaching.

---

## 6. What did not change

- The nine-chapter spine: hook → what is a joint → four categories → compare → recall → body map.
- The recall challenge: same five questions, same movement-first phrasing, same architecture.
- The 90° guided check inside the hinge chapter.
- The validated elbow in every respect — geometry, rig, pivot, axis, neutral offset, DOF name, 0–145° range, manifest,
  GLBs.
- The schematic-honesty system: teaching-simulation badging, the persistent on-stage status, the DRAFT provenance badge
  and the Sources & draft status dialog.
- No new anatomy assets, no new rigs, no new joint categories.
