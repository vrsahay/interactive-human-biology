/**
 * Recall: short Class 10 questions answered from what was just seen, then one open
 * prompt: explain it in your own words. Every question and answer restates a point
 * taught in the film (ncert: ids in data/ncert-content-map.js).
 * For each question the camera returns to the place where it happened, without labels,
 * so the view reminds without giving the answer away.
 */
export const RECALL = {
  intro: 'Answer from what you have just seen. You can try again if you miss.',
  correct: 'Yes, that’s right.',
  incorrect: 'Not that one. Think back to what you saw.',
  complete: 'Well done. You have followed the waste all the way through the plant.',
  questions: [
    {
      id: 'water', ncert: ['N3'], stage: 'plant', preset: 'leafAir',
      q: 'How do plants get rid of excess water?',
      options: ['By transpiration: it leaves as water vapour', 'By storing it as resins and gums', 'By sending it into the soil', 'Through special kidneys'],
      answer: 0,
      reveal: 'Excess water is lost as water vapour. This is transpiration.',
    },
    {
      id: 'oxygen', ncert: ['N2'], stage: 'plant', preset: 'leafHero',
      q: 'Which gas, made during photosynthesis, can be thought of as a waste product?',
      options: ['Carbon dioxide', 'Oxygen', 'Water vapour', 'Nitrogen'],
      answer: 1,
      reveal: 'Oxygen is made in photosynthesis and released into the air.',
    },
    {
      id: 'stoma', ncert: ['S10'], stage: 'stoma', preset: 'stomaTop',
      q: 'What happens when water flows into the guard cells of a stoma?',
      options: ['They shrink and the pore closes', 'They swell and the pore opens', 'Oxygen is stored in them', 'Nothing changes'],
      answer: 1,
      reveal: 'The guard cells swell when water flows into them, and the pore opens.',
    },
    {
      id: 'night', ncert: ['S11'], stage: 'plant', preset: 'plantNight',
      q: 'At night, when there is no photosynthesis, which gas does a plant mainly give out?',
      options: ['Oxygen', 'Carbon dioxide', 'Water vapour only', 'No gas at all'],
      answer: 1,
      reveal: 'At night, getting rid of carbon dioxide is the main gas exchange.',
    },
    {
      id: 'store', ncert: ['N6'], stage: 'cell', preset: 'cell',
      q: 'Where can many plant waste products be stored inside cells?',
      options: ['In the nucleus', 'In the cell wall', 'In vacuoles', 'They cannot be stored'],
      answer: 2,
      reveal: 'Many plant waste products are stored in cellular vacuoles.',
    },
    {
      id: 'leaves', ncert: ['N7', 'N5'], stage: 'plant', preset: 'leafFallen',
      q: 'What happens to leaves containing stored waste?',
      options: ['They turn into roots', 'They fall off, and the wastes leave with them', 'They make more oxygen', 'They carry the wastes down to the roots'],
      answer: 1,
      reveal: 'Wastes may be stored in leaves that later fall off, taking the wastes with them.',
    },
    {
      id: 'resin', ncert: ['N8', 'N9', 'N4'], stage: 'stem', preset: 'stemTop',
      q: 'Where are resins and gums stored, especially?',
      options: ['In the bark', 'In the phloem', 'In old xylem', 'In the roots'],
      answer: 2,
      reveal: 'Resins and gums are stored especially in old xylem.',
    },
    {
      id: 'soil', ncert: ['N10'], stage: 'plant', preset: 'roots', soil: 'shell',
      q: 'Where can plants excrete some waste substances?',
      options: ['Into the soil around them', 'Into their vacuoles only', 'Into their stems only', 'Nowhere at all'],
      answer: 0,
      reveal: 'Plants excrete some waste substances into the soil around them.',
    },
  ],
  // the last step is not a quiz: the learner explains the whole idea, then compares
  open: {
    stage: 'plant', preset: 'finalWide', soil: 'shell',
    prompt: 'Can you explain, in your own words, how plants deal with wastes?',
    hint: 'Say it aloud, or type it here. Think about the leaf, the cell, the stem and the roots.',
    model: 'Plants have no single excretory organ. Oxygen made in photosynthesis is released into the air through the stomata, and at night carbon dioxide is given out. Excess water is lost as vapour by transpiration. Many wastes are stored in cell vacuoles, some in leaves that later fall off, and others as resins and gums, especially in old xylem. Some waste substances go into the soil.',
    checklist: [
      'Oxygen from photosynthesis is released into the air, through stomata',
      'At night, carbon dioxide is given out',
      'Excess water is lost by transpiration',
      'Wastes are stored in cell vacuoles',
      'Wastes stored in leaves leave when the leaves fall',
      'Resins and gums are stored, especially in old xylem',
      'Some waste substances are excreted into the soil',
    ],
  },
};
