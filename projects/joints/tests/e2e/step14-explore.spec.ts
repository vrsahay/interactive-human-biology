import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};

/** Shot to sit on for each joint chapter, and the drag that should move it. */
const JOINTS = [
  { name: "fixed", shot: "fixed.name", explore: "explore.fixed", status: "teaching-simulation", drag: [140, 0] },
  { name: "pivot", shot: "pivot.rotate", explore: "explore.pivot", status: "teaching-simulation", drag: [140, 0] },
  { name: "ball", shot: "ball.move", explore: "explore.ball", status: "teaching-simulation", drag: [-150, -90] },
  { name: "hinge", shot: "hinge.flexion", explore: "explore.hinge", status: "validated-rig", drag: [0, 0] },
] as const;

type ExploreState = { exploreId: string; status: string; teaching: boolean; dofId: string | null; readout: { primary: number; secondary: number | null; atLimit: boolean }; displacedGroups: string[] };
const exploreState = (page: Page) => film<ExploreState | null>(page, "exploreState");

async function dragStage(page: Page, dx: number, dy: number) {
  const box = (await page.locator(".film-stage").boundingBox())!;
  const cx = box.x + box.width * 0.55;
  const cy = box.y + box.height * 0.45;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy + dy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(350);
}

test.describe("Step 14 explore: every joint category can be tried", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step14.explore.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  for (const j of JOINTS) {
    test(`${j.name}: entry point, movement, reset, exit - and its status is stated`, async ({ page }) => {
      test.setTimeout(120_000);
      const log = trackConsole(page);
      await openFilm(page);
      await film(page, "seekShot", j.shot, 2000);
      await settle(page);

      // 1. every joint chapter offers its own explore, named for the joint
      const cta = page.getByTestId("film-explore");
      await expect(cta).toHaveText("Explore this joint");
      await cta.click();
      await expect(page.getByTestId("film-explore-panel")).toBeVisible();
      await settle(page);

      const opened = (await exploreState(page))!;
      expect(opened.exploreId).toBe(j.explore);

      // 2. the honesty status is always on screen, and only the elbow may claim a validated rig
      const status = page.getByTestId("film-explore-status");
      await expect(status).toHaveAttribute("data-status", j.status);
      expect(opened.teaching).toBe(j.status === "teaching-simulation");
      if (j.name === "hinge") {
        expect(opened.dofId, "the hinge explore drives the validated DOF").toBe("flexion");
        expect(opened.displacedGroups, "a validated rig never displaces body geometry").toEqual([]);
      } else {
        expect(opened.dofId).toBeNull();
      }

      // 3. the instruction is specific to this joint, not "drag to explore"
      const instruction = (await page.getByTestId("film-explore-instruction").textContent())!;
      expect(instruction.toLowerCase()).not.toContain("drag to explore");

      // 4. it moves: by drag for a teaching simulation, by the validated control for the rig
      let moved: number;
      if (j.name === "hinge") {
        await qa(page, "setDof", "flexion", 70);
        await page.waitForTimeout(250);
        moved = (await exploreState(page))!.readout.primary;
        expect(Math.round(moved)).toBe(70);
      } else {
        await dragStage(page, j.drag[0], j.drag[1]);
        const after = (await exploreState(page))!;
        moved = after.readout.primary;
        expect(after.displacedGroups.length, "a teaching simulation moves whole render groups").toBeGreaterThan(0);
        if (j.name === "fixed") {
          // "Fixed" must feel fixed: a large drag produces a token movement that springs back.
          expect(Math.abs(moved), "a fixed joint barely moves").toBeLessThanOrEqual(0.5);
        } else {
          expect(Math.abs(moved), "the joint moved").toBeGreaterThan(5);
        }
      }

      // 5. reset returns to the teaching state
      await page.getByTestId("film-explore-reset").click();
      await page.waitForTimeout(300);
      expect(Math.abs((await exploreState(page))!.readout.primary)).toBeLessThan(0.01);

      // 6. leaving restores the lesson: no session, no displaced geometry, same shot
      await page.getByTestId("film-explore-exit").click();
      await settle(page);
      expect(await exploreState(page)).toBeNull();
      expect((await film<{ shotId: string }>(page, "state")).shotId).toBe(j.shot);
      await expect(page.getByTestId("film-explore-panel")).toHaveCount(0);

      report[j.name] = { explore: opened.exploreId, status: j.status, instruction, movedTo: moved };
      expect(log.errors).toEqual([]);
    });
  }

  test("exactly one explore control and one set of joint controls are on screen at a time", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "hinge.flexion", 2000);
    await settle(page);
    await page.getByTestId("film-explore").click();
    await expect(page.getByTestId("film-explore-panel")).toBeVisible();
    await settle(page);
    // the lesson's own joint panel must stand down while the explore panel owns the interaction
    await expect(page.getByTestId("film-interact")).toHaveCount(0);
    await expect(page.getByTestId("slider-flexion")).toHaveCount(1);
    await expect(page.getByTestId("film-caption")).toHaveCount(0);
    await expect(page.getByTestId("film-explore-panel")).toHaveCount(1);
    report.noDuplicates = { interactPanels: 0, sliders: 1, captions: 0 };
    expect(log.errors).toEqual([]);
  });

  test("keyboard alone can move, reset and leave an exploration", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "pivot.rotate", 2000);
    await settle(page);
    await page.getByTestId("film-explore").click();
    await expect(page.getByTestId("film-explore-panel")).toBeVisible();
    await settle(page);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    const stepped = (await exploreState(page))!.readout.primary;
    expect(stepped, "arrow keys move the joint").toBeGreaterThan(0);

    await page.keyboard.press("r");
    await page.waitForTimeout(250);
    expect(Math.abs((await exploreState(page))!.readout.primary)).toBeLessThan(0.01);

    await page.keyboard.press("Escape");
    await settle(page);
    expect(await exploreState(page)).toBeNull();
    report.keyboard = { steppedTo: stepped, resetByKey: true, exitedByEscape: true };
    expect(log.errors).toEqual([]);
  });

  test("an exploration never changes where the lesson is", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "ball.move", 3000);
    await settle(page);
    const before = await film<{ shotId: string; timeMs: number; chapterId: string }>(page, "state");
    await page.getByTestId("film-explore").click();
    await expect(page.getByTestId("film-explore-panel")).toBeVisible();
    await dragStage(page, -140, -80);
    await page.getByTestId("film-explore-exit").click();
    await settle(page);
    const after = await film<{ shotId: string; timeMs: number; chapterId: string }>(page, "state");
    expect(after.shotId).toBe(before.shotId);
    expect(after.chapterId).toBe(before.chapterId);
    expect(Math.abs(after.timeMs - before.timeMs), "the film clock did not move").toBeLessThan(50);
    // and the displaced geometry is back where the delivery put it
    expect((await film<{ groups: number }>(page, "bodyDelivery")).groups).toBeGreaterThan(0);
    report.lessonUntouched = { shot: after.shotId, chapter: after.chapterId, clockDriftMs: Math.round(after.timeMs - before.timeMs) };
    expect(log.errors).toEqual([]);
  });
});
