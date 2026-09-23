# Asset inspection report (V2)

Generated: 2026-09-22T19:03:03.011Z

Produced by `npm run assets:inspect` from the GLBs exported through Blender MCP (Draco geometry compression). The runtime loads only assets listed in `manifest.json`: `core` assets before the first frame, `lazy` ones in the background, each before its stage is first shown.
**Total download: 2048.1 KB** across 12 GLB files; **before the first frame: 251.9 KB** (core assets).


## 01_plant.glb

| Property | Value |
|---|---|
| Stage / load / scale | plant / core / macro |
| Size | 164.2 KB (textures 33 KB) |
| Nodes / meshes / draw primitives | 112 / 42 / 42 |
| Triangles / vertices | 21780 / 12617 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Branch, MAT_Leaf, MAT_Root, MAT_Stem |
| Textures | tex_leaf (image/jpeg, 33 KB) |
| Camera refs | CAM_Final, CAM_Leaf_Fall, CAM_Leaf_Hero, CAM_Leaf_Hero_Air, CAM_Leaf_Old, CAM_Plant_Intro, CAM_Plant_Wide, CAM_Roots, CAM_Stem_Cut, CAM_Stem_Mid |
| Contract | all 36 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `branch`: Branch_01, Branch_02, Branch_03, Branch_04, Branch_05, Branch_06 … (+1)
- `leaf`: Leaf_01, Leaf_02, Leaf_03, Leaf_04, Leaf_05, Leaf_06 … (+27)
- `roots`: Roots
- `stem`: Stem_Main

## 16_soil.glb

| Property | Value |
|---|---|
| Stage / load / scale | plant / core / macro |
| Size | 71.6 KB (textures 49 KB) |
| Nodes / meshes / draw primitives | 6 / 4 / 8 |
| Triangles / vertices | 5256 / 3350 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Diorama_Base, MAT_Soil_Top, MAT_Soil_Section, MAT_Soil_Bottom, MAT_Pebble |
| Textures | tex_soil_top (image/jpeg, 16 KB), tex_soil_section (image/jpeg, 32 KB) |
| Camera refs | — |
| Contract | all 6 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `base`: Diorama_Base
- `soil`: Soil_Back, Soil_Front, Soil_Pebbles

## 17_waste_visuals.glb

| Property | Value |
|---|---|
| Stage / load / scale | shared / core / symbols |
| Size | 16.1 KB (textures 0 KB) |
| Nodes / meshes / draw primitives | 8 / 7 / 8 |
| Triangles / vertices | 2172 / 1158 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_CO2_Carbon, MAT_CO2_Oxygen, MAT_Oxygen, MAT_Resin_Drop, MAT_Waste, MAT_Vapour, MAT_Water |
| Textures | — |
| Camera refs | — |
| Contract | all 8 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `carbon_dioxide`: CO2_Molecule
- `oxygen`: O2_Molecule
- `resin`: Resin_Drop
- `soil_waste`: Soil_Waste_Particle
- `water_vapour`: Vapour_Puff
- `waste`: Waste_Crystal
- `water`: Water_Droplet

## 02_leaf.glb

| Property | Value |
|---|---|
| Stage / load / scale | leaf / lazy / meso |
| Size | 207.0 KB (textures 178 KB) |
| Nodes / meshes / draw primitives | 19 / 3 / 4 |
| Triangles / vertices | 12000 / 6482 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Leaf2_Upper, MAT_Leaf2_Lower, MAT_Leaf2_Midrib, MAT_Leaf2_Stalk |
| Textures | tex_leaf2_top_n (image/jpeg, 39 KB), tex_leaf2_top (image/jpeg, 29 KB), tex_leaf2_bottom_n (image/jpeg, 65 KB), tex_leaf2_bottom (image/jpeg, 45 KB) |
| Camera refs | CAM_Leaf2, CAM_Leaf2_Surface, CAM_Leaf2_Under |
| Contract | all 10 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `leaf`: Leaf_Blade
- `leaf_vein`: Leaf_Midrib
- `leaf_stalk`: Leaf_Stalk

## 03_stoma.glb

| Property | Value |
|---|---|
| Stage / load / scale | stoma / lazy / micro |
| Size | 232.8 KB (textures 90 KB) |
| Nodes / meshes / draw primitives | 34 / 11 / 11 |
| Triangles / vertices | 37192 / 19247 |
| Draco | yes |
| Morph targets | Guard_Cell_L_Chloroplasts, Guard_Cell_L, Guard_Cell_R_Chloroplasts, Guard_Cell_R, Stoma_Pore |
| Materials | MAT_Epidermis, MAT_Chloroplast_GC, MAT_Guard_Cell, MAT_Air_Space_Dark |
| Textures | tex_epidermis_normal (image/jpeg, 43 KB), tex_epidermis_color (image/jpeg, 47 KB) |
| Camera refs | CAM_Stoma, CAM_Stoma_Surface, CAM_Stoma_Top |
| Contract | all 16 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `epidermis`: Epidermis_Surface
- `guard_cell`: Guard_Cell_L_Chloroplasts, Guard_Cell_L, Guard_Cell_Poles, Guard_Cell_R_Chloroplasts, Guard_Cell_R, Stoma_Context_A … (+1)
- `stoma_pore`: Stoma_Context_A_Pore, Stoma_Context_B_Pore, Stoma_Pore

## 05_leaf_internal.glb

| Property | Value |
|---|---|
| Stage / load / scale | leafInternal / lazy / micro |
| Size | 165.9 KB (textures 0 KB) |
| Nodes / meshes / draw primitives | 79 / 15 / 15 |
| Triangles / vertices | 58172 / 32904 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Leaf_Air_Space, MAT_Bundle_Sheath, MAT_Chloroplast_Leaf, MAT_Cuticle, MAT_Leaf_Epidermis_Cells, MAT_Palisade, MAT_Palisade_Front, MAT_Spongy, MAT_Spongy_Front, MAT_Guard_Cell_Section, MAT_Vein_Phloem, MAT_Vein_Xylem |
| Textures | — |
| Camera refs | CAM_LI_Palisade, CAM_LI_Stoma, CAM_LI_Vein, CAM_LI_Wide |
| Contract | all 24 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `air_space`: Air_Spaces
- `leaf_vein`: Bundle_Sheath
- `chloroplast`: Chloroplasts_Palisade, Chloroplasts_Spongy
- `cuticle`: Cuticle
- `epidermis`: Lower_Epidermis, Upper_Epidermis
- `palisade`: Palisade_Cells, Palisade_Cells_Front
- `mesophyll`: Spongy_Cells, Spongy_Cells_Front
- `guard_cell`: Stoma_Guard_Cell_Chloroplasts, Stoma_Guard_Cells
- `vein_phloem`: Vein_Phloem
- `vein_xylem`: Vein_Xylem

## 06_plant_cell.glb

| Property | Value |
|---|---|
| Stage / load / scale | cell / lazy / micro |
| Size | 94.2 KB (textures 65 KB) |
| Nodes / meshes / draw primitives | 26 / 9 / 9 |
| Triangles / vertices | 5872 / 3082 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Cell_Membrane, MAT_Cell_Wall, MAT_Chloroplast, MAT_Cytoplasm, MAT_Nucleolus, MAT_Nucleus, MAT_Cell_Sap, MAT_Vacuole_Membrane, MAT_Neighbour_Cell |
| Textures | tex_cell_wall_n (image/jpeg, 18 KB), tex_cell_wall (image/jpeg, 6 KB), tex_cytoplasm_n (image/jpeg, 41 KB) |
| Camera refs | CAM_Cell, CAM_Cell_Far, CAM_Vacuole |
| Contract | all 20 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `cell_membrane`: Cell_Membrane
- `cell_wall`: Cell_Wall
- `chloroplast`: Chloroplasts
- `cytoplasm`: Cytoplasm
- `nucleus`: Nucleolus, Nucleus
- `vacuole`: Vacuole
- `vacuole_membrane`: Vacuole_Membrane
- `tissue`: Neighbour_Cells

## 08_chloroplast.glb

| Property | Value |
|---|---|
| Stage / load / scale | chloroplast / lazy / subcellular |
| Size | 156.4 KB (textures 0 KB) |
| Nodes / meshes / draw primitives | 16 / 5 / 5 |
| Triangles / vertices | 55954 / 28613 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_CP_Connecting_Sheets, MAT_CP_Discs, MAT_CP_Inner_Membrane, MAT_CP_Outer_Membrane, MAT_CP_Stroma |
| Textures | — |
| Camera refs | CAM_Chloroplast, CAM_Chloroplast_Close |
| Contract | all 11 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `thylakoid`: CP_Connecting_Sheets, CP_Disc_Stacks
- `chloroplast_membrane`: CP_Inner_Membrane, CP_Outer_Membrane
- `stroma`: CP_Stroma

## 10_stem_cross_section.glb

| Property | Value |
|---|---|
| Stage / load / scale | stem / lazy / meso |
| Size | 393.7 KB (textures 344 KB) |
| Nodes / meshes / draw primitives | 38 / 23 / 26 |
| Triangles / vertices | 6160 / 5616 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Bark, MAT_Bark_Outer, MAT_Phloem, MAT_Pith, MAT_Resin_Gum, MAT_Stem_Cover, MAT_Xylem_New, MAT_Xylem_Old |
| Textures | tex_wood_section_n (image/jpeg, 43 KB), tex_wood_section (image/jpeg, 115 KB), tex_bark_outer_n (image/jpeg, 120 KB), tex_bark_outer (image/jpeg, 66 KB) |
| Camera refs | CAM_Stem_Intact, CAM_Stem_OldXylem, CAM_Stem_Top |
| Contract | all 19 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `bark`: Bark, Stem_Continuation
- `phloem`: Phloem
- `pith`: Pith
- `resin`: Resin_01, Resin_02, Resin_03, Resin_04, Resin_05, Resin_06 … (+10)
- `stem_cover`: Stem_Cover
- `xylem`: Xylem_New
- `old_xylem`: Xylem_Old

## 11_xylem.glb

| Property | Value |
|---|---|
| Stage / load / scale | xylem / lazy / micro |
| Size | 70.0 KB (textures 0 KB) |
| Nodes / meshes / draw primitives | 45 / 10 / 10 |
| Triangles / vertices | 22552 / 17856 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Resin_Gum, MAT_Xylem_Wall_Young, MAT_Xylem_Wall_Old, MAT_Xylem_Thickening, MAT_Xylem_Fibre, MAT_Xylem_Parenchyma, MAT_Xylem_Parenchyma_Nucleus |
| Textures | — |
| Camera refs | CAM_Xylem, CAM_Xylem_Old, CAM_Xylem_Young |
| Contract | all 17 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `resin`: Resin_Gum_In_Old_Xylem
- `tracheid`: Tracheids
- `vessel`: Vessel_End_Walls, Vessel_Wall_Thickenings, Vessels_Young
- `old_xylem`: Vessel_End_Walls_Old, Vessels_Old
- `xylem_fibre`: Xylem_Fibres
- `xylem_parenchyma`: Xylem_Parenchyma, Xylem_Parenchyma_Nuclei

## 14_root.glb

| Property | Value |
|---|---|
| Stage / load / scale | root / lazy / meso |
| Size | 340.8 KB (textures 161 KB) |
| Nodes / meshes / draw primitives | 51 / 7 / 7 |
| Triangles / vertices | 55240 / 36233 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_Root_Surface, MAT_Root_Hair, MAT_Root_Cortex, MAT_Root_Epidermis_Cut, MAT_Root_Tip, MAT_Root_Xylem |
| Textures | tex_root_surface_n (image/jpeg, 56 KB), tex_root_surface (image/jpeg, 30 KB), tex_root_cortex_cut_n (image/jpeg, 40 KB), tex_root_cortex_cut (image/jpeg, 35 KB) |
| Camera refs | CAM_Root, CAM_Root_Hairs, CAM_Root_Section |
| Contract | all 16 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `root_epidermis`: Root_Body, Root_Body_Upper, Root_Section_Epidermis
- `root_hair`: Root_Hairs
- `root_cortex`: Root_Section_Cortex
- `root_cap`: Root_Tip
- `root_xylem`: Root_Xylem

## 15_root_hairs.glb

| Property | Value |
|---|---|
| Stage / load / scale | rootHairs / lazy / micro |
| Size | 135.3 KB (textures 0 KB) |
| Nodes / meshes / draw primitives | 51 / 7 / 7 |
| Triangles / vertices | 50544 / 25858 |
| Draco | yes |
| Morph targets | — |
| Materials | MAT_RH_Epidermal_Cell, MAT_RH_Inner_Cell, MAT_RH_Nucleus, MAT_RH_Root_Hair, MAT_RH_Soil_Grain, MAT_RH_Soil_Grain_Dark, MAT_RH_Soil_Water |
| Textures | — |
| Camera refs | CAM_RH_Hair, CAM_Root_Hairs_Micro |
| Contract | all 14 required nodes present |

**Selectable parts** (`extras.part` → nodes):

- `root_epidermis`: RH_Epidermal_Cells, RH_Nuclei
- `root_cortex`: RH_Inner_Cells
- `root_hair`: RH_Root_Hairs
- `soil_particle`: RH_Soil_Particles, RH_Soil_Particles_Dark
- `soil_water`: RH_Soil_Water
