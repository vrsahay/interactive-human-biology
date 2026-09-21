// Step 12R diagnostic: per-frame cost of the drag hot path, measured with one variable changed at a time.
// Each variant runs a closed-loop elbow drag (identical pointer path) at the given CPU throttle and reports frame intervals.
//   node qa/perf/drag_variants.mjs --dist dist --cpu 4 --seconds 6
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const DIST = arg("--dist", "dist"), PORT = 4195, CPU = Number(arg("--cpu", 4)), SEC = Number(arg("--seconds", 6)), REPEAT = Number(arg("--repeat", 1));
const QUERIES = (arg("--queries", "") || "").split(",").filter(Boolean);
const VARIANTS = {
  baseline: () => undefined,
  no_label_blur: () => { const s = document.createElement("style"); s.textContent = ".film .label { backdrop-filter: none !important; }"; document.head.appendChild(s); },
  contain_overlay: () => { const s = document.createElement("style"); s.textContent = ".label-layer, .labels, [data-labels] { contain: layout style paint !important; }"; document.head.appendChild(s); },
  labels_hidden: () => { const s = document.createElement("style"); s.textContent = ".film .label, .film .label-leader, .film .label-dot { display: none !important; }"; document.head.appendChild(s); },
  body_hidden: () => { window.__jointsQA.setRootVisible("body", false); },
  overlays_hidden: () => { window.__jointsQA.setRootVisible("overlays", false); },
  ui_panel_hidden: () => { const s = document.createElement("style"); s.textContent = "[data-testid=film-interact], .film-player { display: none !important; }"; document.head.appendChild(s); },
};
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", DIST, String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const out = {};
const cases = QUERIES.length ? QUERIES.map((q) => [q, () => undefined, q === "plain" ? "" : "&" + q]) : Object.entries(VARIANTS).map(([n, f]) => [n, f, ""]);
for (let rep = 1; rep <= REPEAT; rep++) for (const [name, patch, query] of cases) {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, screen: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => {
      const lab = (window.__lab = { renders: [], cleared: false, at: 0 });
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf((ts) => { lab.cleared = false; cb(ts); if (lab.cleared) { lab.cleared = false; lab.renders.push([lab.at, performance.now()]); } });
      for (const Ctx of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
        if (!Ctx) continue;
        const clear = Ctx.prototype.clear;
        Ctx.prototype.clear = function (mask) { if (!lab.cleared) { lab.cleared = true; lab.at = performance.now(); } return clear.call(this, mask); };
      }
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
    await page.goto(`http://localhost:${PORT}/?qa=1&autoplay=0${query}`);
    await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
    await page.evaluate(() => window.__jointsFilm.seekShot("hinge.try", 600));
    await page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 180000 });
    await page.evaluate(() => window.__jointsFilm.pause());
    await page.evaluate(patch);
    await page.waitForTimeout(600);
    const start = await page.evaluate(() => window.__jointsQA.findScreenPoint("ulna_r", true));
    const from = await page.evaluate(() => performance.now());
    await page.evaluate(({ x, y, ms }) => new Promise((resolve) => {
      const target = document.querySelector("canvas");
      const fire = (type, cx, cy) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
      const dof = () => window.__jointsQA.getDof("flexion");
      fire("pointerdown", x, y);
      let px = x, py = y;
      const probe = (dx, dy) => { const b = dof(); px += dx; py += dy; fire("pointermove", px, py); return dof() - b; };
      const sy = probe(0, 6) || probe(0, -12), sx = probe(6, 0) || probe(-12, 0);
      const useY = Math.abs(sy) >= Math.abs(sx);
      let slope = (useY ? sy : sx) / 6 || 1;
      const t0 = performance.now();
      const step = () => {
        const t = (performance.now() - t0) / 1000;
        const before = dof();
        const d = Math.max(-40, Math.min(40, (72.5 + 47.5 * Math.sin(t * 2.4) - before) / slope));
        if (useY) py += d; else px += d;
        fire("pointermove", px, py);
        const after = dof();
        if (Math.abs(d) > 0.5 && Math.abs(after - before) > 0.05) slope = 0.8 * slope + 0.2 * ((after - before) / d);
        if (performance.now() - t0 < ms) requestAnimationFrame(step);
        else { fire("pointerup", px, py); resolve(); }
      };
      requestAnimationFrame(step);
    }), { ...start, ms: SEC * 1000 });
    const to = await page.evaluate(() => performance.now());
    const w = await page.evaluate(([from, to]) => {
      const r = window.__lab.renders.filter((x) => x[0] >= from && x[0] <= to);
      const iv = r.slice(1).map((x, i) => x[0] - r[i][0]);
      const cpu = r.map((x) => x[1] - x[0]);
      const p = (a, q) => (a.length ? +[...a].sort((m, n) => m - n)[Math.min(a.length - 1, Math.ceil((q / 100) * a.length) - 1)].toFixed(2) : null);
      const span = r.length > 1 ? r[r.length - 1][0] - r[0][0] : 0;
      return { frames: r.length, fps: +((r.length - 1) / (span / 1000)).toFixed(1), intervalP50: p(iv, 50), intervalP95: p(iv, 95), renderCpuP50: p(cpu, 50), renderCpuP95: p(cpu, 95) };
    }, [from, to]);
    (out[name] ??= []).push(w);
    console.log(name, "run" + rep, JSON.stringify(w), JSON.stringify(await page.evaluate(() => ({ dpr: window.__jointsQA.perf().pixelRatio, quality: document.documentElement.dataset.quality }))));
  } finally { await browser.close(); }
}
server.kill();
console.log(JSON.stringify({ cpuThrottle: CPU, seconds: SEC, variants: out }, null, 1));
