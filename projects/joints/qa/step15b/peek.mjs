import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const PORT = 4197;
const shots = process.argv.slice(2);
mkdirSync("qa/visual/step15b", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  for (const spec of shots) {
    const [id, off] = spec.split("@");
    await page.evaluate(([i, o]) => window.__jointsFilm.seekShot(i, Number(o || 2500)), [id, off]);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `qa/visual/step15b/${id}.png` });
    console.log("captured", id);
  }
  console.log("errors", errors);
} finally { await browser.close(); server.kill(); }
