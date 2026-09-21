import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { comparePose, landmarkStatus, type PoseSample } from "../../src/engine/qa/poseCompare";
import { openApp, qa, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const JOINT = "elbow_r";

/**
 * Gate 3 infrastructure.
 *  (a) Runtime pose consistency: Three.js runtime (all tiers) vs the Blender rig reference at 0/45/90/145.
 *  (b) Formal landmark validation: only when approved qa/<joint>.poses.json exists; otherwise NOT AVAILABLE.
 */
test("gate 3: runtime pose consistency vs Blender + landmark status", async ({ page }) => {
  test.setTimeout(180_000);
  const log = trackConsole(page);
  const reference = JSON.parse(readFileSync(join(ROOT, "qa", "reports", `${JOINT}.blender_pose_reference.json`), "utf8"));
  const manifestSha = (await import("node:crypto")).createHash("sha256").update(readFileSync(join(ROOT, "public", "assets", "joints", JOINT, "joint-manifest.json"))).digest("hex");
  expect(reference.manifestSha256, "Blender reference was generated for the current manifest").toBe(manifestSha);

  await openApp(page);
  await qa(page, "ensureTier", "detail");
  await qa(page, "ensureTier", "context");
  const counts = await qa<{ structures: number; anchors: number; attached: number }>(page, "counts");
  expect(counts.structures).toBe(49);
  expect(counts.anchors).toBe(17);
  expect(counts.attached).toBe(19);

  const results = [];
  for (const key of Object.keys(reference.poses)) {
    const ref = reference.poses[key] as PoseSample;
    await qa(page, "setDof", "flexion", ref.flexionDeg);
    await settle(page);
    const runtime = await qa<PoseSample>(page, "sample");
    const r = comparePose(runtime, ref);
    results.push(r);
    expect(r.structuresCompared).toBe(49);
    expect(r.anchorsCompared).toBe(17);
    expect(r.passed, JSON.stringify(r)).toBe(true);
  }

  const posesPath = join(ROOT, "qa", `${JOINT}.poses.json`);
  // The draft package (Step 13 Phase I) is read when present, for reporting only. It never satisfies Gate 3.
  const draftPath = join(ROOT, "qa", `${JOINT}.poses.draft.json`);
  const landmarks = landmarkStatus(
    existsSync(posesPath) ? readFileSync(posesPath, "utf8") : null,
    JOINT,
    existsSync(draftPath) ? readFileSync(draftPath, "utf8") : null,
  );
  const report = {
    kind: "gate3",
    jointId: JOINT,
    generatedAt: new Date().toISOString(),
    runtimePoseConsistency: {
      reference: `qa/reports/${JOINT}.blender_pose_reference.json`,
      referenceWorkingFileSha256: reference.workingFileSha256,
      manifestSha256: manifestSha,
      note: "Three.js runtime (production GLBs, all tiers, attachTo applied) vs Blender rig driven through the controller. Not formal landmark validation.",
      passed: results.every((r) => r.passed),
      poses: results,
    },
    formalLandmarkValidation:
      landmarks.status === "AVAILABLE"
        ? { status: "AVAILABLE", note: "definitions present - comparison to be implemented against approved tolerances" }
        : { ...landmarks, formalGate3: "PENDING EXPERT LANDMARK APPROVAL" },
    consoleErrors: log.errors,
  };
  writeFileSync(join(ROOT, "qa", "reports", (process.env.QA_STEP ?? "step12") === "step10" ? `${JOINT}.gate3.json` : `${JOINT}.gate3.${process.env.QA_STEP ?? "step12"}.json`), JSON.stringify(report, null, 1));
  expect(landmarks.status).toBe(existsSync(posesPath) ? "AVAILABLE" : "NOT AVAILABLE");
  expect(log.errors).toEqual([]);
});
