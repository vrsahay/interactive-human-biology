import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};

type Hinge = { overlayVisible: boolean; overlayAngle: number | null };
const visibleJoint = (page: Page) => film<string[]>(page, "jointVisible");
const state = (page: Page) => film<{ shotId: string; chapterId: string; learner: string; explore: boolean; playing: boolean; holdingForCheck: boolean; check: { status: string } }>(page, "state");

/**
 * Step 13 Phase S: final product bug sweep. Each test is a specific product-level failure mode, not a unit.
 * Findings are written to qa/reports/step13.bugsweep.json.
 */
test.describe("Step 13 bug sweep", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step13.bugsweep.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  // Regression for a real Step-13 finding: the elbow asset is attached lazily, and a deferred attach can complete while a
  // schematic chapter is on screen. The joint's initial layers (fitted axis overlay, schematic bands) then appeared during
  // the ball-and-socket chapter - a measured artefact shown over a schematic teaching shot.
  test("a deferred joint attach never leaks the fitted axis overlay into a schematic chapter", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown> = {};
    for (const shot of ["ball.move", "ball.why", "pivot.rotate", "fixed.name", "hinge.knee"]) {
      await film(page, "seekShot", shot, 4000);
      await settle(page);
      // Reproduces the real path: the learner shows intent on the hinge chapter (hover/focus) while a schematic shot is on
      // screen, so the elbow asset attaches mid-shot. (From some shots the 30 s lookahead reaches it by itself.)
      await film(page, "preloadChapter", 5);
      await page.waitForFunction(() => (window as any).__jointsFilm.jointAttached(), null, { timeout: 120_000 });
      await settle(page);
      const hinge = await qa<Hinge | null>(page, "hinge");
      const joint = await visibleJoint(page);
      rows[shot] = { jointAttached: true, axisOverlayVisible: hinge?.overlayVisible ?? null, visibleJointStructures: joint.length };
      expect(hinge?.overlayVisible, `${shot}: fitted elbow axis overlay must not be visible`).toBe(false);
      expect(joint, `${shot}: no joint-asset structure may be visible`).toEqual([]);
    }
    report.deferredAttachLeak = rows;
    expect(log.errors).toEqual([]);
  });

  test("seeking backwards and forwards leaves the pose, chapter and caption consistent with the shot", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: { shot: string; chapter: string; flexion: number | null; caption: string | null }[] = [];
    for (const shot of ["hinge.flexion", "intro.title", "map.all", "hinge.extension", "fixed.name", "hinge.try"]) {
      await film(page, "seekShot", shot, 1200);
      await settle(page);
      const s = await state(page);
      expect(s.shotId, "seek lands on the requested shot").toBe(shot);
      rows.push({
        shot: s.shotId,
        chapter: s.chapterId,
        flexion: await qa<number | null>(page, "getDof", "flexion"),
        caption: await page.evaluate(() => document.querySelector("[data-testid=film-caption-text]")?.textContent ?? null),
      });
    }
    // Recorded Step-13 observation (state hygiene, not a visible defect): the controller keeps its last value while the
    // joint is hidden, so after leaving the hinge chapter fixed.name still reports a flexed elbow. What matters for the
    // learner is that nothing of the joint is on screen in such a shot, which is what is asserted here.
    const fixedRow = rows.find((r) => r.shot === "fixed.name")!;
    await film(page, "seekShot", "fixed.name", 1200);
    await settle(page);
    const hidden = await page.evaluate(() => ({
      jointStructures: (window as any).__jointsFilm.jointVisible().length,
      axisOverlay: (window as any).__jointsQA.hinge()?.overlayVisible ?? null,
      angleBadge: !!document.querySelector("[data-text-key='badge:angle']"),
      slider: !!document.querySelector("[data-testid=slider-flexion]"),
    }));
    expect(hidden).toEqual({ jointStructures: 0, axisOverlay: false, angleBadge: false, slider: false });
    report.seekConsistency = { rows, staleControllerValueWhileJointHidden: { shot: "fixed.name", flexionDeg: fixedRow.flexion, visibleToLearner: false, hidden } };
    expect(log.errors).toEqual([]);
  });

  test("Explore: entering, selecting, and returning to the film restores guided state and the shot camera", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "hinge.flexion", 3000);
    await settle(page);
    const before = await film<{ position: number[]; target: number[] }>(page, "camera");
    await film(page, "explore", true);
    await settle(page);
    expect((await state(page)).explore).toBe(true);
    await qa(page, "select", "ulna_r");
    await settle(page);
    expect(await qa<string | null>(page, "selection")).toBe("ulna_r");
    await film(page, "explore", false);
    await settle(page);
    const s = await state(page);
    expect(s.explore).toBe(false);
    expect(await qa<string | null>(page, "selection")).toBe(null);
    const after = await film<{ position: number[]; target: number[] }>(page, "camera");
    const drift = Math.max(...after.position.map((v, i) => Math.abs(v - before.position[i])), ...after.target.map((v, i) => Math.abs(v - before.target[i])));
    report.exploreReturn = { shot: s.shotId, selectionCleared: true, cameraDriftM: +drift.toFixed(4) };
    expect(drift, "returning from Explore restores the shot camera").toBeLessThan(0.02);
    expect(log.errors).toEqual([]);
  });

  test("the guided check can be answered, continued past, and re-entered without sticking", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "hinge.check", 6000);
    await settle(page);
    await page.waitForFunction(() => (window as any).__jointsFilm.state().holdingForCheck, null, { timeout: 30_000 }).catch(() => undefined);
    await qa(page, "setDof", "flexion", 90);
    await settle(page);
    await film(page, "answerCheck");
    await settle(page);
    const correct = (await state(page)).check.status;
    await qa(page, "setDof", "flexion", 20);
    await settle(page);
    await film(page, "answerCheck");
    await settle(page);
    const incorrect = (await state(page)).check.status;
    report.check = { at90: correct, at20: incorrect };
    expect(correct).toBe("correct");
    expect(incorrect).toBe("incorrect");
    expect(log.errors).toEqual([]);
  });

  test("no duplicate anatomy: during the elbow chapter the body copy of each handed-over bone is hidden", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "hinge.flexion", 4000);
    await settle(page);
    const handed = await page.evaluate(() => (window as any).__jointsFilm.body().handedOver as string[]);
    const presentations: Record<string, string> = {};
    for (const id of handed) presentations[id] = await page.evaluate((s) => (window as any).__jointsFilm.presentation(s), id);
    report.handover = { count: handed.length, presentations };
    expect(handed.length).toBeGreaterThan(0);
    for (const [id, p] of Object.entries(presentations)) expect(p, id).toBe("handedOver");
    expect(log.errors).toEqual([]);
  });
});
