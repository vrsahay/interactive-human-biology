import { Matrix3, Raycaster, Vector3, type Camera, type Mesh, type Object3D } from "three";
import type { AnchorSpec, Vec3 } from "../assets/manifestTypes";
import { layoutLabels, type LabelBox } from "./labelLayout";

export type LabelKind = "anchor" | "band" | "badge" | "selection";

export interface LabelItem {
  id: string;
  kind: LabelKind;
  title: string;
  subtitle?: string;
  category: string;
  priority: number;
  /** World position of the anchored point. */
  world(target: Vector3): Vector3;
  /** Preferred label direction in world space (null = away from screen centre). */
  direction(target: Vector3): Vector3 | null;
  visible(): boolean;
  /** Badges have no leader line and sit exactly on the point. */
  leader: boolean;
  anchorId?: string;
  structureId?: string;
  /** Lesson emphasis: focused labels win collisions and are never decluttered; dimmed labels recede. */
  emphasis?: () => "focus" | "dim" | null;
}

export interface LabelFrameOptions {
  /** Skip occlusion raycasts (camera/pose moving): keep the last occlusion state. */
  deferOcclusion: boolean;
}

interface LabelDom {
  el: HTMLDivElement;
  titleEl: HTMLSpanElement;
  line: SVGLineElement;
  dot: SVGCircleElement;
  w: number;
  h: number;
  occluded: boolean;
  shown: boolean;
  /** Stable per-label number for the layout signature. */
  index: number;
  measuredLength: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const EMPTY: Mesh[] = [];

/** DOM writes only when the value changes (unchanged writes still invalidate style on some engines). */
function setStyle(el: HTMLElement | SVGElement, prop: "display" | "transform", value: string): void {
  if (el.style[prop] !== value) el.style[prop] = value;
}
function setAttr(el: Element, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

interface FrameBox extends LabelBox {
  item: LabelItem;
  emphasis: "focus" | "dim" | null;
  selected: boolean;
  dom: LabelDom;
}
/** Blender Z-up local -> glTF Y-up local: (x, y, z) -> (x, z, -y). */
export const blenderToGltfDirection = (v: Vec3): Vector3 => new Vector3(v[0], v[2], -v[1]);

/** Label direction for an exported anchor: manifest Blender-local direction -> glTF local -> world through the anchor parent. */
const DIR_MATRIX = new Matrix3();
export function anchorLabelDirectionWorld(spec: AnchorSpec, anchorNode: Object3D, target = new Vector3(), matricesCurrent = false): Vector3 {
  const parent = anchorNode.parent ?? anchorNode;
  // During label layout the frame was just rendered, so matrixWorld is current: no parent-chain walk per label.
  if (!matricesCurrent) parent.updateWorldMatrix(true, false);
  const d = spec.labelDirectionLocalBlender;
  // Blender Z-up local -> glTF Y-up local, without allocating per frame
  return target.set(d[0], d[2], -d[1]).applyMatrix3(DIR_MATRIX.setFromMatrix4(parent.matrixWorld)).normalize();
}

/**
 * DOM labels that follow 3D anchors: projection, leader lines, vertical de-overlap, off-screen culling and
 * occlusion dimming (raycast against visible anatomy when the view is at rest).
 */
export class LabelSystem {
  readonly root: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly items = new Map<string, LabelItem>();
  private readonly dom = new Map<string, LabelDom>();
  private readonly raycaster = new Raycaster();
  private readonly v = new Vector3();
  private readonly d = new Vector3();
  private readonly ndc = new Vector3();
  private readonly tip = new Vector3();
  private readonly camPos = new Vector3();
  private readonly dir = new Vector3();
  private readonly boxes: FrameBox[] = [];
  private lastWidth = -1;
  private lastHeight = -1;
  private lastKey = NaN;
  /** Instrumentation: frames that re-ran the layout vs frames that reused it. */
  private nextIndex = 0;
  layouts = 0;
  skippedLayouts = 0;
  enabled = true;
  leaderPx = 58;
  /** A label below this priority is suppressed when its anchor is closer than this (px) to a kept label anchor. */
  declutterPx = 34;
  declutterBelowPriority = 2;
  /** Screen bands reserved for DOM chrome (e.g. hint pill) that labels must not cover (px). */
  insets = { top: 0, bottom: 56 };
  /** Screen rectangle a panel occupies; labels are kept clear of it (Step 16D). */
  reserved: { left: number; top: number; right: number; bottom: number } | null = null;
  selectedStructureId: string | null = null;
  lastLayout: { id: string; left: number; top: number; w: number; h: number; ax: number; ay: number; occluded: boolean; emphasis: "focus" | "dim" | null }[] = [];

  constructor(container: HTMLElement, private readonly occluders: () => Mesh[]) {
    this.root = document.createElement("div");
    this.root.className = "label-layer";
    this.root.setAttribute("aria-hidden", "true");
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.classList.add("label-leaders");
    this.root.appendChild(this.svg);
    container.appendChild(this.root);
  }

  set(item: LabelItem): void {
    this.remove(item.id);
    this.items.set(item.id, item);
    const el = document.createElement("div");
    el.className = `label label--${item.kind} label--${item.category}`;
    el.dataset.labelId = item.id;
    if (item.anchorId) el.dataset.anchorId = item.anchorId;
    if (item.structureId) el.dataset.structureId = item.structureId;
    const titleEl = document.createElement("span");
    titleEl.className = "label__title";
    titleEl.textContent = item.title;
    el.appendChild(titleEl);
    if (item.subtitle) {
      const sub = document.createElement("span");
      sub.className = "label__subtitle";
      sub.textContent = item.subtitle;
      el.appendChild(sub);
    }
    this.root.appendChild(el);
    const line = document.createElementNS(SVG_NS, "line");
    line.classList.add("label-leader", `label-leader--${item.kind}`);
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.classList.add("label-dot", `label-dot--${item.kind}`);
    dot.setAttribute("r", item.kind === "badge" ? "0" : "2.6");
    this.svg.append(line, dot);
    this.dom.set(item.id, { el, titleEl, line, dot, w: 0, h: 0, occluded: false, shown: false, index: ++this.nextIndex, measuredLength: item.title.length });
    this.lastKey = NaN;
  }

  updateTitle(id: string, title: string): void {
    const dom = this.dom.get(id);
    const item = this.items.get(id);
    if (!dom || !item || item.title === title) return;
    item.title = title;
    dom.titleEl.textContent = title;
    // Badges have a fixed minimum width in CSS: re-measure only when the text gets longer than any value measured so far.
    if (item.kind !== "badge" || title.length > dom.measuredLength) {
      dom.w = 0;
      dom.measuredLength = title.length;
    }
    this.lastKey = NaN;
  }

  remove(id: string): void {
    const dom = this.dom.get(id);
    if (dom) {
      dom.el.remove();
      dom.line.remove();
      dom.dot.remove();
    }
    this.dom.delete(id);
    this.items.delete(id);
    this.lastKey = NaN;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  ids(): string[] {
    return [...this.items.keys()];
  }

  update(camera: Camera, width: number, height: number, options: LabelFrameOptions): void {
    if (width !== this.lastWidth || height !== this.lastHeight) {
      this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      this.svg.setAttribute("width", String(width));
      this.svg.setAttribute("height", String(height));
      this.lastWidth = width;
      this.lastHeight = height;
      this.lastKey = NaN;
    }
    const boxes = this.boxes;
    boxes.length = 0;
    const camPos = this.camPos.setFromMatrixPosition(camera.matrixWorld);
    const occluders = options.deferOcclusion ? EMPTY : this.occluders();
    // Screen-space signature of everything the layout depends on: when it matches the previous frame (camera, poses and
    // label state unchanged on screen) the declutter/layout pass and all DOM writes are skipped.
    let key = (width * 31 + height) | 0;
    key = (key * 31 + this.insets.top) | 0;
    key = (key * 31 + this.insets.bottom) | 0;
    if (this.reserved) for (const v of [this.reserved.left, this.reserved.top, this.reserved.right, this.reserved.bottom]) key = (key * 31 + Math.round(v)) | 0;
    for (const [id, item] of this.items) {
      const dom = this.dom.get(id)!;
      const want = this.enabled && item.visible();
      if (!want) {
        this.hide(dom);
        continue;
      }
      const anchorWorld = item.world(this.v);
      const ndc = this.ndc.copy(anchorWorld).project(camera);
      const behind = ndc.z > 1 || ndc.z < -1;
      const ax = (ndc.x * 0.5 + 0.5) * width;
      const ay = (-ndc.y * 0.5 + 0.5) * height;
      if (behind || ax < -20 || ax > width + 20 || ay < -20 || ay > height + 20) {
        this.hide(dom);
        continue;
      }
      if (!options.deferOcclusion) dom.occluded = item.kind !== "badge" && this.isOccluded(camPos, anchorWorld, occluders);
      if (dom.w === 0) {
        dom.el.style.display = "";
        dom.w = dom.el.offsetWidth || item.title.length * 7.5 + 16;
        dom.h = dom.el.offsetHeight || 24;
      }
      let sx = ax - width / 2;
      let sy = ay - height / 2;
      const dirWorld = item.direction(this.d);
      if (dirWorld) {
        const tip = this.tip.copy(anchorWorld).addScaledVector(dirWorld, 0.03).project(camera);
        const tx = (tip.x * 0.5 + 0.5) * width - ax;
        const ty = (-tip.y * 0.5 + 0.5) * height - ay;
        if (Math.hypot(tx, ty) > 6) {
          sx = tx;
          sy = ty;
        }
      }
      const len = Math.hypot(sx, sy) || 1;
      const lead = item.leader ? this.leaderPx : 0;
      const x = ax + (sx / len) * lead;
      const y = ay + (sy / len) * lead * 0.8;
      const align: "start" | "end" = !item.leader ? "start" : sx >= 0 ? "start" : "end";
      const emphasis = item.emphasis?.() ?? null;
      const selected = !!item.structureId && item.structureId === this.selectedStructureId;
      const priority = item.priority + (selected ? 100 : 0) + (emphasis === "focus" ? 50 : emphasis === "dim" ? -1 : 0);
      boxes.push({ id, ax, ay, x: item.leader ? x : x - dom.w / 2, y, w: dom.w, h: dom.h, align, priority, item, emphasis, selected, dom });
      key = (key * 31 + dom.index * 7919 + Math.round(ax * 2)) | 0;
      key = (key * 31 + Math.round(ay * 2)) | 0;
      key = (key * 31 + Math.round(x * 2) + Math.round(y * 2) * 7) | 0;
      key = (key * 31 + dom.w + (dom.occluded ? 1 : 0) * 1_000_003 + (emphasis === "focus" ? 2 : emphasis === "dim" ? 3 : 0) + (selected ? 5 : 0)) | 0;
    }
    key = (key * 31 + boxes.length) | 0;
    if (key === this.lastKey) {
      this.skippedLayouts++;
      return;
    }
    this.lastKey = key;
    this.layouts++;
    // Declutter: keep higher-priority labels; drop crowded low-priority ones (they return when the camera moves closer).
    const kept: typeof boxes = [];
    for (const b of [...boxes].sort((p, q) => q.priority - p.priority || p.id.localeCompare(q.id))) {
      const crowded = b.item.leader && b.priority < this.declutterBelowPriority && b.emphasis !== "focus" && kept.some((k) => k.item.leader && Math.hypot(k.ax - b.ax, k.ay - b.ay) < this.declutterPx);
      if (crowded) this.hide(b.dom);
      else kept.push(b);
    }
    const placed = layoutLabels(kept, { width, height, insetTop: this.insets.top, insetBottom: this.insets.bottom, reserved: this.reserved ?? undefined });
    this.lastLayout = [];
    const byId = new Map(kept.map((b) => [b.id, b]));
    for (const p of placed) {
      const b = byId.get(p.id)!;
      const { dom, item } = b;
      dom.shown = true;
      setStyle(dom.el, "display", "");
      setStyle(dom.el, "transform", `translate(${Math.round(p.left)}px, ${Math.round(p.top)}px)`);
      dom.el.classList.toggle("is-focus", b.emphasis === "focus");
      dom.el.classList.toggle("is-dim", b.emphasis === "dim");
      dom.el.classList.toggle("is-occluded", dom.occluded);
      dom.el.classList.toggle("is-selected", b.selected);
      const endX = p.align === "start" ? p.left : p.left + p.w;
      setAttr(dom.line, "x1", p.ax.toFixed(1));
      setAttr(dom.line, "y1", p.ay.toFixed(1));
      setAttr(dom.line, "x2", endX.toFixed(1));
      setAttr(dom.line, "y2", p.y.toFixed(1));
      setStyle(dom.line, "display", item.leader ? "" : "none");
      dom.line.classList.toggle("is-occluded", dom.occluded);
      setAttr(dom.dot, "cx", p.ax.toFixed(1));
      setAttr(dom.dot, "cy", p.ay.toFixed(1));
      setStyle(dom.dot, "display", item.leader ? "" : "none");
      dom.dot.classList.toggle("is-occluded", dom.occluded);
      this.lastLayout.push({ id: p.id, left: p.left, top: p.top, w: p.w, h: p.h, ax: p.ax, ay: p.ay, occluded: dom.occluded, emphasis: b.emphasis });
    }
  }

  /** Force the next update() to lay out and write the DOM (e.g. after CSS changes the label size). */
  invalidate(): void {
    this.lastKey = NaN;
  }

  private hide(dom: LabelDom): void {
    if (!dom.shown && dom.el.style.display === "none") return;
    dom.shown = false;
    dom.el.style.display = "none";
    dom.line.style.display = "none";
    dom.dot.style.display = "none";
  }

  private isOccluded(camPos: Vector3, point: Vector3, occluders: Mesh[]): boolean {
    if (!occluders.length) return false;
    const dir = this.dir.copy(point).sub(camPos);
    const dist = dir.length();
    this.raycaster.set(camPos, dir.divideScalar(dist));
    this.raycaster.far = dist - 0.004;
    this.raycaster.near = 0;
    const hits = this.raycaster.intersectObjects(occluders, false);
    return hits.length > 0;
  }

  dispose(): void {
    this.root.remove();
  }
}
