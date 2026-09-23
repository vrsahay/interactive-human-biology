/**
 * NCERT content audit data (build-time only; not imported by the lesson runtime).
 * scripts/ncert-audit.mjs renders docs/ncert-content-audit.md from it and FAILS if any
 * learner-facing string in the lesson is missing here.
 *
 * V2: every new close-up (leaf interior, chloroplast, stoma, night, root hairs, root, xylem)
 * is audited sentence by sentence. The biological claims that need a reviewer's eye are
 * discussed in docs/biological-accuracy-audit.md.
 *
 * REFS    short supporting wording from the supplied NCERT pages (printed page numbers).
 * Entries [kind, status, refs, note]
 *   kind    fact | summary | narrative | question | task | depiction | distractor
 *   status  D = DIRECTLY SUPPORTED · P = SUPPORTED WITH MINOR PARAPHRASE · R = NEEDS REVISION
 *           X = NOT SUPPORTED · '-' = no factual claim (direction, question, depiction)
 */
export const SOURCES = {
  C10: 'NCERT Science, Class X, Ch. 5 Life Processes (reprint 2026-27)',
  C9C: 'NCERT Exploration, Grade 9, Ch. 2 Cell: The Building Block of Life',
  C9T: 'NCERT Exploration, Grade 9, Ch. 3 Tissues in Action',
};

export const REFS = {
  LP80: ['C10', '80', 'processes which together perform this maintenance job are life processes'],
  WASTE80: ['C10', '80', 'not only useless for the cells of the body, but could even be harmful'],
  EXCR80: ['C10', '80', 'discarded outside by a process called excretion'],
  PS81: ['C10', '81', 'converted into carbohydrates in the presence of sunlight and chlorophyll'],
  ENERGY81: ['C10', '81', 'Carbohydrates are utilised for providing energy to the plant'],
  CHL82: ['C10', '82', 'chloroplasts which contain chlorophyll'],
  LEAFX82: ['C10', '82', 'a cross-section of a leaf under the microscope'],
  STOMA83: ['C10', '83', 'tiny pores present on the surface of the leaves'],
  GASEX83: ['C10', '83', 'Massive amounts of gaseous exchange takes place in the leaves through these pores'],
  SURF83: ['C10', '83', 'exchange of gases occurs across the surface of stems, roots and leaves as well'],
  WLOSS83: ['C10', '83', 'large amounts of water can also be lost through these stomata'],
  CLOSE83: ['C10', '83', 'closes these pores when it does not need carbon dioxide for photosynthesis'],
  GUARD83: ['C10', '83', 'The guard cells swell when water flows into them, causing the stomatal pore to open'],
  SHRINK83: ['C10', '83', 'the pore closes if the guard cells shrink'],
  ICS88: ['C10', '88', 'the large inter-cellular spaces ensure that all cells are in contact with air'],
  GAS89: ['C10', '88–89', 'or away from them and out into the air'],
  NIGHT89: ['C10', '89', 'At night, when there is no photosynthesis occurring, CO2 elimination is the major exchange activity'],
  DAYCO289: ['C10', '89', 'CO2 generated during respiration is used up for photosynthesis, hence there is no CO2 release'],
  O2DAY89: ['C10', '89', 'oxygen release is the major event'],
  PARTS94: ['C10', '94', 'the roots, stems and leaves'],
  LEAVES94: ['C10', '94', 'chlorophyll-containing organs, namely leaves'],
  ROOTSOIL94: ['C10', '94', 'the part in contact with the soil, namely roots'],
  DEAD94: ['C10', '94', 'a large proportion of dead cells in many tissues'],
  XYL94: ['C10', '94', 'the xylem moves water and minerals obtained from the soil'],
  PHL94: ['C10', '94', 'phloem transports products of photosynthesis from the leaves'],
  TUBES94: ['C10', '94', 'independently organised conducting tubes'],
  ROOTXYL94: ['C10', '94', 'steady movement of water into root xylem'],
  ROOTIN95: ['C10', '94–95', 'moves into the root from the soil'],
  XYLLEAF95: ['C10', '95', 'replaced by water from the xylem vessels in the leaf'],
  EVAP95: ['C10', '95', 'evaporation of water molecules from the cells of a leaf'],
  TRANSP95: ['C10', '95', 'loss of water in the form of vapour from the aerial parts'],
  STLOSS95: ['C10', '95', 'the water which is lost through the stomata'],
  UP95: ['C10', '95', 'movement of water … from roots to the leaves'],
  STRATS96: ['C10', '96', 'Different organisms use varied strategies to do this'],
  EXCR96: ['C10', '96', 'removal of these harmful metabolic wastes from the body is called excretion'],
  GASW96: ['C10', '96', 'how organisms get rid of gaseous wastes generated during photosynthesis or respiration'],
  ORGANS96: ['C10', '96', 'use specialised organs to perform the same function'],
  KIDNEY96: ['C10', '96', 'a pair of kidneys … filter out waste products from the blood'],
  N1: ['C10', '98', 'completely different strategies for excretion than those of animals'],
  N2: ['C10', '98', 'a waste product generated during photosynthesis'],
  N3: ['C10', '98', 'get rid of excess water by transpiration'],
  N4: ['C10', '98', 'many of their tissues consist of dead cells'],
  DEADUSE98: ['C10', '98', 'For other wastes, plants use the fact that many of their tissues consist of dead cells'],
  N5: ['C10', '98', 'can even lose some parts such as leaves'],
  N6: ['C10', '98', 'Many plant waste products are stored in cellular vacuoles'],
  N7: ['C10', '98', 'Waste products may be stored in leaves that fall off'],
  N89: ['C10', '98', 'stored as resins and gums, especially in old xylem'],
  N10: ['C10', '98', 'excrete some waste substances into the soil around them'],
  O2CO298: ['C10', '98', 'how plants deal with oxygen as well as CO2'],
  SUM99a: ['C10', '99', 'stored in the cell-vacuoles or as gum and resin'],
  SUM99b: ['C10', '99', 'removed in the falling leaves'],
  SUM99c: ['C10', '99', 'excreted into the surrounding soil'],
  SUM99d: ['C10', '99', 'a variety of techniques to get rid of waste material'],
  C9WALL: ['C9C', '13', 'Cell wall--The outer covering of cells'],
  C9MEM: ['C9C', '13', 'an additional covering outside the cell membrane called a cell wall'],
  C9CYTO: ['C9C', '14', 'a semi-fluid, jelly-like substance called the cytoplasm'],
  C9NUC: ['C9C', '14', 'a prominent nucleus'],
  C9CHL: ['C9C', '18', 'chlorophyll, which is present in the chloroplast'],
  C9CHLM: ['C9C', '18', 'Chloroplasts are double-membrane-bound organelles'],
  C9STROMA: ['C9C', '18', 'a semi-fluid substance called the stroma'],
  C9DISC: ['C9C', '18', 'disc-shaped membrane structures that contain chlorophyll'],
  C9FOOD: ['C9C', '19', 'Plastids, such as chloroplasts help plants produce food'],
  C9VAC: ['C9C', '19', 'one large central vacuole … filled with a watery fluid called cell sap'],
  C9VACM: ['C9C', '19', 'surrounded by a single selectively permeable membrane'],
  C9VACSTORE: ['C9C', '19', 'stores water, minerals, sugars and waste material'],
  C9XP: ['C9T', '29', 'xylem transports water and minerals, while phloem transports food'],
  C9CUT: ['C9T', '32', 'covered with a waxy layer of cutin called cuticle'],
  C9HAIR: ['C9T', '32', 'root hair, which increase the surface area for absorption of water and minerals from the soil'],
  C9EPI: ['C9T', '32', 'hair-like projections arise from epidermal cells'],
  C9STOM: ['C9T', '32', 'the epidermis contains pores called stomata'],
  C9EPIO: ['C9T', '32', 'The epidermis forms the outermost'],
  C9TRANS: ['C9T', '32', 'evaporation of water vapours through stomata'],
  C9TRW: ['C9T', '32', 'also helps in elimination of wastes from the plant body'],
  C9PAR: ['C9T', '32', 'loosely packed with intercellular spaces'],
  C9SCL: ['C9T', '33', 'Sclerenchyma cells have thick walls'],
  C9DEAD: ['C9T', '33', 'Most of these cells are dead'],
  C9TUBE: ['C9T', '33', 'Tracheids and vessels are tubular and thick-walled'],
  C9XYL: ['C9T', '33', 'Xylem parenchyma are the only living component of xylem'],
  C9XCOMP: ['C9T', '33', 'Xylem consists of tracheids, vessels, xylem parenchyma and xylem fibres'],
  C9BARK: ['C9T', '34', 'This forms the bark'],
};

const n = (note = '') => ['narrative', '-', [], note];
const t = (note = '') => ['task', '-', [], note];
const q = (note = '') => ['question', '-', [], note];
const v = (note = '') => ['depiction', '-', [], note];
const INFER_N1 = 'Inference: NCERT contrasts the specialised excretory organs of complex animals (p. 96) with the “completely different strategies” of plants (p. 98). It never says “no excretory organ” in those words; the brief frames the central question this way.';
const XYLEM_DEAD = 'Combines Class X (“many of their tissues consist of dead cells”, p. 98) with Class 9 (xylem parenchyma is the only living part of xylem; tracheids, vessels and fibres are sclerenchymatous, and most sclerenchyma cells are dead, p. 33). V2 no longer says “old xylem is mostly dead”: it says xylem is.';
const NIGHT_ROUTE = 'p. 83 also says the plant closes its stomata when it does not need CO2, so the night route is not narrated; see biological-accuracy-audit.md (C-11).';

/** Narration: one entry per spoken sentence, in order. */
export const NARRATION = {
  'what.alive': [n('Describes the plant on screen.'), ['fact', 'P', ['LP80'], 'Life processes are the maintenance jobs that go on even when an organism is at rest.']],
  'what.processes': [['fact', 'P', ['LP80']], ['fact', 'P', ['PS81', 'ENERGY81'], 'Nutrition by photosynthesis; carbohydrates provide energy.']],
  'what.byproducts': [['fact', 'P', ['WASTE80']], ['fact', 'P', ['WASTE80']]],
  'what.excretion': [['fact', 'D', ['EXCR96', 'EXCR80']], ['fact', 'P', ['STRATS96']]],
  'what.question': [['fact', 'P', ['LP80', 'PS81']], q('Chapter 01 question (from the brief).')],
  'different.animals': [['fact', 'P', ['ORGANS96']], ['fact', 'D', ['KIDNEY96']]],
  'different.parts': [n(), ['fact', 'P', ['PARTS94', 'ROOTSOIL94'], 'Branches are visible in the model; the text names roots, stems and leaves.']],
  'different.none': [['fact', 'P', ['N1', 'ORGANS96'], INFER_N1], ['fact', 'D', ['N1']]],
  'different.question': [n(), q('The central question. Its premise is the inference noted for different.none.')],
  'different.plan': [n(), n()],
  // a. a leaf by day
  'oxygen.travel': [n()],
  'oxygen.look': [['fact', 'P', ['LEAVES94']], ['fact', 'D', ['PS81', 'LEAVES94']]],
  'oxygen.leaf': [n('Direction: the camera moves to the magnified leaf model.')],
  'oxygen.inside': [v('A magnified, simplified leaf cross-section (Class X Fig. 5.1 is the source’s own section).'), ['fact', 'P', ['LEAFX82', 'ICS88', 'C9PAR'], '“Air spaces” for “inter-cellular spaces”.']],
  'oxygen.chloroplast': [['fact', 'P', ['CHL82', 'C9CHL'], '“Small green bodies” describes the chloroplasts on screen.'], ['fact', 'D', ['CHL82', 'PS81']]],
  'oxygen.photo': [['fact', 'P', ['PS81', 'C9FOOD', 'CHL82'], '“Food” for carbohydrates, as the chapter does; “help” follows Class 9 (“chloroplasts help plants produce food”).']],
  'oxygen.produce': [['fact', 'D', ['N2']], v('Oxygen forms among the disc-shaped membranes (a symbol, not a mechanism).')],
  'oxygen.path': [['fact', 'P', ['GAS89', 'ICS88'], 'Diffusion out of the cells into the inter-cellular spaces (pp. 88–89).'], ['fact', 'P', ['STOMA83', 'GASEX83']]],
  'oxygen.release': [['fact', 'D', ['STOMA83', 'C9STOM']], ['fact', 'P', ['GASEX83', 'GAS89', 'O2DAY89']]],
  'oxygen.reason': [['fact', 'P', ['O2DAY89', 'N2']], ['fact', 'D', ['N2', 'O2DAY89'], 'First clause is near-verbatim; the second paraphrases oxygen release (p. 89).']],
  'oxygen.try': [t(), t()],
  // b. a tiny pore
  'stoma.look': [n('V2.1 link: continues the oxygen, which was followed out through a stoma (oxygen.release).'), ['fact', 'D', ['STOMA83', 'C9STOM']], ['fact', 'P', ['GUARD83'], 'Class X Fig. 5.3 shows two guard cells around each pore; “this one is closed” describes the model (Fig. 5.3 b).']],
  'stoma.open': [['fact', 'P', ['GUARD83'], '“Curve apart” describes what the model shows as the guard cells swell; the source states swelling → pore opens.']],
  'stoma.reason': [['fact', 'P', ['GASEX83'], '“Gaseous exchange takes place … through these pores”: gases pass in and out.'], n('Link back to oxygen.release.'), ['fact', 'D', ['WLOSS83']]],
  'stoma.close': [['fact', 'D', ['SHRINK83']], ['fact', 'P', ['CLOSE83', 'WLOSS83'], 'p. 83 gives water loss as the reason the plant closes its stomata. V2.1 no longer says “when it does not need carbon dioxide” here: that condition belongs with day and night, taught next.']],
  'stoma.try': [t(), t()],
  'stoma.other': [n('Link sentence.'), ['fact', 'D', ['SURF83']]],
  // c. at night
  'night.respire': [n('V2.1 link: “follow a second gas” keeps the waste thread.'), ['fact', 'P', ['DAYCO289', 'NIGHT89'], 'p. 89 describes respiration CO2 by day and CO2 elimination at night; “day and night” states what it implies.'], ['fact', 'D', ['DAYCO289', 'GASW96'], 'V2.1: names CO2 from respiration a gaseous waste, as §5.5 does (p. 96).']],
  'night.day': [['fact', 'D', ['DAYCO289']], ['fact', 'D', ['O2DAY89']]],
  'night.night': [['fact', 'D', ['NIGHT89']], ['fact', 'P', ['NIGHT89'], NIGHT_ROUTE]],
  'night.reason': [['summary', 'P', ['GASW96', 'NIGHT89', 'GAS89', 'O2CO298'], 'V2.1: waste (respiration, p. 96) → given out at night (p. 89).'], ['fact', 'P', ['DAYCO289', 'PS81'], '“Used as an input for photosynthesis” restates “used up for photosynthesis” (p. 89); CO2 is a raw material of photosynthesis (p. 81).']],
  // d. water
  'water.question': [['fact', 'P', ['N3'], '“More than it needs” restates “excess water”.'], q()],
  'water.enter': [['fact', 'P', ['ROOTIN95']]],
  'water.hairs': [['fact', 'P', ['C9HAIR', 'C9EPI']], ['fact', 'D', ['C9HAIR']]],
  'water.root': [['fact', 'P', ['ROOTIN95', 'ROOTXYL94', 'TUBES94'], 'The route across the root to the xylem is shown schematically and not narrated.']],
  'water.rise': [['fact', 'P', ['XYL94', 'UP95'], 'V2.1: xylem is named once (water.root); this shot follows the water up.']],
  'water.leaf': [['fact', 'P', ['XYLLEAF95', 'EVAP95'], 'Water from the leaf’s xylem replaces what is lost; it evaporates from the leaf’s cells, so it reaches them.']],
  'water.vapour': [['fact', 'P', ['EVAP95', 'ICS88', 'TRANSP95']]],
  'water.out': [['fact', 'P', ['C9TRANS', 'STLOSS95']]],
  'water.reason': [['fact', 'D', ['TRANSP95']], ['fact', 'D', ['N3']]],
  // e. inside a cell
  'vacuole.pivot': [['summary', 'P', ['N2', 'NIGHT89', 'N3'], 'V2.2: “Gases” = oxygen (p. 98) and carbon dioxide at night (p. 89), both taught before this point; meaning unchanged.'], ['fact', 'P', ['N6', 'N89'], 'Inference from “stored”: a stored waste is not removed.'], ['fact', 'P', ['N6', 'N89']]],
  'vacuole.dive': [n()],
  'vacuole.tissue': [['fact', 'P', ['LEAFX82', 'C9VAC'], 'A leaf in cross-section is made of cells (Class X Fig. 5.1; Class 9 Ch. 2).']],
  'vacuole.cell': [v('A simplified cutaway cell.'), ['fact', 'D', ['C9WALL', 'C9CYTO', 'C9NUC', 'C9VAC']]],
  'vacuole.store': [n(), ['fact', 'P', ['N6'], 'NCERT states storage in vacuoles. The drift from the cytoplasm into the vacuole is a schematic picture of “being stored”, not a mechanism.']],
  'vacuole.reason': [['fact', 'P', ['C9VACSTORE', 'C9VACM'], '“Its own thin membrane” for “a single … membrane”; the word “tonoplast” is not used.'], ['fact', 'D', ['N6']], ['fact', 'P', ['N6'], 'Inference from “stored”.']],
  'vacuole.try': [t(), v(), t()],
  'vacuole.back': [n()],
  'vacuole.plant': [n(), ['fact', 'P', ['LEAFX82']]],
  // f. an older leaf
  'leaves.lose': [n(), ['fact', 'D', ['N5']]],
  'leaves.look': [n(), v('The model’s lowest leaf is presented as an older leaf.')],
  'leaves.load': [['fact', 'P', ['N7'], 'NCERT “may be stored”; narration “some … are stored in leaves like this one”.'], v('The leaf is shown yellowing as it ages. No claim is made about why leaves age.')],
  'leaves.fall': [['fact', 'P', ['N5', 'N7']]],
  'leaves.reason': [['fact', 'D', ['N7', 'SUM99b']], ['fact', 'P', ['SUM99b', 'N5'], 'V2: replaces V1’s unsupported “leaves also fall for other reasons”. “One way” claims no purpose for leaf fall.']],
  // g. inside the stem
  'resin.travel': [n(), n()],
  'resin.cut': [v('A magnified, simplified woody-stem model.'), v()],
  'resin.layers': [['fact', 'P', ['C9BARK'], 'Class 9: cork “forms the bark”.'], ['fact', 'P', ['PHL94', 'C9XP', 'XYL94']]],
  'resin.old': [v('Names the darker region of the model “old xylem” (the term of p. 98). Its position in the model is a depiction, not stated as a fact.'), ['fact', 'P', ['N4', 'DEAD94', 'C9DEAD', 'C9XYL'], XYLEM_DEAD]],
  'xylem.cells': [['fact', 'P', ['C9TUBE', 'C9SCL', 'C9XCOMP'], '“Tube-like cells with thick walls”: tracheids and vessels (and the thick-walled fibres).'], ['fact', 'P', ['C9DEAD', 'C9XYL'], XYLEM_DEAD], ['fact', 'P', ['DEADUSE98', 'N4'], 'V2.1: why dead cells matter. p. 98: for other wastes, plants use the fact that many of their tissues consist of dead cells.']],
  'resin.store': [n(), ['fact', 'D', ['N89']]],
  'resin.reason': [['fact', 'D', ['N89']], ['fact', 'P', ['N89'], 'Inference from “stored”.']],
  'resin.try': [t(), t()],
  // h. around the roots
  'soil.travel': [n()],
  'soil.look': [['fact', 'P', ['ROOTSOIL94']]],
  'soil.excrete': [n(), ['fact', 'P', ['N10'], '“Around the roots” places NCERT’s “around them” where the roots are. The route out of a root cell is schematic; no mechanism is claimed.']],
  'soil.reason': [['fact', 'D', ['N10']]],
  // 04
  'whole.return': [n()],
  'whole.oxygen': [['summary', 'P', ['N2', 'O2DAY89', 'GASEX83']], ['summary', 'P', ['NIGHT89', 'GASW96']]],
  'whole.water': [['summary', 'P', ['TRANSP95', 'N3']], ['fact', 'D', ['N3']]],
  'whole.vacuole': [['summary', 'D', ['N6']]],
  'whole.leaf': [['summary', 'P', ['N7', 'SUM99b']]],
  'whole.xylem': [['summary', 'P', ['N89']]],
  'whole.soil': [['summary', 'P', ['N10', 'SUM99c']]],
  'whole.answer': [['summary', 'P', ['N1', 'SUM99d'], 'See different.none on “no single excretory organ”.'], ['summary', 'P', ['N2', 'N3', 'N6', 'N7', 'N89', 'N10', 'NIGHT89'], 'Recaps the routes; “gas or vapour” = oxygen, carbon dioxide and water vapour.']],
  'recall.open': [t(), t()],
};

/** On-screen text of each shot (heading, heading line, captions, labels) restates the narration
 *  above unless noted here. */
export const SURFACE_NOTES = {
  'resin.old': 'Label “Old xylem” names the depicted region.',
  'xylem.cells': 'Labels “Xylem tubes” (vessels) and “Living cells” (xylem parenchyma, C9 p. 33).',
  'oxygen.photo': 'Label “Discs with chlorophyll” restates C9 p. 18 (“disc-shaped membrane structures that contain chlorophyll”); “thylakoid” and “granum” are not used.',
  'night.night': 'The view dims to night; carbon dioxide drifts out through the air spaces. ' + NIGHT_ROUTE,
  'whole.oxygen': 'Map label “Gases: O₂ by day · CO₂ at night → air”.',
};

export const TASKS = {
  'oxygen.try': { task: t(), done: ['fact', 'P', ['PS81', 'N2', 'O2DAY89']] },
  'stoma.try': { task: t(), done: ['fact', 'D', ['GUARD83']] },
  'vacuole.try': { task: t(), done: ['fact', 'P', ['N6']] },
  'resin.try': { task: t(), done: ['fact', 'D', ['N89']], wrong: v('Points back to the amber drops the learner has seen.'), choices: n('Names of the layers taught in resin.layers and resin.old.') },
};

export const RECALL_AUDIT = {
  water: { answer: ['fact', 'D', ['N3', 'TRANSP95']], reveal: ['fact', 'D', ['TRANSP95', 'N3']] },
  oxygen: { answer: ['fact', 'D', ['N2']], reveal: ['fact', 'P', ['N2', 'O2DAY89']] },
  stoma: { answer: ['fact', 'D', ['GUARD83']], reveal: ['fact', 'D', ['GUARD83']] },
  night: { answer: ['fact', 'D', ['NIGHT89']], reveal: ['fact', 'D', ['NIGHT89']] },
  store: { answer: ['fact', 'D', ['N6']], reveal: ['fact', 'D', ['N6']] },
  leaves: { answer: ['fact', 'P', ['N7', 'SUM99b']], reveal: ['fact', 'P', ['N7', 'SUM99b']] },
  resin: { answer: ['fact', 'D', ['N89']], reveal: ['fact', 'D', ['N89']] },
  soil: { answer: ['fact', 'D', ['N10']], reveal: ['fact', 'D', ['N10']] },
  _lines: { intro: t(), correct: n(), incorrect: n(), complete: n() },
  _open: {
    prompt: q('The brief’s closing prompt.'),
    hint: t(),
    model: ['summary', 'P', ['N1', 'N2', 'NIGHT89', 'N3', 'N6', 'N7', 'N89', 'N10'], 'Model answer restates p. 98 (and pp. 83, 89 for stomata and CO2) in the learner’s register.'],
    checklist: [['fact', 'P', ['N2', 'O2DAY89', 'GASEX83']], ['fact', 'D', ['NIGHT89']], ['fact', 'D', ['N3']], ['fact', 'D', ['N6']], ['fact', 'P', ['N7', 'SUM99b']], ['fact', 'D', ['N89']], ['fact', 'D', ['N10']]],
  },
};

export const EXPLORE_AUDIT = {
  intro: t(),
  plant: [['fact', 'P', ['PARTS94', 'ROOTSOIL94']], ['fact', 'P', ['N1', 'ORGANS96'], INFER_N1]],
  leaf: [['fact', 'P', ['LEAVES94', 'PS81']], ['fact', 'P', ['N2', 'O2DAY89', 'TRANSP95']]],
  leafInside: [['fact', 'P', ['LEAFX82', 'ICS88']], ['fact', 'P', ['GAS89', 'ICS88', 'GASEX83']]],
  chloroplast: [['fact', 'D', ['CHL82', 'PS81']], ['fact', 'P', ['PS81', 'N2']]],
  stoma: [['fact', 'P', ['STOMA83', 'GUARD83']], ['fact', 'D', ['GUARD83', 'SHRINK83']]],
  cell: [['fact', 'P', ['LEAFX82']], ['fact', 'P', ['C9WALL', 'C9CYTO', 'C9NUC', 'C9VAC', 'N6']]],
  stem: [['fact', 'P', ['C9BARK', 'PHL94', 'XYL94']]],
  xylem: [['fact', 'P', ['C9TUBE', 'C9DEAD', 'C9XYL'], XYLEM_DEAD], ['fact', 'P', ['DEADUSE98', 'N89']]],
  root: [['fact', 'D', ['C9HAIR']], ['fact', 'P', ['ROOTIN95', 'ROOTXYL94']]],
  rootHairs: [['fact', 'P', ['C9HAIR']], ['fact', 'D', ['N10']]],
};

export const PARTS_AUDIT = {
  leaf: { what: ['fact', 'P', ['LEAVES94', 'PS81']], learned: ['summary', 'P', ['N2', 'N3', 'N7']] },
  leaf_vein: { what: v('Names the part only.'), learned: ['fact', 'P', ['XYLLEAF95', 'EVAP95']] },
  leaf_stalk: { what: v('Names the part only.') },
  branch: { what: v('Names the part only.'), learned: ['fact', 'P', ['XYL94', 'UP95']] },
  stem: { what: ['fact', 'P', ['XYL94', 'PHL94']], learned: ['fact', 'P', ['N89']] },
  roots: { what: ['fact', 'P', ['ROOTIN95']], learned: ['fact', 'P', ['N10']] },
  soil: { what: v(), learned: ['fact', 'D', ['N10']] },
  palisade: { what: ['fact', 'P', ['CHL82', 'LEAFX82'], 'Describes the model; “palisade” is not used.'], learned: ['fact', 'P', ['N2', 'ICS88', 'GAS89']] },
  mesophyll: { what: ['fact', 'P', ['ICS88', 'C9PAR']] },
  air_space: { what: ['fact', 'P', ['ICS88']], learned: ['fact', 'P', ['GAS89', 'ICS88', 'C9TRANS']] },
  epidermis: { what: ['fact', 'P', ['C9EPIO', 'C9STOM']], learned: ['fact', 'D', ['STOMA83']] },
  cuticle: { what: ['fact', 'P', ['C9CUT']] },
  vein_xylem: { what: ['fact', 'D', ['XYL94', 'C9XP']], learned: ['fact', 'P', ['XYLLEAF95', 'EVAP95']] },
  vein_phloem: { what: ['fact', 'D', ['C9XP', 'PHL94']] },
  guard_cell: { what: ['fact', 'P', ['GUARD83']], learned: ['fact', 'D', ['GUARD83', 'SHRINK83']] },
  stoma_pore: { what: ['fact', 'D', ['STOMA83']], learned: ['fact', 'P', ['GASEX83', 'C9TRANS']] },
  chloroplast_membrane: { what: ['fact', 'D', ['C9CHLM']] },
  stroma: { what: ['fact', 'D', ['C9STROMA']] },
  thylakoid: { what: ['fact', 'D', ['C9DISC']], learned: v('Refers to the lesson’s animation (oxygen made in photosynthesis, N2).') },
  tissue: { what: ['fact', 'P', ['LEAFX82']] },
  cell_wall: { what: ['fact', 'D', ['C9WALL']] },
  cell_membrane: { what: ['fact', 'P', ['C9MEM']] },
  cytoplasm: { what: ['fact', 'D', ['C9CYTO']], learned: v('Refers to the lesson’s animation.') },
  vacuole: { what: ['fact', 'D', ['C9VAC']], learned: ['fact', 'D', ['N6']] },
  vacuole_membrane: { what: ['fact', 'P', ['C9VACM']] },
  nucleus: { what: ['fact', 'D', ['C9NUC']], learned: ['fact', 'P', ['N6'], 'Contrast with the vacuole, the store the lesson taught.'] },
  chloroplast: { what: ['fact', 'P', ['CHL82', 'C9CHL']], learned: ['fact', 'P', ['N2']] },
  bark: { what: ['fact', 'P', ['C9BARK']] },
  phloem: { what: ['fact', 'D', ['PHL94']] },
  xylem: { what: ['fact', 'P', ['XYL94', 'UP95']], learned: v('Refers to the lesson’s animation.') },
  old_xylem: { what: ['fact', 'P', ['N4', 'C9DEAD', 'C9XYL'], XYLEM_DEAD], learned: ['fact', 'D', ['N89']] },
  pith: { what: v('Names the centre of the model only; the pith is not taught.') },
  resin: { what: ['fact', 'P', ['N89'], 'Amber is a symbol.'], learned: ['fact', 'D', ['N89']] },
  stem_cover: { what: v() },
  base: { what: v() },
  vessel: { what: ['fact', 'D', ['C9TUBE']], learned: ['fact', 'P', ['XYL94']] },
  tracheid: { what: ['fact', 'P', ['C9TUBE'], '“Tracheid” is named in Class 9; the lesson calls it a narrow xylem cell.'] },
  xylem_fibre: { what: ['fact', 'P', ['C9XCOMP', 'C9SCL']] },
  xylem_parenchyma: { what: ['fact', 'D', ['C9XYL']], learned: ['fact', 'P', ['C9DEAD', 'C9XYL'], XYLEM_DEAD] },
  root_cap: { what: v('Names the tip only; “root cap” is not used (not in the source).') },
  root_hair: { what: ['fact', 'D', ['C9EPI', 'C9HAIR']], learned: ['fact', 'D', ['C9HAIR']] },
  root_epidermis: { what: ['fact', 'P', ['C9EPI']], learned: ['fact', 'P', ['N10']] },
  root_cortex: { what: v('Names the inner root cells only; “cortex” is not used.'), learned: ['fact', 'P', ['ROOTIN95', 'ROOTXYL94']] },
  root_xylem: { what: ['fact', 'D', ['ROOTXYL94']], learned: ['fact', 'P', ['ROOTXYL94', 'UP95']] },
  soil_particle: { what: v() },
  soil_water: { what: ['fact', 'P', ['ROOTIN95']], learned: ['fact', 'P', ['C9HAIR']] },
};

/** Fixed text in the interface (checked against the source files so the audit stays in step). */
export const UI_AUDIT = [
  { where: 'Start card (lesson-data.js thesis)', file: 'src/lessons/excretion-in-plants/lesson-data.js', text: 'A plant has no organ like a kidney. So where does its waste go?', e: ['question', 'P', ['N1', 'KIDNEY96'], INFER_N1] },
  { where: 'Kidney figure (chapter 02)', file: 'src/ui/FilmUI.js', text: 'are special organs that remove wastes from the blood', e: ['fact', 'D', ['KIDNEY96', 'ORGANS96']] },
  { where: 'End card', file: 'src/main.js', text: 'A plant releases oxygen, loses excess water, stores wastes in vacuoles and old xylem, sheds some with its leaves, and excretes some into the soil.', e: ['summary', 'P', ['N2', 'N3', 'N6', 'N89', 'N7', 'N10']] },
  { where: 'End card heading', file: 'src/main.js', text: 'No single organ. Many ways.', e: ['summary', 'P', ['N1', 'SUM99d'], INFER_N1] },
];
