// Decisive: does the skull disappear because of the camera framing, or because of the group transform?
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4199;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const shot = async (page, name) => {
  await page.evaluate(() => window.__jointsQA.renderNow());
  await page.waitForTimeout(250);
  writeFileSync(`qa/visual/step14/dec_${name}.png`, await page.screenshot());
  const s = await page.evaluate(() => {
    const st = window.__jointsQA.sceneStats();
    const skull = st.drawables.filter((d) => /__skull/.test(d.name));
    return {
      draws: window.__jointsQA.perf().drawCalls,
      skullVisible: skull.length,
      skullInFrustum: skull.filter((d) => d.inFrustum).length,
      skullBounds: skull[0]?.bounds ?? null,
      skullWorldPos: skull[0]?.worldPos ?? null,
      skullScreen: window.__jointsQA.project([0.0008, 1.6008, -0.0016]),
    };
  });
  console.log(name.padEnd(22), JSON.stringify(s));
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("intro.map", 1000));
  await settle();
  await shot(page, "1_lesson_shot");
  await page.evaluate(() => window.__jointsFilm.openExplore("explore.pivot"));
  await settle();
  await shot(page, "2_explore_open_no_transform");
  await page.evaluate(() => window.__jointsFilm.exploreDrag(150, 0));
  await settle();
  await shot(page, "3_explore_after_drag");
} finally { await browser.close(); server.kill(); }
