// Local development for the platform: builds anything missing, serves dist/, and regenerates the homepage whenever
// site/ or modules.config.mjs changes (refresh the browser to see it).
//   npm run dev
// To work on one module with its own hot-reloading dev server instead, see README → "Working on a module".
import { spawn, spawnSync } from "node:child_process";
import { existsSync, watch } from "node:fs";
import { join } from "node:path";
import { DIST, ROOT, loadModules } from "./lib/config.mjs";

const node = process.execPath;
const modules = (await loadModules()).filter((m) => (m.status ?? "available") === "available");
const missing = modules.filter((m) => !existsSync(join(DIST, m.route, "index.html"))).map((m) => m.id);
// Nothing built yet → full build; some modules missing → build just those; otherwise refresh the homepage only.
const args = !existsSync(join(DIST, "index.html")) ? [] : missing.length ? missing : ["--home-only"];
const r = spawnSync(node, [join(ROOT, "scripts/build.mjs"), ...args], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);

spawn(node, [join(ROOT, "scripts/serve.mjs"), process.env.PORT ?? "8080"], { stdio: "inherit" });

let timer;
const rebuildHome = (_, file) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`\n↻ ${file ?? "change"} — regenerating the homepage`);
    spawnSync(node, [join(ROOT, "scripts/build.mjs"), "--home-only"], { stdio: "inherit" });
  }, 150);
};
watch(join(ROOT, "site"), { recursive: true }, rebuildHome);
watch(join(ROOT, "modules.config.mjs"), rebuildHome);
console.log("Watching site/ and modules.config.mjs. Rebuild a module with: npm run build -- <module-id>");
