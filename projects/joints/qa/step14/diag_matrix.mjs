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
  // Reach into the scene graph: what is a body group node's delivered local matrix?
  const probe = await page.evaluate(() => {
    const stats = window.__jointsQA.sceneStats();
    void stats;
    // find the skull group mesh through the scene
    const out = [];
    const walk = (o, depth) => {
      if (o.userData && o.userData.groupId) out.push({ groupId: o.userData.groupId, matrix: o.matrix.elements.map((v) => Math.round(v * 1e4) / 1e4), autoUpdate: o.matrixAutoUpdate, pos: o.position.toArray() });
      for (const c of o.children) walk(c, depth + 1);
    };
    // the app is not exposed directly; use the QA scene walker via a known mesh's parent chain
    return { note: "sceneStats has no node access", drawables: stats.drawables.length };
  });
  console.log(JSON.stringify(probe));
} finally { await browser.close(); server.kill(); }
