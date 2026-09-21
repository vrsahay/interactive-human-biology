#!/usr/bin/env node
// Validates the body overview asset (staging or promoted) and optionally promotes it to public/assets/body/.
//   node pipeline/body/validate_body_overview.ts [--dir qa/export/body] [--promote]
// Checks: Khronos validator (compressed + meshopt-decoded copy), manifest <-> glTF extras, triangle counts, finite
// geometry, bbox vs manifest, joint-site references, alignment with joint manifests (shared source objects), file hashes.
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
const dir = resolve(ROOT, arg("--dir", "qa/export/body"));
const promote = process.argv.includes("--promote");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const manifest = JSON.parse(readFileSync(join(dir, "body-manifest.json"), "utf8"));
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });

const khronos = {};
const byId = new Map(manifest.structures.map((s) => [s.structureId, s]));
let worstBbox = 0;
let nonFinite = 0;
for (const [output, file] of Object.entries(manifest.files)) {
  const bytes = new Uint8Array(readFileSync(join(dir, file.url)));
  check(`${output}: bytes + sha256 match manifest`, bytes.byteLength === file.bytes && sha256(bytes) === file.sha256);
  const rep = await validator.validateBytes(bytes, { uri: file.url, maxIssues: 500 });
  const doc = await io.readBinary(bytes);
  const root = doc.getRoot();
  const nodes = root.listNodes().filter((n) => n.getMesh());
  let tris = 0;
  const seen = new Set();
  let extrasOk = true;
  for (const n of nodes) {
    const x = n.getExtras() ?? {};
    const s = byId.get(x.structureId);
    if (!s || s.output !== output || s.label !== x.label || s.sourceObject !== x.sourceObject || seen.has(x.structureId)) extrasOk = false;
    seen.add(x.structureId);
    const t = n.getMesh().listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? 0) / 3, 0);
    tris += t;
    if (s && t !== s.triangles) extrasOk = false;
    const b = getBounds(n);
    if (![...b.min, ...b.max].every(Number.isFinite)) nonFinite++;
    if (s) worstBbox = Math.max(worstBbox, ...[0, 1, 2].flatMap((i) => [Math.abs(b.min[i] - s.bbox.min[i]), Math.abs(b.max[i] - s.bbox.max[i])]) );
  }
  check(`${output}: structure extras match manifest (ids, labels, source objects, unique)`, extrasOk && seen.size === file.structures, { nodes: nodes.length, manifest: file.structures });
  check(`${output}: triangle count`, tris === file.triangles, { tris, manifest: file.triangles });
  for (const e of root.listExtensionsUsed()) if (e.extensionName === "EXT_meshopt_compression") e.dispose();
  const decoded = await io.writeBinary(doc);
  const repDecoded = await validator.validateBytes(decoded, { uri: file.url.replace(".glb", ".decoded.glb"), maxIssues: 500 });
  const sum = (r) => ({ errors: r.issues.numErrors, warnings: r.issues.numWarnings, infos: r.issues.numInfos, codes: [...new Set(r.issues.messages.map((m) => m.code))], triangles: r.info?.totalTriangleCount });
  khronos[output] = { compressed: sum(rep), decoded: sum(repDecoded) };
  check(`${output}: Khronos validator 0 errors (compressed + decoded)`, rep.issues.numErrors === 0 && repDecoded.issues.numErrors === 0, khronos[output]);
  check(`${output}: gzip within budget`, file.gzipBytes <= file.budgetGzipKB * 1000, { gzipBytes: file.gzipBytes, budgetKB: file.budgetGzipKB });
}
check("geometry finite", nonFinite === 0, { nonFinite });
check("bbox matches manifest (<= 0.1 mm, quantization)", worstBbox <= 0.0001, { worstMm: +(worstBbox * 1000).toFixed(4) });
check("simplification bbox deviation vs source <= 2 mm", Math.max(...manifest.structures.map((s) => s.bboxDeviationMm)) <= 2, { worstMm: Math.max(...manifest.structures.map((s) => s.bboxDeviationMm)) });
const siteRefs = manifest.jointSites.every((s) => s.structureIds.every((id) => byId.has(id)) && s.anchor.every(Number.isFinite));
check("joint sites reference exported structures and finite anchors", siteRefs && manifest.jointSites.length === 6, manifest.jointSites.map((s) => s.siteId));
for (const [r, ids] of Object.entries(manifest.regions)) if (!ids.every((id) => byId.has(id))) check(`region ${r} references`, false);
check("regions present for every taught site", ["skull", "upper_neck", "shoulder_right", "hip_right", "elbow_right", "knee_right"].every((r) => manifest.regions[r]?.length));

// Alignment with joint assets: shared source objects must occupy the same place (joint asset at its source pose).
const elbow = JSON.parse(readFileSync(join(ROOT, "public", "assets", "joints", "elbow_r", "joint-manifest.json"), "utf8"));
const bySource = new Map(manifest.structures.map((s) => [s.sourceObject, s]));
const shared = elbow.structures.filter((s) => bySource.has(s.source.object));
const stationary = shared.filter((s) => s.motionBehavior === "stationary" || s.motionBehavior.endsWith("_stationary"));
let alignDev = 0;
for (const s of stationary) {
  const b = bySource.get(s.source.object).bbox;
  alignDev = Math.max(alignDev, ...[0, 1, 2].flatMap((i) => [Math.abs(b.min[i] - s.neutralWorldBBox.min[i]), Math.abs(b.max[i] - s.neutralWorldBBox.max[i])]));
}
check("elbow_r shares source objects with the body asset; stationary ones align within simplification tolerance (<= 2 mm)", shared.length >= 30 && alignDev <= 0.002, { shared: shared.length, stationaryCompared: stationary.length, worstMm: +(alignDev * 1000).toFixed(3), sourcePoseFlexionDeg: elbow.semantics.source_pose_flexion_deg });
check("body source sha256 recorded", /^[0-9a-f]{64}$/.test(manifest.source.sha256));

const passed = checks.every((c) => c.pass);
const label = dir.includes("public") ? "promoted" : "staging";
mkdirSync(join(ROOT, "qa", "reports"), { recursive: true });
writeFileSync(join(ROOT, "qa", "reports", `body_overview.validation.${label}.json`), JSON.stringify({ dir, passed, checks, khronos, generatedAt: new Date().toISOString() }, null, 1));
console.log(JSON.stringify({ passed, checks: checks.map((c) => `${c.pass ? "PASS" : "FAIL"} ${c.name}`), khronos }, null, 1));
if (!passed) process.exit(1);

if (promote) {
  const target = join(ROOT, "public", "assets", "body");
  const incoming = join(ROOT, "public", "assets", `.body.incoming-${Date.now()}`);
  mkdirSync(incoming, { recursive: true });
  const files = [...Object.values(manifest.files).map((f) => f.url), "body-manifest.json"];
  for (const f of files) copyFileSync(join(dir, f), join(incoming, f));
  for (const f of files) if (sha256(readFileSync(join(incoming, f))) !== sha256(readFileSync(join(dir, f)))) throw new Error(`copy verification failed ${f}`);
  if (existsSync(target)) rmSync(target, { recursive: true });
  renameSync(incoming, target);
  console.log(JSON.stringify({ promoted: target, files }));
}
