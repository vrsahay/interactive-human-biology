// Is the joint site actually covered, or does the panel's bounding box merely enclose transparent space?
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const PORT = 4199;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("fixed.bones", 600));
  await page.evaluate(() => window.__jointsFilm.pause());
  await settle();
  await page.getByTestId("film-explore").click();
  await settle();
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="film-explore-panel"]');
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const card = el.firstElementChild ? el.firstElementChild.getBoundingClientRect() : null;
    const s = window.__jointsFilm.siteOnScreen("fixed.skull");
    const hit = document.elementFromPoint(Math.round(s.x), Math.round(s.y));
    const opaqueAncestor = (() => {
      let n = hit;
      while (n && n !== document.body) { const c = getComputedStyle(n); if (c.backgroundColor && c.backgroundColor !== "rgba(0, 0, 0, 0)" && !c.backgroundColor.endsWith(", 0)")) return { tag: n.tagName, cls: n.className, bg: c.backgroundColor }; n = n.parentElement; }
      return null;
    })();
    return {
      viewport: [innerWidth, innerHeight],
      panelRect: { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) },
      panelBg: cs.backgroundColor, panelPointerEvents: cs.pointerEvents, panelDisplay: cs.display,
      cardRect: card ? { left: Math.round(card.left), top: Math.round(card.top), right: Math.round(card.right), bottom: Math.round(card.bottom) } : null,
      cardClass: el.firstElementChild ? el.firstElementChild.className : null,
      site: { x: Math.round(s.x), y: Math.round(s.y) },
      elementAtSite: hit ? { tag: hit.tagName, cls: String(hit.className).slice(0, 80), testid: hit.getAttribute("data-testid") } : null,
      opaqueAncestorOfHit: opaqueAncestor,
    };
  });
  console.log(JSON.stringify(out, null, 1));
} finally { await browser.close(); server.kill(); }
