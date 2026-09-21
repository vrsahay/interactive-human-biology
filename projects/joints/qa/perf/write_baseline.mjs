// Writes qa/reports/step12.baseline.json from: asset hashes, the baseline bundle, the perf-lab baseline report, the startup diagnosis.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const file = (p) => { const b = readFileSync(p); return { path: p, bytes: b.byteLength, sha256: sha(b) }; };
const hashes = ["public/assets/joints/elbow_r/elbow_r.core.glb", "public/assets/joints/elbow_r/elbow_r.detail.glb", "public/assets/joints/elbow_r/elbow_r.context.glb", "public/assets/joints/elbow_r/joint-manifest.json", "public/assets/body/body.skeleton.glb", "public/assets/body/body.skin.glb", "public/assets/body/body-manifest.json"].map(file);
const blender = ["blender/Joints_Working.blend", "blender/Joints_Working.v001.blend", "blender/Joints_Working.v002.blend", "blender/Joints_Working.v003.blend", "blender/Joints_Working.v004.blend"].map(file);
const bundle = readdirSync("qa/perf/baseline-dist/app").filter((f) => /\.(js|css)$/.test(f)).map((f) => { const b = readFileSync(join("qa/perf/baseline-dist/app", f)); return { file: f, bytes: b.byteLength, gzipBytes: gzipSync(b, { level: 9 }).byteLength, brotliBytes: brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }).byteLength }; });
// texture memory of what the film loads (core, detail, skeleton, skin): every glTF texture becomes its own GPU texture (RGBA8 + mips)
const textures = [];
for (const p of ["public/assets/joints/elbow_r/elbow_r.core.glb", "public/assets/joints/elbow_r/elbow_r.detail.glb", "public/assets/body/body.skeleton.glb", "public/assets/body/body.skin.glb"]) {
  const doc = await io.read(p);
  for (const t of doc.getRoot().listTextures()) { const img = t.getImage(); const m = await sharp(Buffer.from(img)).metadata(); textures.push({ file: p.split("/").pop(), name: t.getName(), bytes: img.byteLength, sha256: sha(img), width: m.width, height: m.height, gpuBytes: Math.round(m.width * m.height * 4 * 4 / 3) }); }
}
const uniqueByContent = new Map(textures.map((t) => [t.sha256, t]));
const perf = JSON.parse(readFileSync("qa/reports/step12.perf.baseline.json", "utf8"));
const summary = Object.fromEntries(Object.entries(perf.profiles).map(([id, p]) => [id, { classification: p.profile.classification, network: p.profile.net, cpuThrottle: p.profile.cpu, viewport: p.profile.viewport, dpr: p.profile.dpr, firstMeaningful3DMs: p.summary.firstMeaningful3DMs, shellVisibleMs: p.summary.shellVisibleMs, bytesBeforeFirst3D: p.summary.bytesBeforeFirst3D, jsHeapUsedBytes: p.summary.jsHeapUsedBytes, repeatVisit: p.summary.repeatVisit, renderer: p.summary.renderer, milestones: p.loads[0].resources.map((r) => ({ name: r.name, start: r.start, end: r.end, transfer: r.transfer })), longTasksBeforeFirst3DMs: p.loads.map((l) => l.longTasksBeforeFirst3D.reduce((a, t) => a + t[1], 0)), consoleErrors: p.loads.reduce((a, l) => a + l.consoleErrors.length, 0), interactions: Object.fromEntries(Object.entries(p.interactions).filter(([k]) => !k.endsWith("Renderer") && k !== "selectionResult")) }]));
const out = {
  step: 12, kind: "baseline", generatedAt: new Date().toISOString(),
  build: "Step-11 production build (snapshot qa/perf/baseline-dist, built before any Step-12 change)",
  machine: { model: "Lenovo 20V9", cpu: "Intel Core i5-1135G7 (4C/8T)", gpu: "Intel Iris Xe Graphics (driver 31.0.101.1999)", memoryGB: 16, os: "Windows 11 Pro", browser: "Google Chrome 152.0.7977.83 (headless, ANGLE D3D11)" },
  hashes, blenderFiles: blender, masterSha256: "f7313dabbf27d990ce1d7d3f771ebf1f914ffc5fb1162a7f71339bd3e6dc7fb0",
  bundle,
  textures: { loadedByFilm: textures, gpuTextures: textures.length, gpuBytesEstimate: textures.reduce((a, t) => a + t.gpuBytes, 0), uniqueContent: uniqueByContent.size, duplicateGpuBytesEstimate: textures.reduce((a, t) => a + t.gpuBytes, 0) - [...uniqueByContent.values()].reduce((a, t) => a + t.gpuBytes, 0), environmentPmremGpuBytes: 768 * 1024 * 8, note: "PMREM environment render target (RoomEnvironment, cube 256) is RGBA HalfFloat 768x1024" },
  startupDiagnosis: JSON.parse(readFileSync("qa/perf/startup_diagnosis.baseline.json", "utf8")),
  perfLab: { method: perf.method, runsPerProfile: 5, profiles: summary },
  targets: { mobileMidRange: { firstMeaningful3DMs: 2500, dragFpsMin: 45, p95FrameMs: 22, inputToVisualMs: 80 }, tablet: { firstMeaningful3DMs: 2500, fpsMin: 50, p95FrameMs: 20 }, laptopIntegratedGpu: { firstMeaningful3DMs: 1500, fps: 60 } },
  step11ReportsPreserved: readdirSync("qa/reports").filter((f) => f.startsWith("step11")).concat(readdirSync("qa/visual/step11").map((f) => `qa/visual/step11/${f}`)),
};
writeFileSync("qa/reports/step12.baseline.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ bundle, textures: out.textures.gpuTextures, gpu: out.textures.gpuBytesEstimate, dup: out.textures.duplicateGpuBytesEstimate, unique: out.textures.uniqueContent, list: textures.map((t) => [t.file, t.name, t.bytes, `${t.width}x${t.height}`, t.sha256.slice(0, 8)]) }, null, 1));
