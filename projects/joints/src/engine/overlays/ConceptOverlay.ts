import { ConeGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

export type ConceptKind = "fixed" | "rotation" | "multiAxis" | "hingeArc";

export interface ConceptSite {
  siteId: string;
  kind: ConceptKind;
  anchor: [number, number, number];
  radiusM: number;
  axis?: [number, number, number];
  sphere?: { center: [number, number, number]; radiusM: number };
}

export interface BodyFrameDirs {
  up: Vector3;
  right: Vector3;
  anterior: Vector3;
}

const COLORS = { motion: 0xe2a95c, axis: 0x7fb0e6, calm: 0xc9d2de };
const SEGMENTS = 64;
const SCRATCH = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);
const SCRATCH2 = new Vector3();
const SCRATCH3 = new Vector3();

/** A preallocated polyline whose points are rewritten in place (no geometry churn per frame). */
class Polyline {
  readonly line: Line2;
  readonly material: LineMaterial;
  private readonly capacity: number;

  constructor(color: number, width: number, opacity: number, capacity: number, dashed = false) {
    this.capacity = capacity;
    this.material = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthTest: false, depthWrite: false, dashed, dashSize: 0.006, gapSize: 0.005, worldUnits: false });
    this.line = new Line2(new LineGeometry().setPositions(new Array((capacity + 1) * 3).fill(0)), this.material);
    this.line.frustumCulled = false;
    this.line.renderOrder = 30;
    this.line.userData.baseOpacity = opacity;
  }

  /** Arc written straight into the instance buffer (no per-frame allocation). */
  setArc(c: Vector3, axis: Vector3, start: Vector3, r: number, fromDeg: number, toDeg: number): void {
    const attr = this.line.geometry.getAttribute("instanceStart") as unknown as { data: { array: Float32Array; needsUpdate: boolean } };
    const arr = attr.data.array;
    const n = Math.max(2, Math.min(this.capacity + 1, Math.ceil(Math.abs(toDeg - fromDeg) / 3) + 1));
    for (let s = 0; s < this.capacity; s++) {
      const ia = Math.min(s, n - 1);
      const ib = Math.min(s + 1, n - 1);
      for (let k = 0; k < 2; k++) {
        const i = k === 0 ? ia : ib;
        const off = s * 6 + k * 3;
        const ang = ((fromDeg + ((toDeg - fromDeg) * i) / (n - 1)) * Math.PI) / 180;
        SCRATCH.copy(start).applyAxisAngle(axis, ang).multiplyScalar(r).add(c);
        arr[off] = SCRATCH.x;
        arr[off + 1] = SCRATCH.y;
        arr[off + 2] = SCRATCH.z;
      }
    }
    attr.data.needsUpdate = true;
    if (!this.boundsSet) {
      this.line.geometry.boundingSphere = null;
      this.boundsSet = true;
    }
  }

  private boundsSet = false;

  set(points: Vector3[]): void {
    const attr = this.line.geometry.getAttribute("instanceStart") as unknown as { data: { array: Float32Array; needsUpdate: boolean } };
    const arr = attr.data.array;
    const n = Math.max(1, points.length);
    for (let s = 0; s < this.capacity; s++) {
      const a = points[Math.min(s, n - 1)] ?? points[0];
      const b = points[Math.min(s + 1, n - 1)] ?? a;
      arr[s * 6] = a.x; arr[s * 6 + 1] = a.y; arr[s * 6 + 2] = a.z;
      arr[s * 6 + 3] = b.x; arr[s * 6 + 4] = b.y; arr[s * 6 + 5] = b.z;
    }
    attr.data.needsUpdate = true;
    this.line.geometry.computeBoundingSphere();
    if (this.material.dashed) this.line.computeLineDistances();
  }
}

/** Arc of `from..to` degrees around `axis`, starting from `start` direction, radius r, centred at c. */
function arc(c: Vector3, axis: Vector3, start: Vector3, r: number, fromDeg: number, toDeg: number, steps = SEGMENTS): Vector3[] {
  const pts: Vector3[] = [];
  const n = Math.max(2, Math.min(steps, Math.ceil(Math.abs(toDeg - fromDeg) / 3) + 1));
  for (let i = 0; i < n; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / (n - 1)) * Math.PI) / 180;
    pts.push(start.clone().applyAxisAngle(axis, a).multiplyScalar(r).add(c));
  }
  return pts;
}

class Indicator {
  readonly group = new Group();
  readonly lines: Polyline[] = [];
  readonly cones: Mesh[] = [];
  private phaseFn: (p: number) => void = () => undefined;
  private opacity = 1;

  constructor(readonly site: ConceptSite, frame: BodyFrameDirs, coneGeometry: ConeGeometry, dotGeometry: SphereGeometry) {
    this.group.name = `concept:${site.siteId}`;
    this.group.userData = { role: "overlay", overlay: "concept", siteId: site.siteId, representation: "schematic" };
    const c = new Vector3(...site.anchor);
    const line = (color: number, width: number, opacity: number, capacity = SEGMENTS, dashed = false) => {
      const l = new Polyline(color, width, opacity, capacity, dashed);
      this.lines.push(l);
      this.group.add(l.line);
      return l;
    };
    const cone = (color: number, size: number) => {
      const m = new Mesh(coneGeometry, new MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
      m.scale.setScalar(size);
      m.renderOrder = 31;
      m.userData.baseOpacity = 0.95;
      this.cones.push(m);
      this.group.add(m);
      return m;
    };
    const orient = (m: Mesh, at: Vector3, dir: Vector3) => {
      m.position.copy(at);
      m.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize());
    };
    const dot = new Mesh(dotGeometry, new MeshBasicMaterial({ color: COLORS.calm, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }));
    dot.position.copy(c);
    dot.scale.setScalar(0.0019);
    dot.renderOrder = 31;
    dot.userData.baseOpacity = 0.9;
    this.cones.push(dot);
    this.group.add(dot);

    switch (site.kind) {
      case "fixed": {
        // Static, calm: a closed dashed ring in the sagittal plane - "no motion".
        const ring = line(COLORS.calm, 1.6, 0.8, SEGMENTS, true);
        ring.set(arc(c, frame.right, frame.up, Math.max(0.02, site.radiusM * 0.55), 0, 360));
        break;
      }
      case "rotation": {
        const axis = new Vector3(...(site.axis ?? [0, 1, 0])).normalize();
        const axisLine = line(COLORS.axis, 2.2, 0.9, 1);
        axisLine.set([c.clone().addScaledVector(axis, -0.06), c.clone().addScaledVector(axis, 0.075)]);
        const r = 0.05;
        const base = line(COLORS.calm, 1.2, 0.35, SEGMENTS);
        const ringC = c.clone().addScaledVector(axis, 0.035);
        base.set(arc(ringC, axis, frame.anterior, r, 0, 360));
        const sweep = line(COLORS.motion, 3, 0.95, SEGMENTS);
        const head = cone(COLORS.motion, 1);
        this.phaseFn = (p) => {
          const swing = Math.sin(p * Math.PI * 2) * 40;
          const from = -50 + swing;
          const to = 50 + swing;
          sweep.setArc(ringC, axis, frame.anterior, r, from, to);
          const end = SCRATCH2.copy(frame.anterior).applyAxisAngle(axis, (to * Math.PI) / 180);
          const tangent = SCRATCH3.copy(axis).cross(end).multiplyScalar(Math.cos(p * Math.PI * 2) >= 0 ? 1 : -1);
          orient(head, end.multiplyScalar(r).add(ringC), tangent);
        };
        break;
      }
      case "multiAxis": {
        // Two short arcs crossing on the lateral surface of the ball: one in the coronal plane, one in the transverse plane.
        const sc = site.sphere ? new Vector3(...site.sphere.center) : c;
        const r = (site.sphere?.radiusM ?? 0.02) * 1.9;
        const g1 = line(COLORS.calm, 1.1, 0.28, SEGMENTS);
        const g2 = line(COLORS.calm, 1.1, 0.28, SEGMENTS);
        g1.set(arc(sc, frame.anterior, frame.right, r, 0, 360));
        g2.set(arc(sc, frame.up, frame.right, r, 0, 360));
        const s1 = line(COLORS.motion, 2.8, 0.95, SEGMENTS);
        const s2 = line(COLORS.motion, 2.8, 0.95, SEGMENTS);
        const h1 = cone(COLORS.motion, 0.85);
        const h2 = cone(COLORS.motion, 0.85);
        const lateral = frame.right;
        this.phaseFn = (p) => {
          const a = Math.sin(p * Math.PI * 2) * 28;
          const b = Math.cos(p * Math.PI * 2) * 28;
          s1.setArc(sc, frame.anterior, lateral, r, -34 + a, 34 + a);
          s2.setArc(sc, frame.up, lateral, r, -34 + b, 34 + b);
          const e1 = SCRATCH2.copy(lateral).applyAxisAngle(frame.anterior, ((34 + a) * Math.PI) / 180);
          orient(h1, SCRATCH.copy(e1).multiplyScalar(r).add(sc), SCRATCH3.copy(frame.anterior).cross(e1));
          const e2 = SCRATCH2.copy(lateral).applyAxisAngle(frame.up, ((34 + b) * Math.PI) / 180);
          orient(h2, SCRATCH.copy(e2).multiplyScalar(r).add(sc), SCRATCH3.copy(frame.up).cross(e2));
        };
        break;
      }
      case "hingeArc": {
        const axis = new Vector3(...(site.axis ?? frame.right.toArray())).normalize();
        const axisLine = line(COLORS.axis, 2.2, 0.9, 1);
        axisLine.set([c.clone().addScaledVector(axis, -0.055), c.clone().addScaledVector(axis, 0.055)]);
        const r = 0.075;
        const down = frame.up.clone().negate();
        const sweep = line(COLORS.motion, 3, 0.95, SEGMENTS);
        const head = cone(COLORS.motion, 1);
        // Increasing angle turns the distal direction towards -anterior or +anterior depending on axis sign; the
        // indicator only shows "one plane, one axis", not a joint range.
        this.phaseFn = (p) => {
          const to = 5 + 55 * (0.5 - 0.5 * Math.cos(p * Math.PI * 2));
          sweep.setArc(c, axis, down, r, 0, to);
          const end = SCRATCH2.copy(down).applyAxisAngle(axis, (to * Math.PI) / 180);
          orient(head, SCRATCH.copy(end).multiplyScalar(r).add(c), SCRATCH3.copy(axis).cross(end));
        };
        break;
      }
    }
    this.setPhase(0.125);
  }

  setPhase(p: number): void {
    this.phaseFn(((p % 1) + 1) % 1);
  }

  setOpacity(o: number): void {
    this.opacity = o;
    for (const l of this.lines) l.material.opacity = (l.line.userData.baseOpacity as number) * o;
    for (const m of this.cones) (m.material as MeshBasicMaterial).opacity = (m.userData.baseOpacity as number) * o;
    this.group.visible = o > 0.001;
  }

  get currentOpacity(): number {
    return this.opacity;
  }

  setResolution(w: number, h: number): void {
    for (const l of this.lines) l.material.resolution.set(w, h);
  }

  dispose(): void {
    for (const l of this.lines) {
      l.line.geometry.dispose();
      l.material.dispose();
    }
    for (const m of this.cones) (m.material as MeshBasicMaterial).dispose();
  }
}

/**
 * Schematic concept indicators placed at body joint sites: fixed (no motion), rotation (pivot), multi-direction (ball and
 * socket) and single-plane arc (hinge). Indicators are built once per site (pool) and animated by phase in place.
 * They illustrate the kind of movement only; they are not fitted anatomical axes or ranges.
 */
export class ConceptOverlay {
  readonly group = new Group();
  private readonly indicators = new Map<string, Indicator>();
  private readonly cone = new ConeGeometry(0.0032, 0.0095, 16);
  private readonly dot = new SphereGeometry(1, 12, 8);
  private size = { w: 1, h: 1 };

  constructor(private readonly frame: BodyFrameDirs) {
    this.group.name = "overlay:concepts";
  }

  ensure(site: ConceptSite): Indicator {
    let ind = this.indicators.get(site.siteId);
    if (!ind) {
      ind = new Indicator(site, this.frame, this.cone, this.dot);
      ind.setResolution(this.size.w, this.size.h);
      ind.setOpacity(0);
      this.indicators.set(site.siteId, ind);
      this.group.add(ind.group);
    }
    return ind;
  }

  /** Show exactly these sites (others hidden) with an opacity multiplier. */
  show(siteIds: readonly string[], opacity = 1): void {
    const wanted = new Set(siteIds);
    for (const [id, ind] of this.indicators) ind.setOpacity(wanted.has(id) ? opacity : 0);
  }

  private readonly phases = new Map<string, number>();

  setPhase(siteId: string, phase: number): void {
    this.phases.set(siteId, phase);
    this.indicators.get(siteId)?.setPhase(phase);
  }

  /** Last phase written for a site (QA: static under reduced motion). */
  phaseOf(siteId: string): number | null {
    return this.phases.get(siteId) ?? null;
  }

  visibleSites(): string[] {
    return [...this.indicators.entries()].filter(([, i]) => i.group.visible).map(([id]) => id);
  }

  get poolSize(): number {
    return this.indicators.size;
  }

  setResolution(w: number, h: number): void {
    this.size = { w, h };
    for (const i of this.indicators.values()) i.setResolution(w, h);
  }

  dispose(): void {
    for (const i of this.indicators.values()) i.dispose();
    this.cone.dispose();
    this.dot.dispose();
  }
}
