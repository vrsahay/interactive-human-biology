import type { JointManifestModel } from "../assets/ManifestLoader";
import type { TierName } from "../assets/manifestTypes";
import type { BodyStage } from "../body/BodyLayer";
import { resolveJointRefs } from "./validateVideoLesson";
import type { Shot } from "./videoTypes";

/** What a shot needs downloaded (and prepared) before it can be shown. */
export interface ShotAssetNeeds {
  /** Body delivery stages beyond the first (the first stage is loaded before the film starts). */
  bodyStages: string[];
  /** The validated joint asset (core tier) must be attached. */
  joint: boolean;
  /** Extra joint tiers (structures, anchors or bands the shot references, or the detail layer). */
  jointTiers: TierName[];
}

/**
 * Pure mapping shot -> assets. Full-body framing ("body" preset) only needs the first body stage; any closer framing needs the
 * later stages (LOD0 for close-up anatomy); a shot that shows the joint asset needs its core tier plus the tiers of every
 * structure it names.
 */
export function shotAssetNeeds(shot: Shot, joint: JointManifestModel, bodyStages: readonly BodyStage[]): ShotAssetNeeds {
  // Only a plain full-body shot (no highlight, no dimming, nothing hidden, no joint asset) can be shown by the first stage
  // (which may be the delivery-only proxy); every other shot needs the later stages (groups at their final LOD).
  const plainFullBody = shot.camera.preset === "body" && !shot.body.highlight.length && !shot.body.hidden.length && !shot.body.dimOthers && !shot.joint.visible;
  const needs: ShotAssetNeeds = { bodyStages: plainFullBody ? [] : bodyStages.slice(1).map((s) => s.stageId), joint: shot.joint.visible, jointTiers: [] };
  if (!shot.joint.visible) return needs;
  const tiers = new Set<TierName>();
  if (shot.joint.detail) tiers.add("detail");
  const problems: string[] = [];
  const structures = [...resolveJointRefs(shot.joint.reveal, joint, problems, shot.id), ...resolveJointRefs(shot.joint.highlight, joint, problems, shot.id), ...(shot.camera.structures ? resolveJointRefs(shot.camera.structures, joint, problems, shot.id) : [])];
  for (const id of structures) tiers.add(joint.structure(id)!.tier);
  for (const anchorId of shot.labels.anchors) {
    const a = joint.anchor(anchorId);
    if (a) tiers.add(a.tier);
  }
  for (const bandId of shot.overlays.bands) {
    const b = joint.bands.find((x) => x.bandId === bandId);
    const s = b ? joint.structure(b.structureId) : undefined;
    if (s) tiers.add(s.tier);
  }
  tiers.delete("core");
  needs.jointTiers = [...tiers].sort();
  return needs;
}
