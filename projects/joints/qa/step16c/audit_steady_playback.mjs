// Step 16C: steady-state narration sync during ordinary playback (no seeking), sampled at 50 Hz.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4196;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__jointsQA?.idle(), null, { timeout: 120000 });
  await page.evaluate(() => {
    window.__a = []; window.__on = true;
    const tick = () => { if (!window.__on) return; const n = window.__jointsFilm.narration(); const s = window.__jointsFilm.state();
      window.__a.push({ shot: s.shotId, local: Math.round(s.localMs), playing: s.playing, paused: n.paused, ct: +n.currentTime.toFixed(2), dur: +n.duration.toFixed(2), owner: n.owner, owners: n.owners, cue: n.cue, src: n.src });
      setTimeout(tick, 20); };
    tick();
  });
  await page.evaluate(() => window.__jointsFilm.play());
  // play for a minute of lesson, stepping past the two handovers a learner would meet
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(5000);
    if (await page.getByTestId("film-explore-exit").count()) { await page.getByTestId("film-explore-exit").click(); }
  }
  await page.evaluate(() => { window.__on = false; });
  const a = await page.evaluate(() => window.__a);
  writeFileSync("qa/reports/step16c.steady_audit.json", JSON.stringify(a, null, 0));
  const shots = [...new Set(a.map((r) => r.shot))];
  console.log(`samples ${a.length}, shots seen ${shots.length}: ${shots.join(", ")}`);
  console.log(`\nMAX SIMULTANEOUS OWNERS: ${Math.max(...a.map((r) => r.owners))}`);
  const rows = a.filter((r) => r.playing && !r.paused && r.dur > 0 && (r.local - 350) / 1000 >= 0 && (r.local - 350) / 1000 < r.dur - 0.2);
  const worst = {};
  for (const r of rows) { const d = r.ct - (r.local - 350) / 1000; worst[r.shot] = Math.max(worst[r.shot] ?? 0, Math.abs(d)); }
  const bad = Object.entries(worst).filter(([, d]) => d > 0.35);
  console.log(`\nshots compared: ${Object.keys(worst).length}; worst drift per shot over 0.35 s: ${bad.length}`);
  for (const [s, d] of Object.entries(worst).sort((x, y) => y[1] - x[1]).slice(0, 10)) console.log(`   ${s.padEnd(20)} ${d.toFixed(2)} s`);
  // stalls
  let stalls = [], cur = null;
  for (const r of a) {
    if (r.playing && !r.paused && r.dur > 0) {
      if (cur && cur.shot === r.shot && Math.abs(cur.last - r.ct) < 0.02) { cur.n++; } else { if (cur && cur.n >= 10) stalls.push(cur); cur = { shot: r.shot, at: r.ct, n: 1 }; }
      cur.last = r.ct;
    } else { if (cur && cur.n >= 10) stalls.push(cur); cur = null; }
  }
  if (cur && cur.n >= 10) stalls.push(cur);
  console.log(`\nSTALLS (clip says playing, currentTime frozen >= 200 ms): ${stalls.length}`);
  for (const s of stalls) console.log(`   ${s.shot} frozen at ${s.at.toFixed(2)} for ${(s.n * 0.02).toFixed(1)}s`);
} finally { await browser.close(); server.kill(); }
