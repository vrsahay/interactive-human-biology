import { ConeGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";

/** Hinge geometry the overlay needs; implemented by HingeJoint. */
export interface HingeGeometry {
  pivotWorld(target?: Vector3): Vector3;
  axisWorld(target?: Vector3): Vector3;
  directionAtWorld(angleDeg: number, target?: Vector3): Vector3;
  travelAtWorld(angleDeg: number, target?: Vector3): Vector3;
}

export interface AxisOverlayConfig {
  axisLengthM: number;
  arcRadiusM: number;
  arcTickDeg: number;
  minDeg: number;
  maxDeg: number;
}

export const OVERLAY_COLORS = {
  axis: 0x2f6fb2,
  range: 0x8a94a3,
  neutral: 0x6b7686,
  current: 0xc9772b,
};

const ARC_SEGMENT_DEG = 2.5;

/** Independently switchable overlay parts (the angle badge is a DOM label owned by the label system). */
export interface AxisOverlayParts {
  axis: boolean;
  neutralDirection: boolean;
  currentDirection: boolean;
  motionArrow: boolean;
  arc: boolean;
  ticks: boolean;
}

export const ALL_AXIS_PARTS: AxisOverlayParts = { axis: true, neutralDirection: true, currentDirection: true, motionArrow: true, arc: true, ticks: true };

/**
 * Hinge axis, neutral direction, current direction, motion arc and travel arrow - all derived from
 * pivot + axis + neutral direction + current angle. Lightweight line primitives only; the anatomy is never redrawn.
 */
export class JointAxisOverlay {
  readonly group = new Group();
  private readonly materials: LineMaterial[] = [];
  private readonly axisLine: Line2;
  private readonly rangeArc: Line2;
  private readonly ticks: LineSegments2;
  private readonly neutralRay: Line2;
  private readonly currentArc: Line2;
  private readonly currentRay: Line2;
  private readonly arrow: Mesh;
  private readonly pivotDot: Mesh;
  private angle = 0;
  private parts: AxisOverlayParts = { ...ALL_AXIS_PARTS };
  private opacityScale = 1;
  private readonly baseOpacity = new Map<LineMaterial | MeshBasicMaterial, number>();
  /** Preallocated strip capacity for the current arc: pose updates rewrite buffers in place (no geometry churn). */
  private readonly arcCapacity: number;

  constructor(private readonly joint: HingeGeometry, private readonly config: AxisOverlayConfig) {
    this.group.name = "overlay:joint-axis";
    this.group.userData = { role: "overlay", overlay: "joint_axis", pickable: false };
    this.axisLine = this.line(OVERLAY_COLORS.axis, 2.6, 0.95);
    this.rangeArc = this.line(OVERLAY_COLORS.range, 1.4, 0.55);
    this.ticks = this.line(OVERLAY_COLORS.range, 1.2, 0.5, true);
    this.neutralRay = this.line(OVERLAY_COLORS.neutral, 1.6, 0.75, false, true);
    this.currentArc = this.line(OVERLAY_COLORS.current, 3.2, 0.95);
    this.currentRay = this.line(OVERLAY_COLORS.current, 2.4, 0.95);
    const overlayMat = (color: number) => new MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });
    this.arrow = new Mesh(new ConeGeometry(config.arcRadiusM * 0.045, config.arcRadiusM * 0.13, 20), overlayMat(OVERLAY_COLORS.current));
    this.pivotDot = new Mesh(new SphereGeometry(config.arcRadiusM * 0.035, 20, 12), overlayMat(OVERLAY_COLORS.axis));
    for (const m of [this.arrow, this.pivotDot]) {
      m.renderOrder = 20;
      this.group.add(m);
    }
    this.arcCapacity = Math.ceil((config.maxDeg - config.minDeg) / ARC_SEGMENT_DEG) + 1;
    this.currentArc.geometry.dispose();
    this.currentArc.geometry = new LineGeometry().setPositions(new Array((this.arcCapacity + 1) * 3).fill(0));
    for (const m of [...this.materials, this.arrow.material as MeshBasicMaterial, this.pivotDot.material as MeshBasicMaterial]) this.baseOpacity.set(m, m.opacity);
    this.rebuildStatic();
    this.setAngle(0);
  }

  /** Show/hide individual parts; hidden parts are skipped by the renderer (no rebuild). */
  setParts(parts: Partial<AxisOverlayParts>): void {
    this.parts = { ...this.parts, ...parts };
    this.axisLine.visible = this.parts.axis;
    this.pivotDot.visible = this.parts.axis;
    this.neutralRay.visible = this.parts.neutralDirection;
    this.currentRay.visible = this.parts.currentDirection;
    this.arrow.visible = this.parts.motionArrow;
    this.rangeArc.visible = this.parts.arc;
    this.currentArc.visible = this.parts.arc;
    this.ticks.visible = this.parts.ticks;
  }

  getParts(): AxisOverlayParts {
    return { ...this.parts };
  }

  /** Global fade (0..1) used by draw-on/fade patterns; multiplies each material's design opacity. */
  setOpacityScale(scale: number): void {
    this.opacityScale = Math.min(1, Math.max(0, scale));
    for (const [m, base] of this.baseOpacity) m.opacity = base * this.opacityScale;
    this.setAngle(this.angle);
  }

  get opacity(): number {
    return this.opacityScale;
  }

  /** Rewrite a preallocated strip in place; unused tail segments collapse onto the last point. */
  private writeStrip(line: Line2, points: number[]): void {
    const start = line.geometry.getAttribute("instanceStart") as unknown as { data: { array: Float32Array; needsUpdate: boolean } };
    const arr = start.data.array;
    const n = points.length / 3;
    const segments = arr.length / 6;
    for (let s = 0; s < segments; s++) {
      const a = Math.min(s, n - 1);
      const b = Math.min(s + 1, n - 1);
      arr.set([points[a * 3], points[a * 3 + 1], points[a * 3 + 2], points[b * 3], points[b * 3 + 1], points[b * 3 + 2]], s * 6);
    }
    start.data.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }

  private line(color: number, width: number, opacity: number, segments: true, dashed?: boolean): LineSegments2;
  private line(color: number, width: number, opacity: number, segments?: false, dashed?: boolean): Line2;
  private line(color: number, width: number, opacity: number, segments = false, dashed = false): Line2 | LineSegments2 {
    const material = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthTest: false, depthWrite: false, dashed, dashSize: 0.004, gapSize: 0.003, worldUnits: false });
    this.materials.push(material);
    const line = segments ? new LineSegments2(new LineSegmentsGeometry().setPositions([0, 0, 0, 0, 0, 0]), material) : new Line2(new LineGeometry().setPositions([0, 0, 0, 0, 0, 0]), material);
    line.renderOrder = 10;
    line.frustumCulled = false;
    this.group.add(line);
    return line;
  }

  private arcPoints(from: number, to: number, radius: number): number[] {
    const pivot = this.joint.pivotWorld();
    const steps = Math.max(1, Math.ceil(Math.abs(to - from) / ARC_SEGMENT_DEG));
    const pts: number[] = [];
    const d = new Vector3();
    for (let i = 0; i <= steps; i++) {
      this.joint.directionAtWorld(from + ((to - from) * i) / steps, d);
      pts.push(pivot.x + d.x * radius, pivot.y + d.y * radius, pivot.z + d.z * radius);
    }
    return pts;
  }

  private setLine(line: Line2, positions: number[]): void {
    line.geometry.dispose();
    const g = new LineGeometry();
    g.setPositions(positions);
    line.geometry = g;
    line.computeLineDistances();
  }

  private rebuildStatic(): void {
    const { axisLengthM, arcRadiusM, arcTickDeg, minDeg, maxDeg } = this.config;
    const pivot = this.joint.pivotWorld();
    const axis = this.joint.axisWorld();
    const a = pivot.clone().addScaledVector(axis, -axisLengthM / 2);
    const b = pivot.clone().addScaledVector(axis, axisLengthM / 2);
    this.setLine(this.axisLine, [a.x, a.y, a.z, b.x, b.y, b.z]);
    this.setLine(this.rangeArc, this.arcPoints(minDeg, maxDeg, arcRadiusM));
    const tickPts: number[] = [];
    const d = new Vector3();
    for (let deg = minDeg; deg <= maxDeg + 1e-6; deg += arcTickDeg) {
      this.joint.directionAtWorld(deg, d);
      const inner = pivot.clone().addScaledVector(d, arcRadiusM * 0.94);
      const outer = pivot.clone().addScaledVector(d, arcRadiusM * 1.06);
      tickPts.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
    }
    this.ticks.geometry.dispose();
    this.ticks.geometry = new LineSegmentsGeometry().setPositions(tickPts);
    const n = this.joint.directionAtWorld(minDeg);
    const e = pivot.clone().addScaledVector(n, arcRadiusM * 1.25);
    this.setLine(this.neutralRay, [pivot.x, pivot.y, pivot.z, e.x, e.y, e.z]);
    this.pivotDot.position.copy(pivot);
  }

  setAngle(angleDeg: number): void {
    this.angle = angleDeg;
    const { arcRadiusM, minDeg, maxDeg } = this.config;
    const pivot = this.joint.pivotWorld();
    const cur = this.joint.directionAtWorld(angleDeg);
    const end = pivot.clone().addScaledVector(cur, arcRadiusM);
    this.writeStrip(this.currentArc, angleDeg > minDeg + 0.05 ? this.arcPoints(minDeg, angleDeg, arcRadiusM) : [end.x, end.y, end.z, end.x, end.y, end.z]);
    const rayEnd = pivot.clone().addScaledVector(cur, arcRadiusM * 1.25);
    this.writeStrip(this.currentRay, [pivot.x, pivot.y, pivot.z, rayEnd.x, rayEnd.y, rayEnd.z]);
    // Arrow shows the direction of increasing flexion; at the limit it points back towards extension.
    const atMax = angleDeg >= maxDeg - 0.05;
    const travel = this.joint.travelAtWorld(angleDeg);
    if (atMax) travel.negate();
    this.arrow.position.copy(end).addScaledVector(travel, arcRadiusM * 0.065);
    this.arrow.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), travel));
    (this.arrow.material as MeshBasicMaterial).opacity = (atMax ? 0.45 : 0.95) * this.opacityScale;
  }

  get currentAngle(): number {
    return this.angle;
  }

  /** World point at the end of the current arc (for the angle badge). */
  arcEndWorld(target = new Vector3()): Vector3 {
    const pivot = this.joint.pivotWorld();
    return target.copy(pivot).addScaledVector(this.joint.directionAtWorld(this.angle), this.config.arcRadiusM * 1.32);
  }

  /** Current distal direction (world) as drawn. */
  currentDirectionWorld(target = new Vector3()): Vector3 {
    return this.joint.directionAtWorld(this.angle, target);
  }

  setResolution(width: number, height: number): void {
    for (const m of this.materials) m.resolution.set(width, height);
  }

  set visible(v: boolean) {
    this.group.visible = v;
  }

  get visible(): boolean {
    return this.group.visible;
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mesh = o as Mesh;
      mesh.geometry?.dispose();
    });
    for (const m of this.materials) m.dispose();
  }
}
