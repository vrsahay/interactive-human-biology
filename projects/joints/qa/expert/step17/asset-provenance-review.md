# Asset provenance review — `step16g-narration-repetition-fixed`

## Status: **RELEASE BLOCKER — PENDING**

**No public-release certification may be issued while this is open.**

Nothing below is inferred. The licence of the source anatomy is **unknown**. This sheet does not guess a vendor, a
licence family or a public-domain status from:

- a file name or folder name;
- a naming convention;
- an exporter or generator string;
- a resemblance to any published atlas.

Record decisions in `expert-review-status.json → assetLicence`.

---

## 1. Source asset

| Field | Value |
|---|---|
| Name | `Human_Body_Master.blend` |
| Size | 224 401 653 bytes |
| SHA-256 | `f7313dabbf27d990ce1d7d3f771ebf1f914ffc5fb1162a7f71339bd3e6dc7fb0`, re-verified for this package: **matches its pin** |
| Location | the project owner's Desktop project folder, outside the repository |
| Access | **read-only throughout the project**; never modified |

Known, and not evidence of licence:

- It was supplied by the project owner at the start, with **no** transfer note, invoice, download record, subscription
  reference, commission agreement or terms of use.
- It was saved with Blender 5.0.119. The glTF exporter string is `Khronos glTF Blender I/O v5.0.21`, which identifies an
  exporter, not an origin.
- Scene names are "01 Complete anatomy", "02 Cutaway presentation" and "03 Internal organs study".
- Object names follow a `"<Structure> | <Side>"` convention.

## 2. Evidence table — required before release

| Field | Value | Status |
|---|---|---|
| **Source** | unknown | **PENDING** |
| **Author** | unknown | **PENDING** |
| **Licence** (name and text) | unknown | **PENDING** |
| **Permitted use**: derivative works | not established | **PENDING** |
| **Permitted use**: web redistribution of derived geometry and textures | not established | **PENDING** |
| **Permitted use**: educational / commercial scope | not established | **PENDING** |
| **Attribution**: required? wording? placement? | not established | **PENDING** |
| **Acquisition record** | none found | **PENDING** |
| **Copyright metadata** in the `.blend` or glTF | none present | **PENDING** |

## 3. What the web build ships that is derived from it

All of these are **derivative works** delivered to end users, which is why this blocks release. Every file is hashed
in `review-manifest.json → integrity`, and all are byte-identical to every candidate since Step 13:

- `public/assets/joints/elbow_r/elbow_r.{core,detail,context}.glb` and `joint-manifest.json`: the extracted, rigged,
  simplified elbow;
- `public/assets/body/v2/*`, `public/assets/body/v3/*` and the Step-11 body files: merged render groups, LOD
  simplifications, a vertex-coloured proxy;
- `public/assets/shared/body-materials.glb`: the material library carrying the source textures.

## 4. Narration audio — a separate question

The narration is **not** derived from the source anatomy.

| Field | Value | Status |
|---|---|---|
| Files | `public/assets/audio/narration/*.mp3`: **76 clips, 1 432 KB**, plus `narration.json` | recorded, hashed |
| Generator | Google Cloud Text-to-Speech, voice `en-IN-Chirp3-HD-Aoede` | recorded |
| Input text | this repository's locale strings (draft enrichment, figure reference, one source excerpt) | recorded |
| API key handling | supplied only through the environment at build time; **not** in the manifest, the audio files or the web build (a unit test checks the shipped manifest) | recorded |
| Step 16G | changed the playback timing only; **no clip was regenerated** for 16G | recorded |
| Provider terms permitting redistribution of synthesized audio in a published product | **not established** | **PENDING** |
| Attribution required by the provider | **not established** | **PENDING** |

## 5. Required before public release

1. Identify where `Human_Body_Master.blend` came from, and produce the licence or purchase terms.
2. Confirm the licence permits **derivative works**: rigging, simplification, merging, re-quantisation, texture baking.
3. Confirm it permits **redistribution of derived geometry and textures** over the web.
4. Establish **attribution**: whether it is required, the wording and the placement.
5. Confirm the permitted **scope** (educational and/or commercial).
6. Answer §4 for the narration audio.
7. Record the answers here, then replace the "source anatomy licence: pending" line in the product's Sources dialog.

Until then: **do not publish, do not distribute**, and do not describe the anatomy as open-source, public domain,
freely licensed or cleared for reuse.

## 6. Reviewer record

| | |
|---|---|
| Status | **RELEASE BLOCKER — PENDING** |
| Reviewer (name, role) | |
| Date | |
| Evidence consulted | |
| Findings | |
| Decision | |
