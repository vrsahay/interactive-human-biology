// Step 13 review: capture the shots whose captions gained a provenance note, to check the caption scrim.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4196;
mkdirSync("qa/visual/step13", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  for (const [shot, at] of [["fixed.detail", 6000], ["ball.hip", 7000], ["recap.compare", 6000]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
    await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
    await page.evaluate(([s, o]) => window.__jointsFilm.seekShot(s, o), [shot, at]);
    await page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__jointsQA.renderNow());
    writeFileSync(`qa/visual/step13/${shot}__1280x800.png`, await page.screenshot());
    console.log("captured", shot);
    await page.close();
  }
} finally { await browser.close(); server.kill(); }
