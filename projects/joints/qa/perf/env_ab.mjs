// A/B of image-based lighting: runtime PMREM (Step 11) vs baked variants. Same seek positions, pixel diffs vs live.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const OUT = "qa/visual/step12/env_ab";
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", "4178"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const shots = [["intro.title", 3500], ["fixed.detail", 6000], ["ball.shoulder", 6000], ["hinge.bones", 5000], ["hinge.support", 8000], ["hinge.knee", 7500]];
const variants = ["live", "256", "128", "64", "32"];
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const results = {};
try {
  for (const v of variants) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://localhost:4178/?qa=1&dpr=1&autoplay=0&env=${v}`);
    await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
    for (const [shot, off] of shots) {
      await page.evaluate(([s, o]) => window.__jointsFilm.seekShot(s, o), [shot, off]);
      await page.waitForFunction(() => window.__jointsQA.idle());
      await page.evaluate(() => window.__jointsQA.renderNow());
      await page.waitForTimeout(1000);
      // canvas only (captions are identical and would dilute the diff)
      const buf = await page.locator("canvas").screenshot();
      writeFileSync(`${OUT}/${shot}__${v}.png`, buf);
    }
    await page.close();
  }
  for (const [shot] of shots) {
    const ref = await sharp(`${OUT}/${shot}__live.png`).raw().toBuffer({ resolveWithObject: true });
    results[shot] = {};
    for (const v of variants.slice(1)) {
      const img = await sharp(`${OUT}/${shot}__${v}.png`).raw().toBuffer();
      let se = 0, max = 0, over8 = 0, n = 0;
      for (let i = 0; i < img.length; i += ref.info.channels) {
        for (let k = 0; k < 3; k++) { const d = img[i + k] - ref.data[i + k]; se += d * d; max = Math.max(max, Math.abs(d)); n++; }
        if (Math.max(Math.abs(img[i] - ref.data[i]), Math.abs(img[i + 1] - ref.data[i + 1]), Math.abs(img[i + 2] - ref.data[i + 2])) > 8) over8++;
      }
      const rmse = Math.sqrt(se / n);
      results[shot][v] = { psnrDb: rmse ? +(20 * Math.log10(255 / rmse)).toFixed(2) : Infinity, maxAbsDiff: max, pixelsOver8Pct: +((over8 / (n / 3)) * 100).toFixed(3) };
    }
  }
  writeFileSync("qa/reports/step12.environment_ab.json", JSON.stringify({ generatedAt: new Date().toISOString(), reference: "runtime PMREM (Step 11)", viewport: "1280x800 @1x", results }, null, 1));
  console.log(JSON.stringify(results, null, 1));
} finally {
  await browser.close();
  server.kill();
}
