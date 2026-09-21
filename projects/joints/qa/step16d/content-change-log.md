# Content change log — Step 16D

Every learner-facing string this step touched, with its classification before and after.

**Nothing was reclassified. Nothing was promoted to source-backed. Every changed instructional line is still
`draft-enrichment` and still requires subject-expert review.**

---

## 1. Totals

| | Before | After |
|---|---|---|
| `source-excerpt` | 1 | **1** |
| `figure-reference` | 25 | 29 |
| `draft-enrichment` | **126** | **126** |
| `ui` | 135 | 136 |
| **Total** | 287 | 292 |

9 added, 5 changed, 4 retired, **0 reclassified**.

---

## 2. Changed instructional lines

| Key | Old text | New text | Class | Expert review |
|---|---|---|---|---|
| `narr.fixed.try` | "Watch the join itself. Nothing slides and nothing bends. **These two bones stay exactly where they are.**" | "Watch the join itself. Nothing slides, nothing bends, nothing shifts at all." | `draft-enrichment` | **required** |
| `narr.ball.move` | "From there the arm can swing forward and back, lift out to the side, and sweep round in a circle." | "That one joint gives the arm more freedom than any other in the body: forward, backwards, out sideways, and right round." | `draft-enrichment` | **required** |
| `narr.map.all` | "Fixed joints hold bones still. Pivot joints turn. Ball-and-socket joints move many ways. Hinge joints bend and straighten one way." | "Four joins, four shapes, four kinds of movement. The shape of the join is what decides." | `draft-enrichment` | **required** |
| `hinge.bones` | "The elbow is where the upper-arm bone meets two bones in the forearm." | "Three bones meet here" | `draft-enrichment` | **required** |

**What each change does, and what it does not claim:**

- `narr.fixed.try` — the third sentence restated the second. The claim is unchanged: nothing moves at this join. No new
  mechanism is asserted.
- `narr.ball.move` — the old line repeated the hook's own words. The new line makes a **comparative claim**: that the
  shoulder is the freest joint in the body. That is standard and widely stated, but it is **new** in this lesson and it
  is not sourced here. It is the line in this step that most needs the reviewer's eye.
- `narr.map.all` — the caption already shows the four-item list; the spoken line now carries the lesson's rule instead
  of reading the list aloud. The rule itself is unchanged and is already stated twice elsewhere.
- `hinge.bones` — the *caption* became a short headline. The sentence it replaced is not lost: it is now the spoken
  line for that shot (`narr.hinge.bones`, unchanged text, unchanged class).

| Key | Old | New | Class |
|---|---|---|---|
| `hinge.try_prompt` | "Drag the forearm to bend the elbow" | "Drag the forearm, or use the slider." | `ui` — an instruction, not a claim |

## 3. Added

Four short labels for the body map, and the four sentences they displaced, which are now spoken instead of read:

| Key | Text | Class |
|---|---|---|
| `map.fixed.label` | "Fixed · skull" | `figure-reference` — a category name and a location |
| `map.pivot.label` | "Pivot · top of the neck" | `figure-reference` |
| `map.ball.label` | "Ball and socket · shoulder" | `figure-reference` |
| `map.hinge.label` | "Hinge · elbow" | `figure-reference` |
| `narr.map.fixed` | "Fixed joints hold the skull bones together." | `draft-enrichment` — **the same text as the old caption**, moved, not written |
| `narr.map.pivot` | "A pivot joint at the top of the neck turns the head." | `draft-enrichment` — same, moved |
| `narr.map.ball` | "A ball-and-socket joint at the shoulder moves many ways." | `draft-enrichment` — same, moved |
| `narr.map.hinge` | "A hinge joint at the elbow bends and straightens." | `draft-enrichment` — same, moved |
| `ui.for_teachers` | "For teachers" | `ui` |

The four `narr.map.*` strings carry **exactly the text that was previously in the captions of those shots**. No new
claim entered the lesson through them.

The four `*.label` keys follow the existing convention that a `figure-reference` key matches `title | ^chapter. |
label`, which a unit test enforces — that is why they are named `.label` rather than reusing the old keys.

## 4. Retired

`map.fixed`, `map.pivot`, `map.ball`, `map.hinge` — the old caption strings, replaced by the `.label` headline plus the
`narr.map.*` spoken line above. Their text survives verbatim in the spoken layer.

## 5. One memorable takeaway per category

The brief asks for a clear anchor per category. All four are already in the comparison chapter and are now asserted by
`step16d-polish` §6 so they cannot be edited away:

| Category | Anchor, as spoken | Class |
|---|---|---|
| Fixed | "The skull: edges locked together, so almost no movement." | `draft-enrichment` |
| Pivot | "The top of the neck: one bone turning around another." | `draft-enrichment` |
| Ball-and-socket | "The shoulder: a round end in a hollow, so movement in many directions." | `draft-enrichment` |
| Hinge | "The elbow: bending and straightening around one line." | `draft-enrichment` |

**These are not presented as NCERT quotations and are not classified as such.** They are draft enrichment, they carry
the DRAFT classification in the content, and they are listed for review with the other 122.

## 6. Unchanged and still pending

- The single `source-excerpt` sentence, unchanged.
- The hip's ball-and-socket classification — **PENDING EXPERT CONFIRMATION**, untouched; nothing in the lesson teaches
  or asks it.
- The 0–145° teaching range and its Zwerus et al. (2019) citation — unchanged, still in the Sources dialog, still
  stating that the reference does not validate this model.
- Taxonomy, landmark approval, licence — unchanged, all **PENDING**.
- All 126 `draft-enrichment` strings still require subject-expert review, including the four changed here.
