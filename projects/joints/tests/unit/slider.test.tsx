// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { elbowRight } from "../../src/content/joints/elbow_r";
import type { DofSpec } from "../../src/engine/assets/manifestTypes";
import { JointController, type InputSource } from "../../src/engine/joints/JointController";
import { FlexionSlider } from "../../src/ui/FlexionSlider";
import { sliderKeyValue } from "../../src/ui/sliderKeys";
import { productionManifestText } from "../helpers/production";

afterEach(cleanup);

class TestJoint extends JointController {
  applied = 0;
  constructor(dofs: DofSpec[]) {
    super("test_joint", "hinge", dofs);
  }
  protected applyPose(): void {
    this.applied++;
  }
}

const flexion: DofSpec = JSON.parse(productionManifestText()).dofs[0];

function setup(initial = 0) {
  const joint = new TestJoint([flexion]);
  joint.setDof("flexion", initial);
  const setDof = vi.spyOn(joint, "setDof");
  const dof = joint.dof("flexion");
  const onChange = (v: number, source: InputSource) => joint.setDof("flexion", v, source);
  const utils = render(<FlexionSlider id="dof-flexion" dof={dof} content={elbowRight.dofControls.flexion} value={joint.getDof("flexion")} onChange={onChange} />);
  const rerender = () => utils.rerender(<FlexionSlider id="dof-flexion" dof={dof} content={elbowRight.dofControls.flexion} value={joint.getDof("flexion")} onChange={onChange} />);
  const slider = utils.getByRole("slider");
  return { joint, setDof, slider, rerender, utils };
}

describe("15. keyboard -> setDof", () => {
  it("maps ARIA slider keys to requested values", () => {
    const cfg = { min: 0, max: 145, step: 1, largeStep: 10, pageStep: 15 };
    expect(sliderKeyValue("ArrowRight", false, 10, cfg)).toBe(11);
    expect(sliderKeyValue("ArrowUp", false, 10, cfg)).toBe(11);
    expect(sliderKeyValue("ArrowLeft", true, 10, cfg)).toBe(0);
    expect(sliderKeyValue("PageUp", false, 10, cfg)).toBe(25);
    expect(sliderKeyValue("PageDown", false, 10, cfg)).toBe(-5);
    expect(sliderKeyValue("Home", false, 10, cfg)).toBe(0);
    expect(sliderKeyValue("End", false, 10, cfg)).toBe(145);
    expect(sliderKeyValue("a", false, 10, cfg)).toBeNull();
  });

  it("every key goes through JointController.setDof with source=keyboard and is clamped there", () => {
    const { joint, setDof, slider, rerender } = setup(0);
    const press = (key: string, shiftKey = false) => {
      fireEvent.keyDown(slider, { key, shiftKey });
      rerender();
    };
    press("ArrowRight");
    expect(setDof).toHaveBeenLastCalledWith("flexion", 1, "keyboard");
    press("ArrowRight", true);
    expect(joint.getDof("flexion")).toBe(11);
    press("End");
    expect(joint.getDof("flexion")).toBe(145);
    press("PageUp");
    expect(setDof).toHaveBeenLastCalledWith("flexion", 160, "keyboard");
    expect(joint.getDof("flexion")).toBe(145);
    press("Home");
    press("ArrowLeft");
    expect(joint.getDof("flexion")).toBe(0);
    expect(setDof.mock.calls.every((c) => c[2] === "keyboard")).toBe(true);
  });
});

describe("14. slider -> setDof", () => {
  it("renders an accessible slider with manifest limits and the approximate-range note", () => {
    const { slider, utils } = setup(45);
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("145");
    expect(slider.getAttribute("aria-valuenow")).toBe("45");
    expect(slider.getAttribute("aria-valuetext")).toBe("45 degrees of flexion");
    expect(slider.getAttribute("tabindex")).toBe("0");
    expect(utils.getByTestId("angle-readout").textContent).toBe("45°");
    expect(utils.container.textContent).toContain("145° (approx.)");
  });

  it("pointer on the track calls setDof with source=slider", () => {
    const { joint, setDof, slider, utils } = setup(0);
    const track = utils.container.querySelector(".dof-slider__track") as HTMLElement;
    track.getBoundingClientRect = () => ({ left: 100, width: 290, top: 0, height: 6, right: 390, bottom: 6, x: 100, y: 0, toJSON: () => ({}) }) as DOMRect;
    Object.assign(slider, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() });
    fireEvent.pointerDown(slider, { button: 0, clientX: 245, pointerId: 1 });
    expect(setDof).toHaveBeenLastCalledWith("flexion", 72.5, "slider");
    fireEvent.pointerMove(slider, { clientX: 390, pointerId: 1 });
    expect(joint.getDof("flexion")).toBe(145);
    fireEvent.pointerMove(slider, { clientX: 0, pointerId: 1 });
    expect(joint.getDof("flexion")).toBe(0);
    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(setDof.mock.calls.every((c) => c[2] === "slider")).toBe(true);
    expect(joint.applied).toBeGreaterThanOrEqual(3);
  });
});
