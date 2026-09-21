#!/usr/bin/env node
// Validates the tiered body delivery asset (staging or promoted) and optionally promotes it.
//   node pipeline/body/validate_body_delivery.ts [--dir qa/export/body_v2] [--promote]
// Promotion writes public/assets/body/v2/ and public/assets/shared/body-materials.glb through an incoming directory + rename,
// after every check passed. The Step-11 files in public/assets/body/ are never touched.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import { MeshoptDecoder } from "meshoptimizer";
import validator from "gltf-validator";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (name, def) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : def);
const dir = resolve(ROOT, arg("--dir", "qa/export/body_v3"));
const promote = process.argv.includes("--promote");
const promoted = dir.replaceAll("\\", "/").includes("public/assets/body/v3");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const SPEC = JSON.parse(readFileSync(join(ROOT, "pipeline", "specs", "body_delivery.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(dir, "body-delivery.json"), "utf8"));
const step11 = JSON.parse(readFileSync(join(ROOT, SPEC.input.manifest), "utf8"));
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });
const khronos = {};
const summarize = (r) => ({ errors: r.issues.numErrors, warnings: r.issues.numWarnings, infos: r.issues.numInfos, codes: [...new Set(r.issues.messages.map((m) => m.code))] });

// ---- manifest structure
const byId = new Map(manifest.structures.map((s) => [s.structureId, s]));
const groups = new Map(manifest.groups.map((g) => [g.groupId, g]));
const groupOf = new Map();
let partition = true;
for (const g of manifest.groups) for (const id of g.structureIds) {
  if (groupOf.has(id) || !byId.has(id)) partition = false;
  groupOf.set(id, g.groupId);
}
check("groups partition the structures exactly (every structure in exactly one group, groupId consistent)", partition && manifest.structures.every((s) => groupOf.get(s.structureId) === s.groupId) && groupOf.size === manifest.structures.length, { structures: manifest.structures.length, groups: manifest.groups.length });
check("structure set identical to the Step-11 body asset (ids, labels, source objects, regions)", step11.structures.length === manifest.structures.length && step11.structures.every((s) => { const m = byId.get(s.structureId); return m && m.label === s.label && m.sourceObject === s.sourceObject && JSON.stringify(m.regions) === JSON.stringify(s.regions); }));
check("joint sites, regions and frame carried over unchanged from Step 11", JSON.stringify(step11.jointSites) === JSON.stringify(manifest.jointSites) && JSON.stringify(step11.regions) === JSON.stringify(manifest.regions) && JSON.stringify(step11.frame) === JSON.stringify(manifest.frame));
// group homogeneity: presentation boundaries
const sitesOf = (id) => manifest.jointSites.filter((s) => s.structureIds.includes(id)).map((s) => s.siteId).sort().join(",");
let homogeneous = true;
for (const g of manifest.groups) {
  const first = byId.get(g.structureIds[0]);
  for (const id of g.structureIds) {
    const s = byId.get(id);
    if (s.output !== g.output || JSON.stringify([...s.regions].sort()) !== JSON.stringify([...first.regions].sort()) || sitesOf(id) !== sitesOf(first.structureId) || JSON.stringify(s.handover) !== JSON.stringify(first.handover) || s.closeup !== first.closeup) homogeneous = false;
  }
}
check("every render group is homogeneous in output, regions, joint sites, joint handover and close-up class", homogeneous);

// ---- close-up classification reproduces the spec rule
const siteAnchor = new Map(manifest.jointSites.map((s) => [s.siteId, s.anchor]));
const boxDistance = (b, c) => Math.hypot(...[0, 1, 2].map((k) => Math.max(b.min[k] - c[k], 0, c[k] - b.max[k])));
const closeupOk = manifest.structures.filter((s) => s.output === "skeleton").every((s) => s.closeup === SPEC.closeupSites.some((c) => boxDistance(s.bbox, siteAnchor.get(c.siteId)) <= c.radiusM + 1e-6));
check("close-up classification matches the spec spheres", closeupOk, { closeup: manifest.structures.filter((s) => s.closeup).length });

// ---- files
const lodTris = (g, lod) => (lod === 0 ? g.triangles.lod0 : g.triangles.lod1);
let worstLod0BboxMm = 0;
let worstLod1BboxMm = 0;
for (const [fileId, file] of Object.entries(manifest.files)) {
  const bytes = new Uint8Array(readFileSync(join(dir, file.url)));
  check(`${fileId}: bytes + sha256 match manifest`, bytes.byteLength === file.bytes && sha256(bytes) === file.sha256);
  const rep = await validator.validateBytes(bytes, { uri: file.url, maxIssues: 500 });
  const doc = await io.readBinary(bytes);
  const nodes = doc.getRoot().listNodes().filter((n) => n.getMesh());
  if (file.proxy) {
    // delivery-only proxy: one node, whole output, untextured, bounded simplification error
    const n = nodes[0];
    const x = n?.getExtras() ?? {};
    const tris = n ? n.getMesh().listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0) : -1;
    const hasUv = n?.getMesh().listPrimitives().some((p) => p.getAttribute("TEXCOORD_0"));
    const b = n ? getBounds(n) : null;
    const members = step11.structures.filter((s) => s.output === file.output).map((s) => s.bbox);
    const union = { min: [0, 1, 2].map((k) => Math.min(...members.map((m) => m.min[k]))), max: [0, 1, 2].map((k) => Math.max(...members.map((m) => m.max[k]))) };
    const dev = b ? Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(b.min[k] - union.min[k]), Math.abs(b.max[k] - union.max[k])])) * 1000 : Infinity;
    const limit = (file.output === "skin" ? SPEC.skinIntro.maxErrorM : SPEC.intro.maxErrorM) * 1000 + 0.2;
    check(`${fileId}: proxy = one untextured node covering the whole ${file.output} (bbox within ${limit.toFixed(1)} mm)`, nodes.length === 1 && x.role === "body_proxy" && x.output === file.output && tris === file.triangles && !hasUv && dev <= limit && file.maxErrorM <= limit / 1000, { nodes: nodes.length, tris, bboxDevMm: +dev.toFixed(3) });
    check(`${fileId}: bytes + sha256 match manifest`, bytes.byteLength === file.bytes && sha256(bytes) === file.sha256);
    const rep = await validator.validateBytes(bytes, { uri: file.url, maxIssues: 500 });
    for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === "EXT_meshopt_compression") e.dispose();
    const repDecoded = await validator.validateBytes(await io.writeBinary(doc), { uri: file.url.replace(".glb", ".decoded.glb"), maxIssues: 500 });
    khronos[fileId] = { compressed: summarize(rep), decoded: summarize(repDecoded) };
    check(`${fileId}: Khronos validator 0 errors (compressed + decoded)`, rep.issues.numErrors === 0 && repDecoded.issues.numErrors === 0, khronos[fileId]);
    const budget = SPEC.budgetsGzipKB[fileId];
    if (typeof budget === "number") check(`${fileId}: gzip within budget (${budget} KB)`, file.gzipBytes <= budget * 1000, { gzipBytes: file.gzipBytes });
    continue;
  }
  const seen = new Set();
  let trisOk = true;
  let finite = true;
  for (const n of nodes) {
    const x = n.getExtras() ?? {};
    const g = groups.get(x.groupId);
    if (!g || seen.has(x.groupId) || !file.groups.includes(x.groupId) || x.lod !== file.lod) trisOk = false;
    seen.add(x.groupId);
    const t = n.getMesh().listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0);
    if (g && t !== lodTris(g, file.lod)) trisOk = false;
    const b = getBounds(n);
    if (![...b.min, ...b.max].every(Number.isFinite)) finite = false;
    if (g) {
      // bbox of the group geometry vs the union of the Step-11 structure boxes it contains
      const members = g.structureIds.map((id) => step11.structures.find((s) => s.structureId === id).bbox);
      const union = { min: [0, 1, 2].map((k) => Math.min(...members.map((m) => m.min[k]))), max: [0, 1, 2].map((k) => Math.max(...members.map((m) => m.max[k]))) };
      const dev = Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(b.min[k] - union.min[k]), Math.abs(b.max[k] - union.max[k])])) * 1000;
      if (file.lod === 0) worstLod0BboxMm = Math.max(worstLod0BboxMm, dev);
      else if (file.output === "skeleton") worstLod1BboxMm = Math.max(worstLod1BboxMm, dev);
    }
  }
  check(`${fileId}: group nodes match manifest (ids, LOD, triangle counts, coverage)`, trisOk && seen.size === file.groups.length && file.groups.every((g) => seen.has(g)), { nodes: nodes.length, groups: file.groups.length });
  check(`${fileId}: geometry finite`, finite);
  for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === "EXT_meshopt_compression") e.dispose();
  const repDecoded = await validator.validateBytes(await io.writeBinary(doc), { uri: file.url.replace(".glb", ".decoded.glb"), maxIssues: 500 });
  khronos[fileId] = { compressed: summarize(rep), decoded: summarize(repDecoded) };
  check(`${fileId}: Khronos validator 0 errors (compressed + decoded)`, rep.issues.numErrors === 0 && repDecoded.issues.numErrors === 0, khronos[fileId]);
  const budget = SPEC.budgetsGzipKB[fileId];
  if (typeof budget === "number") check(`${fileId}: gzip within budget (${budget} KB)`, file.gzipBytes <= budget * 1000, { gzipBytes: file.gzipBytes });
}
check("LOD0 geometry = Step-11 geometry: group bbox equals the union of the Step-11 structure boxes (<= 0.2 mm re-quantization)", worstLod0BboxMm <= 0.2, { worstMm: +worstLod0BboxMm.toFixed(4) });
check(`LOD1 bbox deviation <= LOD1 max error (${SPEC.lod1.maxErrorM * 1000} mm) + 0.2 mm`, worstLod1BboxMm <= SPEC.lod1.maxErrorM * 1000 + 0.2, { worstMm: +worstLod1BboxMm.toFixed(4) });
check("LOD1 simplification error within the spec bound for every structure", manifest.structures.every((s) => s.lod1ErrorM <= (s.output === "skin" ? SPEC.skinLod1.maxErrorM : SPEC.lod1.maxErrorM) + 1e-7));

// ---- tiers
for (const [tier, t] of Object.entries(manifest.tiers)) {
  const groupStage = t.stages.find((st) => st.files.every((f) => !manifest.files[f].proxy));
  const first = new Set(groupStage.files.flatMap((f) => manifest.files[f].groups));
  if (t.stages[0].files.every((f) => manifest.files[f].proxy)) check(`tier ${tier}: proxy first stage shows the whole skeleton and is the same for every tier`, t.stages[0].files.some((f) => manifest.files[f].output === "skeleton") && JSON.stringify(t.stages[0]) === JSON.stringify(manifest.tiers.medium.stages[0]));
  const final = new Map();
  for (const st of t.stages) for (const f of st.files) for (const g of manifest.files[f].groups) final.set(g, manifest.files[f].lod);
  check(`tier ${tier}: first group stage delivers the whole body (every group)`, manifest.groups.every((g) => first.has(g.groupId)));
  check(`tier ${tier}: every close-up skeleton group ends at LOD0`, manifest.groups.filter((g) => g.output === "skeleton" && g.closeup).every((g) => final.get(g.groupId) === 0));
  check(`tier ${tier}: stages match the spec`, JSON.stringify(t.stages) === JSON.stringify(SPEC.tiers[tier].stages));
}

// ---- material library
{
  const lib = manifest.materialLibrary;
  // staging keeps the library next to the manifest; promoted, it lives at the manifest-relative shared path
  const path = promoted ? resolve(dir, lib.url) : join(dir, "body-materials.glb");
  const bytes = new Uint8Array(readFileSync(path));
  check("material library: bytes + sha256 match manifest", bytes.byteLength === lib.bytes && sha256(bytes) === lib.sha256);
  const rep = await validator.validateBytes(bytes, { uri: "body-materials.glb", maxIssues: 500 });
  khronos.materialLibrary = summarize(rep);
  check("material library: Khronos validator 0 errors", rep.issues.numErrors === 0, khronos.materialLibrary);
  const doc = await io.readBinary(bytes);
  const names = doc.getRoot().listMaterials().map((m) => m.getName()).sort();
  check("material library: one material per group material (bone, cartilage, teeth, skin)", JSON.stringify(names) === JSON.stringify([...lib.materials].sort()) && manifest.groups.every((g) => names.includes(g.material)));
  const texHashes = doc.getRoot().listTextures().map((t) => sha256(t.getImage())).sort();
  check("material library textures are the Step-11 texture bytes (unchanged images)", JSON.stringify(texHashes) === JSON.stringify(manifest.textures.map((t) => t.sha256).sort()));
}

// ---- alignment with the joint asset (handover)
const elbow = JSON.parse(readFileSync(join(ROOT, "public", "assets", "joints", "elbow_r", "joint-manifest.json"), "utf8"));
const bySource = new Map(manifest.structures.map((s) => [s.sourceObject, s]));
const film = elbow.structures.filter((s) => s.tier !== "context" && bySource.has(s.source.object));
const handoverGroups = new Set(film.map((s) => bySource.get(s.source.object).groupId));
const handoverIds = new Set(film.map((s) => bySource.get(s.source.object).structureId));
check("film handover (elbow core/detail shared source objects) covers whole render groups only", [...handoverGroups].every((g) => groups.get(g).structureIds.every((id) => handoverIds.has(id))), { groups: [...handoverGroups], structures: handoverIds.size });
const stationary = elbow.structures.filter((s) => bySource.has(s.source.object) && (s.motionBehavior === "stationary" || s.motionBehavior.endsWith("_stationary")));
let alignDev = 0;
for (const s of stationary) {
  const b = bySource.get(s.source.object).bbox;
  alignDev = Math.max(alignDev, ...[0, 1, 2].flatMap((i) => [Math.abs(b.min[i] - s.neutralWorldBBox.min[i]), Math.abs(b.max[i] - s.neutralWorldBBox.max[i])]));
}
check("stationary shared structures align with the elbow asset (<= 2 mm)", alignDev <= 0.002, { compared: stationary.length, worstMm: +(alignDev * 1000).toFixed(3) });

const passed = checks.every((c) => c.pass);
const label = promoted ? "promoted" : "staging";
mkdirSync(join(ROOT, "qa", "reports"), { recursive: true });
writeFileSync(join(ROOT, "qa", "reports", `body_delivery.validation.${label}.json`), JSON.stringify({ dir, passed, checks, khronos, generatedAt: new Date().toISOString() }, null, 1));
console.log(JSON.stringify({ passed, checks: checks.map((c) => `${c.pass ? "PASS" : "FAIL"} ${c.name}${c.pass ? "" : " " + JSON.stringify(c.detail ?? "")}`) }, null, 1));
if (!passed) process.exit(1);

if (promote) {
  const files = [...Object.values(manifest.files).map((f) => f.url), "body-delivery.json"];
  const target = join(ROOT, "public", "assets", "body", "v3");
  const incoming = join(ROOT, "public", "assets", "body", `.v3.incoming-${Date.now()}`);
  mkdirSync(incoming, { recursive: true });
  for (const f of files) copyFileSync(join(dir, f), join(incoming, f));
  for (const f of files) if (sha256(readFileSync(join(incoming, f))) !== sha256(readFileSync(join(dir, f)))) throw new Error(`copy verification failed ${f}`);
  const sharedDir = join(ROOT, "public", "assets", "shared");
  mkdirSync(sharedDir, { recursive: true });
  const libIncoming = join(sharedDir, `.body-materials.incoming-${Date.now()}.glb`);
  copyFileSync(join(dir, "body-materials.glb"), libIncoming);
  if (sha256(readFileSync(libIncoming)) !== manifest.materialLibrary.sha256) throw new Error("material library copy verification failed");
  if (existsSync(target)) rmSync(target, { recursive: true });
  renameSync(incoming, target);
  renameSync(libIncoming, join(sharedDir, "body-materials.glb"));
  console.log(JSON.stringify({ promoted: [target, join(sharedDir, "body-materials.glb")], files }));
}
