# Asset provenance and licence gate

**Status: PENDING — RELEASE BLOCKER.** The licence of the source anatomy is unknown. No public release certification may be
issued while this is unresolved. Nothing in this file is inferred from a file name, a folder name or a resemblance to a
known atlas.

## What is actually known

| Field | Evidence |
|---|---|
| Source file | `Human_Body_Master.blend`, 224,401,653 bytes, SHA-256 `f7313dabbf27d990ce1d7d3f771ebf1f914ffc5fb1162a7f71339bd3e6dc7fb0` (pinned in `pipeline/config.json`) |
| Supplied by | The project owner, placed in their own Desktop project folder. No transfer note, invoice, download record or terms accompanied it in the repository. |
| Saved with | Blender 5.0.119 (recorded in `pipeline/config.json`) |
| Companion files in the same folder | `Human_Body_Complete.glb` (217.9 MB), `Human_Body_Cutaway (1).glb` (180.1 MB), `Human_Body_Master.gltf` + `.bin` (4.6 MB + 237.4 MB), `Internal_Organs_Study.glb` (46.7 MB), three PNG renders |
| glTF generator string | `Khronos glTF Blender I/O v5.0.21` — an exporter, not an origin |
| Scene names | "01 Complete anatomy", "02 Cutaway presentation", "03 Internal organs study" |
| Object naming convention | `"<Structure> | <Side>"`, e.g. `"Anal region | Left"`, `"Humerus | Left"` — a systematic anatomical atlas naming scheme |
| Structure count used here | 535 body structures; 49 in the elbow working set |

## What is missing

1. **No licence text.** The source folder contains no LICENCE, README, terms, credits or attribution file (checked
   2026-09-18).
2. **No author or vendor identified.** The `.blend` and the glTF carry no author, copyright or rights metadata that
   identifies a creator or licensor.
3. **No provenance chain.** There is no record of where the asset came from (purchase, subscription, download, commission,
   or generation), on what date, or under which terms.
4. **No permission for redistribution.** The web build ships derived geometry (`public/assets/joints/elbow_r/*.glb`,
   `public/assets/body/v2/*`, `public/assets/body/v3/*`) and baked textures derived from the source. Redistribution rights
   for derived works are unknown.
5. **No attribution string.** If the licence requires credit, the product currently shows none. The Sources dialog says only
   "Source anatomy licence: pending."

## Required attribution

**UNKNOWN until the licence is identified.** If credit is required, it must appear in the Sources dialog (the film already
has that surface) and in the repository.

## Release blockers

| # | Blocker | Who resolves it |
|---|---|---|
| 1 | Identify the source of `Human_Body_Master.blend` and produce the licence or purchase terms. | Project owner |
| 2 | Confirm the licence permits **derivative works** (the elbow rig, LOD simplification, render-group merging, re-quantised geometry). | Project owner / legal |
| 3 | Confirm the licence permits **web redistribution** of derived geometry and textures to end users. | Project owner / legal |
| 4 | Confirm whether attribution is required, and in what exact wording. | Project owner / legal |
| 5 | Confirm whether educational or commercial use is permitted, and whether the intended distribution matches. | Project owner / legal |
| 6 | Record the answers here and replace the Sources-dialog line. | Engineering, after 1–5 |

## Rules that apply until this is closed

- Do not publish, distribute or demo publicly.
- Do not state or imply that the anatomy is open-source, public domain, or licensed for reuse.
- Do not identify the asset by guessing a vendor from its naming convention.
- The master file stays read-only; it is never modified or redistributed (verified every step by SHA-256).
