#!/usr/bin/env node
// Bakes the PMREM environment the Stage used to generate at startup (three RoomEnvironment, sigma 0.04) into a small RGBE8
// image so the runtime uploads a ready CubeUV texture instead of compiling and running PMREM shaders on the main thread.
//   node pipeline/env/bake_environment.mjs [--sizes 256,128,64] [--out qa/export/env]
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const sizes = arg("--sizes", "256,128,64").split(",").map(Number);
const OUT = resolve(ROOT, arg("--out", "qa/export/env"));
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, [join(ROOT, "pipeline/tools/serve_static.mjs"), ROOT, "4177"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage();
  page.on("console", (m) => console.log("page:", m.text()));
  await page.goto(`http://localhost:4177/pipeline/env/bake_environment.html?sizes=${JSON.stringify(sizes)}`);
  await page.waitForFunction(() => window.__bake, null, { timeout: 120000 });
  const bake = await page.evaluate(() => window.__bake);
  const results = [];
  for (const [size, d] of Object.entries(bake.sizes)) {
    const f = new Float32Array(new Uint8Array(Buffer.from(d.float32Base64, "base64")).buffer);
    const rgbe = new Uint8Array(d.width * d.height * 4);
    let maxRel = 0;
    let maxVal = 0;
    for (let i = 0; i < d.width * d.height; i++) {
      const r = Math.max(0, f[i * 4]), g = Math.max(0, f[i * 4 + 1]), b = Math.max(0, f[i * 4 + 2]);
      const m = Math.max(r, g, b);
      maxVal = Math.max(maxVal, m);
      if (m < 1e-9) continue;
      const e = Math.floor(Math.log2(m)) + 1;
      const scale = 256 / 2 ** e;
      rgbe.set([Math.min(255, Math.floor(r * scale)), Math.min(255, Math.floor(g * scale)), Math.min(255, Math.floor(b * scale)), e + 128], i * 4);
      // decode check (same formula as the runtime)
      for (let k = 0; k < 3; k++) {
        const orig = [r, g, b][k];
        const dec = ((rgbe[i * 4 + k] + 0.5) / 256) * 2 ** (rgbe[i * 4 + 3] - 128);
        if (orig > 1e-3) maxRel = Math.max(maxRel, Math.abs(dec - orig) / orig);
      }
    }
    const png = await sharp(Buffer.from(rgbe), { raw: { width: d.width, height: d.height, channels: 4 } }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
    const webp = await sharp(Buffer.from(rgbe), { raw: { width: d.width, height: d.height, channels: 4 } }).webp({ lossless: true, effort: 6, exact: true }).toBuffer();
    // WebP lossless is only usable if the decoded alpha/colour are exact (exponent lives in alpha).
    const webpBack = await sharp(webp).ensureAlpha().raw().toBuffer();
    const webpExact = Buffer.compare(webpBack, Buffer.from(rgbe)) === 0;
    // Raw RGBE bytes (decoded without any image decoder, so no premultiplied-alpha risk); compressed on the wire.
    const raw = Buffer.from(rgbe);
    const rawBrotli = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }).byteLength;
    const rawGzip = gzipSync(raw, { level: 9 }).byteLength;
    const bytes = raw;
    const file = `room_env_cubeuv_${size}.rgbe`;
    writeFileSync(join(OUT, file), bytes);
    writeFileSync(join(OUT, file + ".png"), png);
    results.push({ size: Number(size), file, width: d.width, height: d.height, bytes: bytes.byteLength, rawBrotliBytes: rawBrotli, rawGzipBytes: rawGzip, pngBytes: png.byteLength, webpBytes: webp.byteLength, webpExact, sha256: createHash("sha256").update(bytes).digest("hex"), maxRelativeError: +maxRel.toFixed(5), maxValue: +maxVal.toFixed(3), gpuBytesHalfFloat: d.width * d.height * 8 });
  }
  const meta = { kind: "environment_cubeuv", encoding: "rgbe8 (rgb mantissa, alpha = exponent + 128; value = (c + 0.5) / 256 * 2^(a - 128))", generator: `three r${bake.revision} PMREMGenerator.fromScene(new RoomEnvironment(), sigma 0.04, near 0.1, far 100, { size })`, textureType: "HalfFloat RGBA, CubeUVReflectionMapping, LinearFilter, no mipmaps, flipY false, linear colour space", variants: results };
  writeFileSync(join(OUT, "environment.bake_report.json"), JSON.stringify(meta, null, 1));
  console.log(JSON.stringify(meta, null, 1));
} finally {
  await browser.close();
  server.kill();
}
