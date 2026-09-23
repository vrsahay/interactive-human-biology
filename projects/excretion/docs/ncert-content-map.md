# NCERT content map

**Source of truth:** NCERT *Science*, Class X, Chapter 5 *Life Processes*, §5.5.2 **Excretion in Plants, page 98** (reprint 2026-27, `ncert/class10_ch05_life_processes_jesc105.pdf`). The chapter summary on p. 99 restates it.

Machine-readable version: `web/src/data/ncert-content-map.js`. `npm run qa:content` checks that every idea is taught, summarised and recalled. The sentence-by-sentence audit is `docs/ncert-content-audit.md`.

## The ten ideas of §5.5.2 and where each is taught

| ID | Idea (p. 98) | Where in the lesson | What the learner sees | Final map | Recall / Explore |
|---|---|---|---|---|---|
| N1 | Plants use completely different strategies for excretion than animals. | 02 `different.animals` → `different.none` → `different.question` | A kidney figure beside the plant; the plant’s parts light up; the central question with a pause. | `whole.answer` (“No single organ. Many ways.”) | Open prompt; Explore “Whole plant”. |
| N2 | Oxygen can be thought of as a waste product generated during photosynthesis. | 03 · At a leaf: `oxygen.look` → `photo` → `produce` → `release` → `reason` → **try** | Sunlight on the leaf; oxygen molecules form, then drift out into the air; the learner brings the sunlight in. | `whole.oxygen` (Leaf → oxygen → air) | Q “Which gas…?”; Explore “Leaf”. |
| N3 | Plants can get rid of excess water by transpiration. | 03 · Water in the plant: `water.question` → `enter` → `rise` → `vapour` → `reason` | Water drops enter a root, the camera follows one up the stem to a leaf, and vapour escapes. | `whole.water` (Leaf → excess water → air) | Q “How do plants get rid of excess water?”; Explore “Leaf”. |
| N4 | Many plant tissues consist of dead cells. | 03 · Inside the stem: `resin.old` | Old xylem picked out; “like many plant tissues: mostly dead cells”. | Linking idea (the reason old xylem can hold wastes). | Explore “Old xylem”. |
| N5 | Plants can lose some parts, such as leaves. | 03 · An older leaf: `leaves.lose` → `leaves.fall` | The older leaf falls from the plant. | Linking idea (shown in the leaf route). | Q “What happens to leaves…?” |
| N6 | Many plant waste products are stored in cellular vacuoles. | 03 · Inside a cell: `vacuole.pivot` → `dive` → `tissue` → `cell` → `store` → `reason` → **try** → `back` → `plant` | The scale journey plant → leaf → tissue → cell → vacuole; wastes drift into the vacuole and stay; the learner stores the last ones; the camera returns to the plant. | `whole.vacuole` (Cell → waste → vacuole, with a window on the cell) | Q “Where can many plant waste products be stored inside cells?”; Explore “Plant cell”, “Vacuole”. |
| N7 | Waste products may be stored in leaves that fall off. | 03 · An older leaf: `leaves.look` → `load` → `fall` → `reason` | Wastes gather in the older leaf; it yellows and falls; the wastes lie with it on the soil. | `whole.leaf` (Leaf → stored waste → leaf fall) | Q “What happens to leaves containing stored waste?” |
| N8 | Other waste products are stored as resins and gums. | 03 · Inside the stem: `resin.store` → `resin.reason` | Wastes move into the stem slice and become amber resin and gum drops. | `whole.xylem` (Old xylem → resins and gums → stored) | Q “Where are resins and gums stored, especially?” |
| N9 | … especially in old xylem. | 03 · Inside the stem: `resin.reason` → **try** | Labels on the resin and old xylem; the learner finds the old xylem themselves. | `whole.xylem` (with a window on the stem) | Same question; Explore “Stem cross-section”, “Old xylem”. |
| N10 | Plants also excrete some waste substances into the soil around them. | 03 · Around the roots: `soil.look` → `excrete` → `reason` | The soil turns see-through; a few waste particles pass from the roots into the soil. | `whole.soil` (Roots → waste substances → soil) | Q “Where can plants excrete some waste substances?”; Explore “Roots and soil”. |

Order of the journey: whole plant → leaf (oxygen) → water → cell → vacuole → leaf storage → leaf fall → stem → old xylem → roots → soil → whole plant, as in the brief.

## Supporting ideas (prerequisites), used only where a process needs them

| ID | Idea | Source |
|---|---|---|
| S1 | Life processes keep an organism alive and produce by-products that are useless and can be harmful. | Class X p. 80 |
| S2 | Excretion is the removal of harmful metabolic wastes; complex organisms use specialised organs. | Class X pp. 80, 96 |
| S3 | In humans, a pair of kidneys filter waste products out of the blood. | Class X p. 96 |
| S4 | Photosynthesis: carbon dioxide and water → food, with sunlight and chlorophyll. | Class X p. 81 |
| S5 | In the daytime, oxygen release is a plant’s main gas exchange. | Class X p. 89 |
| S6 | Water enters the roots, rises in the xylem, and is lost as vapour from the parts above ground. | Class X pp. 94–95 |
| S7 | Xylem carries water and minerals; phloem carries food. | Class X p. 94; Class 9 Ch. 3 p. 29 |
| S8 | A plant cell has a cell wall, jelly-like cytoplasm, a nucleus and one large central vacuole that stores water, minerals, sugars and waste. | Class 9 Ch. 2 pp. 13–19 |
| S9 | Xylem is mostly non-living; sclerenchyma cells are mostly dead; cork forms the bark. | Class 9 Ch. 3 pp. 33–34 |

See `docs/prerequisite-audit.md` for why each is needed and how much of it the lesson re-explains.

## What the lesson does not add

No examples of resin-producing trees, no heartwood, no mechanisms of transport into the soil, no stomata, and no reasons for leaf fall. All of these are outside the supplied pages. The only non-NCERT sentence is the brief-required clarification that leaves also fall for other reasons; it is flagged in the audit.
