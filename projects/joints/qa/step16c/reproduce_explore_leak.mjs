// Step 16C reproduction: what actually moves when a learner uses each Explore?
// Read-only measurement against the running build. Records the live world matrix and world bbox of EVERY render group
// before and after the interaction, and reports every group that moved.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4196;
mkdirSync("qa/reports", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const TOL = 1e-4;
const report = { generatedAt: new Date().toISOString(), explores: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const manifest = await page.evaluate(() => fetch("/assets/body/v3/body-delivery.json").then((r) => r.json()));
  const members = Object.fromEntries(manifest.groups.map((g) => [g.groupId, g.structureIds]));

  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  for (const e of explores) {
    const cfg = await page.evaluate((id) => {
      const c = window.__jointsFilm.exploreConfig ? window.__jointsFilm.exploreConfig(id) : null;
      return c;
    }, e.exploreId);
    // reach the chapter so the grouped body is loaded, then open the exploration through the same path the UI uses
    const chapters = await page.evaluate(() => window.__jointsFilm.chapters());
    const ch = chapters.find((c) => c.id === e.chapterId);
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 500), ch.shots[1] ?? ch.shots[0]);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    await page.evaluate((id) => window.__jointsFilm.openExplore(id), e.exploreId);
    await settle();
    const before = await page.evaluate(() => window.__jointsFilm.bodyGroupWorldState());
    // move it the way a learner would: a long drag on the primary axis, then the secondary
    await page.evaluate(() => { for (let i = 0; i < 30; i++) window.__jointsFilm.exploreStep(-2, 0); });
    await page.evaluate(() => { for (let i = 0; i < 20; i++) window.__jointsFilm.exploreStep(0, 2); });
    await settle();
    const after = await page.evaluate(() => window.__jointsFilm.bodyGroupWorldState());
    const declared = new Set(await page.evaluate(() => window.__jointsFilm.exploreState().displacedGroups));
    const moved = [];
    for (const [groupId, b] of Object.entries(before)) {
      const a = after[groupId];
      if (!a) continue;
      const dMatrix = Math.max(...b.matrixWorld.map((v, i) => Math.abs(v - a.matrixWorld[i])));
      const dBox = b.bbox && a.bbox ? Math.max(...b.bbox.map((v, i) => Math.abs(v - a.bbox[i]))) : 0;
      if (dMatrix > TOL || dBox > TOL) moved.push({ groupId, dMatrix: +dMatrix.toFixed(5), dBox: +dBox.toFixed(5), declared: declared.has(groupId), structures: members[groupId]?.length ?? 0, sample: (members[groupId] ?? []).slice(0, 4) });
    }
    const unexpected = moved.filter((m) => !m.declared);
    report.explores.push({ exploreId: e.exploreId, status: e.status, declaredTargets: [...declared], groupsMeasured: Object.keys(before).length, moved: moved.length, unexpected });
    console.log(`\n### ${e.exploreId}  (${e.status})`);
    console.log(`  declared targets : ${[...declared].length}`);
    console.log(`  groups measured  : ${Object.keys(before).length}`);
    console.log(`  groups that moved: ${moved.length}`);
    for (const m of moved) console.log(`    ${m.declared ? "OK  " : "LEAK"} ${m.groupId.padEnd(70)} dBox ${String(m.dBox).padStart(9)}  ${m.structures} structures  ${m.sample.join(", ")}`);
    await page.evaluate(() => window.__jointsFilm.closeExplore());
    await settle();
  }
} finally {
  writeFileSync("qa/reports/step16c.explore_leak.json", JSON.stringify(report, null, 1));
  await browser.close();
  server.kill();
}
