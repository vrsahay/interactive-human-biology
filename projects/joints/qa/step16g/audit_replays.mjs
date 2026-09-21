// Step 16G: find every place the narration audio is jumped BACKWARDS while it is speaking - each one replays the words
// just said ("joints ... joints"). Real-time playthrough of the whole lesson from the Start button, as a learner has it.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = Number(process.env.PORT ?? 4231);
const TAG = process.env.TAG ?? "before";
const LIMIT_S = Number(process.env.LIMIT_S ?? 400);
mkdirSync("qa/reports", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", process.env.DIST ?? "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  // record every currentTime assignment on any media element, with where it jumped from and why (the call stack)
  await page.addInitScript(() => {
    const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
    window.__seeks = [];
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
      configurable: true,
      get() { return d.get.call(this); },
      set(v) {
        const from = d.get.call(this);
        window.__seeks.push({ at: Math.round(performance.now()), src: (this.currentSrc || this.src || "").split("/").pop(), from: +from.toFixed(3), to: +(+v).toFixed(3), paused: this.paused, stack: (new Error().stack || "").split("\n").slice(2, 5).map((s) => s.trim()).join(" < ") });
        d.set.call(this, v);
      },
    });
  });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__jointsQA?.idle(), null, { timeout: 120000 });
  await page.getByTestId("film-start-button").click();
  // sample the lesson clock and the clip clock, so a jump can be matched to what the film was doing
  await page.evaluate(() => {
    window.__s = [];
    const tick = () => { const n = window.__jointsFilm.narration(); const s = window.__jointsFilm.state();
      window.__s.push({ at: Math.round(performance.now()), shot: s.shotId, local: Math.round(s.localMs), playing: s.playing, buffering: s.buffering, ct: +n.currentTime.toFixed(3), paused: n.paused, owner: n.owner, src: (n.src || "").split("/").pop() });
      if (!s.ended) setTimeout(tick, 50); };
    tick();
  });
  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < LIMIT_S) {
    await page.waitForTimeout(2000);
    // a learner who is handed an exploration or the recall takes the button back to the lesson
    if (await page.getByTestId("film-explore-exit").count()) await page.getByTestId("film-explore-exit").click().catch(() => undefined);
    if (await page.getByTestId("film-recall-exit").count()) await page.getByTestId("film-recall-exit").click().catch(() => undefined);
    // the 90-degree check holds the film for the learner: set the elbow to 90 and answer it, as a learner would
    if (await page.evaluate(() => window.__jointsFilm.state().holdingForCheck)) {
      await page.evaluate(() => { window.__jointsQA.setDof("flexion", 90); window.__jointsFilm.answerCheck(); });
      await page.waitForTimeout(600);
      await page.evaluate(() => { const s = window.__jointsFilm.state(); if (!s.playing && !s.ended) window.__jointsFilm.resume(); });
    }
    if (await page.evaluate(() => window.__jointsFilm.state().ended)) break;
  }
  const seeks = await page.evaluate(() => window.__seeks);
  const samples = await page.evaluate(() => window.__s);
  // a replay: the clip is moved backwards while it was playing and past its first half-second (not a fresh start)
  const replays = seeks.filter((s) => !s.paused && s.from > 0.25 && s.to < s.from - 0.08);
  const forward = seeks.filter((s) => !s.paused && s.to > s.from + 0.08);
  writeFileSync(`qa/reports/step16g.replays.${TAG}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), seeks, replays, forward, samples }, null, 0));
  console.log(`seeks ${seeks.length}   BACKWARD WHILE SPEAKING (heard as repeated words): ${replays.length}   forward skips while speaking: ${forward.length}`);
  for (const r of replays) console.log(`  ${r.src.padEnd(28)} ${r.from.toFixed(2)} -> ${r.to.toFixed(2)}  (${(r.from - r.to).toFixed(2)} s replayed)  ${r.stack.slice(0, 140)}`);
  console.log(`ended: ${samples.at(-1)?.shot}  lesson ${((samples.at(-1)?.at - samples[0]?.at) / 1000).toFixed(0)} s of wall clock`);
} finally { await browser.close(); server.kill(); }
