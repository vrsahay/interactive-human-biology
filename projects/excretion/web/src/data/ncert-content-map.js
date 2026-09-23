/**
 * NCERT content map: the curriculum source of truth for this lesson.
 *
 * Primary source (in /ncert): NCERT Science, Class X, Chapter 5 "Life Processes",
 * reprint 2026-27. §5.5.2 Excretion in Plants is on page 98. Supporting pages are
 * from the same chapter and from the Class 9 textbook (Exploration, Grade 9).
 * Page numbers are the printed page numbers.
 *
 * CORE    the ten ideas of §5.5.2 the lesson must teach (the brief's list, checked against p. 98)
 * SUPPORT prerequisite ideas used only so a process can be understood (docs/prerequisite-audit.md)
 * scripts/qa-content.mjs checks that every core idea is taught, summarised and recalled.
 */
export const SOURCES = {
  C10: { book: 'NCERT Science, Class X', chapter: 'Chapter 5, Life Processes', file: 'ncert/class10_ch05_life_processes_jesc105.pdf' },
  C9_CELL: { book: 'NCERT Exploration, Grade 9', chapter: 'Chapter 2, Cell: The Building Block of Life', file: 'ncert/class09_ch02_cell_iesc102.pdf' },
  C9_TISSUE: { book: 'NCERT Exploration, Grade 9', chapter: 'Chapter 3, Tissues in Action', file: 'ncert/class09_ch03_tissues_iesc103.pdf' },
};

export const CORE = [
  { id: 'N1', text: 'Plants use completely different strategies for excretion than animals do.', src: 'C10', page: 98 },
  { id: 'N2', text: 'Oxygen can be thought of as a waste product generated during photosynthesis.', src: 'C10', page: 98 },
  { id: 'N3', text: 'Plants can get rid of excess water by transpiration.', src: 'C10', page: 98 },
  { id: 'N4', text: 'Many plant tissues consist of dead cells.', src: 'C10', page: 98 },
  { id: 'N5', text: 'Plants can lose some parts, such as leaves.', src: 'C10', page: 98 },
  { id: 'N6', text: 'Many plant waste products are stored in cellular vacuoles.', src: 'C10', page: 98 },
  { id: 'N7', text: 'Waste products may be stored in leaves that fall off.', src: 'C10', page: 98 },
  { id: 'N8', text: 'Other waste products are stored as resins and gums.', src: 'C10', page: 98 },
  { id: 'N9', text: 'Resins and gums are stored especially in old xylem.', src: 'C10', page: 98 },
  { id: 'N10', text: 'Plants excrete some waste substances into the soil around them.', src: 'C10', page: 98 },
];

export const SUPPORT = [
  { id: 'S1', text: 'Life processes are the processes that keep an organism alive; they produce by-products that are useless and can be harmful.', src: 'C10', page: 80, why: 'Chapter 01 builds the basic idea of a waste.' },
  { id: 'S2', text: 'Excretion is the removal of harmful metabolic wastes from the body; complex organisms use specialised organs.', src: 'C10', page: 96, why: 'Defines excretion; sets up the contrast with animals.' },
  { id: 'S3', text: 'In humans, a pair of kidneys filter waste products out of the blood.', src: 'C10', page: 96, why: 'Chapter 02 contrast: an animal excretory organ.' },
  { id: 'S4', text: 'Photosynthesis: carbon dioxide and water are converted into food in the presence of sunlight and chlorophyll; oxygen is one product.', src: 'C10', page: 81, why: 'The learner must see where the waste oxygen comes from.' },
  { id: 'S5', text: 'During the day, oxygen release is the major gas exchange of a plant; gases are exchanged by diffusion.', src: 'C10', page: 89, why: 'Where the oxygen goes: out into the air.' },
  { id: 'S6', text: 'Water enters the roots from the soil, rises in the xylem, and is lost as vapour from the aerial parts: transpiration.', src: 'C10', page: 94, why: 'Transpiration is shown as a process, from roots to leaves to air.' },
  { id: 'S7', text: 'Xylem carries water and minerals; phloem carries products of photosynthesis.', src: 'C10', page: 94, why: 'Names the stem layers before old xylem is found.' },
  { id: 'S8', text: 'A mature plant cell has a cell wall, jelly-like cytoplasm, a nucleus and one large central vacuole that stores water, minerals, sugars and waste material.', src: 'C9_CELL', page: 19, why: 'The learner must recognise the vacuole and know it is a store.' },
  { id: 'S9', text: 'Xylem is made of tracheids, vessels, xylem parenchyma and fibres; only the parenchyma is living. Sclerenchyma cells are mostly dead. Cork forms the bark.', src: 'C9_TISSUE', page: 33, why: 'Links “many tissues are dead cells” to old xylem; names the bark.' },
  // V2 additions (docs/prerequisite-audit.md, docs/biological-accuracy-audit.md)
  { id: 'S10', text: 'Stomata are tiny pores on the surface of leaves; guard cells swell when water flows into them and the pore opens; the pore closes if they shrink. The plant closes these pores when it does not need carbon dioxide, since much water can be lost through them. Gases are also exchanged across the surface of stems and roots.', src: 'C10', page: 83, why: 'The route by which oxygen, carbon dioxide and water vapour leave a leaf.' },
  { id: 'S11', text: 'Gases are exchanged through stomata and large inter-cellular spaces, by diffusion. At night, with no photosynthesis, CO₂ elimination is the major exchange; by day, CO₂ from respiration is used in photosynthesis and oxygen release is the major event.', src: 'C10', page: 89, why: '§5.5.2 refers back to how plants deal with oxygen and CO₂ (p. 98).' },
  { id: 'S12', text: 'Root hairs are outgrowths of root epidermal cells that increase the surface for absorbing water and minerals; transpiration is evaporation of water vapour through stomata and also helps eliminate wastes.', src: 'C9_TISSUE', page: 32, why: 'Where the plant’s water comes in, and how the excess leaves.' },
  { id: 'S13', text: 'Chloroplasts contain chlorophyll; they are double-membrane-bound, with stroma inside and disc-shaped membrane structures that contain chlorophyll.', src: 'C9_CELL', page: 18, why: 'Where oxygen is made in a leaf cell.' },
  { id: 'S14', text: 'Water lost through stomata is replaced from the xylem in the leaf; evaporation of water from leaf cells; loss of water as vapour from aerial parts is transpiration.', src: 'C10', page: 95, why: 'Water leaves the leaf’s xylem, evaporates, and escapes as vapour.' },
  { id: 'S15', text: 'The central vacuole is surrounded by a single membrane and filled with cell sap; it stores water, minerals, sugars and waste material.', src: 'C9_CELL', page: 19, why: 'The vacuole is a store with its own membrane.' },
];

/** Which shots teach which idea (checked by scripts/qa-content.mjs). */
export const TAUGHT_BY = {
  N1: ['different.none', 'different.question'],
  N2: ['oxygen.produce', 'oxygen.path', 'oxygen.release', 'oxygen.reason'],
  N3: ['water.enter', 'water.hairs', 'water.root', 'water.rise', 'water.leaf', 'water.vapour', 'water.out', 'water.reason'],
  N4: ['resin.old', 'xylem.cells'],
  N5: ['leaves.lose', 'leaves.fall'],
  N6: ['vacuole.store', 'vacuole.reason'],
  N7: ['leaves.load', 'leaves.fall', 'leaves.reason'],
  N8: ['resin.store', 'resin.reason'],
  N9: ['resin.store', 'resin.reason', 'resin.try'],
  N10: ['soil.excrete', 'soil.reason'],
};

/** V2 support ideas taught as processes (checked by scripts/qa-content.mjs like the core). */
export const SUPPORT_TAUGHT_BY = {
  S10: ['oxygen.release', 'stoma.look', 'stoma.open', 'stoma.close', 'stoma.other'],
  S11: ['night.day', 'night.night', 'night.reason'],
  S12: ['water.hairs'],
  S13: ['oxygen.chloroplast', 'oxygen.photo'],
  S14: ['water.leaf', 'water.vapour', 'water.out'],
  S15: ['vacuole.reason'],
};

/** Where each idea is rebuilt in the final map (chapter 04). N4 and N5 are linking ideas. */
export const SUMMARISED_BY = {
  N1: ['whole.answer'],
  N2: ['whole.oxygen'],
  N3: ['whole.water'],
  N6: ['whole.vacuole'],
  N7: ['whole.leaf'],
  N8: ['whole.xylem'],
  N9: ['whole.xylem'],
  N10: ['whole.soil'],
};

/** Shown in Settings → For teachers (never on the teaching surface). */
export const TEACHER_SOURCES = {
  intro: 'NCERT Science, Class X · Chapter 5, Life Processes · 5.5.2 Excretion in Plants (page 98). The lesson teaches these points:',
  items: CORE.map((c) => c.text),
  note: 'Background from Class X pages 80–96 (life processes, photosynthesis, gas exchange through stomata, transport, excretion in humans) and from Class 9 (cells, chloroplasts, vacuoles, tissues, root hairs) is used only where a process must be shown. Particles are symbols for substances; sizes and speeds are not to scale. Each close-up (leaf, inside a leaf, chloroplast, stoma, cell, stem slice, xylem, root, root hairs) is a magnified, simplified model; relative sizes between close-ups are not to scale.',
};
