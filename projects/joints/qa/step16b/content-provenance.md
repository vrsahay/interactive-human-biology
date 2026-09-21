# Content provenance — Step 16B

Every string this step added or changed, and what it may claim. Nothing here has been reviewed by a subject expert;
everything instructional is `draft-enrichment` and carries the DRAFT badge on screen.

---

## 1. Totals

| Provenance | Before | After | Added by this step |
|---|---|---|---|
| `source-excerpt` | 1 | **1** | 0 |
| `figure-reference` | 21 | 25 | 5 (one retired) |
| `draft-enrichment` | 62 | **126** | 70 (4 retired) |
| `ui` | 115 | 135 | 24 (4 retired) |
| **Total** | **199** | **287** | 99 added, 1 changed, 11 retired |

The single source-excerpt — the one sentence supplied in the project brief — is unchanged and is still the only string
in the lesson with that provenance. A unit test asserts it.

---

## 2. The 70 new `draft-enrichment` strings

All of them require subject-expert review. They divide into:

| Group | Count | Keys |
|---|---|---|
| Spoken explanations (the `narr.*` layer) | 45 | `narr.intro.title`, `narr.hook.*` (3), `narr.concept.*` (2), `narr.intro.map`, `narr.fixed.*` (6), `narr.pivot.*` (6), `narr.ball.*` (6), `narr.hinge.*` (9), `narr.compare.*` (6), `narr.recall.open`, `narr.map.intro`, `narr.map.all` |
| Headline captions for new or re-headlined beats | 17 | `fixed.travel.head`, `fixed.bones.head`, `fixed.try.head`, `fixed.why.head`, `fixed.task.head`, `pivot.travel.head`, `pivot.bones.head`, `pivot.rotate.head`, `pivot.why.head`, `pivot.task.head`, `ball.travel.head`, `ball.bones.head`, `ball.move.head`, `ball.why.head`, `ball.task.head`, `hinge.travel.head`, `hinge.why.head` |
| Exploration tasks and their confirmations | 8 | `explore.{fixed,pivot,ball,hinge}.task`, `explore.{fixed,pivot,ball,hinge}.done` |

The four `*.why` statements and the four `*.name` statements are the ones that make a claim about mechanism. They are
set out sentence by sentence, with what each deliberately does not say, in **`reason-statements.md`**.

## 3. The 5 new `figure-reference` strings

`figure-reference` means: a joint-category name or a body location as shown in the supplied NCERT figure. No wording,
artwork or layout is copied from it. The five added here are all category names used as short labels:

`hinge.name.label` ("Hinge joint"), `compare.fixed.label` ("Fixed"), `compare.pivot.label` ("Pivot"),
`compare.ball.label` ("Ball and socket"), `compare.hinge.label` ("Hinge").

A unit test asserts that every `figure-reference` key matches `title | ^chapter. | label` — so this provenance class
cannot quietly acquire explanatory sentences.

## 4. The 24 new `ui` strings

Interface and accessibility text. Not educational content, not spoken as teaching.

- **Landing card:** `ui.start_lesson`, `ui.start_meta` ("9 parts · about 6 minutes"), `ui.start_sound`,
  `ui.start_thesis`.
- **Completion card:** `ui.complete_title`, `ui.complete_replay`, `ui.complete_explore`, `ui.complete_recall`.
- **Exploration task:** `ui.task` ("Your task").
- **Per-shot descriptions for the new beats:** 15 `a11y.*` strings — `a11y.fixed.{bones,try,why,name,task}`,
  `a11y.pivot.{why,name,task}`, `a11y.ball.{bones,move,why,name,task}`, `a11y.hinge.{why,name}`. These are what a screen
  reader is given for the 3D stage on those shots.

One spoken string is `ui` and is allowed to be: `hinge.try_prompt` / `check.prompt`, the interaction prompts. They ask
for an action; they do not teach a fact. The narration test allows `ui` only for the interaction prompt and requires
content provenance for everything else spoken.

## 5. The one changed string

| Key | Before | After | Why |
|---|---|---|---|
| `concept.meet` | "A joint is a place where **two** bones meet." | "A joint is a place where bones meet." | The shot shows the elbow, where three bones meet. The picture contradicted the sentence. The spoken line now says so explicitly: *"Most joints are two bones meeting; here at the elbow, three bones come together."* |

## 6. The 11 retired strings

| Key | Why it went |
|---|---|
| `ball.text.hip`, `ball.label.hip` | The hip beat was removed: it was an unexplained statement and the hip's classification is **PENDING EXPERT CONFIRMATION**. |
| `compare.fixed`, `compare.pivot`, `compare.ball`, `compare.hinge` | The four comparison sentences became a short headline plus a spoken line. |
| `pivot.bones` | Same — replaced by `pivot.bones.head` plus `narr.pivot.bones`. |
| `chapter.number.02` … `chapter.number.05` | The travel beats no longer carry a chapter eyebrow; they carry a location headline instead. |

No provenance marker was removed from any surviving string, and no string moved to a weaker provenance class.

## 7. What is still pending

- **Every one of the 126 `draft-enrichment` strings** needs subject-expert review, including the 62 carried in from
  before this step.
- The **asset licence** remains a **RELEASE BLOCKER — PENDING**.
- The **hip's ball-and-socket classification** remains **PENDING EXPERT CONFIRMATION**; this step removed the beat that
  taught it rather than resolving it.
- **Formal Gate 3** remains **PENDING EXPERT LANDMARK APPROVAL**; `qa/elbow_r.poses.draft.json` is still a draft.
- The elbow's 0–145° range still rests on the Zwerus et al. (2019) normative reference, which supports the choice of a
  teaching range and does **not** validate this model's geometry. That wording is unchanged and still in the Sources
  dialog.
