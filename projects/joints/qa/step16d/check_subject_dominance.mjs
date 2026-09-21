// Step 16D §27, last check: "no panel covering the structure" / "target anatomy remains dominant".
// The label check answers "can the learner read the label". This answers the other half: is the joint site itself
// still in frame, and is it clear of the panel, at every required width.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4198;
const WIDTHS = [[1280, 800], [390, 844], [412, 844]];
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const rows = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const e of explores) {
      const ch = chapters.find((c) => c.id === e.chapterId);
      const openOn = e.status === "validated-rig" ? "hinge.axis" : ch.shots[1];
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), openOn);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      if (!(await page.getByTestId("film-explore-panel").count())) { await page.getByTestId("film-explore").click(); await settle(); }
      await page.waitForTimeout(250);
      const r = await page.evaluate((siteId) => {
        const s = window.__jointsFilm.siteOnScreen(siteId);
        const p = document.querySelector('[data-testid="film-explore-panel"]').getBoundingClientRect();
        const underPanel = !!s && s.x >= p.left && s.x <= p.right && s.y >= p.top && s.y <= p.bottom;
        // how much of the frame the panel takes, and how much room is left for the model
        return { site: siteId, inView: s ? s.inView : null, x: s ? Math.round(s.x) : null, y: s ? Math.round(s.y) : null, underPanel, panelShare: +((p.width * p.height) / (innerWidth * innerHeight)).toFixed(3), stageShare: +(1 - (p.width * p.height) / (innerWidth * innerHeight)).toFixed(3) };
      }, e.site);
      rows.push({ width: w, explore: e.exploreId, ...r });
      await page.getByTestId("film-explore-exit").click();
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
    }
  }
} finally {
  writeFileSync("qa/reports/step16d.subject_dominance.json", JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  for (const r of rows) console.log(`${String(r.width).padStart(5)} ${r.explore.padEnd(15)} site ${String(r.site).padEnd(10)} inView ${r.inView}  underPanel ${r.underPanel}  at (${r.x},${r.y})  panel ${r.panelShare}  stage ${r.stageShare}`);
  const bad = rows.filter((r) => r.inView !== true || r.underPanel);
  console.log(`\nchecks: ${rows.length}   PROBLEMS: ${bad.length}`);
  for (const r of bad) console.log(`  ${JSON.stringify(r)}`);
  await browser.close(); server.kill();
}
