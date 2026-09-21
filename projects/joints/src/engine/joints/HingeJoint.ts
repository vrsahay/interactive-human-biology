import { MathUtils, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { JointManifestModel } from "../assets/ManifestLoader";
import { JointController } from "./JointController";
import { normalizeAxis, parseAxisToken, type Dof } from "./dof";

export interface HingeBindingReport {
  controllerNode: string;
  pivotNode: string;
  pivotPointDeviationM: number;
  axisDeviationDeg: number;
  travelConsistencyDeg: number;
}

const POSITION_TOLERANCE_M = 1e-4;
const ANGLE_TOLERANCE_DEG = 0.01;

/**
 * One-DOF hinge driven procedurally through the exported controller node.
 * Pose truth = the DOF value; applyPose writes it to exactly one transform (controller local rotation about its
 * manifest local axis, composed with the exported rest rotation). Driven structures follow through the exported hierarchy.
 */
export class HingeJoint extends JointController {
  readonly controllerNode: Object3D;
  readonly pivotNode: Object3D;
  readonly dofId: string;
  private readonly localAxis: Vector3;
  private readonly restQuaternion: Quaternion;
  /** Stationary frame the hinge geometry is expressed in (the pivot's parent). */
  readonly frameNode: Object3D;
  private readonly pivotLocal: Vector3;
  private readonly axisLocal: Vector3;
  private readonly neutralDirLocal: Vector3;
  readonly binding: HingeBindingReport;
  private readonly tmpQ = new Quaternion();

  constructor(readonly manifest: JointManifestModel, resolveNode: (name: string) => Object3D | undefined) {
    if (manifest.jointType !== "hinge") throw new Error(`HingeJoint cannot drive jointType ${manifest.jointType}`);
    super(manifest.jointId, "hinge", manifest.dofs);
    if (this.dofMap.size !== 1) throw new Error(`${manifest.jointId}: hinge expects exactly one DOF, got ${this.dofMap.size}`);
    const dof: Dof = this.dofs[0];
    this.dofId = dof.id;
    const ctrlSpec = manifest.controller;
    if (dof.axisToken !== ctrlSpec.localAxis) throw new Error(`${manifest.jointId}: dof axis ${dof.axisToken} != controller local axis ${ctrlSpec.localAxis}`);

    const ctrl = resolveNode(ctrlSpec.node);
    const pivot = resolveNode(manifest.pivot.node);
    if (!ctrl) throw new Error(`controller node ${ctrlSpec.node} not loaded`);
    if (!pivot) throw new Error(`pivot node ${manifest.pivot.node} not loaded`);
    if (ctrl.userData.role !== "controller" || pivot.userData.role !== "pivot") throw new Error("controller/pivot extras roles do not match the manifest contract");
    if (!pivot.parent) throw new Error("pivot has no stationary parent frame");
    this.controllerNode = ctrl;
    this.pivotNode = pivot;
    this.frameNode = pivot.parent;
    this.localAxis = parseAxisToken(ctrlSpec.localAxis);
    this.restQuaternion = ctrl.quaternion.clone();

    // Hinge geometry from the manifest (world at neutral) -> stationary frame.
    this.frameNode.updateWorldMatrix(true, false);
    const toFrame = new Matrix4().copy(this.frameNode.matrixWorld).invert();
    const axisWorld = normalizeAxis(manifest.pivot.flexionAxisWorld);
    const neutralWorld = normalizeAxis(manifest.pivot.trueExtensionForearmDirWorld);
    const travelWorld = normalizeAxis(manifest.pivot.flexionTravelDirWorld);
    this.pivotLocal = new Vector3(...manifest.pivot.point).applyMatrix4(toFrame);
    this.axisLocal = axisWorld.clone().transformDirection(toFrame);
    this.neutralDirLocal = neutralWorld.clone().transformDirection(toFrame);

    // Verify the exported hierarchy agrees with the manifest before anything moves.
    this.applyPose();
    ctrl.updateWorldMatrix(true, false);
    const pivotPoint = new Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const ctrlAxisWorld = this.localAxis.clone().transformDirection(ctrl.matrixWorld);
    this.binding = {
      controllerNode: ctrlSpec.node,
      pivotNode: manifest.pivot.node,
      pivotPointDeviationM: pivotPoint.distanceTo(new Vector3(...manifest.pivot.point)),
      axisDeviationDeg: MathUtils.radToDeg(ctrlAxisWorld.angleTo(axisWorld)),
      travelConsistencyDeg: MathUtils.radToDeg(axisWorld.clone().cross(neutralWorld).angleTo(travelWorld)),
    };
    const problems: string[] = [];
    if (this.binding.pivotPointDeviationM > POSITION_TOLERANCE_M) problems.push(`pivot point deviates ${this.binding.pivotPointDeviationM} m`);
    if (this.binding.axisDeviationDeg > ANGLE_TOLERANCE_DEG) problems.push(`controller axis deviates ${this.binding.axisDeviationDeg} deg from manifest flexion axis`);
    if (this.binding.travelConsistencyDeg > 0.5) problems.push(`axis x neutral direction disagrees with travel direction by ${this.binding.travelConsistencyDeg} deg`);
    if (problems.length) throw new Error(`${manifest.jointId}: hinge binding failed:\n - ${problems.join("\n - ")}`);
  }

  /** Verifies every loaded driven structure is under the controller and every loaded non-driven one is not. */
  verifyDrivenHierarchy(resolveStructureNode: (id: string) => Object3D | undefined): { driven: number; stationary: number; problems: string[] } {
    const problems: string[] = [];
    let driven = 0;
    let stationary = 0;
    for (const s of this.manifest.structures) {
      const node = resolveStructureNode(s.structureId);
      if (!node) continue;
      let under = false;
      for (let o: Object3D | null = node.parent; o; o = o.parent) if (o === this.controllerNode) under = true;
      const shouldBe = this.manifest.isDriven(s.structureId);
      if (under !== shouldBe) problems.push(`${s.structureId}: under controller=${under}, manifest drives=${shouldBe}`);
      if (shouldBe) driven++;
      else stationary++;
    }
    return { driven, stationary, problems };
  }

  get angle(): number {
    return this.getDof(this.dofId);
  }

  protected applyPose(): void {
    const rad = MathUtils.degToRad(this.values.get(this.dofId)!);
    this.tmpQ.setFromAxisAngle(this.localAxis, rad);
    this.controllerNode.quaternion.copy(this.restQuaternion).multiply(this.tmpQ);
    this.controllerNode.updateMatrixWorld(true);
  }

  // ---- hinge geometry (stationary frame -> world), used by overlays and interaction ----

  pivotWorld(target = new Vector3()): Vector3 {
    this.frameNode.updateWorldMatrix(true, false);
    return target.copy(this.pivotLocal).applyMatrix4(this.frameNode.matrixWorld);
  }

  axisWorld(target = new Vector3()): Vector3 {
    this.frameNode.updateWorldMatrix(true, false);
    return target.copy(this.axisLocal).transformDirection(this.frameNode.matrixWorld);
  }

  /** Distal segment direction at an arbitrary DOF value (neutral direction rotated about the hinge axis). */
  directionAtWorld(angleDeg: number, target = new Vector3()): Vector3 {
    const axis = this.axisWorld();
    this.frameNode.updateWorldMatrix(true, false);
    return target.copy(this.neutralDirLocal).transformDirection(this.frameNode.matrixWorld).applyAxisAngle(axis, MathUtils.degToRad(angleDeg));
  }

  /** Tangent of the motion arc (direction of increasing DOF) at an angle. */
  travelAtWorld(angleDeg: number, target = new Vector3()): Vector3 {
    const axis = this.axisWorld();
    return target.copy(axis).cross(this.directionAtWorld(angleDeg)).normalize();
  }
}
