# Excretion in Plants — a guided 3D lesson (Class 10 Biology)

An open educational project: a narrated, cinematic 3D lesson that teaches how plants deal with their wastes, for Class 10 learners following the NCERT syllabus (*Science*, Class X, Chapter 5 "Life Processes", §5.5.2 *Excretion in Plants*).

It teaches from zero:
- what excretion is;
- why plants are different (they have no organ like a kidney);
- then it **follows the waste** through one plant, place by place — oxygen from a leaf, excess water by transpiration, storage in cell vacuoles (a scale journey into one cell and back), leaves that fall, resins and gums in old xylem, and wastes into the soil;
- it rebuilds all six routes on one plant, then asks the learner to recall them and explain the idea in their own words.

The lesson runs about 9½ minutes with narration, four short "Your turn" tasks, an Explore mode for turning and tapping the models, and a Recall quiz.

> **Not affiliated with NCERT.** This is an independent educational project. It cites NCERT page numbers as its source of truth; it is not published, endorsed or approved by NCERT, and it does not redistribute NCERT material.

## Technology

| Part | What it does |
|---|---|
| **Blender** (5.2.2), driven through the **Blender MCP add-on** via a small bridge (`tools/blender-mcp.mjs`) | Builds, organises, validates, optimises and exports every 3D asset from Python build scripts — the models are code, not hand-sculpted files. |
| **Three.js** | The learner-facing film: camera moves, particle processes, narration sync, captions, Guided / Explore / Recall. |
| **GLB / glTF** (Draco-compressed) | The bridge between the two. 12 scale-specific models, about 2 MB in total. |
| **Google Cloud Text-to-Speech** | The narration (voice `en-IN-Chirp3-HD-Aoede`), rendered at build time. The key is never in the browser, the repository or the build. |
| **Vite** | Dev server and static build. |

## Run it locally

```bash
cd web
npm install
npm run dev
```

Then open the address Vite prints. To build the static site:

```bash
npm run build
```

To serve the finished release instead of building:

```bash
cd web
npx vite preview --outDir ../releases/v2.4/site
```

Add `?qa=1` to the URL for the built-in self-test and QA tools (`app.qa.*`); `&shot=vacuole.store` jumps to a shot.

## The release

| Release | Where | Notes |
|---|---|---|
| **v2.4** (current) | `releases/v2.4/site` | The frozen build. `MANIFEST.sha256` lists every file; `content-freeze.json` pins the narration and on-screen text. |
| v1 | `releases/v1` | The original reference implementation, kept for comparison. |

The site is static: copy `releases/v2.4/site` to any web server.

Intermediate builds (v2, v2.1, v2.2, v2.3 and the v2.4 release candidates) are **not** part of this repository. They were development snapshots; what changed in each is written up in [docs/qa-report.md](docs/qa-report.md) and [docs/v2-self-review.md](docs/v2-self-review.md).

**Pending before this is called final:** a test on a real phone ([docs/phone-test-protocol.md](docs/phone-test-protocol.md)) and a Biology teacher review ([docs/teacher-review-package.md](docs/teacher-review-package.md)).

## Narration (no secrets in the repository)

```bash
cd web
npm run narration:plan             # what would be synthesised (no key needed)
TTS_KEY=... npm run narration      # or put TTS_KEY=... in ../.env (git-ignored)
```

- The key is read **only** by `pipeline/narration/build-narration.mjs`, from the environment or a git-ignored `.env`. It is never written to source, lesson data, HTML, the build, GLBs, manifests or docs, and `npm run qa:secrets` checks that on every QA run.
- Only new or changed lines are synthesised. Clips land in `web/public/audio/excretion/` with `narration.json`.
- Timing is measured from the MP3s that actually ship: after synthesis the pipeline runs `pipeline/narration/retime-from-mp3.mjs --write` (needs a local Chrome or Edge, no key). Details: [docs/narration.md](docs/narration.md).
- A content freeze (`web/scripts/content-freeze.mjs`) hashes every learner-facing line; the TTS pipeline refuses to run against unfrozen text.

## Rebuild the 3D assets

```bash
node tools/blender-mcp.mjs start
node tools/blender-mcp.mjs exec blender/mcp/steps_v2.py step=stoma             # rebuild one asset
node tools/blender-mcp.mjs exec blender/mcp/steps_v2.py step=optimise note="…" # validate + optimise → new checkpoint
node tools/blender-mcp.mjs exec blender/mcp/steps_v2.py step=export only=Stoma # re-export only what changed
node tools/blender-mcp.mjs stop
```

Every milestone is saved as a new, never-overwritten checkpoint. See [docs/blender-mcp.md](docs/blender-mcp.md) for how the bridge works.

## Project structure

```
web/                     the Three.js lesson
  src/                   assets · scene · camera · interaction · animation · film · narration · ui
    lessons/excretion-in-plants/   lesson-data.js · shots.js · world.js · processes/ · explore-data.js · recall-data.js
  public/models/         12 production GLBs + manifest.json
  public/audio/          111 narration clips + narration.json
  scripts/               asset contract, content QA, NCERT audit, secrets scan, content freeze
blender/
  scripts/               the model builders, validate, optimise, export
  mcp/steps_v2.py        the build pipeline: one call per step
  source/                the working .blend (all textures packed inside)
  checkpoints/           the export-state .blend for each published release + checkpoints.json (the full build log)
pipeline/narration/      Google Cloud TTS build (build time only)
tools/blender-mcp.mjs    Blender MCP bridge
releases/                v1 and v2.4 (the shipped static sites)
docs/                    lesson design, NCERT mapping, biology audits, QA reports and evidence
ncert/                   README with page citations (the textbook PDFs themselves are not redistributed)
```

## Biology and sources

The biology is documented, not assumed:

| Document | What it covers |
|---|---|
| [docs/learning-design.md](docs/learning-design.md) | The lesson plan and why it is ordered this way |
| [docs/ncert-content-map.md](docs/ncert-content-map.md) | What is taught, mapped to NCERT pages |
| [docs/ncert-content-audit.md](docs/ncert-content-audit.md) | Every learner-facing line checked against those pages |
| [docs/biological-accuracy-audit.md](docs/biological-accuracy-audit.md) | Claim-by-claim biology review |
| [docs/deep-biological-audit.md](docs/deep-biological-audit.md) | The 3D models and animations audited from every angle |
| [docs/accepted-simplifications.md](docs/accepted-simplifications.md) | The 32 deliberate simplifications, each with its reason |
| [docs/asset-accuracy-map.md](docs/asset-accuracy-map.md) | What each model shows and what is simplified |
| [docs/explore-label-audit.md](docs/explore-label-audit.md) | Every Explore label checked against what it points at |
| [docs/qa-report.md](docs/qa-report.md) | Test results for each version |

## Known limitations

- Not yet tested on a physical phone; an emulated phone profile showed Explore at roughly 20 fps under a 4× CPU throttle.
- Not yet reviewed by a Biology teacher.
- The 32 accepted simplifications are deliberate teaching choices, listed in the document above.
- The narration is synthesised, not recorded by a person.
- `blender/checkpoints` keeps only the export states of the published releases; the intermediate development checkpoints are not part of this repository.

## Licensing

**A licence has not been chosen yet** — see [docs/licensing-status.md](docs/licensing-status.md), which separates the project's own code and assets from third-party material (NCERT textbooks, the TTS service output and the JavaScript libraries). Until the open questions there are answered, treat this repository as "all rights reserved" and do not redistribute its assets.
