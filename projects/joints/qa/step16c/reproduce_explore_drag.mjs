// Step 16C reproduction, second pass: a REAL pointer drag, the way a learner moves the joint - not the QA step API.
// Records the camera and every render group before and after.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4196;
mkdirSync("qa/visual/step16c", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const report = { generatedAt: new Date().toISOString(), rows: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const cam = () => page.evaluate(() => window.__jointsFilm.camera());
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  for (const [exploreId, openAt] of [["explore.ball", "ball.task"], ["explore.pivot", "pivot.task"], ["explore.fixed", "fixed.task"], ["explore.hinge", "hinge.knee"]]) {
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 500), openAt);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    if (!(await page.getByTestId("film-explore-panel").count())) {
      await page.getByTestId("film-explore").click();
      await settle();
    }
    await page.screenshot({ path: `qa/visual/step16c/${exploreId}_before.png` });
    const camBefore = await cam();
    const before = await page.evaluate(() => window.__jointsFilm.bodyGroupWorldState());
    const controls = await page.evaluate(() => ({ enabled: window.__jointsQA.controlsEnabled?.() ?? null }));

    // a real learner drag across the middle of the stage
    await page.mouse.move(640, 400);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) await page.mouse.move(640 - i * 9, 400 + i * 4);
    await page.screenshot({ path: `qa/visual/step16c/${exploreId}_mid.png` });
    await page.mouse.up();
    await settle();
    await page.screenshot({ path: `qa/visual/step16c/${exploreId}_after.png` });

    const camAfter = await cam();
    const after = await page.evaluate(() => window.__jointsFilm.bodyGroupWorldState());
    const declared = new Set(await page.evaluate(() => window.__jointsFilm.exploreState()?.displacedGroups ?? []));
    const moved = Object.keys(before).filter((g) => after[g] && before[g].bbox && after[g].bbox && Math.max(...before[g].bbox.map((v, i) => Math.abs(v - after[g].bbox[i]))) > 1e-4);
    const row = {
      exploreId,
      controls,
      cameraMoved: +dist(camBefore.position, camAfter.position).toFixed(5),
      targetMoved: +dist(camBefore.target, camAfter.target).toFixed(5),
      declaredTargets: [...declared],
      groupsThatMoved: moved,
      unexpected: moved.filter((g) => !declared.has(g)),
      readout: await page.evaluate(() => window.__jointsFilm.exploreState()?.readout ?? null),
    };
    report.rows.push(row);
    console.log(`\n### ${exploreId}`);
    console.log(`  camera position moved : ${row.cameraMoved}`);
    console.log(`  camera target moved   : ${row.targetMoved}`);
    console.log(`  readout               : ${JSON.stringify(row.readout)}`);
    console.log(`  groups that moved     : ${moved.length} (${row.unexpected.length} unexpected)`);
    await page.evaluate(() => window.__jointsFilm.closeExplore());
    await settle();
  }
} finally {
  writeFileSync("qa/reports/step16c.explore_drag.json", JSON.stringify(report, null, 1));
  await browser.close();
  server.kill();
}
