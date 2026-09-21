// Step 16C: what rewinds a clip that is already playing correctly?
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4196;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    window.__log = [];
    const proto = HTMLMediaElement.prototype;
    const ct = Object.getOwnPropertyDescriptor(proto, "currentTime");
    const push = (e, extra) => window.__log.push({ t: Math.round(performance.now()), e, shot: window.__jointsFilm ? window.__jointsFilm.state().shotId : "?", local: window.__jointsFilm ? Math.round(window.__jointsFilm.state().localMs) : -1, ...extra });
    Object.defineProperty(proto, "currentTime", {
      get() { return ct.get.call(this); },
      set(v) { push("SET_TIME", { src: (this.currentSrc || this.src || "").split("/").pop(), from: +Number(ct.get.call(this)).toFixed(2), to: +Number(v).toFixed(2) }); ct.set.call(this, v); },
      configurable: true,
    });
    const sd = Object.getOwnPropertyDescriptor(proto, "src");
    Object.defineProperty(proto, "src", { get() { return sd.get.call(this); }, set(v) { push("SET_SRC", { src: String(v).split("/").pop() }); sd.set.call(this, v); }, configurable: true });
    const play0 = proto.play;
    proto.play = function () { push("PLAY", { src: (this.currentSrc || this.src || "").split("/").pop(), ct: +Number(ct.get.call(this)).toFixed(2), ended: this.ended }); return play0.call(this); };
    const pause0 = proto.pause;
    proto.pause = function () { push("PAUSE", { src: (this.currentSrc || this.src || "").split("/").pop(), ct: +Number(ct.get.call(this)).toFixed(2) }); return pause0.call(this); };
  });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__jointsQA?.idle(), null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.task", 0));
  await page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm.state().buffering, null, { timeout: 60000 });
  await page.evaluate(() => { window.__log = []; });
  await page.evaluate(() => window.__jointsFilm.play());
  await page.waitForTimeout(7000);
  const log = await page.evaluate(() => window.__log);
  writeFileSync("qa/reports/step16c.clip_resets.json", JSON.stringify(log, null, 1));
  console.log(`events: ${log.length}`);
  for (const e of log.slice(0, 40)) console.log(`  t=${String(e.t).padStart(7)} local=${String(e.local).padStart(5)} ${e.e.padEnd(9)} ${(e.src || "").padEnd(18)} ${e.from !== undefined ? `${e.from} -> ${e.to}` : e.ct !== undefined ? `ct=${e.ct}${e.ended ? " ENDED" : ""}` : ""}`);
} finally { await browser.close(); server.kill(); }
