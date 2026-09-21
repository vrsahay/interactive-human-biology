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
  const before = await page.evaluate(() => ({
    frontal: window.__jointsFilm.presentation("body.frontal_bone"),
    mandible: window.__jointsFilm.presentation("body.mandible"),
    atlas: window.__jointsFilm.presentation("body.atlas_c1"),
    visibleStructures: window.__jointsFilm.body().visible,
  }));
  console.log("before explore:", JSON.stringify(before));
  await page.evaluate(() => window.__jointsFilm.openExplore("explore.pivot"));
  await settle();
  const after = await page.evaluate(() => ({
    frontal: window.__jointsFilm.presentation("body.frontal_bone"),
    mandible: window.__jointsFilm.presentation("body.mandible"),
    atlas: window.__jointsFilm.presentation("body.atlas_c1"),
    visibleStructures: window.__jointsFilm.body().visible,
    displaced: window.__jointsFilm.exploreState().displacedGroups,
    frontalVisible: window.__jointsFilm.jointVisible === undefined ? null : null,
    skullInVisibleSet: (() => { const q = window.__jointsQA; return q ? null : null; })(),
  }));
  console.log("after  explore:", JSON.stringify(after));
} finally { await browser.close(); server.kill(); }
