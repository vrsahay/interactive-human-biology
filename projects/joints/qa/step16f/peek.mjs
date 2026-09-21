// Quick look at a few shots at one width (eyeballing only; capture_hierarchy.mjs measures).
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4221, [W, H] = (process.env.WH ?? "1280x800").split("x").map(Number);
const SHOTS = (process.env.SHOTS ?? "pivot.bones").split(",");
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1000));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  for (const id of SHOTS) {
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2500), id);
    await page.evaluate(() => window.__jointsFilm.pause());
    await page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `qa/visual/step16f/peek/${W}_${id}.png` });
  }
} finally { await browser.close(); server.kill(); }
