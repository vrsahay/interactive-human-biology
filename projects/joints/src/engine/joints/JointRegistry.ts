import type { Object3D } from "three";
import type { JointManifestModel } from "../assets/ManifestLoader";
import type { JointType } from "../assets/manifestTypes";
import { HingeJoint } from "./HingeJoint";
import type { JointController } from "./JointController";

export type JointFactory = (manifest: JointManifestModel, resolveNode: (name: string) => Object3D | undefined) => JointController;

/** jointType -> controller implementation, plus the live controllers by jointId. */
export class JointRegistry {
  private readonly factories = new Map<JointType, JointFactory>([["hinge", (m, r) => new HingeJoint(m, r)]]);
  private readonly joints = new Map<string, JointController>();

  registerType(type: JointType, factory: JointFactory): void {
    this.factories.set(type, factory);
  }

  supports(type: JointType): boolean {
    return this.factories.has(type);
  }

  create(manifest: JointManifestModel, resolveNode: (name: string) => Object3D | undefined): JointController {
    const factory = this.factories.get(manifest.jointType);
    if (!factory) throw new Error(`no controller registered for jointType ${manifest.jointType}`);
    if (this.joints.has(manifest.jointId)) throw new Error(`joint ${manifest.jointId} already created`);
    const joint = factory(manifest, resolveNode);
    this.joints.set(manifest.jointId, joint);
    return joint;
  }

  get(jointId: string): JointController | undefined {
    return this.joints.get(jointId);
  }

  all(): JointController[] {
    return [...this.joints.values()];
  }
}
