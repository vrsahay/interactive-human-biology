#!/usr/bin/env node
// Builds the tiered delivery representation of the body orientation asset (Step 12).
//   node --max-old-space-size=8192 pipeline/body/build_body_delivery.ts [--out qa/export/body_v2]
// Input: the reviewed, promoted Step-11 body files (read-only, SHA-checked against their manifest).
// Output (staging): overview / closeup / context / skin / skin_lod1 GLBs, shared textures, body-delivery.json, build report.
// LOD0 = Step-11 geometry, re-grouped into render groups. LOD1 = meshoptimizer simplification with contact vertices locked,
// only ever shown for structures outside every close-up sphere (and for the first-frame overview before the close-up stage).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (name, def) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : def);
const OUT = resolve(ROOT, arg("--out", "qa/export/body_v3"));
const SPEC = JSON.parse(readFileSync(join(ROOT, "pipeline", "specs", "body_delivery.json"), "utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const round = (v, d = 6) => (Array.isArray(v) ? v.map((x) => +x.toFixed(d)) : +v.toFixed(d));
const brotli = (buf) => brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }).byteLength;

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const IN = JSON.parse(readFileSync(join(ROOT, SPEC.input.manifest), "utf8"));
const inputShas = {};
for (const [output, path] of Object.entries(SPEC.input.files)) {
  const bytes = readFileSync(join(ROOT, path));
  inputShas[output] = sha256(bytes);
  if (inputShas[output] !== IN.files[output].sha256) throw new Error(`${path}: sha256 does not match the Step-11 body manifest`);
}
const report = { generatedAt: new Date().toISOString(), input: { manifest: SPEC.input.manifest, manifestSha256: sha256(readFileSync(join(ROOT, SPEC.input.manifest))), files: inputShas }, problems: [], files: {}, tiers: {}, lod1: {} };

// ------------------------------------------------------------------ handover (structures a joint asset replaces)
const handover = new Map();
for (const h of SPEC.handoverJointManifests) {
  const jm = JSON.parse(readFileSync(join(ROOT, h.manifest), "utf8"));
  for (const s of jm.structures) {
    if (!h.tiers.includes(s.tier) || !s.source?.object) continue;
    const list = handover.get(s.source.object) ?? [];
    list.push(`${h.jointAssetId}:${s.tier}`);
    handover.set(s.source.object, list);
  }
}

// ------------------------------------------------------------------ decode Step-11 structures to world space
const structures = [];
const materials = new Map();
const textures = new Map();
const textureImages = new Map();
async function captureTexture(info, texture, role) {
  if (!texture) return null;
  const image = texture.getImage();
  const hash = sha256(image);
  if (!textures.has(hash)) {
    const meta = await sharp(Buffer.from(image)).metadata();
    const ext = texture.getMimeType() === "image/webp" ? "webp" : texture.getMimeType() === "image/png" ? "png" : "jpg";
    textures.set(hash, { sha256: hash, file: `${hash}.${ext}`, mimeType: texture.getMimeType(), bytes: image.byteLength, width: meta.width, height: meta.height, name: texture.getName() });
    textureImages.set(hash, image);
  }
  return { texture: hash, role, wrapS: info?.getWrapS() ?? 10497, wrapT: info?.getWrapT() ?? 10497, magFilter: info?.getMagFilter() ?? null, minFilter: info?.getMinFilter() ?? null, texCoord: info?.getTexCoord() ?? 0 };
}
for (const [output, path] of Object.entries(SPEC.input.files)) {
  const doc = await io.read(join(ROOT, path));
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const x = node.getExtras() ?? {};
    const spec = IN.structures.find((s) => s.structureId === x.structureId);
    if (!spec) throw new Error(`${path}: node ${node.getName()} has no manifest structure`);
    const prims = mesh.listPrimitives();
    if (prims.length !== 1) throw new Error(`${spec.structureId}: expected one primitive`);
    const prim = prims[0];
    const m = node.getWorldMatrix();
    const P = prim.getAttribute("POSITION");
    const N = prim.getAttribute("NORMAL");
    const T = prim.getAttribute("TEXCOORD_0");
    const count = P.getCount();
    const pos = new Float32Array(count * 3);
    const nrm = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const e = [0, 0, 0];
    const bbox = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (let i = 0; i < count; i++) {
      P.getElement(i, e);
      const wx = m[0] * e[0] + m[4] * e[1] + m[8] * e[2] + m[12];
      const wy = m[1] * e[0] + m[5] * e[1] + m[9] * e[2] + m[13];
      const wz = m[2] * e[0] + m[6] * e[1] + m[10] * e[2] + m[14];
      pos.set([wx, wy, wz], i * 3);
      for (let k = 0; k < 3; k++) {
        bbox.min[k] = Math.min(bbox.min[k], pos[i * 3 + k]);
        bbox.max[k] = Math.max(bbox.max[k], pos[i * 3 + k]);
      }
      N.getElement(i, e);
      const nx = m[0] * e[0] + m[4] * e[1] + m[8] * e[2];
      const ny = m[1] * e[0] + m[5] * e[1] + m[9] * e[2];
      const nz = m[2] * e[0] + m[6] * e[1] + m[10] * e[2];
      const l = Math.hypot(nx, ny, nz) || 1;
      nrm.set([nx / l, ny / l, nz / l], i * 3);
      T.getElement(i, e);
      uv.set([e[0], e[1]], i * 2);
    }
    const idxAcc = prim.getIndices();
    const idx = new Uint32Array(idxAcc.getCount());
    for (let i = 0; i < idx.length; i++) idx[i] = idxAcc.getScalar(i);
    const mat = prim.getMaterial();
    const matName = mat.getName();
    if (!materials.has(matName)) {
      materials.set(matName, {
        name: matName,
        baseColorFactor: round(mat.getBaseColorFactor(), 5),
        metallicFactor: mat.getMetallicFactor(),
        roughnessFactor: mat.getRoughnessFactor(),
        emissiveFactor: mat.getEmissiveFactor(),
        doubleSided: mat.getDoubleSided(),
        alphaMode: mat.getAlphaMode(),
        normalScale: mat.getNormalScale(),
        map: await captureTexture(mat.getBaseColorTextureInfo(), mat.getBaseColorTexture(), "baseColor"),
        normalMap: await captureTexture(mat.getNormalTextureInfo(), mat.getNormalTexture(), "normal"),
        metallicRoughnessMap: await captureTexture(mat.getMetallicRoughnessTextureInfo(), mat.getMetallicRoughnessTexture(), "metallicRoughness"),
        occlusionMap: await captureTexture(mat.getOcclusionTextureInfo(), mat.getOcclusionTexture(), "occlusion"),
      });
    }
    // Texcoords outside [0,1] are left unquantized (float) for that group's accessor by gltf-transform; recorded, not altered.
    if (uv.some((v) => v < -1e-6 || v > 1 + 1e-6)) (report.uvOutOfRange ??= []).push(spec.structureId);
    structures.push({ spec, output, material: matName, pos, nrm, uv, idx, bbox, vertexCount: count, triangles: idx.length / 3, lod1: null, closeup: false, handover: (handover.get(spec.sourceObject) ?? []).sort() });
  }
}
if (structures.length !== IN.structures.length) throw new Error(`decoded ${structures.length} structures, manifest lists ${IN.structures.length}`);

// ------------------------------------------------------------------ close-up classification
const siteById = new Map(IN.jointSites.map((s) => [s.siteId, s]));
const boxDistance = (b, c) => Math.hypot(...[0, 1, 2].map((k) => Math.max(b.min[k] - c[k], 0, c[k] - b.max[k])));
for (const c of SPEC.closeupSites) if (!siteById.has(c.siteId)) throw new Error(`closeupSites: unknown site ${c.siteId}`);
for (const s of structures) {
  if (s.output !== "skeleton") continue;
  s.closeupSites = SPEC.closeupSites.filter((c) => boxDistance(s.bbox, siteById.get(c.siteId).anchor) <= c.radiusM).map((c) => c.siteId);
  s.closeup = s.closeupSites.length > 0;
}

// ------------------------------------------------------------------ LOD1 (contact vertices locked = articular surfaces protected)
function compact(idx, pos, nrm, uv) {
  const remap = new Int32Array(pos.length / 3).fill(-1);
  let n = 0;
  const out = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    if (remap[idx[i]] < 0) remap[idx[i]] = n++;
    out[i] = remap[idx[i]];
  }
  const P = new Float32Array(n * 3);
  const N = new Float32Array(n * 3);
  const T = new Float32Array(n * 2);
  for (let v = 0; v < remap.length; v++) {
    const r = remap[v];
    if (r < 0) continue;
    P.set(pos.subarray(v * 3, v * 3 + 3), r * 3);
    N.set(nrm.subarray(v * 3, v * 3 + 3), r * 3);
    T.set(uv.subarray(v * 2, v * 2 + 2), r * 2);
  }
  return { idx: out, pos: P, nrm: N, uv: T, vertexCount: n, triangles: out.length / 3 };
}
{
  const cell = SPEC.lod1.lockContactMm / 1000;
  const grid = new Map();
  const skel = structures.filter((s) => s.output === "skeleton");
  skel.forEach((s, si) => {
    for (let v = 0; v < s.vertexCount; v++) {
      const k = `${Math.floor(s.pos[v * 3] / cell)},${Math.floor(s.pos[v * 3 + 1] / cell)},${Math.floor(s.pos[v * 3 + 2] / cell)}`;
      let list = grid.get(k);
      if (!list) grid.set(k, (list = []));
      list.push(si, v);
    }
  });
  const r2 = cell * cell;
  let lockedTotal = 0;
  skel.forEach((s, si) => {
    const lock = new Uint8Array(s.vertexCount);
    for (let v = 0; v < s.vertexCount; v++) {
      const x = s.pos[v * 3], y = s.pos[v * 3 + 1], z = s.pos[v * 3 + 2];
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      search: for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
        if (!list) continue;
        for (let i = 0; i < list.length; i += 2) {
          if (list[i] === si) continue;
          const o = skel[list[i]];
          const w = list[i + 1];
          const ddx = o.pos[w * 3] - x, ddy = o.pos[w * 3 + 1] - y, ddz = o.pos[w * 3 + 2] - z;
          if (ddx * ddx + ddy * ddy + ddz * ddz <= r2) {
            lock[v] = 1;
            break search;
          }
        }
      }
    }
    const attrs = new Float32Array(s.vertexCount * 5);
    for (let v = 0; v < s.vertexCount; v++) attrs.set([s.nrm[v * 3], s.nrm[v * 3 + 1], s.nrm[v * 3 + 2], s.uv[v * 2], s.uv[v * 2 + 1]], v * 5);
    const target = Math.max(3, Math.floor((s.idx.length / 3) * SPEC.lod1.targetRatio) * 3);
    const [idx, error] = MeshoptSimplifier.simplifyWithAttributes(s.idx, s.pos, 3, attrs, 5, SPEC.lod1.attributeWeights, lock, target, SPEC.lod1.maxErrorM, ["ErrorAbsolute"]);
    const locked = lock.reduce((a, b) => a + b, 0);
    lockedTotal += locked;
    s.lod1 = { ...compact(idx, s.pos, s.nrm, s.uv), errorM: error, lockedVertices: locked };
  });
  report.lod1.skeleton = { lockedVertices: lockedTotal, lod0Triangles: skel.reduce((a, s) => a + s.triangles, 0), lod1Triangles: skel.reduce((a, s) => a + s.lod1.triangles, 0), maxErrorM: Math.max(...skel.map((s) => s.lod1.errorM)) };
}
{
  const skin = structures.filter((s) => s.output === "skin");
  for (const s of skin) {
    const target = Math.max(3, Math.floor((s.idx.length / 3) * SPEC.skinLod1.targetRatio) * 3);
    // Skin patches share borders: lock them so the silhouette has no cracks.
    const [idx, error] = MeshoptSimplifier.simplify(s.idx, s.pos, 3, target, SPEC.skinLod1.maxErrorM, ["LockBorder", "ErrorAbsolute"]);
    s.lod1 = { ...compact(idx, s.pos, s.nrm, s.uv), errorM: error, lockedVertices: 0 };
  }
  report.lod1.skin = { lod0Triangles: skin.reduce((a, s) => a + s.triangles, 0), lod1Triangles: skin.reduce((a, s) => a + s.lod1.triangles, 0), maxErrorM: Math.max(...skin.map((s) => s.lod1.errorM)) };
}

// ------------------------------------------------------------------ render groups
const band = (s) => {
  const cy = (s.bbox.min[1] + s.bbox.max[1]) / 2;
  const cx = (s.bbox.min[0] + s.bbox.max[0]) / 2;
  const b = SPEC.grouping.spatialBands.find((x) => cy >= x.minY).id;
  const right = IN.frame.right[0] < 0 ? cx < -SPEC.grouping.sideSplitM : cx > SPEC.grouping.sideSplitM;
  const left = IN.frame.right[0] < 0 ? cx > SPEC.grouping.sideSplitM : cx < -SPEC.grouping.sideSplitM;
  return `${b}-${right ? "right" : left ? "left" : "centre"}`;
};
const materialShort = (name) => name.replace(/^PBR \| /, "").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
const signatures = new Map();
for (const s of structures) {
  const sites = IN.jointSites.filter((site) => site.structureIds.includes(s.spec.structureId)).map((site) => site.siteId).sort();
  const regions = [...s.spec.regions].sort();
  const parts = [s.output, materialShort(s.material)];
  if (s.output === "skeleton") parts.push(s.closeup ? "closeup" : "context");
  for (const r of regions) parts.push(`r:${r}`);
  for (const site of sites) parts.push(`s:${site}`);
  for (const h of s.handover) parts.push(`h:${h}`);
  if (s.output === "skeleton" && !regions.length && !sites.length && !s.handover.length) parts.push(`b:${band(s)}`);
  const sig = parts.join("|");
  if (!signatures.has(sig)) signatures.set(sig, []);
  signatures.get(sig).push(s);
}
const groups = [...signatures.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([signature, members], i) => {
    const groupId = `${members[0].output}.${String(i).padStart(3, "0")}.${signature.split("|").slice(1).map((p) => p.replace(/^[a-z]:/, "")).join(".").replace(/[^a-z0-9._-]+/gi, "_")}`;
    for (const s of members) s.groupId = groupId;
    const bbox = { min: [0, 1, 2].map((k) => Math.min(...members.map((s) => s.bbox.min[k]))), max: [0, 1, 2].map((k) => Math.max(...members.map((s) => s.bbox.max[k]))) };
    return { groupId, signature, output: members[0].output, material: members[0].material, closeup: members[0].closeup, structureIds: members.map((s) => s.spec.structureId), bbox: { min: round(bbox.min), max: round(bbox.max) }, triangles: { lod0: members.reduce((a, s) => a + s.triangles, 0), lod1: members.reduce((a, s) => a + s.lod1.triangles, 0) }, members };
  });

// ------------------------------------------------------------------ files
const FILES = {
  closeup: { output: "skeleton", lod: 0, select: (g) => g.closeup },
  context: { output: "skeleton", lod: 0, select: (g) => !g.closeup },
  context_lod1: { output: "skeleton", lod: 1, select: (g) => !g.closeup },
  // The skin is only ever drawn as the untextured translucent shell: no texture coordinates.
  skin: { output: "skin", lod: 0, select: () => true, texcoord: false },
  skin_lod1: { output: "skin", lod: 1, select: () => true, texcoord: false },
};
const manifestFiles = {};

// ------------------------------------------------------------------ intro proxy (first frame only)
// One merged mesh per output, no texture coordinates, per-vertex tissue colour (texture mean x base colour, linear).
// It supports only the plain full-body presentation (normal + skin shell); every other presentation waits for groups.
{
  const meanColour = new Map();
  for (const m of materials.values()) {
    let rgb = [1, 1, 1];
    if (m.map) {
      const st = await sharp(Buffer.from(textureImages.get(m.map.texture))).stats();
      const toLinear = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
      rgb = st.channels.slice(0, 3).map((c) => toLinear(c.mean));
    }
    meanColour.set(m.name, rgb.map((c, i) => c * m.baseColorFactor[i]));
  }
  for (const [fileId, output, cfg] of [["intro", "skeleton", SPEC.intro], ["skin_intro", "skin", SPEC.skinIntro]]) {
    const members = structures.filter((s) => s.output === output);
    const parts = members.map((s) => {
      const target = Math.max(3, Math.floor((s.idx.length / 3) * cfg.targetRatio) * 3);
      const [idx, error] = MeshoptSimplifier.simplify(s.idx, s.pos, 3, target, cfg.maxErrorM, ["ErrorAbsolute"]);
      return { ...compact(idx, s.pos, s.nrm, s.uv), errorM: error, colour: meanColour.get(s.material) };
    });
    const vc = parts.reduce((a, p) => a + p.vertexCount, 0);
    const ic = parts.reduce((a, p) => a + p.idx.length, 0);
    const P = new Float32Array(vc * 3), N = new Float32Array(vc * 3), C = new Float32Array(vc * 3), I = vc < 65536 ? new Uint16Array(ic) : new Uint32Array(ic);
    let vo = 0, io2 = 0;
    for (const p of parts) {
      P.set(p.pos, vo * 3);
      N.set(p.nrm, vo * 3);
      for (let v = 0; v < p.vertexCount; v++) C.set(p.colour, (vo + v) * 3);
      for (let i = 0; i < p.idx.length; i++) I[io2 + i] = p.idx[i] + vo;
      vo += p.vertexCount;
      io2 += p.idx.length;
    }
    const doc = new Document();
    const buffer = doc.createBuffer();
    const scene = doc.createScene("body");
    doc.getRoot().setDefaultScene(scene);
    const src = materials.get(members[0].material);
    const mat = doc.createMaterial(`intro | ${output}`).setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(src.roughnessFactor).setDoubleSided(src.doubleSided);
    const prim = doc.createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(P).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(N).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(I).setBuffer(buffer))
      .setMaterial(mat);
    if (output === "skeleton") prim.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(C).setBuffer(buffer));
    scene.addChild(doc.createNode(`proxy__${output}`).setMesh(doc.createMesh(fileId).addPrimitive(prim)).setExtras({ role: "body_proxy", output, structureCount: members.length }));
    await doc.transform(prune({ keepExtras: true, keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: "medium", ...SPEC.quantization, quantizeColor: 8 }));
    const glb = await io.writeBinary(doc);
    const url = `body.${fileId}.glb`;
    writeFileSync(join(OUT, url), glb);
    manifestFiles[fileId] = { url, output, lod: 2, proxy: true, texcoord: false, bytes: glb.byteLength, gzipBytes: gzipSync(glb, { level: 9 }).byteLength, brotliBytes: brotli(glb), sha256: sha256(glb), groups: [], structures: members.length, triangles: ic / 3, maxErrorM: Math.max(...parts.map((p) => p.errorM)), extensionsRequired: doc.getRoot().listExtensionsRequired().map((e) => e.extensionName).sort() };
    const budget = SPEC.budgetsGzipKB[fileId];
    if (budget && manifestFiles[fileId].gzipBytes > budget * 1000) report.problems.push(`${fileId}: gzip ${manifestFiles[fileId].gzipBytes} B exceeds budget ${budget} KB`);
  }
}

for (const [fileId, cfg] of Object.entries(FILES)) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("body");
  doc.getRoot().setDefaultScene(scene);
  const mats = new Map();
  const fileGroups = groups.filter((g) => g.output === cfg.output && cfg.select(g));
  let tris = 0;
  for (const g of fileGroups) {
    const parts = g.members.map((s) => (cfg.lod === 1 ? s.lod1 : { idx: s.idx, pos: s.pos, nrm: s.nrm, uv: s.uv, vertexCount: s.vertexCount }));
    const vc = parts.reduce((a, p) => a + p.vertexCount, 0);
    const ic = parts.reduce((a, p) => a + p.idx.length, 0);
    const P = new Float32Array(vc * 3), N = new Float32Array(vc * 3), T = new Float32Array(vc * 2), I = vc < 65536 ? new Uint16Array(ic) : new Uint32Array(ic);
    let vo = 0, io2 = 0;
    for (const p of parts) {
      P.set(p.pos, vo * 3);
      N.set(p.nrm, vo * 3);
      T.set(p.uv, vo * 2);
      for (let i = 0; i < p.idx.length; i++) I[io2 + i] = p.idx[i] + vo;
      vo += p.vertexCount;
      io2 += p.idx.length;
    }
    tris += ic / 3;
    let mat = mats.get(g.material);
    if (!mat) {
      const src = materials.get(g.material);
      mat = doc.createMaterial(src.name).setBaseColorFactor(src.baseColorFactor).setMetallicFactor(src.metallicFactor).setRoughnessFactor(src.roughnessFactor).setEmissiveFactor(src.emissiveFactor).setDoubleSided(src.doubleSided).setAlphaMode(src.alphaMode);
      mats.set(g.material, mat);
    }
    const prim = doc.createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(P).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(N).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(I).setBuffer(buffer))
      .setMaterial(mat);
    if (cfg.texcoord !== false) prim.setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(T).setBuffer(buffer));
    const node = doc.createNode(g.groupId.replace(/\./g, "__")).setMesh(doc.createMesh(g.groupId).addPrimitive(prim)).setExtras({ role: "body_group", groupId: g.groupId, lod: cfg.lod, structureCount: g.members.length });
    scene.addChild(node);
  }
  await doc.transform(prune({ keepExtras: true, keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: "medium", ...SPEC.quantization, quantizeTexcoord: cfg.quantizeTexcoord ?? SPEC.quantization.quantizeTexcoord }));
  const glb = await io.writeBinary(doc);
  const url = `body.${fileId}.glb`;
  writeFileSync(join(OUT, url), glb);
  const gzipBytes = gzipSync(glb, { level: 9 }).byteLength;
  manifestFiles[fileId] = { url, output: cfg.output, lod: cfg.lod, texcoord: cfg.texcoord !== false, quantizeTexcoord: cfg.texcoord === false ? null : (cfg.quantizeTexcoord ?? SPEC.quantization.quantizeTexcoord), bytes: glb.byteLength, gzipBytes, brotliBytes: brotli(glb), sha256: sha256(glb), groups: fileGroups.map((g) => g.groupId), structures: fileGroups.reduce((a, g) => a + g.members.length, 0), triangles: tris, extensionsRequired: doc.getRoot().listExtensionsRequired().map((e) => e.extensionName).sort() };
  const budget = SPEC.budgetsGzipKB[fileId];
  if (budget && gzipBytes > budget * 1000) report.problems.push(`${fileId}: gzip ${gzipBytes} B exceeds budget ${budget} KB`);
}

// ------------------------------------------------------------------ shared material library (textures shipped once)
// Geometry files carry untextured placeholder materials; the runtime replaces them by name with the library materials, so
// every stage file reuses one set of textures (one download, one GPU upload).
const textureEntries = [...textures.values()].map((t) => ({ ...t, gpuBytesEstimate: Math.round(t.width * t.height * 4 * (4 / 3)) }));
const manifestMaterials = Object.fromEntries([...materials.values()].map((m) => [m.name, { ...m }]));
{
  const lib = new Document();
  const buffer = lib.createBuffer();
  const scene = lib.createScene("materials");
  lib.getRoot().setDefaultScene(scene);
  lib.createExtension((await import("@gltf-transform/extensions")).EXTTextureWebP).setRequired(true);
  const texByHash = new Map();
  const tex = (ref) => {
    if (!ref) return null;
    if (!texByHash.has(ref.texture)) {
      const meta = textures.get(ref.texture);
      texByHash.set(ref.texture, lib.createTexture(meta.name).setImage(textureImages.get(ref.texture)).setMimeType(meta.mimeType));
    }
    return texByHash.get(ref.texture);
  };
  const applyInfo = (info, ref) => {
    if (!info || !ref) return;
    info.setWrapS(ref.wrapS).setWrapT(ref.wrapT).setTexCoord(ref.texCoord);
    if (ref.magFilter !== null) info.setMagFilter(ref.magFilter);
    if (ref.minFilter !== null) info.setMinFilter(ref.minFilter);
  };
  for (const m of materials.values()) {
    const mat = lib.createMaterial(m.name).setBaseColorFactor(m.baseColorFactor).setMetallicFactor(m.metallicFactor).setRoughnessFactor(m.roughnessFactor).setEmissiveFactor(m.emissiveFactor).setDoubleSided(m.doubleSided).setAlphaMode(m.alphaMode).setNormalScale(m.normalScale);
    if (m.map) { mat.setBaseColorTexture(tex(m.map)); applyInfo(mat.getBaseColorTextureInfo(), m.map); }
    if (m.normalMap) { mat.setNormalTexture(tex(m.normalMap)); applyInfo(mat.getNormalTextureInfo(), m.normalMap); }
    if (m.metallicRoughnessMap) { mat.setMetallicRoughnessTexture(tex(m.metallicRoughnessMap)); applyInfo(mat.getMetallicRoughnessTextureInfo(), m.metallicRoughnessMap); }
    if (m.occlusionMap) { mat.setOcclusionTexture(tex(m.occlusionMap)); applyInfo(mat.getOcclusionTextureInfo(), m.occlusionMap); }
    // One tiny triangle per material with the same attribute set as the geometry files (so the loader sets the material up
    // for meshes without tangents exactly as it would for the real geometry).
    const prim = lib.createPrimitive()
      .setAttribute("POSITION", lib.createAccessor().setType("VEC3").setArray(new Float32Array([0, 0, 0, 0.001, 0, 0, 0, 0.001, 0])).setBuffer(buffer))
      .setAttribute("NORMAL", lib.createAccessor().setType("VEC3").setArray(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])).setBuffer(buffer))
      .setAttribute("TEXCOORD_0", lib.createAccessor().setType("VEC2").setArray(new Float32Array([0, 0, 1, 0, 0, 1])).setBuffer(buffer))
      .setMaterial(mat);
    scene.addChild(lib.createNode(`material__${m.name.replace(/[^a-z0-9]+/gi, "_")}`).setMesh(lib.createMesh(m.name).addPrimitive(prim)).setExtras({ role: "material_library", material: m.name }));
  }
  const glb = await io.writeBinary(lib);
  writeFileSync(join(OUT, "body-materials.glb"), glb);
  report.materialLibrary = { url: "body-materials.glb", bytes: glb.byteLength, gzipBytes: gzipSync(glb, { level: 9 }).byteLength, brotliBytes: brotli(glb), sha256: sha256(glb), materials: [...materials.keys()], textures: texByHash.size };
}

// ------------------------------------------------------------------ tiers
const tiers = {};
for (const [tier, t] of Object.entries(SPEC.tiers)) {
  const stages = t.stages.map((st) => ({ ...st, bytes: st.files.reduce((a, f) => a + manifestFiles[f].bytes, 0), gzipBytes: st.files.reduce((a, f) => a + manifestFiles[f].gzipBytes, 0), brotliBytes: st.files.reduce((a, f) => a + manifestFiles[f].brotliBytes, 0) }));
  // Coverage: after all stages every structure is presented exactly once at its final LOD.
  const final = new Map();
  for (const st of t.stages) for (const f of st.files) for (const gid of manifestFiles[f].groups) final.set(gid, manifestFiles[f].lod);
  const covered = groups.every((g) => final.has(g.groupId));
  if (!covered) report.problems.push(`tier ${tier}: not every group is delivered`);
  const firstStage = t.stages[0].files.map((f) => manifestFiles[f]);
  const proxyFirst = firstStage.every((f) => f.proxy);
  if (proxyFirst && !firstStage.some((f) => f.output === "skeleton")) report.problems.push(`tier ${tier}: the proxy stage must show the whole skeleton`);
  const groupStage = t.stages.find((st) => st.files.every((f) => !manifestFiles[f].proxy));
  const firstGroups = new Set((groupStage?.files ?? []).flatMap((f) => manifestFiles[f].groups));
  if (!groups.every((g) => firstGroups.has(g.groupId))) report.problems.push(`tier ${tier}: the first group stage must contain every group`);
  const closeupFinalLod = groups.filter((g) => g.output === "skeleton" && g.closeup).every((g) => final.get(g.groupId) === 0);
  if (!closeupFinalLod) report.problems.push(`tier ${tier}: close-up groups must end at LOD0`);
  const finalTriangles = groups.reduce((a, g) => a + (final.get(g.groupId) === 0 ? g.triangles.lod0 : g.triangles.lod1), 0);
  const textureSet = new Set([...materials.values()].flatMap((m) => [m.map, m.normalMap, m.metallicRoughnessMap, m.occlusionMap].filter(Boolean).map((x) => x.texture)));
  tiers[tier] = { stages, finalTriangles, firstStageTriangles: t.stages[0].files.reduce((a, f) => a + manifestFiles[f].triangles, 0), firstStageDrawCalls: proxyFirst ? firstStage.length : firstGroups.size, drawCallsBody: new Set(groups.map((g) => g.groupId)).size, bytesTotal: stages.reduce((a, s) => a + s.bytes, 0), gzipBytesTotal: stages.reduce((a, s) => a + s.gzipBytes, 0), brotliBytesTotal: stages.reduce((a, s) => a + s.brotliBytes, 0), textureGpuBytesEstimate: [...textureSet].reduce((a, h) => a + textureEntries.find((x) => x.sha256 === h).gpuBytesEstimate, 0) };
}

const manifest = {
  schema: 2,
  kind: "body_delivery",
  assetId: SPEC.assetId,
  deliveryVersion: SPEC.deliveryVersion,
  coordinateSystem: IN.coordinateSystem,
  source: IN.source,
  derivedFrom: { step11Manifest: report.input.manifestSha256, step11Files: inputShas, note: "LOD0 geometry = the reviewed Step-11 body geometry (re-grouped, re-quantized)." },
  frame: IN.frame,
  regions: IN.regions,
  jointSites: IN.jointSites,
  closeupSites: SPEC.closeupSites,
  closeupRule: SPEC.closeupRule,
  lodPolicy: { lod0: "Step-11 geometry", lod1: { ...SPEC.lod1, skin: SPEC.skinLod1, note: "LOD1 is a separate single-user mesh per group; articular (contact) vertices are locked; LOD selection is per device tier and per structure, upgrades happen once and only on full-body framing or a cut (no distance-based swapping)." } },
  structures: structures.map((s) => ({ structureId: s.spec.structureId, label: s.spec.label, sourceObject: s.spec.sourceObject, tissue: s.spec.tissue, output: s.output, regions: s.spec.regions, bbox: { min: round(s.bbox.min), max: round(s.bbox.max) }, groupId: s.groupId, closeup: s.closeup, closeupSites: s.closeupSites ?? [], handover: s.handover, triangles: { lod0: s.triangles, lod1: s.lod1.triangles }, lod1ErrorM: round(s.lod1.errorM, 7), lod1LockedVertices: s.lod1.lockedVertices })),
  groups: groups.map(({ members, ...g }) => g),
  files: manifestFiles,
  materials: manifestMaterials,
  materialLibrary: { url: "../../shared/body-materials.glb", bytes: report.materialLibrary.bytes, sha256: report.materialLibrary.sha256, extensionsRequired: ["EXT_texture_webp"], materials: report.materialLibrary.materials },
  textures: textureEntries,
  tiers: Object.fromEntries(Object.entries(SPEC.tiers).map(([k, t]) => [k, { stages: t.stages }])),
  attribution: IN.attribution,
  generatedAt: report.generatedAt,
};
writeFileSync(join(OUT, "body-delivery.json"), JSON.stringify(manifest, null, 1));
report.files = manifestFiles;
report.tiers = tiers;
report.groups = { count: groups.length, skeleton: groups.filter((g) => g.output === "skeleton").length, skin: groups.filter((g) => g.output === "skin").length, closeup: groups.filter((g) => g.closeup).length };
report.structures = { total: structures.length, closeup: structures.filter((s) => s.closeup).length, context: structures.filter((s) => s.output === "skeleton" && !s.closeup).length, skin: structures.filter((s) => s.output === "skin").length };
report.textures = textureEntries;
report.passed = report.problems.length === 0;
writeFileSync(join(OUT, "body-delivery.build_report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ passed: report.passed, problems: report.problems, groups: report.groups, structures: report.structures, lod1: report.lod1, files: Object.fromEntries(Object.entries(manifestFiles).map(([k, f]) => [k, { bytes: f.bytes, gzip: f.gzipBytes, br: f.brotliBytes, tris: f.triangles, groups: f.groups.length }])), tiers, textures: textureEntries.map((t) => [t.name, t.bytes, `${t.width}x${t.height}`]) }, null, 1));
