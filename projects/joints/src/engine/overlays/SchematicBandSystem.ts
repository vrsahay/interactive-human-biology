import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
import type { AnchorRegistry } from "../anatomy/AnchorRegistry";
import type { BandSpec } from "../assets/manifestTypes";

export interface BandView {
  bandId: string;
  structureId: string;
  side?: string;
  contentLabel: string;
  group: Group;
  core: Mesh;
  ghost: Mesh;
  caps: Mesh[];
}

export interface BandStyle {
  radiusM: number;
  colorBySide: Record<string, number>;
  defaultColor: number;
}

export const DEFAULT_BAND_STYLE: BandStyle = { radiusM: 0.0009, colorBySide: { lateral: 0xc3843a, medial: 0x2f8f86 }, defaultColor: 0xb08a4a };

const UP = new Vector3(0, 1, 0);

/**
 * Schematic ligament bands: thin procedural tubes between a proximal and distal attachment anchor.
 * They are NOT the real ligament meshes and never deform them; endpoint distance changes are a visual aid only
 * (manifest bandRepresentation.statement), so this system deliberately exposes no length/strain readout to the UI.
 */
export class SchematicBandSystem {
  readonly group = new Group();
  private readonly bands: BandView[] = [];
  private readonly geometry = new CylinderGeometry(1, 1, 1, 14, 1, true);
  private readonly capGeometry = new SphereGeometry(1, 16, 10);
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly specs = new Map<string, { proximalAnchorId: string; distalAnchorId: string }>();

  constructor(specs: readonly BandSpec[], private readonly anchors: AnchorRegistry, private readonly style: BandStyle = DEFAULT_BAND_STYLE) {
    this.group.name = "overlay:schematic-bands";
    this.group.userData = { role: "overlay", overlay: "schematic_band", pickable: false };
    for (const spec of specs) {
      if (spec.representation !== "schematic" || spec.deformationSimulation !== false) throw new Error(`band ${spec.bandId} is not a schematic band`);
      anchors.require(spec.proximalAnchorId);
      anchors.require(spec.distalAnchorId);
      this.specs.set(spec.bandId, { proximalAnchorId: spec.proximalAnchorId, distalAnchorId: spec.distalAnchorId });
      const color = (spec.side && style.colorBySide[spec.side]) ?? style.defaultColor;
      const bandGroup = new Group();
      bandGroup.name = `band:${spec.bandId}`;
      bandGroup.userData = { role: "schematic_band", bandId: spec.bandId, representation: spec.representation, deformationSimulation: spec.deformationSimulation, contentLabel: spec.contentLabel };
      const core = new Mesh(this.geometry, new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, emissive: color, emissiveIntensity: 0.18 }));
      const ghost = new Mesh(this.geometry, new MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false }));
      ghost.renderOrder = 5;
      const caps = [0, 1, 2, 3].map((i) => {
        const ghostCap = i >= 2;
        const cap = new Mesh(this.capGeometry, ghostCap ? new MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false }) : new MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.25 }));
        cap.renderOrder = ghostCap ? 6 : 0;
        return cap;
      });
      bandGroup.add(ghost, core, ...caps);
      this.group.add(bandGroup);
      this.bands.push({ bandId: spec.bandId, structureId: spec.structureId, side: spec.side, contentLabel: spec.contentLabel, group: bandGroup, core, ghost, caps });
    }
    this.update();
  }

  /** Recompute band placement from current anchor world positions (call after every pose change). */
  update(): void {
    const q = new Quaternion();
    const dir = new Vector3();
    for (const band of this.bands) {
      const bandSpec = this.specFor(band.bandId);
      this.anchors.worldPosition(bandSpec.proximalAnchorId, this.a);
      this.anchors.worldPosition(bandSpec.distalAnchorId, this.b);
      dir.subVectors(this.b, this.a);
      const length = Math.max(dir.length(), 1e-6);
      q.setFromUnitVectors(UP, dir.divideScalar(length));
      for (const m of [band.core, band.ghost]) {
        m.position.addVectors(this.a, this.b).multiplyScalar(0.5);
        m.quaternion.copy(q);
        m.scale.set(this.style.radiusM, length, this.style.radiusM);
      }
      band.caps[0].position.copy(this.a);
      band.caps[1].position.copy(this.b);
      band.caps[2].position.copy(this.a);
      band.caps[3].position.copy(this.b);
      for (const c of band.caps) c.scale.setScalar(this.style.radiusM * 2.1);
    }
  }

  private specFor(bandId: string): { proximalAnchorId: string; distalAnchorId: string } {
    return this.specs.get(bandId)!;
  }

  /** Endpoint positions (world) - for QA only; never presented to learners as strain. */
  endpoints(bandId: string): { proximal: Vector3; distal: Vector3 } {
    const s = this.specFor(bandId);
    return { proximal: this.anchors.worldPosition(s.proximalAnchorId), distal: this.anchors.worldPosition(s.distalAnchorId) };
  }

  list(): readonly BandView[] {
    return this.bands;
  }

  set visible(v: boolean) {
    this.group.visible = v;
  }

  get visible(): boolean {
    return this.group.visible;
  }

  dispose(): void {
    this.geometry.dispose();
    this.capGeometry.dispose();
    for (const b of this.bands) for (const m of [b.core, b.ghost, ...b.caps]) (m.material as MeshBasicMaterial).dispose();
  }
}
