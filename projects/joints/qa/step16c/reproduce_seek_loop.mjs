// Step 16C: prove the mechanism behind the stall. Count currentTime assignments and seeking/seeked events on the
// narration element while the first (uncached) clip plays.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = 4196;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  // instrument before the app exists
  await page.addInitScript(() => {
    window.__media = { sets: [], events: [], listeners: 0 };
    const proto = HTMLMediaElement.prototype;
    const ct = Object.getOwnPropertyDescriptor(proto, "currentTime");
    Object.defineProperty(proto, "currentTime", {
      get() { return ct.get.call(this); },
      set(v) { window.__media.sets.push({ t: Math.round(performance.now()), src: (this.currentSrc || this.src || "").split("/").pop(), to: +Number(v).toFixed(2), from: +Number(ct.get.call(this)).toFixed(2), readyState: this.readyState }); ct.set.call(this, v); },
      configurable: true,
    });
    const srcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
    Object.defineProperty(proto, "src", {
      get() { return srcDesc.get.call(this); },
      set(v) { window.__media.events.push({ t: Math.round(performance.now()), e: "SET_SRC", src: String(v).split("/").pop(), ct: 0 }); srcDesc.set.call(this, v); },
      configurable: true,
    });
    const load0 = proto.load;
    proto.load = function () { window.__media.events.push({ t: Math.round(performance.now()), e: "LOAD", src: (this.currentSrc || "").split("/").pop(), ct: 0 }); return load0.call(this); };
    const addEL = proto.addEventListener;
    proto.addEventListener = function (type, fn, opts) {
      if (type === "loadedmetadata") window.__media.listeners++;
      if (!this.__wired) {
        this.__wired = true;
        for (const e of ["seeking", "seeked", "playing", "waiting", "stalled", "canplay", "loadedmetadata", "ended"]) addEL.call(this, e, () => window.__media.events.push({ t: Math.round(performance.now()), e, src: (this.currentSrc || this.src || "").split("/").pop(), ct: +Number(ct.get.call(this)).toFixed(2) }));
      }
      return addEL.call(this, type, fn, opts);
    };
  });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__jointsQA?.idle(), null, { timeout: 120000 });
  await page.evaluate(() => { window.__media.sets = []; window.__media.events = []; window.__media.listeners = 0; });
  await page.evaluate(() => window.__jointsFilm.play());
  await page.waitForTimeout(26000);
  const m = await page.evaluate(() => window.__media);
  const intro = m.sets.filter((s) => s.src === "intro.title.mp3");
  console.log(`currentTime assignments on intro.title.mp3 in the first 9 s: ${intro.length}`);
  for (const s of intro.slice(0, 14)) console.log(`   t=${s.t} set ${s.from} -> ${s.to}  readyState=${s.readyState}`);
  const ev = m.events.filter((e) => e.src === "intro.title.mp3");
  const counts = {};
  for (const e of ev) counts[e.e] = (counts[e.e] ?? 0) + 1;
  console.log(`\nmedia events on intro.title.mp3: ${JSON.stringify(counts)}`);
  console.log(`loadedmetadata listeners registered (never removed until they fire): ${m.listeners}`);
  writeFileSync("qa/reports/step16c.seek_loop.json", JSON.stringify({ assignments: intro, events: ev, listeners: m.listeners }, null, 1));
} finally { await browser.close(); server.kill(); }
