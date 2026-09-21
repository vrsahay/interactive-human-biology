// Step 16E §12: every exploration in four states - before movement, task in progress, mid-drag, completed - at the two
// phone widths and the two desktop widths, each frame measured, not only photographed.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4208;
const OUT = "qa/visual/step16e";
const WIDTHS = [[390, 844], [412, 844], [1280, 800], [1440, 900]];
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const rows = [];
const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
const overlap = (a, b) => area({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());

  const measure = async (w, e, state) => {
    const t = await page.evaluate(() => window.__jointsFilm.exploreTarget());
    const dom = await page.evaluate(([gx, gy]) => {
      const vis = (el) => { const s = getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0.05 && el.getBoundingClientRect().width > 1; };
      const panel = document.querySelector('[data-testid="film-explore-panel"]').getBoundingClientRect();
      const hit = document.elementFromPoint(gx, gy);
      const labels = [...document.querySelectorAll(".label")].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 2);
      const task = document.querySelector('[data-testid="film-explore-task"]');
      return {
        panel: { left: panel.left, top: panel.top, right: panel.right, bottom: panel.bottom },
        gripHit: hit ? (hit.tagName === "CANVAS" ? "canvas" : hit.closest("[data-testid]")?.getAttribute("data-testid") ?? hit.tagName) : null,
        labelsBehind: labels.filter((l) => l.left < panel.right && l.right > panel.left && l.top < panel.bottom && l.bottom > panel.top).length,
        labelsOff: labels.filter((l) => l.left < 0 || l.right > innerWidth || l.top < 0 || l.bottom > innerHeight).length,
        taskDone: task?.getAttribute("data-done") === "true",
        draftBadges: [...document.querySelectorAll(".film-badge, [data-provenance-badge]")].filter(vis).length,
        playerHidden: getComputedStyle(document.querySelector(".film-player")).display === "none",
        hScroll: document.documentElement.scrollWidth > innerWidth,
      };
    }, [t.grip.x, t.grip.y]);
    const covered = +(overlap(t.region, dom.panel) / Math.max(1, area(t.region))).toFixed(4);
    const prominence = +(Math.max(t.region.right - t.region.left, t.region.bottom - t.region.top) / Math.min(t.viewport.width, t.viewport.height)).toFixed(4);
    const row = { width: w, explore: e.exploreId, state, covered, prominence, framedRadius: t.framed.radius, grip: t.grip, ...dom };
    delete row.panel;
    rows.push(row);
  };
  const shot = async (w, e, state) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${w}_${e.exploreId.replace("explore.", "")}_${state}.png` });
    await measure(w, e, state);
  };

  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const e of explores) {
      const ch = chapters.find((c) => c.id === e.chapterId);
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), e.status === "validated-rig" ? "hinge.axis" : ch.shots[1]);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      await page.getByTestId("film-explore").click();
      await settle();
      await page.waitForTimeout(1300);
      // the pointer leaves the spot where the player's button was, so no hover state is photographed
      await page.mouse.move(2, 2);
      await shot(w, e, "1_before");

      // task in progress: a first, partial attempt from the keyboard
      const key = e.status === "validated-rig" ? "ArrowRight" : "ArrowLeft";
      for (let i = 0; i < 4; i++) await page.keyboard.press(key);
      await page.waitForTimeout(200);
      await shot(w, e, "2_task");

      // mid-movement: a real drag that starts on the target, photographed with the button still held
      const t = await page.evaluate(() => window.__jointsFilm.exploreTarget());
      const [dx, dy] = e.status === "validated-rig" ? [0, -60] : e.exploreId === "explore.pivot" ? [70, 0] : [50, -40];
      await page.mouse.move(t.grip.x, t.grip.y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(t.grip.x + (dx * i) / 12, t.grip.y + (dy * i) / 12);
      await shot(w, e, "3_mid");
      await page.mouse.up();
      await page.mouse.move(2, 2);

      // completed: carry on until the task says it is done
      for (let i = 0; i < 30 && !(await page.getByTestId("film-explore-task").getAttribute("data-done").then((v) => v === "true")); i++) {
        await page.keyboard.press(key);
        if (e.exploreId === "explore.ball") await page.keyboard.press("ArrowDown");
      }
      await page.waitForTimeout(400);
      await shot(w, e, "4_done");
      await page.getByTestId("film-explore-exit").click();
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
    }
  }
} finally {
  writeFileSync("qa/reports/step16e.explore_states.json", JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  for (const r of rows) console.log(`${String(r.width).padStart(5)} ${r.explore.padEnd(14)} ${r.state.padEnd(9)} covered ${r.covered}  grip ${r.gripHit}  prom ${r.prominence}  labels behind ${r.labelsBehind} off ${r.labelsOff}  done ${r.taskDone}  draft ${r.draftBadges}  playerHidden ${r.playerHidden}  hScroll ${r.hScroll}`);
  const bad = rows.filter((r) => r.covered > 0.02 || r.gripHit !== "canvas" || r.labelsBehind || r.labelsOff || r.draftBadges || r.hScroll || (r.state === "4_done" && !r.taskDone));
  console.log(`\nframes ${rows.length}   PROBLEMS ${bad.length}`);
  for (const r of bad) console.log("  " + JSON.stringify(r));
  await browser.close(); server.kill();
}
