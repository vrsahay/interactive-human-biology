import type { AnchorSpec, BandSpec, ControllerSpec, DofSpec, JointManifest, PivotSpec, StructureSpec, TierName, TierSpec, Vec3 } from "./manifestTypes";

export class ManifestError extends Error {
  constructor(message: string, readonly details: string[] = []) {
    super(details.length ? `${message}:\n - ${details.join("\n - ")}` : message);
    this.name = "ManifestError";
  }
}

const TIERS: TierName[] = ["core", "detail", "context"];
const UNIT_TOLERANCE = 1e-3;

const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Invariants the JSON schema cannot express but the runtime relies on. Returns a list of problems (empty = valid). */
export function checkManifestSemantics(m: JointManifest): string[] {
  const problems: string[] = [];
  const structureIds = new Set<string>();
  for (const s of m.structures) {
    if (structureIds.has(s.structureId)) problems.push(`duplicate structureId ${s.structureId}`);
    structureIds.add(s.structureId);
  }
  const dofIds = new Set<string>();
  for (const d of m.dofs) {
    if (dofIds.has(d.id)) problems.push(`duplicate dof ${d.id}`);
    dofIds.add(d.id);
    if (!(Number.isFinite(d.min) && Number.isFinite(d.max) && d.min < d.max)) problems.push(`dof ${d.id}: invalid range ${d.min}..${d.max}`);
    if (!(d.neutral >= d.min && d.neutral <= d.max)) problems.push(`dof ${d.id}: neutral ${d.neutral} outside range`);
  }
  for (const id of m.semantics.user_facing_dofs) if (!dofIds.has(id)) problems.push(`semantics.user_facing_dofs references unknown dof ${id}`);
  if (!Number.isFinite(m.semantics.neutral_offset_deg)) problems.push("semantics.neutral_offset_deg is not finite");

  for (const [name, v] of [["flexionAxisWorld", m.pivot.flexionAxisWorld], ["trueExtensionForearmDirWorld", m.pivot.trueExtensionForearmDirWorld], ["flexionTravelDirWorld", m.pivot.flexionTravelDirWorld]] as const) {
    if (Math.abs(length(v) - 1) > UNIT_TOLERANCE) problems.push(`pivot.${name} is not unit length (${length(v)})`);
  }
  if (Math.abs(dot(m.pivot.flexionAxisWorld, m.pivot.trueExtensionForearmDirWorld)) > UNIT_TOLERANCE) problems.push("pivot axis is not perpendicular to the neutral direction");

  const allNodes = new Set<string>();
  for (const t of TIERS) {
    const tier = m.tiers[t];
    if (/^[a-z]+:|^\/|\.\./i.test(tier.url)) problems.push(`tier ${t}: url must be relative to the manifest (${tier.url})`);
    for (const n of tier.nodes) allNodes.add(n);
  }
  for (const node of [m.pivot.node, m.controller.node]) if (!allNodes.has(node)) problems.push(`rig node ${node} not present in any tier`);
  for (const id of m.controller.drives) if (!structureIds.has(id)) problems.push(`controller drives unknown structure ${id}`);
  for (const s of m.structures) {
    if (!m.tiers[s.tier].structureIds.includes(s.structureId)) problems.push(`${s.structureId} missing from tier ${s.tier}`);
    if (s.attachTo !== null && !allNodes.has(s.attachTo)) problems.push(`${s.structureId}: attachTo ${s.attachTo} is not an exported node`);
  }
  const anchorIds = new Set<string>();
  for (const a of m.anchors) {
    if (anchorIds.has(a.anchorId)) problems.push(`duplicate anchorId ${a.anchorId}`);
    anchorIds.add(a.anchorId);
    if (!allNodes.has(a.parentNode)) problems.push(`anchor ${a.anchorId}: parent ${a.parentNode} not exported`);
    if (a.anchorType !== "joint_center" && !structureIds.has(a.structureId)) problems.push(`anchor ${a.anchorId}: unknown structure ${a.structureId}`);
  }
  for (const b of m.bands) {
    if (b.representation !== "schematic" || b.deformationSimulation !== false) problems.push(`band ${b.bandId} must be schematic without deformation simulation`);
    for (const id of [b.proximalAnchorId, b.distalAnchorId]) if (!anchorIds.has(id)) problems.push(`band ${b.bandId}: unknown anchor ${id}`);
  }
  return problems;
}

/** Read-only, indexed view over a validated manifest. The first source of runtime truth. */
export class JointManifestModel {
  private readonly structuresById: Map<string, StructureSpec>;
  private readonly anchorsById: Map<string, AnchorSpec>;

  constructor(readonly data: JointManifest, readonly baseUrl: string) {
    this.structuresById = new Map(data.structures.map((s) => [s.structureId, s]));
    this.anchorsById = new Map(data.anchors.map((a) => [a.anchorId, a]));
  }

  get jointId(): string { return this.data.jointId; }
  get jointType(): JointManifest["jointType"] { return this.data.jointType; }
  get jointName(): string { return this.data.jointName; }
  get pivot(): PivotSpec { return this.data.pivot; }
  get controller(): ControllerSpec { return this.data.controller; }
  get dofs(): readonly DofSpec[] { return this.data.dofs; }
  get semantics(): JointManifest["semantics"] { return this.data.semantics; }
  get structures(): readonly StructureSpec[] { return this.data.structures; }
  get anchors(): readonly AnchorSpec[] { return this.data.anchors; }
  get bands(): readonly BandSpec[] { return this.data.bands; }
  get motion(): JointManifest["motion"] { return this.data.motion; }

  dof(id: string): DofSpec {
    const d = this.data.dofs.find((x) => x.id === id);
    if (!d) throw new ManifestError(`unknown dof ${id}`);
    return d;
  }
  structure(id: string): StructureSpec | undefined { return this.structuresById.get(id); }
  anchor(id: string): AnchorSpec | undefined { return this.anchorsById.get(id); }
  structuresInTier(tier: TierName): StructureSpec[] { return this.data.structures.filter((s) => s.tier === tier); }
  anchorsInTier(tier: TierName): AnchorSpec[] { return this.data.anchors.filter((a) => a.tier === tier); }
  tier(tier: TierName): TierSpec { return this.data.tiers[tier]; }
  tierUrl(tier: TierName): string { return new URL(this.data.tiers[tier].url, this.baseUrl).href; }
  isDriven(structureId: string): boolean { return this.data.controller.drives.includes(structureId); }
}

async function sha256Hex(text: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Manifests that passed full schema validation when this bundle was built (path -> sha256), see vite.config.ts. */
const BUILD_VALIDATED: Readonly<Record<string, string>> = typeof __VALIDATED_MANIFESTS__ === "undefined" ? {} : __VALIDATED_MANIFESTS__;

/** Byte-identical to a manifest validated at build time: parse + runtime invariants only (no schema code shipped). */
export function parsePinnedManifest(text: string): JointManifest {
  let data: JointManifest;
  try {
    data = JSON.parse(text) as JointManifest;
  } catch (e) {
    throw new ManifestError(`manifest is not valid JSON (${(e as Error).message})`);
  }
  const problems = checkManifestSemantics(data);
  if (problems.length) throw new ManifestError("manifest failed runtime invariants", problems);
  return data;
}

export class ManifestLoader {
  /** How the last manifest was validated (QA / reports). */
  lastValidation: "build-pinned" | "runtime-schema" | null = null;

  constructor(private readonly fetchImpl: typeof fetch = (...args) => fetch(...args)) {}

  async load(url: string): Promise<JointManifestModel> {
    const absolute = new URL(url, globalThis.location?.href ?? "http://localhost/").href;
    const response = await this.fetchImpl(absolute);
    if (!response.ok) throw new ManifestError(`manifest request failed: ${response.status} ${response.statusText} (${absolute})`);
    const text = await response.text();
    const pinned = BUILD_VALIDATED[new URL(absolute).pathname];
    if (pinned && pinned === (await sha256Hex(text))) {
      this.lastValidation = "build-pinned";
      return new JointManifestModel(parsePinnedManifest(text), absolute);
    }
    // Not the manifest this build validated (or no hash available): full schema validation, loaded on demand.
    const { parseManifest } = await import("./manifestSchema");
    this.lastValidation = "runtime-schema";
    return new JointManifestModel(parseManifest(text), absolute);
  }
}
