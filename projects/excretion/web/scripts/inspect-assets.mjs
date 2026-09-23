// Inspect the exported GLBs BEFORE the runtime uses them.
//  * verifies every node the lesson depends on exists (the Blender → Three.js contract)
//  * reports size, meshes, triangles, materials, textures, compression, morph targets, extras
//  * writes public/models/manifest.json (runtime manifest) and ../docs/qa/asset-inspection.md
// V2 GLBs are Draco-compressed, so this reads the glTF JSON chunk directly (counts come from
// accessors, which stay uncompressed metadata) instead of decoding geometry.
import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(here, '..', 'public', 'models');
const docsDir = join(here, '..', '..', 'docs', 'qa');
mkdirSync(docsDir, { recursive: true });

// Nodes the lesson references by name. If Blender renames something, this fails loudly.
// `stage` = the lesson stage that shows it; `load` = 'core' (needed for the first frame) or 'lazy'.
export const CONTRACT = {
  '01_plant.glb': {
    id: 'plant', stage: 'plant', load: 'core', scale: 'macro',
    required: ['Plant', 'Stem_Main', 'Branch_01', 'Branch_02', 'Branch_03', 'Branch_04', 'Branch_05', 'Branch_06', 'Branch_07',
      'Leaf_Hero', 'Leaf_Old', 'Roots', 'ANCHOR_Leaf_Hero', 'ANCHOR_Leaf_Hero_Normal', 'ANCHOR_Leaf_Old', 'ANCHOR_Leaf_Old_Base',
      'ANCHOR_Leaf_Old_Landing', 'ANCHOR_Stem_Cut', 'ANCHOR_Root_Zone', 'ANCHOR_Plant_Center', 'ANCHOR_Canopy_Top',
      'PATH_Water_00', 'PATH_Water_25', 'PATH_OldLeaf_00', 'PATH_OldLeaf_11', 'CAM_Plant_Wide', 'TGT_Plant_Wide',
      'CAM_Plant_Intro', 'CAM_Leaf_Hero', 'CAM_Leaf_Hero_Air', 'CAM_Roots', 'CAM_Leaf_Old', 'CAM_Leaf_Fall',
      'CAM_Stem_Cut', 'CAM_Stem_Mid', 'CAM_Final'],
  },
  '16_soil.glb': { id: 'soil', stage: 'plant', load: 'core', scale: 'macro', required: ['RootSoil', 'Soil_Back', 'Soil_Front', 'Soil_Pebbles', 'Diorama_Base', 'ANCHOR_Soil_Cut_Face'] },
  '17_waste_visuals.glb': {
    id: 'waste', stage: 'shared', load: 'core', scale: 'symbols',
    required: ['WasteVisuals', 'O2_Molecule', 'CO2_Molecule', 'Water_Droplet', 'Vapour_Puff', 'Waste_Crystal', 'Resin_Drop', 'Soil_Waste_Particle'],
  },
  '02_leaf.glb': {
    id: 'leaf', stage: 'leaf', load: 'lazy', scale: 'meso',
    required: ['Leaf', 'Leaf_Blade', 'Leaf_Midrib', 'Leaf_Stalk', 'ANCHOR_Leaf2_Lower', 'ANCHOR_Leaf2_Vein', 'ANCHOR_Leaf2_Midrib',
      'CAM_Leaf2', 'CAM_Leaf2_Under', 'CAM_Leaf2_Surface'],
  },
  '03_stoma.glb': {
    id: 'stoma', stage: 'stoma', load: 'lazy', scale: 'micro', morph: ['Guard_Cell_L', 'Guard_Cell_R', 'Stoma_Pore', 'Guard_Cell_L_Chloroplasts', 'Guard_Cell_R_Chloroplasts'],
    required: ['Stoma', 'Epidermis_Surface', 'Guard_Cell_L', 'Guard_Cell_R', 'Stoma_Pore', 'ANCHOR_Stoma_Pore', 'ANCHOR_Guard_Cell_L',
      'ANCHOR_Guard_Cell_R', 'ANCHOR_Stoma_Above', 'ANCHOR_Stoma_Air_Space', 'ANCHOR_Epidermis', 'PATH_Stoma_Out_00', 'PATH_Stoma_Out_09',
      'CAM_Stoma', 'CAM_Stoma_Top', 'CAM_Stoma_Surface'],
  },
  '05_leaf_internal.glb': {
    id: 'leafInternal', stage: 'leafInternal', load: 'lazy', scale: 'micro',
    required: ['LeafInternal', 'Palisade_Cells', 'Spongy_Cells', 'Air_Spaces', 'Chloroplasts_Palisade', 'Upper_Epidermis', 'Lower_Epidermis',
      'Cuticle', 'Vein_Xylem', 'Vein_Phloem', 'Stoma_Guard_Cells', 'ANCHOR_LI_Palisade', 'ANCHOR_LI_Spongy', 'ANCHOR_LI_Air_Space',
      'ANCHOR_LI_Stoma', 'ANCHOR_LI_Xylem', 'ANCHOR_LI_Chloroplast', 'ANCHOR_LI_Outside', 'PATH_LI_Gas_00', 'PATH_LI_Water_00',
      'CAM_LI_Wide', 'CAM_LI_Palisade', 'CAM_LI_Stoma', 'CAM_LI_Vein'],
  },
  '06_plant_cell.glb': {
    id: 'cell', stage: 'cell', load: 'lazy', scale: 'micro',
    required: ['PlantCell', 'Cell_Wall', 'Cell_Membrane', 'Cytoplasm', 'Vacuole', 'Vacuole_Membrane', 'Nucleus', 'Chloroplasts', 'Neighbour_Cells',
      'ANCHOR_Vacuole', 'ANCHOR_Vacuole_Front', 'ANCHOR_Vacuole_Membrane', 'ANCHOR_Cell_Wall', 'ANCHOR_Cell_Membrane', 'ANCHOR_Cytoplasm',
      'ANCHOR_Nucleus', 'ANCHOR_Chloroplast', 'CAM_Cell_Far', 'CAM_Cell', 'CAM_Vacuole'],
  },
  '08_chloroplast.glb': {
    id: 'chloroplast', stage: 'chloroplast', load: 'lazy', scale: 'subcellular',
    required: ['Chloroplast', 'CP_Outer_Membrane', 'CP_Inner_Membrane', 'CP_Stroma', 'CP_Disc_Stacks', 'ANCHOR_CP_Discs',
      'ANCHOR_CP_Outer_Membrane', 'ANCHOR_CP_Stroma', 'ANCHOR_CP_Out', 'CAM_Chloroplast', 'CAM_Chloroplast_Close'],
  },
  '10_stem_cross_section.glb': {
    id: 'stem', stage: 'stem', load: 'lazy', scale: 'meso',
    required: ['StemSection', 'Bark', 'Phloem', 'Xylem_New', 'Xylem_Old', 'Pith', 'Stem_Cover', 'Stem_Continuation', 'Resin_01', 'Resin_03',
      'Resin_16', 'ANCHOR_Xylem_Old', 'ANCHOR_Xylem_Old_Face', 'ANCHOR_Bark', 'ANCHOR_Phloem', 'ANCHOR_Xylem_New', 'CAM_Stem_Intact',
      'CAM_Stem_Top', 'CAM_Stem_OldXylem'],
  },
  '11_xylem.glb': {
    id: 'xylem', stage: 'xylem', load: 'lazy', scale: 'micro',
    required: ['Xylem', 'Vessels_Young', 'Vessels_Old', 'Tracheids', 'Xylem_Fibres', 'Xylem_Parenchyma', 'Resin_Gum_In_Old_Xylem',
      'ANCHOR_XY_Young', 'ANCHOR_XY_Old', 'ANCHOR_XY_Parenchyma', 'ANCHOR_XY_Resin', 'ANCHOR_XY_Vessel', 'PATH_XY_Water_00',
      'PATH_XY_Waste_00', 'CAM_Xylem', 'CAM_Xylem_Young', 'CAM_Xylem_Old'],
  },
  '14_root.glb': {
    id: 'root', stage: 'root', load: 'lazy', scale: 'meso',
    required: ['Root', 'Root_Body', 'Root_Tip', 'Root_Hairs', 'Root_Xylem', 'Root_Section_Cortex', 'ANCHOR_RT_Hair', 'ANCHOR_RT_Hair_Zone',
      'ANCHOR_RT_Xylem', 'ANCHOR_RT_Tip', 'ANCHOR_RT_Soil', 'PATH_RT_Water_00', 'PATH_RT_Waste_00', 'CAM_Root', 'CAM_Root_Hairs', 'CAM_Root_Section'],
  },
  '15_root_hairs.glb': {
    id: 'rootHairs', stage: 'rootHairs', load: 'lazy', scale: 'micro',
    required: ['RootHairs', 'RH_Root_Hairs', 'RH_Epidermal_Cells', 'RH_Soil_Particles', 'RH_Soil_Water', 'ANCHOR_RH_Hair', 'ANCHOR_RH_Hair_Tip',
      'ANCHOR_RH_Cell', 'ANCHOR_RH_Soil_Particle', 'ANCHOR_RH_Soil_Water', 'PATH_RH_Water_00', 'PATH_RH_Waste_00', 'CAM_Root_Hairs_Micro', 'CAM_RH_Hair'],
  },
};

function readGlb(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: not a GLB`);
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
}

const manifest = { generated: new Date().toISOString(), source: 'blender/source/excretion_in_plants.blend', version: 2, assets: [] };
const md = ['# Asset inspection report (V2)', '', `Generated: ${manifest.generated}`, '',
  'Produced by `npm run assets:inspect` from the GLBs exported through Blender MCP (Draco geometry compression). The runtime loads only assets listed in `manifest.json`: `core` assets before the first frame, `lazy` ones in the background, each before its stage is first shown.', ''];
let failures = 0;

for (const [file, contract] of Object.entries(CONTRACT)) {
  const path = join(modelsDir, file);
  const bytes = statSync(path).size;
  const json = readGlb(path);
  const nodes = json.nodes || [];
  const names = new Set(nodes.map((n) => n.name));
  let triangles = 0;
  let vertices = 0;
  let drawPrims = 0;
  const morphs = [];
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives) {
      drawPrims++;
      const pos = json.accessors[prim.attributes.POSITION];
      vertices += pos?.count || 0;
      const idx = prim.indices != null ? json.accessors[prim.indices] : null;
      triangles += idx ? idx.count / 3 : (pos?.count || 0) / 3;
      if (prim.targets?.length) morphs.push(mesh.name);
    }
  }
  const missing = contract.required.filter((n) => !names.has(n));
  const morphMissing = (contract.morph || []).filter((n) => !morphs.includes(n));
  const parts = {};
  for (const n of nodes) {
    const ex = n.extras || {};
    if (ex.part && n.mesh != null) parts[ex.part] = (parts[ex.part] || []).concat(n.name);
  }
  const images = (json.images || []).map((im) => {
    const bv = json.bufferViews[im.bufferView];
    return { name: im.name, mime: im.mimeType, bytes: bv?.byteLength || 0 };
  });
  const entry = {
    id: contract.id,
    file: `models/${file}`,
    stage: contract.stage,
    load: contract.load,
    scale: contract.scale,
    bytes,
    nodes: nodes.length,
    meshes: (json.meshes || []).length,
    drawPrimitives: drawPrims,
    materials: (json.materials || []).map((m) => m.name),
    textures: images,
    textureBytes: images.reduce((s, t) => s + t.bytes, 0),
    draco: (json.extensionsUsed || []).includes('KHR_draco_mesh_compression'),
    morphTargets: morphs,
    triangles: Math.round(triangles),
    vertices,
    parts,
    cameras: nodes.filter((n) => n.camera != null).map((n) => n.name),
    anchors: nodes.filter((n) => n.name?.startsWith('ANCHOR_')).map((n) => n.name),
    paths: [...new Set(nodes.filter((n) => n.name?.startsWith('PATH_')).map((n) => n.name.replace(/_\d\d$/, '')))],
    requiredNodes: contract.required,
    missingNodes: [...missing, ...morphMissing.map((m) => `${m} (morph target)`)],
  };
  manifest.assets.push(entry);
  failures += entry.missingNodes.length;

  md.push(`## ${file}`, '',
    `| Property | Value |`, `|---|---|`,
    `| Stage / load / scale | ${entry.stage} / ${entry.load} / ${entry.scale} |`,
    `| Size | ${(bytes / 1024).toFixed(1)} KB (textures ${(entry.textureBytes / 1024).toFixed(0)} KB) |`,
    `| Nodes / meshes / draw primitives | ${entry.nodes} / ${entry.meshes} / ${drawPrims} |`,
    `| Triangles / vertices | ${entry.triangles} / ${vertices} |`,
    `| Draco | ${entry.draco ? 'yes' : 'no'} |`,
    `| Morph targets | ${morphs.join(', ') || '—'} |`,
    `| Materials | ${entry.materials.join(', ')} |`,
    `| Textures | ${images.map((t) => `${t.name} (${t.mime}, ${(t.bytes / 1024).toFixed(0)} KB)`).join(', ') || '—'} |`,
    `| Camera refs | ${entry.cameras.join(', ') || '—'} |`,
    `| Contract | ${entry.missingNodes.length ? `**MISSING: ${entry.missingNodes.join(', ')}**` : `all ${contract.required.length} required nodes present`} |`,
    '', '**Selectable parts** (`extras.part` → nodes):', '',
    ...Object.entries(parts).map(([p, ns]) => `- \`${p}\`: ${ns.length > 6 ? `${ns.slice(0, 6).join(', ')} … (+${ns.length - 6})` : ns.join(', ')}`),
    '');
}

const total = manifest.assets.reduce((s, a) => s + a.bytes, 0);
const core = manifest.assets.filter((a) => a.load === 'core').reduce((s, a) => s + a.bytes, 0);
manifest.totalBytes = total;
manifest.coreBytes = core;
md.splice(5, 0, `**Total download: ${(total / 1024).toFixed(1)} KB** across ${manifest.assets.length} GLB files; **before the first frame: ${(core / 1024).toFixed(1)} KB** (core assets).`, '');
writeFileSync(join(modelsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(join(docsDir, 'asset-inspection.md'), md.join('\n'));

for (const a of manifest.assets) {
  console.log(`${a.file.padEnd(34)} ${a.load.padEnd(4)} ${(a.bytes / 1024).toFixed(1).padStart(7)} KB  ${String(a.triangles).padStart(6)} tris  ` +
    `${a.missingNodes.length ? 'MISSING ' + a.missingNodes.join(',') : 'contract OK'}`);
}
console.log(`total ${(total / 1024).toFixed(1)} KB, core ${(core / 1024).toFixed(1)} KB`);
if (failures) {
  console.error(`${failures} required node(s) missing`);
  process.exit(1);
}
