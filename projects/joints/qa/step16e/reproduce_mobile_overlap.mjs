// Step 16E §2: reproduce the mobile Explore overlap on the current build, and record the geometry behind it.
// Per width and exploration: panel bounds, target anatomy bounds (world box of the moving parts, projected),
// camera distance, the composition lift in force, element stacking and pointer hit-testing at the target.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = Number(process.env.PORT ?? 4201);
const TAG = process.env.TAG ?? "before";
const WIDTHS = (process.env.WIDTHS ?? "320x844,360x800,390x844,412x844,430x932,768x1024,1024x768,1280x800,1440x900").split(",").map((s) => s.split("x").map(Number));
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const rows = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const e of explores) {
      const ch = chapters.find((c) => c.id === e.chapterId);
      const openOn = e.status === "validated-rig" ? "hinge.axis" : ch.shots[1];
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), openOn);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
      if (!(await page.getByTestId("film-explore-panel").count())) { await page.getByTestId("film-explore").click(); await settle(); }
      await page.waitForTimeout(300);
      const r = await page.evaluate((siteId) => {
        const F = window.__jointsFilm;
        const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
        const panelEl = document.querySelector('[data-testid="film-explore-panel"]');
        const panel = rect(panelEl);
        const target = F.exploreTarget ? F.exploreTarget() : null;
        const site = F.siteOnScreen(siteId);
        const cam = F.camera();
        const dist = Math.hypot(...cam.position.map((v, i) => v - cam.target[i]));
        const hitAt = (x, y) => { const el = document.elementFromPoint(Math.round(x), Math.round(y)); return el ? (el.tagName === "CANVAS" ? "canvas" : (el.closest("[data-testid]")?.getAttribute("data-testid") ?? el.tagName.toLowerCase())) : null; };
        const top = document.querySelector(".film-top");
        const player = document.querySelector(".film-player") ?? document.querySelector('[data-testid="film-scrubber"]')?.closest("div");
        // panel sections, to see where the height goes
        const sections = panelEl ? [...panelEl.children].map((c) => ({ cls: String(c.className).split(" ")[0], h: Math.round(c.getBoundingClientRect().height) })) : [];
        return {
          panel, sections, topBar: rect(top), player: rect(player),
          site: site ? { x: Math.round(site.x), y: Math.round(site.y), inView: site.inView } : null,
          siteHit: site ? hitAt(site.x, site.y) : null,
          target,
          cameraDistance: +dist.toFixed(3),
          orbitEnabled: F.orbitEnabled(),
          compose: F.compose ? F.compose() : null,
        };
      }, e.site);
      // how much of the target's projected box is under the panel, and what a pointer at the target's centre reaches
      if (r.target && r.panel) {
        const t = r.target, p = r.panel;
        const ix = Math.max(0, Math.min(t.right, p.right) - Math.max(t.left, p.left));
        const iy = Math.max(0, Math.min(t.bottom, p.bottom) - Math.max(t.top, p.top));
        const area = Math.max(1, (t.right - t.left) * (t.bottom - t.top));
        r.targetCoveredFraction = +((ix * iy) / area).toFixed(3);
      }
      rows.push({ width: w, height: h, explore: e.exploreId, ...r });
      await page.getByTestId("film-explore-exit").click();
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle();
    }
  }
} finally {
  writeFileSync(`qa/reports/step16e.mobile_overlap.${TAG}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  for (const r of rows) {
    const t = r.target;
    console.log(`${String(r.width).padStart(4)}x${String(r.height).padEnd(4)} ${r.explore.padEnd(14)} panel ${r.panel ? `${r.panel.top}-${r.panel.bottom}` : "-"} (h${r.panel?.h})  site (${r.site?.x},${r.site?.y}) hit=${r.siteHit}  target ${t ? `${t.left},${t.top}-${t.right},${t.bottom} h=${(t.heightFrac ?? 0).toFixed(3)}` : "n/a"} covered ${r.targetCoveredFraction ?? "n/a"}  cam ${r.cameraDistance}`);
  }
  await browser.close(); server.kill();
}
