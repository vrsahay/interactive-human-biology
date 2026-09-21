// Step 16D audit: what does a learner actually see and hear announced, shot by shot?
// Read-only against the running build.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4196;
mkdirSync("qa/reports", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const report = { generatedAt: new Date().toISOString(), shots: [], persistent: null, explore: [], srOnly: null, clipping: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

  const entries = await page.evaluate(() => window.__jointsFilm.entries());
  // ---- per shot: visible DRAFT badges, sr-only text, persistent controls
  for (const e of entries) {
    await page.evaluate((id) => window.__jointsFilm.seekShot(id, 900), e.id);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    const row = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.02; };
      const badges = [...document.querySelectorAll(".film-badge")].filter(vis);
      const srOnly = [...document.querySelectorAll(".sr-only")].map((el) => el.textContent.trim()).filter(Boolean);
      return {
        draftBadges: badges.filter((b) => b.classList.contains("film-badge--draft")).length,
        sourceBadges: badges.filter((b) => b.classList.contains("film-badge--source")).length,
        badgeText: badges.map((b) => b.firstChild?.textContent?.trim()),
        srOnlyBlocks: srOnly.length,
        srOnlyChars: srOnly.join(" ").length,
        srOnlyMentionsDraft: srOnly.filter((s) => /draft explanatory text/i.test(s)).length,
        teachmark: !!document.querySelector('[data-testid="film-teachmark"]'),
        sourcesButton: !!document.querySelector('[data-testid="sources-toggle"]'),
      };
    });
    report.shots.push({ shot: e.id, ...row });
  }
  // ---- persistent chrome at a teaching beat
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.why", 3000));
  await settle();
  report.persistent = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.02; };
    const controls = [...document.querySelectorAll("main button, main [role=slider], main a")].filter(vis);
    return { count: controls.length, items: controls.map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 34)) };
  });
  // ---- explore panels: badges, sources, technical wording, and the site label geometry
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());
  for (const e of explores) {
    const ch = chapters.find((c) => c.id === e.chapterId);
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), ch.shots[1]);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    if (!(await page.getByTestId("film-explore-panel").count())) { await page.getByTestId("film-explore").click(); await settle(); }
    const info = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="film-explore-panel"]');
      const pr = panel?.getBoundingClientRect();
      const labels = [...document.querySelectorAll(".label, .label__title, [class*=label]")].map((el) => ({ text: el.textContent.trim().slice(0, 40), r: el.getBoundingClientRect() })).filter((l) => l.r.width > 0 && l.text);
      const clipped = labels.filter((l) => pr && l.r.left < pr.right && l.r.right > pr.left && l.r.top < pr.bottom && l.r.bottom > pr.top);
      return {
        panelText: panel?.innerText.replace(/\n/g, " | ").slice(0, 420),
        panelChars: panel?.innerText.length ?? 0,
        draftBadges: [...(panel?.querySelectorAll(".film-badge--draft") ?? [])].length,
        labelsOverlappingPanel: clipped.map((l) => ({ text: l.text, left: Math.round(l.r.left), right: Math.round(l.r.right) })),
        panelRect: pr ? { left: Math.round(pr.left), right: Math.round(pr.right), top: Math.round(pr.top), bottom: Math.round(pr.bottom) } : null,
      };
    });
    report.explore.push({ exploreId: e.exploreId, ...info });
    await page.getByTestId("film-explore-exit").click();
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
  }
} finally {
  writeFileSync("qa/reports/step16d.ui_audit.json", JSON.stringify(report, null, 1));
  const s = report.shots;
  console.log(`shots audited: ${s.length}`);
  console.log(`shots showing a visible DRAFT badge: ${s.filter((r) => r.draftBadges > 0).length}`);
  console.log(`shots whose sr-only text repeats the draft disclaimer: ${s.filter((r) => r.srOnlyMentionsDraft > 0).length}`);
  console.log(`shots showing the Sources control: ${s.filter((r) => r.sourcesButton).length}`);
  console.log(`shots showing the teaching-view pill: ${s.filter((r) => r.teachmark).length}`);
  console.log(`\npersistent controls at a teaching beat: ${report.persistent.count}`);
  console.log(`  ${report.persistent.items.join(" | ")}`);
  console.log(`\nexplore panels:`);
  for (const e of report.explore) console.log(`  ${e.exploreId.padEnd(15)} ${e.panelChars} chars, ${e.draftBadges} draft badges, labels overlapping the panel: ${JSON.stringify(e.labelsOverlappingPanel)}`);
  await browser.close();
  server.kill();
}
