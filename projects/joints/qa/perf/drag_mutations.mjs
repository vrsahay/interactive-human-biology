// Step 12R diagnostic: DOM mutations, draw calls and scene nodes per rendered frame during a closed-loop elbow drag.
//   node qa/perf/drag_mutations.mjs --dist dist [--width 412 --height 915 --dpr 2.625]
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const DIST = arg("--dist", "dist"), PORT = 4193;
const vp = { width: Number(arg("--width", 412)), height: Number(arg("--height", 915)) };
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", DIST, String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const ctx = await browser.newContext({ viewport: vp, screen: vp, deviceScaleFactor: Number(arg("--dpr", 2.625)), isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/?qa=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("hinge.try", 600));
  await settle();
  await page.evaluate(() => window.__jointsFilm.pause());
  await page.waitForTimeout(500);
  const start = await page.evaluate(() => window.__jointsQA.findScreenPoint("ulna_r", true));
  const out = await page.evaluate(({ x, y }) => new Promise((resolve) => {
    const muts = new Map();
    let total = 0;
    const key = (n) => { const el = n.nodeType === 1 ? n : n.parentElement; if (!el) return "?"; return (el.getAttribute("data-testid") || el.className?.baseVal || el.className || el.tagName).toString().slice(0, 60); };
    const mo = new MutationObserver((list) => { for (const m of list) { total++; const k = `${m.type}:${m.attributeName ?? ""}:${key(m.target)}`; muts.set(k, (muts.get(k) ?? 0) + 1); } });
    mo.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true });
    const target = document.querySelector("canvas");
    const fire = (type, cx, cy) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
    const qa = window.__jointsQA;
    const dof = () => qa.getDof("flexion");
    fire("pointerdown", x, y);
    let px = x, py = y;
    const probe = (dx, dy) => { const b = dof(); px += dx; py += dy; fire("pointermove", px, py); return dof() - b; };
    const sy = probe(0, 6) || probe(0, -12), sx = probe(6, 0) || probe(-12, 0);
    const useY = Math.abs(sy) >= Math.abs(sx);
    let slope = (useY ? sy : sx) / 6 || 1;
    const t0 = performance.now();
    let frames = 0;
    let perf = null;
    const step = () => {
      const t = (performance.now() - t0) / 1000;
      const before = dof();
      const d = Math.max(-40, Math.min(40, (72.5 + 47.5 * Math.sin(t * 2.4) - before) / slope));
      if (useY) py += d; else px += d;
      fire("pointermove", px, py);
      const after = dof();
      if (Math.abs(d) > 0.5 && Math.abs(after - before) > 0.05) slope = 0.8 * slope + 0.2 * ((after - before) / d);
      frames++;
      if (frames === 60) perf = qa.perf();
      if (performance.now() - t0 < 3000) requestAnimationFrame(step);
      else {
        fire("pointerup", px, py);
        setTimeout(() => { mo.disconnect(); resolve({ frames, total, perFrame: +(total / frames).toFixed(1), top: [...muts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, +(v / frames).toFixed(2)]), perfDuringDrag: perf }); }, 0);
      }
    };
    requestAnimationFrame(step);
  }), start);
  out.scene = await page.evaluate(() => {
    const s = window.__jointsQA.scene?.() ?? null;
    return s;
  });
  console.log(JSON.stringify(out, null, 1));
} finally { await browser.close(); server.kill(); }
