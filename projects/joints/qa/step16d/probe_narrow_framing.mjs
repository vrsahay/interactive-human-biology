// Why is the target so much smaller on a narrow viewport? Measure the same shot at several widths.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4199;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const WIDTHS = [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [412, 844], [390, 844], [320, 800]];
const SHOTS = ["fixed.bones", "pivot.rotate", "ball.move", "map.all"];
const rows = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const id of SHOTS) {
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 900), id);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      const r = await page.evaluate(() => {
        const ids = window.__jointsFilm.body().highlighted;
        const b = ids && ids.length ? window.__jointsFilm.bodyScreenBounds(ids) : null;
        const c = window.__jointsFilm.camera();
        const dist = Math.hypot(...c.position.map((v, i) => v - c.target[i]));
        return { highlighted: ids ? ids.length : 0, w: b ? +b.width.toFixed(3) : null, h: b ? +b.height.toFixed(3) : null, off: b ? b.offscreen : null, preset: c.preset, dist: +dist.toFixed(3) };
      });
      rows.push({ width: w, height: h, shot: id, ...r });
    }
  }
} finally {
  writeFileSync("qa/reports/step16d.narrow_framing.json", JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  for (const r of rows) console.log(`${String(r.width).padStart(5)}x${r.height}  ${r.shot.padEnd(14)} preset ${String(r.preset).padEnd(9)} camDist ${String(r.dist).padStart(7)}  target w ${r.w} h ${r.h}  offCorners ${r.off}`);
  await browser.close(); server.kill();
}
