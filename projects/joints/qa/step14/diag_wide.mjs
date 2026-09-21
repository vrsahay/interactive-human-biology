import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4199;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("intro.map", 1000));
  await settle();
  writeFileSync("qa/visual/step14/diag_before_explore.png", await page.screenshot());
  await page.evaluate(() => window.__jointsFilm.openExplore("explore.pivot"));
  await settle();
  // force a whole-body framing so nothing can hide off-frame
  await page.evaluate(() => window.__jointsQA.view("body", true));
  await page.evaluate(() => window.__jointsQA.renderNow());
  await page.waitForTimeout(400);
  writeFileSync("qa/visual/step14/diag_explore_wide.png", await page.screenshot());
  const st = await page.evaluate(() => {
    const s = window.__jointsQA.sceneStats();
    const skull = s.drawables.filter((d) => /skull/.test(d.name));
    return { skull: skull.map((d) => ({ name: d.name.slice(0, 40), tri: d.triangles, inFrustum: d.inFrustum, material: d.material })), visible: window.__jointsFilm.body().visible };
  });
  console.log(JSON.stringify(st, null, 1));
} finally { await browser.close(); server.kill(); }
