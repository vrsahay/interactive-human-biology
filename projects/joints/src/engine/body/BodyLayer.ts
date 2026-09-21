import { Box3, Group, Matrix4, Vector3, type Material, type Mesh, type Object3D } from "three";
import type { AssetLoader } from "../assets/AssetLoader";
import type { QualityTier } from "../quality/qualityTier";
import type { Highlighter, HighlightState } from "../rendering/Highlighter";

export type BodyVec3 = [number, number, number];

export interface BodyStructure {
  structureId: string;
  label: string;
  sourceObject: string;
  tissue: string;
  output: "skeleton" | "skin";
  regions: string[];
  bbox: { min: BodyVec3; max: BodyVec3 };
  /** Render group (one mesh per group): the unit of presentation. */
  groupId: string;
  /** Framed by a close-up shot: LOD0 in every tier once the close-up stage is applied. */
  closeup: boolean;
  closeupSites: string[];
  handover: string[];
  triangles: { lod0: number; lod1: number };
}

export interface BodyJointSite {
  siteId: string;
  jointType: "fixed" | "pivot" | "ball_and_socket" | "hinge";
  indicator: "fixed" | "rotation" | "multiAxis" | "hingeArc";
  sourceObjects: string[];
  structureIds: string[];
  anchor: BodyVec3;
  radiusM: number;
  precision: string;
  indicatorAxis?: { axis: BodyVec3; representation: "schematic" };
  sphere?: { center: BodyVec3; radiusM: number; representation: "schematic" };
  jointAsset?: string;
}

export interface BodyGroup {
  groupId: string;
  output: "skeleton" | "skin";
  material: string;
  closeup: boolean;
  structureIds: string[];
  bbox: { min: BodyVec3; max: BodyVec3 };
  triangles: { lod0: number; lod1: number };
}

export interface BodyFile {
  url: string;
  output: "skeleton" | "skin";
  /** 0 = Step-11 geometry, 1 = simplified group, 2 = delivery-only proxy. */
  lod: 0 | 1 | 2;
  /** Delivery-only first-frame representation: one merged mesh for a whole output, own untextured material, no groups. */
  proxy?: boolean;
  bytes: number;
  sha256: string;
  groups: string[];
  structures: number;
  triangles: number;
  extensionsRequired: string[];
}

export interface BodyStage {
  stageId: string;
  files: string[];
}

export interface BodyManifest {
  schema: 2;
  kind: "body_delivery";
  assetId: string;
  deliveryVersion: number;
  frame: { up: BodyVec3; right: BodyVec3; anterior: BodyVec3; bounds: { min: BodyVec3; max: BodyVec3 } };
  regions: Record<string, string[]>;
  jointSites: BodyJointSite[];
  structures: BodyStructure[];
  groups: BodyGroup[];
  files: Record<string, BodyFile>;
  tiers: Record<QualityTier, { stages: BodyStage[] }>;
  materialLibrary: { url: string; bytes: number; sha256: string; extensionsRequired: string[]; materials: string[] };
  source: { file: string; sha256: string };
  attribution: { status: string };
}

export class BodyManifestError extends Error {
  override name = "BodyManifestError";
}

/** Structural checks on the delivery manifest (the pipeline validator does the deep geometry checks). */
export function checkBodyManifest(data: unknown): string[] {
  const m = data as Partial<BodyManifest>;
  if (!m || m.schema !== 2 || m.kind !== "body_delivery") return ["not a body_delivery manifest (schema 2)"];
  const problems: string[] = [];
  if (!m.frame || !m.files || !Array.isArray(m.structures) || !Array.isArray(m.groups) || !m.regions || !Array.isArray(m.jointSites) || !m.tiers || !m.materialLibrary) return ["missing frame/files/structures/groups/regions/jointSites/tiers/materialLibrary"];
  const ids = new Set<string>();
  const groupOf = new Map<string, string>();
  for (const s of m.structures) {
    if (ids.has(s.structureId)) problems.push(`duplicate structureId ${s.structureId}`);
    ids.add(s.structureId);
  }
  for (const g of m.groups) {
    if (!g.structureIds.length) problems.push(`group ${g.groupId} is empty`);
    if (!m.materialLibrary.materials.includes(g.material)) problems.push(`group ${g.groupId}: material ${g.material} not in the material library`);
    for (const id of g.structureIds) {
      if (!ids.has(id)) problems.push(`group ${g.groupId}: unknown ${id}`);
      if (groupOf.has(id)) problems.push(`${id} is in groups ${groupOf.get(id)} and ${g.groupId}`);
      groupOf.set(id, g.groupId);
    }
  }
  for (const s of m.structures) if (groupOf.get(s.structureId) !== s.groupId) problems.push(`${s.structureId}: groupId ${s.groupId} does not match the group lists`);
  const groupIds = new Set(m.groups.map((g) => g.groupId));
  for (const [id, f] of Object.entries(m.files)) for (const g of f.groups) if (!groupIds.has(g)) problems.push(`file ${id}: unknown group ${g}`);
  const files = m.files;
  for (const [tier, t] of Object.entries(m.tiers)) {
    const stages = t?.stages ?? [];
    if (!stages.length) problems.push(`tier ${tier}: no stages`);
    for (const st of stages) for (const f of st.files) if (!files[f]) problems.push(`tier ${tier} stage ${st.stageId}: unknown file ${f}`);
    const proxyStage = !!stages[0] && stages[0].files.every((f) => files[f]?.proxy);
    if (proxyStage && !stages[0].files.some((f) => files[f]?.output === "skeleton")) problems.push(`tier ${tier}: the proxy stage must show the whole skeleton`);
    const groupStage = stages.find((st) => st.files.every((f) => !files[f]?.proxy));
    const first = new Set(groupStage?.files.flatMap((f) => files[f]?.groups ?? []));
    if (!m.groups.every((g) => first.has(g.groupId))) problems.push(`tier ${tier}: the first group stage must deliver every group`);
    const final = new Map<string, number>();
    for (const st of stages) for (const f of st.files) for (const g of files[f]?.groups ?? []) final.set(g, files[f].lod);
    for (const g of m.groups) if (g.output === "skeleton" && g.closeup && final.get(g.groupId) !== 0) problems.push(`tier ${tier}: close-up group ${g.groupId} never reaches LOD0`);
  }
  for (const [r, list] of Object.entries(m.regions)) for (const id of list) if (!ids.has(id)) problems.push(`region ${r}: unknown ${id}`);
  for (const site of m.jointSites) {
    for (const id of site.structureIds) if (!ids.has(id)) problems.push(`site ${site.siteId}: unknown ${id}`);
    if (!site.anchor?.every(Number.isFinite)) problems.push(`site ${site.siteId}: invalid anchor`);
  }
  return problems;
}

export type BodyPresentation = "normal" | "dimmed" | "highlight" | "hidden";
export type BodyStageState = "idle" | "loading" | "ready" | "applied" | "error";

interface GroupObject {
  node: Object3D;
  /** Local matrix as delivered, so a teaching displacement composes with it instead of replacing the placement. */
  base: Matrix4;
  meshes: Mesh[];
  lod: number;
  fileId: string;
}

/**
 * Full-body orientation layer over render groups. Presentation (normal / dimmed / highlight / hidden, skin shell, handover
 * to a validated joint asset) acts on whole groups, whose membership follows every presentation boundary, so the anatomical
 * sets stay exact. Delivery is staged per quality tier: the first stage renders the whole body; later stages upgrade groups
 * to LOD0. An upgrade is prepared in the background and applied only when the caller says the framing allows it.
 */
export class BodyLayer {
  readonly group = new Group();
  manifest!: BodyManifest;
  tier: QualityTier = "medium";
  loaded = false;
  shellVisible = false;
  private presentationVisible = true;
  private baseUrl = "http://localhost/";
  private readonly byId = new Map<string, BodyStructure>();
  private readonly bySource = new Map<string, string>();
  private readonly groups = new Map<string, BodyGroup>();
  private readonly current = new Map<string, GroupObject>();
  private readonly pending = new Map<string, GroupObject>();
  private readonly materials = new Map<string, Material>();
  private readonly presentation = new Map<string, BodyPresentation>();
  private readonly handedOver = new Set<string>();
  private readonly stageState = new Map<string, BodyStageState>();
  private readonly stagePromise = new Map<string, Promise<void>>();
  /** Delivery-only proxies shown until the grouped representation is applied. */
  private readonly proxies = new Map<"skeleton" | "skin", GroupObject>();
  private readonly pendingProxyRemoval = new Set<"skeleton" | "skin">();
  /** Called with the meshes of a prepared stage before it counts as ready (shader programs compile in parallel). */
  prepareHook: ((meshes: Mesh[], states: HighlightState[][]) => Promise<void>) | null = null;
  private libraryPromise: Promise<void> | null = null;
  /** Called when a stage finished loading (prepared, not yet applied). */
  onStageReady: ((stageId: string) => void) | null = null;

  constructor(private readonly assets: AssetLoader, private readonly highlighter: Highlighter, private readonly onChange: () => void) {
    this.group.name = "body";
  }

  // ------------------------------------------------------------------ loading

  /** Manifest + material library + the tier's first stage (applied immediately: the first frame shows the whole body). */
  async load(manifestUrl: string, tier: QualityTier, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<void> {
    const url = new URL(manifestUrl, globalThis.location?.href ?? "http://localhost/").href;
    const res = await fetchImpl(url);
    if (!res.ok) throw new BodyManifestError(`body manifest request failed ${res.status}`);
    const manifest = (await res.json()) as BodyManifest;
    performance.mark("joints:body-manifest");
    this.index(manifest, tier, url);
    const first = this.stages()[0];
    this.stageState.set(first.stageId, "loading");
    const proxyFirst = first.files.every((f) => manifest.files[f].proxy);
    // A proxy first stage needs no material library (no textures): the library comes with the grouped stage.
    const [library, files] = await Promise.all([proxyFirst ? Promise.resolve(null) : this.fetchFile(manifest.materialLibrary.url, "materials", manifest.materialLibrary), Promise.all(first.files.map((f) => this.fetchFile(manifest.files[f].url, f, manifest.files[f])))]);
    this.bind(library, Object.fromEntries(first.files.map((f, i) => [f, files[i]])));
    performance.mark("joints:body-bound");
  }

  /** Synchronous binding of already-parsed scenes (also the test entry point). */
  bindParsed(manifest: BodyManifest, tier: QualityTier, library: Object3D | null, firstStage: Record<string, Object3D>): void {
    this.index(manifest, tier, this.baseUrl);
    this.bind(library, firstStage);
  }

  private index(manifest: BodyManifest, tier: QualityTier, url: string): void {
    const problems = checkBodyManifest(manifest);
    if (problems.length) throw new BodyManifestError(`body manifest invalid: ${problems.join("; ")}`);
    if (!manifest.tiers[tier]) throw new BodyManifestError(`body manifest has no ${tier} tier`);
    this.manifest = manifest;
    this.tier = tier;
    this.baseUrl = url;
    for (const s of manifest.structures) {
      this.byId.set(s.structureId, s);
      this.bySource.set(s.sourceObject, s.structureId);
    }
    for (const g of manifest.groups) this.groups.set(g.groupId, g);
    for (const st of this.stages()) this.stageState.set(st.stageId, "idle");
  }

  private bindLibrary(library: Object3D): void {
    library.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const name = (o.userData?.material as string | undefined) ?? (mesh.material as Material).name;
      this.materials.set(name, mesh.material as Material);
    });
    for (const name of this.manifest.materialLibrary.materials) if (!this.materials.has(name)) throw new BodyManifestError(`material library is missing ${name}`);
  }

  private ensureLibrary(): Promise<void> {
    if (this.materials.size) return Promise.resolve();
    this.libraryPromise ??= this.fetchFile(this.manifest.materialLibrary.url, "materials", this.manifest.materialLibrary).then((lib) => this.bindLibrary(lib));
    return this.libraryPromise;
  }

  private bind(library: Object3D | null, firstStage: Record<string, Object3D>): void {
    if (library) this.bindLibrary(library);
    const first = this.stages()[0];
    for (const fileId of first.files) this.prepare(fileId, firstStage[fileId]);
    const proxyFirst = first.files.every((f) => this.manifest.files[f].proxy);
    const missing = this.manifest.groups.filter((g) => !this.pending.has(g.groupId)).map((g) => g.groupId);
    if (!proxyFirst && missing.length) throw new BodyManifestError(`first stage is missing groups: ${missing.slice(0, 8).join(", ")}`);
    this.stageState.set(first.stageId, proxyFirst ? "applied" : "ready");
    if (proxyFirst) this.apply();
    else this.applyPending();
    this.loaded = true;
  }

  private async fetchFile(relativeUrl: string, label: string, spec: { bytes: number; sha256: string; extensionsRequired: string[] }): Promise<Object3D> {
    const loaded = await this.assets.loadFile(new URL(relativeUrl, this.baseUrl).href, { label: `body.${label}`, bytes: spec.bytes, sha256: spec.sha256, extensionsRequired: spec.extensionsRequired });
    return loaded.gltf.scene;
  }

  /** Bind a stage file's group nodes as pending replacements, with library materials. */
  private prepare(fileId: string, scene: Object3D): void {
    const file = this.manifest.files[fileId];
    if (!file || !scene) throw new BodyManifestError(`stage file ${fileId} missing`);
    if (file.proxy) {
      const node = scene.children.find((c) => c.userData?.role === "body_proxy" && c.userData.output === file.output);
      if (!node || scene.children.length !== 1) throw new BodyManifestError(`${fileId}: expected one ${file.output} proxy node`);
      const meshes: Mesh[] = [];
      node.traverse((c) => ((c as Mesh).isMesh ? meshes.push(c as Mesh) : undefined));
      node.removeFromParent();
      node.updateMatrixWorld(true);
      node.matrixAutoUpdate = false;
      // proxies are applied immediately (first frame)
      this.proxies.set(file.output, { node, meshes, base: node.matrix.clone(), lod: 2, fileId });
      this.group.add(node);
      return;
    }
    const expected = new Set(file.groups);
    const found = new Set<string>();
    for (const node of [...scene.children]) {
      const groupId = node.userData?.groupId as string | undefined;
      if (!groupId || !expected.has(groupId)) throw new BodyManifestError(`${fileId}: unexpected node ${node.name}`);
      const meshes: Mesh[] = [];
      node.traverse((c) => {
        const mesh = c as Mesh;
        if (!mesh.isMesh) return;
        const placeholder = mesh.material as Material;
        const material = this.materials.get(this.groups.get(groupId)!.material);
        if (!material) throw new BodyManifestError(`${fileId}: no library material for ${groupId}`);
        if (placeholder !== material) placeholder.dispose();
        mesh.material = material;
        mesh.userData.bodyGroupId = groupId;
        meshes.push(mesh);
      });
      node.removeFromParent();
      node.updateMatrixWorld(true);
      node.matrixAutoUpdate = false;
      this.pending.set(groupId, { node, meshes, base: node.matrix.clone(), lod: file.lod, fileId });
      found.add(groupId);
    }
    const missing = file.groups.filter((g) => !found.has(g));
    if (missing.length) throw new BodyManifestError(`${fileId}: groups missing from glTF: ${missing.slice(0, 8).join(", ")}`);
  }

  stages(): BodyStage[] {
    return this.manifest.tiers[this.tier].stages;
  }

  stageStatus(stageId: string): BodyStageState {
    const s = this.stageState.get(stageId);
    if (!s) throw new BodyManifestError(`unknown stage ${stageId} for tier ${this.tier}`);
    return s;
  }

  /** Load a later stage in the background and prepare its groups (not shown until applyPending). Idempotent. */
  ensureStage(stageId: string): Promise<void> {
    const stage = this.stages().find((s) => s.stageId === stageId);
    if (!stage) return Promise.reject(new BodyManifestError(`unknown stage ${stageId} for tier ${this.tier}`));
    const state = this.stageState.get(stageId);
    if (state === "ready" || state === "applied") return Promise.resolve();
    let p = this.stagePromise.get(stageId);
    if (!p) {
      this.stageState.set(stageId, "loading");
      const grouped = stage.files.some((f) => !this.manifest.files[f].proxy);
      p = Promise.all([grouped ? this.ensureLibrary() : Promise.resolve(), ...stage.files.map((f) => this.fetchFile(this.manifest.files[f].url, f, this.manifest.files[f]))])
        .then(async ([, ...scenes]) => {
          const before = new Set(this.pending.keys());
          stage.files.forEach((f, i) => this.prepare(f, scenes[i] as Object3D));
          const added = [...this.pending.entries()].filter(([g]) => !before.has(g));
          // Compile every presentation state of the new meshes before they can be shown (no stall at the swap).
          if (this.prepareHook && added.length) {
            await this.prepareHook(
              added.map(([, o]) => o.meshes[0]),
              added.map(([g]) => (this.groups.get(g)!.output === "skin" ? ["shell"] : ["none", "dimmed", "highlight"])),
            );
          }
          for (const f of stage.files) if (!this.manifest.files[f].proxy) this.pendingProxyRemoval.add(this.manifest.files[f].output);
          this.stageState.set(stageId, "ready");
          performance.mark(`joints:stage-ready:${stageId}`);
          this.onStageReady?.(stageId);
        })
        .catch((error) => {
          this.stageState.set(stageId, "error");
          this.stagePromise.delete(stageId);
          throw error;
        });
      this.stagePromise.set(stageId, p);
    }
    return p;
  }

  get hasPending(): boolean {
    return this.pending.size > 0;
  }

  /** Swap prepared groups in (the caller decides the framing allows it). Returns the applied group ids. */
  applyPending(): string[] {
    if (!this.pending.size) return [];
    const applied: string[] = [];
    // grouped meshes replace the delivery proxy of their output
    for (const output of this.pendingProxyRemoval) {
      const proxy = this.proxies.get(output);
      if (!proxy) continue;
      proxy.node.removeFromParent();
      for (const m of proxy.meshes) m.geometry.dispose();
      this.proxies.delete(output);
    }
    this.pendingProxyRemoval.clear();
    for (const [groupId, next] of this.pending) {
      const prev = this.current.get(groupId);
      if (prev) {
        prev.node.removeFromParent();
        for (const m of prev.meshes) m.geometry.dispose();
      }
      this.group.add(next.node);
      this.current.set(groupId, next);
      applied.push(groupId);
    }
    this.pending.clear();
    for (const [stageId, state] of this.stageState) if (state === "ready") this.stageState.set(stageId, "applied");
    // A stage upgrade replaces group nodes, so a teaching displacement has to be re-applied to the new node.
    for (const [groupId, matrix] of this.transforms) {
      const entry = this.current.get(groupId);
      if (!entry) continue;
      entry.node.matrix.multiplyMatrices(matrix, entry.base);
      entry.node.matrixWorldNeedsUpdate = true;
      entry.node.updateMatrixWorld(true);
    }
    this.apply();
    return applied;
  }

  lodOf(structureId: string): number {
    const s = this.require(structureId);
    return this.current.get(s.groupId)?.lod ?? (this.proxies.has(s.output) ? 2 : -1);
  }

  // ---------------------------------------------------------- teaching transforms
  //
  // A render group is a rigid set of structures with its own node, so a whole group can be displaced without touching any
  // geometry, any manifest or any validated asset. That is what the Step-14 teaching simulations use: the head turning on
  // C1/C2, the arm swinging at the shoulder. This is a PRESENTATION transform, never a validated joint rig, and the UI
  // says so. The validated elbow never comes through here - it moves through JointController.setDof.

  /** Groups displaced from their delivered position, kept so a stage upgrade can re-apply the displacement. */
  private readonly transforms = new Map<string, Matrix4>();

  /**
   * Rigidly place a render group: `matrix` replaces the group node's local matrix, `null` restores the delivered position.
   * A group that is known but not applied yet (its stage is still loading) is remembered and placed when it arrives.
   */
  setGroupTransform(groupId: string, matrix: Matrix4 | null): void {
    if (!this.groups.has(groupId)) throw new BodyManifestError(`unknown body group ${groupId}`);
    if (matrix) this.transforms.set(groupId, matrix.clone());
    else this.transforms.delete(groupId);
    const entry = this.current.get(groupId);
    if (!entry) return;
    // Compose: the delivered matrix places the group in the body, the displacement moves it from there.
    if (matrix) entry.node.matrix.multiplyMatrices(matrix, entry.base);
    else entry.node.matrix.copy(entry.base);
    entry.node.matrixWorldNeedsUpdate = true;
    entry.node.updateMatrixWorld(true);
  }

  /** Restore every displaced group to its delivered position. */
  clearGroupTransforms(): void {
    for (const groupId of [...this.transforms.keys()]) this.setGroupTransform(groupId, null);
  }

  /** Group ids currently displaced by a teaching simulation (QA / diagnostics). */
  get displacedGroups(): string[] {
    return [...this.transforms.keys()];
  }

  /**
   * Live world state of every loaded render group: the node's world matrix and the world bounding box of its meshes
   * (QA / diagnostics).
   *
   * This is measured from the scene graph, not read from the manifest, because the Explore isolation invariant is about
   * what actually moved on screen - not about what the content said should move.
   */
  groupWorldState(): Record<string, { matrixWorld: number[]; bbox: [number, number, number, number, number, number] | null }> {
    const out: Record<string, { matrixWorld: number[]; bbox: [number, number, number, number, number, number] | null }> = {};
    const box = new Box3();
    for (const [groupId, entry] of this.current) {
      entry.node.updateWorldMatrix(true, false);
      box.makeEmpty();
      for (const mesh of entry.meshes) {
        mesh.updateWorldMatrix(true, false);
        box.expandByObject(mesh, true);
      }
      out[groupId] = { matrixWorld: entry.node.matrixWorld.toArray(), bbox: box.isEmpty() ? null : [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z] };
    }
    return out;
  }

  /** True while the delivery proxy (not the grouped representation) is on screen. */
  get showingProxy(): boolean {
    return this.proxies.has("skeleton") && this.current.size === 0;
  }

  get groupsApplied(): boolean {
    return this.current.size > 0;
  }

  get groupCount(): number {
    return this.current.size + this.proxies.size;
  }

  // ------------------------------------------------------------------ lookup

  private require(id: string): BodyStructure {
    const s = this.byId.get(id);
    if (!s) throw new BodyManifestError(`unknown body structure ${id}`);
    return s;
  }

  structure(id: string): BodyStructure | undefined {
    return this.byId.get(id);
  }

  structureIds(): string[] {
    return [...this.byId.keys()];
  }

  site(siteId: string): BodyJointSite {
    const s = this.manifest.jointSites.find((x) => x.siteId === siteId);
    if (!s) throw new BodyManifestError(`unknown joint site ${siteId}`);
    return s;
  }

  hasSite(siteId: string): boolean {
    return this.manifest?.jointSites.some((x) => x.siteId === siteId) ?? false;
  }

  region(regionId: string): string[] {
    const r = this.manifest.regions[regionId];
    if (!r) throw new BodyManifestError(`unknown body region ${regionId}`);
    return r;
  }

  /** Resolve refs: body structureId, `region:<id>`, or `skeleton` / `skin` (all structures of that output). */
  resolve(refs: readonly string[]): string[] {
    const out = new Set<string>();
    for (const ref of refs) {
      if (ref.startsWith("region:")) this.region(ref.slice(7)).forEach((id) => out.add(id));
      else if (ref === "skeleton" || ref === "skin") this.manifest.structures.filter((s) => s.output === ref).forEach((s) => out.add(s.structureId));
      else if (this.byId.has(ref)) out.add(ref);
      else throw new BodyManifestError(`unknown body structure ref ${ref}`);
    }
    return [...out];
  }

  /** Whole groups covered by a structure set. A set that splits a render group is refused (no silent approximation). */
  groupsCovering(structureIds: Iterable<string>, what: string): Set<string> {
    const ids = new Set(structureIds);
    const out = new Set<string>();
    for (const id of ids) out.add(this.require(id).groupId);
    for (const g of out) {
      const members = this.groups.get(g)!.structureIds;
      if (!members.every((m) => ids.has(m))) throw new BodyManifestError(`${what} splits render group ${g} (${members.filter((m) => !ids.has(m)).length} of ${members.length} structures not included)`);
    }
    return out;
  }

  // ------------------------------------------------------------------ presentation

  /**
   * Declarative presentation for a shot: every skeleton group gets exactly one state.
   * `dimOthers` recedes everything not highlighted; `shell` shows the skin silhouette.
   */
  present(options: { visible: boolean; highlight: readonly string[]; dimOthers: boolean; shell: boolean; hidden?: readonly string[] }): void {
    const highlight = this.groupsCovering(options.highlight, "body highlight");
    const hidden = this.groupsCovering(options.hidden ?? [], "body hidden");
    if (!this.current.size && (highlight.size || hidden.size || options.dimOthers)) throw new BodyManifestError("this body presentation needs the grouped representation (prepareShot was not awaited)");
    for (const g of this.groups.values()) {
      if (g.output === "skin") continue;
      let p: BodyPresentation = "normal";
      if (!options.visible || hidden.has(g.groupId)) p = "hidden";
      else if (highlight.has(g.groupId)) p = "highlight";
      else if (options.dimOthers) p = "dimmed";
      this.presentation.set(g.groupId, p);
    }
    this.shellVisible = options.visible && options.shell;
    this.presentationVisible = options.visible;
    this.apply();
  }

  /** Hide body groups whose source objects are shown by a validated joint asset (same world frame). */
  handOver(sourceObjects: readonly string[], active: boolean): string[] {
    const ids = sourceObjects.map((o) => this.bySource.get(o)).filter((x): x is string => !!x);
    const groups = this.groupsCovering(ids, "joint handover");
    if (active && groups.size && !this.current.size) throw new BodyManifestError("joint handover needs the grouped representation");
    for (const g of groups) (active ? this.handedOver.add(g) : this.handedOver.delete(g));
    this.apply();
    return ids;
  }

  get handedOverIds(): string[] {
    return this.manifest.structures.filter((s) => this.handedOver.has(s.groupId)).map((s) => s.structureId);
  }

  presentationOf(id: string): BodyPresentation | "handedOver" | "shell" | "off" {
    const s = this.require(id);
    if (s.output === "skin") return this.shellVisible ? "shell" : "off";
    if (!this.current.size) return this.proxies.get("skeleton")?.meshes.some((m) => m.visible) ? "normal" : "hidden";
    if (this.handedOver.has(s.groupId)) return "handedOver";
    return this.presentation.get(s.groupId) ?? "normal";
  }

  visibleStructureIds(): string[] {
    return this.manifest.structures.filter((s) => (this.current.get(s.groupId) ?? (this.current.size ? undefined : this.proxies.get(s.output)))?.meshes.some((m) => m.visible)).map((s) => s.structureId);
  }

  private apply(): void {
    for (const [output, proxy] of this.proxies) {
      const visible = output === "skin" ? this.shellVisible : this.presentationVisible;
      for (const m of proxy.meshes) m.visible = visible;
      if (visible) this.highlighter.set(proxy.meshes, output === "skin" ? "shell" : "none");
    }
    for (const [groupId, obj] of this.current) {
      const g = this.groups.get(groupId)!;
      if (g.output === "skin") {
        for (const m of obj.meshes) m.visible = this.shellVisible;
        if (this.shellVisible) this.highlighter.set(obj.meshes, "shell");
        continue;
      }
      const p = this.presentation.get(groupId) ?? "normal";
      const visible = p !== "hidden" && !this.handedOver.has(groupId);
      for (const m of obj.meshes) m.visible = visible;
      const state: HighlightState = p === "highlight" ? "highlight" : p === "dimmed" ? "dimmed" : "none";
      if (visible) this.highlighter.set(obj.meshes, state);
    }
    this.onChange();
  }

  /** Every material/state pair the body can present (for background shader precompilation). */
  presentationVariants(): { mesh: Mesh; state: HighlightState }[] {
    const out: { mesh: Mesh; state: HighlightState }[] = [];
    for (const [output, proxy] of this.proxies) out.push({ mesh: proxy.meshes[0], state: output === "skin" ? "shell" : "none" });
    for (const [groupId, obj] of this.current) {
      const states: HighlightState[] = this.groups.get(groupId)!.output === "skin" ? ["shell"] : ["none", "dimmed", "highlight"];
      for (const state of states) out.push({ mesh: obj.meshes[0], state });
    }
    return out;
  }

  /** World box of body structures (manifest data; presentation irrelevant). */
  box(ids: readonly string[]): Box3 {
    const box = new Box3();
    for (const id of ids) {
      const b = this.byId.get(id)?.bbox;
      if (b) box.union(new Box3(new Vector3(...b.min), new Vector3(...b.max)));
    }
    return box;
  }

  bounds(): Box3 {
    const b = this.manifest.frame.bounds;
    return new Box3(new Vector3(...b.min), new Vector3(...b.max));
  }

  meshList(filter: (structureId: string) => boolean = () => true): Mesh[] {
    const out: Mesh[] = [];
    if (!this.current.size) for (const p of this.proxies.values()) out.push(...p.meshes);
    for (const [groupId, obj] of this.current) if (this.groups.get(groupId)!.structureIds.some(filter)) out.push(...obj.meshes);
    return out;
  }
}
