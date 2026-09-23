// Camera framings. Most are the camera references authored in Blender
// (CAM_* + TGT_* empties in the GLBs); `dist` scales the authored distance.
// Three.js space: Y up, the learner looks towards −Z.
// V2: every scale-specific GLB carries its own cameras; `stage` says which stage a
// preset belongs to (a preset is only resolved once that stage's model has loaded).
export const PRESETS = {
  // ---------------------------------------------------------------- whole plant (01_plant + 16_soil)
  plantIntro: { cam: 'CAM_Plant_Intro', dist: 1.02 },
  plantWide: { cam: 'CAM_Plant_Wide', dist: 1.12 },
  plantFront: { pos: [0.45, 0.72, 4.6], target: [0, 0.3, 0] },
  plantCanopy: { pos: [0.75, 1.2, 2.7], target: [0, 0.78, 0] },
  plantQuestion: { cam: 'CAM_Plant_Wide', dist: 0.86, targetOffset: [0, 0.12, 0] },
  plantNight: { cam: 'CAM_Plant_Wide', dist: 1.0, targetOffset: [0, 0.2, 0] },
  plantSurfaces: { pos: [1.15, 0.35, 2.3], target: [0, -0.02, 0] },
  final: { cam: 'CAM_Final', dist: 1.2 },
  finalWide: { cam: 'CAM_Final', dist: 1.3 },

  // leaf on the plant
  // V2.2: nearly level with the leaf and aimed a little above it, so the sky, not the soil, is behind
  // it (the narration says it is high up on the plant)
  leafApproach: { pos: [0.246, 0.944, 0.633], target: [-0.274, 0.86, 0.193] },
  leafHero: { pos: [-0.014, 0.884, 0.393], target: [-0.274, 0.86, 0.193] },
  leafAir: { cam: 'CAM_Leaf_Hero_Air', dist: 1.15 },
  leafDive: { pos: 'ANCHOR_Leaf_Hero_Normal', target: 'ANCHOR_Leaf_Hero', dist: 0.28, refAspect: 0.4 },

  // water journey (plant scale)
  waterRoots: { pos: [0.35, -0.04, 1.45], target: [-0.1, -0.17, 0.05] },
  waterWide: { pos: [0.8, 0.6, 3.6], target: [-0.06, 0.34, 0.03] },

  // old leaf
  leafOld: { cam: 'CAM_Leaf_Old', dist: 1.15 },
  leafFall: { pos: [0.95, 0.8, 1.5], target: [0.18, 0.16, -0.12] },
  leafFallen: { pos: [0.98, 0.5, 0.42], target: [0.27, 0.07, -0.2] },

  // stem on the plant
  stemCut: { cam: 'CAM_Stem_Cut', dist: 1.15 },
  stemMid: { cam: 'CAM_Stem_Mid', dist: 1.1 },

  // roots / soil (plant scale)
  roots: { cam: 'CAM_Roots', dist: 1.12 },
  rootsClose: { pos: [0.3, -0.12, 1.05], target: [-0.02, -0.22, 0.04] },

  // ---------------------------------------------------------------- 02_leaf (meso)
  leaf2: { cam: 'CAM_Leaf2', dist: 1.25 },
  leaf2Far: { cam: 'CAM_Leaf2', dist: 1.6 },
  leaf2Under: { cam: 'CAM_Leaf2_Under', dist: 1.05 },
  leaf2Surface: { cam: 'CAM_Leaf2_Surface', dist: 1.0 },

  // ---------------------------------------------------------------- 03_stoma (micro)
  stomaSurface: { cam: 'CAM_Stoma_Surface', dist: 1.0 },
  stoma: { cam: 'CAM_Stoma', dist: 1.0 },
  stomaTop: { cam: 'CAM_Stoma_Top', dist: 1.0 },
  stomaFar: { cam: 'CAM_Stoma_Surface', dist: 1.7 },

  // ---------------------------------------------------------------- 05_leaf_internal (micro)
  liWide: { cam: 'CAM_LI_Wide', dist: 1.12 },
  liFar: { cam: 'CAM_LI_Wide', dist: 1.5 },
  liPalisade: { cam: 'CAM_LI_Palisade', dist: 1.3 },
  liStoma: { cam: 'CAM_LI_Stoma', dist: 1.0 },
  liVein: { cam: 'CAM_LI_Vein', dist: 1.55 },

  // ---------------------------------------------------------------- 06_plant_cell (micro)
  cellFar: { cam: 'CAM_Cell_Far', dist: 1.0 },
  cell: { cam: 'CAM_Cell', dist: 1.12 },
  vacuole: { cam: 'CAM_Vacuole', dist: 1.35 },

  // ---------------------------------------------------------------- 08_chloroplast (subcellular)
  chloroplast: { cam: 'CAM_Chloroplast', dist: 0.82 },
  chloroplastFar: { cam: 'CAM_Chloroplast', dist: 1.6 },
  chloroplastClose: { cam: 'CAM_Chloroplast_Close', dist: 1.0 },

  // ---------------------------------------------------------------- 10_stem_cross_section (meso)
  stemIntact: { cam: 'CAM_Stem_Intact', dist: 1.1 },
  stemTop: { cam: 'CAM_Stem_Top', dist: 1.12 },
  stemOldXylem: { cam: 'CAM_Stem_OldXylem', dist: 1.12 },
  stemOrbit: { pos: [1.75, 1.15, 0.75], target: [0, -0.12, 0] },

  // ---------------------------------------------------------------- 11_xylem (micro)
  xylem: { cam: 'CAM_Xylem', dist: 1.0, refAspect: 1.6 },
  xylemFar: { cam: 'CAM_Xylem', dist: 1.45 },
  xylemYoung: { cam: 'CAM_Xylem_Young', dist: 1.0 },
  xylemOld: { cam: 'CAM_Xylem_Old', dist: 1.0, refAspect: 1.5 },

  // ---------------------------------------------------------------- 14_root (meso)
  root: { cam: 'CAM_Root', dist: 1.0 },
  rootFar: { cam: 'CAM_Root', dist: 1.5 },
  rootHairZone: { cam: 'CAM_Root_Hairs', dist: 1.0 },
  rootSection: { cam: 'CAM_Root_Section', dist: 1.0 },

  // ---------------------------------------------------------------- 15_root_hairs (micro)
  rootHairsMicro: { cam: 'CAM_Root_Hairs_Micro', dist: 1.0 },
  rootHairsFar: { cam: 'CAM_Root_Hairs_Micro', dist: 1.4 },
  rootHair: { cam: 'CAM_RH_Hair', dist: 1.0 },

  // insets (synthesis windows)
  insetCell: { cam: 'CAM_Vacuole', dist: 1.9 },
  insetStem: { cam: 'CAM_Stem_OldXylem', dist: 1.25 },
};
