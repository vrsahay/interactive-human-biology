import { useRef } from "preact/hooks";
import type { DofControlContent } from "../content/types";
import type { InputSource } from "../engine/joints/JointController";
import { sliderKeyValue, trackFractionToValue } from "./sliderKeys";

export interface FlexionSliderProps {
  id: string;
  dof: { id: string; min: number; max: number; neutral: number; rangeApproximate: boolean };
  content: DofControlContent;
  value: number;
  /** Must route to JointController.setDof. */
  onChange: (value: number, source: InputSource) => void;
  onGestureChange?: (active: boolean) => void;
  /** Read-only (e.g. while a lesson owns the pose): value stays visible and announced, input is ignored. */
  disabled?: boolean;
}

/** Custom ARIA slider (role="slider") bound to one DOF. Keyboard, pointer and track clicks all call onChange -> setDof. */
export function FlexionSlider({ id, dof, content, value, onChange, onGestureChange, disabled = false }: FlexionSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const span = dof.max - dof.min;
  const fraction = (value - dof.min) / span;
  const rounded = Math.round(value);
  const labelId = `${id}-label`;
  const rangeId = `${id}-range`;

  const fromPointer = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    onChange(trackFractionToValue((clientX - rect.left) / rect.width, dof.min, dof.max), "slider");
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    const next = sliderKeyValue(e.key, e.shiftKey, value, { min: dof.min, max: dof.max, step: content.step, largeStep: content.largeStep, pageStep: content.pageStep });
    if (next === null) return;
    e.preventDefault();
    onChange(next, "keyboard");
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).focus();
    onGestureChange?.(true);
    fromPointer(e.clientX);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!disabled && (e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
  };
  const onPointerUp = (e: PointerEvent) => {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      onGestureChange?.(false);
    }
  };

  const ticks = [];
  for (let t = dof.min; t <= dof.max + 1e-9; t += 15) ticks.push(t);

  return (
    <div class="dof-slider" data-disabled={disabled ? "true" : undefined}>
      <div class="dof-slider__header">
        <span class="dof-slider__label" id={labelId}>
          {content.label}
        </span>
        <output class="dof-slider__readout" data-testid="angle-readout" aria-hidden="true">
          {rounded}
          <span class="dof-slider__unit">°</span>
        </output>
      </div>
      <div
        class="dof-slider__control"
        role="slider"
        tabIndex={0}
        id={id}
        data-testid={`slider-${dof.id}`}
        aria-labelledby={labelId}
        aria-describedby={rangeId}
        aria-valuemin={dof.min}
        aria-valuemax={dof.max}
        aria-valuenow={rounded}
        aria-valuetext={content.valueText(value)}
        aria-orientation="horizontal"
        aria-disabled={disabled ? "true" : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div class="dof-slider__track" ref={trackRef}>
          <div class="dof-slider__fill" style={{ width: `${fraction * 100}%` }} />
          {ticks.map((t) => (
            <span key={t} class="dof-slider__tick" style={{ left: `${((t - dof.min) / span) * 100}%` }} />
          ))}
          <div class="dof-slider__thumb" style={{ left: `${fraction * 100}%` }} />
        </div>
      </div>
      <div class="dof-slider__scale" id={rangeId}>
        <span>
          {dof.min}° · {content.minLabel}
        </span>
        <span>
          {content.maxLabel} · {dof.max}°{dof.rangeApproximate ? " (approx.)" : ""}
        </span>
      </div>
    </div>
  );
}
