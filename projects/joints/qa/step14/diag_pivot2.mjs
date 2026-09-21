import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4198;
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
  await page.evaluate(() => window.__jointsFilm.exploreDrag(150, 0));
  await page.evaluate(() => window.__jointsQA.renderNow());
  const info = await page.evaluate(() => {
    const st = window.__jointsQA.sceneStats();
    const body = st.drawables.filter((d) => d.root === "body");
    return {
      displaced: window.__jointsFilm.exploreState().displacedGroups,
      readout: window.__jointsFilm.exploreState().readout,
      bodyDrawables: body.length,
      bodyNames: body.map((d) => d.name.slice(0, 46)),
      outOfFrustum: body.filter((d) => !d.inFrustum).map((d) => d.name.slice(0, 46)),
    };
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 2600));
} finally { await browser.close(); server.kill(); }
