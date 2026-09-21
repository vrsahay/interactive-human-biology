# Asset provenance review — reviewer sheet

**Status: RELEASE BLOCKER — PENDING.**

No public release certification may be issued while this is open. Nothing below is inferred: the licence is unknown, and
this document does not guess a vendor, a licence family or a public-domain status from a file name, a folder name, a naming
convention or a resemblance to any published atlas.

Engineering counterpart with the full blocker list: [../release/asset-provenance.md](../release/asset-provenance.md).

## Source asset

| Field | Value |
|---|---|
| Source asset name | `Human_Body_Master.blend` |
| Size | 224,401,653 bytes |
| SHA-256 | `f7313dabbf27d990ce1d7d3f771ebf1f914ffc5fb1162a7f71339bd3e6dc7fb0` |
| Location | The project owner's own Desktop project folder (outside the repository) |
| Access mode | **Read-only throughout the project.** The hash has been re-verified at every step and has never changed. |

Companion files supplied in the same folder: `Human_Body_Complete.glb` (217.9 MB), `Human_Body_Cutaway (1).glb`
(180.1 MB), `Human_Body_Master.gltf` + `.bin` (4.6 MB + 237.4 MB), `Internal_Organs_Study.glb` (46.7 MB) and three PNG
renders.

## Known provenance

- Supplied by the project owner at the start of the project. No transfer note, invoice, download record, subscription
  reference, commission agreement or terms of use accompanied it.
- The `.blend` was saved with Blender 5.0.119.
- The glTF `asset.generator` string is `Khronos glTF Blender I/O v5.0.21` — that identifies an **exporter**, not an origin.
- Scene names inside the file: "01 Complete anatomy", "02 Cutaway presentation", "03 Internal organs study".
- Objects follow a systematic atlas naming convention, `"<Structure> | <Side>"` (e.g. `"Humerus | Left"`).
- 535 body structures are used by this product; 49 of them form the elbow working set.

## Available evidence

| Evidence | Present? |
|---|---|
| Licence text or terms file | **No** — the source folder contains no LICENCE, README, terms, credits or attribution file (checked 2026-09-18) |
| Author or copyright metadata in the `.blend` or glTF | **No** |
| Vendor, marketplace or purchase record | **No** |
| Date and channel of acquisition | **No** |
| Permission for derivative works | **Not established** |
| Permission for web redistribution | **Not established** |
| Required attribution wording | **Not established** |
| Permitted use (educational / commercial) | **Not established** |

## What the product currently ships that is derived from this asset

- `public/assets/joints/elbow_r/elbow_r.core.glb`, `.detail.glb`, `.context.glb` — extracted, rigged, simplified and
  re-quantised elbow geometry.
- `public/assets/body/v2/*` and `public/assets/body/v3/*` — merged render groups, LOD1 simplifications and a merged
  vertex-coloured proxy of the whole skeleton and skin.
- `public/assets/shared/body-materials.glb` — the material library carrying the source textures.

All of these are **derivative works** delivered to end users by the web build. That is precisely why the licence question
blocks release rather than merely being untidy.

## Required action before public release

1. Identify where `Human_Body_Master.blend` came from and produce the licence or purchase terms.
2. Confirm the licence permits **derivative works** (rigging, simplification, merging, re-quantisation, texture baking).
3. Confirm the licence permits **redistribution of derived geometry and textures** to end users over the web.
4. Establish whether **attribution** is required, and if so the exact wording and placement.
5. Confirm the permitted **scope of use** (educational and/or commercial) matches the intended distribution.
6. Record the answers here, then replace the "Source anatomy licence: pending" line in the product's Sources dialog.

Until items 1–5 are answered: do not publish, do not distribute, and do not describe the anatomy as open-source, public
domain, freely licensed or cleared for reuse.

## Reviewer record

- Status: PENDING
- Reviewer:
- Evidence: this sheet; `pipeline/config.json` (pinned master hash); `qa/expert/frozen-build.json`
- Comments:
- Decision:
