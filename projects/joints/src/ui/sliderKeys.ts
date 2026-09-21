export interface SliderKeyConfig {
  min: number;
  max: number;
  step: number;
  largeStep: number;
  pageStep: number;
}

/**
 * ARIA slider keyboard model. Returns the requested value (the joint controller clamps) or null when the key is not handled.
 * Arrow = step, Shift+Arrow = largeStep, PageUp/PageDown = pageStep, Home = min, End = max.
 */
export function sliderKeyValue(key: string, shiftKey: boolean, value: number, cfg: SliderKeyConfig): number | null {
  const inc = shiftKey ? cfg.largeStep : cfg.step;
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return value + inc;
    case "ArrowLeft":
    case "ArrowDown":
      return value - inc;
    case "PageUp":
      return value + cfg.pageStep;
    case "PageDown":
      return value - cfg.pageStep;
    case "Home":
      return cfg.min;
    case "End":
      return cfg.max;
    default:
      return null;
  }
}

/** Value for a pointer position along the slider track (0..1 fraction). */
export function trackFractionToValue(fraction: number, min: number, max: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  return min + f * (max - min);
}
