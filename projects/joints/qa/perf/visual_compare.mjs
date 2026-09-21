// Phase V: before/after captures of the 3D canvas (captions excluded) for every chapter, Step-11 build vs Step-12 tiers.
// node qa/perf/visual_compare.mjs  -> qa/visual/step12/tradeoff/*.png + qa/reports/step12.visual_tradeoff.json
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const STEP = process.env.VC_STEP ?? "step12";
// VC_HIDE_LABELS=1: hide the DOM label overlay in BOTH builds, so the comparison is the rendered 3D alone
// (label styling changed in Step 12 for contrast, which otherwise shows up inside the render region).
const HIDE_LABELS = process.env.VC_HIDE_LABELS === "1";
// VC_CANVAS_ONLY=1: hide every DOM overlay in BOTH builds (header, captions, player, labels and the scrim pseudo-elements),
// so the comparison is the rendered canvas alone. Needed because the Step-12 UI chrome does not exist in the Step-11 build.
const CANVAS_ONLY = process.env.VC_CANVAS_ONLY === "1";
const SUFFIX = CANVAS_ONLY ? ".canvas" : HIDE_LABELS ? ".nolabels" : "";
const OUT = `qa/visual/${STEP}/tradeoff${CANVAS_ONLY ? "-canvas" : HIDE_LABELS ? "-nolabels" : ""}`;
mkdirSync(OUT, { recursive: true });
const servers = [spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "qa/perf/baseline-dist", "4181"], { stdio: "ignore" }), spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", "4182"], { stdio: "ignore" })];
await new Promise((r) => setTimeout(r, 1000));
const SHOTS = [["intro.title", 3500], ["intro.map", 6000], ["fixed.detail", 6000], ["pivot.rotate", 6500], ["ball.shoulder", 6000], ["ball.hip", 7000], ["hinge.source", 6000], ["hinge.bones", 5000], ["hinge.flexion", 9000], ["hinge.support", 8000], ["hinge.knee", 7500], ["recap.pullback", 7000], ["recap.compare", 6000]];
const VARIANTS = [["step11", "http://localhost:4181/?qa=1&dpr=1&autoplay=0"], ["high", "http://localhost:4182/?qa=1&dpr=1&autoplay=0&quality=high"], ["medium", "http://localhost:4182/?qa=1&dpr=1&autoplay=0&quality=medium"], ["low", "http://localhost:4182/?qa=1&dpr=1&autoplay=0&quality=low"]];
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const results = {};
const settle = async (page) => {
  await page.waitForFunction(() => window.__jointsQA.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
  await page.evaluate(() => window.__jointsQA.renderNow());
};
try {
  for (const [variant, url] of VARIANTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(url);
    await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
    // Let background stages finish (the steady state a viewer sees at each chapter), then capture.
    await page.waitForTimeout(3000);
    if (HIDE_LABELS) await page.addStyleTag({ content: ".label, .label-leader, .label-dot { display: none !important; }" });
    if (CANVAS_ONLY) {
      await page.addStyleTag({ content: "*::before, *::after { display: none !important; }" });
      await page.evaluate(() => {
        const c = document.querySelector("canvas");
        for (const el of document.querySelectorAll("body *")) if (el !== c && !el.contains(c)) el.style.setProperty("display", "none", "important");
      });
    }
    for (const [shot, off] of SHOTS) {
      await page.evaluate(([s, o]) => window.__jointsFilm.seekShot(s, o), [shot, off]);
      await settle(page);
      await page.waitForTimeout(400);
      await settle(page);
      writeFileSync(`${OUT}/${shot}__${variant}.png`, await page.locator("canvas").screenshot());
    }
    results[variant] = { errors, tier: await page.evaluate(() => document.documentElement.dataset.quality ?? null), perf: await page.evaluate(() => window.__jointsQA.perf()) };
    await page.close();
  }
  // The canvas fills the window, so an element screenshot also contains the DOM overlay. The Step-12 player chrome (contrast
  // scrims, 44 px timeline row, settings button) does not exist in the Step-11 baseline, so the whole frame cannot isolate a
  // rendering change. RENDER_REGION excludes the header band, the player row and the caption column; both numbers are kept.
  const RENDER_REGION = { left: 300, top: 70, width: 980, height: 620 };
  const compare = async (shot, variant, crop) => {
    const load = async (file) => {
      const s = sharp(`${OUT}/${file}`);
      return (crop ? s.extract(crop) : s).raw().toBuffer({ resolveWithObject: true });
    };
    const ref = await load(`${shot}__step11.png`);
    const img = (await load(`${shot}__${variant}.png`)).data;
    let se = 0, max = 0, over16 = 0, n = 0;
    for (let i = 0; i < img.length; i += ref.info.channels) {
      let pmax = 0;
      for (let k = 0; k < 3; k++) { const d = img[i + k] - ref.data[i + k]; se += d * d; pmax = Math.max(pmax, Math.abs(d)); n++; }
      max = Math.max(max, pmax);
      if (pmax > 16) over16++;
    }
    const rmse = Math.sqrt(se / n);
    return { psnrDb: rmse ? +(20 * Math.log10(255 / rmse)).toFixed(2) : Infinity, maxAbsDiff: max, pixelsOver16Pct: +((over16 / (n / 3)) * 100).toFixed(3) };
  };
  const metrics = {};
  const metricsWholeFrame = {};
  for (const [shot] of SHOTS) {
    metrics[shot] = {};
    metricsWholeFrame[shot] = {};
    for (const [variant] of VARIANTS.slice(1)) {
      metrics[shot][variant] = await compare(shot, variant, RENDER_REGION);
      metricsWholeFrame[shot][variant] = await compare(shot, variant, null);
    }
  }
  writeFileSync(`qa/reports/${STEP}.visual_tradeoff${SUFFIX}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), reference: "Step-11 build (qa/perf/baseline-dist), same seek positions, 1280x800 @1x", renderRegion: RENDER_REGION, note: "metrics = the rendered region only (header band, player row and caption column cropped out): differences there combine the baked environment (size 64), render-group re-quantization, LOD1 context (low tier), the material library and anti-aliasing noise. metricsWholeFrame additionally contains the Step-12 UI chrome, which the Step-11 baseline does not have (contrast scrims, 44 px timeline row, settings button), so it is not a rendering measurement.", variants: results, metrics, metricsWholeFrame }, null, 1));
  console.log(JSON.stringify(metrics, null, 0));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { tier: v.tier, errors: v.errors.length }]))));
} finally {
  await browser.close();
  servers.forEach((s) => s.kill());
}
