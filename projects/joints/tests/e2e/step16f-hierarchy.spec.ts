import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

/**
 * Step 16F: the teaching text hierarchy.
 *
 *   top left   the chapter line, then the current topic (medium, no card)
 *   centre     the anatomy
 *   bottom     the spoken sentence
 *
 * The topic used to be a 46-54 px heading on a card in the lower left (an opaque box on a phone), competing with the
 * anatomy. These checks keep it where it now is, at the size it now is, off the anatomy and off everything else.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};
const SHOTS = ["hook.shoulder", "fixed.bones", "pivot.travel", "ball.name", "hinge.flexion", "compare.together", "map.all"];

test.describe("Step 16F text hierarchy", () => {
  test.afterAll(() => writeFileSync(join(ROOT, `qa/reports/${process.env.QA_STEP ?? "step16f"}.hierarchy_e2e.json`), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("the current topic sits top left under the chapter line, medium sized, with no card, clear of the anatomy, the labels and the subtitle", async ({ page }) => {
    test.setTimeout(300_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [390, 844], [320, 844]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const id of SHOTS) {
        await film(page, "seekShot", id, 2500);
        await film(page, "pause");
        await settle(page);
        await page.waitForTimeout(1100);
        const r = await page.evaluate(() => {
          const box = (el: Element | null) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 1 ? b : null; };
          const hit = (a: DOMRect | null, b: DOMRect | null) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          const painted = (el: Element) => { for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false; } return true; };
          const cap = document.querySelector('[data-testid="film-caption"]')!;
          const lead = box(cap);
          const title = cap.querySelector(".film-caption__title");
          const chapterEl = document.querySelector('[data-testid="film-chapter"]')!;
          const chapter = box(chapterEl)!;
          const firstTop = Math.min(...[...document.querySelectorAll(".film-top > p")].map((e) => box(e)).filter((b): b is DOMRect => !!b).map((b) => b.left));
          // Nothing is drawn over the chapter line. The heading's shade is pointer-events: none, so a hit test cannot see it
          // (it once covered the phone's chapter line and icons at 0.88 and no hit test noticed): compare the stacking order.
          const z = (sel: string) => Number(getComputedStyle(document.querySelector(sel)!).zIndex);
          const labels = [...document.querySelectorAll(".label")].filter(painted).map((e) => box(e));
          return {
            top: lead ? Math.round(lead.top) : null,
            left: lead ? Math.round(lead.left) : null,
            belowChapter: !!lead && lead.top >= chapter.bottom - 1,
            aligned: !!lead && Math.abs(lead.left - firstTop) <= 4,
            titlePx: title ? parseFloat(getComputedStyle(title).fontSize) : null,
            cardBackground: getComputedStyle(cap).backgroundColor,
            chapterOnTop: z(".film-lead") < z(".film-top"),
            overSubtitle: hit(lead, box(document.querySelector('[data-testid="film-subtitle"]'))),
            overLabels: labels.filter((l) => hit(lead, l)).length,
            inViewport: !!lead && lead.left >= 0 && lead.right <= innerWidth + 0.5 && lead.bottom <= innerHeight,
            hScroll: document.documentElement.scrollWidth > innerWidth,
          };
        });
        rows.push({ width: w, shot: id, ...r });
        const where = `${w}x${h} ${id}`;
        expect(r.belowChapter, `${where}: the topic is not under the chapter line`).toBe(true);
        expect(r.aligned, `${where}: the topic is not left-aligned with the top bar`).toBe(true);
        expect(r.top!, `${where}: the topic is not at the top`).toBeLessThan(h * 0.15);
        expect(r.cardBackground, `${where}: the topic sits in a box`).toBe("rgba(0, 0, 0, 0)");
        expect(r.chapterOnTop, `${where}: something is drawn over the chapter line`).toBe(true);
        expect(r.overSubtitle, `${where}: the topic overlaps the spoken sentence`).toBe(false);
        expect(r.overLabels, `${where}: a site label is under the topic`).toBe(0);
        expect(r.inViewport, `${where}: the topic is clipped`).toBe(true);
        expect(r.hScroll, `${where}: horizontal scroll`).toBe(false);
        if (r.titlePx !== null) {
          // medium: about 28-36 px on a desktop, smaller on a phone, and never the old 46-54 px slide heading
          if (w >= 1280) expect(r.titlePx, `${where}: heading size`).toBeGreaterThanOrEqual(28);
          expect(r.titlePx, `${where}: heading size`).toBeLessThanOrEqual(w >= 900 ? 36 : 24);
        }
      }
    }
    report.hierarchy = rows;
    expect(log.errors).toEqual([]);
  });

  test("the caption keeps every key, string and provenance it had - only its place changed", async ({ page }) => {
    await openFilm(page);
    await film(page, "seekShot", "fixed.name", 2500);
    await film(page, "pause");
    await settle(page);
    const cap = page.getByTestId("film-caption");
    await expect(cap).toHaveAttribute("data-shot", "fixed.name");
    const text = cap.locator(".film-caption__text");
    await expect(text).toHaveAttribute("data-text-key", "fixed.text");
    await expect(text).toHaveAttribute("data-provenance", "draft-enrichment");
    // the caption and the teaching-view status share the lead, in reading order
    const order = await page.evaluate(() => [...document.querySelector(".film-lead")!.children].map((c) => c.getAttribute("data-testid")));
    expect(order[0]).toBe("film-caption");
  });
});
