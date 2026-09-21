import type { JointContent } from "../types";

/** Elbow (right) vertical-slice content. Geometry, range, anchors and structures come from the manifest. */
export const elbowRight: JointContent = {
  jointId: "elbow_r",
  manifestUrl: `${import.meta.env.BASE_URL}assets/joints/elbow_r/joint-manifest.json`,
  title: "Elbow joint",
  subtitle: "Hinge joint · flexion and extension",
  dofControls: {
    flexion: {
      label: "Elbow flexion",
      step: 1,
      largeStep: 10,
      pageStep: 15,
      presets: ["min", 45, 90, "max"],
      minLabel: "Extended",
      maxLabel: "Flexed",
      neutralDescription: "full anatomical extension",
      valueText: (v) => `${Math.round(v)} degrees of flexion`,
    },
  },
  labelAnchorTypes: ["structure_label", "region", "bony_landmark_approx", "joint_center"],
  initialLayers: { labels: true, axis: true, bands: true, detail: false, context: false, keepContextDuringMotion: false },
  initialCamera: "overview",
  dragHint: "Drag the forearm to bend the elbow · drag elsewhere to orbit",
};
