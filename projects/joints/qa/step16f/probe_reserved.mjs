import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4223;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1000));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 320), height: Number(process.env.H ?? 844) }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2500), process.env.SHOT ?? "map.all");
  await page.evaluate(() => window.__jointsFilm.pause());
  await page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  console.log(JSON.stringify(await page.evaluate(() => ({ reserved: window.__jointsFilm.labelReserved(), lead: !!document.querySelector(".film-lead"), cap: document.querySelector('[data-testid="film-caption"]')?.getBoundingClientRect(), labels: [...document.querySelectorAll(".label")].map((e) => { const b = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; }) }))));
} finally { await browser.close(); server.kill(); }
