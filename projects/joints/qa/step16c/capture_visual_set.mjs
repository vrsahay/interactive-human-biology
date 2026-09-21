// Step 16C visual QA: the frames the brief asks for, plus the measured proof that the context held still in each one.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4196;
const OUT = "qa/visual/step16c";
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });
const rows = [];
const TOL = 1e-4;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const shot = async (name) => { await settle(); await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${name}.png` }); };
  const groups = () => page.evaluate(() => window.__jointsFilm.bodyGroupWorldState());
  const cam = () => page.evaluate(() => window.__jointsFilm.camera());
  const moved = (a, b) => Object.keys(a).filter((g) => b[g] && a[g].bbox && b[g].bbox && Math.max(...a[g].bbox.map((v, i) => Math.abs(v - b[g].bbox[i]))) > TOL);

  const lesson = await page.evaluate(() => fetch("/content-lesson").then(() => null)).catch(() => null);
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());

  // ---- each exploration: before / mid / after, with the context measured
  for (const e of explores) {
    const ch = chapters.find((c) => c.id === e.chapterId);
    // a beat where the chapter's own assets are already on screen (the elbow chapter needs its joint attached)
    const openOn = e.status === "validated-rig" ? "hinge.axis" : ch.shots[1];
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), openOn);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    if (!(await page.getByTestId("film-explore-panel").count())) { await page.getByTestId("film-explore").click(); await settle(); }
    const key = e.exploreId.replace("explore.", "");
    await shot(`${key}_1_before`);
    const g0 = await groups();
    const c0 = await cam();
    const declared = new Set((await page.evaluate(() => window.__jointsFilm.exploreState()?.displacedGroups ?? [])));
    for (let i = 0; i < 6; i++) await page.evaluate(() => window.__jointsFilm.exploreStep(5, 3));
    await shot(`${key}_2_mid`);
    for (let i = 0; i < 6; i++) await page.evaluate(() => window.__jointsFilm.exploreStep(5, 3));
    await shot(`${key}_3_after`);
    const g1 = await groups();
    const c1 = await cam();
    const targets = await page.evaluate(() => window.__jointsFilm.exploreState()?.displacedGroups ?? []);
    const changed = moved(g0, g1);
    rows.push({ capture: key, declaredTargets: [...new Set([...declared, ...targets])], groupsChanged: changed, unexpected: changed.filter((g) => !targets.includes(g)), cameraMoved: +Math.hypot(...c0.position.map((v, i) => v - c1.position[i])).toFixed(6) });
    // leave through the UI: the QA hook closes the session but leaves the panel on screen, which would break the next open
    await page.getByTestId("film-explore-exit").click();
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
  }

  // ---- the validated elbow at its four reference poses
  await page.evaluate(() => window.__jointsFilm.seekShot("hinge.flexion", 1000));
  await page.evaluate(() => window.__jointsFilm.pause());
  await settle();
  for (const deg of [0, 45, 90, 145]) {
    await page.evaluate((d) => window.__jointsQA.setDof("flexion", d), deg);
    await shot(`hinge_elbow_${String(deg).padStart(3, "0")}`);
  }

  // ---- narration and navigation states
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.why", 300));
  await page.evaluate(() => window.__jointsFilm.pause());
  await shot("narration_shot_beginning");
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.why", 5000));
  await shot("narration_mid_shot");
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.name", 200));
  await shot("narration_shot_transition");
  await page.evaluate(() => window.__jointsFilm.seekChapter(4));
  await shot("navigation_chapter_jump");
  await page.evaluate(() => window.__jointsFilm.seek(208900));
  await shot("navigation_seek");
  await page.evaluate(() => window.__jointsFilm.play());
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__jointsFilm.pause());
  await shot("navigation_pause_resume");

  // ---- the exploration the film hands over to: opening, task, completion, closing
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.task", 0));
  await page.evaluate(() => window.__jointsFilm.play());
  await page.waitForFunction(() => document.querySelector('[data-testid="film-explore-panel"]'), null, { timeout: 30000 });
  await shot("handover_1_opening");
  await page.waitForTimeout(600);
  await shot("handover_2_task");
  for (let i = 0; i < 12 && (await page.getByTestId("film-explore-task").getAttribute("data-done")) !== "true"; i++) await page.keyboard.press("ArrowLeft");
  await shot("handover_3_completion");
  await page.getByTestId("film-explore-exit").click();
  await page.evaluate(() => window.__jointsFilm.pause());
  await shot("handover_4_closing");
} finally {
  writeFileSync("qa/reports/step16c.visual.json", JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  console.log(JSON.stringify(rows, null, 1));
  await browser.close();
  server.kill();
}
