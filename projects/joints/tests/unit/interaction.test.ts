import { beforeAll, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { StructureRegistry } from "../../src/engine/anatomy/StructureRegistry";
import { HingeJoint } from "../../src/engine/joints/HingeJoint";
import { InteractionController, type DragTarget } from "../../src/engine/interaction/InteractionController";
import { angleInHingePlane, intersectHingePlane, screenDeltaToDegrees, unwrapDelta } from "../../src/engine/interaction/hingeDragMath";
import type { PickHit } from "../../src/engine/interaction/Picker";
import { loadTierScene, productionManifest } from "../helpers/production";

const W = 800;
const H = 600;
let joint: HingeJoint;
let registry: StructureRegistry;
let camera: PerspectiveCamera;

beforeAll(async () => {
  const manifest = productionManifest();
  const core = await loadTierScene(manifest, "core");
  registry = new StructureRegistry(manifest);
  registry.registerTier("core", core);
  joint = new HingeJoint(manifest, (n) => registry.node(n));
  camera = new PerspectiveCamera(32, W / H, 0.01, 10);
});

const toScreen = (p: Vector3) => {
  const n = p.clone().project(camera);
  return { x: (n.x * 0.5 + 0.5) * W, y: (-n.y * 0.5 + 0.5) * H };
};

function aim(viewDir: Vector3) {
  const pivot = joint.pivotWorld();
  camera.position.copy(pivot).addScaledVector(viewDir.normalize(), 0.6);
  camera.up.set(0, 1, 0);
  camera.lookAt(pivot);
  camera.updateMatrixWorld(true);
}

function makeController(target: DragTarget, hitPoint: () => Vector3) {
  const raycaster = new Raycaster();
  const orbit = vi.fn();
  const select = vi.fn();
  const dragState = vi.fn();
  const ctl = new InteractionController({
    camera: () => camera,
    rect: () => ({ left: 0, top: 0, width: W, height: H }),
    pick: () => ({ structureId: "ulna_r", mesh: registry.require("ulna_r").meshes[0], point: hitPoint(), localPoint: new Vector3(), distance: 0.5 }) as PickHit,
    rayAt: (x, y) => {
      raycaster.setFromCamera(new Vector2((x / W) * 2 - 1, -(y / H) * 2 + 1), camera);
      return raycaster.ray;
    },
    dragTargetFor: (id) => (id === "ulna_r" ? target : null),
    setOrbitEnabled: orbit,
    onSelect: select,
    onHover: () => undefined,
    onDragState: dragState,
    requestRender: () => undefined,
  });
  return { ctl, orbit, select, dragState };
}

const hingeTarget = (spy: (v: number, s: string) => void): DragTarget => ({
  jointId: joint.jointId,
  dofId: joint.dofId,
  frame: () => ({ pivot: joint.pivotWorld(), axis: joint.axisWorld(), neutralDir: joint.directionAtWorld(0) }),
  getDof: () => joint.getDof("flexion"),
  setDof: (v, s) => {
    spy(v, s);
    return joint.setDof("flexion", v, s);
  },
});

describe("hinge drag math", () => {
  it("measures signed angles in the hinge plane about the manifest axis", () => {
    const pivot = joint.pivotWorld();
    const axis = joint.axisWorld();
    const n = joint.directionAtWorld(0);
    for (const deg of [0, 30, 90, 145, -20]) {
      const p = pivot.clone().addScaledVector(joint.directionAtWorld(deg), 0.1).addScaledVector(axis, 0.03); // off-plane component ignored
      expect(angleInHingePlane(p, pivot, axis, n)).toBeCloseTo(deg, 6);
    }
    expect(unwrapDelta(170, -170)).toBeCloseTo(20);
    expect(unwrapDelta(-170, 170)).toBeCloseTo(-20);
  });

  it("returns null for rays parallel to the hinge plane", () => {
    const ray = new Raycaster(new Vector3(0, 0, 0), joint.axisWorld().clone().cross(new Vector3(0, 1, 0)).normalize()).ray;
    expect(intersectHingePlane(ray, joint.pivotWorld(), joint.axisWorld())).toBeNull();
  });
});

describe("13. drag -> setDof", () => {
  it("dragging the forearm across the flexion plane sets the DOF through setDof (orbit disabled for the gesture)", () => {
    joint.setDof("flexion", 0);
    aim(joint.axisWorld().clone().add(joint.travelAtWorld(0).multiplyScalar(0.3)));
    const pivot = joint.pivotWorld();
    const radius = 0.12;
    const at = (deg: number) => pivot.clone().addScaledVector(joint.directionAtWorld(deg), radius);
    const calls: [number, string][] = [];
    const { ctl, orbit, select, dragState } = makeController(hingeTarget((v, s) => calls.push([v, s])), () => at(0));
    const start = toScreen(at(0));
    ctl.pointerDown({ pointerId: 1, clientX: start.x, clientY: start.y, button: 0 });
    expect(orbit).toHaveBeenLastCalledWith(false);
    for (let deg = 5; deg <= 60; deg += 5) {
      const s = toScreen(at(deg));
      ctl.pointerMove({ pointerId: 1, clientX: s.x, clientY: s.y, button: 0 });
    }
    expect(dragState).toHaveBeenCalledWith(true, expect.anything());
    expect(joint.getDof("flexion")).toBeCloseTo(60, 0);
    expect(calls.length).toBeGreaterThan(5);
    expect(calls.every(([, s]) => s === "drag")).toBe(true);
    // keep dragging past the limit: clamps at 145 and never translates the pivot
    for (let deg = 65; deg <= 200; deg += 5) {
      const s = toScreen(at(deg));
      ctl.pointerMove({ pointerId: 1, clientX: s.x, clientY: s.y, button: 0 });
    }
    expect(joint.getDof("flexion")).toBe(145);
    expect(joint.pivotWorld().distanceTo(pivot)).toBe(0);
    ctl.pointerUp({ pointerId: 1, clientX: 0, clientY: 0, button: 0 });
    expect(orbit).toHaveBeenLastCalledWith(true);
    expect(dragState).toHaveBeenLastCalledWith(false, expect.anything());
    expect(select).not.toHaveBeenCalled();
    joint.setDof("flexion", 0);
  });

  it("edge-on view uses the projected-tangent fallback and still only changes the DOF", () => {
    joint.setDof("flexion", 30);
    aim(joint.directionAtWorld(30).clone().cross(joint.axisWorld()).normalize().negate()); // camera in the flexion plane
    const frame = { pivot: joint.pivotWorld(), axis: joint.axisWorld(), neutralDir: joint.directionAtWorld(0) };
    const p0 = toScreen(frame.pivot.clone().addScaledVector(joint.directionAtWorld(30), 0.12));
    const p1 = toScreen(frame.pivot.clone().addScaledVector(joint.directionAtWorld(31), 0.12));
    const deg = screenDeltaToDegrees({ x: (p1.x - p0.x) * 10, y: (p1.y - p0.y) * 10 }, frame, 30, 0.12, camera, { width: W, height: H });
    expect(deg).toBeGreaterThan(5);
    joint.setDof("flexion", 0);
  });

  it("a press-release without movement selects instead of moving", () => {
    joint.setDof("flexion", 20);
    const spy = vi.fn();
    const { ctl, select } = makeController(hingeTarget(spy), () => joint.pivotWorld());
    ctl.pointerDown({ pointerId: 3, clientX: 100, clientY: 100, button: 0 });
    ctl.pointerMove({ pointerId: 3, clientX: 101, clientY: 100, button: 0 });
    ctl.pointerUp({ pointerId: 3, clientX: 101, clientY: 100, button: 0 });
    expect(spy).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ structureId: "ulna_r" }));
    expect(joint.getDof("flexion")).toBe(20);
    joint.setDof("flexion", 0);
  });
});
