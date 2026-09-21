import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { dist, openApp, qa, settle, trackConsole, type V3 } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const STEP = process.env.QA_STEP ?? "step12";
const OUT = join(ROOT, "qa", "visual", STEP, STEP === "step10" ? "" : "reference_poses");
const POSES = [0, 45, 90, 145];

interface Sample {
  flexionDeg: number;
  anchors: Record<string, V3>;
  structures: Record<string, { worldMatrix: number[]; worldBBox: { min: V3; max: V3 } }>;
}

test("reference poses 0/45/90/145: runtime checks + deterministic snapshots", async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  const log = trackConsole(page);
  const manifest = JSON.parse(readFileSync(join(ROOT, "public", "assets", "joints", "elbow_r", "joint-manifest.json"), "utf8"));
  const reference = JSON.parse(readFileSync(join(ROOT, "qa", "reports", "elbow_r.blender_pose_reference.json"), "utf8"));
  await openApp(page);

  // Clamping through the single setDof path
  expect(await qa(page, "setDof", "flexion", 200)).toBe(145);
  expect(await qa(page, "setDof", "flexion", -30)).toBe(0);

  await qa(page, "setDof", "flexion", 0);
  await qa(page, "view", "overview", true);
  await settle(page);
  const neutral = await qa<Sample>(page, "sample");
  const rows: Record<string, unknown>[] = [];
  const shots: string[] = [];

  for (const deg of POSES) {
    const updatesBefore = await qa<number>(page, "poseUpdates");
    const applied = await qa<number>(page, "setDof", "flexion", deg);
    const updatesAfter = await qa<number>(page, "poseUpdates");
    await settle(page);
    const s = await qa<Sample>(page, "sample");
    const ref = reference.poses[String(deg)];
    const hinge = await qa<{ axis: V3; pivot: V3; direction: V3; overlayDirection: V3; overlayAngle: number; overlayVisible: boolean }>(page, "hinge");
    const bands = await qa<{ bandId: string; proximal: V3; distal: V3; meshCenter: V3; meshLength: number; representation: string; deformationSimulation: boolean; visible: boolean; contentLabel: string }[]>(page, "bands");
    const readout = await page.getByTestId("angle-readout").textContent();

    const mm = (a: V3, b: V3) => dist(a, b) * 1000;
    const bboxDev = (id: string) => Math.max(mm(s.structures[id].worldBBox.min, ref.structures[id].worldBBox.min), mm(s.structures[id].worldBBox.max, ref.structures[id].worldBBox.max));
    const hand = manifest.registry.groups.hand as string[];
    const humerusStationaryMm = Math.max(...s.structures.humerus_r.worldMatrix.map((v, i) => Math.abs(v - neutral.structures.humerus_r.worldMatrix[i]))) * 1000;
    const radiusMovedMm = mm(s.structures.radius_r.worldBBox.min, neutral.structures.radius_r.worldBBox.min);
    const anchorDevMm = Math.max(...Object.keys(ref.anchors).filter((id) => s.anchors[id]).map((id) => mm(s.anchors[id], ref.anchors[id])));
    const axisDevDeg = (Math.acos(Math.min(1, hinge.axis.reduce((acc, v, i) => acc + v * manifest.pivot.flexionAxisWorld[i], 0))) * 180) / Math.PI;
    const overlayVsRig = mm(hinge.overlayDirection, ref.forearmDirectionWorld);
    const bandChecks = bands.map((b) => {
      const spec = manifest.bands.find((x: { bandId: string }) => x.bandId === b.bandId);
      const prox = s.anchors[spec.proximalAnchorId];
      const distal = s.anchors[spec.distalAnchorId];
      const mid: V3 = [(prox[0] + distal[0]) / 2, (prox[1] + distal[1]) / 2, (prox[2] + distal[2]) / 2];
      return {
        bandId: b.bandId,
        endpointsMatchAnchorsMm: Math.max(mm(b.proximal, prox), mm(b.distal, distal)),
        meshFollowsEndpointsMm: Math.max(mm(b.meshCenter, mid), Math.abs(b.meshLength - dist(prox, distal)) * 1000),
        schematic: b.representation === "schematic" && b.deformationSimulation === false && b.contentLabel === "Schematic ligament band",
      };
    });
    const labels = await qa<{ id: string; left: number; top: number; w: number; h: number; ax: number; ay: number }[]>(page, "labels");
    const labelDrift = await page.evaluate((ls) => {
      const q = (window as any).__jointsQA;
      const rect = document.querySelector("canvas")!.getBoundingClientRect();
      let worst = 0;
      for (const l of ls) {
        if (!l.id.startsWith("anchor:")) continue;
        const p = q.anchorScreen(l.id.slice(7));
        worst = Math.max(worst, Math.hypot(p.x - rect.left - l.ax, p.y - rect.top - l.ay));
      }
      return worst;
    }, labels);
    let overlaps = 0;
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        if (a.left < b.left + b.w && b.left < a.left + a.w && a.top < b.top + b.h && b.top < a.top + a.h) overlaps++;
      }

    const row = {
      flexionDeg: deg,
      applied,
      poseUpdatesForOneSetDof: updatesAfter - updatesBefore,
      readout,
      humerusStationaryMaxAbs: humerusStationaryMm / 1000,
      radiusMovedMm: +radiusMovedMm.toFixed(3),
      radiusBBoxVsBlenderMm: +bboxDev("radius_r").toFixed(4),
      ulnaBBoxVsBlenderMm: +bboxDev("ulna_r").toFixed(4),
      handBBoxVsBlenderMaxMm: +Math.max(...hand.map(bboxDev)).toFixed(4),
      registryStructures: Object.keys(s.structures).length,
      anchorsResolved: Object.keys(s.anchors).length,
      anchorsVsBlenderMaxMm: +anchorDevMm.toFixed(4),
      hingeAxisVsManifestDeg: +axisDevDeg.toFixed(5),
      overlayAngle: hinge.overlayAngle,
      overlayDirectionVsBlenderForearmOverlay: +(overlayVsRig / 1000).toExponential(3),
      bands: bandChecks,
      labelsShown: labels.length,
      labelAnchorDriftPx: +labelDrift.toFixed(3),
      labelOverlaps: overlaps,
    };
    rows.push(row);

    expect(applied).toBe(deg);
    expect(row.poseUpdatesForOneSetDof).toBe(deg === 0 ? 0 : 1);
    expect(readout).toBe(`${deg}°`);
    expect(humerusStationaryMm).toBeLessThan(1e-6);
    if (deg > 0) expect(radiusMovedMm).toBeGreaterThan(5);
    expect(row.radiusBBoxVsBlenderMm).toBeLessThan(0.1);
    expect(row.ulnaBBoxVsBlenderMm).toBeLessThan(0.1);
    expect(row.handBBoxVsBlenderMaxMm).toBeLessThan(0.1);
    expect(row.registryStructures).toBe(30);
    expect(row.anchorsResolved).toBe(13);
    expect(row.anchorsVsBlenderMaxMm).toBeLessThan(0.1);
    expect(row.hingeAxisVsManifestDeg).toBeLessThan(0.01);
    expect(hinge.overlayAngle).toBe(deg);
    expect(overlayVsRig).toBeLessThan(0.01);
    for (const b of bandChecks) {
      expect(b.endpointsMatchAnchorsMm).toBeLessThan(1e-6);
      expect(b.meshFollowsEndpointsMm).toBeLessThan(1e-3);
      expect(b.schematic).toBe(true);
    }
    expect(labelDrift).toBeLessThan(1);
    expect(overlaps).toBe(0);

    const file = join(OUT, `elbow_r_overview_${String(deg).padStart(3, "0")}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
  }

  // Close-up series (camera is pose independent: centred on the pivot)
  await qa(page, "setDof", "flexion", 0);
  await qa(page, "view", "closeUp", true);
  for (const deg of POSES) {
    await qa(page, "setDof", "flexion", deg);
    await settle(page);
    const file = join(OUT, `elbow_r_closeup_${String(deg).padStart(3, "0")}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
  }

  // Context motion visibility rule (context + detail loaded)
  await qa(page, "setDof", "flexion", 0);
  await qa(page, "setLayer", "context", true);
  await qa(page, "setLayer", "detail", true);
  await page.waitForFunction(() => (window as any).__jointsQA.counts().tiers.length === 3, null, { timeout: 60_000 });
  await qa(page, "view", "overview", true);
  const visibility: Record<string, unknown> = {};
  const nonTracking = (manifest.structures as { structureId: string; motionBehavior: string }[]).filter((x) => !x.motionBehavior.startsWith("moves_with_") && x.motionBehavior !== "stationary").map((x) => x.structureId);
  for (const deg of POSES) {
    await qa(page, "setDof", "flexion", deg);
    await settle(page);
    const visible = await qa<string[]>(page, "visibleStructureIds");
    const shownNonTracking = nonTracking.filter((id) => visible.includes(id));
    const note = await page.getByTestId("motion-visibility-note").count();
    visibility[String(deg)] = { visible: visible.length, nonTrackingVisible: shownNonTracking.length, coreVisible: visible.filter((id) => manifest.tiers.core.structureIds.includes(id)).length, attachedSoftVisible: visible.filter((id) => ["annular_ligament_radius_r", "quadrate_ligament_r", "oblique_cord_r", "interosseous_membrane_forearm_r"].includes(id)).length, noteShown: note > 0 };
    if (deg === 0) expect(shownNonTracking.length).toBe(15);
    else expect(shownNonTracking.length).toBe(0);
    expect(visible.filter((id) => manifest.tiers.core.structureIds.includes(id)).length).toBe(30);
    if (deg === 0 || deg === 90) {
      const file = join(OUT, `elbow_r_context_${String(deg).padStart(3, "0")}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
    }
  }
  await qa(page, "setDof", "flexion", 0);
  await settle(page);
  expect((await qa<string[]>(page, "visibleStructureIds")).length).toBe(49);

  writeFileSync(join(ROOT, "qa", "reports", `elbow_r.${STEP}_reference_poses.json`), JSON.stringify({ generatedAt: new Date().toISOString(), viewport: page.viewportSize(), poses: rows, contextVisibility: visibility, screenshots: shots.map((f) => f.slice(ROOT.length + 1).replace(/\\/g, "/")), consoleErrors: log.errors, consoleWarnings: log.warnings.length }, null, 1));
  expect(log.errors).toEqual([]);
});
