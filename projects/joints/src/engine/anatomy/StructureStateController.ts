import { Matrix3, Matrix4, Vector3, type Object3D } from "three";
import type { HighlightState } from "../rendering/Highlighter";
import type { StructureRegistry } from "./StructureRegistry";

export type VisibilityOverride = "default" | "show" | "hide";

export interface StructureDisplayState {
  /** "show" enables the structure even if its tier layer is off; "hide" always hides. Motion policy still applies. */
  visibility: VisibilityOverride;
  highlighted: boolean;
  faded: boolean;
  /** Fading in (reveal pattern). */
  revealing: boolean;
}

const DEFAULT_STATE: StructureDisplayState = Object.freeze({ visibility: "default", highlighted: false, faded: false, revealing: false });

/**
 * Presentation state per structureId: visible / hidden / highlighted / isolated / faded / separated.
 * It never decides tracking: App composes `visibility` with the authoritative VisibilityPolicy, so lesson state cannot
 * make a static structure appear to follow the joint. Separation is a temporary display offset of the structure node
 * that is always fully restorable; it is not a joint pose.
 */
export class StructureStateController {
  private readonly states = new Map<string, StructureDisplayState>();
  private isolateSet: Set<string> | null = null;
  private readonly separated = new Map<string, { node: Object3D; base: Vector3 }>();

  constructor(private readonly registry: StructureRegistry, private readonly onChange: () => void = () => undefined) {}

  get(structureId: string): StructureDisplayState {
    return this.states.get(structureId) ?? DEFAULT_STATE;
  }

  private require(structureId: string): void {
    if (!this.registry.get(structureId)) throw new Error(`structure state: ${structureId} is not a loaded structure`);
  }

  set(structureIds: readonly string[], patch: Partial<StructureDisplayState>): void {
    for (const id of structureIds) {
      this.require(id);
      this.states.set(id, { ...this.get(id), ...patch });
    }
    this.onChange();
  }

  /** Replace the highlighted set (empty = clear). */
  highlightOnly(structureIds: readonly string[]): void {
    for (const id of structureIds) this.require(id);
    const wanted = new Set(structureIds);
    for (const [id, s] of this.states) if (s.highlighted && !wanted.has(id)) this.states.set(id, { ...s, highlighted: false });
    for (const id of wanted) this.states.set(id, { ...this.get(id), highlighted: true });
    this.onChange();
  }

  /** Everything outside `keep` renders faded; null clears isolation. */
  isolate(keep: readonly string[] | null): void {
    if (keep) for (const id of keep) this.require(id);
    this.isolateSet = keep && keep.length ? new Set(keep) : null;
    this.onChange();
  }

  get isolated(): ReadonlySet<string> | null {
    return this.isolateSet;
  }

  visibilityOverride(structureId: string): VisibilityOverride {
    return this.get(structureId).visibility;
  }

  isFaded(structureId: string): boolean {
    return this.get(structureId).faded || (this.isolateSet !== null && !this.isolateSet.has(structureId));
  }

  /** Material presentation, highest precedence first: selected > revealing > highlighted > hover > faded/isolated. */
  materialState(structureId: string, ui: { selected: boolean; hovered: boolean }): HighlightState {
    const s = this.get(structureId);
    if (ui.selected) return "selected";
    if (s.revealing) return "reveal";
    if (s.highlighted) return "highlight";
    if (ui.hovered) return "hover";
    if (this.isFaded(structureId)) return "faded";
    return "none";
  }

  // ---- separation ----

  /** Offset structure nodes by `distanceM` along a world direction (0 restores). Base transforms are captured once. */
  setSeparation(structureIds: readonly string[], directionWorld: Vector3, distanceM: number): void {
    const dir = directionWorld.clone().normalize().multiplyScalar(distanceM);
    for (const id of structureIds) {
      this.require(id);
      const node = this.registry.require(id).node;
      let rec = this.separated.get(id);
      if (!rec) {
        rec = { node, base: node.position.clone() };
        this.separated.set(id, rec);
      }
      const parent = node.parent;
      const local = dir.clone();
      if (parent) {
        parent.updateWorldMatrix(true, false);
        local.applyMatrix3(new Matrix3().setFromMatrix4(new Matrix4().copy(parent.matrixWorld).invert()));
      }
      node.position.copy(rec.base).add(local);
      node.updateMatrixWorld(true);
    }
    this.onChange();
  }

  separatedIds(): string[] {
    return [...this.separated.keys()];
  }

  /** Current offset (world metres) of a separated structure; 0 when assembled. */
  separationDistance(structureId: string): number {
    const rec = this.separated.get(structureId);
    return rec ? rec.node.position.distanceTo(rec.base) : 0;
  }

  /** Restore every separated structure to its exact captured transform. */
  reassembleAll(): void {
    for (const rec of this.separated.values()) {
      rec.node.position.copy(rec.base);
      rec.node.updateMatrixWorld(true);
    }
    this.separated.clear();
    this.onChange();
  }

  /** Clear all presentation state (visibility overrides, highlight, fade, isolation, separation). */
  reset(): void {
    this.states.clear();
    this.isolateSet = null;
    if (this.separated.size) this.reassembleAll();
    this.onChange();
  }
}
