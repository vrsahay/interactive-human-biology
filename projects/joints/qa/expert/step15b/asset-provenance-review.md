# Asset provenance review — reviewer sheet for `step15b-learner-clarity-complete`

## Status: RELEASE BLOCKER — PENDING

**No public release certification may be issued while this is open.**

Nothing below is inferred. The licence of the source anatomy is **unknown**. This document does not guess a vendor, a
licence family or a public-domain status from a file name, a folder name, a naming convention, a file's internal
generator string, or a resemblance to any published atlas.

This sheet carries the Step-13 position forward to the `step15b-learner-clarity-complete` candidate, re-verified today. **Steps 14, 14B and 15B added no asset of any kind** — no geometry, no texture, no material — so the licence question is exactly the one it
was, unchanged and unanswered. The one thing they did add is synthesized narration audio, which is covered separately in
§4 because its provenance question is different.

---

## 1. Source asset

| Field | Value |
|---|---|
| Source asset name | `Human_Body_Master.blend` |
| Size | 224,401,653 bytes |
| SHA-256 | `f7313dabbf27d990ce1d7d3f771ebf1f914ffc5fb1162a7f71339bd3e6dc7fb0` |
| Location | The project owner's own Desktop project folder, outside the repository |
| Access mode | **Read-only throughout the project.** Re-verified at every step, including today, and never changed. |
| Verified for this package | `npm run master:guard` → `ok: true`, mtime `2026-09-16T10:52:57.809Z` |

Companion files supplied in the same folder: `Human_Body_Complete.glb` (217.9 MB), `Human_Body_Cutaway (1).glb`
(180.1 MB), `Human_Body_Master.gltf` + `.bin` (4.6 MB + 237.4 MB), `Internal_Organs_Study.glb` (46.7 MB) and three PNG
renders.

## 2. Known provenance

- Supplied by the project owner at the start of the project. **No transfer note, invoice, download record, subscription
  reference, commission agreement or terms of use accompanied it.**
- The `.blend` was saved with Blender 5.0.119.
- The glTF `asset.generator` string is `Khronos glTF Blender I/O v5.0.21` — that identifies an **exporter**, not an
  origin, and is not evidence of anything about licensing.
- Scene names inside the file: "01 Complete anatomy", "02 Cutaway presentation", "03 Internal organs study".
- Objects follow a systematic atlas naming convention, `"<Structure> | <Side>"` (e.g. `"Humerus | Left"`).
- 535 body structures are used by this product; 49 of them form the elbow working set.

## 3. Evidence table — every field required before release

| Field | Value | Status |
|---|---|---|
| **Source** (where it came from) | unknown | **PENDING** |
| **Author** | unknown | **PENDING** |
| **Licence** (name and text) | unknown | **PENDING** |
| **Permitted usage** — derivative works | not established | **PENDING** |
| **Permitted usage** — web redistribution of derived geometry and textures | not established | **PENDING** |
| **Permitted usage** — educational / commercial scope | not established | **PENDING** |
| **Attribution** — required? exact wording? placement? | not established | **PENDING** |
| **Acquisition record** (invoice, download, subscription, commission) | none found | **PENDING** |
| **Copyright metadata** in the `.blend` or the glTF | none present | **PENDING** |
| Licence text or terms file in the source folder | none present (re-checked 2026-09-18) | **PENDING** |

## 4. What this build ships that is derived from it

All of the following are **derivative works** delivered to end users by the web build. That is why this blocks release
rather than merely being untidy.

- `public/assets/joints/elbow_r/elbow_r.core.glb`, `.detail.glb`, `.context.glb` — extracted, rigged, simplified and
  re-quantised elbow geometry.
- `public/assets/body/v2/*` and `public/assets/body/v3/*` — merged render groups, LOD1 simplifications and a merged
  vertex-coloured proxy of the whole skeleton and skin.
- `public/assets/shared/body-materials.glb` — the material library carrying the source textures.

Every one of these files is hashed in `review-manifest.json → integrity` for this candidate build.

**Narration audio** (`public/assets/audio/narration/*.mp3`, 56 clips, 761 KB) is a separate question and is **not**
derived from the source anatomy. It was synthesized by Google Cloud Text-to-Speech from text written in this repository,
using an API key supplied by the project owner through the environment at build time.

| Field | Value | Status |
|---|---|---|
| Narration generator | Google Cloud Text-to-Speech, voice `en-IN-Chirp3-HD-Aoede` | recorded |
| Input text | locale strings in this repository (draft enrichment and figure-reference) | recorded |
| Terms covering redistribution of synthesized audio | **not established** | **PENDING** |
| Attribution required by the TTS provider | **not established** | **PENDING** |

- [ ] **P4.1** Confirm the Google Cloud TTS terms permit redistributing this audio in a published product, and whether
      attribution is required. — **PENDING**

## 5. Required action before public release

1. Identify where `Human_Body_Master.blend` came from and produce the licence or purchase terms.
2. Confirm the licence permits **derivative works** (rigging, simplification, merging, re-quantisation, texture baking).
3. Confirm the licence permits **redistribution of derived geometry and textures** to end users over the web.
4. Establish whether **attribution** is required, and if so the exact wording and placement.
5. Confirm the permitted **scope of use** (educational and/or commercial) matches the intended distribution.
6. Answer §4 for the synthesized narration audio.
7. Record the answers here, then replace the "Source anatomy licence: pending" line in the product's Sources dialog.

Until items 1–6 are answered: **do not publish, do not distribute**, and do not describe the anatomy as open-source,
public domain, freely licensed or cleared for reuse.

## 6. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Evidence consulted | this sheet; `pipeline/config.json` (pinned master hash); `qa/expert/step15b/review-manifest.json`; `qa/expert/frozen-build.json` |
| Findings | |
| Decision | |
