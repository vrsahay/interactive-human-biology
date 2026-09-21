# Device lab — Step 12 / Step 12R

**EMULATION = DEVELOPMENT EVIDENCE. REAL DEVICE = CERTIFICATION EVIDENCE.**

Status: **no device certification.** The only real hardware used for measurement is the development laptop below, and even
that runs a headless browser. Every phone and tablet row is **EMULATED — NOT CERTIFICATION**: Chrome CPU throttling plus
DevTools network profiles, rendered by the laptop's integrated GPU. Emulated numbers are used to find and verify
regressions during development. They certify nothing about a real phone or tablet.

The approved matrix still requires real measurements on one mid-range Android phone, one iPad and one integrated-GPU laptop
in a real (headed) browser. **Android: NOT AVAILABLE. iPad: NOT AVAILABLE.**

Harness: `tests/perf/perf-lab-r.spec.ts` + `playwright.perf.config.ts` (Step 12R methodology v2; the Step 12 harness
`tests/perf/perf-lab.spec.ts` is kept for comparison). Builds are served by `pipeline/tools/serve_static.mjs`, which does
brotli/gzip for JS, JSON, GLB and the baked environment, `immutable` caching for hashed bundles and ETag revalidation for
assets. Every cold run uses a fresh browser process, so both the HTTP cache and the GPU shader cache start empty.

Reports: `qa/reports/step12r.perf.final.json` (5 cold loads per profile, 30 s elbow drag, 30 s Explore orbit, recap
playback), `qa/reports/step12r.profile.json` (root causes and the control experiments),
`qa/reports/step12r.bundle_composition.json`, and, for the Step 12 baseline, `qa/reports/step12.perf.after.json`.

## Matrix

| Device class | Exact device / model | OS | Browser | Viewport (CSS px @ DPR) | Network profile | Quality tier (auto) | Classification |
|---|---|---|---|---|---|---|---|
| Integrated-GPU laptop (desktop viewport) | Lenovo 20V9 — Intel Core i5-1135G7 (4C/8T), Intel Iris Xe (driver 31.0.101.1999), 16 GB | Windows 11 Pro | Google Chrome 152.0.7977.83, **headless**, ANGLE D3D11 | 1440×900 @1 | broadband-50mbps (50 / 10 Mbps, 20 ms), emulated | high | REAL HARDWARE — DEVELOPMENT EVIDENCE (headless browser; network emulated; no discrete-GPU desktop available) |
| Integrated-GPU laptop | same | same | same | 1280×800 @1 | broadband-50mbps, emulated | high | REAL HARDWARE — DEVELOPMENT EVIDENCE (headless; network emulated) |
| Integrated-GPU laptop on a mobile network | same | same | same | 1280×800 @1 | Chrome DevTools Fast 4G (9 × 0.9 Mbps down, 1.5 × 0.9 up, 165 ms), emulated | high | REAL HARDWARE — DEVELOPMENT EVIDENCE (headless; network emulated) |
| Tablet | **NOT AVAILABLE** — iPad-class emulation on the laptop | — | Chrome 152 headless, touch + coarse pointer, deviceMemory hidden | 768×1024 @2 | Fast 4G, emulated | medium | EMULATED — NOT CERTIFICATION (CPU ×2) |
| Mid-range phone | **NOT AVAILABLE** — Android-class emulation on the laptop | — | Chrome 152 headless, touch + coarse pointer, deviceMemory 4, 8 cores | 412×915 @2.625 | Fast 4G, emulated | medium | EMULATED — NOT CERTIFICATION (CPU ×2, uncalibrated) |
| Mid-range phone (harsher) | **NOT AVAILABLE** — Android-class emulation on the laptop | — | same | 412×915 @2.625 | Fast 4G, emulated | medium | EMULATED — NOT CERTIFICATION (CPU ×4, Lighthouse convention; harsher than a 2022 mid-range phone) |
| Mid-range Android phone | **NOT MEASURED — NOT AVAILABLE** | — | — | — | — | — | required for certification |
| iPad | **NOT MEASURED — NOT AVAILABLE** | — | — | — | — | — | required for certification |

## Emulation caveats

- CPU throttling slows only the renderer's main thread. GPU work runs on the laptop's Iris Xe, so fill-rate, driver cost and
  GPU memory behaviour are not those of a phone or tablet GPU. A real phone is also thermally limited; emulation is not.
- The browser is headless, so presentation latency and compositor behaviour differ from a visible window.
- Both raw and effective input latency are reported. Raw = event timestamp → end of the next rendered frame. Effective =
  event timestamp → end of the first rendered frame whose pose (drag) or camera (orbit) actually differs. Display scan-out is
  not included (it adds up to one vsync).
- Step 12R fixed a harness fault that inflated drag latency: the old fixed pointer path pushed the hinge into its 0° / 145°
  limits, where the pose stops changing and the render loop correctly renders nothing. Those idle gaps were counted as frame
  intervals and as latency (frame interval max 734 ms, raw latency p95 637 ms). The drag is now closed-loop on a 25–120°
  target angle and records `unchangedStepFraction` (0) with every result. See `qa/reports/step12r.profile.json`.
- Machine drift is controlled, not eliminated: profiles run round-robin (run 1 of every profile, then run 2 …), every run is
  gated on a CPU benchmark returning within 35 % of the fastest benchmark seen, and the benchmark value is stored with each
  run. Repeat measurements of the same interaction on this machine still spread by about ±6 fps at CPU ×4.
- At CPU ×4 the emulated phone loses roughly every twentieth frame regardless of application work: removing 30 draw calls and
  180k triangles, removing the overlays, removing the UI panel and lowering the pixel ratio all measured inside the
  run-to-run spread, while control pages (style-only, and WebGL with 68 draw calls at the same canvas size) hold 60 fps at
  ×4. The ×4 interaction figures are reported as measured, and the p95 ≤ 22 ms target is **not met** on that profile.
