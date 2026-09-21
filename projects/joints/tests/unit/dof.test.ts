import { describe, expect, it } from "vitest";
import { clampDof, normalizeAxis, parseAxisToken, parseDof } from "../../src/engine/joints/dof";
import { productionManifest } from "../helpers/production";

describe("2. DOF parsing", () => {
  it("parses the production flexion DOF from the manifest", () => {
    const dof = parseDof(productionManifest().dof("flexion"));
    expect(dof).toMatchObject({ id: "flexion", axisToken: "+X", min: 0, max: 145, neutral: 0, unit: "deg", rangeApproximate: true });
    expect(dof.axis.toArray()).toEqual([1, 0, 0]);
    expect(dof.rangeStatus).toBe("approximate, pending cited reference");
  });

  it("rejects bad units, ranges and neutral values", () => {
    const base = { id: "x", axis: "+X" as const, min: 0, max: 10, neutral: 0, unit: "deg" as const, rangeStatus: "cited" };
    expect(() => parseDof({ ...base, unit: "rad" as never })).toThrow(/unit/);
    expect(() => parseDof({ ...base, min: 10, max: 0 })).toThrow(/range/);
    expect(() => parseDof({ ...base, neutral: 11 })).toThrow(/neutral/);
    expect(parseDof(base).rangeApproximate).toBe(false);
  });
});

describe("3-7. DOF clamping", () => {
  const dof = parseDof(productionManifest().dof("flexion"));
  it("3. clamps into [min, max]", () => {
    expect(clampDof(dof, 72.5)).toBe(72.5);
  });
  it("4. 0° -> 0°", () => expect(clampDof(dof, 0)).toBe(0));
  it("5. 145° -> 145°", () => expect(clampDof(dof, 145)).toBe(145));
  it("6. >145° clamps to 145°", () => {
    expect(clampDof(dof, 145.0001)).toBe(145);
    expect(clampDof(dof, 1e9)).toBe(145);
    expect(clampDof(dof, Infinity)).toBe(145);
  });
  it("7. <0° clamps to 0°", () => {
    expect(clampDof(dof, -0.0001)).toBe(0);
    expect(clampDof(dof, -Infinity)).toBe(0);
  });
  it("NaN resolves to neutral", () => expect(clampDof(dof, NaN)).toBe(0));
});

describe("8. hinge axis normalization", () => {
  it("normalizes manifest axes and rejects degenerate ones", () => {
    const a = normalizeAxis([0, 3, 4]);
    expect(a.distanceTo({ x: 0, y: 0.6, z: 0.8 } as never)).toBeLessThan(1e-12);
    expect(normalizeAxis(productionManifest().pivot.flexionAxisWorld).length()).toBeCloseTo(1, 12);
    expect(() => normalizeAxis([0, 0, 0])).toThrow(/zero/);
    expect(() => normalizeAxis([NaN, 0, 1])).toThrow(/invalid/);
    expect(() => parseAxisToken("+W")).toThrow();
    expect(parseAxisToken("-Z").toArray()).toEqual([0, 0, -1]);
  });
});
