import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JointManifestModel, ManifestError, ManifestLoader, checkManifestSemantics } from "../../src/engine/assets/ManifestLoader";
import { parseManifest } from "../../src/engine/assets/manifestSchema";
import { schemaSha256 } from "../../src/engine/assets/generated/manifestSchemaValidator.js";
import { createHash } from "node:crypto";
import { ROOT, productionManifest, productionManifestText } from "../helpers/production";

const mutate = (fn: (m: any) => void) => {
  const m = JSON.parse(productionManifestText());
  fn(m);
  return JSON.stringify(m);
};

describe("1. manifest schema loading", () => {
  it("production manifest passes the generated schema validator and runtime invariants", () => {
    const m = parseManifest(productionManifestText());
    expect(m.jointId).toBe("elbow_r");
    expect(m.jointType).toBe("hinge");
    expect(checkManifestSemantics(m)).toEqual([]);
  });

  it("generated validator is in sync with pipeline/schemas/joint-manifest.schema.json", () => {
    const schemaText = readFileSync(join(ROOT, "pipeline", "schemas", "joint-manifest.schema.json"), "utf8");
    expect(schemaSha256).toBe(createHash("sha256").update(schemaText).digest("hex"));
    const full = new Ajv({ allErrors: true, strict: false }).compile(JSON.parse(schemaText));
    expect(full(JSON.parse(productionManifestText()))).toBe(true);
  });

  it("rejects invalid JSON, schema violations and broken invariants with explicit errors", () => {
    expect(() => parseManifest("{nope")).toThrow(ManifestError);
    expect(() => parseManifest(mutate((m) => delete m.pivot))).toThrow(/schema validation/);
    expect(() => parseManifest(mutate((m) => (m.bands[0].deformationSimulation = true)))).toThrow(/schema validation/);
    expect(() => parseManifest(mutate((m) => m.tiers.core.extensionsRequired.push("KHR_draco_mesh_compression")))).toThrow(/schema validation/);
    expect(() => parseManifest(mutate((m) => (m.dofs[0].min = 200)))).toThrow(/invalid range/);
    expect(() => parseManifest(mutate((m) => (m.controller.drives = [...m.controller.drives, "nonexistent_r"])))).toThrow(/unknown structure nonexistent_r/);
    expect(() => parseManifest(mutate((m) => (m.pivot.flexionAxisWorld = [1, 1, 0])))).toThrow(/not unit length/);
  });

  it("ManifestLoader fetches, validates and resolves tier URLs relative to the manifest", async () => {
    const fakeFetch = (async () => new Response(productionManifestText(), { status: 200 })) as typeof fetch;
    const model = await new ManifestLoader(fakeFetch).load("http://example.test/assets/joints/elbow_r/joint-manifest.json");
    expect(model.tierUrl("core")).toBe("http://example.test/assets/joints/elbow_r/elbow_r.core.glb");
    const failing = (async () => new Response("", { status: 404, statusText: "Not Found" })) as typeof fetch;
    await expect(new ManifestLoader(failing).load("http://example.test/m.json")).rejects.toThrow(/404/);
  });

  it("exposes joint metadata, structures, anchors, bands, pivot, controller, DOFs and tiers", () => {
    const m: JointManifestModel = productionManifest();
    expect(m.structures).toHaveLength(49);
    expect(m.anchors).toHaveLength(17);
    expect(m.bands.map((b) => b.bandId)).toEqual(["elbow_r.band.radial_collateral_ligament", "elbow_r.band.ulnar_collateral_ligament"]);
    expect(m.controller.node).toBe("elbow_r__ctrl");
    expect(m.controller.drives).toHaveLength(33);
    expect(m.structuresInTier("core")).toHaveLength(30);
    expect(m.anchorsInTier("core")).toHaveLength(13);
    expect(m.semantics.neutral_offset_deg).toBe(13.62510376997268);
    expect(m.semantics.neutral_definition).toMatch(/true anatomical elbow extension/);
  });
});

describe("9. pivot parsing", () => {
  it("pivot point, axis, neutral and travel directions come from the manifest and are mutually consistent", () => {
    const { pivot } = productionManifest();
    expect(pivot.node).toBe("elbow_r__pivot");
    expect(pivot.point).toEqual([-0.2213899940252304, 1.1033600568771362, -0.03483999893069267]);
    const [a, n, t] = [pivot.flexionAxisWorld, pivot.trueExtensionForearmDirWorld, pivot.flexionTravelDirWorld];
    const cross = [a[1] * n[2] - a[2] * n[1], a[2] * n[0] - a[0] * n[2], a[0] * n[1] - a[1] * n[0]];
    expect(Math.hypot(cross[0] - t[0], cross[1] - t[1], cross[2] - t[2])).toBeLessThan(1e-3);
  });
});
