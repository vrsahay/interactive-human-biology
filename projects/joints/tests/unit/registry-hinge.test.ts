import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Box3, Group, Matrix4, Vector3 } from "three";
import { AnchorRegistry } from "../../src/engine/anatomy/AnchorRegistry";
import { StructureRegistry } from "../../src/engine/anatomy/StructureRegistry";
import { applyAttachTo } from "../../src/engine/anatomy/attach";
import { VisibilityPolicy, tracksPose } from "../../src/engine/anatomy/VisibilityPolicy";
import type { JointManifestModel } from "../../src/engine/assets/ManifestLoader";
import { HingeJoint } from "../../src/engine/joints/HingeJoint";
import { JointRegistry } from "../../src/engine/joints/JointRegistry";
import { anchorLabelDirectionWorld, blenderToGltfDirection } from "../../src/engine/overlays/LabelSystem";
import { ROOT, loadTierScene, productionManifest } from "../helpers/production";

let manifest: JointManifestModel;
let core: Group;
let structures: StructureRegistry;
let anchors: AnchorRegistry;
let joint: HingeJoint;
const reference = JSON.parse(readFileSync(join(ROOT, "qa", "reports", "elbow_r.blender_pose_reference.json"), "utf8"));

beforeAll(async () => {
  manifest = productionManifest();
  core = await loadTierScene(manifest, "core");
  structures = new StructureRegistry(manifest);
  structures.registerTier("core", core);
  anchors = new AnchorRegistry(manifest, structures);
  anchors.registerTier("core", core);
  joint = new JointRegistry().create(manifest, (n) => structures.node(n)) as HingeJoint;
  core.updateMatrixWorld(true);
});

describe("10. structureId resolution", () => {
  it("resolves all 30 core structures to their extras-tagged nodes with exactly one mesh carrier", () => {
    expect(structures.size).toBe(30);
    for (const s of manifest.structuresInTier("core")) {
      const e = structures.require(s.structureId);
      expect(e.node.userData.structureId).toBe(s.structureId);
      expect(e.meshes).toHaveLength(1);
      expect(e.meshes[0].userData.meshCarrierFor).toBe(s.structureId);
      expect(e.meshes[0].parent).toBe(e.node);
    }
  });

  it("picking walks up from the mesh carrier to the structure (display names are not used)", () => {
    const radius = structures.require("radius_r");
    expect(structures.structureIdFromObject(radius.meshes[0])).toBe("radius_r");
    // Renaming nodes and labels must not affect binding.
    radius.node.name = "renamed display name";
    radius.meshes[0].name = "whatever";
    expect(structures.structureIdFromObject(radius.meshes[0])).toBe("radius_r");
    radius.node.name = manifest.structure("radius_r")!.nodeName;
    radius.meshes[0].name = manifest.structure("radius_r")!.meshName;
    // An anchor node is not a structure; walking up from it reaches its parent structure.
    expect(structures.structureIdFromObject(anchors.require("elbow_r.anchor.olecranon").node)).toBe("ulna_r");
    expect(structures.structureIdFromObject(null)).toBeNull();
  });

  it("rejects a tier whose extras disagree with the manifest", async () => {
    const broken = await loadTierScene(manifest, "core");
    broken.getObjectByName("elbow_r__bone__ulna")!.userData.tier = "detail";
    expect(() => new StructureRegistry(manifest).registerTier("core", broken)).toThrow(/ulna_r: extras/);
  });
});

describe("11. anchor resolution", () => {
  it("resolves 13 core anchors with manifest parents and neutral world positions", () => {
    expect(anchors.size).toBe(13);
    for (const a of anchors.all()) expect(a.node.parent!.name).toBe(a.spec.parentNode);
    expect(anchors.verifyNeutralPositions()).toBeLessThan(1e-6);
    expect(anchors.structureOf("elbow_r.anchor.radial_head")!.structureId).toBe("radius_r");
    expect(anchors.structureOf("elbow_r.anchor.elbow_joint")).toBeNull();
  });
});

describe("HingeJoint + controller", () => {
  it("binds controller, pivot and axis from the manifest (no hard-coded values)", () => {
    expect(joint.controllerNode.name).toBe(manifest.controller.node);
    expect(joint.pivotNode.name).toBe(manifest.pivot.node);
    expect(joint.binding.pivotPointDeviationM).toBeLessThan(1e-6);
    expect(joint.binding.axisDeviationDeg).toBeLessThan(0.01);
    expect(joint.dofId).toBe("flexion");
    expect(joint.limits("flexion")).toEqual({ min: 0, max: 145 });
    expect(joint.neutralPose()).toEqual({ flexion: 0 });
    expect(joint.verifyDrivenHierarchy((id) => structures.resolve(id)).problems).toEqual([]);
  });

  it("12. one setDof that changes the value = exactly one pose update; no-op and clamped repeats emit nothing", () => {
    joint.setDof("flexion", 0);
    const pose = vi.fn();
    const change = vi.fn();
    const off1 = joint.events.on("pose", pose);
    const off2 = joint.events.on("change", change);
    joint.setDof("flexion", 30, "slider");
    expect(pose).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ dofId: "flexion", value: 30, previous: 30 - 30, source: "slider", clamped: false }));
    joint.setDof("flexion", 30, "slider");
    expect(pose).toHaveBeenCalledTimes(1);
    joint.setDof("flexion", 999, "keyboard");
    expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ value: 145, clamped: true, requested: 999 }));
    joint.setDof("flexion", 500, "keyboard");
    expect(pose).toHaveBeenCalledTimes(2);
    joint.setDof("flexion", -5, "drag");
    expect(joint.getDof("flexion")).toBe(0);
    off1();
    off2();
  });

  it("pose truth is the single controller transform; humerus stationary; forearm and hand follow; matches Blender", () => {
    const humerusBefore = structures.require("humerus_r").node.matrixWorld.clone();
    for (const deg of [0, 45, 90, 145]) {
      joint.setDof("flexion", deg);
      expect(structures.require("humerus_r").node.matrixWorld.equals(humerusBefore)).toBe(true);
      const ref = reference.poses[String(deg)];
      for (const id of ["radius_r", "ulna_r", "metacarpal_3_r", "distal_phalanx_hand_2_r"]) {
        const box = new Box3().setFromObject(structures.require(id).meshes[0], true);
        expect(box.min.distanceTo(new Vector3(...ref.structures[id].worldBBox.min)) * 1000).toBeLessThan(0.1);
        expect(box.max.distanceTo(new Vector3(...ref.structures[id].worldBBox.max)) * 1000).toBeLessThan(0.1);
      }
      for (const a of anchors.all()) expect(anchors.worldPosition(a.anchorId).distanceTo(new Vector3(...ref.anchors[a.anchorId])) * 1000).toBeLessThan(0.1);
      expect(joint.directionAtWorld(deg).distanceTo(new Vector3(...ref.forearmDirectionWorld))).toBeLessThan(1e-5);
    }
    joint.setDof("flexion", 0);
  });

  it("neutral semantics: 0° is true extension; the source pose is reproduced at neutral_offset_deg, not at 0°", () => {
    const radius = structures.require("radius_r").node;
    const identity = new Matrix4();
    const maxDiff = (m: Matrix4) => Math.max(...m.elements.map((v, i) => Math.abs(v - identity.elements[i])));
    joint.setDof("flexion", 0);
    expect(maxDiff(radius.matrixWorld)).toBeGreaterThan(0.1);
    joint.setDof("flexion", manifest.semantics.source_pose_flexion_deg);
    expect(manifest.semantics.source_pose_flexion_deg).toBe(manifest.semantics.neutral_offset_deg);
    expect(maxDiff(radius.matrixWorld)).toBeLessThan(1e-5);
    joint.setDof("flexion", 0);
  });

  it("withNeutralPose binds late tiers at neutral and restores the live pose without events", async () => {
    joint.setDof("flexion", 70);
    const pose = vi.fn();
    const off = joint.events.on("pose", pose);
    const detail = await loadTierScene(manifest, "detail");
    const anchorsBefore = anchors.size;
    const attached = joint.withNeutralPose(() => {
      const entries = structures.registerTier("detail", detail);
      anchors.registerTier("detail", detail);
      const results = applyAttachTo(entries, (n) => structures.node(n));
      expect(anchors.verifyNeutralPositions()).toBeLessThan(1e-6);
      return results;
    });
    off();
    expect(pose).not.toHaveBeenCalled();
    expect(joint.getDof("flexion")).toBe(70);
    expect(attached).toHaveLength(7);
    expect(anchors.size).toBe(anchorsBefore + 4);
    expect(joint.verifyDrivenHierarchy((id) => structures.resolve(id))).toMatchObject({ driven: 33, stationary: 4, problems: [] });
    // attached soft tissue follows the forearm; spanning soft tissue stays at its exported transform
    const ref = reference.poses["90"];
    joint.setDof("flexion", 90);
    const ann = new Box3().setFromObject(structures.require("annular_ligament_radius_r").meshes[0], true);
    expect(ann.min.distanceTo(new Vector3(...ref.structures.annular_ligament_radius_r.worldBBox.min)) * 1000).toBeLessThan(0.1);
    joint.setDof("flexion", 0);
  });
});

describe("16. label anchor resolution", () => {
  it("label directions come from manifest labelDirectionLocalBlender, converted to glTF through the anchor parent", () => {
    expect(blenderToGltfDirection([1, 2, 3]).toArray()).toEqual([1, 3, -2]);
    const humerus = anchors.require("elbow_r.anchor.humerus");
    const dir = anchorLabelDirectionWorld(humerus.spec, humerus.node);
    const [x, y, z] = humerus.spec.labelDirectionLocalBlender;
    expect(dir.distanceTo(new Vector3(x, z, -y).normalize())).toBeLessThan(1e-9); // humerus parent frame = world
    const wanted = ["Humerus", "Head of radius", "Olecranon", "Capitulum (region)", "Trochlea (region)", "Elbow joint", "Radius", "Ulna"];
    const labels = anchors.all().map((a) => a.spec.label);
    for (const w of wanted) expect(labels).toContain(w);
    // A driven anchor's label direction rotates with the forearm.
    const olecranon = anchors.require("elbow_r.anchor.olecranon");
    joint.setDof("flexion", 0);
    const d0 = anchorLabelDirectionWorld(olecranon.spec, olecranon.node).clone();
    joint.setDof("flexion", 90);
    const d90 = anchorLabelDirectionWorld(olecranon.spec, olecranon.node).clone();
    expect((d0.angleTo(d90) * 180) / Math.PI).toBeGreaterThan(30);
    joint.setDof("flexion", 0);
  });
});

describe("motion visibility policy", () => {
  it("derives hide-during-motion from motionBehavior + tier, never from names", () => {
    expect(tracksPose("stationary")).toBe(true);
    expect(tracksPose("moves_with_forearm")).toBe(true);
    expect(tracksPose("context_stationary")).toBe(false);
    expect(tracksPose("cross_joint_stationary")).toBe(false);
    expect(tracksPose("something_new")).toBe(false);
    const policy = new VisibilityPolicy(manifest);
    const state = { tiers: { core: true, detail: true, context: true }, keepNonTrackingDuringMotion: false };
    const still = { posed: false, moving: false };
    const posed = { posed: true, moving: false };
    const visible = (m: typeof still) => manifest.structures.filter((s) => policy.structureVisible(s, state, m)).length;
    expect(visible(still)).toBe(49);
    expect(visible(posed)).toBe(34);
    expect(policy.hiddenByMotion(state, posed)).toHaveLength(15);
    expect(manifest.structures.filter((s) => policy.structureVisible(s, { ...state, keepNonTrackingDuringMotion: true }, posed))).toHaveLength(49);
    expect(manifest.structures.filter((s) => policy.structureVisible(s, { ...state, tiers: { core: true, detail: false, context: false } }, still))).toHaveLength(30);
    const capitulum = manifest.anchor("elbow_r.anchor.capitulum")!;
    expect(policy.anchorLabelVisible(capitulum, () => true, { posed: true, moving: true })).toBe(false);
    expect(policy.anchorLabelVisible(capitulum, () => true, { posed: true, moving: false })).toBe(true);
    expect(policy.anchorLabelVisible(capitulum, () => false, still)).toBe(false);
  });
});
