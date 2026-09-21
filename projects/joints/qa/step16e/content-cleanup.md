# Content cleanup — Step 16E

One learner-facing line changed. Nothing else in the content did.

---

## The change

**OLD:**
"That one joint gives the arm more freedom than any other in the body: forward, backwards, out sideways, and right
round."
*(the "freest joint in the body" claim, as the Step-16D report summarised it)*

**NEW:**
"From this one joint, the arm can move in many directions: forward, backwards, out sideways, and right round."

**REASON:**
Unsourced comparative claim removed.

| | |
|---|---|
| Key | `narr.ball.move`, the spoken line of the shot `ball.move` in the ball-and-socket chapter |
| On screen | as the subtitle for that shot; the headline above it, "Movement in many directions", is unchanged |
| Class before | `draft-enrichment` |
| Class after | **`draft-enrichment`**, unchanged |
| Expert review | **required**, as for every draft line |

## Why this wording

The brief asked for the observable idea, that the shoulder allows movement in many directions, and nothing more.

- **Nothing new is claimed.** The same idea is already in the lesson, in the same words:
  - `ball.text.shoulder`: "…so the arm can move in many directions."
  - `explore.ball.explanation`: "The arm moves in many directions, not just one."
  - `narr.compare.ball`: "The shoulder: a round end in a hollow, so movement in many directions."
  - `ball.move.head`, the headline of this very shot: "Movement in many directions".
- **No comparison** with any other joint, and no superlative. The banned forms are checked by a test: *freest*,
  *more freedom than any*, *most mobile*, *widest range*, *than any other joint / in the body*.
- **No citation was invented,** and none is implied.
- **It is not a repeat of the hook.** Step 16D rewrote this line because the old wording echoed the hook
  (`narr.hook.shoulder`). The new line was checked with the same word-overlap measure used in Step 16D. Its closest
  string is `explore.ball.explanation` at a Jaccard score of **0.31**, and `narr.hook.shoulder` scores **0.30**. The
  near-duplicate threshold is 0.45.

## Search for other instances

Every string in `content/locales/en/hinge-elbow.json` and every clip text in the narration manifest was searched for
the banned forms. The only match was `narr.ball.move`, and it has **0 matches** after the change.

## The narration

| | Before | After |
|---|---|---|
| Clip | `ball.move.mp3`, 7.96 s of speech | **6.72 s**, rate 1.0 |
| Shot `ball.move` (speech-timed) | 8.8 s | **7.5 s**: 6.72 s + 0.35 s lead-in + 0.40 s tail, rounded up; above its 7.0 s visual floor |
| Clips re-synthesised | — | **1 of 76** |
| Clips reused unchanged | — | **75**, verified by text and SHA-256 |
| Narration total | 1 435 KB | **1 432 KB** |
| Lesson | 6:23 (382.6 s) | **6:21 (381.3 s)** |
| API key in the manifest | 0 | **0** |

To make "rebuild only the affected clip" provable, the narration build now reuses any clip whose spoken text is
identical to the previous manifest and whose file still matches its recorded hash. `--all` forces a full rebuild. A
no-change run was made first: it synthesised **0** clips and changed nothing but the manifest's timestamp.
