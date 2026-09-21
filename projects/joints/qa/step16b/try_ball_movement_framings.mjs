// Step 16B: a wider shoulder framing for the movement beat - the arcs and the upper arm must both stay in frame.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const PORT = 4197;
const OUT = "qa/visual/step16b/ball_trials";
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const TRIALS = [
  { name: "move_front_e30_s40", view: "front", elevation: 0.3, scale: 4.0 },
  { name: "move_front_e25_s50", view: "front", elevation: 0.25, scale: 5.0 },
  { name: "move_frontRight_e25_s45", view: "frontRight", elevation: 0.25, scale: 4.5 },
  { name: "move_front_e35_s34", view: "front", elevation: 0.35, scale: 3.4 },
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
