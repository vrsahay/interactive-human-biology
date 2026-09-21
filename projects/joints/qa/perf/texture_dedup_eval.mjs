// Phase N evaluation: texture bytes + GPU textures, Step 11 (film loads core, detail, skeleton, skin) vs Step 12
// (material library + staged body files + core, detail) vs a hypothetical externalised elbow texture set.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const sha = (b) => createHash("sha256").update(b).digest("hex");
async function textures(path) {
  const doc = await io.read(path);
  const out = [];
  for (const t of doc.getRoot().listTextures()) { const img = t.getImage(); const m = await sharp(Buffer.from(img)).metadata(); out.push({ file: path.split("/").pop(), name: t.getName(), bytes: img.byteLength, sha: sha(img).slice(0, 12), gpu: Math.round(m.width * m.height * 4 * 4 / 3) }); }
  return out;
}
const sum = (list, k) => list.reduce((a, x) => a + x[k], 0);
const uniq = (list) => [...new Map(list.map((t) => [t.sha, t])).values()];
const step11 = [...(await textures("public/assets/joints/elbow_r/elbow_r.core.glb")), ...(await textures("public/assets/joints/elbow_r/elbow_r.detail.glb")), ...(await textures("public/assets/body/body.skeleton.glb")), ...(await textures("public/assets/body/body.skin.glb"))];
const lib = await textures("public/assets/shared/body-materials.glb");
const elbow = [...(await textures("public/assets/joints/elbow_r/elbow_r.core.glb")), ...(await textures("public/assets/joints/elbow_r/elbow_r.detail.glb"))];
const step12 = [...lib, ...elbow];
const hypothetical = uniq(step12);
const envStep11 = 768 * 1024 * 8, envStep12 = 336 * 256 * 8;
const out = {
  step11: { downloadBytes: sum(step11, "bytes"), duplicateDownloadBytes: sum(step11, "bytes") - sum(uniq(step11), "bytes"), gpuTextures: step11.length, gpuBytes: sum(step11, "gpu") + envStep11, note: "every glTF texture uploaded separately + PMREM RoomEnvironment render target (768x1024 half float)" },
  step12: { downloadBytes: sum(step12, "bytes"), duplicateDownloadBytes: sum(step12, "bytes") - sum(uniq(step12), "bytes"), gpuTextures: uniq(step12).length, gpuBytes: sum(uniq(step12), "gpu") + envStep12, note: "body textures shipped once in public/assets/shared/body-materials.glb; runtime de-duplication by image content hash; baked 64 environment (336x256 half float)" },
  hypotheticalElbowExternalised: { downloadBytes: sum(hypothetical, "bytes"), savesDownloadBytes: sum(step12, "bytes") - sum(hypothetical, "bytes"), savesGpuBytes: 0, repeatVisitSavings: 0, cost: "re-export and re-validate the validated elbow GLBs (Gate 2 + Gate 3 pose consistency) and add external-image integrity checks", decision: "not done: ~" },
  lists: { step11, library: lib, elbow },
};
out.hypotheticalElbowExternalised.decision = `not done: saves ${(out.hypotheticalElbowExternalised.savesDownloadBytes / 1024).toFixed(1)} KB once per first visit (HTTP-cached afterwards), no GPU memory (already de-duplicated at runtime); would require modifying validated elbow production assets`;
writeFileSync("qa/reports/step12.texture_dedup.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ step11: out.step11, step12: out.step12, hypothetical: out.hypotheticalElbowExternalised }, null, 1));
