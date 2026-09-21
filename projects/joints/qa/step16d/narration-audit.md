# Narration audit — the whole transcript, not clip by clip

The complete spoken lesson was extracted in order, each line with its neighbours and with the caption it plays under,
and then analysed as one text. Raw transcript and the analysis are reproducible from
`qa/step16d/audit_learner_ui.mjs` and the script in this document's commit.

---

## 1. Totals

| | Before | After |
|---|---|---|
| Spoken lines (shots with a clip) | 52 | 52 |
| Spoken words | 885 | **877** |
| Learner-paced cue words | 297 | **245** |
| Lines whose spoken text is word-for-word their own caption | **10** | **5** |
| Near-duplicate pairs across the lesson (Jaccard ≥ 0.45) | 2 unintended + 2 intended | **0 unintended, 2 intended** |
| Exploration task cues that repeat the instruction | 4 | **0** |
| Lesson duration | 6:25 | **6:23** |
| Narration bytes | 1 493 KB | **1 435 KB** |

The word count barely moved, which is the point: repeated information was **replaced** with new information, not
deleted. Only the cues got materially shorter, because there the repetition was pure duplication.

---

## 2. A. Exact duplicates

One, and it was inside a single clip.

| Where | Was | Now |
|---|---|---|
| `explore.fixed.task` cue | "Try to move the two skull bones apart. **Try to move the skull bones.**" | "Try to move the two skull bones apart." |

**Cause:** the narration build composed a task cue as `task prompt + exploration instruction`. For the fixed joint those
two strings say the same thing. Fixed at the source: a task cue now speaks the task and nothing else
(`pipeline/audio/build_narration.ts`). The drag instruction is still on screen in the panel, where it belongs.

## 3. B. Near-duplicates

| Pair | Score | Verdict |
|---|---|---|
| `hook.shoulder` → `ball.move` | 0.45 | **Removed.** The hook already said "swing forward, out to the side, and round in a circle" two and a half minutes earlier. The shoulder chapter was repeating the hook's own words instead of adding what the hook could not say. Rewritten: *"That one joint gives the arm more freedom than any other in the body: forward, backwards, out sideways, and right round."* |
| `hinge.name` → `map.hinge` | 0.50 | **Kept.** Naming the category, then anchoring it on the body map two and a half minutes later, is the point of the body map. |
| `compare.together` → `map.all` | 0.45 | **Kept.** The lesson's thesis, stated at the comparison and again as the closing line. Deliberate. |

The three exploration task cues for pivot, ball-and-socket and hinge also appended their drag instruction. Not exact
duplicates, but the panel shows both lines already, so hearing both was redundant. All four cues now speak the task
only.

## 4. C. Repetition that added no new information

### The third summary pass

The lesson closed with three passes over the same four facts:

1. `compare.fixed / pivot / ball / hinge` — four close framings, one line each.
2. `map.fixed / pivot / ball / hinge` — the body map, one line each.
3. `map.all` — *"Fixed joints hold bones still. Pivot joints turn. Ball-and-socket joints move many ways. Hinge joints bend and straighten one way."*

The third pass restated the second, five seconds after it, **and** its own caption already shows that list on screen
(*"Fixed: no movement · Pivot: turning · Ball and socket: many directions · Hinge: one direction"*). Reading a visible
list aloud is the weakest kind of narration.

**Now:** the caption keeps the list, and the closing line carries the meaning instead —
*"Four joins, four shapes, four kinds of movement. The shape of the join is what decides."*

Passes 1 and 2 are untouched: a comparison and a body-map anchor are different jobs.

### A sentence restating the one before it

| Shot | Was | Now |
|---|---|---|
| `fixed.try` | "Watch the join itself. Nothing slides and nothing bends. **These two bones stay exactly where they are.**" | "Watch the join itself. Nothing slides, nothing bends, nothing shifts at all." |

### An instruction repeating its own caption

| Shot | Was | Now |
|---|---|---|
| `hinge.try` | caption *"Your turn: bend and straighten the elbow."* + prompt *"Drag the forearm to bend the elbow."* | prompt is now *"Drag the forearm, or use the slider."* — it adds the one thing the caption does not say |

### The two layers collapsed into one

Ten of fifty-two shots spoke their caption word for word, which defeats the Step-16B design (a short headline to hold,
a fuller spoken line to understand). Five were repaired:

| Shot | Caption now | Spoken now |
|---|---|---|
| `map.fixed` | "Fixed · skull" | "Fixed joints hold the skull bones together." |
| `map.pivot` | "Pivot · top of the neck" | "A pivot joint at the top of the neck turns the head." |
| `map.ball` | "Ball and socket · shoulder" | "A ball-and-socket joint at the shoulder moves many ways." |
| `map.hinge` | "Hinge · elbow" | "A hinge joint at the elbow bends and straightens." |
| `hinge.bones` | "Three bones meet here" | "The elbow is where the upper-arm bone meets two bones in the forearm." |

Five were **left identical, deliberately**, and the test names them so the exemption cannot spread:

| Shot | Why identical is right |
|---|---|
| `hinge.check` | An instruction. "Try it: bend the elbow to about 90°" should read and sound the same. |
| `recall.challenge` | The same — an instruction, not an explanation. |
| `hinge.return` | A two-second transition. A second layer would be noise. |
| `map.intro` | A three-second opening line for the chapter. |
| `hinge.axis` | Constrained by the Step-15B invariant that the *first* text to say "axis" must explain the line before naming it. Splitting it would put "axis" in the headline, ahead of the explanation. |

## 5. D. Repetition that teaches, and is kept

The brief's rule — **introduce → demonstrate → extend → apply** — checked across the whole lesson, and asserted by
`step16d-polish` §6 so it cannot be optimised away:

**The elbow's arc**
1. `hook.elbow` — *"It does one thing: it bends and it straightens."* (introduce)
2. `hinge.source` — *"…the way a door swings on its hinges."* (a model for it)
3. `hinge.flexion` / `hinge.extension` — the two movements get their names (new information)
4. `hinge.why` — *"A spool can only turn about its own line, so the elbow can only bend and straighten."* (the reason)
5. `hinge.name` — the category is named (new information)
6. `hinge.knee` — *"It is bigger, but it does the same thing."* (extend to a second example)
7. `explore.hinge.done` — *"That is flexion. Straighten it again and that is extension."* (apply, in the learner's hands)

"Bends and straightens" appears four times across six and a half minutes, and each time it carries something the
previous one did not. That is the shape the brief asked for, so it stays.

**The thesis**, stated three times by design: at `concept.different` where it is introduced, at `compare.together`
where the four categories meet, and at `map.all` where the lesson closes. All three now say "decides", and the test
requires all three.

**One takeaway per category**, still present in the comparison chapter: fixed → almost no movement; pivot → turning;
ball-and-socket → many directions; hinge → bending and straightening one way.

## 6. Narration that adds meaning rather than describing pixels

The rewritten lines were checked against the brief's question — does this answer *what am I looking at / what is
happening / why / what should I notice*?

| Shot | Before (describes) | After (explains) |
|---|---|---|
| `ball.move` | "From there the arm can swing forward and back, lift out to the side, and sweep round in a circle." — a list of what is visibly happening | "That one joint gives the arm more freedom than any other in the body: forward, backwards, out sideways, and right round." — says *why it matters* first |
| `map.all` | a list the caption already shows | the rule that the whole lesson has been building to |

## 7. Pacing after the change

Shot length is still `measured speech + intentional visual floor` for the 43 speech-timed shots; the narration build
re-derived 20 of them from the new clips. Every clip is at speaking rate **1.0** — nothing is compressed — and the
build reports **every clip fits its shot**, 0 overruns, 0 silent shots, 0 orphans.

No shot was shortened without its speech shortening first, and no shot was padded. The lesson went from 6:25 to
6:23.

## 8. Provenance

Every changed line is recorded in `content-change-log.md` with its old text, new text, classification and review
status. **All of them remain `draft-enrichment` and all of them still require subject-expert review.** Nothing was
promoted to source-backed, and the single `source-excerpt` string in the lesson is unchanged.
