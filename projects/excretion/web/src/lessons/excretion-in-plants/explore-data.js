/**
 * Explore: inspect what has ALREADY been taught. A model unlocks once the film has
 * passed the shot that teaches it (`after`). Descriptions only restate the lesson;
 * parts that the lesson does not teach are named, never explained with new facts.
 * V2: one entry per scale-specific model (plant → leaf → inside the leaf → chloroplast →
 * stoma; cell; stem → xylem; root → root hairs).
 */
export const EXPLORE_INTRO = 'Explore what you have learned so far. Turn a model, and tap a part to see what it is.';

export const EXPLORE = [
  {
    id: 'plant', title: 'Plant', after: 'different.none', stage: 'plant', preset: 'plantFront', soil: 'shell',
    focus: [], parts: ['leaf', 'branch', 'stem', 'roots', 'soil'],
    about: 'A plant has leaves, a stem with branches, and roots in the soil. None of these parts works like a kidney.',
    orbit: { minDistance: 1.2, maxDistance: 6, panRadius: 0.8 },
  },
  {
    id: 'leaf', title: 'Leaf', after: 'oxygen.leaf', stage: 'leaf', preset: 'leaf2', parts: ['leaf', 'leaf_vein', 'leaf_stalk'],
    about: 'Leaves make the plant’s food by photosynthesis. Oxygen and water vapour leave the plant from its leaves.',
    orbit: { minDistance: 0.6, maxDistance: 4, panRadius: 0.6 },
  },
  {
    id: 'leafInside', title: 'Inside the leaf', after: 'oxygen.path', stage: 'leafInternal', preset: 'liWide',
    parts: ['palisade', 'mesophyll', 'chloroplast', 'air_space', 'epidermis', 'cuticle', 'vein_xylem', 'vein_phloem', 'guard_cell'],
    about: 'Inside, a leaf is made of layers of cells with air spaces between them. Gases move through the air spaces to the stomata.',
    orbit: { minDistance: 0.8, maxDistance: 5, panRadius: 0.8 },
  },
  {
    id: 'chloroplast', title: 'Chloroplast', after: 'oxygen.produce', stage: 'chloroplast', preset: 'chloroplast',
    parts: ['chloroplast_membrane', 'stroma', 'thylakoid'],
    about: 'Chloroplasts contain chlorophyll, which photosynthesis needs. In sunlight, carbon dioxide and water are used to make food, and oxygen is made.',
    orbit: { minDistance: 1.0, maxDistance: 6, panRadius: 0.6 },
  },
  {
    id: 'stoma', title: 'Stoma', after: 'stoma.close', stage: 'stoma', preset: 'stomaTop', parts: ['guard_cell', 'stoma_pore', 'epidermis'],
    about: 'A stoma is a tiny pore on the leaf’s surface, between two guard cells. When water flows into the guard cells they swell and the pore opens; when they shrink, it closes.',
    orbit: { minDistance: 0.3, maxDistance: 3, panRadius: 0.4 },
  },
  {
    id: 'cell', title: 'Cell', after: 'vacuole.reason', stage: 'cell', preset: 'cell',
    parts: ['cell_wall', 'cell_membrane', 'cytoplasm', 'vacuole', 'vacuole_membrane', 'nucleus', 'chloroplast', 'tissue'],
    about: 'A leaf is made of many cells. Each of these cells has a cell wall, cytoplasm, a nucleus and one large vacuole, where many wastes are stored.',
    orbit: { minDistance: 1.4, maxDistance: 14, panRadius: 1.5 },
  },
  {
    id: 'stem', title: 'Stem: cross-section', after: 'resin.layers', stage: 'stem', preset: 'stemTop', parts: ['bark', 'phloem', 'xylem', 'old_xylem', 'pith', 'resin'],
    about: 'A magnified piece of stem: bark on the outside; inside it, phloem, which carries food, and xylem, which carries water.',
    orbit: { minDistance: 0.9, maxDistance: 5, panRadius: 0.5 },
  },
  {
    id: 'xylem', title: 'Xylem', after: 'resin.store', stage: 'xylem', preset: 'xylem',
    parts: ['vessel', 'tracheid', 'xylem_fibre', 'xylem_parenchyma', 'old_xylem', 'resin'],
    about: 'Xylem is made of tube-like cells with thick walls; most are dead and only a few are living. Plants use dead tissues like this to store some wastes, as resins and gums, especially in old xylem.',
    orbit: { minDistance: 1.2, maxDistance: 7, panRadius: 0.8 },
  },
  {
    // V2.4 label audit: 'rootFar' so the whole root, including its tip, is in the Explore framing
    id: 'root', title: 'Root', after: 'water.root', stage: 'root', preset: 'rootFar', parts: ['root_hair', 'root_epidermis', 'root_cortex', 'root_xylem', 'root_cap'],
    about: 'Root hairs give the root a large surface for taking in water. The water moves into the root and reaches its xylem.',
    orbit: { minDistance: 0.4, maxDistance: 5, panRadius: 0.7 },
  },
  {
    id: 'rootHairs', title: 'Root hairs and soil', after: 'soil.excrete', stage: 'rootHairs', preset: 'rootHairsMicro',
    parts: ['root_hair', 'root_epidermis', 'root_cortex', 'soil_particle', 'soil_water'],
    about: 'Root hairs take in water from the soil. Some waste substances pass out of the plant into the soil around the roots.',
    orbit: { minDistance: 1.0, maxDistance: 7, panRadius: 0.9 },
  },
];

/** What each part is, and what the lesson showed about it (no new facts). */
export const PARTS = {
  leaf: { title: 'Leaf', what: 'Leaves make food by photosynthesis.', learned: 'Oxygen, and excess water as vapour, leave the plant from the leaves. Some wastes are stored in leaves that later fall off.' },
  leaf_vein: { title: 'Vein', what: 'A vein of the leaf.', learned: 'In the leaf, water passes out of the xylem into the cells.' },
  leaf_stalk: { title: 'Leaf stalk', what: 'The stalk joining the leaf to the stem.', learned: '' },
  branch: { title: 'Branch', what: 'A branch of the main stem.', learned: 'Water travels along the branches to reach the leaves.' },
  stem: { title: 'Stem', what: 'Inside the stem, xylem carries water and phloem carries food.', learned: 'Resins and gums are stored inside the stem, especially in old xylem.' },
  roots: { title: 'Roots', what: 'Water from the soil enters the plant through the roots.', learned: 'Some waste substances pass from the plant into the soil around the roots.' },
  soil: { title: 'Soil', labelAnchor: 'LABEL_Soil', labelDir: 'left', what: 'The soil around the roots.', learned: 'Plants excrete some waste substances into the soil around them.' },
  // inside the leaf
  palisade: { title: 'Leaf cells (upper layer)', what: 'Tall cells packed with chloroplasts.', learned: 'Oxygen made in their chloroplasts leaves through the air spaces.' },
  mesophyll: { title: 'Leaf cells (lower layer)', what: 'Rounder cells with air spaces between them.', learned: '' },
  air_space: { title: 'Air space', what: 'The spaces between the cells inside a leaf.', learned: 'Gases and water vapour move through the air spaces to the stomata.' },
  epidermis: { title: 'Leaf surface', what: 'The outer layer of cells of the leaf.', learned: 'Stomata are tiny pores in the leaf’s surface.' },
  cuticle: { title: 'Waxy layer', what: 'A thin waxy layer covering the leaf’s surface.', learned: '' },
  vein_xylem: { title: 'Xylem (in a vein)', what: 'Xylem carries water.', learned: 'In the leaf, water passes out of the xylem into the cells.' },
  vein_phloem: { title: 'Phloem (in a vein)', what: 'Phloem carries food.', learned: '' },
  guard_cell: { title: 'Guard cell', what: 'One of the two cells around a stoma.', learned: 'Guard cells swell when water flows into them, and the pore opens; when they shrink, it closes.' },
  stoma_pore: { title: 'Stoma (pore)', what: 'A tiny pore in the leaf’s surface.', learned: 'Oxygen and water vapour pass out through stomata.' },
  // chloroplast
  chloroplast_membrane: { title: 'Membranes', what: 'A chloroplast has two membranes around it.', learned: '' },
  stroma: { title: 'Stroma', what: 'The semi-fluid substance inside the chloroplast.', learned: '' },
  thylakoid: { title: 'Disc-shaped membranes', what: 'Stacks of disc-shaped membranes that contain chlorophyll.', learned: 'Oxygen formed here during photosynthesis.' },
  // cell
  tissue: { title: 'Neighbouring cells', what: 'A leaf is made of many cells packed together.', learned: '' },
  cell_wall: { title: 'Cell wall', what: 'The outer covering of a plant cell.', learned: '' },
  cell_membrane: { title: 'Cell membrane', what: 'The thin layer just inside the cell wall.', learned: '' },
  cytoplasm: { title: 'Cytoplasm', what: 'The jelly-like substance inside the cell.', learned: 'In the lesson, wastes moved from here into the vacuole.' },
  vacuole: { title: 'Vacuole', what: 'One large storage space in a plant cell, filled with cell sap.', learned: 'Many plant waste products are stored in cellular vacuoles.' },
  vacuole_membrane: { title: 'Vacuole membrane', what: 'The thin membrane around the vacuole.', learned: '' },
  nucleus: { title: 'Nucleus', what: 'The nucleus is one part of the cell.', learned: 'Wastes were not stored here, but in the vacuole.' },
  chloroplast: { title: 'Chloroplasts', what: 'Green bodies in leaf cells. They contain chlorophyll, which photosynthesis needs.', learned: 'Photosynthesis makes oxygen, which the plant releases.' },
  // stem
  bark: { title: 'Bark', what: 'The outer layer of the stem.', learned: '' },
  phloem: { title: 'Phloem', what: 'Carries food made in the leaves to other parts of the plant.', learned: '' },
  xylem: { title: 'Xylem', what: 'Tubes that carry water, with minerals, up from the roots.', learned: 'Water rose through the xylem to the leaves.' },
  old_xylem: { title: 'Old xylem', what: 'Older xylem. Xylem is made mostly of dead cells.', learned: 'Resins and gums are stored especially in old xylem.' },
  pith: { title: 'Centre of the stem', what: 'The centre of this stem.', learned: '' },
  resin: { title: 'Resins and gums', what: 'Waste products stored in the stem, shown here in amber.', learned: 'Other waste products are stored as resins and gums.' },
  stem_cover: { title: 'Stem', what: 'The outside of the stem piece.', learned: '' },
  base: { title: 'Stand', what: 'A stand for the model.', learned: '' },
  // xylem close-up
  vessel: { title: 'Xylem tube', what: 'A tube-like xylem cell with a thick wall.', learned: 'Water rises through the xylem.' },
  tracheid: { title: 'Narrow xylem cell', what: 'A narrow, thick-walled xylem cell.', learned: '' },
  xylem_fibre: { title: 'Xylem fibre', what: 'A thick-walled xylem cell.', learned: '' },
  xylem_parenchyma: { title: 'Living xylem cells', what: 'The only living cells of the xylem.', learned: 'Most other xylem cells are dead.' },
  // root
  root_cap: { title: 'Root tip', what: 'The growing tip of the root.', learned: '' },
  root_hair: { title: 'Root hair', what: 'A long, thin outgrowth of a root surface cell.', learned: 'Root hairs give the root a large surface for taking in water.' },
  root_epidermis: { title: 'Root surface', what: 'The outer cells of the root.', learned: 'Some waste substances pass out of the plant into the soil.' },
  root_cortex: { title: 'Inside the root', what: 'The cells inside the root.', learned: 'Water moves through the root to its xylem.' },
  root_xylem: { title: 'Root xylem', what: 'The xylem of the root.', learned: 'Water reaches the root’s xylem and rises up the plant.' },
  soil_particle: { title: 'Soil particle', what: 'A grain of soil.', learned: '' },
  soil_water: { title: 'Water in the soil', what: 'Water held around the soil particles.', learned: 'Root hairs take in water from the soil.' },
};
