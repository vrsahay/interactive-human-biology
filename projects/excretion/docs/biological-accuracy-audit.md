# Biological accuracy audit (V2 → V2.4)

**Gate:** content is frozen (`web/scripts/content-freeze.mjs --freeze`) only if this file lists **no open P0**, and `qa:content` and `qa:audit` pass. The Google TTS pipeline refuses to synthesise narration that does not match the freeze.

**Sources** (in `ncert/`; printed page numbers):
- **C10**: NCERT *Science*, Class X, Ch. 5 *Life Processes*. §5.5.2 is on p. 98.
- **C9C**: NCERT *Exploration*, Grade 9, Ch. 2 *Cell*.
- **C9T**: NCERT *Exploration*, Grade 9, Ch. 3 *Tissues in Action*.

The sentence-by-sentence NCERT check is in [`ncert-content-audit.md`](ncert-content-audit.md), generated from `web/src/data/ncert-audit.js`: 292 lines (V2.2), 0 NEEDS REVISION, 0 NOT SUPPORTED. This file covers the biology itself: what the narration **says**, what the models and animations **show**, and whether each is true, supported by the source, or a declared simplification.

### Status vocabulary

| Status | Meaning |
|---|---|
| DIRECTLY SUPPORTED | The source says it. |
| SUPPORTED WITH MINOR PARAPHRASE | The source says it in other words, or states something that directly implies it. |
| BACKGROUND | True, standard biology the source does not state. Shown, never narrated as a textbook fact. |
| PREREQUISITE | Taught earlier (Class 9, or earlier in Class X Ch. 5) and briefly restated. |
| EDUCATIONAL VISUALIZATION | A drawing decision: shape, colour, symbol, motion, scale. Not a claim. |
| NEEDS REVIEW | Open question for a teacher. |
| NOT SUPPORTED | Not in the source, or wrong. It must be removed or reworded before the freeze. |

### Severity

| Level | Meaning |
|---|---|
| **P0** | A wrong or unsupported statement on the learner surface (narration, caption, heading, label, task, Recall, Explore), or a visual that teaches something false. Blocks the freeze. |
| P1 | A visual or wording that could mislead but is disclosed or narrowly scoped. |
| P2 | A polish item. |

## 1. Claims the brief asked to review explicitly

| ID | Claim | Source | Page | Status | Required revision | Sev. | State |
|---|---|---|---|---|---|---|---|
| C-01 | V1: “Old xylem … is made mostly of dead cells.” | C10 (“many of their tissues consist of dead cells”); C9T (xylem parenchyma is the only living component; tracheids, vessels and fibres are sclerenchymatous; most sclerenchyma cells are dead) | C10 98; C9T 33 | NEEDS REVIEW in V1: the sources say it of **xylem**, not of “old” xylem | Reworded. `resin.old`: “Many plant tissues are made mostly of dead cells, and xylem is one of them.” `xylem.cells`: “xylem is made of tube-like cells with thick walls. Most of them are dead. Only a few xylem cells are living.” Now SUPPORTED WITH MINOR PARAPHRASE. | P0 | RESOLVED |
| C-02 | “Old xylem / heartwood is near the centre.” | not in the source | — | NOT SUPPORTED as text; EDUCATIONAL VISUALIZATION as geometry | No narration, caption or label states a position. The stem model follows real woody-stem anatomy (older xylem inside, younger outside, next to the cambium line); that is BACKGROUND, shown only. | P1 | RESOLVED |
| C-03 | V1: “Leaves also fall for other reasons.” | not in the source | — | NOT SUPPORTED (V1’s only X line) | Removed. `leaves.reason` now: “Losing leaves is one way a plant can get rid of stored wastes.” SUPPORTED WITH MINOR PARAPHRASE (C10 p. 99, “removed in the falling leaves”). It claims no purpose for leaf fall, so the brief’s concern (not implying leaves fall only to remove waste) is met without an unsupported sentence. | P0 | RESOLVED |
| C-04 | Chloroplasts: “small green bodies”, “contain chlorophyll, which photosynthesis needs”, “in sunlight, chloroplasts help the leaf use carbon dioxide and water to make food”; label “Discs with chlorophyll”; Explore: two membranes, stroma, disc-shaped membranes containing chlorophyll | C10 (“chloroplasts which contain chlorophyll”); C9C (double-membrane-bound; stroma; disc-shaped membrane structures that contain chlorophyll; chloroplasts help plants produce food) | C10 81–82; C9C 18–19 | DIRECTLY SUPPORTED / SUPPORTED WITH MINOR PARAPHRASE | None. “Thylakoid” and “granum” are not used on the learner surface. The glTF part id `thylakoid` is internal only. | — | RESOLVED |
| C-05 | Chloroplast animation: where CO₂, water and O₂ go | BACKGROUND (water is split and O₂ released at the thylakoid membranes; CO₂ is fixed in the stroma) | — | EDUCATIONAL VISUALIZATION, not narrated | **Fixed during this audit.** The first V2 build drew CO₂ being used up *at the discs*. Now water goes to the discs, CO₂ is used in the stroma between them, and O₂ forms at the discs. No step is named. | P1 | RESOLVED |
| C-06 | Guard cells: two per stoma; swell when water flows in and the pore opens; the pore closes if they shrink; the plant closes stomata when it does not need CO₂, since much water can be lost through them | C10 | 83 | DIRECTLY SUPPORTED | None. Shown but not narrated (EDUCATIONAL VISUALIZATION): the bean shape; chloroplasts in the guard cells; water drops moving in when opening and out when closing. The source says only “shrink”, so the narration does not say “lose water”. | — | RESOLVED |
| C-07 | Abscission zone | not in the source | — | NOT SUPPORTED as a term | Not named. The old leaf detaches at the base of its stalk (EDUCATIONAL VISUALIZATION; consistent with real abscission at the petiole base). | — | RESOLVED |
| C-08 | Sapwood vs heartwood | not in the source | — | NOT SUPPORTED as terms | Not named anywhere. The stem texture shows paler younger xylem with open pores and darker older xylem with resin-plugged pores (BACKGROUND, shown only). Only “xylem” and “old xylem” are named. | — | RESOLVED |
| C-09 | Root hairs and the route to the xylem: “the root has tiny root hairs. They give it a large surface for taking in water from the soil.” “The water moves on into the root, and into its tubes called xylem.” | C9T (root hairs are epidermal outgrowths that increase the surface area for absorption); C10 (water moves into the root and into the root xylem) | C9T 32; C10 94–95 | SUPPORTED WITH MINOR PARAPHRASE | The path across the root (cortex, endodermis) is drawn as one smooth stream and not narrated (EDUCATIONAL VISUALIZATION). Root xylem is drawn as a central strand; a dicot root’s xylem is star-shaped (P2 simplification, disclosed in the asset map). | — | RESOLVED |
| C-10 | CO₂ and respiration: “Plant cells also respire, by day and by night. Respiration makes carbon dioxide.” “By day, this carbon dioxide is used up in photosynthesis, so the leaf does not give it out. Oxygen is what leaves.” “At night there is no photosynthesis. Then getting rid of carbon dioxide is the main gas exchange going on.” | C10 (“CO₂ generated during respiration is used up for photosynthesis, hence there is no CO₂ release … oxygen release is the major event”; “At night … CO₂ elimination is the major exchange activity”) | 89 | DIRECTLY SUPPORTED; “by day and by night” is SUPPORTED WITH MINOR PARAPHRASE (p. 89 describes respiration CO₂ in both) | None. No biochemistry. “Is used up” follows the source’s wording. | — | RESOLVED |

## 2. Further claims found in the V2 review

| ID | Claim | Source | Page | Status | Required revision | Sev. | State |
|---|---|---|---|---|---|---|---|
| C-11 | **Route of CO₂ at night.** The draft planned: “at night CO₂ leaves through the stomata.” | C10 p. 83: the plant **closes** these pores when it does not need carbon dioxide | 83, 89 | Would have been NOT SUPPORTED, and contradicted by the source | Reworded before narration. No sentence names a night route. The leaf-interior view shows CO₂ moving through the air spaces and slowly out (EDUCATIONAL VISUALIZATION; in real plants stomata are mostly, not completely, closed at night). The stoma close-up is never shown open at night. | P0 | RESOLVED |
| C-12 | Draft shot “What wastes does a plant have? … oxygen and carbon dioxide, extra water …” before the journey | C10 p. 98 | 98 | True, but it named oxygen as a waste before the learner discovers it (teach-first; content QA “term first spoken where taught”) | Shot removed at the freeze; V2 plan item G9 withdrawn. Kinds of waste are named as they are discovered and gathered in chapter 04. | P1 | RESOLVED |
| C-13 | Stomata as the only way gases leave | C10 p. 83: “exchange of gases occurs across the surface of stems, roots and leaves as well” | 83 | Implying only stomata would be NOT SUPPORTED | Added `stoma.other`: “Gases are also exchanged across the surface of stems and roots.” DIRECTLY SUPPORTED. | P1 | RESOLVED |
| C-14 | “A great deal of gas exchange in a leaf happens through its stomata, and a lot of water can be lost through them too.” | C10 (“Massive amounts of gaseous exchange takes place in the leaves through these pores”; “large amounts of water can also be lost through these stomata”) | 83 | SUPPORTED WITH MINOR PARAPHRASE | None. | — | RESOLVED |
| C-15 | Oxygen route: “leaves the cells and spreads through the air spaces. It reaches a tiny pore in the leaf’s surface.” “This tiny pore is called a stoma. Through it, the oxygen passes out into the air.” | C10 (exchange through stomata; large inter-cellular spaces; diffusion out into the air); C9T (the epidermis contains pores called stomata) | C10 83, 88–89; C9T 32 | SUPPORTED WITH MINOR PARAPHRASE | None. The model puts stomata on the lower surface (BACKGROUND for most dicots, not narrated). | — | RESOLVED |
| C-16 | Transpiration route: “In a leaf, water passes out of the xylem, into the cells around it.” “From the cells, some water evaporates into the air spaces, as water vapour.” “The water vapour escapes through the stomata, into the air.” | C10 (water lost through stomata is replaced by water from the xylem vessels in the leaf; evaporation of water molecules from the cells of a leaf; loss of water as vapour from aerial parts is transpiration); C9T (evaporation of water vapour through stomata) | C10 95; C9T 32 | SUPPORTED WITH MINOR PARAPHRASE | “Into the air spaces” adds the location of the evaporation (BACKGROUND; consistent with “inter-cellular spaces”, p. 88). No cohesion or tension mechanism is taught. | — | RESOLVED |
| C-17 | Vacuole membrane: “a storage space inside the cell, with its own thin membrane around it” | C9C (one large central vacuole surrounded by a single selectively permeable membrane; stores water, minerals, sugars and waste) | 19 | SUPPORTED WITH MINOR PARAPHRASE | “Tonoplast” is not used. | — | RESOLVED |
| C-18 | Xylem close-up: tubes with thick walls; spiral wall thickenings; tapered tracheids; thick-walled fibres; a band of living parenchyma with nuclei | C9T (tracheids and vessels are tubular and thick-walled; parenchyma is the only living part; sclerenchyma walls are thickened with lignin) | 33 | Cell types DIRECTLY SUPPORTED; wall patterns are EDUCATIONAL VISUALIZATION | Every young vessel shows **spiral** thickenings. Real vessels also show annular, reticulate and pitted walls. Disclosed in the asset map; not narrated. | P2 | RESOLVED |
| C-19 | Resin and gum in old xylem, drawn as amber masses filling old vessels | C10 (“stored as resins and gums, especially in old xylem”) | 98 | Storage DIRECTLY SUPPORTED; the filling of vessel lumens is EDUCATIONAL VISUALIZATION | Real deposits are found in the cell walls and cavities of older wood, and in resin ducts in some plants; these are not shown or named. The narration says only “stored here, as resins and gums”. | P2 | RESOLVED |
| C-20 | Wastes into the soil from root surface cells | C10 (“excrete some waste substances into the soil around them”) | 98 | SUPPORTED WITH MINOR PARAPHRASE; route EDUCATIONAL VISUALIZATION | No mechanism is named (for example, “exudation”). | — | RESOLVED |
| C-21 | Root cap | not in the source | — | NOT SUPPORTED as a term | Not named. The tip is labelled “Root tip” in Explore. | — | RESOLVED |
| C-22 | Relative sizes: particles, cells, chloroplast, stoma, root hairs and soil grains | — | — | EDUCATIONAL VISUALIZATION | Each close-up is magnified by a different amount. Molecules are symbols, drawn far larger than real ones. Disclosed in the teacher note (Settings → For teachers) and the asset map. No magnification numbers are shown, so none can be wrong. | P2 | RESOLVED |
| C-23 | Leaf-surface cells without chloroplasts; guard cells with chloroplasts | — | — | BACKGROUND (true for most dicot leaves) | Shown, not narrated. | — | RESOLVED |
| C-24 | O₂ symbol (two pale-blue spheres), CO₂ symbol (dark centre, two pale ends), water drop, vapour puff, purple waste, amber resin | — | — | EDUCATIONAL VISUALIZATION | Each substance keeps one shape and colour everywhere (accessibility: shape carries meaning as well as colour). | — | RESOLVED |

## 2a. V2.1 correction pass (from `v2-self-review.md`)

Model corrections are validated in Blender checkpoints v029–v039 (v039 is the exported state). Only the five affected GLBs were re-exported; the other seven are byte-identical to V2.

| ID | Claim or depiction | Source | Page | Status | Required revision | Sev. | State |
|---|---|---|---|---|---|---|---|
| C-25 | Stoma model: the guard cells came apart at both ends when the pore opened (A1) | C10 (the guard cells swell → the pore opens); BACKGROUND: the two guard cells are joined at both ends | 83 | Was a misleading depiction | **Fixed in geometry.** The poles stay put and overlap, a shared end-wall joint bridges both cells, and only the middles bow apart. Checked closed, half-open and open, including the two context stomata (v029). | P1 | RESOLVED |
| C-26 | Root hairs stood in empty space; soil grains were placed away from them (A2) | C9T (root hairs absorb water and minerals **from the soil**) | 32 | Was a misleading depiction | **Fixed.** 62 grains packed round and touching the hairs, with water films and droplets at the grain–hair contacts. No grain passes through a hair or cell (v030). | P1 | RESOLVED |
| C-27 | Cuticle drawn as a floating strip above the upper surface only (A3) | C9T (cells covered with a waxy layer of cutin called cuticle) | 32 | Was a misleading depiction | **Fixed.** A thin continuous waxy skin on the outer face of both epidermises, following each cell and open at the stoma. Thicker above, thinner below (BACKGROUND) (v031, v036). | P1 | RESOLVED |
| C-28 | Root hairs appeared to start between two cells (A5) | C9T (hair-like projections arise from epidermal cells; root hairs) | 32 | Was a misleading depiction | **Fixed.** Each hair swells out of the top centre of one epidermal cell, and that cell’s nucleus sits near the hair base (v030). | P2 | RESOLVED |
| C-29 | Leaf chloroplasts appeared stuck to the outside of cells (A4) | C9C (chloroplasts are organelles inside cells) | 18 | Was a misleading depiction | **Fixed.** The front row of cells is translucent, with the chloroplasts inside, lying just within the cell wall (v031). | P2 | RESOLVED |
| C-30 | Chloroplasts behind the translucent vacuole looked stored inside it (A6) | C9C (the vacuole stores water, minerals, sugars and waste material) | 19 | Was a misleading depiction | **Fixed.** No chloroplasts on the back wall; the chloroplasts line the side walls in the cytoplasm (v032). | P2 | RESOLVED |
| C-31 | Cell wall and stem phloem coloured bright green (A7, A8) | BACKGROUND: cellulose walls and phloem are not green tissues | — | EDUCATIONAL VISUALIZATION | **Fixed.** Pale cream wall; buff phloem ring, still distinct from the dark bark and the cream xylem (v032, v033). | P2 | RESOLVED |
| C-32 | Learner-facing: “Respiration makes carbon dioxide, and this carbon dioxide is a gaseous waste.” Then “carbon dioxide from respiration is a waste … By day, the same gas is used … as an input for photosynthesis.” | C10 (“how organisms get rid of **gaseous wastes generated during** photosynthesis or **respiration**”; p. 89 day and night) | 96, 89 | DIRECTLY SUPPORTED / MINOR PARAPHRASE | New in V2.1. The order is waste → given out at night → input by day (B2). | — | RESOLVED |
| C-33 | Learner-facing: “Plants use dead tissues like this as places to store some of their wastes.” | C10 (“For other wastes, plants use the fact that many of their tissues consist of dead cells”) | 98 | SUPPORTED WITH MINOR PARAPHRASE | New in V2.1 (B1). No other cell-death biology is added. | — | RESOLVED |
| C-34 | Learner-facing: “Closing its stomata keeps the plant from losing too much water.” It replaces “closes its stomata when it does not need carbon dioxide”, which came before the day/night section. | C10 (“Since large amounts of water can also be lost through these stomata, the plant closes these pores …”) | 83 | SUPPORTED WITH MINOR PARAPHRASE | New in V2.1 (B3). | — | RESOLVED |
| C-35 | Guard cells “swell and curve apart” | C10 (the guard cells swell) | 83 | SUPPORTED WITH MINOR PARAPHRASE | Describes the model’s shape change. The source states only swelling → the pore opens. | — | RESOLVED |

## 2b. V2.2 final correction pass

| ID | Claim or depiction | Source | Page | Status | Required revision | Sev. | State |
|---|---|---|---|---|---|---|---|
| C-36 | Learner-facing: “**Gases** and extra water leave the plant.” (was “Oxygen and extra water”) | C10 (oxygen as waste, p. 98; CO₂ given out at night, p. 89; excess water, p. 98) | 98, 89 | SUPPORTED WITH MINOR PARAPHRASE | Meaning unchanged; now includes the CO₂ taught just before. | — | RESOLVED |
| C-37 | Old xylem shown glowing (the narration says “darker”) | — | — | Was a misleading depiction | The warm highlight was removed; the old xylem keeps its natural darker colour, with a soft focus on the rest. | P1 | RESOLVED |
| C-38 | “Soil” label beside the roots | — | — | Was a misleading label position | Anchored in open soil, more than 0.1 from any root, on every screen shape. | P1 | RESOLVED |
| C-39 | Respiration CO₂ shown forming in the leaves **by day, not given out** | C10 (by day, CO₂ from respiration is used in photosynthesis, so there is no CO₂ release) | 89 | EDUCATIONAL VISUALIZATION consistent with the source | The CO₂ stays on the leaves in this day shot; it is given out only in the night shot. | — | RESOLVED |
| C-40 | Water vapour shown leaving through the open stoma alongside oxygen | C10 (water can be lost through stomata); C9T (evaporation of water vapour through stomata) | 83; 32 | EDUCATIONAL VISUALIZATION of a supported statement | — | — | RESOLVED |

## 2c. V2.3 (screen-only fixes)

| ID | Depiction | Status | Revision | State |
|---|---|---|---|---|
| C-41 | The “Oxygen” label pointed at a disc stack | Was a misleading label | Now on an O₂ molecule | RESOLVED |
| C-42 | Old-xylem pores amber (resin) in the stem slice before storage was taught; empty in the xylem close-up | Was inconsistent across scales and gave the answer away early | Pores closed and dark brown; amber appears only once storage is shown (EDUCATIONAL VISUALIZATION, consistent with C-19) | RESOLVED |
| C-43 | Full night CO₂ stream through the leaf’s pore | Was a depiction at odds with “stomata close” (C-11) | Thin, slow stream (stomata mostly, not completely, closed at night) | RESOLVED |
| C-44 | Soil wastes moving along a root hair | Was misleading about the route | Wastes leave a surface cell into the soil between grains; no mechanism named (C-20) | RESOLVED |

## 2d. V2.4 (deep biological and 3D audit corrections)

The full 3D and animation audit is [`deep-biological-audit.md`](deep-biological-audit.md) (DA-01 … DA-25). Every correction was visual only; no narration or on-screen text changed. The ones that bear on biology:

| ID | Depiction | Status | Revision | State |
|---|---|---|---|---|
| C-45 (DA-01) | Guard-cell chloroplasts ended up outside the guard cells when the stoma closed | Was an incorrect depiction | The chloroplasts move with their cell and stay inside at every opening (checked in Blender) | RESOLVED |
| C-46 (DA-02, DA-03) | Liquid water drops in the leaf's air spaces, with the “Water vapour” label on a drop | Was misleading about the state of water | Liquid stays in the xylem and cells; it becomes vapour at the cells' surface and only vapour crosses the air space to the stoma (C10 pp. 94–95) | RESOLVED |
| C-47 (DA-08, DA-24) | Water drawn running over the outside of the stem, and over the leaf surface into the guard cells | Was misleading about the route | Water is seen inside the plant: a see-through stem with a xylem channel; guard cells fill from inside the leaf | RESOLVED |
| C-48 (DA-05, DA-06) | Guard-cell pole “beads” read as extra cells; the leaf-slice guard cells were round blobs without chloroplasts | Was ambiguous | Two kidney-shaped guard cells joined at both ends, the same in the close-up and in the leaf slice | RESOLVED |
| C-49 (DA-07) | An empty band under the upper epidermis | Was a false air layer | The palisade cells touch the upper epidermis | RESOLVED |
| C-50 (DA-09) | The root xylem had the same orange as resin | Was ambiguous | Pale tan, like xylem at every other scale | RESOLVED |
| C-51 (DA-10) | A heartwood stem slice from a small green sapling | Was inconsistent in context | The plant is a young woody plant with a barked trunk (C10 p. 98 “old xylem” is now plausible for it) | RESOLVED |
| C-52 (DA-11, DA-16) | Stored wastes drawn as crystals on the leaf surface; the leaf yellowed while they arrived | Was misleading (“on the surface”; “wastes cause yellowing”) | Stored inside the leaf tissue; the leaf ages only when “time passes” | RESOLVED |

The kept visual choices (DA-13, DA-14, DA-15, DA-17, DA-20, DA-21) are listed in [`accepted-simplifications.md`](accepted-simplifications.md).

## 3. Result

**No open P0** (re-checked in V2.1 and again after V2.4; see also `deep-biological-audit.md`: no P0 or P1 open). Three P0 issues were found and resolved before the V2 freeze:
- **C-01:** the old-xylem wording.
- **C-03:** “leaves also fall for other reasons”.
- **C-11:** the night route through the stomata.

One visual error was corrected: **C-05**, where CO₂ had been drawn as used at the discs.

Remaining P1/P2 items are declared simplifications. They are listed in [`asset-accuracy-map.md`](asset-accuracy-map.md) and stated in the teacher note.
