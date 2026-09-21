#!/usr/bin/env node
// Validate a joint spec (syntax + structural schema + cross-references). No dependencies.
// Usage: node pipeline/tools/validate_spec.mjs pipeline/specs/elbow_r.json
import { readFileSync } from "node:fs";

const file = process.argv[2];
const errors = [];
let spec;
try {
  spec = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(JSON.stringify({ file, valid: false, errors: ["JSON syntax: " + err.message] }));
  process.exit(1);
}

const need = (obj, path, type) => {
  const value = path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (actual !== type) errors.push(`${path}: expected ${type}, got ${actual}`);
  return value;
};

for (const [p, t] of [["schema", "number"], ["jointId", "string"], ["jointType", "string"], ["side", "string"], ["sourceScene", "string"],
  ["structures", "array"], ["collections.root", "string"], ["rig.empties", "array"], ["rig.pivot.method", "string"],
  ["rig.pivot.fitted.pointBlender", "array"], ["rig.pivot.fitted.flexionAxisWorld", "array"], ["rig.dofs", "array"],
  ["rig.semantics.neutral_definition", "string"], ["rig.semantics.neutral_offset_deg", "number"], ["rig.semantics.neutral_offset_method", "string"],
  ["rig.semantics.source_pose_flexion_deg", "number"], ["rig.semantics.source_pose_reference", "string"], ["rig.semantics.range_status", "string"],
  ["rig.semantics.range_reference_status", "string"], ["rig.semantics.user_facing_dofs", "array"],
  ["overlay.bandAnchors", "array"], ["overlay.labelAnchors", "array"], ["overlay.anchors", "array"], ["overlay.registry.motionBehaviorByRole", "object"],
  ["overlay.motion.axisObject", "string"], ["overlay.motion.forearmObject", "string"], ["budgets", "object"]]) need(spec, p, t);

const ROLES = new Set(["bone_fixed", "bone_moving", "follow", "tracked", "spanning_soft", "attached_soft", "context"]);
const TIERS = new Set(["core", "detail", "context"]);
const ids = new Set();
for (const s of spec.structures ?? []) {
  for (const k of ["src", "structureId", "label", "role", "tier", "collection"]) if (typeof s[k] !== "string") errors.push(`structure ${s.structureId}: ${k} missing`);
  if (!ROLES.has(s.role)) errors.push(`structure ${s.structureId}: unknown role ${s.role}`);
  if (!TIERS.has(s.tier)) errors.push(`structure ${s.structureId}: unknown tier ${s.tier}`);
  if (ids.has(s.structureId)) errors.push(`duplicate structureId ${s.structureId}`);
  ids.add(s.structureId);
  if (!(spec.collections?.geo ?? []).includes(s.collection)) errors.push(`structure ${s.structureId}: collection ${s.collection} not declared`);
}

const dofs = spec.rig?.dofs ?? [];
const sem = spec.rig?.semantics ?? {};
if (dofs.length !== 1) errors.push("Milestone 1 requires exactly one DOF");
const flex = dofs[0] ?? {};
if (!(flex.id === "flexion" && flex.axis === "+X" && flex.min === 0 && flex.max === 145 && flex.neutral === 0 && flex.unit === "deg")) errors.push("flexion DOF values changed");
if (JSON.stringify(sem.user_facing_dofs) !== JSON.stringify(dofs.map((d) => d.id))) errors.push("user_facing_dofs must match rig.dofs ids");
if (sem.neutral_offset_deg !== sem.source_pose_flexion_deg) errors.push("neutral_offset_deg must equal source_pose_flexion_deg");
if (sem.range_status !== flex.rangeStatus) errors.push("semantics.range_status must equal dofs[0].rangeStatus");
if (!(sem.neutral_offset_deg > 0 && sem.neutral_offset_deg < 45)) errors.push("neutral_offset_deg out of plausible range");

const KINDS = new Set(["shaft_band_extreme", "joint_pivot", "proximity_region", "proximal_region_offset", "extreme_vertex", "centroid_offset_nearest"]);
const DIRS = new Set(["lateral", "medial", "anterior", "posterior", "proximal", "distal"]);
const TYPES = new Set(Object.keys(spec.overlay?.anchorConventions?.precisionClasses ?? {}));
const anchorIds = new Set(), keys = new Set();
for (const a of spec.overlay?.anchors ?? []) {
  for (const k of ["key", "anchorId", "structureId", "label", "anchorType", "displayCategory"]) if (typeof a[k] !== "string") errors.push(`anchor ${a.key}: ${k} missing`);
  if (anchorIds.has(a.anchorId) || keys.has(a.key)) errors.push(`duplicate anchor ${a.anchorId}`);
  anchorIds.add(a.anchorId); keys.add(a.key);
  if (a.anchorId !== `${spec.jointId}.anchor.${a.key}`) errors.push(`anchor ${a.key}: anchorId must be ${spec.jointId}.anchor.${a.key}`);
  if (!TYPES.has(a.anchorType)) errors.push(`anchor ${a.key}: unknown anchorType ${a.anchorType}`);
  if (!KINDS.has(a.method?.kind)) errors.push(`anchor ${a.key}: unknown method ${a.method?.kind}`);
  for (const d of a.method?.direction ?? []) if (!DIRS.has(d)) errors.push(`anchor ${a.key}: bad direction ${d}`);
  if (a.method?.kind === "joint_pivot") { if (a.structureId !== `${spec.jointId.replace(/_r$|_l$/, "")}_joint_${spec.side[0]}`) errors.push(`anchor ${a.key}: joint anchor structureId`); }
  else if (!ids.has(a.structureId)) errors.push(`anchor ${a.key}: structureId ${a.structureId} not in structures`);
  for (const t of ["target", "exclude_target"]) if (a.method?.[t] && !ids.has(a.method[t])) errors.push(`anchor ${a.key}: ${t} ${a.method[t]} unknown`);
  if (typeof a.export !== "boolean" || typeof a.visibility?.hideDuringMotion !== "boolean" || !TIERS.has(a.visibility?.tier)) errors.push(`anchor ${a.key}: export/visibility invalid`);
}
for (const role of ROLES) if (role !== "tracked" && !spec.overlay?.registry?.motionBehaviorByRole?.[role]) errors.push(`registry missing motion behaviour for ${role}`);

// ---- schematic band anchors (same anchor schema, extended) ----
const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number" && Number.isFinite(x));
const bandRep = spec.overlay?.anchorConventions?.bandRepresentation;
if (!bandRep || bandRep.representation !== "schematic" || bandRep.deformationSimulation !== false) errors.push("anchorConventions.bandRepresentation must declare schematic / deformationSimulation=false");
const bands = {};
const BAND_PARENT = { proximal: ["elbow_r__seg_prox", "identity", "stationary"], distal: ["elbow_r__ctrl", "driven_children", "moves_with_forearm"] };
let bandCount = 0;
for (const b of spec.overlay?.bandAnchors ?? []) {
  bandCount++;
  if (typeof b !== "object" || b === null) { errors.push("bandAnchors entries must be objects"); continue; }
  for (const k of ["key", "anchorId", "structureId", "label", "anchorType", "displayCategory", "attachmentSide", "parent", "parentInverse", "motionBehavior", "attachedBone", "positionsGeneratedBy", "localPositionFrame"])
    if (typeof b[k] !== "string") errors.push(`band anchor ${b.key}: ${k} missing`);
  if (anchorIds.has(b.anchorId) || keys.has(b.key)) errors.push(`duplicate anchor ${b.anchorId}`);
  anchorIds.add(b.anchorId); keys.add(b.key);
  if (b.anchorId !== `${spec.jointId}.anchor.${b.key}`) errors.push(`band anchor ${b.key}: anchorId must be ${spec.jointId}.anchor.${b.key}`);
  if (b.anchorType !== "band_attachment" || !TYPES.has("band_attachment")) errors.push(`band anchor ${b.key}: anchorType must be band_attachment`);
  if (!ids.has(b.structureId) || (spec.structures.find((s) => s.structureId === b.structureId) ?? {}).role !== "spanning_soft") errors.push(`band anchor ${b.key}: structureId must be a cross-joint ligament`);
  const expect = BAND_PARENT[b.attachmentSide];
  if (!expect || b.parent !== expect[0] || b.parentInverse !== expect[1] || b.motionBehavior !== expect[2]) errors.push(`band anchor ${b.key}: parent/parentInverse/motionBehavior inconsistent with ${b.attachmentSide}`);
  if (b.method?.kind !== "ligament_contact_snap" || b.method?.ligament !== b.structureId || b.method?.attach_bone !== b.attachedBone || !ids.has(b.method?.attach_bone)) errors.push(`band anchor ${b.key}: method inconsistent`);
  for (const d of b.method?.direction ?? []) if (!DIRS.has(d)) errors.push(`band anchor ${b.key}: bad direction ${d}`);
  if (b.attachmentSide === "proximal" && b.attachedBone !== "humerus_r") errors.push(`band anchor ${b.key}: proximal end must attach to the humerus`);
  if (b.attachmentSide === "distal" && !["radius_r", "ulna_r"].includes(b.attachedBone)) errors.push(`band anchor ${b.key}: distal end must attach to radius/ulna`);
  for (const k of ["localPosition", "vertexNormalLocal", "labelDirectionLocal", "leaderOriginLocal", "labelTargetLocal"]) if (!vec3(b[k])) errors.push(`band anchor ${b.key}: ${k} must be a 3-vector`);
  if (!(b.band?.representation === "schematic" && b.band?.deformationSimulation === false && typeof b.band?.bandId === "string")) errors.push(`band anchor ${b.key}: band must be schematic, not a deformation simulation`);
  if (b.band?.endpoint !== b.attachmentSide) errors.push(`band anchor ${b.key}: band.endpoint must equal attachmentSide`);
  if (typeof b.export !== "boolean" || !TIERS.has(b.visibility?.tier)) errors.push(`band anchor ${b.key}: export/visibility invalid`);
  (bands[b.band?.bandId] ??= []).push(b);
}
for (const [id, ends] of Object.entries(bands)) {
  const sides = ends.map((e) => e.attachmentSide).sort().join(",");
  if (sides !== "distal,proximal") errors.push(`band ${id}: needs exactly one proximal and one distal anchor`);
  for (const e of ends) if (!ends.some((o) => o.anchorId === e.band.pairedAnchorId && o !== e)) errors.push(`band ${id}: pairedAnchorId of ${e.key} does not resolve`);
  if (new Set(ends.map((e) => e.structureId)).size !== 1) errors.push(`band ${id}: both ends must reference the same ligament`);
}

const result = { file, valid: errors.length === 0, structures: ids.size, anchors: anchorIds.size, bandAnchors: bandCount, bands: Object.keys(bands).length, errors };
console.log(JSON.stringify(result));
process.exit(errors.length ? 1 : 0);
