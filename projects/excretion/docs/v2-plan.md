# V2 plan: audit findings, content decisions, asset system

V1 is preserved in `releases/v1/`: the playable build, its lesson data and its audit. V1 Blender checkpoints v001–v007 are untouched; V2 checkpoints start at v008.

## 1. V1 audit against the NCERT pages: gaps

| # | Gap in V1 | Source that supports filling it | V2 action |
|---|---|---|---|
| G1 | Gases leave “the leaf” with no route shown | C10 p. 83 (stomata; gas exchange through them); p. 88 (exchange through stomata, large intercellular spaces); C9 Ch. 3 p. 32 (stomata in the leaf epidermis) | Add stoma + guard cells and the leaf interior (air spaces); gases leave **through stomata**. Say once that gases are also exchanged across stems and roots (p. 83). |
| G2 | CO₂ not taught, though §5.5.2 refers back to it (“how plants deal with oxygen as well as CO₂”, p. 98) | C10 p. 89: at night CO₂ elimination is the major exchange; by day CO₂ from respiration is used in photosynthesis, so none is released | Add a **night** beat: respiration goes on; at night its CO₂ leaves through stomata. By day it is used in photosynthesis. |
| G3 | Guard cells absent | C10 p. 83: guard cells swell when water flows in, so the pore opens; the pore closes when they shrink | New stoma asset with open/closed guard cells. |
| G4 | Transpiration shown only as roots → stem → leaf → vapour | C10 pp. 94–95 (water enters roots; lost through stomata; evaporation from leaf cells); C9 Ch. 3 p. 32 (root hairs; evaporation of water vapour through stomata; transpiration also helps eliminate wastes) | Root hairs → xylem → leaf vein → mesophyll → air spaces → vapour → stoma → air. No pressure/cohesion mechanism beyond “evaporation”. |
| G5 | Photosynthesis shown as a glow on a leaf | C10 p. 82 (chloroplasts contain chlorophyll); C9 Ch. 2 p. 18 (double membrane, stroma, disc-shaped membranes with chlorophyll), p. 19 (chloroplasts help plants produce food) | Palisade cells → one chloroplast; oxygen produced where food is made. |
| G6 | Vacuole membrane not shown | C9 Ch. 2 p. 19 (single selectively permeable membrane, cell sap stores water, minerals, sugars and waste) | Visible vacuole membrane; call it “the vacuole’s membrane”. |
| G7 | “Old xylem is made mostly of dead cells”: an inference | C9 Ch. 3 p. 33 (xylem parenchyma is the only living part of xylem; tracheids, vessels and fibres are sclerenchymatous; most sclerenchyma cells are dead; lignin) | Say what the source says: **xylem is made mostly of dead, thick-walled cells**; resins and gums are stored **especially in old xylem** (p. 98). New xylem close-up asset. |
| G8 | “Leaves also fall for other reasons”: not in the source | none | Remove the unsupported clause. Use “losing a leaf is **one way** a plant can get rid of stored wastes” (p. 98 + p. 99), which does not claim a purpose. |
| G9 | Types of waste never summarised | C10 p. 98 (oxygen, CO₂, excess water, other wastes) | ~~Chapter 02 names the kinds of waste before the journey.~~ **Withdrawn at the content freeze:** it named oxygen as a waste before the learner discovers it (teach-first). The kinds are gathered in chapter 04 instead (biological-accuracy-audit C-12). |

## 2. Decisions on the flagged claims

| Claim | Source / page | Status | Decision |
|---|---|---|---|
| “Old xylem is mostly dead cells” | C9 Ch. 3 p. 33 (xylem mostly non-living); C10 p. 98 (many tissues consist of dead cells) | SUPPORTED WITH MINOR PARAPHRASE for **xylem**; “old” is not stated | Say “xylem is made mostly of dead, thick-walled cells” and, separately, “resins and gums are stored especially in old xylem”. |
| “Old xylem / heartwood is near the centre” | not in the source | NOT SUPPORTED (as text) · EDUCATIONAL VISUALIZATION (as geometry) | The model follows real woody-stem anatomy (older xylem inside); no narration or caption states a position. The words “heartwood” and “sapwood” are not used. |
| Sapwood vs heartwood | not in the source | NOT SUPPORTED | Not named. The stem section shows younger (paler) and older (darker, resin-filled) xylem, and only “old xylem” is named. |
| “Leaves also fall for other reasons” | not in the source | NOT SUPPORTED | Removed (G8). |
| Abscission zone | not in the source | NOT SUPPORTED as a term | Not named. The leaf detaches at the base of the leaf stalk (EDUCATIONAL VISUALIZATION). |
| Chloroplast statements | C10 p. 82; C9 Ch. 2 pp. 18–19 | DIRECTLY SUPPORTED | Allowed: green bodies containing chlorophyll; double membrane; stroma; disc-shaped membranes containing chlorophyll; help the plant make food. |
| Guard-cell details | C10 p. 83 | DIRECTLY SUPPORTED | Allowed: two guard cells; swell with water, pore opens; shrink, pore closes. Guard-cell chloroplasts, wall thickening and kidney shape are shown but not narrated (EDUCATIONAL VISUALIZATION). |
| Root hair / xylem pathway | C9 Ch. 3 p. 32 (root hairs increase the absorbing surface); C10 pp. 94–95 (water moves into the root, into the root xylem, up to the leaves) | SUPPORTED | Allowed: root hairs absorb water; water reaches the xylem and rises. The route across the root cortex is schematic and not narrated. |
| CO₂ and respiration wording | C10 pp. 88–89, 98 | DIRECTLY SUPPORTED | “Plant cells also respire, by day and by night. Respiration makes carbon dioxide.” By day it is used in photosynthesis; at night getting rid of CO₂ is the main exchange. **Revised at the freeze:** the route at night is not narrated, because p. 83 says the plant closes its stomata when it does not need CO₂ (biological-accuracy-audit C-11). No biochemistry. |
| Stomata as the only gas route | C10 p. 83 contradicts it | would be NOT SUPPORTED | Say once that gases also pass across the surface of stems and roots. |
| “Tonoplast” | not in the source | NOT SUPPORTED as a term | Shown as “the vacuole’s membrane” (C9 p. 19). |
| Soil excretion “through roots” | C10 p. 98 (“into the soil around them”); p. 94 (roots are the part in contact with the soil) | SUPPORTED WITH MINOR PARAPHRASE / EDUCATIONAL VISUALIZATION | The route is shown from root surfaces to the soil, schematically; no mechanism is named. |

## 3. Asset system: reusable, scale-specific GLBs

| File | Scale | Contents | New / from V1 |
|---|---|---|---|
| `01_plant.glb` | macro | whole plant (stem, branches, leaves, roots), anchors, paths, cameras | V1 plant, bark and leaf detail upgraded |
| `02_leaf.glb` | meso | one leaf: blade with raised midrib and veins, leaf stalk, upper and lower surfaces | new |
| `03_stoma.glb` | micro | lower-epidermis patch: pavement cells, one stoma with two guard cells (open/closed shape), pore, cuticle | new (includes the brief’s 04 guard cells) |
| `05_leaf_internal.glb` | micro | leaf cross-section: cuticle, upper epidermis, palisade, spongy mesophyll with air spaces, vein (xylem + phloem), lower epidermis with a stoma and the air space behind it | new |
| `06_plant_cell.glb` | micro | cut-open leaf cell: wall, cell membrane, cytoplasm, nucleus, chloroplasts, central vacuole with its membrane | V1 cell rebuilt (includes the brief’s 07 vacuole) |
| `08_chloroplast.glb` | subcellular | double membrane (cut open), stroma, stacks of disc-shaped membranes | new |
| `10_stem_cross_section.glb` | meso | woody stem slice: bark, phloem, younger xylem, older resin-filled xylem, rings, vessels, rays; lifting cover | V1 section rebuilt (includes the brief’s 09 stem, 12 sapwood/old xylem) |
| `11_xylem.glb` | micro | xylem block: vessels and tracheids with thick walls, living xylem parenchyma, resin and gum in old vessels | new (includes the brief’s 13 resin/gum) |
| `14_root.glb` | meso | root tip with root cap and a root-hair zone | new |
| `15_root_hairs.glb` | micro | epidermal cells growing root hairs among soil particles and water films | new |
| `16_soil.glb` | macro | soil block with cut face, pebbles, base | V1 root-soil |
| `17_waste_visuals.glb` | symbols | O₂, CO₂, water drop, vapour, dissolved waste, resin drop, soil waste | V1 + CO₂ |

Each is optimised on its own: microscopic geometry never ships inside the plant, and the close-ups carry the detail.

## 4. Lesson outline V2 (content to be frozen before narration)

01 What is excretion? → 02 Why is plant excretion different? (kinds of waste; the question) → 03 Follow the waste:
- **a. In the leaf, by day:** leaf → inside the leaf → chloroplast → oxygen → air spaces → stoma → air. Your turn: sunlight.
- **b. The stoma:** guard cells swell (pore opens) or shrink (pore closes); gases also cross stems and roots.
- **c. At night:** respiration CO₂ leaves through stomata.
- **d. Water:** root hairs → xylem → leaf → air spaces → vapour → stoma = transpiration.
- **e. Inside a cell:** vacuole storage. Your turn: store the wastes.
- **f. An older leaf:** storage and fall.
- **g. Inside the stem:** xylem, old xylem, resins and gums. Your turn: find the tissue.
- **h. Around the roots:** root hairs and soil.

04 The whole picture → 05 Recall.
