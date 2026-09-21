import { elbowRight } from "./joints/elbow_r";
import type { JointContent } from "./types";

export const JOINT_CONTENT: Record<string, JointContent> = { [elbowRight.jointId]: elbowRight };
export const DEFAULT_JOINT = elbowRight.jointId;
