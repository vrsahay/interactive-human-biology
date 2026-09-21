// Step 16C reproduction, third pass: deterministic. Open each exploration through the QA hook, confirm the session is
// live, drag on the stage, and report what the drag did to (a) the teaching motion and (b) the camera.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4196;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const report = { generatedAt: new Date().toISOString(), rows: [] };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  for (const e of explores) {
    const chapters = await page.evaluate(() => window.__jointsFilm.chapters());
    const ch = chapters.find((c) => c.id === e.chapterId);
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 500), ch.shots[1]);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    await page.evaluate((id) => window.__jointsFilm.openExplore(id), e.exploreId);
    await settle();
    const live = await page.evaluate(() => !!window.__jointsFilm.exploreState());
    const r0 = await page.evaluate(() => window.__jointsFilm.exploreState().readout);
    const c0 = await page.evaluate(() => window.__jointsFilm.camera());
    const policy = await page.evaluate(() => window.__jointsFilm.interaction());
    const orbit0 = await page.evaluate(() => window.__jointsQA.orbitEnabled ? window.__jointsQA.orbitEnabled() : "n/a");

    await page.mouse.move(700, 380);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(700 - i * 10, 380 + i * 3);
    const orbitDuring = await page.evaluate(() => window.__jointsQA.orbitEnabled ? window.__jointsQA.orbitEnabled() : "n/a");
    await page.mouse.up();
    await settle();
    const r1 = await page.evaluate(() => window.__jointsFilm.exploreState()?.readout ?? null);
    const c1 = await page.evaluate(() => window.__jointsFilm.camera());
    const row = { exploreId: e.exploreId, status: e.status, sessionLive: live, policyMode: policy.mode, orbitBefore: orbit0, orbitDuringDrag: orbitDuring, readoutBefore: r0, readoutAfter: r1, cameraMoved: +dist(c0.position, c1.position).toFixed(5) };
    report.rows.push(row);
    console.log(`\n### ${e.exploreId} (${e.status}) policy=${policy.mode}`);
    console.log(`  session live      : ${live}`);
    console.log(`  readout before    : ${JSON.stringify(r0)}`);
    console.log(`  readout after     : ${JSON.stringify(r1)}`);
    console.log(`  CAMERA MOVED      : ${row.cameraMoved}   <-- orbit during a learner drag`);
    await page.evaluate(() => window.__jointsFilm.closeExplore());
    await settle();
  }
} finally {
  writeFileSync("qa/reports/step16c.explore_drag2.json", JSON.stringify(report, null, 1));
  await browser.close();
  server.kill();
}
