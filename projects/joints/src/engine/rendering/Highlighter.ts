import { Color, MeshStandardMaterial, type Material, type Mesh } from "three";

/** Material presentation of a structure. Precedence is resolved by StructureStateController, not here. */
export type HighlightState = "none" | "hover" | "selected" | "highlight" | "faded" | "reveal" | "dimmed" | "shell";

const TINT: Partial<Record<HighlightState, { color: number; intensity: number }>> = {
  hover: { color: 0x7fa6d6, intensity: 0.1 },
  selected: { color: 0x3a78c9, intensity: 0.26 },
  highlight: { color: 0xd89a4e, intensity: 0.2 },
};

/** Default dimmed opacity for isolate/fade (design: everything else dims to about 15%). */
export const FADED_OPACITY = 0.15;

/**
 * Restrained highlight: one cached material clone per (source material, state). Shared glTF materials are never mutated,
 * clones are created at most once per state (never per step or per frame), and the original is restored on "none".
 * "faded" and "reveal" clones are transparent; their opacity is animated centrally via setStateOpacity.
 */
export class Highlighter {
  private readonly originals = new WeakMap<Mesh, Material | Material[]>();
  private readonly clones = new Map<string, MeshStandardMaterial>();
  private readonly state = new Map<Mesh, HighlightState>();
  private readonly opacity: Record<"faded" | "reveal" | "shell", number> = { faded: FADED_OPACITY, reveal: 1, shell: 0.09 };

  set(meshes: readonly Mesh[], state: HighlightState): void {
    for (const mesh of meshes) {
      if (state === "none") {
        const original = this.originals.get(mesh);
        if (original) mesh.material = original;
        this.state.delete(mesh);
        continue;
      }
      if (!this.originals.has(mesh)) this.originals.set(mesh, mesh.material);
      const base = this.originals.get(mesh)!;
      if (Array.isArray(base) || !(base instanceof MeshStandardMaterial)) continue;
      mesh.material = this.cloneFor(base, state);
      this.state.set(mesh, state);
    }
  }

  /** The material a mesh would use in a state (cached clone; the original for "none"). No mesh is changed. */
  materialFor(mesh: Mesh, state: HighlightState): Material | Material[] {
    const base = this.originals.get(mesh) ?? mesh.material;
    if (state === "none" || Array.isArray(base) || !(base instanceof MeshStandardMaterial)) return base;
    return this.cloneFor(base, state);
  }

  private cloneFor(base: MeshStandardMaterial, state: Exclude<HighlightState, "none">): MeshStandardMaterial {
    const key = `${base.uuid}:${state}`;
    let clone = this.clones.get(key);
    if (clone) return clone;
    clone = base.clone();
    clone.name = `${base.name} [${state}]`;
    const tint = TINT[state];
    if (tint) {
      clone.emissive = new Color(tint.color);
      clone.emissiveIntensity = tint.intensity;
    }
    if (state === "dimmed") {
      // Opaque recession for dense anatomy (a transparent skeleton reads as noise): darker, less specular.
      clone.color.multiplyScalar(0.13);
      clone.roughness = 1;
      clone.envMapIntensity = 0.18;
      clone.normalScale.multiplyScalar(0.6);
    }
    if (state === "shell") {
      // Skin as a restrained translucent silhouette around the skeleton.
      clone.transparent = true;
      clone.depthWrite = false;
      clone.opacity = this.opacity.shell;
      clone.color.setRGB(0.72, 0.78, 0.86);
      clone.map = null;
      clone.normalMap = null;
      clone.roughness = 0.35;
    }
    if (state === "faded" || state === "reveal") {
      clone.transparent = true;
      clone.depthWrite = state === "reveal";
      clone.opacity = this.opacity[state];
      if (state === "faded") clone.color.multiplyScalar(0.92);
    }
    this.clones.set(key, clone);
    return clone;
  }

  /** Animate the shared opacity of every faded/reveal clone (no new materials). */
  setStateOpacity(state: "faded" | "reveal" | "shell", opacity: number): void {
    this.opacity[state] = opacity;
    for (const [key, clone] of this.clones) if (key.endsWith(`:${state}`)) clone.opacity = opacity;
  }

  stateOpacity(state: "faded" | "reveal" | "shell"): number {
    return this.opacity[state];
  }

  stateOf(mesh: Mesh): HighlightState {
    return this.state.get(mesh) ?? "none";
  }

  /** Number of cached clones (performance check: must stay bounded). */
  get cloneCount(): number {
    return this.clones.size;
  }

  dispose(): void {
    for (const c of this.clones.values()) c.dispose();
    this.clones.clear();
  }
}
