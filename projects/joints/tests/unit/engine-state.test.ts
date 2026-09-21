import { beforeAll, describe, expect, it } from "vitest";
import { Group, Vector3 } from "three";
import { StructureRegistry } from "../../src/engine/anatomy/StructureRegistry";
import { StructureStateController } from "../../src/engine/anatomy/StructureStateController";
import { VisibilityPolicy } from "../../src/engine/anatomy/VisibilityPolicy";
import { admitInput, checkInteractionPolicy } from "../../src/engine/interaction/interactionPolicy";
import { HingeJoint } from "../../src/engine/joints/HingeJoint";
import { Highlighter } from "../../src/engine/rendering/Highlighter";
import { evaluatePoseTarget, PoseHoldTracker } from "../../src/engine/video/checks";
import { loadTierScene, productionManifest } from "../helpers/production";

const pose = { id: "p", dof: "flexion", target: 90, tolerance: 5, holdMs: 600 };

describe("pose checks", () => {
  it("pose target uses the content tolerance against runtime controller state (inclusive)", () => {
    for (const [value, correct] of [[90, true], [85, true], [95, true], [84.99, false], [95.01, false], [0, false], [145, false]] as const) {
      expect(evaluatePoseTarget(pose, { flexion: value }).correct).toBe(correct);
    }
    expect(evaluatePoseTarget({ ...pose, tolerance: 12 }, { flexion: 80 }).correct).toBe(true);
    expect(() => evaluatePoseTarget(pose, {})).toThrow(/no value for dof flexion/);
  });

  it("hold tracker requires the pose to stay inside the tolerance for holdMs", () => {
    const t = new PoseHoldTracker(pose);
    expect(t.update(91, 0)).toBe(false);
    expect(t.update(92, 400)).toBe(false);
    expect(t.update(80, 500)).toBe(false); // left the window -> restart
    expect(t.update(89, 600)).toBe(false);
    expect(t.update(89, 1200)).toBe(true);
  });
});

describe("interaction policy (passive / guided / free)", () => {
  it("passive refuses learner input; lesson/animation inputs always pass", () => {
    const passive = { mode: "passive" as const, picking: true, dofRange: {} };
    expect(admitInput(passive, "flexion", 50, "drag")).toEqual({ admitted: false, reason: "passive" });
    expect(admitInput(passive, "flexion", 50, "slider").admitted).toBe(false);
    expect(admitInput(passive, "flexion", 50, "lesson")).toEqual({ admitted: true, value: 50, learner: false });
    expect(admitInput(passive, "flexion", 50, "animation").admitted).toBe(true);
  });

  it("guided clamps to the lesson sub-range; free allows the controller range", () => {
    const guided = { mode: "guided" as const, picking: false, dofRange: { flexion: [20, 100] as [number, number] } };
    expect(admitInput(guided, "flexion", 130, "keyboard")).toEqual({ admitted: true, value: 100, learner: true });
    expect(admitInput(guided, "flexion", 5, "drag")).toEqual({ admitted: true, value: 20, learner: true });
    expect(admitInput({ mode: "free", picking: true, dofRange: {} }, "flexion", 130, "preset")).toEqual({ admitted: true, value: 130, learner: true });
    const limits = () => ({ min: 0, max: 145 });
    expect(checkInteractionPolicy(guided, limits)).toEqual([]);
    expect(checkInteractionPolicy({ ...guided, dofRange: { flexion: [0, 200] } }, limits)[0]).toMatch(/outside controller limits/);
  });
});

describe("StructureStateController with the production core + detail tiers", () => {
  const manifest = productionManifest();
  let registry: StructureRegistry;
  let states: StructureStateController;
  let joint: HingeJoint;
  let changes = 0;

  beforeAll(async () => {
    registry = new StructureRegistry(manifest);
    const core = await loadTierScene(manifest, "core");
    registry.registerTier("core", core);
    joint = new HingeJoint(manifest, (n) => registry.node(n));
    registry.registerTier("detail", await loadTierScene(manifest, "detail"));
    new Group().add(core);
    states = new StructureStateController(registry, () => changes++);
  });

  it("highlight / isolate / fade compose with precedence selected > reveal > highlight > hover > faded", () => {
    states.reset();
    states.isolate(["humerus_r", "radius_r", "ulna_r"]);
    expect(states.materialState("capitate_r", { selected: false, hovered: false })).toBe("faded");
    expect(states.materialState("humerus_r", { selected: false, hovered: false })).toBe("none");
    states.highlightOnly(["radius_r"]);
    expect(states.materialState("radius_r", { selected: false, hovered: true })).toBe("highlight");
    expect(states.materialState("capitate_r", { selected: false, hovered: true })).toBe("hover");
    expect(states.materialState("capitate_r", { selected: true, hovered: false })).toBe("selected");
    states.highlightOnly(["ulna_r"]);
    expect(states.get("radius_r").highlighted).toBe(false);
    states.set(["ulna_r"], { revealing: true });
    expect(states.materialState("ulna_r", { selected: false, hovered: false })).toBe("reveal");
    expect(() => states.set(["femur_r"], { faded: true })).toThrow(/not a loaded structure/);
    expect(changes).toBeGreaterThan(0);
  });

  it("separation is a display offset that restores the exact transforms and never changes the joint pose", () => {
    states.reset();
    const ids = ["radius_r", "ulna_r", ...manifest.data.registry.groups.hand];
    const before = ids.map((id) => registry.require(id).node.matrixWorld.clone());
    const flex = joint.getDof("flexion");
    const dir = joint.directionAtWorld(flex);
    states.setSeparation(ids, dir, 0.009);
    const moved = registry.require("radius_r").node.matrixWorld.elements[13] - before[0].elements[13];
    expect(Math.abs(moved)).toBeGreaterThan(0.005);
    const p = new Vector3().setFromMatrixPosition(registry.require("ulna_r").node.matrixWorld).sub(new Vector3().setFromMatrixPosition(before[1]));
    expect(p.length()).toBeCloseTo(0.009, 6);
    expect(p.clone().normalize().dot(dir)).toBeCloseTo(1, 6);
    expect(states.separationDistance("radius_r")).toBeCloseTo(0.009, 6);
    states.reassembleAll();
    ids.forEach((id, i) => expect(registry.require(id).node.matrixWorld.equals(before[i])).toBe(true));
    expect(joint.getDof("flexion")).toBe(flex);
    expect(states.separatedIds()).toEqual([]);
  });

  it("scene 'show' cannot make static structures appear while the joint is posed (motion policy stays authoritative)", () => {
    const policy = new VisibilityPolicy(manifest);
    const ucl = manifest.structure("ulnar_collateral_ligament_elbow_r")!;
    const annular = manifest.structure("annular_ligament_radius_r")!;
    const state = { tiers: { core: true, detail: false, context: false }, keepNonTrackingDuringMotion: false };
    const still = { posed: false, moving: false };
    const posed = { posed: true, moving: false };
    expect(policy.structureVisibleWithOverride(ucl, "default", state, still)).toBe(false);
    expect(policy.structureVisibleWithOverride(ucl, "show", state, still)).toBe(true);
    expect(policy.structureVisibleWithOverride(ucl, "show", state, posed)).toBe(false);
    expect(policy.structureVisibleWithOverride(annular, "show", state, posed)).toBe(true);
    expect(policy.structureVisibleWithOverride(manifest.structure("humerus_r")!, "hide", state, still)).toBe(false);
  });

  it("highlighter caches one clone per material + state (no per-shot material creation)", () => {
    const h = new Highlighter();
    const meshes = registry.meshes();
    for (let i = 0; i < 5; i++) for (const state of ["highlight", "faded", "reveal", "none", "selected", "hover"] as const) h.set(meshes, state);
    const materials = new Set(meshes.map((m) => (h.set([m], "none"), (m.material as { uuid: string }).uuid))).size;
    expect(h.cloneCount).toBe(materials * 5);
    h.setStateOpacity("faded", 0.4);
    h.set(meshes.slice(0, 1), "faded");
    expect((meshes[0].material as { opacity: number }).opacity).toBe(0.4);
    h.dispose();
  });
});
