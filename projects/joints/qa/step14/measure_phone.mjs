// Step 14: measure the phone-width layout of the new panels against the player.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const PORT = 4206;
mkdirSync("qa/visual/step14", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const out = [];
const CASES = [
  { shot: "recap.compare", open: null },
  { shot: "recap.check", open: null },
  { shot: "recap.compare", open: "recall" },
  { shot: "fixed.detail", open: "explore" },
  { shot: "pivot.rotate", open: "explore" },
  { shot: "ball.shoulder", open: "explore" },
  { shot: "hinge.flexion", open: "explore" },
];
try {
  for (const w of [390, 412]) {
    const page = await browser.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
    await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
    const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
    for (const c of CASES) {
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2000), c.shot);
      await settle();
      if (c.open === "recall") { await page.getByTestId("film-recall-start").click(); await page.waitForSelector("[data-testid=film-recall]"); }
      if (c.open === "explore") { await page.getByTestId("film-explore").click(); await page.waitForSelector("[data-testid=film-explore-panel]"); }
      await settle();
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => {
        const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
        const overlap = (a, b) => !a || !b ? false : !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        const player = r(".film-player"), top = r(".film-top");
        const panels = { caption: r("[data-testid=film-caption]"), interact: r("[data-testid=film-interact]"), explore: r("[data-testid=film-explore-panel]"), recall: r("[data-testid=film-recall]") };
        const res = { playerH: player ? Math.round(player.bottom - player.top) : null, overPlayer: [], overTop: [], offscreen: [] };
        for (const [k, v] of Object.entries(panels)) {
          if (!v) continue;
          if (overlap(v, player)) res.overPlayer.push(k);
          if (overlap(v, top)) res.overTop.push(k);
          if (v.top < 0 || v.bottom > innerHeight || v.left < 0 || v.right > innerWidth) res.offscreen.push(k);
        }
        // every control inside a new panel must be fully on screen and >= 44px
        const small = [];
        for (const sel of ["[data-testid=film-explore-panel] button", "[data-testid=film-recall] button"]) {
          for (const el of document.querySelectorAll(sel)) {
            const b = el.getBoundingClientRect();
            if (b.height < 44 || b.width < 44) small.push({ t: el.dataset.testid || el.textContent.trim().slice(0, 18), h: Math.round(b.height), w: Math.round(b.width) });
            if (b.bottom > innerHeight || b.right > innerWidth || b.top < 0 || b.left < 0) res.offscreen.push(el.dataset.testid || el.textContent.trim().slice(0, 18));
          }
        }
        res.smallTargets = small;
        res.scrollX = document.documentElement.scrollWidth > innerWidth;
        return res;
      });
      out.push({ w, shot: c.shot, open: c.open, ...m });
      if (c.open) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
    }
    out.push({ w, consoleErrors: errors });
    await page.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(JSON.stringify(out, null, 1));
