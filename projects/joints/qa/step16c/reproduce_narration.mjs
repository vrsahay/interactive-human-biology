// Step 16C reproduction: who owns narration, and when do two owners speak at once?
// Samples both audio elements at 50 Hz through the whole lesson and across every navigation action.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4196;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });
const report = { generatedAt: new Date().toISOString(), findings: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

  // a 50 Hz sampler of both audio owners plus the lesson clock
  await page.evaluate(() => {
    window.__audit = [];
    window.__auditOn = true;
    const tick = () => {
      if (!window.__auditOn) return;
      const n = window.__jointsFilm.narration();
      const s = window.__jointsFilm.state();
      window.__audit.push({ t: Math.round(performance.now()), shot: s.shotId, timeMs: Math.round(s.timeMs), localMs: Math.round(s.localMs), playing: s.playing, clip: n.src, clipPaused: n.paused, clipTime: +n.currentTime.toFixed(2), clipDur: +n.duration.toFixed(2), cue: n.cue, cuePlaying: n.cuePlaying });
      setTimeout(tick, 20);
    };
    tick();
  });

  const mark = (label) => page.evaluate((l) => window.__audit.push({ mark: l, t: Math.round(performance.now()) }), label);

  // 1. play the lesson from the start for a while, through the first explore handover
  await page.evaluate(() => window.__jointsFilm.seek(0));
  await settle();
  await mark("play-from-0");
  await page.evaluate(() => window.__jointsFilm.play());
  await page.waitForTimeout(20000);
  await mark("after-20s");

  // 2. chapter jumps
  for (const [from, to] of [[2, 4], [4, 3], [5, 0], [0, 8]]) {
    await mark(`chapter-${from}->${to}`);
    await page.evaluate((i) => window.__jointsFilm.seekChapter(i), to);
    await page.waitForTimeout(1800);
  }
  // 3. seeks
  await mark("seek-forward");
  await page.evaluate(() => window.__jointsFilm.seek(60000));
  await page.waitForTimeout(1500);
  await mark("seek-backward");
  await page.evaluate(() => window.__jointsFilm.seek(20000));
  await page.waitForTimeout(1500);
  // 4. pause / resume
  await mark("pause");
  await page.evaluate(() => window.__jointsFilm.pause());
  await page.waitForTimeout(900);
  await mark("resume");
  await page.evaluate(() => window.__jointsFilm.play());
  await page.waitForTimeout(1500);
  // 5. the explore handover
  await mark("seek-to-fixed.task");
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.task", 0));
  await page.evaluate(() => window.__jointsFilm.play());
  await page.waitForTimeout(4000);
  await mark("explore-open-expected");
  await page.waitForTimeout(4000);
  if (await page.getByTestId("film-explore-exit").count()) {
    await mark("explore-exit");
    await page.getByTestId("film-explore-exit").click();
    await page.waitForTimeout(2500);
  }
  await mark("end");
  await page.evaluate(() => { window.__auditOn = false; });
  const audit = await page.evaluate(() => window.__audit);
  writeFileSync("qa/reports/step16c.narration_audit.json", JSON.stringify(audit, null, 0));

  // ---- analysis
  const rows = audit.filter((r) => !r.mark);
  const overlaps = rows.filter((r) => !r.clipPaused && r.cuePlaying);
  console.log(`samples: ${rows.length}`);
  console.log(`\n1) BOTH OWNERS SPEAKING AT ONCE: ${overlaps.length} samples`);
  if (overlaps.length) { const o = overlaps[0]; console.log(`   first at shot=${o.shot} clip=${o.clip} cue=${o.cue}`); }

  // Clip vs lesson time, counted only where the two can meaningfully be compared: the clip is still playing and the
  // lesson position is still inside it. A clip that has finished is not "drifting" - its shot simply runs on past it.
  const drift = rows
    .filter((r) => r.playing && !r.clipPaused && r.clipDur > 0 && (r.localMs - 350) / 1000 >= 0 && (r.localMs - 350) / 1000 < r.clipDur - 0.2)
    .map((r) => ({ shot: r.shot, expected: (r.localMs - 350) / 1000, actual: r.clipTime, d: +(r.clipTime - (r.localMs - 350) / 1000).toFixed(2) }));
  const bad = drift.filter((d) => Math.abs(d.d) > 0.35);
  console.log(`\n2) CLIP OUT OF STEP WITH LESSON TIME (>0.35 s): ${bad.length} of ${drift.length} samples`);
  const byShot = {};
  for (const d of bad) byShot[d.shot] = Math.max(byShot[d.shot] ?? 0, Math.abs(d.d));
  for (const [s, d] of Object.entries(byShot).slice(0, 12)) console.log(`   ${s.padEnd(20)} worst ${d.toFixed(2)} s`);

  // a clip playing that does not belong to the current shot
  const wrong = rows.filter((r) => !r.clipPaused && r.clip && r.shot && r.clip !== `${r.shot}.mp3`);
  console.log(`\n3) STALE CLIP (playing a clip that is not this shot's): ${wrong.length} samples`);
  const wrongPairs = [...new Set(wrong.map((r) => `${r.shot} <- ${r.clip}`))];
  for (const w of wrongPairs.slice(0, 12)) console.log(`   ${w}`);

  // silence inside a narrated shot
  const silent = {};
  for (const r of rows) { if (!r.playing || !r.shot) continue; const k = r.shot; silent[k] ??= { total: 0, quiet: 0 }; silent[k].total++; if (r.clipPaused && !r.cuePlaying) silent[k].quiet++; }
  const quietShots = Object.entries(silent).filter(([, v]) => v.total > 15 && v.quiet / v.total > 0.4);
  console.log(`\n4) SHOTS MOSTLY SILENT WHILE PLAYING: ${quietShots.length}`);
  for (const [s, v] of quietShots.slice(0, 12)) console.log(`   ${s.padEnd(20)} ${Math.round((v.quiet / v.total) * 100)}% silent`);
  report.findings = { overlaps: overlaps.length, driftSamples: bad.length, staleClips: wrongPairs, quietShots: quietShots.map(([s, v]) => [s, Math.round((v.quiet / v.total) * 100)]) };
} finally {
  writeFileSync("qa/reports/step16c.narration_findings.json", JSON.stringify(report, null, 1));
  await browser.close();
  server.kill();
}
