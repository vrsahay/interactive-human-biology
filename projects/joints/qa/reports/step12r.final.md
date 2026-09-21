# Step 12R — performance remediation and Step-12 closure

Generated 2026-09-18. Machine: Lenovo 20V9, Intel Core i5-1135G7, Iris Xe (shared), 16 GB, Windows 11 Pro,
Chrome 152 headless, ANGLE D3D11. **Emulated phone/tablet profiles are development evidence, not certification.**

## Status

**FAIL** — two measured targets are not met on the emulated phone at CPU ×4, and no real Android or iPad hardware was
available, so the device-lab requirement is still open. Everything else in Step 12 passes.

## Root causes

**First frame.** The startup chain was serialised (bundle → joint manifest → body manifest → body meshes) and the first
body stage was the whole grouped skeleton. Now the HTML preloads both manifests, the baked environment and the two
first-stage meshes: every startup request begins at ~0.26 s and finishes by ~0.98 s on an emulated Fast 4G phone, the first
frame is a delivery-only proxy (2 body draw calls, 27,760 triangles, 219 KB brotli), and background preloads are deferred
until after the first frame. First meaningful 3D at CPU ×4 went 3252 ms → ~2100-2500 ms in the tracer.
Tested and rejected: `fetchPriority="low"` on the first-stage meshes (the emulated link is saturated either way; no
improvement, change not kept). Startup at DPR 1 instead of 1.5 also showed no improvement (2050 / 2678 ms vs 2133 / 2353 /
2543 ms — overlapping, with shader-compilation variance of 305-551 ms dominating).

**Drag.** The reported stalls were a harness fault, not the application. The Step-12 harness moved the pointer along a fixed
sine path, which drives the hinge into its 0° / 145° limits; for 53 % of the steps the pose did not change, the render loop
correctly rendered nothing, and those idle gaps were counted as frame intervals and as input latency (frame interval max
734 ms, raw latency p95 637 ms, 28.8 fps). A trace of the same window showed no main-thread task over 12 ms. The drag is now
closed-loop on a 25-120° target angle and records `unchangedStepFraction` (0) with every result.

**Explore.** Label occlusion raycasts ran on every frame while the camera moved (`getVertexPosition` 524 ms per 8 s at ×4).
Occlusion testing is now deferred while the camera moves and runs once it settles.

## Cold load, first meaningful 3D (5 fresh browsers per profile, round-robin, benchmark-gated)

| Profile | p50 | p95 | min | max | grouped intro ready (p50) |
|---|---|---|---|---|---|
| desktop broadband (real laptop, desktop viewport) | 655 | 677 | 600 | 677 | 1118 |
| integrated GPU broadband (real laptop) | 592 | 621 | 581 | 621 | 1060 |
| integrated GPU Fast 4G (real laptop) | 1426 | 1506 | 1404 | 1506 | 3280 |
| tablet ×2 Fast 4G (EMULATED) | 1594 | 1619 | 1569 | 1619 | 3300 |
| phone ×2 Fast 4G (EMULATED) | 1583 | 1585 | 1558 | 1585 | 3270 |
| phone ×4 Fast 4G (EMULATED) | **2742** | **3111** | 2558 | 3111 | 4600 |

All values in ms. 30 runs, 0 retries, 0 console errors. CPU benchmark 81-100 ms across the whole session (Step 12's 3.9 s vs
8.2 s inconsistency was uncontrolled machine drift; round-robin ordering, the benchmark gate and a per-run benchmark record
fixed the methodology).

## Interactions (30 s elbow drag, 30 s Explore orbit, 8 s recap playback)

| Profile | elbow ready after intent | drag fps | drag p50/p95 | drag latency raw p50/p95 | orbit fps | orbit p95 | recap fps |
|---|---|---|---|---|---|---|---|
| desktop broadband | 478 | 60 | 16.7 / 17.1 | 16.6 / 17.2 | 59.3 | 17.2 | 60 |
| integrated GPU broadband | 463 | 60 | 16.7 / 17.1 | 16.6 / 17.2 | 59.4 | 17.2 | 60 |
| integrated GPU Fast 4G | 1190 | 60 | 16.7 / 17.1 | 16.6 / 17.2 | 59.3 | 17.2 | 60 |
| tablet ×2 (EMULATED) | 1209 | 60 | 16.7 / 17.2 | 16.5 / 17.6 | 59.7 | 17.4 | 60 |
| phone ×2 (EMULATED) | 1214 | 60 | 16.7 / 17.2 | 16.6 / 17.6 | 59.7 | 17.4 | 60 |
| phone ×4 (EMULATED) | 1323 | **48.8** | 16.6 / **45.1** | 16.6 / **43.0** | **36.9** | **47.2** | **51** |

Effective latency equals raw latency on every profile, because the closed-loop drag changes the pose on every step and the
orbit moves the camera on every step. 0 console errors.

### Why ×4 misses the target

p50 is at vsync (16.6 ms) but p95 is 45 ms: about every twentieth frame takes three vsync intervals. Eliminated as causes:

- **not JS work volume** — hiding the whole dimmed body (30 fewer draw calls, 180k fewer triangles), hiding the overlays and
  hiding the UI panel all measured inside the ±6 fps run-to-run spread of this machine;
- **not pixels** — DPR 1.5 / 1.25 / 1.0 measured 44.8-47.9 / 46.2-47.9 / 45.7-47.4 fps over three runs each;
- **not the CPU-throttle emulation by itself** — a style-only control page holds 60 fps at ×4, and a WebGL control page with
  68 draw calls at the same canvas size (618×1372) also holds 60 fps at ×4 (p95 21.4 ms);
- **not one long task** — the tracer finds 1-2 frames over 30 ms per 8-10 s window, and inside them the time sits in a
  blocking GL call (`uniformMatrix4fv` 27 ms): the main thread waiting on the driver, not running our code.

Per-frame cost of the drag path, same build, same pointer path: render CPU p50 0.7 ms (×1), 2.3 ms (×2), 3.8 ms (×4).

## Payload and startup work

| | value |
|---|---|
| first frame (every tier) | 3 draw calls, 35,289 triangles; body part = 2 draws, 27,760 triangles |
| first-stage body bytes | 253 KB raw / 219 KB brotli (`body.intro.glb` + `body.skin_intro.glb`) |
| bytes before first 3D (total, incl. bundle) | 544,896 |
| final body bytes per tier (raw) | high 2000 KB, medium 1845 KB, low 1768 KB, plus a 37 KB material library shipped once |
| final full-body draw calls / triangles | 63 draws, 168,414 triangles (high, medium), 159,084 (low) |
| critical JS | 891,135 raw / 192,297 brotli (three.js core is 424 KB of the raw total) |
| non-critical JS (lazy) | 85,066 raw / 11,904 brotli — sandbox Shell, QA hooks, film QA hooks, runtime RoomEnvironment, full manifest-schema validator; none fetched before the first frame |
| CSS | 22,904 raw / 5,101 brotli |
| module evaluation at ×4 | 129-269 ms |
| shader initialisation at ×4 | 305-551 ms (`compileAsync`, parallel shader compile) |
| texture startup | baked environment 60 KB transfer, 28 ms decode; material library parse 142 ms; 0 ms image decode (no runtime PMREM, no post effects) |
| pixel-ratio caps | high 2, medium 1.5, low 1 (URL `?quality` > saved setting > auto) |

## Visual A/B (Phase V)

Canvas-only comparison against the Step-11 build, 13 shots covering intro, full-body, fixed, pivot, shoulder, hip, elbow
source/bones/flexion/support, knee and both recap shots:

- high tier 52.0-58.4 dB PSNR, ≤0.015 % of pixels differing by more than 16, max channel difference ≤56;
- medium 44.9-58.4 dB, low 44.2-58.4 dB (≤0.25 % of pixels) — the lower figures are the full-body shots, where the intended
  LOD1 skin is used.

The measurement itself was corrected in Step 12R: the canvas fills the window, so an element screenshot also captures the DOM
overlay, and Step 12's contrast scrims, 44 px timeline row and settings button do not exist in the Step-11 baseline. Whole-frame
numbers (26-30 dB) are dominated by that chrome; `visual_compare.mjs` now reports the render region and a canvas-only mode.

Proxy intro frame vs the final grouped representation at the same shot: 30.0 dB in the body region (a flatter merged
stand-in, no textures). It is used only for plain full-body shots, and is replaced at the cut into `intro.map`; no shot that
needs highlighting, hiding, dimming or the joint can render with it (the body layer refuses, and `shotAssetNeeds` requires
the grouped stage).

## Accessibility (Phase W)

- axe (wcag2a/2aa/21a/21aa/22aa + best-practice): **0 violations** in 12 scopes — intro, settings dialog, sources dialog,
  interactive elbow, quiz and Explore, at desktop and mobile. Remaining `color-contrast` items are *incomplete*, not
  violations: axe cannot read text over a WebGL canvas.
- measured contrast over the rendered scene: 196 text rows, **0 failures**, tightest 5.25 : 1 against 4.5 : 1 required.
- keyboard only: the whole lesson completes with visible focus, no traps, completion announced; dialogs trap Tab, Escape
  closes, focus returns to the opener.
- target size ≥ 44 px, reflow at 320 px with no overflow, caption text 17-18.6 px.
- reduced motion: every shot cuts on entry, no dolly during playback, static indicators, stepped poses, 0 s caption
  transitions; the learner setting overrides the system preference.
- quiz prompt: exactly **1** DOM occurrence and **1** accessibility-tree occurrence at 1280×800, 768×1024, 390×844 and
  320×640. Root cause: the shot's prompt key is the same string as the caption text, so the caption and the interaction panel
  both rendered it. The panel now renders its own prompt only when it differs, and is otherwise labelled by the caption.
- **NVDA / VoiceOver: NOT AVAILABLE.** No real screen-reader pass was performed.

## Regression

- `npm run typecheck` (tsc, app + tests): clean.
- Vitest: 88 tests, 9 files, all passing.
- Playwright: **43 tests in 9 files, all passing** — Step-10 sandbox, film, film visual QA, gate checks, Step-12 delivery and
  tiers, accessibility, reduced motion, responsive visual regression at five viewports.
- Console errors: 0 in every lab profile and every e2e suite. One `setPointerCapture` page error surfaced by the synthetic
  drag was fixed in `InteractionController` (it can also happen when a real pointer is released between dispatch and handler)
  and the whole lab was re-run on the fixed build.

## Integrity

- `Human_Body_Master.blend` SHA-256 `f7313dabbf27d990ce1d7d3f771ebf1f914ffc5fb1162a7f71339bd3e6dc7fb0` — **unchanged**.
- All 9 files pinned in `step11.baseline_sha256.txt` (`Joints_Working.blend`, v001-v004, `elbow_r.core/detail/context.glb`,
  `joint-manifest.json`) — **byte-identical**.
- Step-11 body files (`body.skeleton.glb`, `body.skin.glb`, `body-manifest.json`) — byte-identical to the Step-11 build.
- Promoted body assets verify against their manifests: v2 6/6 files, v3 8/8 files (SHA-256 and byte length).

## Unresolved

1. **Phone ×4 emulated first meaningful 3D p50 2742 ms** against a 2500 ms target.
2. **Phone ×4 emulated interaction p95 45 ms** against a 22 ms target (48.8 fps drag, 36.9 fps orbit, 51 fps recap).
   Workload-independent on this hardware; needs a real device to characterise.
3. **Real device certification: NOT AVAILABLE** — no mid-range Android phone, no iPad. Emulation is development evidence only.
4. **Screen-reader pass: NOT AVAILABLE** — no NVDA or VoiceOver.
5. Carried forward from earlier steps: FORMAL GATE 3 NOT AVAILABLE; the 145° range is APPROXIMATE / PENDING CITED REFERENCE;
   ASSET LICENCE PENDING; only one sentence is source-backed, everything else is draft enrichment pending expert review.
