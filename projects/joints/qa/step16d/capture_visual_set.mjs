// Step 16D §27: the required visual set at the three required widths, with the required checks measured per frame.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4197;
const OUT = "qa/visual/step16d";
const WIDTHS = [[1280, 800], [390, 844], [412, 844]];
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });
const rows = [];

// what the brief asks to see, in lesson order
const BEATS = [
  ["01_hook", "hook.shoulder"],
  ["02_fixed", "fixed.bones"],
  ["03_pivot", "pivot.rotate"],
  ["04_ball", "ball.move"],
  ["05_hinge", "hinge.flexion"],
  ["06_compare", "compare.together"],
  ["08_bodymap", "map.all"],
];

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

  // the checks the brief lists, measured over the live DOM of whatever frame is on screen
  const inspect = (name, width) => page.evaluate(([name, width]) => {
    const vis = (el) => { const s = getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0.05 && el.getBoundingClientRect().width > 1; };
    const stage = document.querySelector('[data-testid="film"]') ?? document.body;
    const dialog = document.querySelector('[role="dialog"]');
    const inDialog = (el) => !!dialog && dialog.contains(el);
    // DRAFT badges and Sources controls anywhere the learner is looking, excluding the teacher layer inside a dialog
    const badges = [...stage.querySelectorAll(".film-badge, [data-provenance-badge]")].filter((el) => vis(el) && !inDialog(el));
    const sources = [...stage.querySelectorAll('[data-testid="sources-toggle"], [data-testid="sources-classification"], [data-testid="sources-validation"]')].filter((el) => vis(el) && !inDialog(el));
    const panelEl = document.querySelector('[data-testid="film-explore-panel"]') ?? document.querySelector('[data-testid="film-recall"]');
    const panel = panelEl && vis(panelEl) ? panelEl.getBoundingClientRect() : null;
    const labels = [...document.querySelectorAll(".label")].map((el) => ({ text: el.textContent.trim(), r: el.getBoundingClientRect() })).filter((l) => l.r.width > 2 && l.text);
    const overlaps = (r, p) => r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top;
    const capEl = document.querySelector('[data-testid="film-caption"]');
    const cap = capEl && vis(capEl) ? capEl.getBoundingClientRect() : null;
    const subEl = document.querySelector('[data-testid="film-subtitle"]');
    const sub = subEl && vis(subEl) ? subEl.getBoundingClientRect() : null;
    const within = (r) => !r || (r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5);
    return {
      frame: name, width,
      draftBadges: badges.length,
      sourcesOnStage: sources.length,
      labels: labels.length,
      labelsBehindPanel: panel ? labels.filter((l) => overlaps(l.r, panel)).map((l) => l.text.slice(0, 34)) : [],
      labelsOffScreen: labels.filter((l) => !within(l.r)).map((l) => l.text.slice(0, 34)),
      captionVisible: !!cap, captionWithinViewport: within(cap),
      captionText: capEl ? capEl.textContent.trim().slice(0, 60) : null,
      subtitleVisible: !!sub, subtitleWithinViewport: within(sub),
      panelCoversStage: panel ? +((panel.width * panel.height) / (innerWidth * innerHeight)).toFixed(3) : 0,
      hScroll: document.documentElement.scrollWidth > innerWidth,
    };
  }, [name, width]);

  const shot = async (name, width) => {
    await settle();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${width}_${name}.png` });
    const r = await inspect(name, width);
    // how much of the frame the target anatomy occupies, when the runtime can tell us
    r.subjectFraction = await page.evaluate(() => {
      try {
        const ids = window.__jointsFilm.body().highlighted;
        if (!ids || !ids.length) return null;
        const b = window.__jointsFilm.bodyScreenBounds(ids);
        if (!b) return null;
        return +(b.width * b.height).toFixed(3);
      } catch (err) { return null; }
    });
    r.jointAttached = await page.evaluate(() => { try { return !!window.__jointsFilm.jointAttached(); } catch (e) { return null; } });
    r.cameraPreset = await page.evaluate(() => { try { return window.__jointsFilm.camera().preset; } catch (e) { return null; } });
    rows.push(r);
    return r;
  };

  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());

  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });

    // 00 the landing screen, before any gesture
    await page.reload();
    await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
    await shot("00_landing", w);
    if (await page.getByTestId("film-start-button").count()) await page.getByTestId("film-start-button").click();
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();

    for (const [name, shotId] of BEATS) {
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 1200), shotId);
      await page.evaluate(() => window.__jointsFilm.pause());
      await shot(name, w);
    }

    // 07 the recall challenge, opened
    await page.evaluate(() => window.__jointsFilm.seekShot("recall.challenge", 600));
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    if (await page.getByTestId("film-recall-start").count()) { await page.getByTestId("film-recall-start").click(); await settle(); }
    await shot("07_recall", w);
    if (await page.getByTestId("film-recall-exit").count()) { await page.getByTestId("film-recall-exit").click(); await settle(); }

    // 09-16 each exploration, opened and moved
    let n = 9;
    for (const e of explores) {
      const ch = chapters.find((c) => c.id === e.chapterId);
      const openOn = e.status === "validated-rig" ? "hinge.axis" : ch.shots[1];
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), openOn);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      if (!(await page.getByTestId("film-explore-panel").count())) { await page.getByTestId("film-explore").click(); await settle(); }
      const key = e.exploreId.replace("explore.", "");
      await shot(`${String(n).padStart(2, "0")}_explore_${key}_open`, w);
      for (let i = 0; i < 12; i++) await page.evaluate(() => window.__jointsFilm.exploreStep(-5, -3));
      await shot(`${String(n + 4).padStart(2, "0")}_explore_${key}_moved`, w);
      // 17: the learner task, shown completed where the goal is reachable this way
      if (e.exploreId === "explore.hinge") {
        for (let i = 0; i < 24; i++) await page.evaluate(() => window.__jointsFilm.exploreStep(5, 0));
        await shot("17_task_done", w);
      }
      await page.getByTestId("film-explore-exit").click();
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      n++;
    }

    // 18 the teacher layer: Settings -> For teachers -> Sources
    await page.getByTestId("settings-toggle").click();
    await settle();
    if (await page.getByTestId("sources-toggle").count()) { await page.getByTestId("sources-toggle").click(); await settle(); }
    await shot("18_sources_teacher_layer", w);
    await page.keyboard.press("Escape");
    await settle();
    await page.keyboard.press("Escape");
    await settle();

    // 19 completion
    const total = await page.evaluate(() => window.__jointsFilm.state().durationMs);
    await page.evaluate((t) => window.__jointsFilm.seek(t - 40), total);
    await page.evaluate(() => window.__jointsFilm.tick(200));
    await settle();
    await shot("19_completion", w);
  }
} finally {
  writeFileSync("qa/reports/step16d.visual_set.json", JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  const learner = rows.filter((r) => r.frame !== "18_sources_teacher_layer");
  const bad = learner.filter((r) => r.draftBadges || r.sourcesOnStage || r.labelsBehindPanel.length || r.labelsOffScreen.length || r.hScroll || (r.captionVisible && !r.captionWithinViewport) || (r.subtitleVisible && !r.subtitleWithinViewport));
  for (const r of rows) console.log(`${String(r.width).padStart(4)} ${r.frame.padEnd(28)} draft ${r.draftBadges}  sources ${r.sourcesOnStage}  labels ${r.labels}/behind ${r.labelsBehindPanel.length}/off ${r.labelsOffScreen.length}  panel ${r.panelCoversStage}  subj ${r.subjectFraction}  hScroll ${r.hScroll}`);
  console.log(`\ncaptures: ${rows.length}   PROBLEMS: ${bad.length}`);
  for (const r of bad) console.log(`  ${r.width} ${r.frame}: ${JSON.stringify(r)}`);
  await browser.close(); server.kill();
}
