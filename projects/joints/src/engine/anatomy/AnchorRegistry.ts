import { Vector3, type Object3D } from "three";
import type { JointManifestModel } from "../assets/ManifestLoader";
import type { AnchorSpec, TierName } from "../assets/manifestTypes";
import { RegistryError, type StructureRegistry } from "./StructureRegistry";

export interface AnchorEntry {
  anchorId: string;
  spec: AnchorSpec;
  node: Object3D;
}

/** Neutral-pose tolerance for anchor world positions (metres). */
export const ANCHOR_NEUTRAL_TOLERANCE_M = 1e-4;

/** anchorId -> exported anchor node. Parents and neutral world positions are checked against the manifest. */
export class AnchorRegistry {
  private readonly entries = new Map<string, AnchorEntry>();

  constructor(private readonly manifest: JointManifestModel, private readonly structures: StructureRegistry) {}

  registerTier(tier: TierName, root: Object3D): AnchorEntry[] {
    const problems: string[] = [];
    const byId = new Map<string, Object3D>();
    root.traverse((o) => {
      if (o.userData?.role === "anchor" && typeof o.userData.anchorId === "string") byId.set(o.userData.anchorId, o);
    });
    const added: AnchorEntry[] = [];
    for (const spec of this.manifest.anchorsInTier(tier)) {
      const node = byId.get(spec.anchorId);
      if (!node) {
        problems.push(`anchor ${spec.anchorId} not found in tier ${tier}`);
        continue;
      }
      if (node.userData.qa === true || node.userData.export === false) problems.push(`anchor ${spec.anchorId} is tagged as QA/non-export`);
      if (node.parent?.name !== spec.parentNode) problems.push(`anchor ${spec.anchorId}: parent ${node.parent?.name} != manifest ${spec.parentNode}`);
      if (node.userData.structureId !== spec.structureId) problems.push(`anchor ${spec.anchorId}: structureId extras mismatch`);
      added.push({ anchorId: spec.anchorId, spec, node });
    }
    for (const id of byId.keys()) if (!this.manifest.anchor(id)) problems.push(`unexpected anchor ${id}`);
    if (problems.length) throw new RegistryError(`tier ${tier} failed anchor validation:\n - ${problems.join("\n - ")}`);
    for (const e of added) this.entries.set(e.anchorId, e);
    return added;
  }

  /** Must be called with the joint at neutral: every anchor world position must equal the manifest. Returns max deviation (m). */
  verifyNeutralPositions(): number {
    let worst = 0;
    const p = new Vector3();
    for (const e of this.entries.values()) {
      e.node.updateWorldMatrix(true, false);
      p.setFromMatrixPosition(e.node.matrixWorld);
      worst = Math.max(worst, p.distanceTo(new Vector3(...e.spec.neutralWorldPosition)));
    }
    if (worst > ANCHOR_NEUTRAL_TOLERANCE_M) throw new RegistryError(`anchor neutral positions deviate ${(worst * 1000).toFixed(3)} mm from the manifest`);
    return worst;
  }

  get(anchorId: string): AnchorEntry | undefined {
    return this.entries.get(anchorId);
  }

  require(anchorId: string): AnchorEntry {
    const e = this.entries.get(anchorId);
    if (!e) throw new RegistryError(`anchor ${anchorId} is not registered`);
    return e;
  }

  worldPosition(anchorId: string, target = new Vector3()): Vector3 {
    const node = this.require(anchorId).node;
    node.updateWorldMatrix(true, false);
    return target.setFromMatrixPosition(node.matrixWorld);
  }

  /** The structure the anchor labels (null for joint-centre anchors that are not anatomy structures). */
  structureOf(anchorId: string) {
    const spec = this.require(anchorId).spec;
    return this.structures.get(spec.structureId) ?? null;
  }

  all(): AnchorEntry[] {
    return [...this.entries.values()];
  }

  get size(): number {
    return this.entries.size;
  }
}
