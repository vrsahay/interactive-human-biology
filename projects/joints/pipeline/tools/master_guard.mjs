#!/usr/bin/env node
// Master guard: proves Human_Body_Master.blend is byte-identical to the pinned fingerprint.
// Usage: node pipeline/tools/master_guard.mjs [--label <text>]
// Exit 0 = unchanged, 1 = changed or missing. Every run is appended to qa/reports/master_guard.log.jsonl.
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(readFileSync(join(root, "pipeline", "config.json"), "utf8"));
const labelIndex = process.argv.indexOf("--label");
const label = labelIndex > 0 ? process.argv[labelIndex + 1] : "";

function sha256(path) {
  return new Promise((ok, fail) => {
    const hash = createHash("sha256");
    createReadStream(path).on("data", (d) => hash.update(d)).on("end", () => ok(hash.digest("hex"))).on("error", fail);
  });
}

const { path, sha256: expected, bytes } = config.master;
const entry = { at: new Date().toISOString(), label, path };
try {
  const stat = statSync(path);
  entry.bytes = stat.size;
  entry.mtime = stat.mtime.toISOString();
  entry.sha256 = await sha256(path);
  entry.ok = entry.sha256 === expected && stat.size === bytes;
} catch (err) {
  entry.ok = false;
  entry.error = String(err);
}

const reports = join(root, config.reports);
mkdirSync(reports, { recursive: true });
appendFileSync(join(reports, "master_guard.log.jsonl"), JSON.stringify(entry) + "\n");
console.log(JSON.stringify(entry));
if (!entry.ok) {
  console.error("MASTER GUARD FAILED: Human_Body_Master.blend does not match the pinned fingerprint. Stop the pipeline.");
  process.exit(1);
}
