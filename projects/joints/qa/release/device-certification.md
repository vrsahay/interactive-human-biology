# Device certification plan

**Status: PENDING — no device certification exists.** No real Android phone and no iPad were available at any point in this
project. Everything measured so far on phone and tablet profiles is **emulation on a development laptop** and is
development evidence only (see `qa/devices.md`).

**EMULATION = DEVELOPMENT EVIDENCE. REAL DEVICE = CERTIFICATION EVIDENCE.**

Nothing in this plan may be marked complete from an emulated run. The laptop result must not be extrapolated to phones:
"mobile optimized" may not be claimed until the runs below exist.

## What is already known, and what it does not prove

| Profile | First meaningful 3D (p50 / p95) | Drag | Explore orbit | What it proves |
|---|---|---|---|---|
| Real laptop, integrated GPU, broadband (headless) | 592 / 621 ms | 60 fps, p95 17.1 ms | 59.4 fps, p95 17.2 ms | The applicable laptop target is met on broadband |
| Real laptop, integrated GPU, emulated Fast 4G | 1426 / 1506 ms | 60 fps, p95 17.1 ms | 59.3 fps, p95 17.2 ms | Network-limited startup on a real GPU |
| EMULATED tablet (CPU ×2) | 1594 / 1619 ms | 60 fps, p95 17.2 ms | 59.7 fps, p95 17.4 ms | Nothing about an iPad |
| EMULATED phone (CPU ×2) | 1583 / 1585 ms | 60 fps, p95 17.2 ms | 59.7 fps, p95 17.4 ms | Nothing about a phone |
| EMULATED phone (CPU ×4) | **2742 / 3111 ms** (target 2500 ms — **missed**) | **48.8 fps, p95 45.1 ms** (target p95 22 ms — **missed**) | 36.9 fps, p95 47.2 ms | Nothing about a phone |

Source: `qa/reports/step12r.perf.final.json`. The two misses are Step-12 unresolved items 1 and 2 and remain open.

## Required measurements — ANDROID

Device: one **mid-range Android phone, 2022 or newer** (e.g. Snapdragon 6-series / Dimensity 700-class, 4–6 GB RAM). Record
the exact model, Android version, Chrome version, screen size and device pixel ratio.

| Setting | Value |
|---|---|
| Browser | Chrome for Android, current stable |
| Network | Fast 4G (9 Mbps down / 1.5 Mbps up / 165 ms), applied at the router or via a throttling proxy — not CDP |
| Build | The promoted production build served over HTTPS from a production-like host |
| Runs | **5 fresh cold loads**: clear site data and close the browser between runs; the GPU shader cache must start empty |
| Report | p50, p95, min, max for every metric below |

1. **Cold load → first meaningful 3D** — the first frame showing the anatomy (mark `lab:first-3d` / `__perfLab.first3dAt`).
2. **Cold load → intro complete** — grouped body representation ready (`joints:stage-ready:groups`).
3. **Bytes transferred before first 3D**, and the quality tier chosen by `selectQualityTier` (record the device signals it saw).
4. **30 s elbow drag** in `hinge.try`: frame interval p50/p95, fps, raw and effective input latency p50/p95, dropped frames.
   The drag must be closed-loop on a 25–120° target angle so the hinge never parks at a limit (see `qa/reports/step12r.profile.json`).
5. **30 s Explore orbit** in `hinge.flexion`: the same frame and latency statistics.
6. **Recap playback** (`recap.pullback` → 8 s): fps and frame interval p95.
7. **Elbow readiness after learner intent**: focus/tap the hinge chapter marker → `joints:joint-ready`.
8. **Memory**: peak JS heap and GPU texture memory (`__jointsQA.perf()`), plus a note on any tab reload/crash.
9. **Thermal and battery note** (practical, not a benchmark): run 4–6 → note whether frame rate degrades over a 10-minute
   session and whether the device becomes hot. A real phone throttles thermally; emulation never does.
10. **Console errors** must be zero.

## Required measurements — IPAD

Device: one **iPad** (record the exact model, iPadOS version and Safari version).

| Setting | Value |
|---|---|
| Browser | Safari (WebKit), current stable — note that Safari's WebGL and memory limits differ from Chrome's |
| Network | The same Fast 4G profile, applied externally |
| Runs | **5 fresh cold loads**, site data cleared between runs |
| Report | p50, p95, min, max |

Measure items 1–10 exactly as for Android, plus:

11. **WebGL context behaviour**: confirm the baked environment (`.rgbe` HalfFloat CubeUV) decodes, and record whether Safari
    reduces texture precision or drops the context under memory pressure.
12. **Touch targets and safe areas**: confirm 44 px targets and that the player is not obscured by the home indicator.

## Acceptance thresholds for certification

| Metric | Target |
|---|---|
| First meaningful 3D, mid-range Android, Fast 4G | ≤ 2500 ms p50 |
| First meaningful 3D, iPad, Fast 4G | ≤ 2500 ms p50 |
| Drag and Explore frame interval | ≤ 22 ms p95, ≥ 45 fps |
| Input latency (raw and effective) | ≤ 80 ms p95 |
| Console errors | 0 |
| Thermal | no sustained frame-rate collapse over a 10-minute session |

A profile is certified only when all five cold runs and both interaction runs exist for that physical device. Partial or
emulated evidence is recorded as development evidence and leaves the row PENDING.

## Reporting

Write results to `qa/reports/step13.device.android.json` and `qa/reports/step13.device.ipad.json`, add the device rows to
`qa/devices.md` (replacing the NOT AVAILABLE rows), and update `docs/adr/step13-release-readiness.md`.
