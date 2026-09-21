# Provenance review — Step 16E

## 1. Totals

| Class | Before | After |
|---|---|---|
| `source-excerpt` | 1 | **1** |
| `figure-reference` | 29 | **29** |
| `draft-enrichment` | 126 | **126** |
| `ui` | 136 | **136** |
| **Total** | 292 | **292** |

**1 string changed. 0 added, 0 retired, 0 reclassified.** Nothing was promoted to source-backed, and nothing was
relabelled as NCERT.

## 2. The one changed string

| Key | Class | Text | Review |
|---|---|---|---|
| `narr.ball.move` | `draft-enrichment` → **`draft-enrichment`** | see [content-cleanup.md](content-cleanup.md) | **required** |

It stays draft enrichment because no source in the lesson's source list supports it more strongly than it supports
the other 125 draft lines. The replacement adds no claim; it restates one the lesson already makes. That is a reason to
keep it simple, not a reason to reclassify it.

## 3. What a learner sees, and what an expert can still inspect

| | Learner | Expert / teacher |
|---|---|---|
| DRAFT badge | **none**, 0 on any frame at any width (asserted by `step16e-mobile` and `step16d-polish`) | the classification on every caption as `data-provenance`, and the legend under Settings → For teachers → Sources & draft status |
| The 126 draft strings | read as ordinary lesson text | each carries `provenance: "draft-enrichment"` in the locale file; the new expert package lists every one |
| The replaced line | the new wording | the old and new wording, side by side, in [content-cleanup.md](content-cleanup.md) and in the expert package |

## 4. Asserted by tests

- `step16e-mobile` §10–11: no string or clip contains the banned comparative forms; `narr.ball.move` is
  `draft-enrichment`; the clip speaks exactly the new text at rate 1.0 and fits its shot; there are still 126
  draft-enrichment strings and 1 source excerpt.
- The existing provenance unit tests (every string has a class; `figure-reference` keys follow the naming rule; no API
  key in the shipped manifest) all pass: **98 / 98 unit tests**.

## 5. Unchanged and still PENDING

The hip classification, the taxonomy, landmark approval, the 0–145° teaching range, the licence, and all 126
draft-enrichment strings. No expert decision was made or implied in this step.
