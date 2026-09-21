import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4199;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("intro.map", 1000));
  await settle();
  await page.evaluate(() => window.__jointsFilm.openExplore("explore.pivot"));
  await settle();
  const r = await page.evaluate(() => ({
    skullCentre: window.__jointsQA.project([-0.0033, 1.6693, 0.0175]),
    neckAnchor: window.__jointsQA.project([0, 1.5392, -0.0056]),
    camera: window.__jointsFilm.camera(),
    perf: { draws: window.__jointsQA.perf().drawCalls, tris: window.__jointsQA.perf().triangles },
    stats: (() => { const st = window.__jointsQA.sceneStats(); const body = st.drawables.filter(d => d.root === 'body'); return { visibleBody: body.length, skull: body.filter(d => /skull/.test(d.name)).map(d => ({ n: d.name.slice(-18), inFrustum: d.inFrustum, culled: d.frustumCulled, tri: d.triangles })) }; })(),
  }));
  console.log(JSON.stringify(r, null, 1));
} finally { await browser.close(); server.kill(); }
