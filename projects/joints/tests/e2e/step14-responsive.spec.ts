import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};

/**
 * The Step-14 panels are new furniture in a layout that used to assume a fixed control-row height. On a phone the control
 * row wraps when a chapter offers two actions, and the first version of this step let the caption and the panels sit under
 * the player because of it. These tests hold the panels clear of the controls at phone widths, however tall the row grows.
 */
const CASES = [
  { shot: "recall.open", open: null },
  { shot: "hinge.check", open: null },
  { shot: "recall.open", open: "recall" },
  { shot: "fixed.name", open: "explore" },
  { shot: "pivot.rotate", open: "explore" },
  { shot: "ball.move", open: "explore" },
  { shot: "hinge.flexion", open: "explore" },
] as const;

test.describe("Step 14 responsive: the new panels never sit under the controls", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step14.responsive.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  for (const width of [390, 412]) {
    test(`every panel clears the player at ${width}px`, async ({ page }) => {
      test.setTimeout(240_000);
      const log = trackConsole(page);
      await page.setViewportSize({ width, height: 844 });
      await openFilm(page);

      const rows: Record<string, unknown>[] = [];
      for (const c of CASES) {
        await film(page, "seekShot", c.shot, 2000);
        await film(page, "pause");
        await settle(page);
        if (c.open === "recall") {
          await page.getByTestId("film-recall-start").click();
          await expect(page.getByTestId("film-recall")).toBeVisible();
        }
        if (c.open === "explore") {
          await page.getByTestId("film-explore").click();
          await expect(page.getByTestId("film-explore-panel")).toBeVisible();
        }
        await settle(page);
        await page.waitForTimeout(300);

        const m = await page.evaluate(() => {
          const box = (sel: string) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const b = el.getBoundingClientRect();
            return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
          };
          type Box = { top: number; bottom: number; left: number; right: number };
          const hits = (a: Box | null, b: Box | null) => !!a && !!b && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
          const player = box(".film-player");
          const panels: Record<string, Box | null> = {
            caption: box("[data-testid=film-caption]"),
            interact: box("[data-testid=film-interact]"),
            explore: box("[data-testid=film-explore-panel]"),
            recall: box("[data-testid=film-recall]"),
          };
          const under: string[] = [];
          const clipped: string[] = [];
          for (const [name, b] of Object.entries(panels)) {
            if (!b) continue;
            if (hits(b, player)) under.push(name);
            if (b.top < 0 || b.bottom > innerHeight || b.left < 0 || b.right > innerWidth) clipped.push(name);
          }
          const small: string[] = [];
          for (const el of document.querySelectorAll("[data-testid=film-explore-panel] button, [data-testid=film-recall] button")) {
            const b = el.getBoundingClientRect();
            if (b.height < 44 || b.width < 44) small.push((el as HTMLElement).dataset.testid ?? el.textContent!.trim());
            if (b.bottom > innerHeight || b.right > innerWidth) clipped.push((el as HTMLElement).dataset.testid ?? el.textContent!.trim());
          }
          return { playerHeight: Math.round(player!.bottom - player!.top), under, clipped, small, horizontalScroll: document.documentElement.scrollWidth > innerWidth, open: Object.entries(panels).filter(([, b]) => b).map(([k]) => k) };
        });

        expect.soft(m.under, `${c.shot} ${c.open ?? "-"}: panels under the player`).toEqual([]);
        expect.soft(m.clipped, `${c.shot} ${c.open ?? "-"}: clipped off screen`).toEqual([]);
        expect.soft(m.small, `${c.shot} ${c.open ?? "-"}: controls below 44px`).toEqual([]);
        expect.soft(m.horizontalScroll, `${c.shot} ${c.open ?? "-"}: horizontal scroll`).toBe(false);
        rows.push({ shot: c.shot, ...m, opened: c.open });

        if (c.open) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }
      }
      report[`w${width}`] = rows;
      expect(log.errors).toEqual([]);
    });
  }

  test("the retrieval sequence belongs to its chapter: Escape and leaving the chapter both end it", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "recall.open", 2000);
    await film(page, "pause");
    await settle(page);

    await page.getByTestId("film-recall-start").click();
    await expect(page.getByTestId("film-recall")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("film-recall")).toHaveCount(0);
    // leaving the challenge is not a dead end: the film carries on to the body map
    expect((await film<{ playing: boolean }>(page, "state")).playing).toBe(true);
    await film(page, "pause");
    await expect(page.getByTestId("film-recall-start")).toBeVisible();

    // and a question must not follow the learner into a chapter about a different part of the body
    await page.getByTestId("film-recall-start").click();
    await expect(page.getByTestId("film-recall")).toBeVisible();
    await film(page, "seekShot", "pivot.rotate", 2000);
    await film(page, "pause");
    await settle(page);
    await expect(page.getByTestId("film-recall")).toHaveCount(0);
    report.recallScope = { endedByEscape: true, filmResumes: true, endedByLeavingChapter: true };
    expect(log.errors).toEqual([]);
  });
});
