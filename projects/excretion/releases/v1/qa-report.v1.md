# QA report: Excretion in Plants (Class 10), first working version

2026-09-22 · Blender 5.2.2 LTS via the Blender MCP add-on · three.js 0.186 · Vite 8.3 · Node 24

**Result.** Content, 3D, Three.js, learning, accessibility and security checks **pass**. Narration is **generated** with Google Cloud TTS (84 clips, `en-IN-Chirp3-HD-Aoede`), and the sync test passes on the real clips. Open items are in §9 and `docs/qa-fix-plan.md`.

Automated checks (all from `web/`):

| Command | What it checks | Result |
|---|---|---|
| `npm run assets:inspect` | Blender → Three.js node contract for all 5 GLBs; writes `public/models/manifest.json` | PASS: 5/5 GLBs, all required nodes |
| `npm run qa:content` | NCERT coverage, teach-first order, a process in every section, term order, text rules | PASS: 0 errors, 0 notes |
| `npm run qa:audit` | every learner-facing line has an NCERT audit entry; nothing marked NEEDS REVISION | PASS: 192 lines |
| `npm run qa:secrets` | no credentials in source, build, GLBs, manifest, docs; ignore rules | PASS: 117 files |
| `?qa=1` self-test | presets, anchors, labels, tracks, heading/caption rules, clip per shot | PASS: 948 checks, 0 errors, 0 warnings |
| `app.qa.audioTest()` | narration ownership and sync (18 steps) | see §5 |
| Blender `step=validate` / `inspect_exports` | geometry, names, collections, transforms, cameras, placement; exports re-imported | PASS: 0 issues; 5/5 exports identical to source |

## 1. Content (NCERT)

| Check | Result |
|---|---|
| The ten §5.5.2 ideas (p. 98) are taught; N1–N3 and N6–N10 are rebuilt in the final map, N4 and N5 are linking ideas | PASS (`docs/ncert-content-map.md`) |
| Every idea is recalled (six questions) or explained in the open prompt | PASS |
| Terminology: excretion, excretory organ, photosynthesis, oxygen, transpiration, water vapour, xylem, phloem, bark, cytoplasm, vacuole, cellular vacuoles, old xylem, dead cells, resins and gums, soil | PASS; each term is first spoken in the shot that teaches it |
| Every learner-facing claim checked against the pages: 192 lines: 44 directly supported, 79 minor paraphrase, 1 not supported (brief-required, flagged), 68 no factual claim, 0 needing revision | PASS (`docs/ncert-content-audit.md`) |
| Unsupported wording found by the audit and revised: an animals comparison, the order of stem layers, the position of old xylem, and branch/pith descriptions | FIXED (fix plan P0-1…4) |
| Leaf fall not presented as only for excretion | PASS (“Leaves also fall for other reasons…”, flagged for a teacher) |
| No reviewer or citation words on the learner surface | PASS (automated) |
| Prerequisites: photosynthesis, chloroplasts, transpiration, dead cells, old xylem and others | `docs/prerequisite-audit.md` |

## 2. Learning

| Check | Result |
|---|---|
| Starts from zero: a living plant → life processes → by-products → excretion → the chapter 01 question | PASS |
| Central question established before any answer, with a pause (2.8 s tail) | PASS (automated order check) |
| No guessing before teaching: each “Your turn” comes after its process and its explanation | PASS (automated) |
| Each of the six processes shows WHERE → WHAT HAPPENS → RESULT before naming it (table in `docs/learning-design.md`; process tracks listed in `docs/qa/content-qa.md`) | PASS |
| Remove vs store made explicit (`vacuole.pivot`; “kept, not removed” on each store) | PASS |
| Scale transition plant → leaf → tissue → cell → vacuole → cell → leaf → plant, with a breadcrumb | PASS (captures) |
| Final synthesis rebuilds six routes on one plant, adding nothing new | PASS (captures) |
| Recall follows teaching; ends with “Can you explain, in your own words, how plants deal with wastes?”, a model answer and a six-point self-check | PASS |

**Success test** (could a Class 10 learner who knew nothing now explain how plants deal with wastes?):
- By design: the film builds the answer as six routes tied to six places, then asks the learner to say it themselves and compare.
- By test: a real answer needs a short classroom trial (§9).

## 3. 3D (Blender via MCP)

| Check | Result |
|---|---|
| Collections exactly as briefed; each object in one collection; meshes filed by lesson part | PASS |
| Names: no `Cube.001`-style or suffixed names | PASS |
| Geometry: no loose vertices, degenerate faces, or non-manifold solids (open surfaces tagged) | PASS |
| Materials on every mesh (30 `MAT_*`, 0 unused) | PASS |
| No floating objects: stem in the soil, every petiole on a stem or branch (max gap 0.000) | PASS |
| No clipping: 0 root vertices outside the soil; vacuole and nucleus inside the cell, not overlapping; 16/16 resin deposits in old xylem | PASS |
| Transforms: no zero, negative or non-uniform parent scale; all 192 exported objects | PASS |
| Camera targets: 17 `CAM_` each look at their `TGT_` and are exported with their asset | PASS |
| Budgets: 49k triangles total, each asset under its phone budget; 1.22 MB of GLBs | PASS |
| Checkpoints v001–v007, each validated, none overwritten | PASS (`blender/checkpoints/checkpoints.json`) |
| Exported GLBs re-imported into Blender: meshes, triangles, metadata, cameras, root at origin | PASS: 5/5 identical |

## 4. Three.js

| Check | Result |
|---|---|
| Assets load (manifest-driven); no console errors | PASS |
| Guided mode: 5 chapters, 6 sections in chapter 03, 56 shots, **6:44** timed from the real voice (0:38 · 0:40 · 4:28 · 0:50 · 0:07 + recall) | PASS |
| Camera: authored framings, eased travel, dolly, follow (water drop), cuts on seek; subject composed right of the heading | PASS (captures) |
| Highlight and dim, see-through soil, stem cutaway, the “dead” old-xylem isolation | PASS |
| Interactions: sunlight slider; store wastes (tap or button); find the store (tap or choice, with retry). The film waits, then resumes. | PASS |
| Explore: closed before teaching (hint), unlocks per shot, locked models marked, parts restate the lesson, orbit, reset, returns to the exact film time | PASS |
| Recall → open prompt → model answer → end card (watch again / recall again / explore) | PASS |
| Seek, scrub, chapter jump, replay: the state is a function of time. Fixed: scrubbing past a task, Explore on a locked model, timeline marker positions. | PASS after fixes |

## 5. Audio

| Check | Result |
|---|---|
| Voice and settings match Types of Joints (`en-IN-Chirp3-HD-Aoede`, en-IN, rate 1.0, no pitch, MP3 24 kHz) | PASS (pipeline config) |
| Every shot and cue has a line and a stable clip name (56 + 28) | PASS (`docs/narration-script.md`) |
| Clips generated with Google TTS | PASS: 84 clips (56 shots + 28 cues), 1.77 MB, 5:06 of speech; sentence starts found in all 56 shot clips; no line missing, no unused file |
| Captions follow the real voice | PASS: each caption changes about 0.1 s before its measured sentence start (e.g. `vacuole.reason`: speech at 3.04 s / 6.47 s, caption at 2.92 s / 6.36 s) |
| Runtime uses clips only, never a device voice | PASS (the device-voice code was removed) |
| Sync and ownership, `app.qa.audioTest()` with the tone fixture (same layout as the real clips), 18 steps: start, restart, fast scrubbing (10 seeks in 0.9 s), chapter jump, pause/resume, Explore (its line alone; newer line replaces older; stops on close), “Your turn” (confirmation alone, next shot after it), seek during a cue | **Real Google clips, final code: 3 fresh runs, 18/18 steps each.** Every run: never more than one voice (`maxAudible` 1), 0 rewinds, 0 drift. With the real clips, one run caught a real gap: when a jump stayed within the same clip, a fraction of a second of the old voice could play before the next frame silenced it. Fixed (P1-11); the two runs after the fix passed. Earlier runs on the tone fixture found the bugs P1-7…10. All runs were in a hidden, throttled browser pane. |
| Bugs found by the audio test and fixed | Unlock race (two elements), the voice continuing on a hidden page, a stalled clock pausing the voice, a confirmation overlapping the next shot (fix plan P1-7…10) |

## 6. Performance

| Metric | Value |
|---|---|
| Models | 1.22 MB (5 GLBs, JPEG textures ≤ 1024 px), 49k triangles |
| Production build | JS 773 KB (202 KB gzipped) + CSS 19 KB; plus models; narration adds about 2 MB of MP3 once generated |
| Draw calls / triangles per frame | 10–50 in teaching shots; peak 91 / 58.6k on the final map (two inset renders) |
| Programs / textures / JS heap | 25 / 8 / 27 MB |
| Stalls | shaders pre-compiled at load; film clock follows real time up to 1 s per frame |
| Mobile | pixel ratio ≤ 1.75; the subject is fitted in the band between heading and player; dense labels compact on small phones |

## 7. Accessibility

- Every control is focusable, 44 px or larger, with a visible focus ring. Keyboard: Space/K, the timeline (arrows, Shift ×3, Home/End), Esc.
- The Settings dialog traps focus.
- A polite live region announces “chapter, section, frame description” on every shot. The stage is `role="img"` with a per-shot description.
- Reduced motion (system or setting) gives cuts instead of travel. Caption size can be set to large. Captions can show the main idea (default) or every spoken word.
- Every tap-on-model task has button equivalents. Meaning is never carried by colour alone: shape-coded particles, text labels, ✓/✕ in recall.
- The Recall text box is optional and stays on the device.

## 8. Security

- **Key handling:** `TTS_KEY` is read only by the build-time pipeline, from the environment or the git-ignored `.env`, and sent in a header. It is never logged or written anywhere.
- **Ignore rules:** `.env`, `.env.*`, credential JSON files, the QA audio fixture, QA captures, logs and the MCP pid are git-ignored.
- **Scan:** `npm run qa:secrets` passed on source, build, GLBs, manifest, docs, pipeline and Blender scripts.
- **Screenshots:** QA captures show no credentials. No key was ever handled during this build.

## 9. Open items (honest)

1. **Narration generated** with the key supplied in chat. The key is not stored in the project. To regenerate after edits, supply it again:

   ```bash
   cd web
   TTS_KEY=... npm run narration
   ```

   Or put `TTS_KEY=…` in the project `.env`. The lesson then re-times to the voice automatically.
2. **Audio verified by measurement, not by ear.** The clips play, align and hand over correctly, but no one has listened to the whole film with sound yet: pronunciation, pacing and pauses (fix plan P2-5).
3. **Blender MCP connector.** The stdio relay is blocked by Windows Application Control. All Blender work went through the Blender MCP add-on via the bridge (`docs/blender-mcp.md`).
4. **Teacher confirmation:**
   - the clarification “leaves also fall for other reasons” (brief-required, not NCERT);
   - “old xylem is made mostly of dead cells” (an inference across Class X p. 98 and Class 9 p. 33).
5. **Real devices.** Phone and tablet were checked by viewport emulation only. A short classroom trial is the real success test.
