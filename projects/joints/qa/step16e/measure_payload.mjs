// Step 16E §17: payload before and after, measured the same way on both builds.
//   node qa/step16e/measure_payload.mjs <baselineDist> <candidateDist>
// Bytes are deterministic (static server, no compression), so they are comparable across runs; times on this machine
// are not, and none are reported.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [baseDist, candDist] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

function initial(dist) {
  let js = 0, css = 0;
  for (const f of readdirSync(join(dist, "app"))) {
    const n = statSync(join(dist, "app", f)).size;
    if (f.endsWith(".js")) js += n;
    else if (f.endsWith(".css")) css += n;
  }
  return { jsKB: Math.round(js / 1024), cssKB: Math.round(css / 1024), jsCssKB: Math.round((js + css) / 1024) };
}

async function load(dist, port) {
  const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", dist, String(port)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 1000));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    // the default route, as a learner meets it: the landing card, then a first frame of the body behind it
    await page.goto(`http://localhost:${port}/?qa=1&dpr=1`);
    await page.waitForFunction(() => performance.getEntriesByName("joints:first-draw-submitted").length > 0, null, { timeout: 180000 });
    await page.waitForTimeout(4000);
    const r = await page.evaluate(() => {
      const first = performance.getEntriesByName("joints:first-draw-submitted")[0].startTime;
      const res = performance.getEntriesByType("resource").map((e) => ({ name: new URL(e.name).pathname, end: e.responseEnd, bytes: e.encodedBodySize || e.transferSize }));
      const sum = (l) => l.reduce((a, x) => a + x.bytes, 0);
      const before = res.filter((x) => x.end <= first);
      const audio = res.filter((x) => x.name.includes("/audio/"));
      return {
        bytesBeforeFirst3DKB: Math.round(sum(before) / 1024),
        filesBeforeFirst3D: before.length,
        audioBeforeFirst3DKB: Math.round(sum(before.filter((x) => x.name.includes("/audio/"))) / 1024),
        audioFetchedOnLandingKB: Math.round(sum(audio) / 1024),
        audioFilesOnLanding: audio.map((x) => x.name.split("/").pop()),
      };
    });
    await page.close();
    return r;
  } finally {
    server.kill();
  }
}

const narration = (dist) => {
  const dir = join(dist, "assets", "audio", "narration");
  let n = 0, b = 0;
  for (const f of readdirSync(dir)) if (f.endsWith(".mp3")) { n++; b += statSync(join(dir, f)).size; }
  return { clips: n, totalKB: Math.round(b / 1024) };
};

const out = {};
for (const [label, dist, port] of [["baseline f3c2ed2", baseDist, 4211], ["candidate", candDist, 4212]]) {
  out[label] = { ...initial(dist), narration: narration(dist), ...(await load(dist, port)) };
}
await browser.close();
writeFileSync("qa/reports/step16e.payload.json", JSON.stringify({ generatedAt: new Date().toISOString(), method: "static server, no compression; bytes are encoded body sizes; first 3D = the app's joints:first-draw-submitted mark; default route (landing card)", ...out }, null, 1));
console.log(JSON.stringify(out, null, 1));
