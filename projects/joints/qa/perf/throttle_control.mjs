// Control for the 4x-CPU emulation ceiling: rAF cadence of pages with NO app code, under CDP CPU throttling.
//   node qa/perf/throttle_control.mjs
// a) style-only page (one transform write per frame)
// b) WebGL page (clear + one trivial draw per frame, same canvas size / DPR as the mobile profile)
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const STYLE_PAGE = "<body style='background:#111'><div id=x style='position:fixed;left:0;top:0;width:40px;height:40px;background:#3a6'></div></body>";
const GL_PAGE = `<body style="margin:0;background:#111"><canvas id=c style="width:100vw;height:100vh"></canvas><script>
  const c = document.getElementById("c");
  const hashParts = () => (location.hash.slice(1) || "1,2.625").split(",").map(Number);
  const setSize = () => { const r = hashParts()[1] || devicePixelRatio; c.width = Math.round(innerWidth * r); c.height = Math.round(innerHeight * r); };
  setSize(); addEventListener("hashchange", setSize);
  const gl = c.getContext("webgl2");
  const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, "attribute vec2 p; uniform mat4 m; void main(){ gl_Position = m * vec4(p,0.,1.); }"); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, "precision mediump float; void main(){ gl_FragColor = vec4(0.2,0.6,0.4,1.); }"); gl.compileShader(fs);
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5,-0.5, 0.5,-0.5, 0,0.5]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const mloc = gl.getUniformLocation(pr, "m");
  window.__draw = (t) => { gl.viewport(0,0,c.width,c.height); gl.clearColor(0.05,0.06,0.08,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const n = hashParts()[0] || 1;
    for (let i = 0; i < n; i++) { M[12] = Math.sin(t / 500) * 0.2 + i * 0.001; gl.uniformMatrix4fv(mloc, false, M); gl.drawArrays(gl.TRIANGLES, 0, 3); } };
  const M = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
</script></body>`;
const measure = (draws) => (draws ? `(() => new Promise((resolve) => { const ts = []; const t0 = performance.now(); const step = () => { window.__draw(performance.now()); ts.push(performance.now()); if (performance.now() - t0 < 6000) requestAnimationFrame(step); else resolve(summary(ts)); }; requestAnimationFrame(step); }))()` : "");
for (const [name, content, hash] of [["style-only", STYLE_PAGE, ""], ["gl-1-draw-dpr1.5", GL_PAGE, "#1,1.5"], ["gl-68-draws-dpr1.5", GL_PAGE, "#68,1.5"], ["gl-68-draws-dpr2.6", GL_PAGE, "#68,2.625"]]) {
  for (const rate of [1, 4]) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await page.setContent(content);
    if (hash) await page.evaluate((h) => { location.hash = h; }, hash);
    const r = await page.evaluate((isGl) => new Promise((resolve) => {
      const ts = [];
      const el = document.getElementById("x");
      const t0 = performance.now();
      const step = () => {
        if (isGl) window.__draw(performance.now());
        else el.style.transform = `translateX(${(performance.now() - t0) % 200}px)`;
        ts.push(performance.now());
        if (performance.now() - t0 < 6000) requestAnimationFrame(step);
        else {
          const iv = ts.slice(1).map((t, i) => t - ts[i]);
          const p = (q) => +[...iv].sort((a, b) => a - b)[Math.min(iv.length - 1, Math.ceil((q / 100) * iv.length) - 1)].toFixed(2);
          resolve({ frames: ts.length, fps: +((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)).toFixed(1), p50: p(50), p95: p(95), max: +Math.max(...iv).toFixed(2) });
        }
      };
      requestAnimationFrame(step);
    }), !!hash);
    console.log(name.padEnd(15), "cpuThrottle", rate, JSON.stringify(r));
    await ctx.close();
  }
}
await browser.close();
