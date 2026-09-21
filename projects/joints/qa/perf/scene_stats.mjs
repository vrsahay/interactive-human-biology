// Step 12R diagnostic: scene nodes and visible drawables at a film shot (default hinge.try).
//   node qa/perf/scene_stats.mjs --dist dist --shot hinge.try
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const DIST = arg("--dist", "dist"), PORT = 4194, SHOT = arg("--shot", "hinge.try");
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", DIST, String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}/?qa=1&autoplay=0${arg("--query", "")}`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), SHOT);
  await page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => ({ ...window.__jointsQA.sceneStats(), perf: window.__jointsQA.perf() }));
  const byRoot = {};
  for (const d of s.drawables) (byRoot[d.root] ??= []).push(`${d.name.slice(0, 48)} [${d.material} #${d.materialId}] ${d.triangles}${d.transparent ? " T" : ""}${d.inFrustum ? "" : " OUT"}${d.frustumCulled ? "" : " noCull"}`);
  console.log(JSON.stringify({ shot: SHOT, nodes: s.nodes, autoUpdate: s.autoUpdate, drawables: s.drawables.length, outOfFrustum: s.drawables.filter((d) => !d.inFrustum).length, uniqueMaterials: new Set(s.drawables.map((d) => d.materialId)).size, rendererDrawCalls: s.perf.drawCalls, byRoot }, null, 1));
} finally { await browser.close(); server.kill(); }
