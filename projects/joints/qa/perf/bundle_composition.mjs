// Attributes minified bundle bytes to source modules via the sourcemap (generated columns per mapping segment).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SourceMapConsumer } from "source-map-js";
const dir = process.argv[2] ?? "dist/app";
const out = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith(".js"))) {
  const code = readFileSync(join(dir, f), "utf8");
  const map = new SourceMapConsumer(JSON.parse(readFileSync(join(dir, f + ".map"), "utf8")));
  const lines = code.split("\n");
  const bytes = {};
  let prev = null;
  map.eachMapping((m) => {
    if (prev && prev.generatedLine === m.generatedLine) {
      const len = m.generatedColumn - prev.generatedColumn;
      const src = prev.source ?? "(none)";
      bytes[src] = (bytes[src] ?? 0) + len;
    } else if (prev) {
      const len = lines[prev.generatedLine - 1].length - prev.generatedColumn;
      const src = prev.source ?? "(none)";
      bytes[src] = (bytes[src] ?? 0) + len;
    }
    prev = m;
  });
  const group = (s) => {
    if (s.includes("node_modules/three/examples")) return "three/examples: " + s.split("examples/jsm/")[1];
    if (s.includes("node_modules/three/")) return "three core";
    if (s.includes("node_modules/preact") || s.includes("@preact")) return "preact + signals";
    if (s.includes("/generated/")) return "generated validators: " + s.split("/").pop();
    if (s.includes("content/")) return "content JSON: " + s.split("/").slice(-2).join("/");
    if (s.includes("src/ui/")) return "ui: " + s.split("src/ui/")[1];
    if (s.includes("src/engine/")) return "engine: " + s.split("src/engine/")[1].split("/")[0];
    return s;
  };
  const grouped = {};
  for (const [s, n] of Object.entries(bytes)) grouped[group(s)] = (grouped[group(s)] ?? 0) + n;
  out[f] = { total: code.length, modules: Object.fromEntries(Object.entries(grouped).sort((a, b) => b[1] - a[1])) };
}
writeFileSync(process.argv[3] ?? "qa/reports/step12.bundle_composition.json", JSON.stringify(out, null, 1));
for (const [f, v] of Object.entries(out)) { console.log(f, v.total); for (const [k, n] of Object.entries(v.modules).slice(0, 30)) console.log("  ", String(n).padStart(8), k); }
