import { writeFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const results: Record<string, unknown> = {};

/** The Step-14 panels put new text over the rendered body; it is measured against the frame, not assumed. */
const NEW_TEXT =
  ".film-explore__title, .film-explore__status, .film-explore__instruction, .film-explore__readout, .film-explore__explanation, .film-explore__keys, .film-explore .film-btn, .film-explore__teaching, " +
  // Step 16B: the exploration task and its confirmation are new learner-facing text and join the measured sweep
  ".film-explore__task, .film-explore__task-label, .film-explore__done, " +
  ".film-recall__progress, .film-recall__question, .film-recall__prompt, .film-recall__option, .film-recall__feedback, .film-recall .film-btn, .film-explore-hint";

const STATES = [
  { name: "explore-fixed", shot: "fixed.name", open: "explore" },
  { name: "explore-pivot", shot: "pivot.rotate", open: "explore" },
  { name: "explore-ball", shot: "ball.move", open: "explore" },
  { name: "explore-hinge", shot: "hinge.flexion", open: "explore" },
  { name: "recall-question", shot: "recall.open", open: "recall" },
  { name: "recall-answered", shot: "recall.open", open: "recall-answered" },
] as const;

async function enter(page: Page, state: (typeof STATES)[number]) {
  await film(page, "seekShot", state.shot, 2000);
  await film(page, "pause");
  await settle(page);
  if (state.open === "explore") {
    await page.getByTestId("film-explore").click();
    await expect(page.getByTestId("film-explore-panel")).toBeVisible();
  } else {
    await page.getByTestId("film-recall-start").click();
    await expect(page.getByTestId("film-recall")).toBeVisible();
    if (state.open === "recall-answered") {
      // one wrong then the right answer: the cross state and the tick state are both on screen
      await page.getByTestId("film-recall-option-hinge").click();
      await page.getByTestId("film-recall-option-fixed").click();
    }
  }
  await settle(page);
  await page.waitForTimeout(700);
}

const leave = async (page: Page) => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
};

test.describe("Step 14 accessibility: the new panels", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step14.accessibility.json"), JSON.stringify({ generatedAt: new Date().toISOString(), tags: TAGS, results }, null, 1)));

  for (const [label, viewport] of [["desktop", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]] as const) {
    test(`axe (${label}): every explore panel and both recall states`, async ({ page }) => {
      test.setTimeout(300_000);
      const log = trackConsole(page);
      await page.setViewportSize(viewport);
      await openFilm(page);
      const summary: Record<string, number> = {};
      for (const s of STATES) {
        await enter(page, s);
        const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        results[`${label}:${s.name}`] = {
          violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 8) })),
          incomplete: r.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })),
          passes: r.passes.length,
        };
        summary[s.name] = r.violations.length;
        await leave(page);
      }
      expect(summary, JSON.stringify(results, null, 1)).toEqual(Object.fromEntries(STATES.map((s) => [s.name, 0])));
      expect(log.errors).toEqual([]);
    });
  }

  test("measured text contrast of the explore and recall panels over the rendered scene", async ({ page }) => {
    test.setTimeout(420_000);
    const lum = (r: number, g: number, b: number) => {
      const c = [r, g, b].map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const rows: Record<string, unknown>[] = [];
    const sharp = (await import("sharp")).default;
    for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      await openFilm(page);
      for (const s of STATES) {
        await enter(page, s);
        const els = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => el.offsetParent !== null && el.textContent!.trim()).map((el, i) => {
          el.dataset.contrastIdx = String(i);
          const rects: DOMRect[] = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const parent = n.parentElement!;
            if (!n.textContent!.trim() || parent.closest(".sr-only")) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            rects.push(...[...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0));
          }
          const r = rects.length ? rects.reduce((u, q) => new DOMRect(Math.min(u.left, q.left), Math.min(u.top, q.top), Math.max(u.right, q.right) - Math.min(u.left, q.left), Math.max(u.bottom, q.bottom) - Math.min(u.top, q.top))) : el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          let alpha = 1;
          for (let p: HTMLElement | null = el; p; p = p.parentElement) alpha *= parseFloat(getComputedStyle(p).opacity);
          const m = cs.color.match(/[0-9.]+/g)!.map(Number);
          return { cls: el.className, text: el.textContent!.trim().slice(0, 34), x: r.left, y: r.top, w: r.width, h: r.height, color: [m[0], m[1], m[2], (m[3] ?? 1) * alpha], px: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight) };
        }), NEW_TEXT);
        await page.addStyleTag({ content: "[data-contrast-idx], [data-contrast-idx] * { color: transparent !important; text-shadow: none !important; }" }).then((h) => h.evaluate((n) => ((n as HTMLElement).id = "contrast-hide")));
        const buf = await page.screenshot();
        await page.evaluate(() => document.getElementById("contrast-hide")?.remove());
        const img = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
        for (const e of els) {
          const x0 = Math.max(0, Math.floor(e.x));
          const y0 = Math.max(0, Math.floor(e.y));
          const x1 = Math.min(img.info.width - 1, Math.ceil(e.x + e.w));
          const y1 = Math.min(img.info.height - 1, Math.ceil(e.y + e.h));
          const ls: number[] = [];
          for (let y = y0; y <= y1; y += 2) {
            for (let x = x0; x <= x1; x += 2) {
              const o = (y * img.info.width + x) * img.info.channels;
              ls.push(lum(img.data[o], img.data[o + 1], img.data[o + 2]));
            }
          }
          if (!ls.length) continue;
          ls.sort((a, b) => a - b);
          const [r, g, b, a] = e.color;
          const toGray = (L: number) => 255 * (L <= 0.0031308 ? L * 12.92 : 1.055 * Math.pow(L, 1 / 2.4) - 0.055);
          const lightOnDark = lum(r, g, b) > 0.5;
          const bgL = lightOnDark ? ls[Math.floor(ls.length * 0.95)] : ls[Math.floor(ls.length * 0.05)];
          const bgGray = toGray(bgL);
          const blend = (c: number) => c * a + bgGray * (1 - a);
          const tL = lum(blend(r), blend(g), blend(b));
          const ratio = (Math.max(tL, bgL) + 0.05) / (Math.min(tL, bgL) + 0.05);
          const large = e.px >= 24 || (e.px >= 18.66 && e.weight >= 700);
          rows.push({ state: s.name, vp: `${vp.width}x${vp.height}`, selector: String(e.cls).split(" ")[0], text: e.text, px: e.px, large, ratio: +ratio.toFixed(2), required: large ? 3 : 4.5 });
        }
        await leave(page);
      }
    }
    const failing = rows.filter((r) => (r.ratio as number) < (r.required as number));
    results.contrast = { method: "same as Step 12: glyphs hidden, frame captured, 95th-percentile background luminance under each text box, text colour alpha-composited; WCAG 1.4.3", rows, failing };
    expect(rows.length, "no panel text was measured").toBeGreaterThan(20);
    expect(failing, JSON.stringify(failing, null, 1)).toEqual([]);
  });
});
