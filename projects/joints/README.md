# Types of Joints

A video-first, interactive 3D lesson on the **types of joints** (NCERT Class 10 science). A learner watches a narrated
film of a real skeleton, then takes the joint and moves it. The lesson covers:

| Category | Example |
|---|---|
| Fixed | the skull |
| Pivot | the top of the neck |
| Ball-and-socket | the shoulder |
| Hinge | the elbow |

> **Status: awaiting expert review. Not public-release ready.**
> Every expert decision (anatomy, curriculum, narration, accessibility, landmarks, licensing and the rest) is
> **PENDING**. The source anatomy's licence is unknown, which **blocks release**; see [Licence and assets](#licence-and-assets).

---

## The lesson

Nine chapters, 52 shots, about 6½ minutes of film plus learner-paced tasks:

| # | Chapter | |
|---|---|---|
| 01 | Two joints, two movements | why do a shoulder and an elbow move so differently? |
| 02 | What is a joint? | bones meet; the shape of the meeting decides the movement |
| 03–06 | Fixed · Pivot · Ball-and-socket · Hinge | each: arrive → look → movement → **why** → name → **your turn** |
| 07 | Comparing the four | one movement pattern at a time, then all four |
| 08 | Recall challenge | see a joint move, name its category |
| 09 | The body map | the summary |

**What is modelled, and what is not.** The **right elbow** is a validated procedural rig: one degree of freedom
(flexion), a fitted axis and an approximate 0–145° teaching range. The **skull, neck and shoulder** explorations are
*teaching simulations*: real bones moved rigidly to show a kind of movement, not biomechanics. The app labels each one
on screen, and the build refuses to let a simulation claim to be validated.

## Quick start

Requires **Node.js 24+**. End-to-end tests use the locally installed **Google Chrome**.

```bash
npm ci
npm run dev          # development server
npm run build        # production build -> dist/
npm run preview      # serve the production build
```

Open the app and press **Start lesson**; the narration needs sound on.

| URL parameter | Effect |
|---|---|
| `?qa=1` | exposes the test hooks the specs use |
| `?mode=sandbox` | opens the earlier interactive sandbox |

## Tests

```bash
npm run typecheck    # app + tests
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end (Playwright, local Chrome); builds and serves on :4173
```

Set `QA_STEP=<name>` to write e2e reports to `qa/reports/<name>.*` instead of overwriting earlier steps' reports.

## Project layout

```
src/        application: engine (three.js), film runtime, UI (Preact)
content/    the lesson and its English strings: every string carries a provenance class
public/     shipped assets: body and elbow GLBs + manifests, environment, narration audio
pipeline/   asset pipeline (Blender scripts, glTF optimisation), narration build, QA/package builders
tests/      unit (tests/unit) and end-to-end (tests/e2e)
blender/    Blender working files and checkpoints (Git LFS)
qa/         evidence: per-step reviews, test and audit reports, expert review packages
docs/adr/   architecture and review decisions
```

`dist/`, `node_modules/`, local exports and the regenerable screenshot sets (`qa/visual/`) are not versioned.

## Narration

Narration is synthesized **at build time** with Google Cloud Text-to-Speech, one clip per shot. The spoken text is
assembled only from strings already in `content/`, so it adds no unreviewed claim.

```bash
TTS_KEY=<your key> node pipeline/audio/build_narration.ts          # re-synthesizes only clips whose text changed
TTS_KEY=<your key> node pipeline/audio/build_narration.ts --all    # everything
```

The key is read from the environment **only**. It is never written to a file, a manifest or the build, and a unit test
fails if a key ever appears in the shipped narration. Do not commit a `.env`; `.gitignore` excludes one.

## Asset pipeline

The anatomy comes from a master Blender file that is **not** in this repository. Its SHA-256 is pinned in
`pipeline/config.json` and checked by `npm run master:guard`. The master is only ever read, never modified. The shipped
GLBs in `public/assets/` are derived from it and are committed, so the app builds and runs without it. Regenerating
those assets requires the master file and Blender 5.2.2.

## Expert review

The candidate under review is tag **`step16g-narration-repetition-fixed`**. The review package is
[`qa/expert/step17/`](qa/expert/step17/):

- start with [`reviewer-checklist.md`](qa/expert/step17/reviewer-checklist.md);
- decisions are recorded in `expert-review-status.json`;
- `review-manifest.json` hashes exactly what is being reviewed.

The reasoning is in [`docs/adr/step17-final-expert-review-baseline.md`](docs/adr/step17-final-expert-review-baseline.md).

Known open items, recorded rather than resolved:

| Item | Status |
|---|---|
| Emulated phone performance (Step 12) | **fail**: first 3D 2742 ms vs 2500 ms, drag p95 45.1 ms vs 22 ms |
| NVDA, VoiceOver, TalkBack | not tested |
| Real Android and iPad devices | not tested |
| Elbow landmark approval (Gate 3) | pending |
| Hip classification | pending expert confirmation |

## Licence and assets

**No licence is granted for this repository.** It contains no LICENSE file, so all rights are reserved.

The 3D anatomy assets (`public/assets/**`, `blender/**`) are derived from a source file whose origin, author and licence
are **unknown**. **They are not cleared for reuse or redistribution**, and must not be described as open-source, public
domain or freely licensed. The same applies to the synthesized narration audio until the provider's redistribution
terms are confirmed. See [`qa/expert/step17/asset-provenance-review.md`](qa/expert/step17/asset-provenance-review.md).

Joint categories and body locations follow the supplied NCERT "Types of joints" figure; no NCERT artwork, wording or
layout is reproduced. Explanatory text written for this lesson is marked as draft and awaits subject-expert review.
