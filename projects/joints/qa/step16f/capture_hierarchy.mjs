// Step 16F: the text hierarchy at every required width, measured - and the capture set the brief asks for.
//   top left: chapter line, then the current topic   centre: anatomy   bottom: the spoken sentence
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const PORT = 4222;
const OUT = "qa/visual/step16f";
const TAG = process.env.TAG ?? "after";
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(",").map((x) => x.split("x").map(Number)) : [[320, 844], [360, 800], [390, 844], [412, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900]];
const CAPTURE_AT = new Set([1280, 390]);
const lesson = JSON.parse(readFileSync("content/lessons/hinge-elbow.json", "utf8"));
// one representative shot per chapter, plus the joint chapters' own beats the brief names
const SHOTS = process.env.SHOTS ? process.env.SHOTS.split(",") : ["hook.shoulder", "concept.meet", "fixed.bones", "fixed.name", "pivot.travel", "pivot.bones", "ball.move", "ball.name", "hinge.bones", "hinge.flexion", "compare.together", "recall.open", "map.all"];
const site = Object.fromEntries(lesson.chapters.flatMap((c) => c.shots).map((s) => [s.id, s.camera.site ?? null]));
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", process.env.DIST ?? "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const rows = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const id of SHOTS) {
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2500), id);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      await page.waitForTimeout(1100);
      await page.mouse.move(2, 2);
      if (CAPTURE_AT.has(w)) await page.screenshot({ path: `${OUT}/${TAG}_${w}_${id}.png` });
      const r = await page.evaluate((siteId) => {
        const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 1 ? { left: b.left, top: b.top, right: b.right, bottom: b.bottom } : null; };
        const hit = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const cap = document.querySelector('[data-testid="film-caption"]');
        const heading = cap?.querySelector(".film-caption__title") ?? cap?.querySelector(".film-caption__text");
        const lead = box(cap);
        const chapter = box(document.querySelector('[data-testid="film-chapter"]'));
        const sub = box(document.querySelector('[data-testid="film-subtitle"]'));
        const player = box(document.querySelector(".film-player"));
        // a label counts only if it is actually painted: labels of the previous shot fade out rather than vanish
        const painted = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false; } return true; };
        const labelEls = [...document.querySelectorAll(".label")].filter(painted);
        const labels = labelEls.map(box).filter(Boolean);
        const s = siteId ? window.__jointsFilm.siteOnScreen(siteId) : null;
        const siteInLead = !!s && !!lead && s.x >= lead.left && s.x <= lead.right && s.y >= lead.top && s.y <= lead.bottom;
        return {
          lead: lead && { left: Math.round(lead.left), top: Math.round(lead.top), right: Math.round(lead.right), bottom: Math.round(lead.bottom) },
          headingPx: heading ? parseFloat(getComputedStyle(heading).fontSize) : null,
          headingIsTitle: !!cap?.querySelector(".film-caption__title"),
          belowChapter: !!lead && !!chapter && lead.top >= chapter.bottom - 1,
          // aligned with the top bar's first visible item: the brand on desktop, the chapter line on a phone (the brand is hidden)
          leftAligned: !!lead && Math.abs(lead.left - Math.min(...[...document.querySelectorAll(".film-top > p")].map(box).filter(Boolean).map((b) => b.left))) <= 4,
          overlapsSubtitle: hit(lead, sub),
          overlapsPlayer: hit(lead, player),
          overlapsLabels: labels.filter((l) => hit(lead, l)).length,
          overlappingLabels: labelEls.filter((e) => hit(lead, box(e))).map((e) => { const b = box(e); return e.textContent.trim() + " @" + [b.left, b.top, b.right, b.bottom].map(Math.round).join(","); }),
          hiddenLabelsSkipped: document.querySelectorAll(".label").length - labelEls.length,
          siteInLead,
          inViewport: !lead || (lead.left >= 0 && lead.right <= innerWidth + 0.5 && lead.top >= 0 && lead.bottom <= innerHeight),
          hScroll: document.documentElement.scrollWidth > innerWidth,
          cardBackground: cap ? getComputedStyle(cap).backgroundColor : null,
        };
      }, site[id]);
      rows.push({ width: w, height: h, shot: id, ...r });
    }
  }
} finally {
  writeFileSync(`qa/reports/step16f.hierarchy.${TAG}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  const bad = rows.filter((r) => !r.lead || !r.belowChapter || !r.leftAligned || r.overlapsSubtitle || r.overlapsPlayer || r.overlapsLabels || r.siteInLead || !r.inViewport || r.hScroll);
  for (const w of [...new Set(rows.map((r) => r.width))]) {
    const rs = rows.filter((r) => r.width === w);
    const px = rs.filter((r) => r.headingIsTitle).map((r) => r.headingPx);
    console.log(`${String(w).padStart(5)}  title ${Math.min(...px)}-${Math.max(...px)} px  lead top ${Math.min(...rs.map((r) => r.lead?.top ?? 0))}  lowest lead bottom ${Math.max(...rs.map((r) => r.lead?.bottom ?? 0))}  problems ${rs.filter((r) => bad.includes(r)).length}`);
  }
  console.log(`\nchecks ${rows.length}   PROBLEMS ${bad.length}`);
  for (const r of bad) console.log("  " + JSON.stringify(r));
  await browser.close(); server.kill();
}
