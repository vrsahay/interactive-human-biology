// Step 13 Phase I: build a DRAFT landmark definition package for formal Gate 3.
//   npx tsx pipeline/qa/build_landmark_draft.ts   ->  qa/elbow_r.poses.draft.json
//
// These are DRAFT definitions. They are NOT approved: the file deliberately carries no `approvedBy`, so
// src/engine/qa/poseCompare.ts#landmarkStatus keeps formal Gate 3 at "PENDING EXPERT LANDMARK APPROVAL".
//
// Every landmark is derived from the production GLBs by a deterministic rule in an anatomical frame taken from the
// validated manifest (flexion axis, true-extension forearm direction, flexion travel direction), so a reviewer can
// re-derive it, or replace the rule with a hand-picked vertex, without any guesswork about what was measured.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { Vector3, type Mesh } from "three";
import { StructureRegistry } from "../../src/engine/anatomy/StructureRegistry";
import { loadTierScene, productionManifest, productionManifestText } from "../../tests/helpers/production";

const ROOT = resolve(import.meta.dirname, "..", "..");
const OUT = join(ROOT, "qa", "elbow_r.poses.draft.json");

const manifest = productionManifest();
const registry = new StructureRegistry(manifest);
registry.registerTier("core", await loadTierScene(manifest, "core"));
registry.registerTier("detail", await loadTierScene(manifest, "detail"));

const raw = JSON.parse(productionManifestText()) as {
  pivot: { point: number[]; flexionAxisWorld: number[]; trueExtensionForearmDirWorld: number[]; flexionTravelDirWorld: number[] };
};
const pivot = new Vector3(...(raw.pivot.point as [number, number, number]));
// Frame: L along the flexion axis, D distally along the forearm at true extension, A in the direction the forearm travels.
const L = new Vector3(...(raw.pivot.flexionAxisWorld as [number, number, number])).normalize();
const D = new Vector3(...(raw.pivot.trueExtensionForearmDirWorld as [number, number, number])).normalize();
const A = new Vector3(...(raw.pivot.flexionTravelDirWorld as [number, number, number])).normalize();

/** World-space vertices of a structure's single mesh carrier, in the exported (bind) pose. */
function vertices(structureId: string): { mesh: Mesh; points: Vector3[] } {
  const entry = registry.require(structureId);
  const mesh = entry.meshes[0];
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.getAttribute("position");
  const points: Vector3[] = [];
  for (let i = 0; i < pos.count; i++) points.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  return { mesh, points };
}

type Rule = { direction: Vector3; band?: { direction: Vector3; topFraction: number } };

/** Index of the vertex that is furthest along `rule.direction`, optionally restricted to a band at one end of the bone. */
function extremeVertex(points: Vector3[], rule: Rule): number {
  let candidates = points.map((p, i) => i);
  if (rule.band) {
    const along = points.map((p) => p.dot(rule.band!.direction));
    const lo = Math.min(...along);
    const hi = Math.max(...along);
    const cut = hi - (hi - lo) * rule.band.topFraction;
    candidates = candidates.filter((i) => along[i] >= cut);
  }
  let best = candidates[0];
  let bestD = -Infinity;
  for (const i of candidates) {
    const d = points[i].dot(rule.direction);
    if (d > bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Centroid of the vertices in a band at one end of the bone (a derived reference, not a single vertex). */
function bandCentroid(points: Vector3[], direction: Vector3, topFraction: number): { centre: Vector3; count: number } {
  const along = points.map((p) => p.dot(direction));
  const lo = Math.min(...along);
  const hi = Math.max(...along);
  const cut = hi - (hi - lo) * topFraction;
  const sel = points.filter((p, i) => along[i] >= cut);
  const centre = sel.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / sel.length);
  return { centre, count: sel.length };
}

const proximal = D.clone().negate();
const posterior = A.clone().negate();

// Which side of the flexion axis is medial? Decided from the model, not assumed: the body midline is x = 0, and this is a
// right elbow, so the medial epicondyle is the distal-humerus extreme whose |x| is smaller.
const humerus = vertices("humerus_r");
const medialProbe = (() => {
  const plus = humerus.points[extremeVertex(humerus.points, { direction: L, band: { direction: D, topFraction: 0.25 } })];
  const minus = humerus.points[extremeVertex(humerus.points, { direction: L.clone().negate(), band: { direction: D, topFraction: 0.25 } })];
  const medialIsPlusL = Math.abs(plus.x) < Math.abs(minus.x);
  return { medialIsPlusL, plusX: plus.x, minusX: minus.x, medial: medialIsPlusL ? L.clone() : L.clone().negate() };
})();
const medial = medialProbe.medial;
const lateral = medial.clone().negate();

interface Candidate {
  landmarkId: string;
  structureId: string;
  anchorId: string | null;
  palpable: boolean;
  definitionMethod: string;
  rule: Rule | { centroidBand: { direction: Vector3; topFraction: number } };
  expectedUse: string;
  proposedToleranceMm: number;
}

const candidates: Candidate[] = [
  {
    landmarkId: "olecranon_tip",
    structureId: "ulna_r",
    anchorId: "elbow_r.anchor.olecranon",
    palpable: true,
    definitionMethod: "ulna vertex furthest in the proximal direction (opposite the true-extension forearm direction)",
    rule: { direction: proximal },
    expectedUse: "posterior elbow reference; checks that the ulna tracks the humerus through flexion",
    proposedToleranceMm: 2,
  },
  {
    landmarkId: "coronoid_tip",
    structureId: "ulna_r",
    anchorId: "elbow_r.anchor.coronoid_process",
    palpable: false,
    definitionMethod: "most anterior ulna vertex within the proximal 15% of the bone's length along the forearm axis",
    rule: { direction: A, band: { direction: proximal, topFraction: 0.15 } },
    expectedUse: "anterior congruence check at high flexion (the coronoid fossa contact at 145 deg)",
    proposedToleranceMm: 2.5,
  },
  {
    landmarkId: "ulnar_styloid",
    structureId: "ulna_r",
    anchorId: null,
    palpable: true,
    definitionMethod: "most distal ulna vertex along the true-extension forearm direction",
    rule: { direction: D },
    expectedUse: "distal forearm reference; largest lever arm, so it is the most sensitive test of the flexion axis",
    proposedToleranceMm: 3,
  },
  {
    landmarkId: "radial_styloid",
    structureId: "radius_r",
    anchorId: null,
    palpable: true,
    definitionMethod: "most distal radius vertex along the true-extension forearm direction",
    rule: { direction: D },
    expectedUse: "distal forearm reference on the lateral side; pairs with the ulnar styloid",
    proposedToleranceMm: 3,
  },
  {
    landmarkId: "radial_head_centre",
    structureId: "radius_r",
    anchorId: "elbow_r.anchor.radial_head",
    palpable: false,
    definitionMethod: "centroid of the radius vertices in the proximal 8% of the bone's length (derived reference, not a single vertex)",
    rule: { centroidBand: { direction: proximal, topFraction: 0.08 } },
    expectedUse: "proximal articulation reference against the capitulum",
    proposedToleranceMm: 3,
  },
  {
    landmarkId: "medial_epicondyle",
    structureId: "humerus_r",
    anchorId: null,
    palpable: true,
    definitionMethod: "distal-humerus vertex furthest medially (medial side derived from the model: the extreme nearer the body midline x = 0)",
    rule: { direction: medial, band: { direction: D, topFraction: 0.25 } },
    expectedUse: "fixed bony reference: must not move when the controller moves",
    proposedToleranceMm: 2,
  },
  {
    landmarkId: "lateral_epicondyle",
    structureId: "humerus_r",
    anchorId: null,
    palpable: true,
    definitionMethod: "distal-humerus vertex furthest laterally (opposite the derived medial direction)",
    rule: { direction: lateral, band: { direction: D, topFraction: 0.25 } },
    expectedUse: "fixed bony reference; with the medial epicondyle it defines the clinical flexion-extension axis for comparison against the fitted axis",
    proposedToleranceMm: 2,
  },
  {
    landmarkId: "third_metacarpal_head",
    structureId: "metacarpal_3_r",
    anchorId: null,
    palpable: true,
    definitionMethod: "most distal vertex of the third metacarpal along the true-extension forearm direction",
    rule: { direction: D },
    expectedUse: "hand-end reference: checks that the follower chain (carpals and metacarpals) rides with the forearm",
    proposedToleranceMm: 4,
  },
];

const landmarks = candidates.map((c) => {
  const { mesh, points } = vertices(c.structureId);
  const local = new Vector3();
  let vertexIndex: number | null = null;
  let world: Vector3;
  let bandVertices: number | null = null;
  if ("centroidBand" in c.rule) {
    const b = bandCentroid(points, c.rule.centroidBand.direction, c.rule.centroidBand.topFraction);
    world = b.centre;
    bandVertices = b.count;
  } else {
    vertexIndex = extremeVertex(points, c.rule);
    world = points[vertexIndex];
  }
  mesh.updateWorldMatrix(true, false);
  local.copy(world).applyMatrix4(mesh.matrixWorld.clone().invert());
  const r = 1e6;
  const round = (v: Vector3) => [Math.round(v.x * r) / r, Math.round(v.y * r) / r, Math.round(v.z * r) / r];
  return {
    landmarkId: c.landmarkId,
    structureId: c.structureId,
    mesh: mesh.name,
    manifestAnchorId: c.anchorId,
    palpableOnALivingSubject: c.palpable,
    reference: vertexIndex === null ? { kind: "derived-centroid", bandVertexCount: bandVertices } : { kind: "mesh-vertex", vertexIndex, vertexCount: mesh.geometry.getAttribute("position").count },
    definitionMethod: c.definitionMethod,
    bindPose: { localMeshSpace: round(local), worldAtExportedPose: round(world), distanceFromPivotMm: Math.round(world.distanceTo(pivot) * 1e6) / 1e3 },
    expectedUse: c.expectedUse,
    proposedToleranceMm: c.proposedToleranceMm,
    status: "DRAFT — NOT APPROVED",
  };
});

const out = {
  schema: "joints.landmark-definitions/draft-1",
  jointId: "elbow_r",
  status: "DRAFT — PENDING EXPERT LANDMARK APPROVAL",
  approvalNote:
    "This file intentionally has no `approvedBy` field. Formal Gate 3 stays NOT AVAILABLE / PENDING EXPERT LANDMARK APPROVAL until a subject-matter reviewer approves each landmark definition and its tolerance, and the approved set is saved as qa/elbow_r.poses.json.",
  generatedAt: new Date().toISOString(),
  generator: "pipeline/qa/build_landmark_draft.ts",
  source: {
    manifest: "public/assets/joints/elbow_r/joint-manifest.json",
    manifestSha256: createHash("sha256").update(readFileSync(join(ROOT, "public", "assets", "joints", "elbow_r", "joint-manifest.json"))).digest("hex"),
    tiers: ["core", "detail"],
    note: "Coordinates are read from the production GLBs in their exported (bind) pose. Vertex indices refer to the decoded, quantised production geometry; they are only valid for the manifest SHA above.",
  },
  frame: {
    note: "Anatomical frame taken from the validated manifest pivot block, not re-derived here.",
    pivotPoint: raw.pivot.point,
    flexionAxisWorld: raw.pivot.flexionAxisWorld,
    trueExtensionForearmDirWorld: raw.pivot.trueExtensionForearmDirWorld,
    flexionTravelDirWorld: raw.pivot.flexionTravelDirWorld,
    medialDirectionDerivation: {
      method: "right elbow: of the two distal-humerus extremes along the flexion axis, the medial one is nearer the body midline x = 0",
      medialIsAlongPlusFlexionAxis: medialProbe.medialIsPlusL,
      probeXAlongPlusAxis: Math.round(medialProbe.plusX * 1e6) / 1e6,
      probeXAlongMinusAxis: Math.round(medialProbe.minusX * 1e6) / 1e6,
    },
  },
  proposedPoses: [
    { flexionDeg: 0, note: "true extension (controller zero)" },
    { flexionDeg: 45, note: "mid-range" },
    { flexionDeg: 90, note: "the angle the lesson asks the learner to reach" },
    { flexionDeg: 145, note: "approximate teaching maximum" },
  ],
  toleranceRationale:
    "Proposed tolerances are anatomical-identification tolerances, not numerical ones: runtime-vs-Blender pose consistency is already below 0.001 mm (qa/reports/elbow_r.gate3.step12.json), so any real disagreement would come from where a reviewer places the landmark. 2 mm matches the elbow/body handover tolerance already enforced in the delivery tests; distal and derived references are given more room because a small axis error is amplified by the lever arm.",
  reviewerActionsRequired: [
    "Confirm or correct each definition method (in particular the coronoid band fraction and the radial-head centroid band).",
    "Confirm the derived medial/lateral assignment of the epicondyles.",
    "Accept or change each proposed tolerance.",
    "Decide whether the ulnar styloid, radial styloid and third metacarpal head belong in a formal elbow landmark set at all, or whether the set should stop at the joint.",
    "Add `approvedBy`, `approvedAt` and per-landmark approved positions, then save as qa/elbow_r.poses.json.",
  ],
  landmarks,
};

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`wrote ${OUT}`);
for (const l of landmarks) console.log(`  ${l.landmarkId.padEnd(22)} ${l.structureId.padEnd(14)} ${l.reference.kind === "mesh-vertex" ? `vertex ${l.reference.vertexIndex}` : "centroid"} at ${l.bindPose.distanceFromPivotMm} mm from the pivot`);
console.log(`medial is along ${medialProbe.medialIsPlusL ? "+" : "-"}flexionAxis (probe x: ${medialProbe.plusX.toFixed(4)} vs ${medialProbe.minusX.toFixed(4)})`);
