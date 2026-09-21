# Performance review — `step16g-narration-repetition-fixed`

This sheet records measurements. **It makes no release recommendation, and none may be read into it.** Every decision is
PENDING.

---

## 1. Step 12 — carried forward unchanged

**Step 12 = FAIL.** Nothing since has changed that, and nothing has tried to.

| Target | Measured (emulated phone, CPU ×4) | Status |
|---|---|---|
| First meaningful 3D ≤ 2500 ms | **2742 ms p50** (n = 5; p95 3111 ms; min 2558 ms) | **MISS — open** |
| Interaction p95 ≤ 22 ms | **45.1 ms** drag p95 | **MISS — open** |

Recorded at Step 12R: the frame loss at ×4 was **workload-independent**. Draw calls, triangle count, overlays, UI and
device pixel ratio each moved it by less than the noise floor, and a plain WebGL control held 60 fps in the same
harness. The cause was not isolated. It was recorded, not "optimised away".

Profiles and their classification:

| Profile | Classification |
|---|---|
| desktop broadband | **REAL HARDWARE**: Lenovo 20V9, i5-1135G7, Iris Xe, 16 GB, Windows 11; Chrome 152 headless, ANGLE D3D11 |
| integrated GPU broadband / Fast 4G | **REAL HARDWARE**; network emulated |
| tablet ×2, phone ×2, phone ×4 | **EMULATED — NOT CERTIFICATION** |

> **No real Android benchmark. No real iPad benchmark. No mobile certification.**

Sources: `qa/reports/step12r.perf.final.json`, `qa/reports/step12r.final.md`, and the Step-15B performance sheet
(`qa/expert/step15b/performance-review.md`), which holds the full tables.

## 2. What has changed since, measured byte-for-byte

Byte counts are deterministic. Times from this machine are not comparable across sessions: its CPU benchmark has
drifted about 4× between sessions. So only bytes are compared here, and no new timing claims are made.

| | Step 15B package | This candidate |
|---|---|---|
| New anatomy, geometry or textures | — | **none since Step 13** (assets byte-identical) |
| Bytes before the first 3D frame (excluding audio) | ~547 KB | **~547 KB** (545 → 547 KB over Step 16E) |
| App JavaScript + CSS | — | **1 076 KB** |
| Narration audio | 761 KB, 56 clips | **1 432 KB, 76 clips**, fetched a clip at a time after Start, never on the path to the first frame |
| Lesson length | 4 min 40 s | **6 min 21 s** |

Step 16G changed only how the narration element is timed; it added no bytes and no work per frame.

## 3. Decisions

- [ ] **PF1** Is the measured real-hardware behaviour acceptable for the intended audience? — **PENDING**
- [ ] **PF2** What real-device evidence is required before release, on which devices? — **PENDING**
- [ ] **PF3** Must the two emulated ×4 misses be fixed before release, or recorded as a known limitation and re-tested on
      real hardware? — **PENDING**
- [ ] **PF4** Are the targets themselves (2500 ms, 22 ms) the right ones? — **PENDING**
- [ ] **PF5** Is ~547 KB before the first frame, plus 1.4 MB of audio during 6 min 21 s of playback, acceptable for the
      intended networks? — **PENDING**

## 4. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Findings | |
| Decision | |
