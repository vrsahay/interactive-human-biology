# QA report: Excretion in Plants (Class 10), V2 → V2.4

> **Where the evidence lives (repository cleanup, 2026-09-23).** Paths below to intermediate builds (`releases/v2` … `releases/v2.3`, the `v2.4-rc*` folders) and to bulk QA captures (`docs/qa/captures/**`, the full deep-audit render sets, the watch frame series) refer to development artefacts that are kept **locally only**, in the git-ignored `local-archive/`, and are not part of the public repository. The shipped release is `releases/v2.4/site`; a representative evidence set remains under `docs/qa/`. See [repo-cleanup-final.md](repo-cleanup-final.md).

## V2.4.2 Explore label / anchor audit (2026-09-23)

Scope: Explore labels only (`docs/explore-label-audit.md`). Guided mode, narration, audio, timing, captions and chapters untouched. Build: `releases/v2.4/site` (the previous candidate is kept as `releases/v2.4-rc3`).

| Check | Result | Evidence |
|---|---|---|
| Audit | **DONE** | 10 Explore models, 53 selectable structures, 7 views each = 371 checks. Before: 181/371 on the named structure; 25 structures wrong already in the default view (bark, phloem, xylem, old xylem → the stem centre; cell wall and chloroplasts → the membrane; root hair → a soil grain; water in the soil → a grain; the pore → the epidermis, …). |
| Root cause | **SYSTEMIC** | The label anchored to the part node, so `FilmLabels` used its **bounding-box centre** — for a ring or shell that is the hollow middle. One bug, many labels. |
| Fix | `web/src/lessons/SurfaceAnchor.js` (new) | The Explore label targets a visible point ON the structure: keep it while visible → the tapped point → a 17×17 scan of its on-screen area → (only when it is just behind the surface, like the pore in its slit) the least-buried point; otherwise the label hides instead of pointing at the wrong tissue. `ExploreController` passes the tapped point; Explore's Root model uses the existing wider `rootFar` framing so the root tip is in view. |
| After | **PASS** | 368/371 on the named structure; 0 wrong endpoints; the other 3 are views where the structure itself is out of frame and the label hides. Highlight = label target in every case; all 53 descriptions match. |
| Models / GLBs | **UNCHANGED** | No Blender change; all 12 GLBs byte-identical (`cmp`). Only `explore-data.js` (one preset) and the two runtime files changed. |
| Narration / audio / timing | **UNCHANGED** | All 111 MP3s and `narration.json` identical; the shot-timing hash is identical (`1150649912`); the freeze matches. |
| Regression | **PASS** | QA suite (content, NCERT, secrets); self-test 1,339 checks, 0 errors, 75/75 clipped; 150/150 sweep points; Explore 10/10; tasks 4/4; recall 8/8 + open prompt; audio 18/18 (161 samples, 0 over 0.45 s, 0 rewinds); production self-test 0 errors, stem labels correct. |
| Guided labels | **UNCHANGED** | Same label visibility across all 75 shots as the previous build; the three transient hidden ones are pre-existing off-frame moments (anchor above the top edge), not caused by the fix. |

Evidence: `docs/qa/explore-label-audit/<model>/` (125 captures; all 7 views for every stem and xylem structure).

---

## V2.4.1 root hairs + soil + water refinement (2026-09-22)

Scope: a visual refinement of the root-hair scene only. Build: `releases/v2.4/site`. The previous candidate is kept as `releases/v2.4-rc2`.

| Check | Result | Evidence |
|---|---|---|
| Change | Done | **Blender** (`build_v2_root_hairs.py`, checkpoint **v049**):
- The hairs are thinner (radius 0.028 → 0.017) and slightly irregular. Each swells out of its own epidermal cell, and edge hairs lean back into the soil.
- Grains are packed all along every hair (30 → 35 hair contacts; 62 → 92 grains).
- The soil water is static moisture: small water bridges where grains touch each other and the hairs (no per-grain shells or blobs).

**Runtime** (`processes/roots.js`, `HairFlow` water mode): only a few teaching drops, and they start in the water beside the labelled hair. They then go down the hair, into its cell and inward along the existing path. |
| Models | **PASS** | Only `15_root_hairs.glb` re-exported (50,544 tris, within its 60,000 budget; contract OK). The other 11 GLBs are byte-identical. |
| Narration / audio / timing | **UNCHANGED** | sha256: all 111 MP3s, `narration.json`, lesson data, film and narration code, and the pipeline are identical. The shot-timing hash is identical to RC2 (`1150649912`, total 570,800 ms). The freeze matches. |
| Regression | **PASS** | QA suite: content, NCERT and secrets. Self-test: 1,339 checks, 0 errors, 75/75 clipped. 75 shots swept at 30% and 80%. Explore 10/10, tasks 4/4, recall 8/8 plus the open prompt. Audio 18/18: 160 samples, 0 over 0.45 s, at most 1 voice, 0 rewinds. Production self-test: 0 errors. |
| RC2 full watch (the timing fix) | **PASS** | Real time, 75/75 shots: 398 sync samples, **0** out of step (RC1: 3), at most 1 voice, 0 errors. |

Evidence: `docs/qa/deep-audit/v241/` (Blender front, side, top, oblique and close-ups; runtime `v241_4…8`).

---

## V2.4 biological-accuracy correction pass (2026-09-22)

Scope: DA-01 … DA-23 of `deep-biological-audit.md`, plus DA-24 and DA-25 found during the pass. Visual corrections only: same script, no redesign. Build: `releases/v2.4/site`.

| Check | Result | Evidence |
|---|---|---|
| Findings | **PASS** | P1: 2/2 fixed. P2: 9/9 fixed, plus 2 new (DA-24, DA-25) fixed. P3: 6 fixed, 6 kept, 1 not applicable (reasons in `deep-biological-audit.md` § V2.4 outcome). No P0 or P1 open (`must-fix-before-release.md`). |
| Blender | **PASS** | New checkpoints v043 (DA-01), v044 (DA-06/07), v045 (DA-05), v046 (DA-09), v047 (DA-10) and v048 (DA-12/19; the export state). Each has full validation with 0 issues. A new validation check confirms the guard-cell chloroplasts stay inside their cells at 5 opening states. |
| Models | **PASS** | Re-exported: `01_plant`, `03_stoma`, `05_leaf_internal`, `14_root`. The other 8 are **byte-identical** to V2.3 (sha256). `assets:inspect` 12/12 contracts OK; the stoma morph contract now includes both chloroplast meshes. Total 2,032 KB; core 252 KB. |
| Content | **PASS** | Spoken `1bd750e41e0b…` and surface `7c4d6ad18018…` both **match** the freeze, so no narration, caption, label-text, recall or chapter change and no TTS. NCERT audit 292 lines, 0 R, 0 X; content QA 0 errors; secrets QA 185 files, no key. |
| Runtime (dev and production) | **PASS** | Self-test 1,339 checks, 0 errors, 75/75 clipped (9:31). All 75 shots swept at 30% and 80%: right shot and stage, finite camera, 0 runtime errors. 10/10 Explore models with all parts. 4/4 tasks completed through their controls, including the wrong answer and the stoma slider driving all 5 morphs. 8/8 recall questions, then the open prompt. |
| Audio sync | **PASS** | 18/18 in dev and 18/18 in production. Covers start, restart, fast scrubbing, chapter jump, pause/resume, Explore in/out, and task completion → confirmation → next. 158 samples, 0 over 0.45 s, at most 1 voice, 0 rewinds. |
| Seek / scrub | **PASS** | Picture-in-picture windows snap on seek (DA-22): whole.answer → night.reason gives 0/0. |
| Mobile | **PASS** | 375 × 812: water vapour, stoma lanes, xylem channel, leaf waste and the leaf-section stoma are all on screen (`v24_mobile_*`). |
| Production | **PASS** | `releases/v2.4/site` served and self-tested (as above); DOM ready 304 ms. Load times were not re-measured on a clean machine. |
| Bug found in regression | **FIXED** | `world.js`: a task completion that arrives after its panel has closed no longer throws (`if (it && …)`). This is a latent V2.3 issue, reachable only by input on a stale panel. |

Evidence:
- `docs/qa/deep-audit/v24/blender/`: final models, several angles, stoma at three states;
- `docs/qa/deep-audit/v24/runtime/`: `v24final_01…13` cover the 12 required areas, plus mobile, Explore and recall.

---

## V2.3 fixes for the V2.2 re-check (2026-09-22)

Scope: S1–S7 of “V2.2 student re-check” (`v2-self-review.md`), all screen-only. Build: `releases/v2.3/site`.

| Check | Result | Evidence |
|---|---|---|
| Fixes S1–S7 | **FIXED + TESTED** | `v2-self-review.md` § V2.3 outcome. Captures: `docs/qa/captures/v23_*` (desktop and phone). |
| Models | **PASS** | Only `10_stem_cross_section.glb` re-exported (Blender v040 build, v041 validate, v042 optimise and export); the other 11 are byte-identical to V2.2. `assets:inspect` 12/12 OK. |
| Content | **PASS** | Spoken text unchanged (freeze `1bd750e4…`); labels changed, so surface re-frozen (`7c4d6ad1…`). NCERT audit 292 lines, 0 R, 0 X; content QA 0 errors. No TTS needed (0 clips). |
| Automated suite | **PASS** | `npm run qa`, freeze check, build; no key in any file. |
| Runtime | **PASS** | Self-test 1,339 checks, 0 errors, 75/75 clipped. 75/75 shots swept. 10/10 Explore models. 4/4 tasks. 8/8 recall questions, then the open prompt. No runtime errors. |
| Audio sync | **PASS** | 18/18; 124 samples, 0 over 0.45 s, at most 1 voice, 0 rewinds. |
| Production | **PASS** | `releases/v2.3/site` served and self-tested: 0 errors. Load times on this (busy) machine were 0.94–1.85 s to first render and 2.5–4.0 s for all models, against 0.5–0.7 s in earlier runs with the same file sizes. The difference is machine load, not the build; measure again on a clean machine for release sign-off. |

---


## V2.2 final correction pass (2026-09-22)

Scope: the nine items of the “V2.1 student re-check” (`v2-self-review.md`), making what is heard, seen and understood agree. No new chapters, features, biology or assets. Build: `releases/v2.2/site`.

| Check | Result | Evidence |
|---|---|---|
| Fixes R1–R9 | **FIXED + TESTED** | Details and outcomes: `v2-self-review.md` § V2.2 outcome. Captures: `docs/qa/captures/v22_*` (desktop and phone). |
| Models | **Unchanged** | All 12 GLBs byte-identical to V2.1 (`cmp`). No Blender change was needed, so no new checkpoint (v039 remains the export state). |
| Narration | **PASS** | Only `vacuole.pivot` changed. NCERT audit (292 lines, 0 R, 0 X) → freeze (spoken `1bd750e4…`) → 1 clip synthesised with `en-IN-Chirp3-HD-Aoede` via the environment → 110 kept. |
| Automated suite | **PASS** | `npm run qa` (assets 12/12, content, audit, secrets over 182 files); freeze check matches; build OK; no key in any file. |
| Runtime | **PASS** | Self-test 1,339 checks, 0 errors, 75/75 clipped, 9:30. All 75 shots swept at 30 % and 80 % (no errors, correct stage; `vacuole.back` goes cell → leaf). 10/10 Explore models. 4/4 tasks complete, with the wrong answer handled. 8/8 recall questions, then the open prompt. |
| Audio sync | **PASS** | 18/18 (start, restart, scrub, chapter jump, pause/resume, Explore, task → confirmation → next): 154 samples, 0 over 0.45 s, at most 1 voice, 0 rewinds. The new clip and the mid-shot scale change are both in sync. |
| Mobile | **PASS** | 375 × 812: soil label, CO₂/water labels, vapour, old xylem and the leaf transition are all on screen. |
| Production | **PASS** | `releases/v2.2/site` served and self-tested: first render 0.66 s, all models 1.38 s, 0 errors. |

---


## V2.1 correction pass (2026-09-22)

Scope: the items in `v2-self-review.md`, with no redesign, no new chapters, no new UI and no new biology. Outcomes (FIXED / RETAINED / NOT APPLICABLE) are recorded in that file. Build: `releases/v2.1/site`.

| Gate | Result | Evidence |
|---|---|---|
| Models | **PASS** | Blender checkpoints v029–v039; v039 is validated, optimised and exported. The stoma, root hairs, leaf interior, plant cell and stem section were corrected and re-exported. The other 7 GLBs are **byte-identical** to V2 (sha256). `assets:inspect`: 12/12 contracts OK, including the stoma morph targets (a name regression was caught and fixed by adding `_tidy_data_names`). Total 1,998 KB; core 249 KB. |
| Visual inspection | **PASS** | Stoma closed / half / open, all joined at both ends. Root hairs grow from single cells, among touching grains and water. Cuticle is a continuous skin on both surfaces. Chloroplasts sit inside the leaf cells. The vacuole holds only stored wastes. Cream cell wall; buff phloem; xylem and old xylem with resin and gum. Checked in Blender renders and in runtime captures (`docs/qa/captures/v21_*`). |
| NCERT / accuracy | **PASS** | `qa:audit`: 292 lines, 0 NEEDS REVISION, 0 NOT SUPPORTED. `qa:content`: 0 errors. `biological-accuracy-audit.md` §2a: C-25 … C-35, no open P0. New sources: p. 96 (gaseous wastes of respiration) and p. 98 (plants use their dead tissues). |
| Freeze → TTS | **PASS** | Content frozen after the audits (spoken `88c9b913…`). 10 changed clips re-synthesised with the same voice (`en-IN-Chirp3-HD-Aoede`); 101 kept. The key was used only through the environment; no key in any file. |
| Automated suite | **PASS** | `npm run qa` (assets, content, audit, secrets over 182 files); content-freeze check matches; `npm run build` succeeds. |
| Runtime | **PASS** | Self-test: 1,334 checks, 0 errors, 75/75 shots clipped, 9:28. All 75 shots swept (correct stage, finite camera, no errors). All 10 Explore models open with their parts. All four tasks complete and hand back to the film (sunlight, guard cells, store the wastes, find the store; the wrong answer is handled). Recall: 8/8 questions, each at its own model, ending on the open prompt. |
| Audio sync | **PASS** | Real clips, 18/18: start, restart, scrub, chapter jump, pause/resume, Explore in/out, task completion → confirmation → next shot. 164 drift samples, 0 over 0.45 s; at most 1 voice; 0 rewinds. |
| Mobile | **PASS** | 375 × 812: stoma opening, night, xylem, root hairs. Long location labels fit on one line. The heading backing now also covers the pale leaf and stoma stages. |
| Production | **PASS** | `releases/v2.1/site` served and self-tested: first render 0.53 s, all models 1.29 s, 0 errors. |

---

# V2 (original report)

2026-09-22 · Blender 5.2.2 LTS via the Blender MCP add-on (bridge `tools/blender-mcp.mjs`, because App Control blocks the stdio relay) · three.js 0.186 · Vite 8.3 · Node 24

V1 is preserved in `releases/v1/`:
- the site;
- the lesson data;
- the NCERT audit, prerequisite audit and QA report;
- the GLBs;
- Blender checkpoints v001–v007.

The V2 build is in `releases/v2/site/`, with its content-freeze record.

## Gates

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | NCERT fidelity | **PASS** | `npm run qa:audit` covers 290 learner-facing lines: 80 DIRECTLY SUPPORTED, 126 MINOR PARAPHRASE, 84 with no factual claim, 0 NEEDS REVISION, 0 NOT SUPPORTED (V1 had 1). `npm run qa:content`: 0 errors. The ten §5.5.2 ideas are each taught, summarised and recalled. See `ncert-content-audit.md` and `prerequisite-audit.md`. |
| 2 | Biological accuracy | **PASS** | `biological-accuracy-audit.md`: 34 claims reviewed and **no open P0**. Three P0s were resolved before the freeze: C-01 old-xylem wording, C-03 “leaves also fall for other reasons”, C-11 CO₂ through stomata at night. One visual error was fixed: C-05, CO₂ drawn as used at the discs instead of the stroma. |
| 3 | Process (START → CHANGE → DESTINATION) | **PASS** | Each of the 8 sections of chapter 03 runs a process and ends in an explanation beat (content QA). Routes are Blender paths (`PATH_LI_Gas`, `PATH_LI_Water`, `PATH_Stoma_Out`, `PATH_RT_Water`, `PATH_RH_Water/Waste`, `PATH_XY_Water/Waste`). Captures confirmed each route: chloroplast → air space → pore → air; soil water → root hair → cell; root → xylem → up; leaf xylem → cells → vapour → stoma; parenchyma → old vessel → resin fills; root cell → soil. |
| 4 | Scale | **PASS** | Five scale chains, each returning to the plant; see `asset-accuracy-map.md` § Scale transitions. Stage changes are veiled cuts, with the camera travelling in from a wider framing. The heading eyebrow shows the path (for example “Plant › Leaf › Inside”). |
| 5 | Asset quality | **PASS** | 12 scale-specific GLBs pass Blender validation (checkpoint v028 is validated, optimised and exported; v008–v028 kept, none overwritten). Blender export inspection and the `npm run assets:inspect` contract both pass. Every asset was reviewed from EEVEE previews (`blender/renders/v2/`). Stoma morph targets survive Draco. |
| 6 | Three.js integration | **PASS** | 10 stages. 21 processes, 11 of them new. 4 “Your turn” tasks, 1 of them new: guard cells. 10 Explore models, 6 new. 8 recall questions, 2 new. In-app self-test: 1,331 checks, 0 errors. A sweep through all 75 shots gave the correct stage, a finite camera and no runtime errors. Explore opens every new model and its parts. |
| 7 | Audio | **PASS** | Google Cloud TTS `en-IN-Chirp3-HD-Aoede`, MP3 24 kHz, rate 1.0; voice verified against `joints-platform/pipeline/audio/build_narration.ts`. 111 clips (75 shots + 36 cues): 41 synthesised after the freeze, 70 kept. The pipeline refuses to synthesise unfrozen content. Real-clip sync test: **18/18**. It covers start, restart, fast scrubbing, chapter jump, pause/resume, Explore in/out, and task completion → confirmation → next shot. 162 drift samples, 0 over 0.45 s; at most 1 voice audible; 0 rewinds. |
| 8 | Performance | **PASS** | See the table below. |
| 9 | Regression | **PASS** | All V1 flows still run on the V2 engine: start card, film, captions (including the every-word option), chapter jumps, the three V1 tasks, Explore, the six V1 recall questions and the open prompt, final-map insets, end card. `npm run qa` (assets, content, audit, secrets) passes, and `npm run build` succeeds. The production build was served and self-tested: 0 errors. |

## Performance (measured)

| Measure | Value |
|---|---|
| GLB download | 1,953 KB total (12 files, Draco); **249 KB before the first frame** (plant, soil, symbols). V1: 1,222 KB, all up front. |
| Draco decoder | 188 KB WASM + 11 KB wrapper (bundled, same origin) |
| First render (core loaded) | 0.53 s production / 0.73 s dev (local server) |
| All close-ups loaded (background) | 1.24 s production. If a learner jumps ahead of loading, the film holds with “Loading the next model…” and continues when the model arrives. |
| Draw calls per stage | plant 52 · stem 24 · leaf interior 13 · xylem 11 · chloroplast / stoma / cell 10 · root hairs 8 · root 7 · leaf 4 |
| Triangles on screen | 6k (cell) to 66k (chloroplast) |
| CPU per frame | 0.6–1.2 ms (20-frame average per stage, desktop) |
| Shader stalls | none on stage entry: each stage is compiled as its model arrives |
| Audio | 2.5 MB, 111 clips, streamed per shot |
| Build | `dist/` 6.8 MB on disk. About 1.2 MB of that is three.js’s default non-glTF Draco decoder, which is emitted but never requested. |

## Mobile

Checked at 375 × 812 (phone emulation) on: the leaf interior, stoma opening, xylem, root hairs and the final map with insets. The subject sits between the heading and the player, and labels stay on screen. The xylem presets pull back further on portrait screens (`refAspect`). Not tested on a physical phone.

## Security

- `npm run qa:secrets` passes (171 files).
- A key-prefix scan of `web/dist`, `web/public`, `web/src`, `pipeline`, `docs` and `blender/scripts` found nothing.
- The TTS key was used only as an environment variable for one command. It was never written to a file, `.env`, the manifest, the GLBs or the build.
- `.gitignore` covers `.env*`, credentials and QA captures.

## Known limitations

- Particles are symbols. Close-ups are not to scale with one another (teacher note; C-22).
- Young xylem vessels all show spiral thickenings (C-18). The root xylem is a simple central strand (C-09).
- The night view shows CO₂ leaving through the leaf’s air spaces. The route is deliberately not narrated (C-11).
- Tested in the in-app browser only (Chromium). The browser pane was often hidden, so frame rate there is not representative. Timing was checked with the deterministic stepping harness and the real-time audio pump.
