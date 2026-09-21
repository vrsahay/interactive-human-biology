/** Content-layer configuration for one joint experience. Joint-specific values live here, never in engine classes. */
export type PresetToken = number | "min" | "max" | "neutral";

export interface DofControlContent {
  label: string;
  /** Arrow key increment (deg). */
  step: number;
  /** Shift+Arrow increment (deg). */
  largeStep: number;
  /** PageUp / PageDown increment (deg). */
  pageStep: number;
  presets: PresetToken[];
  minLabel: string;
  maxLabel: string;
  /** Plain-language meaning of the neutral value, e.g. "full anatomical extension". */
  neutralDescription: string;
  valueText: (value: number) => string;
}

export interface LayerState {
  labels: boolean;
  axis: boolean;
  bands: boolean;
  detail: boolean;
  context: boolean;
  keepContextDuringMotion: boolean;
}

export interface JointContent {
  jointId: string;
  manifestUrl: string;
  title: string;
  subtitle: string;
  dofControls: Record<string, DofControlContent>;
  /** Anchor types shown as teaching labels. */
  labelAnchorTypes: string[];
  initialLayers: LayerState;
  initialCamera: string;
  dragHint: string;
}
