// Reproduce the capture run's sequence (previous shot, then the one that overlapped) and sample over time.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4224;
const [W, H] = (process.env.WH ?? "320x844").split("x").map(Number);
const SEQ = (process.env.SEQ ?? "recall.open,map.all").split(",");
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1000));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: Number(process.env.START_W ?? W), height: Number(process.env.START_H ?? H) }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.setViewportSize({ width: W, height: H });
  for (const id of SEQ) {
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2500), id);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    for (const t of [0, 400, 1100, 2500]) {
      if (t) await page.waitForTimeout(t === 400 ? 400 : t === 1100 ? 700 : 1400);
      const r = await page.evaluate(() => ({ reserved: window.__jointsFilm.labelReserved(), stats: window.__jointsFilm.labelStats(), fixed: [...document.querySelectorAll(".label")].filter((e) => /Fixed/.test(e.textContent)).map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; }) }));
      console.log(id, `t+${t}`, JSON.stringify(r));
    }
  }
} finally { await browser.close(); server.kill(); }
