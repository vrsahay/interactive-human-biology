import type { Object3D } from "three";
import type { StructureEntry } from "./StructureRegistry";

export interface AttachResult {
  structureId: string;
  from: string | null;
  to: string;
}

/**
 * Runtime attach contract (Step 9): a structure whose manifest `attachTo` names an exported node is re-parented to that
 * node while KEEPING its world transform (Object3D.attach). Structures without attachTo are never re-parented.
 * Must run with the joint at neutral so world transforms equal the exported neutral pose.
 */
export function applyAttachTo(entries: readonly StructureEntry[], resolveNode: (name: string) => Object3D | undefined): AttachResult[] {
  const results: AttachResult[] = [];
  for (const e of entries) {
    const targetName = e.spec.attachTo;
    if (!targetName) continue;
    const target = resolveNode(targetName);
    if (!target) throw new Error(`attachTo target ${targetName} for ${e.structureId} is not loaded`);
    if (e.node.parent === target) continue;
    const from = e.node.parent?.name ?? null;
    target.updateWorldMatrix(true, false);
    e.node.updateWorldMatrix(true, false);
    target.attach(e.node);
    results.push({ structureId: e.structureId, from, to: targetName });
  }
  return results;
}
