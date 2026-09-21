#!/usr/bin/env node
// Rollback-safe promotion of Gate-2-validated staging assets to public/assets/joints/<joint>/.
// Usage: node pipeline/tools/promote_assets.mjs --joint elbow_r
//  1. requires qa/reports/<joint>.gate2.prepromotion.json passed for the exact staging files (sha256)
//  2. copies the 4 files into a hidden sibling dir, verifies sha256 against the manifest
//  3. moves any existing target aside (backup), renames the new dir into place (single directory rename)
//  4. runs Gate 2 against the promoted directory; on failure restores the previous state and exits 1
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const joint = process.argv[process.argv.indexOf("--joint") + 1];
const staging = join(ROOT, "qa", "export", joint, "optimized");
const publicRoot = join(ROOT, "public", "assets", "joints");
const target = join(publicRoot, joint);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const incoming = join(publicRoot, `.${joint}.incoming-${stamp}`);
const backup = join(publicRoot, `.${joint}.backup-${stamp}`);
const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const log = (o) => console.log(JSON.stringify(o));

const manifest = JSON.parse(readFileSync(join(staging, "joint-manifest.json"), "utf8"));
const pre = JSON.parse(readFileSync(join(ROOT, "qa", "reports", `${joint}.gate2.prepromotion.json`), "utf8"));
if (!pre.passed || resolve(pre.dir) !== resolve(staging)) throw new Error("pre-promotion Gate 2 did not pass for the staging directory");
const files = [...["core", "detail", "context"].map((t) => manifest.tiers[t].url), "joint-manifest.json"];
const expected = Object.fromEntries(["core", "detail", "context"].map((t) => [manifest.tiers[t].url, manifest.tiers[t].sha256]));
expected["joint-manifest.json"] = sha256(join(staging, "joint-manifest.json"));
for (const [f, h] of Object.entries(expected)) if (sha256(join(staging, f)) !== h) throw new Error(`staging file changed since validation: ${f}`);

mkdirSync(incoming, { recursive: true });
for (const f of files) copyFileSync(join(staging, f), join(incoming, f));
for (const [f, h] of Object.entries(expected)) if (sha256(join(incoming, f)) !== h) { rmSync(incoming, { recursive: true, force: true }); throw new Error(`copy verification failed: ${f}`); }

const hadTarget = existsSync(target);
if (hadTarget) renameSync(target, backup);
renameSync(incoming, target);
log({ step: "swapped", target, hadTarget, backup: hadTarget ? backup : null });

try {
  execFileSync(process.execPath, [join(ROOT, "pipeline", "validate_glb.ts"), "--joint", joint, "--dir", target, "--label", "promoted"], { stdio: ["ignore", "ignore", "inherit"] });
} catch {
  rmSync(target, { recursive: true, force: true });
  if (hadTarget) renameSync(backup, target);
  log({ step: "rolled_back", reason: "Gate 2 failed on promoted directory" });
  process.exit(1);
}
if (hadTarget) rmSync(backup, { recursive: true, force: true });
log({ step: "promoted", target, files: Object.fromEntries(Object.entries(expected).map(([f, h]) => [f, { sha256: h, bytes: readFileSync(join(target, f)).byteLength }])) });
