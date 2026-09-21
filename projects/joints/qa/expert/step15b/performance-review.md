# Performance review — reviewer sheet for `step15b-learner-clarity-complete`

This sheet records measurements. **It makes no release recommendation and none may be read into it.** Every decision is
PENDING.

---

## 1. What the measurements are, and what they are not

All measurements were taken on one machine: **Lenovo 20V9, Intel Core i5-1135G7, Iris Xe integrated GPU, 16 GB,
Windows 11 Pro**, Google Chrome 152.0.7977.83 headless with the real GPU (ANGLE D3D11).

| Profile | Classification |
|---|---|
| desktop broadband | **REAL HARDWARE** (this laptop at a desktop viewport; no separate desktop GPU was available) |
| integrated GPU broadband | **REAL HARDWARE** |
| integrated GPU Fast 4G | **REAL HARDWARE**, network emulated |
| tablet ×2 | **EMULATED — NOT CERTIFICATION** (CPU throttled ×2, laptop GPU) |
| phone ×2 | **EMULATED — NOT CERTIFICATION** (CPU ×2, laptop GPU) |
| phone ×4 | **EMULATED — NOT CERTIFICATION** (CPU ×4, laptop GPU) |

**No real Android phone and no real iPad has ever been measured.** A CPU-throttled desktop browser is not a phone: it has
a desktop GPU, desktop memory bandwidth, desktop thermals and a desktop driver. Nothing here is a mobile certification
and none may be issued from it.

---

## 2. Step-12 results, carried forward unchanged

From `qa/reports/step12r.perf.final.json` and `qa/reports/step12r.final.md`, 5 cold-load runs per profile, round-robin,
CPU-benchmark gated.

| Profile | elbow ready after intent (ms) | drag fps | drag p50/p95 (ms) | orbit fps | orbit p95 (ms) | recap fps |
|---|---|---|---|---|---|---|
| desktop broadband | 478 | 60 | 16.7 / 17.1 | 59.3 | 17.2 | 60 |
| integrated GPU broadband | 463 | 60 | 16.7 / 17.1 | 59.4 | 17.2 | 60 |
| integrated GPU Fast 4G | 1190 | 60 | 16.7 / 17.1 | 59.3 | 17.2 | 60 |
| tablet ×2 (EMULATED) | 1209 | 60 | 16.7 / 17.2 | 59.7 | 17.4 | 60 |
| phone ×2 (EMULATED) | 1214 | 60 | 16.7 / 17.2 | 59.7 | 17.4 | 60 |
| **phone ×4 (EMULATED)** | 1323 | **48.8** | 16.6 / **45.1** | **36.9** | **47.2** | **51** |

### The two open misses, unchanged

| Target | Measured (emulated phone ×4) | Status |
|---|---|---|
| First meaningful 3D ≤ **2500 ms** | **2742 ms p50** (n=5; p95 3111 ms; min 2558 ms) | **MISS — open** |
| Interaction p95 ≤ **22 ms** | **45.1 ms** drag p95 | **MISS — open** |

Recorded in Step 12R: the frame loss at ×4 is **workload-independent**. Draw calls, triangle count, overlays, UI and
device pixel ratio all moved the result by less than the ±6 fps noise floor, and a plain WebGL control at the same canvas
size also held 60 fps at ×4 in the same harness. The cause was not isolated. It was recorded as measured and not
"optimised away".

**Step 12 remains FAIL.** Step 14B did not change that and did not attempt to.

---

## 3. Step-14B A/B: did the new lesson cost anything?

The lesson gained 17 shots, a ninth chapter, a retrieval challenge and 16 narration clips. To find out whether any of it
cost performance, the **Step-14 build was rebuilt from its tag** and the two builds were run **alternately** on the
reference profile, because this machine's CPU benchmark drifts between sessions (82 ms at Step 12R, 340 ms at its
worst today) and a single-build comparison across sessions is meaningless.

Profile: `igpu-broadband` — 1280×800, DPR 1, no CPU throttle, 50 Mbps / 10 Mbps / 20 ms emulated network, real GPU.

| Pass | Build | CPU bench (ms) | First 3D (ms) | Intro complete (ms) | Bytes before first 3D | Elbow drag | Free orbit | Recap playback |
|---|---|---|---|---|---|---|---|---|
| 1 | Step 14 | 131 | 766 | 1297 | 543 KB | 49.1 fps / p95 31.1 ms | 54.2 fps | 59.8 fps |
| 1 | **Step 14B** | 121 | 750 | 1305 | 547 KB | 59.9 fps / p95 18.2 ms | 50.6 fps | 59.9 fps |
| 2 | Step 14 | 151 | 733 | 1255 | 564 KB | 60.0 fps / p95 18.3 ms | 48.8 fps | 60.0 fps |
| 2 | **Step 14B** | 97 | 639 | 1176 | 547 KB | 60.0 fps / p95 17.7 ms | 51.0 fps | 60.0 fps |

**No measurable difference.** Every gap tracks the CPU benchmark rather than the build. The one outlier — Step 14's
49 fps drag in pass 1 — is on the noisiest pass and does not reproduce.

**Bytes before the first 3D frame are unchanged at ~547 KB.** Steps 14 and 14B added **no geometry, no textures and no
asset of any kind**. The 732 KB of narration audio is fetched per clip after the film has started and is not on the
critical path.

Reports: `qa/reports/step12r.perf.b.step14.{1,2}.json`, `qa/reports/step12r.perf.b.step14b.{1,2}.json`.

## 4. The cost of the new interaction itself

The Explore system moves whole render groups per frame. Measured on the reference profile, 12 s of continuous drag per
joint, same instrumentation as the perf lab (`qa/reports/step14.perf.explore.json`):

| Exploration | Status | Render groups moved | fps | Input latency p50 / p95 |
|---|---|---|---|---|
| Fixed (skull suture) | teaching simulation | 1 | 60.0 | 16.6 / 17.2 ms |
| Pivot (head on C1/C2) | teaching simulation | 3 | 60.0 | 16.6 / 17.3 ms |
| Ball-and-socket (shoulder) | teaching simulation | 4 | 60.0 | 16.6 / 17.3 ms |
| Hinge (elbow) | **validated rig** | 0 | 59.2 | 16.6 / 21.0 ms |

All four are inside the 22 ms interaction target **on real hardware at the reference profile**. Moving four render groups
costs nothing measurable against driving the validated rig: it is one matrix per group per frame on nodes that already
have `matrixAutoUpdate = false`.

An earlier version of that probe reported a reproducible 683 ms frame. It was a harness artifact — the angle timeline
shows the joint pinned at exactly 0.00° for 666 ms while the probe walked an overshot pointer back, so nothing changed
and the render-on-demand renderer correctly drew nothing. A parallel rAF-based probe recorded no frame gap above 60 ms
anywhere in the same drag. Recorded here so it is not rediscovered as a product defect.

---

## 4b. Step 15B: did the clarity pass cost anything?

Same method again, against the `step14b-complete` build rebuilt from its tag, alternating on the reference profile.

| Pass | Build | CPU bench (ms) | First 3D (ms) | Intro (ms) | Bytes before first 3D | Elbow drag |
|---|---|---|---|---|---|---|
| 1 | Step 14B | 358 | 2000 | 2942 | 567 KB | 59.8 fps / p95 18.3 ms |
| 1 | Step 15B | 125 | 712 | 1255 | 568 KB | 60.0 fps / p95 18.2 ms |
| 2 | Step 14B | **81** | 532 | 967 | 548 KB | 60.0 fps / p95 17.1 ms |
| 2 | Step 15B | **81** | 522 | 972 | 548 KB | 60.0 fps / p95 17.1 ms |

Pass 2 is the comparable one, both at a CPU benchmark of 81 ms: **no measurable difference.** Step 15B added no asset;
the lesson gained one shot (6.0 s) and trimmed another (0.9 s), and narration is 761 KB across 56 clips.

## 5. What a reviewer must decide

- [ ] **PF1** Is the measured **real-hardware** behaviour acceptable for the intended audience and delivery context? — **PENDING**
- [ ] **PF2** What **real-device evidence** is required before release, and on which devices? (Nothing has been measured
      on any real phone or tablet.) — **PENDING**
- [ ] **PF3** Must the two emulated phone ×4 misses be **fixed** before release, or **recorded as a known limitation**
      and re-tested on real hardware? — **PENDING**
- [ ] **PF4** Are the performance targets themselves (2500 ms first 3D, 22 ms interaction p95) the right targets for the
      intended audience? — **PENDING**
- [ ] **PF5** Is a ~547 KB download before the first 3D frame, plus 732 KB of audio during playback, acceptable for the
      intended network conditions? — **PENDING**

---

## 6. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Findings | |
| Decision | |
