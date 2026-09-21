#!/usr/bin/env node
// Builds the full-body orientation asset for the video lesson from the source atlas GLB (READ-ONLY).
//   node --max-old-space-size=8192 pipeline/body/build_body_overview.ts
// Output (staging): qa/export/body/{body.skeleton.glb, body.skin.glb, body-manifest.json, body.build_report.json}
// Never writes the source; verifies its SHA-256 before and after. Per-structure meshes are kept (no joins, no instancing).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { dedup, getBounds, meshopt, prune, simplifyPrimitive, weldPrimitive } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC = JSON.parse(readFileSync(join(ROOT, "pipeline", "specs", "body_overview.json"), "utf8"));
const OUT = join(ROOT, "qa", "export", "body");
const QUANT = { quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizationVolume: "mesh" };
const TEXTURE_GATE = { minPsnrDb: 47, maxAbsDiff: 6 };
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const fileSha = (p) => sha256(readFileSync(p));
const slug = (name) => name.toLowerCase().replace(/\(|\)/g, "").replace(/\s*\|\s*/g, "_").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

async function chooseWebP(png, name) {
  const ref = await sharp(png).ensureAlpha().raw().toBuffer();
  const candidates = [["webp_q90", { quality: 90, effort: 6 }], ["webp_q95", { quality: 95, effort: 6 }], ["webp_near_lossless_60", { nearLossless: true, quality: 60, effort: 6 }], ["webp_lossless", { lossless: true, effort: 6 }]];
  const measured = [];
  for (const [label, opts] of candidates) {
    const bytes = await sharp(png).webp(opts).toBuffer();
    const dec = await sharp(bytes).ensureAlpha().raw().toBuffer();
    let se = 0, maxd = 0, n = 0;
    for (let i = 0; i < dec.length; i++) { if (i % 4 === 3) continue; const d = dec[i] - ref[i]; se += d * d; n++; if (Math.abs(d) > maxd) maxd = Math.abs(d); }
    const rmse = Math.sqrt(se / n);
    measured.push({ label, bytes, size: bytes.byteLength, psnrDb: rmse === 0 ? Infinity : +(20 * Math.log10(255 / rmse)).toFixed(2), maxAbsDiff: maxd });
  }
  const passing = measured.filter((m) => m.psnrDb >= TEXTURE_GATE.minPsnrDb && m.maxAbsDiff <= TEXTURE_GATE.maxAbsDiff).sort((a, b) => a.size - b.size);
  if (!passing.length) throw new Error(`texture ${name}: no WebP candidate passes the quality gate`);
  return { bytes: passing[0].bytes, metrics: { name, sourceBytes: png.byteLength, chosen: passing[0].label, bytes: passing[0].size, psnrDb: passing[0].psnrDb, maxAbsDiff: passing[0].maxAbsDiff } };
}

// ---------------------------------------------------------------- geometry helpers (source, unsimplified, world space)
function worldPositions(node) {
  const m = node.getWorldMatrix();
  const out = [];
  for (const prim of node.getMesh().listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const el = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, el);
      out.push([m[0] * el[0] + m[4] * el[1] + m[8] * el[2] + m[12], m[1] * el[0] + m[5] * el[1] + m[9] * el[2] + m[13], m[2] * el[0] + m[6] * el[1] + m[10] * el[2] + m[14]]);
    }
  }
  return out;
}
const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function grid(points, cell) {
  const g = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  for (const p of points) {
    const k = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell));
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(p);
  }
  return (p, r) => {
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (const q of g.get(key(cx + dx, cy + dy, cz + dz)) ?? []) if (dist(p, q) <= r) return true;
    }
    return false;
  };
}
/** Algebraic least-squares sphere fit (x^2+y^2+z^2 + Dx + Ey + Fz + G = 0). */
function fitSphere(pts) {
  const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const b = [0, 0, 0, 0];
  for (const [x, y, z] of pts) {
    const row = [x, y, z, 1];
    const rhs = -(x * x + y * y + z * z);
    for (let i = 0; i < 4; i++) { b[i] += row[i] * rhs; for (let j = 0; j < 4; j++) A[i][j] += row[i] * row[j]; }
  }
  // Gaussian elimination
  const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < 4; i++) {
    let p = i;
    for (let k = i + 1; k < 4; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = i + 1; k < 4; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j < 5; j++) M[k][j] -= f * M[i][j]; }
  }
  const s = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) { let v = M[i][4]; for (let j = i + 1; j < 4; j++) v -= M[i][j] * s[j]; s[i] = v / M[i][i]; }
  const center = [-s[0] / 2, -s[1] / 2, -s[2] / 2];
  const radius = Math.sqrt(center[0] ** 2 + center[1] ** 2 + center[2] ** 2 - s[3]);
  const residuals = pts.map((p) => Math.abs(dist(p, center) - radius));
  return { center, radius, rmsResidual: Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length) };
}
const round = (v, d = 6) => (Array.isArray(v) ? v.map((x) => +x.toFixed(d)) : +v.toFixed(d));
const normalize = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

// ---------------------------------------------------------------- main
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
mkdirSync(OUT, { recursive: true });
const srcPath = SPEC.source.file;
const shaBefore = fileSha(srcPath);
if (shaBefore !== SPEC.source.sha256) throw new Error(`source sha256 ${shaBefore} != spec ${SPEC.source.sha256}`);

const report = { assetId: SPEC.assetId, generatedAt: new Date().toISOString(), source: { file: srcPath, sha256Before: shaBefore }, outputs: {}, textures: [], problems: [] };
const manifest = {
  schema: 1, kind: "body_overview", assetId: SPEC.assetId,
  coordinateSystem: { space: "glTF", up: "+Y", units: "metres", note: "Same world frame as the joint manifests (source atlas coordinates)." },
  source: { file: "Human_Body_Complete.glb", scene: SPEC.source.scene, sha256: shaBefore },
  frame: null, files: {}, structures: [], regions: {}, jointSites: [],
  simplification: { byTissue: Object.fromEntries(SPEC.selection.map((s) => [s.tissue, s.simplify])), overrides: SPEC.simplifyOverrides ?? [] },
  compression: { geometry: "EXT_meshopt_compression (QUANTIZE) + KHR_mesh_quantization", ...QUANT, draco: false, textures: "WebP (quality-gated)", textureQualityGate: TEXTURE_GATE },
  usage: "Orientation and recap shots only. Structures are simplified and have no rig; validated joint assets replace them for motion teaching.",
  attribution: { status: "pending licence confirmation of the source anatomy asset" },
  generatedAt: report.generatedAt,
};

// ---- analysis pass on the unsimplified source ----
{
  const doc = await io.read(srcPath);
  const byName = new Map(doc.getRoot().listNodes().filter((n) => n.getMesh()).map((n) => [n.getName(), n]));
  const need = (name) => { const n = byName.get(name); if (!n) throw new Error(`jointSites: source object ${name} not found`); return n; };
  const matching = (re) => [...byName.values()].filter((n) => new RegExp(re).test(n.getName()));
  const right = centroid(matching(SPEC.frame.rightSideMarker).flatMap((n) => [centroid(worldPositions(n))]));
  const left = centroid(matching(SPEC.frame.leftSideMarker).flatMap((n) => [centroid(worldPositions(n))]));
  const ant = centroid(worldPositions(matching(SPEC.frame.anteriorStructure)[0]));
  const post = centroid(worldPositions(matching(SPEC.frame.posteriorStructure)[0]));
  const up = [0, 1, 0];
  const rightDir = normalize([right[0] - left[0], 0, right[2] - left[2]]);
  const anterior = normalize([ant[0] - post[0], 0, ant[2] - post[2]]);
  const all = getBounds(doc.getRoot().listScenes()[0]);
  manifest.frame = { up, right: round(rightDir), anterior: round(anterior), bounds: { min: round(all.min), max: round(all.max) }, method: "right = centroid(| Right objects) - centroid(| Left objects); anterior = sternum body centroid - T6 centroid (horizontal)" };

  for (const site of SPEC.jointSites) {
    const [aName, bName] = site.structures;
    const A = worldPositions(need(aName));
    const B = worldPositions(need(bName));
    const r = site.contactMm / 1000;
    const nearB = grid(B, r);
    const nearA = grid(A, r);
    const contact = [...A.filter((p) => nearB(p, r)), ...B.filter((p) => nearA(p, r))];
    if (contact.length < 8) { report.problems.push(`${site.siteId}: only ${contact.length} contact vertices within ${site.contactMm} mm`); continue; }
    const anchor = centroid(contact);
    const spread = Math.max(...contact.map((p) => dist(p, anchor)));
    const entry = {
      siteId: site.siteId, jointType: site.jointType, indicator: site.indicator,
      sourceObjects: site.structures, structureIds: site.structures.map((n) => `body.${slug(n)}`),
      anchor: round(anchor), radiusM: round(Math.max(0.015, spread), 5),
      method: `contact centroid: vertices of either structure within ${site.contactMm} mm of the other (source geometry, unsimplified)`,
      precision: "approximate joint-region marker computed from geometry; not a measured joint centre",
      contactVertices: contact.length,
    };
    if (site.indicatorAxis) entry.indicatorAxis = { axis: site.indicatorAxis === "up" ? up : round(rightDir), representation: "schematic", note: `indicator axis = body ${site.indicatorAxis} direction; not a fitted anatomical axis` };
    if (site.method === "contact_sphere") {
      const S = worldPositions(need(site.sphereOf));
      const sample = S.filter((p) => dist(p, anchor) <= site.sphereSampleMm / 1000);
      const fit = fitSphere(sample);
      entry.sphere = { center: round(fit.center), radiusM: round(fit.radius, 5), rmsResidualMm: round(fit.rmsResidual * 1000, 3), samples: sample.length, representation: "schematic", note: `least-squares sphere through ${site.sphereOf} vertices within ${site.sphereSampleMm} mm of the contact centroid` };
      if (!(fit.radius > 0.012 && fit.radius < 0.04)) report.problems.push(`${site.siteId}: implausible sphere radius ${fit.radius}`);
    }
    if (site.jointAsset) entry.jointAsset = site.jointAsset;
    manifest.jointSites.push(entry);
  }
}

// ---- export passes ----
for (const [output, cfg] of Object.entries(SPEC.outputs)) {
  const doc = await io.read(srcPath);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const selections = SPEC.selection.filter((s) => s.output === output);
  const kept = [];
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const mats = new Set(mesh.listPrimitives().map((p) => p.getMaterial()?.getName()));
    const name = node.getName();
    const sel = selections.find((s) => mats.has(s.material) && !(s.exclude ?? []).some((re) => new RegExp(re).test(name)) && (!s.includeNames || s.includeNames.some((re) => new RegExp(re, "i").test(name))));
    if (!sel) continue;
    const wm = node.getWorldMatrix();
    if (wm.some((v, i) => Math.abs(v - [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1][i]) > 1e-9)) throw new Error(`${name}: non-identity world transform`);
    kept.push({ node, sel, name });
  }
  // flat scene: selected structure nodes only
  for (const child of scene.listChildren()) scene.removeChild(child);
  const used = new Set();
  for (const { node, sel, name } of kept) {
    node.getParentNode()?.removeChild(node);
    let id = `body.${slug(name)}`;
    if (used.has(id)) throw new Error(`duplicate structureId ${id}`);
    used.add(id);
    const regions = Object.entries(SPEC.regions).filter(([, res]) => res.some((re) => new RegExp(re, "i").test(name))).map(([r]) => r);
    const srcTris = node.getMesh().listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? 0) / 3, 0);
    const srcBounds = getBounds(node);
    node.setName(id.replace(/\./g, "__")).setExtras({ structureId: id, label: name, sourceObject: name, tissue: sel.tissue, regions, role: "body_structure" });
    scene.addChild(node);
    for (const prim of node.getMesh().listPrimitives()) {
      weldPrimitive(prim, {});
      const override = (SPEC.simplifyOverrides ?? []).find((o) => new RegExp(o.match, "i").test(name));
      const simp = override ?? sel.simplify;
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: simp.ratio, error: simp.error, lockBorder: false });
    }
    const tris = node.getMesh().listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? 0) / 3, 0);
    const b = getBounds(node);
    const bboxDevMm = Math.max(...[0, 1, 2].flatMap((i) => [Math.abs(b.min[i] - srcBounds.min[i]), Math.abs(b.max[i] - srcBounds.max[i])])) * 1000;
    manifest.structures.push({ structureId: id, label: name, sourceObject: name, tissue: sel.tissue, output, regions, nodeName: node.getName(), sourceTriangles: srcTris, triangles: tris, bbox: { min: round(b.min), max: round(b.max) }, bboxDeviationMm: round(bboxDevMm, 3) });
    for (const r of regions) (manifest.regions[r] ??= []).push(id);
  }
  // remove every other node + unused resources
  for (const n of root.listNodes()) if (!used.has((n.getExtras() ?? {}).structureId)) n.dispose();
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === "KHR_materials_clearcoat") ext.dispose();
  await doc.transform(prune({ keepExtras: true }), dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MATERIAL, PropertyType.TEXTURE], keepUniqueNames: true }));
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for (const t of root.listTextures()) {
    const choice = await chooseWebP(Buffer.from(t.getImage()), t.getName());
    t.setImage(new Uint8Array(choice.bytes)).setMimeType("image/webp");
    report.textures.push({ output, ...choice.metrics });
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium", ...QUANT }));
  const glb = await io.writeBinary(doc);
  const path = join(OUT, cfg.url);
  writeFileSync(path, glb);
  const gzipBytes = gzipSync(glb, { level: 9 }).byteLength;
  const tris = manifest.structures.filter((s) => s.output === output).reduce((a, s) => a + s.triangles, 0);
  const srcTris = manifest.structures.filter((s) => s.output === output).reduce((a, s) => a + s.sourceTriangles, 0);
  manifest.files[output] = { url: cfg.url, bytes: glb.byteLength, gzipBytes, sha256: sha256(glb), structures: kept.length, triangles: tris, sourceTriangles: srcTris, budgetGzipKB: cfg.budgetGzipKB, extensionsRequired: root.listExtensionsRequired().map((e) => e.extensionName).sort(), materials: root.listMaterials().map((m) => m.getName()) };
  if (gzipBytes > cfg.budgetGzipKB * 1000) report.problems.push(`${output}: gzip ${gzipBytes} B exceeds budget ${cfg.budgetGzipKB} KB`);
  report.outputs[output] = manifest.files[output];
}

// joint-site structures must exist in the exported asset
const ids = new Set(manifest.structures.map((s) => s.structureId));
for (const site of manifest.jointSites) for (const id of site.structureIds) if (!ids.has(id)) report.problems.push(`${site.siteId}: ${id} not exported`);
report.source.sha256After = fileSha(srcPath);
if (report.source.sha256After !== shaBefore) report.problems.push("SOURCE FILE CHANGED");
report.passed = report.problems.length === 0;
writeFileSync(join(OUT, "body-manifest.json"), JSON.stringify(manifest, null, 1));
writeFileSync(join(OUT, "body.build_report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ passed: report.passed, problems: report.problems, files: manifest.files, sites: manifest.jointSites.map((s) => [s.siteId, s.anchor, s.radiusM, s.sphere?.radiusM, s.contactVertices]), frame: manifest.frame, regions: Object.fromEntries(Object.entries(manifest.regions).map(([k, v]) => [k, v.length])), maxBboxDevMm: Math.max(...manifest.structures.map((s) => s.bboxDeviationMm)), textures: report.textures }, null, 1));
