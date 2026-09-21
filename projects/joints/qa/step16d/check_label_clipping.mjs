// Step 16D: is any site label hidden behind a panel, at every width the brief lists?
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4196;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const WIDTHS = [[1280, 800], [1440, 900], [1024, 768], [768, 1024], [412, 844], [390, 844], [320, 800]];
const rows = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const e of explores) {
      const ch = chapters.find((c) => c.id === e.chapterId);
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), ch.shots[1]);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      if (!(await page.getByTestId("film-explore-panel").count())) { await page.getByTestId("film-explore").click(); await settle(); }
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="film-explore-panel"]').getBoundingClientRect();
        // the site labels are the pills the label system lays out on the model
        const labels = [...document.querySelectorAll(".label")].map((el) => ({ text: el.textContent.trim(), r: el.getBoundingClientRect() })).filter((l) => l.r.width > 2 && l.text);
        const hidden = labels.filter((l) => l.r.left < panel.right && l.r.right > panel.left && l.r.top < panel.bottom && l.r.bottom > panel.top);
        const offscreen = labels.filter((l) => l.r.left < 0 || l.r.right > innerWidth || l.r.top < 0 || l.r.bottom > innerHeight);
        return { labels: labels.map((l) => ({ text: l.text.slice(0, 34), left: Math.round(l.r.left), right: Math.round(l.r.right) })), behindPanel: hidden.map((l) => l.text.slice(0, 34)), offscreen: offscreen.map((l) => l.text.slice(0, 34)), panelRight: Math.round(panel.right), hScroll: document.documentElement.scrollWidth > innerWidth };
      });
      rows.push({ width: w, explore: e.exploreId, ...r });
      await page.getByTestId("film-explore-exit").click();
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
    }
  }
} finally {
  writeFileSync("qa/reports/step16d.label_clipping.json", JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  const bad = rows.filter((r) => r.behindPanel.length || r.offscreen.length || r.hScroll);
  for (const r of rows) console.log(`${String(r.width).padStart(5)} ${r.explore.padEnd(15)} labels ${String(r.labels.length).padStart(2)}  behindPanel ${r.behindPanel.length}  offscreen ${r.offscreen.length}  hScroll ${r.hScroll}`);
  console.log(`\nPROBLEMS: ${bad.length}`);
  for (const r of bad) console.log(`  ${r.width} ${r.explore}: behind=${JSON.stringify(r.behindPanel)} off=${JSON.stringify(r.offscreen)} hScroll=${r.hScroll}`);
  await browser.close(); server.kill();
}
