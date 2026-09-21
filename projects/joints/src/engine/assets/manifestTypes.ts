// Runtime view of pipeline/schemas/joint-manifest.schema.json (schema 1).
// Only fields the runtime consumes are typed strictly; everything else is carried through untouched.

export type Vec3 = [number, number, number];
export type TierName = "core" | "detail" | "context";
export type JointType = "hinge" | "ball_socket" | "pivot" | "fixed" | "gliding";
export type AxisToken = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";
export type StructureRole = "bone_fixed" | "bone_moving" | "follow" | "tracked" | "spanning_soft" | "attached_soft" | "context";

export interface DofSpec {
  id: string;
  axis: AxisToken;
  min: number;
  max: number;
  neutral: number;
  unit: "deg";
  rangeStatus: string;
}

export interface PivotSpec {
  node: string;
  point: Vec3;
  flexionAxisWorld: Vec3;
  trueExtensionForearmDirWorld: Vec3;
  flexionTravelDirWorld: Vec3;
  method: string;
}

export interface ControllerSpec {
  node: string;
  localAxis: AxisToken;
  drives: string[];
  rotationSource?: string;
}

export interface JointSemantics {
  neutral_definition: string;
  neutral_offset_deg: number;
  neutral_offset_method: string;
  source_pose_flexion_deg: number;
  source_pose_reference: string;
  range_status: string;
  range_reference_status: string;
  user_facing_dofs: string[];
  [k: string]: unknown;
}

export interface StructureSpec {
  structureId: string;
  label: string;
  role: StructureRole;
  tier: TierName;
  side: string;
  nodeName: string;
  meshName: string;
  triangles: number;
  attachTo: string | null;
  motionBehavior: string;
  group: string;
  neutralWorldBBox: { min: Vec3; max: Vec3 };
  neutralWorldMatrix: number[];
  materials?: string[];
  /** Source object in the anatomy atlas (shared with the body orientation asset). */
  source: { object: string; mesh: string; fileSha256: string };
}

export interface AnchorVisibility {
  tier: TierName;
  defaultVisible: boolean;
  requiresStructureVisible: boolean;
  hideDuringMotion: boolean;
  showWithBand?: boolean;
}

export interface AnchorSpec {
  anchorId: string;
  key: string;
  nodeName: string;
  tier: TierName;
  structureId: string;
  label: string;
  anchorType: string;
  precision: string;
  displayCategory: string;
  motionBehavior: string;
  parentNode: string;
  export: boolean;
  neutralWorldPosition: Vec3;
  blenderLocalPosition: Vec3;
  labelDirectionLocalBlender: Vec3;
  visibility: AnchorVisibility;
  attachmentSide?: "proximal" | "distal";
  attachedBone?: string;
  bandId?: string;
  band?: { representation: "schematic"; deformationSimulation: false; [k: string]: unknown };
}

export interface BandSpec {
  bandId: string;
  structureId: string;
  side?: string;
  representation: "schematic";
  deformationSimulation: false;
  contentLabel: string;
  proximalAnchorId: string;
  distalAnchorId: string;
  realLigamentMesh: { structureId: string; tier: TierName; motionBehavior: string };
}

export interface MotionSpec {
  axisObject: string;
  forearmObject: string;
  axisLengthMm: number;
  arcRadiusMm: number;
  arcTickDeg: number;
  [k: string]: unknown;
}

export interface TierSpec {
  url: string;
  nodes: string[];
  structureIds: string[];
  triangles: number;
  bytes: number;
  sha256: string;
  gzipBytes: number;
  extensionsRequired: string[];
  loadTrigger: string;
  [k: string]: unknown;
}

export interface JointManifest {
  schema: 1;
  jointId: string;
  jointName: string;
  jointType: JointType;
  side: "right" | "left" | "midline";
  coordinateSystem: { space: "glTF"; up: "+Y"; units: "metres"; note?: string };
  pivot: PivotSpec;
  controller: ControllerSpec;
  dofs: DofSpec[];
  semantics: JointSemantics;
  structures: StructureSpec[];
  anchors: AnchorSpec[];
  bands: BandSpec[];
  bandRepresentation: { representation: "schematic"; deformationSimulation: false; statement: string; contentLabel?: string };
  registry: { capabilities: string[]; groups: Record<string, string[]> };
  motion: MotionSpec;
  tiers: Record<TierName, TierSpec>;
  budgetsKB: Record<string, number>;
  source: Record<string, unknown>;
  meshConvention: string;
  compression: Record<string, unknown>;
  sharedTextures: Record<string, unknown>;
  generatedAt: string;
  attribution?: { status: string };
}
