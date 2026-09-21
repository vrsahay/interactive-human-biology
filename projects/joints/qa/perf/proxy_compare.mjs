// Step 12R Phase V: the delivery-only proxy first frame vs the grouped representation, on the shots that can use the proxy.
// The proxy is a merged, vertex-coloured stand-in shipped only so the first frame does not wait for the grouped skeleton.
// This captures the canvas in both states at the same seek position and reports how different the picture is, and it checks
// that the proxy is gone by the time a shot needs the grouped representation.
//   node qa/perf/proxy_compare.mjs  ->  qa/visual/step12r/proxy/*.png + qa/reports/step12r.proxy_visual.json
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT = "qa/visual/step12r/proxy";
mkdirSync(OUT, { recursive: true });
const PORT = 4183;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const report = { generatedAt: new Date().toISOString(), note: "canvas only, 1280x800 @1x, quality=high", states: {}, metrics: {} };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const film = (fn, ...a) => page.evaluate(([f, x]) => window.__jointsFilm[f](...x), [fn, a]);
  const settle = async () => {
    await page.waitForFunction(() => window.__jointsQA.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
    await page.evaluate(() => window.__jointsQA.renderNow());
  };
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0&quality=high`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });

  // 1. the proxy state: the first shot as the learner first sees it (grouped stage not applied yet)
  await settle();
  const proxyState = await film("bodyDelivery");
  report.states.proxy = { groups: proxyState.groups, stages: proxyState.stages, perf: await page.evaluate(() => window.__jointsQA.perf()) };
  writeFileSync(`${OUT}/intro.title__proxy.png`, await page.locator("canvas").screenshot());

  // 2. the grouped state at the same seek position: cross the shot boundary so the upgrade is applied, then come back
  await film("seekShot", "intro.map", 1000);
  await settle();
  await page.waitForTimeout(500);
  await settle();
  const groupedState = await film("bodyDelivery");
  report.states.grouped = { groups: groupedState.groups, stages: groupedState.stages, perf: await page.evaluate(() => window.__jointsQA.perf()) };
  writeFileSync(`${OUT}/intro.map__grouped.png`, await page.locator("canvas").screenshot());
  await film("seekShot", "intro.title", 0);
  await settle();
  await page.waitForTimeout(400);
  await settle();
  writeFileSync(`${OUT}/intro.title__grouped.png`, await page.locator("canvas").screenshot());
  report.states.groupedAtIntroTitle = await film("bodyDelivery");
  report.consoleErrors = errors;
  await page.close();

  // 3. how different is the proxy picture from the final one, at the same shot.
  // The canvas fills the window, so an element screenshot also contains the DOM overlay (title, player). The body region is
  // compared on its own; the full frame is reported too, with the overlay difference called out.
  const diff = async (crop) => {
    const load = (f) => { const s = sharp(`${OUT}/${f}`); return (crop ? s.extract(crop) : s).raw().toBuffer({ resolveWithObject: true }); };
    const ref = await load("intro.title__grouped.png");
    const img = (await load("intro.title__proxy.png")).data;
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
  report.metrics["intro.title proxy vs grouped (body region only, x>=640)"] = await diff({ left: 640, top: 0, width: 640, height: 700 });
  report.metrics["intro.title proxy vs grouped (whole frame, includes the DOM title overlay)"] = await diff(null);
  writeFileSync("qa/reports/step12r.proxy_visual.json", JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ proxyGroups: report.states.proxy.groups, groupedGroups: report.states.grouped.groups, metrics: report.metrics, errors: errors.length }, null, 1));
} finally {
  await browser.close();
  server.kill();
}
