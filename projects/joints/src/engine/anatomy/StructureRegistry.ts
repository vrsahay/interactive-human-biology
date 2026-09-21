import { Mesh, type Object3D } from "three";
import type { JointManifestModel } from "../assets/ManifestLoader";
import type { StructureRole, StructureSpec, TierName } from "../assets/manifestTypes";

/** Roles that identify an anatomy structure node (schema enum). Anchors, rig nodes and mesh carriers are not structures. */
export const ANATOMY_ROLES: ReadonlySet<string> = new Set<StructureRole>(["bone_fixed", "bone_moving", "follow", "tracked", "spanning_soft", "attached_soft", "context"]);

export interface StructureEntry {
  structureId: string;
  spec: StructureSpec;
  /** Node carrying extras.structureId (transform node; parent of anchors). */
  node: Object3D;
  /** The single `<node>__mesh` carrier holding the geometry. */
  meshes: Mesh[];
}

export class RegistryError extends Error {
  override name = "RegistryError";
}

export function isStructureNode(o: Object3D): boolean {
  return typeof o.userData?.structureId === "string" && ANATOMY_ROLES.has(o.userData.role);
}

/**
 * structureId -> Object3D. Binding uses glTF extras (structureId + anatomy role); display names are never used.
 */
export class StructureRegistry {
  private readonly entries = new Map<string, StructureEntry>();
  private readonly nodesByName = new Map<string, Object3D>();

  constructor(private readonly manifest: JointManifestModel) {}

  /** Index a loaded tier scene and validate it against the manifest tier. Throws on any mismatch. */
  registerTier(tier: TierName, root: Object3D): StructureEntry[] {
    const problems: string[] = [];
    const found = new Map<string, Object3D>();
    const carriers = new Map<string, Mesh[]>();
    root.traverse((o) => {
      if (o.name) {
        if (this.nodesByName.has(o.name) && this.nodesByName.get(o.name) !== o) problems.push(`duplicate node name ${o.name}`);
        this.nodesByName.set(o.name, o);
      }
      if (isStructureNode(o)) {
        const id = o.userData.structureId as string;
        if (found.has(id) || this.entries.has(id)) problems.push(`structureId ${id} bound twice`);
        found.set(id, o);
      }
      const carrierFor = o.userData?.meshCarrierFor;
      if (typeof carrierFor === "string") {
        if (!(o instanceof Mesh)) problems.push(`mesh carrier for ${carrierFor} is not a Mesh`);
        else carriers.set(carrierFor, [...(carriers.get(carrierFor) ?? []), o]);
      }
    });

    const expected = this.manifest.structuresInTier(tier);
    const expectedIds = new Set(expected.map((s) => s.structureId));
    for (const id of found.keys()) if (!expectedIds.has(id)) problems.push(`unexpected structure ${id} in tier ${tier}`);
    const added: StructureEntry[] = [];
    for (const spec of expected) {
      const node = found.get(spec.structureId);
      if (!node) {
        problems.push(`structure ${spec.structureId} not found in tier ${tier}`);
        continue;
      }
      const ud = node.userData;
      if (ud.role !== spec.role || ud.tier !== spec.tier || ud.jointId !== this.manifest.jointId) problems.push(`${spec.structureId}: extras (role/tier/jointId) disagree with manifest`);
      const meshes = carriers.get(spec.structureId) ?? [];
      if (meshes.length !== 1) problems.push(`${spec.structureId}: expected exactly one mesh carrier, found ${meshes.length}`);
      else if (meshes[0].parent !== node) problems.push(`${spec.structureId}: mesh carrier is not a direct child of the structure node`);
      const entry: StructureEntry = { structureId: spec.structureId, spec, node, meshes };
      for (const m of meshes) m.userData.pickStructureId = spec.structureId;
      added.push(entry);
    }
    if (problems.length) throw new RegistryError(`tier ${tier} failed registry validation:\n - ${problems.join("\n - ")}`);
    for (const e of added) this.entries.set(e.structureId, e);
    return added;
  }

  get(structureId: string): StructureEntry | undefined {
    return this.entries.get(structureId);
  }

  require(structureId: string): StructureEntry {
    const e = this.entries.get(structureId);
    if (!e) throw new RegistryError(`structure ${structureId} is not registered`);
    return e;
  }

  resolve(structureId: string): Object3D | undefined {
    return this.entries.get(structureId)?.node;
  }

  /** Exported node lookup by manifest node name (rig nodes, anchors, attach targets). */
  node(name: string): Object3D | undefined {
    return this.nodesByName.get(name);
  }

  /** Walk up from any picked object (normally a `<node>__mesh` carrier) to the owning structure. */
  structureIdFromObject(object: Object3D | null): string | null {
    for (let o: Object3D | null = object; o; o = o.parent) {
      if (isStructureNode(o) && this.entries.has(o.userData.structureId)) return o.userData.structureId;
    }
    return null;
  }

  all(): StructureEntry[] {
    return [...this.entries.values()];
  }

  meshes(filter?: (e: StructureEntry) => boolean): Mesh[] {
    return this.all().filter((e) => !filter || filter(e)).flatMap((e) => e.meshes);
  }

  get size(): number {
    return this.entries.size;
  }
}
