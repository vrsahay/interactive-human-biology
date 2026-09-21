import { Raycaster, Vector2, Vector3, type Camera, type Mesh } from "three";
import type { StructureRegistry } from "../anatomy/StructureRegistry";

export interface PickHit {
  structureId: string;
  mesh: Mesh;
  point: Vector3;
  /** Hit point in the mesh's local frame (follows the structure when the joint moves). */
  localPoint: Vector3;
  distance: number;
}

/** Raycast picking resolved to structureId by walking up from the mesh carrier (never by display name). */
export class Picker {
  readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();

  constructor(private readonly registry: StructureRegistry, private readonly pickable: () => Mesh[]) {}

  setFromClient(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, camera: Camera): Raycaster {
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, camera);
    return this.raycaster;
  }

  pick(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, camera: Camera): PickHit | null {
    this.setFromClient(clientX, clientY, rect, camera);
    return this.pickRay();
  }

  pickRay(): PickHit | null {
    const hits = this.raycaster.intersectObjects(this.pickable(), false);
    for (const h of hits) {
      const structureId = this.registry.structureIdFromObject(h.object);
      if (!structureId) continue;
      const mesh = h.object as Mesh;
      mesh.updateWorldMatrix(true, false);
      return { structureId, mesh, point: h.point.clone(), localPoint: mesh.worldToLocal(h.point.clone()), distance: h.distance };
    }
    return null;
  }
}
