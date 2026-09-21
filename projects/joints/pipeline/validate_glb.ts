// Gate 2: validate optimised web assets against the manifest, the spec, and the Blender-side export record.
// Usage: node pipeline/validate_glb.ts --joint elbow_r [--dir <assets dir>] [--label <name>]
// Exit 0 = PASS, 1 = FAIL. Writes qa/reports/<joint>.gate2[.<label>].json
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import Ajv from "ajv";
import validator from "gltf-validator";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const joint = arg("--joint");
const DIR = resolve(arg("--dir", join(ROOT, "qa", "export", joint, "optimized")));
const label = arg("--label", "staging");
const TIERS = ["core", "detail", "context"];
const ANATOMY_ROLES = new Set(["bone_fixed", "bone_moving", "follow", "tracked", "spanning_soft", "attached_soft", "context"]);
const BBOX_TOL = 0.0001; // 0.1 mm
const POS_TOL = 0.0001;
const EXPECTED_OFFSET = 13.62510376997268;

const checks = [];
const check = (id, name, pass, detail) => { checks.push({ id, name, pass: !!pass, detail }); return !!pass; };
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b)); // order-independent deep equality

const config = JSON.parse(readFileSync(join(ROOT, "pipeline", "config.json"), "utf8"));
const spec = JSON.parse(readFileSync(join(ROOT, "pipeline", "specs", `${joint}.json`), "utf8"));
const manifestPath = join(DIR, "joint-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const rawManifest = JSON.parse(readFileSync(join(ROOT, "qa", "export", joint, "joint-manifest.raw.json"), "utf8"));
const specById = Object.fromEntries(spec.structures.map((s) => [s.structureId, s]));

// 15. manifest schema
const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(readFileSync(join(ROOT, "pipeline", "schemas", "joint-manifest.schema.json"), "utf8"));
const schemaOk = ajv.validate(schema, manifest);
check(15, "manifest schema-valid", schemaOk, schemaOk ? "valid" : ajv.errors?.slice(0, 10));

// 16. asset paths resolve + hashes/bytes
const fileInfo = {};
const pathProblems = [];
for (const t of TIERS) {
  const p = join(DIR, manifest.tiers[t].url);
  if (!existsSync(p)) { pathProblems.push(`${t}: missing ${p}`); continue; }
  const buf = readFileSync(p);
  fileInfo[t] = { path: p, buf };
  if (sha256(buf) !== manifest.tiers[t].sha256 || buf.byteLength !== manifest.tiers[t].bytes) pathProblems.push(`${t}: sha/bytes mismatch`);
}
check(16, "asset paths resolve (and sha256/bytes match manifest)", pathProblems.length === 0, pathProblems.length ? pathProblems : TIERS.map((t) => manifest.tiers[t].url));

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });

const khronos = {};
const perTier = {};
const allStructureNodes = {};
const allAnchorNodes = {};
let animationChannels = 0;
const problems = { extras: [], triangles: [], bbox: [], tier: [], qa: [], anchors: [], carriers: [], ids: [] };

for (const t of TIERS) {
  if (!fileInfo[t]) continue;
  const bytes = new Uint8Array(fileInfo[t].buf);
  // 1. Khronos validator
  const rep = await validator.validateBytes(bytes, { uri: manifest.tiers[t].url, maxIssues: 500, externalResourceFunction: () => Promise.reject(new Error("no external resources expected")) });
  const doc = await io.readBinary(bytes);
  // The Khronos validator cannot decode EXT_meshopt_compression; also validate a decoded copy so buffer data is really checked.
  const decodedDoc = await io.readBinary(bytes);
  decodedDoc.getRoot().listExtensionsUsed().filter((e) => e.extensionName === "EXT_meshopt_compression").forEach((e) => e.dispose());
  const decodedBytes = await io.writeBinary(decodedDoc);
  const repDecoded = await validator.validateBytes(decodedBytes, { uri: manifest.tiers[t].url.replace(".glb", ".decoded.glb"), maxIssues: 500 });
  const summarize = (r) => ({ errors: r.issues.numErrors, warnings: r.issues.numWarnings, infos: r.issues.numInfos, hints: r.issues.numHints,
    codes: [...new Set(r.issues.messages.map((m) => `${["E", "W", "I", "H"][m.severity]}:${m.code}`))], extensionsUsed: r.info?.extensionsUsed, animationCount: r.info?.animationCount,
    totalTriangleCount: r.info?.totalTriangleCount, validatorVersion: r.validatorVersion });
  khronos[t] = { ...summarize(rep), decodedCopy: summarize(repDecoded) };
  const root = doc.getRoot();
  animationChannels += root.listAnimations().reduce((s, a) => s + a.listChannels().length, 0);
  const nodes = root.listNodes();
  const names = nodes.map((n) => n.getName());
  const nonCarrier = nodes.filter((n) => !(n.getExtras() ?? {}).meshCarrierFor);
  if (new Set(names).size !== names.length) problems.ids.push(`${t}: duplicate node names`);

  // 6. tier membership (by node name set) ; 7. QA absent
  const nodeNames = nonCarrier.map((n) => n.getName()).sort();
  if (!eq(nodeNames, [...manifest.tiers[t].nodes].sort())) problems.tier.push({ tier: t, glbOnly: nodeNames.filter((n) => !manifest.tiers[t].nodes.includes(n)), manifestOnly: manifest.tiers[t].nodes.filter((n) => !nodeNames.includes(n)) });
  const qaNodes = nodes.filter((n) => (n.getExtras() ?? {}).qa === true || /__qa__/.test(n.getName())).map((n) => n.getName());
  if (qaNodes.length) problems.qa.push({ tier: t, qaNodes });

  // structures: extras, triangles, bbox, carriers
  const structNodes = nonCarrier.filter((n) => ANATOMY_ROLES.has((n.getExtras() ?? {}).role) && (n.getExtras() ?? {}).structureId);
  const tierIds = structNodes.map((n) => n.getExtras().structureId).sort();
  if (!eq(tierIds, [...manifest.tiers[t].structureIds].sort())) problems.tier.push({ tier: t, structureIdsDiffer: { glb: tierIds, manifest: manifest.tiers[t].structureIds } });
  let tierTris = 0;
  for (const n of structNodes) {
    const x = n.getExtras();
    if (allStructureNodes[x.structureId]) problems.ids.push(`duplicate structureId across/within tiers: ${x.structureId}`);
    allStructureNodes[x.structureId] = { tier: t, node: n.getName() };
    const m = manifest.structures.find((s) => s.structureId === x.structureId);
    const r = rawManifest.structures.find((s) => s.structureId === x.structureId);
    const s = specById[x.structureId];
    for (const k of ["structureId", "jointId", "role", "tier", "side", "label"]) if (x[k] === undefined) problems.extras.push(`${x.structureId}: extras.${k} missing`);
    if (!m || !s || x.role !== m.role || x.role !== s.role || x.tier !== m.tier || x.tier !== s.tier || x.tier !== t || x.side !== m.side || x.side !== spec.side || x.label !== m.label || x.label !== s.label || x.jointId !== joint)
      problems.extras.push(`${x.structureId}: extras/manifest/spec semantics differ`);
    if (!eq(m, r)) problems.extras.push(`${x.structureId}: optimised manifest entry differs from Blender export record`);
    const carriers = n.listChildren().filter((c) => (c.getExtras() ?? {}).meshCarrierFor === x.structureId);
    if (carriers.length !== 1 || !carriers[0].getMesh()) { problems.carriers.push(`${x.structureId}: expected exactly one mesh carrier`); continue; }
    const mesh = carriers[0].getMesh();
    if (mesh.listParents().filter((p) => p.propertyType === "Node").length !== 1) problems.carriers.push(`${x.structureId}: mesh instanced/shared`);
    // 3. triangles
    let tris = 0;
    const wm = carriers[0].getWorldMatrix();
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const el = [0, 0, 0];
    for (const prim of mesh.listPrimitives()) {
      tris += (prim.getIndices() ? prim.getIndices().getCount() : prim.getAttribute("POSITION").getCount()) / 3;
      const pos = prim.getAttribute("POSITION");
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, el);
        const w = [wm[0] * el[0] + wm[4] * el[1] + wm[8] * el[2] + wm[12], wm[1] * el[0] + wm[5] * el[1] + wm[9] * el[2] + wm[13], wm[2] * el[0] + wm[6] * el[1] + wm[10] * el[2] + wm[14]];
        for (let k = 0; k < 3; k++) { if (w[k] < min[k]) min[k] = w[k]; if (w[k] > max[k]) max[k] = w[k]; }
      }
    }
    tierTris += tris;
    if (!m || tris !== m.triangles || tris !== r.triangles) problems.triangles.push(`${x.structureId}: glb ${tris} manifest ${m?.triangles} blender ${r?.triangles}`);
    // 4. world bbox within 0.1 mm of the Blender neutral bbox (Y-up)
    const dev = Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(min[k] - r.neutralWorldBBox.min[k]), Math.abs(max[k] - r.neutralWorldBBox.max[k])]));
    if (!(dev <= BBOX_TOL)) problems.bbox.push(`${x.structureId}: ${(dev * 1000).toFixed(4)} mm`);
    perTier[t] = perTier[t] ?? { maxBBoxDeviationMm: 0 };
    perTier[t].maxBBoxDeviationMm = Math.max(perTier[t].maxBBoxDeviationMm, dev * 1000);
  }
  perTier[t] = { ...(perTier[t] ?? {}), nodes: nodes.length, structureNodes: structNodes.length, carriers: nodes.length - nonCarrier.length, triangles: tierTris, manifestTriangles: manifest.tiers[t].triangles };
  if (tierTris !== manifest.tiers[t].triangles) problems.triangles.push(`${t}: tier triangles ${tierTris} != ${manifest.tiers[t].triangles}`);

  // anchors
  for (const n of nonCarrier.filter((n) => (n.getExtras() ?? {}).role === "anchor")) {
    const x = n.getExtras();
    if (allAnchorNodes[x.anchorId]) problems.ids.push(`duplicate anchorId ${x.anchorId}`);
    allAnchorNodes[x.anchorId] = { tier: t };
    const m = manifest.anchors.find((a) => a.anchorId === x.anchorId);
    if (!m) { problems.anchors.push(`${x.anchorId}: not in manifest`); continue; }
    const wp = n.getWorldTranslation();
    const dev = Math.max(...[0, 1, 2].map((k) => Math.abs(wp[k] - m.neutralWorldPosition[k])));
    const parentName = n.getParentNode()?.getName() ?? null;
    if (m.tier !== t || parentName !== m.parentNode || x.structureId !== m.structureId || x.anchorType !== m.anchorType || x.motionBehavior !== m.motionBehavior || x.export !== true || x.qa !== false
      || !eq(x.localPosition, m.blenderLocalPosition) || dev > POS_TOL)
      problems.anchors.push({ anchorId: x.anchorId, tier: t, parentName, expectedParent: m.parentNode, worldDevMm: +(dev * 1000).toFixed(5) });
    if (x.anchorType === "band_attachment" && (x.representation !== "schematic" || x.deformationSimulation !== false)) problems.anchors.push(`${x.anchorId}: band not schematic`);
  }

  // 9-12. rig metadata (core)
  if (t === "core") {
    const find = (name) => nodes.find((n) => n.getName() === name);
    const pivot = find(manifest.pivot.node), ctrl = find(manifest.controller.node);
    const pExtras = pivot?.getExtras() ?? {}, cExtras = ctrl?.getExtras() ?? {};
    const pw = pivot ? pivot.getWorldMatrix() : null, cw = ctrl ? ctrl.getWorldMatrix() : null;
    const pivotPointDev = pw ? Math.max(...[0, 1, 2].map((k) => Math.abs(pw[12 + k] - manifest.pivot.point[k]))) : Infinity;
    const axisOf = (m) => { const v = [m[0], m[1], m[2]]; const l = Math.hypot(...v); return v.map((c) => c / l); };
    const angle = (a, b) => (Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;
    perTier.core.rig = {
      pivotFound: !!pivot, controllerFound: !!ctrl, pivotPointDevMm: pivotPointDev * 1000,
      pivotAxisVsManifestDeg: pw ? angle(axisOf(pw), manifest.pivot.flexionAxisWorld) : null, controllerAxisVsManifestDeg: cw ? angle(axisOf(cw), manifest.pivot.flexionAxisWorld) : null,
      controllerParent: ctrl?.getParentNode()?.getName(), pivotRole: pExtras.role, controllerRole: cExtras.role,
    };
    check(9, "controller metadata present", ctrl && cExtras.role === "controller" && cExtras.jointType === spec.jointType && eq(JSON.parse(cExtras.dofs), spec.rig.dofs)
      && eq(JSON.parse(cExtras.semantics), spec.rig.semantics) && eq(JSON.parse(cExtras.drives), manifest.controller.drives) && perTier.core.rig.controllerAxisVsManifestDeg < 0.01 && ctrl.getParentNode()?.getName() === manifest.pivot.node,
      perTier.core.rig);
    check(10, "pivot metadata present", pivot && pExtras.role === "pivot" && pivotPointDev <= POS_TOL && perTier.core.rig.pivotAxisVsManifestDeg < 0.01
      && eq(pExtras.pivot_point_blender, spec.rig.pivot.fitted.pointBlender) && eq(pExtras.flexion_axis_world, spec.rig.pivot.fitted.flexionAxisWorld), perTier.core.rig);
    check(11, "neutral offset exactly matches spec", manifest.semantics.neutral_offset_deg === spec.rig.semantics.neutral_offset_deg && spec.rig.semantics.neutral_offset_deg === EXPECTED_OFFSET
      && pExtras.neutral_offset_deg === EXPECTED_OFFSET && JSON.parse(cExtras.semantics).neutral_offset_deg === EXPECTED_OFFSET && manifest.semantics.neutral_definition.includes("true anatomical elbow extension"),
      { manifest: manifest.semantics.neutral_offset_deg, spec: spec.rig.semantics.neutral_offset_deg, pivotExtras: pExtras.neutral_offset_deg });
  }
}

check(1, "Khronos glTF Validator: 0 errors (compressed file and meshopt-decoded copy)", TIERS.every((t) => khronos[t] && khronos[t].errors === 0 && khronos[t].decodedCopy.errors === 0
  && khronos[t].decodedCopy.totalTriangleCount === manifest.tiers[t].triangles), khronos);
check(2, "manifest structureIds == exported node structureIds", problems.extras.length === 0
  && eq(Object.keys(allStructureNodes).sort(), manifest.structures.map((s) => s.structureId).sort()) && eq(manifest.structures.map((s) => s.structureId).sort(), spec.structures.map((s) => s.structureId).sort()),
  { exported: Object.keys(allStructureNodes).length, manifest: manifest.structures.length, spec: spec.structures.length, problems: problems.extras });
check(3, "triangle counts exact (Blender source; no LOD1 used)", problems.triangles.length === 0, { perTier: Object.fromEntries(TIERS.map((t) => [t, perTier[t]?.triangles])), problems: problems.triangles });
check(4, "world-space bounding boxes within 0.1 mm (Y-up)", problems.bbox.length === 0, { maxDeviationMm: Object.fromEntries(TIERS.map((t) => [t, perTier[t]?.maxBBoxDeviationMm])), problems: problems.bbox });
check(5, "IDs unique and complete", problems.ids.length === 0 && problems.carriers.length === 0 && Object.keys(allAnchorNodes).length === manifest.anchors.length
  && new Set(manifest.anchors.map((a) => a.anchorId)).size === manifest.anchors.length, { anchors: Object.keys(allAnchorNodes).length, problems: [...problems.ids, ...problems.carriers] });
check(6, "tier membership correct", problems.tier.length === 0 && TIERS.every((t) => eq([...manifest.tiers[t].structureIds].sort(), spec.structures.filter((s) => s.tier === t).map((s) => s.structureId).sort())), problems.tier);
check(7, "QA objects absent", problems.qa.length === 0, problems.qa);
const expectedAnchors = [...spec.overlay.anchors, ...spec.overlay.bandAnchors].map((a) => a.anchorId).sort();
check(8, "overlay anchors present (17) with exact positions/parents", problems.anchors.length === 0 && eq(Object.keys(allAnchorNodes).sort(), expectedAnchors), { found: Object.keys(allAnchorNodes).length, problems: problems.anchors });
const dof = manifest.dofs[0];
check(12, "DOF flexion +X 0-145 deg", manifest.dofs.length === 1 && dof.id === "flexion" && dof.axis === "+X" && dof.min === 0 && dof.max === 145 && dof.neutral === 0 && dof.unit === "deg" && eq(manifest.dofs, spec.rig.dofs)
  && manifest.semantics.range_status === "approximate, pending cited reference", dof);
check(13, "no animation channels", animationChannels === 0 && TIERS.every((t) => (khronos[t]?.animationCount ?? 0) === 0), { animationChannels });
const budgets = Object.fromEntries(TIERS.map((t) => {
  const limit = manifest.budgetsKB[`${t}KB`] * 1000;
  const tt = manifest.tiers[t];
  return [t, { limitBytes: limit, glbBytes: tt.bytes, gzipBytes: tt.gzipBytes, brotliBytes: tt.brotliBytes, gzipExcludingTextures: tt.gzipBytesExcludingTextures,
    pass: tt.gzipBytes <= limit, basis: "gzip -9 transfer size INCLUDING embedded textures (conservative)" }];
}));
check(14, "budgets (transfer, incl. embedded textures)", TIERS.every((t) => budgets[t].pass), budgets);
const workingSha = sha256(readFileSync(join(ROOT, config.working.path)));
check(17, "source hashes / provenance preserved", manifest.source.sha256 === config.master.sha256 && manifest.structures.every((s) => s.source.fileSha256 === config.master.sha256)
  && manifest.source.workingFileSha256 === workingSha && TIERS.every((t) => manifest.tiers[t].rawSha256 === sha256(readFileSync(join(ROOT, "qa", "export", joint, `${joint}.${t}.raw.glb`)))),
  { master: manifest.source.sha256, working: manifest.source.workingFileSha256, workingOnDisk: workingSha });
// extras semantics for bands (manifest distinguishes real mesh vs schematic)
check(18, "bands: schematic overlay distinct from real ligament mesh", manifest.bands.length === 2 && manifest.bands.every((b) => b.representation === "schematic" && b.deformationSimulation === false
  && b.realLigamentMesh.structureId === b.structureId && manifest.structures.find((s) => s.structureId === b.structureId)?.tier === "detail" && allAnchorNodes[b.proximalAnchorId] && allAnchorNodes[b.distalAnchorId])
  && manifest.bandRepresentation.deformationSimulation === false, manifest.bands.map((b) => ({ bandId: b.bandId, proximal: b.proximalAnchorId, distal: b.distalAnchorId })));
check(19, "no Draco, meshopt + quantization required", TIERS.every((t) => manifest.tiers[t].extensionsRequired.includes("EXT_meshopt_compression") && manifest.tiers[t].extensionsRequired.includes("KHR_mesh_quantization")
  && !(khronos[t]?.extensionsUsed ?? []).includes("KHR_draco_mesh_compression")), TIERS.map((t) => manifest.tiers[t].extensionsRequired));

const passed = checks.every((c) => c.pass);
const result = { joint, label, dir: DIR, validatedAt: new Date().toISOString(), passed, failed: checks.filter((c) => !c.pass).map((c) => `${c.id} ${c.name}`), checks, khronos, perTier };
mkdirSync(join(ROOT, "qa", "reports"), { recursive: true });
writeFileSync(join(ROOT, "qa", "reports", `${joint}.gate2${label === "staging" ? "" : "." + label}.json`), JSON.stringify(result, null, 1));
console.log(JSON.stringify({ passed, failed: result.failed, checks: checks.map((c) => `${c.pass ? "PASS" : "FAIL"} ${c.id} ${c.name}`), khronos: Object.fromEntries(TIERS.map((t) => [t, khronos[t] && { errors: khronos[t].errors, warnings: khronos[t].warnings, infos: khronos[t].infos, codes: khronos[t].codes, decodedCopy: khronos[t].decodedCopy }])),
  perTier, budgets }, null, 1));
process.exit(passed ? 0 : 1);
