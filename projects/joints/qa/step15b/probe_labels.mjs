import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4199;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("hinge.bones", 4500));
  await page.evaluate(() => window.__jointsFilm.pause());
  await settle();
  await page.waitForTimeout(400);
  console.log("qa.labels:", JSON.stringify(await page.evaluate(() => window.__jointsQA.labels())).slice(0, 600));
  console.log("dom labels:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll(".label__title")].map((e) => e.textContent))));
} finally { await browser.close(); server.kill(); }
