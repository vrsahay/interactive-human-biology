import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4181;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 4).join("\n")));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("recall.open", 2000));
  await page.evaluate(() => window.__jointsFilm.pause());
  await settle();
  console.log("state", JSON.stringify(await page.evaluate(() => { const s = window.__jointsFilm.state(); return { chapterId: s.chapterId, shotId: s.shotId, playing: s.playing }; })));
  console.log("pill present:", await page.getByTestId("film-recall-start").count());
  await page.getByTestId("film-recall-start").click();
  await page.waitForTimeout(1200);
  console.log("panel:", await page.getByTestId("film-recall").count(), "pill:", await page.getByTestId("film-recall-start").count());
  console.log("state after", JSON.stringify(await page.evaluate(() => { const s = window.__jointsFilm.state(); return { chapterId: s.chapterId, shotId: s.shotId, playing: s.playing }; })));
  console.log("errors", JSON.stringify(errors, null, 1));
} finally { await browser.close(); server.kill(); }
