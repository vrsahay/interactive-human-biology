// Step 15B: find a framing for the pivot chapter in which a learner can actually see two bones, one on the other.
// Read-only: it drives the camera through the QA hook and screenshots. Nothing is written except PNGs.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const PORT = 4198;
mkdirSync("qa/visual/step15b/pivot_trials", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const TRIALS = [
  { name: "backRight_e10_s25", view: "backRight", elevation: 0.1, scale: 2.5 },
  { name: "backRight_e30_s25", view: "backRight", elevation: 0.3, scale: 2.5 },
  { name: "backRight_e10_s32", view: "backRight", elevation: 0.1, scale: 3.2 },
  { name: "right_e10_s25", view: "right", elevation: 0.1, scale: 2.5 },
  { name: "right_e25_s30", view: "right", elevation: 0.25, scale: 3.0 },
  { name: "left_e15_s28", view: "left", elevation: 0.15, scale: 2.8 },
  { name: "backRight_e00_s20", view: "backRight", elevation: 0, scale: 2.0 },
  { name: "frontLeft_e10_s28", view: "frontLeft", elevation: 0.1, scale: 2.8 },
];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("pivot.bones", 4000));
  await page.evaluate(() => window.__jointsFilm.pause());
  await settle();
  for (const t of TRIALS) {
    await page.evaluate((p) => window.__jointsQA.viewSite({ site: "pivot.upper_neck", ...p }), t);
    await settle();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `qa/visual/step15b/pivot_trials/${t.name}.png` });
    console.log("captured", t.name);
  }
} finally { await browser.close(); server.kill(); }
