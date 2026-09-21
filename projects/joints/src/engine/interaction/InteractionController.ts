import type { Camera, Ray } from "three";
import type { InputSource } from "../joints/JointController";
import { HingeDragGesture, type HingeFrame } from "./hingeDragMath";
import type { PickHit } from "./Picker";

export interface PointerLike {
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
  pointerType?: string;
  timeStamp?: number;
}

/** What the interaction layer needs to move a joint: always through setDof. */
export interface DragTarget {
  jointId: string;
  dofId: string;
  frame(): HingeFrame;
  getDof(): number;
  setDof(value: number, source: InputSource): number;
}

export interface InteractionDeps {
  camera: () => Camera;
  rect: () => { left: number; top: number; width: number; height: number };
  /** Raycast at a client point (sets the picker ray) and return the first structure hit. */
  pick: (clientX: number, clientY: number) => PickHit | null;
  /** Ray for the most recent pick/setFromClient call. */
  rayAt: (clientX: number, clientY: number) => Ray;
  /** Joint DOF a structure drives when dragged, or null (structure is stationary -> orbit). */
  dragTargetFor: (structureId: string) => DragTarget | null;
  /** Camera orbit controls; disabled for the duration of a joint-drag gesture. */
  setOrbitEnabled: (enabled: boolean) => void;
  onSelect: (hit: PickHit | null) => void;
  onHover: (hit: PickHit | null, draggable: boolean) => void;
  onDragState: (dragging: boolean, target: DragTarget | null) => void;
  requestRender: () => void;
}

const CLICK_SLOP_PX = 4;
const DRAG_THRESHOLD_PX = 3;

type Gesture =
  | { kind: "joint"; pointerId: number; startX: number; startY: number; lastX: number; lastY: number; target: DragTarget; drag: HingeDragGesture; hit: PickHit; active: boolean }
  | { kind: "orbit"; pointerId: number; startX: number; startY: number; hit: PickHit | null; moved: boolean };

/**
 * Routes pointer gestures: grabbing a structure driven by a joint = joint motion (orbit disabled for that gesture);
 * anything else = camera orbit. A press-release without movement = pick/select. DOM-agnostic for testing.
 */
export class InteractionController {
  private gesture: Gesture | null = null;
  private hoverTimer = 0;

  constructor(private readonly deps: InteractionDeps) {}

  get dragging(): boolean {
    return this.gesture?.kind === "joint" && this.gesture.active;
  }

  pointerDown(e: PointerLike): void {
    if (this.gesture) {
      // Second pointer (pinch) cancels a joint drag; orbit controls own multi-touch.
      if (this.gesture.kind === "joint") this.endJointDrag();
      this.gesture = null;
      return;
    }
    if (e.button !== 0) return;
    const hit = this.deps.pick(e.clientX, e.clientY);
    const target = hit ? this.deps.dragTargetFor(hit.structureId) : null;
    if (hit && target) {
      this.deps.setOrbitEnabled(false);
      this.gesture = { kind: "joint", pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, target, drag: new HingeDragGesture(target.frame(), hit.point), hit, active: false };
    } else {
      this.gesture = { kind: "orbit", pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, hit, moved: false };
    }
  }

  pointerMove(e: PointerLike): void {
    const g = this.gesture;
    if (!g) {
      this.hover(e);
      return;
    }
    if (e.pointerId !== g.pointerId) return;
    if (g.kind === "orbit") {
      if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > CLICK_SLOP_PX) g.moved = true;
      return;
    }
    if (!g.active) {
      if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD_PX) return;
      g.active = true;
      this.deps.onDragState(true, g.target);
    }
    const ray = this.deps.rayAt(e.clientX, e.clientY);
    const rect = this.deps.rect();
    const delta = g.drag.step(ray, { x: e.clientX - g.lastX, y: e.clientY - g.lastY }, g.target.getDof(), this.deps.camera(), { width: rect.width, height: rect.height });
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    if (delta !== 0 && Number.isFinite(delta)) g.target.setDof(g.target.getDof() + delta, "drag");
  }

  pointerUp(e: PointerLike): void {
    const g = this.gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    this.gesture = null;
    if (g.kind === "joint") {
      const wasActive = g.active;
      this.endJointDrag(g);
      if (!wasActive) this.deps.onSelect(g.hit);
      return;
    }
    if (!g.moved) this.deps.onSelect(g.hit);
  }

  pointerCancel(e: PointerLike): void {
    const g = this.gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    this.gesture = null;
    if (g.kind === "joint") this.endJointDrag(g);
  }

  private endJointDrag(g: Gesture | null = this.gesture): void {
    this.deps.setOrbitEnabled(true);
    if (g?.kind === "joint" && g.active) this.deps.onDragState(false, g.target);
    this.deps.requestRender();
  }

  private hover(e: PointerLike): void {
    if (e.pointerType === "touch") return;
    const now = e.timeStamp ?? performance.now();
    if (now - this.hoverTimer < 60) return;
    this.hoverTimer = now;
    const hit = this.deps.pick(e.clientX, e.clientY);
    this.deps.onHover(hit, !!(hit && this.deps.dragTargetFor(hit.structureId)));
  }

  /** Attach DOM listeners. Capture phase on the container so joint drags are claimed before OrbitControls sees them. */
  attach(container: HTMLElement): () => void {
    const down = (e: PointerEvent) => {
      this.pointerDown(e);
      if (this.gesture?.kind === "joint") {
        e.stopPropagation();
        e.preventDefault();
        // Capture keeps the gesture alive when the pointer leaves the canvas. It throws when there is no active pointer with
        // that id (released between dispatch and handler, or a synthetic event); the drag still works without capture.
        try {
          (e.target as Element).setPointerCapture?.(e.pointerId);
        } catch {
          /* no active pointer: carry on without capture */
        }
      }
    };
    const move = (e: PointerEvent) => {
      const joint = this.gesture?.kind === "joint";
      this.pointerMove(e);
      if (joint) e.stopPropagation();
    };
    const up = (e: PointerEvent) => this.pointerUp(e);
    const cancel = (e: PointerEvent) => this.pointerCancel(e);
    const leave = () => this.deps.onHover(null, false);
    container.addEventListener("pointerdown", down, { capture: true });
    container.addEventListener("pointermove", move, { capture: true });
    window.addEventListener("pointerup", up, { capture: true });
    window.addEventListener("pointercancel", cancel, { capture: true });
    container.addEventListener("pointerleave", leave);
    return () => {
      container.removeEventListener("pointerdown", down, { capture: true });
      container.removeEventListener("pointermove", move, { capture: true });
      window.removeEventListener("pointerup", up, { capture: true });
      window.removeEventListener("pointercancel", cancel, { capture: true });
      container.removeEventListener("pointerleave", leave);
    };
  }
}
