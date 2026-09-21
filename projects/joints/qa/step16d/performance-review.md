# Performance review — Step 16D

Step 16D removed UI elements, changed narration text and added one layout pre-pass. Nothing in the render loop, the
scene graph, the asset pipeline or the delivery tiers was touched. This review measures what changed and states
plainly what it does **not** claim.

---

## 1. What could have affected performance

| Change | Render path? | Effect |
|---|---|---|
| Badge removed from every caption | no — one fewer DOM node per shot | marginally less DOM |
| Sources control removed from the teaching surface, moved into Settings | no | one fewer persistent control (17 → 16) |
| `sr-only` disclaimer removed from 28 captions | no | less text in the accessibility tree |
| Subtitle element added, with a CSS scrim at ≥ 901 px | compositor only — a static `::before`, no per-frame work | none measurable |
| Top bar faded while a dialog is open | CSS opacity, not layout | none |
| **`layoutLabels()` reserved-rectangle pre-pass** | **yes — the only one** | see §3 |
| Narration text changed; 76 clips re-synthesised | no | smaller download (§4) |

## 2. Payload

| | Before | After | Δ |
|---|---|---|---|
| **Initial JS + CSS, raw (not gzipped)** | **1 069 KB** | **1 071 KB** | **+2 KB** |
| — of which JS, after | — | 1 041 KB across 6 chunks | — |
| — of which CSS, after | — | 29 KB in 1 file | — |
| Narration, 52 shot clips + 24 cues | 1 493 KB | **1 435 KB** | **−58 KB** |
| Narration per clip, median / max | — | 19.3 KB / 48.2 KB | — |
| `dist` total | 17 M | **17 M** | unchanged |
| 3D assets in `dist/assets` | 12 M | **12 M** | **byte-identical — `git diff` over the asset directories is empty** |

The +2 KB of JavaScript is the label pre-pass, the `ResizeObserver` wiring, the subtitle component and the task UI.
The −58 KB of audio is four shorter spoken lines and four task cues that stopped repeating their instruction.

Narration is still fetched lazily, one clip at a time, after the film starts: none of the 1 435 KB is on the path to
the first 3D frame. One clip ahead is prefetched on each shot change (~19 KB at the median), and the first clip is
prefetched while the landing card is on screen.

## 3. The one render-path change, measured

`layoutLabels()` gained a pre-pass: when a panel publishes a reserved rectangle, each label box is tested against it
and slid right, lifted or dropped. It is **O(number of visible labels)** — at most a handful — it allocates nothing,
and it runs only while a panel is open, which is exactly when the film is paused.

The layout cache was the thing to protect, since a reserved rectangle that changed identity every frame would defeat
it. The rectangle is part of the cache key and is only republished by a `ResizeObserver`, so it is stable between
resizes. `step12-delivery` §"labels skip layout when nothing moved on screen" re-ran and **passes**, which is the
direct assertion that the cache still short-circuits a still frame.

## 4. Lesson length

| | Before | After |
|---|---|---|
| Shots | 52 | 52 |
| Duration | 6:25 (385.3 s) | **6:23 (382.6 s)** |
| Speech-timed shots | 20 | 20 |
| Clips that overrun their shot | 0 | **0** |

Two seconds shorter because four spoken lines got shorter. No shot was padded, and no shot was cut short of its speech.

## 5. What this review does not claim

- **No cross-session frame-rate comparison is offered.** This machine's CPU benchmark has drifted by roughly 4×
  between sessions in this project, so a frame time recorded today is not comparable to one recorded in an earlier
  step. Any such comparison would be noise presented as a result.
- **No A/B was run for this step**, because a meaningful one means rebuilding the baseline from its tag and
  alternating runs — and the only render-path change here is a pre-pass that runs while the film is paused. The cost
  would have exceeded the resolution of the measurement.
- **No device certification.** The responsive work in §10 of this step is a layout check at seven viewport widths in
  one desktop browser under emulation. Real phones and tablets remain **NOT TESTED**; `qa/release/device-certification.md`
  is unchanged and still says so.
- The standing perf budget and its methodology are unchanged and were not re-litigated here.

## 6. What was re-run

`step12-delivery` in full (quality tiers, lazy loading, deferred elbow, LOD gating, handover, label layout caching)
and `perf-lab`, both **passing**. Neither was modified in this step.
