# Blender MCP workflow

All 3D assets were created, organised, given materials, inspected, validated, optimised, rendered and exported inside **Blender 5.2.2 LTS through the Blender MCP add-on** (Blender Foundation *blender_mcp*, installed as the `mcp` extension).

## Connector status and the bridge

Blender MCP has two halves:

```
MCP client ─stdio─▶ blender-mcp relay (Python venv) ─TCP 9876─▶ Blender MCP add-on (inside Blender)
```

In this session the MCP connector again failed to start: `EUNKNOWN: unknown error, uv_spawn`. **Windows Application Control blocks the relay’s venv `python.exe`.** That is a security policy, so it was left alone.

As the brief allows, the lesson uses the Blender MCP add-on through a small bridge, `tools/blender-mcp.mjs`, which replaces only the blocked relay:
- It speaks the add-on’s own protocol: null-byte-delimited JSON `{"type":"execute","code":…}` over TCP 127.0.0.1:9876.
- It runs the MCP’s own tool code (`blmcp/tools/*_toolcode.py`) with the same include expansion and calling convention, so the inspection tools are the real Blender MCP tools.
- Every call is logged to `blender/mcp-session.log.jsonl` (git-ignored).

```bash
node tools/blender-mcp.mjs start                                  # Blender (background) + MCP add-on server
node tools/blender-mcp.mjs exec blender/mcp/steps.py step=all     # build → validate → optimise → export → inspect
node tools/blender-mcp.mjs exec blender/mcp/steps.py step=render  # QA stills from the lesson cameras
node tools/blender-mcp.mjs tool get_objects_summary               # any Blender MCP tool
node tools/blender-mcp.mjs stop
```

If Application Control is relaxed later, the same `blender/mcp/steps.py` code can be sent unchanged through the MCP’s `execute_blender_code` tool.

## The brief’s 17 steps

| # | Step | How it was done (MCP call → result) |
|---|---|---|
| 1 | Inspect the new directory | New empty folder `Excretion in Plants - Class 10`. NCERT PDFs found in Downloads and copied to `ncert/`. |
| 2 | Create project structure | `blender/{scripts,mcp,source,checkpoints,renders}`, `web/`, `pipeline/narration/`, `docs/`, `ncert/`. |
| 3 | Create Blender source file | `step=reset`: empties the scene, builds the collection tree and saves `blender/source/Excretion_in_Plants_Working.blend`. |
| 4 | Build reusable plant asset | `step=plant` → `Plant`: stem, 7 branches, 33 leaves (incl. `Leaf_Hero` and `Leaf_Old` with its pivot at the petiole), roots, anchors, water and old-leaf paths, 10 camera references. **v001** |
| 5 | Leaf / detail asset | Part of `plant`: the hero leaf has its own veined texture, anchors and cameras. The leaf tissue is part of the cell asset. |
| 6 | Plant-cell asset | `step=cell` → `PlantCell`: leaf-tissue slice plus a cut-open hero cell (`Cell_Wall`, `Cytoplasm`, `Vacuole`, `Nucleus`, `Chloroplasts`). **v002** |
| 7 | Stem cross-section | `step=stem` → `StemSection`: bark, phloem, xylem, old xylem, pith, vessels, 16 resin/gum deposits and a lifting cover. **v003** |
| 8 | Root/soil view | `step=soil` → `RootSoil`: soil block split at a cut plane (the front half fades to a see-through shell), pebbles and a display base. **v004** |
| — | Waste visuals | `step=waste` → `WasteVisuals`: oxygen, water drop, vapour puff, stored waste, resin drop and soil waste particle. **v005** |
| 9 | Organise collections and names | `step=organise`: assets laid side by side in the source file (each returns to the origin on export), studio lights, and a 10 cm QA scale bar. The collection tree is exactly the brief’s (below). |
| 10 | Create materials | 30 `MAT_*` materials, created by the builders. `step=materials` writes the library (colour, roughness, alpha, users) to `docs/qa/blender-materials.json`: 0 unused. |
| 11 | Inspect geometry | Blender MCP tools `get_objects_summary`, `get_blendfile_summary_datablocks`, `get_blendfile_summary_missing_files`, and `get_object_detail_summary` for `Leaf_Hero`, `Vacuole`, `Xylem_Old`, `Roots` and `CAM_Vacuole`, saved to `docs/qa/mcp-inspection/`. Results: 195 objects, 86 meshes, 30 materials, 24 collections, 0 missing files. |
| 12 | Validate transforms | `step=validate` (`validate.py → check_transforms`): no zero, negative or non-finite scale, no non-uniform scale on parents, no un-applied mesh scale; all 192 exported objects checked. All 17 camera references checked too: each `CAM_` looks at its `TGT_` and is exported with its asset. |
| 13 | Validate scene structure | `check_structure`: the collection tree matches the brief exactly; each object is in exactly one collection; each mesh is filed by its lesson part (leaf → `LEAVES`, old xylem → `XYLEM`, …). Plus geometry (loose, degenerate, non-manifold), names (no `Cube.001`), materials, lesson metadata and placement (below). Result: **0 issues, 0 warnings** → **v006**. |
| 14 | Optimise | `step=optimise`: merge duplicate materials, cap textures at 1024 px, purge orphans, check triangle budgets. All within budget (table below). Re-validated → **v007** (the exported version). |
| 15 | Export GLB assets | `step=export`: one GLB per asset root, root reset to the origin, glTF extras on, JPEG textures. |
| 16 | Inspect the exported assets | `step=inspect_exports`: each GLB is imported back into a throw-away Blender scene and compared with its source (meshes, triangles, names, lesson metadata, cameras, root at origin); **all 5 identical**. Then `npm run assets:inspect` (gltf-transform) checks the Blender → Three.js node contract and writes `web/public/models/manifest.json`. |
| 17 | Integrate into Three.js | `web/src/assets/AssetLoader.js` loads the manifest and GLBs. The lesson addresses nodes by name: `ANCHOR_*` for labels and effects, `CAM_*`/`TGT_*` for framings, `PATH_*` for routes, and `part` metadata for picking and Explore. |

## Collections (exactly as briefed)

```
PLANT          STEM · BRANCHES · LEAVES · ROOTS
INTERNAL       STEM_CROSS_SECTION · XYLEM
CELL           CELL_BOUNDARY · CYTOPLASM · VACUOLE · NUCLEUS
WASTE_VISUALS  OXYGEN · WATER · STORED_WASTE · RESIN_GUM · SOIL_EXCRETION
ENVIRONMENT    SOIL
CAMERAS · LIGHTS · QA
```

Anchors and paths are filed with what they annotate: `ANCHOR_Vacuole` in `VACUOLE`, `PATH_Water_*` in `WATER`, `ANCHOR_Xylem_Old` in `XYLEM`, and so on. Bark, phloem and pith are in `STEM_CROSS_SECTION`; the leaf tissue is in `CELL`; the display base is in `SOIL`.

## Checkpoints (never overwritten)

`blender/source/Excretion_in_Plants_Working.blend` is saved after every step. Each milestone is a new numbered version in `blender/checkpoints/`. `common.save_version()` refuses to overwrite an existing file, so a re-run continues at v008. Each version is recorded with its validation result in `blender/checkpoints/checkpoints.json`.

| Version | Step | Contents | Validated |
|---|---|---|---|
| v001 | plant | Plant, anchors, paths, cameras (112 objects) | yes, 0 issues |
| v002 | cell | + plant cell (140 objects) | yes, 0 issues |
| v003 | stem | + stem cross-section (179) | yes, 0 issues |
| v004 | soil | + root/soil view (185) | yes, 0 issues |
| v005 | waste | + waste visuals (192) | yes, 0 issues |
| v006 | validate | all assets organised, full validation (195) | yes, 0 issues |
| v007 | optimise | optimised and re-validated: **the exported version** | yes, 0 issues |

## Validation and optimisation results

| Asset (GLB) | Meshes | Triangles | Budget | Size |
|---|---|---|---|---|
| plant.glb | 42 | 21,060 | 30,000 | 522.5 KB |
| root-soil.glb | 4 | 5,256 | 12,000 | 188.4 KB |
| plant-cell.glb | 9 | 12,380 | 20,000 | 222.6 KB |
| stem-cross-section.glb | 24 | 9,264 | 20,000 | 256.5 KB |
| waste-visuals.glb | 6 | 1,416 | 4,000 | 32.4 KB |
| **total** | 85 | 49,376 | | **1.22 MB** |

Placement checks, which catch floating objects and clipping:
- The stem is embedded in the soil.
- 0 root vertices lie outside the soil or behind the cut plane.
- Maximum leaf-to-branch gap is 0.000.
- The vacuole and nucleus are inside the cell wall and do not overlap.
- All 16 resin deposits are inside the old-xylem ring.

Reports: `docs/qa/blender-validation.json`, `blender-optimise.json`, `export-inspection.json`, `blender-materials.json`, `mcp-inspection/`.

QA stills from the lesson’s own cameras: `blender/renders/*.png` (11 shots). The Blender still of the cell cutaway is dark under the studio lights; in the lesson, the Three.js lighting shows the cell clearly (see `docs/qa-fix-plan.md`, P3).

## The Blender → Three.js contract

- Meshes carry glTF extras `part` and `label`, read by Three.js as `userData`.
- `CAM_*` and `TGT_*` are camera framings authored in Blender. `ANCHOR_*` are label and effect points. `PATH_Water_*` and `PATH_OldLeaf_*` are process routes.
- `npm run assets:inspect` fails if any node the lesson names is missing from an export.
