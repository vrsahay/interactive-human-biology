// Step 13 FINAL: freeze the build. Hashes the Blender files, the validated elbow assets, the body assets, the shared
// assets and the current production JS/CSS, and records build identity, test counts and known limitations.
//   npx tsx pipeline/qa/build_frozen_build.ts [--tests-unit 90 --tests-e2e 48]  ->  qa/expert/frozen-build.json
// READ ONLY: it never writes to any file it hashes.
import { createHash, type BinaryLike } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const arg = (k: string, d: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version?: string; dependencies: Record<string, string>; devDependencies: Record<string, string> };
const config = JSON.parse(readFileSync(join(ROOT, "pipeline/config.json"), "utf8")) as { master: { path: string; sha256: string }; blender: { versionPin: string } };

const hash = (abs: string) => {
  const bytes = readFileSync(abs);
  return { bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes as BinaryLike).digest("hex"), modified: statSync(abs).mtime.toISOString() };
};
const entry = (rel: string, abs = join(ROOT, rel)) => (existsSync(abs) ? { path: rel, ...hash(abs) } : { path: rel, missing: true as const });

const MASTER = config.master.path;
const blender = ["blender/Joints_Working.blend", "blender/Joints_Working.v001.blend", "blender/Joints_Working.v002.blend", "blender/Joints_Working.v003.blend", "blender/Joints_Working.v004.blend"];
const elbow = ["public/assets/joints/elbow_r/elbow_r.core.glb", "public/assets/joints/elbow_r/elbow_r.detail.glb", "public/assets/joints/elbow_r/elbow_r.context.glb", "public/assets/joints/elbow_r/joint-manifest.json"];
const bodyV2 = readdirSync(join(ROOT, "public/assets/body/v2")).map((f) => `public/assets/body/v2/${f}`);
const bodyV3 = readdirSync(join(ROOT, "public/assets/body/v3")).map((f) => `public/assets/body/v3/${f}`);
const bodyStep11 = ["public/assets/body/body.skeleton.glb", "public/assets/body/body.skin.glb", "public/assets/body/body-manifest.json"];
const shared = ["public/assets/shared/body-materials.glb", "public/assets/shared/env/environment.json", "public/assets/shared/env/room_env_cubeuv_64.rgbe"];
const narrationFiles = readdirSync(join(ROOT, "public/assets/audio/narration")).map((f) => `public/assets/audio/narration/${f}`);
const distDir = join(ROOT, "dist");
const distFiles = existsSync(distDir)
  ? ["index.html", ...readdirSync(join(distDir, "app")).map((f) => `app/${f}`)].filter((f) => !f.endsWith(".map")).map((f) => entry(`dist/${f}`, join(distDir, f)))
  : [];

const masterEntry = { path: "<owner desktop>/Human_Body_Master.blend", pinnedInConfig: config.master.sha256, ...hash(MASTER) };

const out = {
  step: "13-final",
  document: "Frozen build record. The product is frozen for expert sign-off; these hashes identify exactly what was reviewed.",
  frozenAt: new Date().toISOString(),
  application: {
    name: "Types of Joints - video-first lesson",
    packageVersion: pkg.version ?? "unversioned (private package)",
    lesson: "hinge-elbow: 6 chapters, 22 shots, ~3 min",
    route: "film is the default route; ?mode=sandbox keeps the Step-10 shell",
  },
  toolchain: {
    three: pkg.dependencies.three ?? pkg.devDependencies.three,
    preact: pkg.dependencies.preact ?? pkg.devDependencies.preact,
    vite: pkg.devDependencies.vite,
    typescript: pkg.devDependencies.typescript,
    vitest: pkg.devDependencies.vitest,
    playwright: pkg.devDependencies["@playwright/test"],
    blenderVersionPin: config.blender.versionPin,
    browserUnderTest: "Google Chrome 152.0.7977.83 (installed channel), headless, ANGLE D3D11",
    node: process.version,
  },
  integrity: {
    note: "Nothing in this list was modified to produce this record. The master is read-only and has never changed.",
    masterMustRemain: "f7313dabbf27d990ce1d7d3f771ebf1f914ffc5fb1162a7f71339bd3e6dc7fb0",
    master: masterEntry,
    masterMatchesPin: masterEntry.sha256 === config.master.sha256,
    blenderWorkingAndCheckpoints: blender.map((f) => entry(f)),
    validatedElbowAssets: elbow.map((f) => entry(f)),
    bodyAssetsV2: bodyV2.map((f) => entry(f)),
    bodyAssetsV3_inProduction: bodyV3.map((f) => entry(f)),
    bodyAssetsStep11: bodyStep11.map((f) => entry(f)),
    sharedAssets: shared.map((f) => entry(f)),
    narrationAudio: narrationFiles.map((f) => entry(f)),
    productionWebBuild: distFiles,
  },
  narration: {
    voice: "en-IN-Chirp3-HD-Aoede (Indian English, FEMALE, Google Cloud Text-to-Speech)",
    clips: 21,
    encoding: "MP3 24 kHz mono",
    totalBytes: narrationFiles.filter((f) => f.endsWith(".mp3")).reduce((a, f) => a + readFileSync(join(ROOT, f)).byteLength, 0),
    contentRule:
      "Spoken text is assembled only from existing locale strings (caption title, caption text, interaction prompt). No narration sentence was authored, so narration adds no new educational claim. The schematic and provenance notes are shown on screen and are deliberately not spoken.",
    keyHandling: "Synthesized at build time from an environment variable. No API key is present in the repository, the manifest, the audio or the web build (verified: 0 files match an AIza key pattern).",
    generator: "pipeline/audio/build_narration.ts",
    reviewStatus: "PENDING EXPERT REVIEW - narration is learner-facing output and has not been reviewed.",
  },
  tests: {
    unit: { framework: "vitest", tests: Number(arg("--tests-unit", "90")), files: 9, result: "pass" },
    e2e: { framework: "playwright (installed Chrome)", tests: Number(arg("--tests-e2e", "48")), files: 10, result: "pass" },
    typecheck: "tsc app + tests: clean",
    gate2: "19 checks, 0 failures (qa/reports/elbow_r.gate2.step13.json)",
    gate3RuntimeConsistency: "passed at 0/45/90/145 deg; worst anchor deviation 0.0002 mm (qa/reports/elbow_r.gate3.step12.json)",
    gate3FormalLandmarks: "PENDING EXPERT LANDMARK APPROVAL",
    bodyDeliveryValidation: "61 checks, 0 failures",
    crossLayer: "12 of 12 checks match (qa/expert/step13_cross_layer.json)",
    consoleErrors: 0,
  },
  knownLimitations: [
    "Step 12 is recorded as FAIL and stays FAIL. Its five unresolved items are unchanged.",
    "Emulated phone at CPU x4: first meaningful 3D 2742 ms p50 against a 2500 ms target - MISSED. Emulation, not certification.",
    "Emulated phone at CPU x4: drag frame interval 45.1 ms p95 against a 22 ms target - MISSED. Emulation, not certification.",
    "REAL ANDROID CERTIFICATION: NOT AVAILABLE. No mid-range Android phone was ever available.",
    "REAL IPAD CERTIFICATION: NOT AVAILABLE. No iPad was ever available.",
    "NVDA: NOT TESTED. VoiceOver: NOT TESTED. No screen-reader certification is claimed.",
    "Source anatomy licence: UNKNOWN - RELEASE BLOCKER (qa/expert/asset-provenance-review.md).",
    "Expert anatomical review: PENDING. Expert curriculum review: PENDING.",
    "'Hip as ball-and-socket' is NOT confirmed by any NCERT source reachable online; corroborated only by a non-NCERT source. PENDING EXPERT CONFIRMATION.",
    "The canonical NCERT Class 6 chapter 'Body Movements' is no longer published on ncert.nic.in (404), and the repository still contains no NCERT reference files.",
    "Formal Gate 3 landmark validation: PENDING EXPERT LANDMARK APPROVAL. The draft package stays qa/elbow_r.poses.draft.json and is deliberately NOT renamed.",
    "The validated elbow manifest still records rangeStatus 'approximate, pending cited reference' although an external reference now exists; changing it would mean re-promoting a frozen SHA-pinned asset, so it was left alone.",
    "Only the elbow has a validated rig. The skull, C1/C2, shoulder, hip and knee are schematic teaching representations with no rig.",
    "Six labelled elbow structures exist in the validated asset but are never shown to the learner (head of radius, olecranon, coronoid process, capitulum, trochlea, annular ligament).",
    "On a 390 px screen the caption panel occupies roughly the lower third in text-heavy shots, and the label layout drops the ulnar band label in the support shot.",
    "recap.pullback shows six schematic markers with no caption, so it carries no schematic note; recap.compare, which follows immediately, does.",
    "The 3D label overlay is aria-hidden, so anatomy label names are never announced to a screen reader.",
    "Narration (added after the first freeze) is learner-facing output and has NOT been reviewed: PENDING EXPERT REVIEW. It speaks only existing caption text, so it adds no new claim, but the voice, pronunciation of anatomical terms and pacing are unreviewed.",
    "Narration deliberately does not speak the schematic/provenance notes: at the frozen shot durations that would need up to 2.1x speech compression. A learner who only listens does not hear the schematic disclaimers; they remain on screen.",
    "Narration audio starts only after a user gesture (browser autoplay policy). The control is in the top bar next to Sources and Settings.",
  ],
  publicRelease: "NOT READY",
  milestone1: "READY FOR HUMAN EXPERT SIGN-OFF",
};

writeFileSync(join(ROOT, "qa/expert/frozen-build.json"), JSON.stringify(out, null, 1));
const all = [masterEntry, ...out.integrity.blenderWorkingAndCheckpoints, ...out.integrity.validatedElbowAssets, ...out.integrity.bodyAssetsV2, ...out.integrity.bodyAssetsV3_inProduction, ...out.integrity.bodyAssetsStep11, ...out.integrity.sharedAssets, ...out.integrity.narrationAudio, ...out.integrity.productionWebBuild];
console.log(`wrote qa/expert/frozen-build.json - ${all.length} files hashed`);
console.log(`master matches the pinned hash: ${out.integrity.masterMatchesPin}`);
console.log(`missing: ${all.filter((f) => "missing" in f).length}`);
