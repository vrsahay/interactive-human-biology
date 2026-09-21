// Step 16B: find a framing for the shoulder in which the rounded head of the upper-arm bone AND the hollow it sits in
// are both readable. Read-only against the existing build: drives the camera through the QA hook and screenshots.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const PORT = 4199;
const OUT = "qa/visual/step16b/ball_trials";
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const TRIALS = [
  { name: "frontRight_e10_s29_current", view: "frontRight", elevation: 0.1, scale: 2.9 },
  { name: "frontRight_e30_s22", view: "frontRight", elevation: 0.3, scale: 2.2 },
  { name: "front_e20_s24", view: "front", elevation: 0.2, scale: 2.4 },
  { name: "frontRight_e45_s20", view: "frontRight", elevation: 0.45, scale: 2.0 },
  { name: "right_e25_s22", view: "right", elevation: 0.25, scale: 2.2 },
  { name: "backRight_e25_s22", view: "backRight", elevation: 0.25, scale: 2.2 },
  { name: "frontLeft_e20_s22", view: "frontLeft", elevation: 0.2, scale: 2.2 },
  { name: "front_e40_s20", view: "front", elevation: 0.4, scale: 2.0 },
  { name: "frontRight_e20_s18", view: "frontRight", elevation: 0.2, scale: 1.8 },
  { name: "frontRight_e60_s20", view: "frontRight", elevation: 0.6, scale: 2.0 },
];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("ball.shoulder", 4000));
  await page.evaluate(() => window.__jointsFilm.pause());
  await settle();
  for (const t of TRIALS) {
    await page.evaluate((p) => window.__jointsQA.viewSite({ site: "ball_socket.shoulder_right", ...p }), t);
    await settle();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${t.name}.png` });
    console.log("captured", t.name);
  }
} finally { await browser.close(); server.kill(); }
