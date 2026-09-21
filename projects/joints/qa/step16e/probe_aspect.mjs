// Why does the camera sit further back on a phone than the fit maths predicts? Read the live camera.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4203;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.bones", 600));
  await page.evaluate(() => window.__jointsFilm.pause());
  await settle();
  for (const wait of [0, 600, 1500, 3000]) {
    if (wait === 0) { await page.getByTestId("film-explore").click(); }
    await page.waitForTimeout(wait);
    const c = await page.evaluate(() => { const c = window.__jointsFilm.camera(); return { d: +Math.hypot(...c.position.map((v, i) => v - c.target[i])).toFixed(3), mode: c.mode, preset: c.preset }; });
    console.log(`t+${wait}ms`, JSON.stringify(c));
  }
  const q = await page.evaluate(() => ({ canvas: [document.querySelector("canvas").clientWidth, document.querySelector("canvas").clientHeight], idle: window.__jointsQA.idle() }));
  console.log(JSON.stringify(q));
} finally { await browser.close(); server.kill(); }
