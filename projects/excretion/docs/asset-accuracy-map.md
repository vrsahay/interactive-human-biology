# Asset accuracy map (V2.1, updated for V2.4)

**V2.4.2 update:** Explore label anchors are computed at runtime from the visible surface of the selected structure (`web/src/lessons/SurfaceAnchor.js`); no model changed.

**V2.4 update:** four GLBs were re-exported (Blender v043–v048); the other eight are byte-identical to V2.3. What changed in each is below; the reasons are in [`deep-biological-audit.md`](deep-biological-audit.md).
- `01_plant`: a young woody plant, with a thicker trunk and bark up to the lowest branches and a green shoot above. The leaves have a faint green floor so none look black.
- `03_stoma`: the guard-cell chloroplasts move with the cells (their own shape key) and stay inside. The cells are joined at both ends by their own shape, with a thin shared end wall and no pole beads.
- `05_leaf_internal`: the section stoma is the same kidney-shaped pair as `03_stoma` (translucent, with chloroplasts). The palisade touches the upper epidermis, and there is a partial epidermis cell at the cut edge.
- `15_root_hairs` (V2.4.1): thinner, irregular hairs, each from its own cell and surrounded by grains; the soil water is static water bridges between grains and hairs.
- `14_root`: the xylem is pale tan, like the leaf-vein xylem, and distinct from amber resin.


V2.1 re-exported only `03_stoma`, `05_leaf_internal`, `06_plant_cell`, `10_stem_cross_section` and `15_root_hairs` (Blender v039). The other seven GLBs are byte-identical to V2.

There is one row per scale-specific GLB. All are built through Blender MCP from `blender/scripts/build_*.py` and exported to `web/public/models/`. They are validated by `blender/scripts/validate.py` and contract-checked by `web/scripts/inspect-assets.mjs`; the numbers are in `docs/qa/asset-inspection.md`.

**Source codes** (printed page numbers):
- **C10**: Class X Ch. 5.
- **C9C**: Class 9 Ch. 2.
- **C9T**: Class 9 Ch. 3.

Statuses are those of `biological-accuracy-audit.md`.

| Asset | Purpose | Scale | Source | NCERT relevance | Supporting source | Simplifications | Accuracy status |
|---|---|---|---|---|---|---|---|
| `01_plant.glb` | Whole plant: where every route starts and ends; old leaf that falls; water path; camera refs for the film | macro (≈ 1 m plant) | V1 plant, rebuilt in the V2 checkpoint series (v008) | N1, N2, N3, N5, N7, N10 (all routes are located on it) | C10 p. 94 (roots, stems, leaves) | Generic dicot sapling; branch and leaf counts stylised; roots confined to a soil block | EDUCATIONAL VISUALIZATION of a generic plant; parts DIRECTLY SUPPORTED |
| `02_leaf.glb` | One leaf, magnified: the first step from plant to cell | meso (one leaf) | new V2 | Leaves make food (context for N2) | C10 pp. 81, 94; C9T p. 32 (leaf epidermis with stomata) | Ovate blade, raised midrib, secondary veins and a vein net from textures; slightly thickened blade; stomata on the lower side only as faint specks | EDUCATIONAL VISUALIZATION; structure is BACKGROUND |
| `03_stoma.glb` (includes 04 guard cells) | The pore: gases and vapour leave; guard cells open and close it (morph target “Open”) | micro (one stoma, leaf surface) | new V2 | Route for N2, N3; the CO₂ discussion (p. 98 refers back) | C10 p. 83 (pores; guard cells swell → open, shrink → close; closed when CO₂ is not needed); C9T p. 32 | Bean-shaped guard cells with a few chloroplasts, **joined at both ends by a shared end-wall joint**; only the middles bow apart as the pore opens (V2.1, C-25). Jigsaw pavement cells without chloroplasts. One pore in focus, with two context stomata. The pore shape is interpolated between two authored states. | Guard-cell behaviour DIRECTLY SUPPORTED; shapes EDUCATIONAL VISUALIZATION / BACKGROUND |
| `05_leaf_internal.glb` | Inside the leaf: layers of cells, air spaces, a vein, a stoma; routes for O₂, CO₂ and water | micro (leaf cross-section block) | new V2 | Route for N2, N3; CO₂ by day and night | C10 pp. 82 (leaf section), 88 (inter-cellular spaces), 95 (xylem in the leaf, evaporation from cells); C9T p. 32 (cuticle, epidermis, loosely packed parenchyma) | Upper cells tall and packed with chloroplasts; lower cells rounder, with large air spaces. The terms “palisade” and “spongy” are not used. The front row of cells is translucent, with the **chloroplasts inside** (V2.1, C-29). One vein with xylem and phloem rings. Guard cells drawn as two short blobs. **Cuticle: a thin continuous waxy skin on both surfaces**, following the cells and open at the stoma (V2.1, C-27). | Layers and spaces SUPPORTED WITH MINOR PARAPHRASE; detail BACKGROUND |
| `06_plant_cell.glb` (includes 07 vacuole) | One leaf cell cut open: wall, membrane, cytoplasm, nucleus, chloroplasts, central vacuole with its membrane; wastes stored | micro (one cell) | V1 cell rebuilt in V2 | N6 | C9C pp. 13, 14, 18–19 | Box-like cell with rounded edges; nucleus pressed to one side by the large vacuole; translucent sap; neighbouring cells as ghosts; wastes drawn as purple crystals. **V2.1:** pale cream wall, not green (C-31); chloroplasts only on the side walls, none behind the vacuole (C-30). | Parts DIRECTLY SUPPORTED; storage animation EDUCATIONAL VISUALIZATION |
| `08_chloroplast.glb` | Where oxygen is made: double membrane, stroma, stacks of disc-shaped membranes | subcellular | new V2 | N2 (oxygen from photosynthesis) | C9C p. 18; C10 p. 82 | Front half cut away; 12 disc stacks joined by connecting sheets; stroma as a pale bowl; process: water to the discs, CO₂ used in the stroma, O₂ forms at the discs (C-05) | Structure DIRECTLY SUPPORTED; process EDUCATIONAL VISUALIZATION (true to BACKGROUND biology) |
| `10_stem_cross_section.glb` (includes 09 stem, 12 old xylem) | A magnified slice of stem: bark, phloem, xylem, old xylem with resin; lifting cover | meso (stem slice) | V1 section with a new V2 wood texture | N4, N8, N9 | C10 pp. 94, 98; C9T pp. 29, 33, 34 | Woody-stem texture: growth rings, rays, open pores in the younger xylem, resin-plugged pores in the older; older xylem placed inside (C-02). Sapwood and heartwood are not named (C-08). Pith is shown but not taught. **V2.1:** phloem coloured buff, not green (C-31). **V2.3:** old-xylem pores closed and dark brown, not amber; resin appears only through the deposits once storage is shown (C-42). | Tissues named DIRECTLY SUPPORTED; position EDUCATIONAL VISUALIZATION |
| `11_xylem.glb` (includes 13 resin/gum) | Xylem magnified: tube-like thick-walled cells (mostly dead), a band of living cells, older tubes filling with resin and gum | micro (xylem block) | new V2 | N4, N8, N9 | C9T p. 33 (tracheids, vessels, parenchyma, fibres; only parenchyma living); C10 p. 98 | Young vessels cut open with **spiral** thickenings only (real vessels also show other patterns, C-18); stacked vessel elements with rims; tapered tracheids; fibres; parenchyma with nuclei; resin and gum as amber masses in old vessels (C-19) | Cell types DIRECTLY SUPPORTED; wall patterns and resin form EDUCATIONAL VISUALIZATION |
| `14_root.glb` | One young root: root-hair zone, tip, a cut-open window with the central xylem strand | meso (root, ≈ 2 mm wide) | new V2 | Water in (context for N3); surface for N10 | C9T p. 32 (root hairs); C10 pp. 94–95 (water into the root and root xylem) | Hairs lengthen away from the tip and thin out higher up; the xylem is drawn as one central cylinder (a dicot root’s is star-shaped, C-09); the tip is not called “root cap” (C-21) | Root hairs and root xylem SUPPORTED WITH MINOR PARAPHRASE; shapes EDUCATIONAL VISUALIZATION |
| `15_root_hairs.glb` | Root hairs among soil particles: water taken in; wastes out into the soil | micro | new V2 | N10; water in (N3) | C9T p. 32; C10 pp. 94, 98 | Surface cells as rounded boxes with nuclei. **V2.1:** each of the four hairs swells out of the top of one surface cell, with that cell’s nucleus near the hair (C-28), and winds up through 62 packed grains that touch it (C-26). Water is shown as thin films on the grains and droplets at grain–grain and grain–hair contacts. Grain and cell sizes are compressed into one view (C-22). | EDUCATIONAL VISUALIZATION; hairs as epidermal outgrowths DIRECTLY SUPPORTED |
| `16_soil.glb` | Soil block the plant stands in; cut face for below-ground views | macro | V1 soil | N10 (destination) | C10 p. 94 (roots in contact with soil) | Layered cut face; pebbles; display base | EDUCATIONAL VISUALIZATION |
| `17_waste_visuals.glb` | Shared symbols: O₂, CO₂, water drop, vapour, waste, resin drop, soil waste | symbols | V1 + CO₂ added in V2 | All routes | — | One shape and colour per substance everywhere; sizes are not to scale | EDUCATIONAL VISUALIZATION |

## Scale transitions (how the assets chain)

| Route | Assets in order | Shots |
|---|---|---|
| plant → leaf → inside → chloroplast → inside → stoma → **back** to plant | 01 → 02 → 05 → 08 → 05 → 03 → 01 | `oxygen.look` … `oxygen.reason` |
| plant → soil → root hairs → root → plant → inside the leaf → stoma → **back** to plant | 01 → 15 → 14 → 01 → 05 → 03 → 01 | `water.enter` … `water.reason` |
| plant → leaf → tissue → cell → vacuole → **back** to plant | 01 → 05 → 06 → 01 | `vacuole.dive` … `vacuole.plant` |
| plant → stem → section → xylem → old xylem → section | 01 → 10 → 11 → 10 | `resin.travel` … `resin.try` |
| plant → roots → root hairs in soil → plant | 01 → 15 → 01 | `soil.travel` … `soil.reason` |

Every change of model is a cut behind a short tinted veil (leaf green, stem amber, soil brown). The camera starts each close-up from a wider framing of the new model and travels in. Returning to the plant starts from a close framing of the leaf surface and pulls back.
