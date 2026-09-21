/** Gate 3 infrastructure: compare runtime pose samples with a reference (e.g. Blender) - pure functions. */
export type V3 = [number, number, number];

export interface PoseSample {
  flexionDeg: number;
  anchors: Record<string, V3>;
  structures: Record<string, { worldMatrix: number[]; worldBBox: { min: V3; max: V3 } }>;
}

export interface PoseTolerances {
  anchorMm: number;
  bboxMm: number;
  matrixTranslationMm: number;
  matrixLinear: number;
}

export const DEFAULT_POSE_TOLERANCES: PoseTolerances = { anchorMm: 0.1, bboxMm: 0.1, matrixTranslationMm: 0.1, matrixLinear: 1e-4 };

export interface PoseComparison {
  flexionDeg: number;
  anchorsCompared: number;
  structuresCompared: number;
  anchorMaxMm: number;
  bboxMaxMm: number;
  matrixTranslationMaxMm: number;
  matrixLinearMax: number;
  worstAnchor: string | null;
  worstStructure: string | null;
  missing: string[];
  passed: boolean;
}

const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function comparePose(runtime: PoseSample, reference: PoseSample, tol: PoseTolerances = DEFAULT_POSE_TOLERANCES): PoseComparison {
  const missing: string[] = [];
  let anchorMax = 0;
  let worstAnchor: string | null = null;
  let anchorsCompared = 0;
  for (const [id, ref] of Object.entries(reference.anchors)) {
    const rt = runtime.anchors[id];
    if (!rt) {
      missing.push(`anchor:${id}`);
      continue;
    }
    anchorsCompared++;
    const d = dist(rt, ref) * 1000;
    if (d > anchorMax) {
      anchorMax = d;
      worstAnchor = id;
    }
  }
  let bboxMax = 0;
  let tMax = 0;
  let linMax = 0;
  let worstStructure: string | null = null;
  let structuresCompared = 0;
  for (const [id, ref] of Object.entries(reference.structures)) {
    const rt = runtime.structures[id];
    if (!rt) continue; // tier not loaded at runtime: compared only when present
    structuresCompared++;
    const b = Math.max(dist(rt.worldBBox.min, ref.worldBBox.min), dist(rt.worldBBox.max, ref.worldBBox.max)) * 1000;
    if (b > bboxMax) {
      bboxMax = b;
      worstStructure = id;
    }
    const m = rt.worldMatrix;
    const r = ref.worldMatrix;
    tMax = Math.max(tMax, dist([m[12], m[13], m[14]], [r[12], r[13], r[14]]) * 1000);
    for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) linMax = Math.max(linMax, Math.abs(m[i] - r[i]));
  }
  if (Math.abs(runtime.flexionDeg - reference.flexionDeg) > 1e-6) missing.push("flexion mismatch");
  return {
    flexionDeg: reference.flexionDeg,
    anchorsCompared,
    structuresCompared,
    anchorMaxMm: anchorMax,
    bboxMaxMm: bboxMax,
    matrixTranslationMaxMm: tMax,
    matrixLinearMax: linMax,
    worstAnchor,
    worstStructure,
    missing,
    passed: !missing.length && anchorMax <= tol.anchorMm && bboxMax <= tol.bboxMm && tMax <= tol.matrixTranslationMm && linMax <= tol.matrixLinear,
  };
}

/** Approved landmark definitions (qa/<joint>.poses.json). Formal Gate 3 is NOT AVAILABLE without them. */
export interface LandmarkDefinitionFile {
  jointId: string;
  approvedBy: string;
  poses: { flexionDeg: number; landmarks: { id: string; worldPosition: V3; toleranceMm: number }[] }[];
}

/** A DRAFT definition package (qa/<joint>.poses.draft.json). Read for reporting only: a draft never satisfies Gate 3. */
export interface LandmarkDraftFile {
  jointId: string;
  status: string;
  generator?: string;
  landmarks: { landmarkId: string; structureId: string; proposedToleranceMm: number; status: string }[];
}

export interface LandmarkDraftSummary {
  present: true;
  file: string;
  landmarkCount: number;
  landmarkIds: string[];
  proposedToleranceRangeMm: [number, number];
  formalGate3: "PENDING EXPERT LANDMARK APPROVAL";
  note: string;
}

export type LandmarkStatus =
  | { status: "NOT AVAILABLE"; reason: string; draft?: LandmarkDraftSummary | { present: false; reason: string } }
  | { status: "AVAILABLE"; definitions: LandmarkDefinitionFile };

/**
 * Gate 3 landmark state. `fileText` is the APPROVED set; `draftText` is the optional draft package, which is reported but
 * never accepted as approval - only an approved set moves Gate 3 off NOT AVAILABLE.
 */
export function landmarkStatus(fileText: string | null, jointId: string, draftText: string | null = null): LandmarkStatus {
  const draft = draftSummary(draftText, jointId);
  if (fileText === null) return { status: "NOT AVAILABLE", reason: "approved landmark definitions missing", ...(draft ? { draft } : {}) };
  try {
    const data = JSON.parse(fileText) as LandmarkDefinitionFile;
    if (data.jointId !== jointId || !data.approvedBy || !Array.isArray(data.poses) || !data.poses.length)
      return { status: "NOT AVAILABLE", reason: "landmark file present but not an approved definition set", ...(draft ? { draft } : {}) };
    return { status: "AVAILABLE", definitions: data };
  } catch {
    return { status: "NOT AVAILABLE", reason: "landmark file is not valid JSON", ...(draft ? { draft } : {}) };
  }
}

function draftSummary(draftText: string | null, jointId: string): LandmarkDraftSummary | { present: false; reason: string } | null {
  if (draftText === null) return null;
  try {
    const d = JSON.parse(draftText) as LandmarkDraftFile & { approvedBy?: string };
    if (d.jointId !== jointId || !Array.isArray(d.landmarks) || !d.landmarks.length) return { present: false, reason: "draft file present but not a landmark package for this joint" };
    if (d.approvedBy) return { present: false, reason: "draft file carries approvedBy: an approved set belongs in qa/<joint>.poses.json, not in the draft" };
    const tolerances = d.landmarks.map((l) => l.proposedToleranceMm).filter((t) => typeof t === "number");
    return {
      present: true,
      file: `qa/${jointId}.poses.draft.json`,
      landmarkCount: d.landmarks.length,
      landmarkIds: d.landmarks.map((l) => l.landmarkId),
      proposedToleranceRangeMm: [Math.min(...tolerances), Math.max(...tolerances)],
      formalGate3: "PENDING EXPERT LANDMARK APPROVAL",
      note: "Draft definitions only. No subject-matter reviewer has approved these landmarks or tolerances.",
    };
  } catch {
    return { present: false, reason: "draft file is not valid JSON" };
  }
}
