// Optimise staged raw GLBs into web tiers + final manifest (staging only; never writes public/).
// Usage: node pipeline/optimize.ts --joint elbow_r
//
// Per tier:
//   1. mesh carriers: every anatomy node (extras.structureId + anatomy role) moves its mesh onto one named child
//      "<node>__mesh" (extras.meshCarrierFor = structureId). Quantisation then only changes carrier matrices, so
//      structure nodes, anchors and rig empties keep their exact transforms. No meshes are merged, joined or instanced.
//   2. prune   (keepLeaves + keepExtras: anchor/rig empties and their extras survive)
//   3. dedup   (accessors, materials, textures only — never meshes, so no instancing)
//   4. textures: KTX2 when an encoder is available (toktx); otherwise WebP fallback at original resolution, chosen per
//      texture as the smallest candidate passing a measured quality gate (PSNR >= 47 dB, max channel error <= 6)
//   5. meshopt (EXT_meshopt_compression, method QUANTIZE) with a single quantisation pass:
//      positions 14 bit, normals 10 bit, UVs 12 bit (KHR_mesh_quantization)
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, brotliCompressSync, constants as zc } from "node:zlib";
import { NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { dedup, meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const joint = process.argv[process.argv.indexOf("--joint") + 1];
const STAGE = join(ROOT, "qa", "export", joint);
const OUT = join(STAGE, "optimized");
const TIERS = ["core", "detail", "context"];
const ANATOMY_ROLES = new Set(["bone_fixed", "bone_moving", "follow", "tracked", "spanning_soft", "attached_soft", "context"]);
const QUANT = { quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizationVolume: "mesh" };

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const gz = (buf) => gzipSync(buf, { level: 9 }).byteLength;
const br = (buf) => brotliCompressSync(buf, { params: { [zc.BROTLI_PARAM_QUALITY]: 11 } }).byteLength;

// Texture quality gate: smallest WebP candidate with PSNR >= 47 dB and max per-channel error <= 6 (8-bit levels) vs the source.
const TEXTURE_GATE = { minPsnrDb: 47, maxAbsDiff: 6 };
async function chooseWebP(png, name) {
  const ref = await sharp(png).ensureAlpha().raw().toBuffer();
  const candidates = [
    ["webp_q90", { quality: 90, effort: 6 }], ["webp_q95", { quality: 95, effort: 6 }],
    ["webp_near_lossless_60", { nearLossless: true, quality: 60, effort: 6 }], ["webp_lossless", { lossless: true, effort: 6 }],
  ];
  const measured = [];
  for (const [label, opts] of candidates) {
    const bytes = await sharp(png).webp(opts).toBuffer();
    const dec = await sharp(bytes).ensureAlpha().raw().toBuffer();
    let se = 0, maxd = 0, n = 0;
    for (let i = 0; i < dec.length; i++) { if (i % 4 === 3) continue; const d = dec[i] - ref[i]; se += d * d; n++; if (Math.abs(d) > maxd) maxd = Math.abs(d); }
    const rmse = Math.sqrt(se / n);
    measured.push({ label, bytes, size: bytes.byteLength, rmse: +rmse.toFixed(3), psnrDb: rmse === 0 ? Infinity : +(20 * Math.log10(255 / rmse)).toFixed(2), maxAbsDiff: maxd });
  }
  const passing = measured.filter((m) => m.psnrDb >= TEXTURE_GATE.minPsnrDb && m.maxAbsDiff <= TEXTURE_GATE.maxAbsDiff).sort((a, b) => a.size - b.size);
  if (!passing.length) throw new Error(`texture ${name}: no WebP candidate passes the quality gate`);
  const best = passing[0];
  return { bytes: best.bytes, metrics: { name, sourceBytes: png.byteLength, chosen: best.label, bytes: best.size, psnrDb: best.psnrDb, rmse: best.rmse, maxAbsDiff: best.maxAbsDiff,
    candidates: measured.map(({ bytes, ...m }) => m) } };
}

let ktx2Available = false;
try { execSync("toktx --version", { stdio: "ignore" }); ktx2Available = true; } catch { ktx2Available = false; }

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(readFileSync(join(STAGE, "joint-manifest.raw.json"), "utf8"));
const report = { joint, generatedAt: new Date().toISOString(), ktx2Available, textureStrategy: ktx2Available ? "KTX2" : "WebP fallback (toktx not installed)", quantization: QUANT, tiers: {} };
const textureCatalog = {};

for (const tier of TIERS) {
  const rawPath = join(STAGE, `${joint}.${tier}.raw.glb`);
  const rawBytes = readFileSync(rawPath);
  const doc = await io.readBinary(new Uint8Array(rawBytes));
  const root = doc.getRoot();
  const steps = {};

  // 1. mesh carriers
  let carriers = 0;
  for (const node of root.listNodes()) {
    const x = node.getExtras() ?? {};
    const mesh = node.getMesh();
    if (!mesh || !x.structureId || !ANATOMY_ROLES.has(x.role)) continue;
    const carrier = doc.createNode(`${node.getName()}__mesh`).setMesh(mesh).setExtras({ meshCarrierFor: x.structureId, role: "mesh_carrier", jointId: x.jointId });
    node.setMesh(null).addChild(carrier);
    carriers++;
  }
  const strayMeshNodes = root.listNodes().filter((n) => n.getMesh() && !(n.getExtras() ?? {}).meshCarrierFor).map((n) => n.getName());
  if (strayMeshNodes.length) throw new Error(`${tier}: mesh on non-anatomy node(s): ${strayMeshNodes}`);
  steps.carriers = carriers;

  // 2-3. prune + dedup
  const before = { nodes: root.listNodes().length, textures: root.listTextures().length, accessors: root.listAccessors().length, materials: root.listMaterials().length };
  await doc.transform(
    prune({ keepLeaves: true, keepExtras: true, keepAttributes: false, keepIndices: false, keepSolidTextures: false }),
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MATERIAL, PropertyType.TEXTURE], keepUniqueNames: true }),
  );
  const after = { nodes: root.listNodes().length, textures: root.listTextures().length, accessors: root.listAccessors().length, materials: root.listMaterials().length };
  steps.prune_dedup = { before, after };

  // 4. textures — KTX2 if available, else WebP chosen per texture by a measured quality gate (original resolution)
  const texBefore = root.listTextures().map((t) => ({ name: t.getName(), mime: t.getMimeType(), bytes: t.getImage().byteLength, size: t.getSize() }));
  if (ktx2Available) throw new Error("KTX2 path not implemented in this repository yet");
  const texMetrics = [];
  for (const t of root.listTextures()) {
    const choice = await chooseWebP(Buffer.from(t.getImage()), t.getName());
    t.setImage(new Uint8Array(choice.bytes)).setMimeType("image/webp");
    if (t.getURI()) t.setURI(t.getURI().replace(/\.[a-z]+$/i, ".webp"));
    texMetrics.push(choice.metrics);
  }
  doc.createExtension(EXTTextureWebP).setRequired(true);
  const texAfter = root.listTextures().map((t) => ({ name: t.getName(), mime: t.getMimeType(), bytes: t.getImage().byteLength, size: t.getSize(), sha256: sha256(t.getImage()),
    quality: texMetrics.find((m) => m.name === t.getName()) }));
  steps.textures = { before: texBefore, after: texAfter };
  for (const t of texAfter) textureCatalog[t.sha256] = { name: t.name, mime: t.mime, bytes: t.bytes, size: t.size, tiers: [...(textureCatalog[t.sha256]?.tiers ?? []), tier] };

  // 5. meshopt with one quantisation pass
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium", ...QUANT }));
  steps.uvKeptFloat = root.listNodes().filter((n) => n.getMesh()).filter((n) => n.getMesh().listPrimitives().some((p) => p.getAttribute("TEXCOORD_0")?.getComponentType() === 5126)).map((n) => n.getName());
  const glb = await io.writeBinary(doc);
  const outPath = join(OUT, `${joint}.${tier}.glb`);
  writeFileSync(outPath, glb);

  // transfer estimate without embedded textures (shared texture budget is separate)
  const noTex = await io.readBinary(glb);
  for (const t of noTex.getRoot().listTextures()) t.dispose();
  const glbNoTex = await io.writeBinary(noTex);

  const textureBytes = texAfter.reduce((s, t) => s + t.bytes, 0);
  const asset = {
    url: `${joint}.${tier}.glb`, bytes: glb.byteLength, sha256: sha256(glb), gzipBytes: gz(glb), brotliBytes: br(glb),
    embeddedTextureBytes: textureBytes, bytesExcludingTextures: glbNoTex.byteLength, gzipBytesExcludingTextures: gz(glbNoTex), brotliBytesExcludingTextures: br(glbNoTex),
    rawBytes: rawBytes.byteLength, rawSha256: sha256(rawBytes), extensionsRequired: doc.getRoot().listExtensionsUsed().filter((e) => e.isRequired()).map((e) => e.extensionName),
    textures: texAfter.map((t) => ({ name: t.name, mimeType: t.mime, bytes: t.bytes, sha256: t.sha256, size: t.size })),
  };
  Object.assign(manifest.tiers[tier], asset);
  report.tiers[tier] = { steps, asset };
}

const uniqueTextures = Object.entries(textureCatalog).map(([sha, t]) => ({ sha256: sha, ...t }));
manifest.meshConvention = "Each anatomy node carries extras (structureId, role, tier, side, label) and has exactly one child '<node>__mesh' with extras.meshCarrierFor = structureId holding the quantised mesh. Resolve picks by walking up to the node with extras.structureId and an anatomy role.";
manifest.compression = { geometry: "EXT_meshopt_compression (QUANTIZE) + KHR_mesh_quantization", positionBits: 14, normalBits: 10, texcoordBits: 12, draco: false,
  textures: report.textureStrategy, textureQualityGate: TEXTURE_GATE, textureNote: "Textures are embedded per tier at original resolution (self-contained tiers); identical images repeat across tiers (see sharedTextures)." };
manifest.sharedTextures = { unique: uniqueTextures, uniqueBytes: uniqueTextures.reduce((s, t) => s + t.bytes, 0), budgetKB: 450 };
manifest.generatedAt = report.generatedAt;
writeFileSync(join(OUT, "joint-manifest.json"), JSON.stringify(manifest, null, 1));
writeFileSync(join(STAGE, `${joint}.optimize_report.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ ktx2Available, tiers: Object.fromEntries(TIERS.map((t) => [t, { carriers: report.tiers[t].steps.carriers, pruneDedup: report.tiers[t].steps.prune_dedup,
  ...Object.fromEntries(Object.entries(report.tiers[t].asset).filter(([k]) => !["textures", "sha256", "rawSha256"].includes(k))),
  textures: report.tiers[t].asset.textures.map((x) => `${x.name} ${x.mimeType} ${x.bytes}B ${x.size?.join("x")}`) }])),
  sharedTexturesUniqueBytes: manifest.sharedTextures.uniqueBytes, uniqueTextureCount: uniqueTextures.length }, null, 1));
