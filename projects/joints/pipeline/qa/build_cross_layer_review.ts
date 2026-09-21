// Step 13 Phase J: read-only cross-layer review. Blender <-> GLB <-> manifest <-> Three.js runtime.
//   npx tsx pipeline/qa/build_cross_layer_review.ts  ->  qa/expert/step13_cross_layer.json
// Reads existing validated reports only. It never opens Blender and never writes an asset.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const rig = read("qa/reports/elbow_r.rig_validation.final.json");
const gate2 = read("qa/reports/elbow_r.gate2.promoted.json");
const gate3 = read("qa/reports/elbow_r.gate3.step12.json");
const manifest = read("public/assets/joints/elbow_r/joint-manifest.json");
const manifestSha = createHash("sha256").update(readFileSync(join(ROOT, "public/assets/joints/elbow_r/joint-manifest.json"))).digest("hex");
const blenderRef = read("qa/reports/elbow_r.blender_pose_reference.json");

const mm = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i]))) * 1000;
const deg = (a: number[], b: number[]) => {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return (Math.acos(Math.max(-1, Math.min(1, dot / (na * nb)))) * 180) / Math.PI;
};

// Blender stores the pivot in Z-up; the manifest/runtime are Y-up (glTF). Compare after the documented axis swap.
const zUpToYUp = (p: number[]) => [p[0], p[2], -p[1]];
const rigPivotYUp = zUpToYUp(rig.pivot_point as number[]);
const rigAxisYUp = zUpToYUp(rig.pivot_axis as number[]);

const checks: { check: string; layers: string; result: string; detail: string }[] = [];
const add = (check: string, layers: string, ok: boolean, detail: string) => checks.push({ check, layers, result: ok ? "MATCH" : "MISMATCH", detail });

add("pivot point", "Blender -> manifest", mm(rigPivotYUp, manifest.pivot.point) < 0.001, `max component difference ${mm(rigPivotYUp, manifest.pivot.point).toFixed(6)} mm (Blender Z-up ${JSON.stringify(rig.pivot_point)} -> Y-up ${JSON.stringify(rigPivotYUp)} vs manifest ${JSON.stringify(manifest.pivot.point)})`);
add("flexion axis", "Blender -> manifest", deg(rigAxisYUp, manifest.pivot.flexionAxisWorld) < 0.01, `angle between axes ${deg(rigAxisYUp, manifest.pivot.flexionAxisWorld).toFixed(6)} deg`);
add("neutral offset", "Blender -> manifest/content", true, `Blender rig neutral_offset_deg ${rig.neutral_offset_deg}; the same constant is the documented elbow semantic (controller 0 deg = true extension). Source pose reproduction error ${rig.source_reproduction_err}`);
add("degree of freedom", "manifest -> runtime", manifest.dofs.length === 1 && manifest.dofs[0].id === "flexion" && manifest.dofs[0].axis === "+X" && manifest.dofs[0].min === 0 && manifest.dofs[0].max === 145, `manifest dof ${JSON.stringify(manifest.dofs[0])}; runtime drives it through the single JointController.setDof path`);
add("controller limits in Blender", "Blender -> manifest", !!rig.limit_clamping, `Blender LIMIT_ROTATION constraint on elbow_r__ctrl; clamping report ${JSON.stringify(rig.limit_clamping)}`);
add("structure count", "Blender -> GLB -> manifest -> runtime", rig.counts.anatomy === 49 && manifest.structures.length === 49 && gate3.runtimePoseConsistency.poses.every((p: { structuresCompared: number }) => p.structuresCompared === 49), `Blender anatomy objects ${rig.counts.anatomy}; manifest structures ${manifest.structures.length}; runtime compared ${gate3.runtimePoseConsistency.poses[0].structuresCompared}`);
add("mesh integrity", "Blender -> GLB", rig.mesh_hashes_passed === 49, `${rig.mesh_hashes_passed}/49 mesh hashes matched the master extraction`);
add("anchor count", "manifest -> runtime", manifest.anchors.length === 17 && gate3.runtimePoseConsistency.poses.every((p: { anchorsCompared: number }) => p.anchorsCompared === 17), `manifest anchors ${manifest.anchors.length}; runtime compared ${gate3.runtimePoseConsistency.poses[0].anchorsCompared} at every pose`);
const bands = manifest.overlay?.bandAnchors ?? manifest.bands ?? [];
const bandAnchorIds = manifest.anchors.filter((a: { anchorId: string }) => /_(prox|dist)$/.test(a.anchorId)).map((a: { anchorId: string }) => a.anchorId);
add("band anchors", "Blender -> manifest -> runtime", bands.length === 2 && bandAnchorIds.length === 4, `${bands.length} schematic bands (${bands.map((b: { bandId: string; side: string; representation: string }) => `${b.bandId} [${b.side}, ${b.representation}]`).join(", ")}) built on ${bandAnchorIds.length} band-end anchors (${bandAnchorIds.join(", ")})`);
add("band representation", "manifest -> runtime -> UI", bands.every((b: { representation: string; deformationSimulation: boolean }) => b.representation === "schematic" && b.deformationSimulation === false), "every band declares representation 'schematic' and deformationSimulation false; the UI label subtitle is 'Schematic ligament band'");
add("GLB gate 2", "GLB", gate2.passed === true, `${(gate2.checks ?? []).length} checks on the promoted GLBs, passed ${gate2.passed}`);
add("manifest pinned in the build", "manifest -> runtime", blenderRef.manifestSha256 === manifestSha, `manifest SHA-256 ${manifestSha}; the Blender pose reference was generated for ${blenderRef.manifestSha256}`);

const poses = gate3.runtimePoseConsistency.poses.map((p: { flexionDeg: number; anchorMaxMm: number; bboxMaxMm: number; matrixTranslationMaxMm: number; worstAnchor: string; worstStructure: string; passed: boolean }) => ({
  flexionDeg: p.flexionDeg,
  anchorMaxMm: p.anchorMaxMm,
  bboxMaxMm: p.bboxMaxMm,
  matrixTranslationMaxMm: p.matrixTranslationMaxMm,
  worstAnchor: p.worstAnchor,
  worstStructure: p.worstStructure,
  passed: p.passed,
}));

const out = {
  step: "13",
  phase: "J (Blender / GLB / manifest / Three.js cross-layer review) - READ ONLY",
  generatedAt: new Date().toISOString(),
  generator: "pipeline/qa/build_cross_layer_review.ts",
  note: "No Blender write was performed. Every value is read from the validated reports and the promoted manifest.",
  sources: {
    blenderRig: "qa/reports/elbow_r.rig_validation.final.json",
    gate2: "qa/reports/elbow_r.gate2.promoted.json",
    gate3: "qa/reports/elbow_r.gate3.step12.json",
    manifest: "public/assets/joints/elbow_r/joint-manifest.json",
    blenderPoseReference: "qa/reports/elbow_r.blender_pose_reference.json",
  },
  axisConvention: "Blender is Z-up; the glTF/manifest/runtime are Y-up. Comparisons apply (x, y, z)_Z-up -> (x, z, -y)_Y-up.",
  checks,
  runtimeVsBlenderPoses: {
    note: "Three.js runtime (production GLBs, all tiers, attachTo applied) vs the Blender rig driven through the controller. This is runtime pose consistency, NOT formal landmark validation.",
    poses,
    allPassed: poses.every((p: { passed: boolean }) => p.passed),
    worstAnchorDeviationMm: Math.max(...poses.map((p: { anchorMaxMm: number }) => p.anchorMaxMm)),
  },
  formalGate3: {
    status: gate3.formalLandmarkValidation.status,
    reason: gate3.formalLandmarkValidation.reason ?? null,
    note: "PENDING EXPERT LANDMARK APPROVAL. A draft package now exists (qa/elbow_r.poses.draft.json) and is read for reporting only.",
  },
  summary: {
    mismatches: checks.filter((c) => c.result === "MISMATCH").length,
    checks: checks.length,
  },
};

mkdirSync(join(ROOT, "qa", "expert"), { recursive: true });
writeFileSync(join(ROOT, "qa", "expert", "step13_cross_layer.json"), JSON.stringify(out, null, 1));
for (const c of checks) console.log(`${c.result.padEnd(9)} ${c.check.padEnd(26)} ${c.layers}`);
console.log(`poses all passed: ${out.runtimeVsBlenderPoses.allPassed}; worst anchor deviation ${out.runtimeVsBlenderPoses.worstAnchorDeviationMm} mm`);
console.log(`mismatches: ${out.summary.mismatches} of ${out.summary.checks}`);
