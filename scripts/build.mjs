// Builds the whole platform into dist/:
//   dist/index.html          homepage, generated from modules.config.mjs
//   dist/404.html            not-found page (also generated)
//   dist/static/             homepage styles and card images
//   dist/<route>/            each module's own build output
//
//   node scripts/build.mjs                 build everything (clean)
//   node scripts/build.mjs joints          rebuild only the listed module(s); the rest of dist/ is kept
//   node scripts/build.mjs --home-only     regenerate only the homepage
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { DIST, ROOT, SITE_BASE, loadModules, moduleUrl } from "./lib/config.mjs";
import { backLinkSnippet, renderHomepage, renderNotFound } from "./lib/homepage.mjs";

const args = process.argv.slice(2);
const homeOnly = args.includes("--home-only");
const only = args.filter((a) => !a.startsWith("--"));

const modules = await loadModules();
const unknown = only.filter((id) => !modules.some((m) => m.id === id));
if (unknown.length) fail(`Unknown module id(s): ${unknown.join(", ")}. Known: ${modules.map((m) => m.id).join(", ")}`);

const available = modules.filter((m) => (m.status ?? "available") === "available");
const targets = homeOnly ? [] : available.filter((m) => !only.length || only.includes(m.id));
const partial = homeOnly || only.length > 0;

const t0 = Date.now();
if (!partial) await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const m of targets) await buildModule(m);
await buildHomepage();

if (partial) {
  const missing = available.filter((m) => !existsSync(join(DIST, m.route, "index.html")));
  if (missing.length) console.warn(`\n! Not built yet: ${missing.map((m) => m.id).join(", ")} — run "npm run build" for a complete site.`);
}
console.log(`\n✓ Built ${targets.length ? targets.map((m) => m.id).join(", ") + " + " : ""}homepage in ${((Date.now() - t0) / 1000).toFixed(1)} s → dist/ (site base "${SITE_BASE}")`);

// ─────────────────────────────────────────────────────────────────────────────

async function buildModule(m) {
  const src = join(ROOT, m.source);
  const out = join(DIST, m.route);
  const b = m.build;
  console.log(`\n▸ ${m.title}  (${m.source} → ${m.route})`);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  if (b.type === "static") {
    if (b.prepare) run(b.prepare, src);
    const items = b.files ?? (await readdir(src)).filter((f) => !skipByDefault(f));
    for (const item of items) {
      const from = join(src, item);
      if (!existsSync(from)) fail(`${m.id}: "${item}" listed in build.files does not exist in ${m.source}`);
      await cp(from, join(out, item), { recursive: true, filter: (p) => !skipByDefault(basename(p)) });
    }
    if (b.entry) {
      if (!existsSync(join(src, b.entry))) fail(`${m.id}: build.entry "${b.entry}" does not exist`);
      await cp(join(src, b.entry), join(out, "index.html"));
    }
  } else {
    const install = b.install ?? "npm ci";
    if (install && (!existsSync(join(src, "node_modules")) || process.env.CI)) run(install, src);
    // BASE_PATH tells the project's bundler which URL prefix to emit (Vite: `base`).
    run(b.command ?? "npm run build", src, { BASE_PATH: moduleUrl(m) });
    const output = join(src, b.output ?? "dist");
    if (!existsSync(output)) fail(`${m.id}: build output "${b.output ?? "dist"}" was not produced`);
    await cp(output, out, { recursive: true });
  }

  if (!existsSync(join(out, "index.html"))) fail(`${m.id}: the build produced no index.html for ${m.route}`);
  if (m.backLink !== false) {
    for (const f of await readdir(out)) if (extname(f) === ".html") await injectBackLink(join(out, f), m);
  }
  console.log(`  ✓ ${m.route}  ${formatBytes(await dirSize(out))}`);
}

/** Integration-level navigation only: one self-contained element appended before </body>. The project's own UI is untouched. */
async function injectBackLink(file, m) {
  const html = await readFile(file, "utf8");
  if (html.includes('id="hb-back"')) return;
  const i = html.lastIndexOf("</body>");
  if (i < 0) fail(`${m.id}: ${relative(DIST, file)} has no </body> to attach the back link to`);
  await writeFile(file, html.slice(0, i) + backLinkSnippet(m, SITE_BASE) + "\n" + html.slice(i));
}

async function buildHomepage() {
  await rm(join(DIST, "static"), { recursive: true, force: true });
  await cp(join(ROOT, "site/static"), join(DIST, "static"), { recursive: true });
  // Browsers request /favicon.ico for any page without an icon tag (the Respiratory lesson has none).
  await cp(join(ROOT, "site/favicon.ico"), join(DIST, "favicon.ico"));
  await mkdir(join(DIST, "static/modules"), { recursive: true });
  const images = {};
  for (const m of modules) {
    if (!m.card?.image) continue;
    const name = `${m.id}${extname(m.card.image)}`;
    await cp(join(ROOT, m.card.image), join(DIST, "static/modules", name));
    images[m.id] = `${SITE_BASE}static/modules/${name}`;
  }
  const template = await readFile(join(ROOT, "site/index.html"), "utf8");
  await writeFile(join(DIST, "index.html"), renderHomepage(template, modules, images, SITE_BASE));
  await writeFile(join(DIST, "404.html"), renderNotFound(template, modules, SITE_BASE));
  // Machine-readable registry for anything that wants it (search, analytics, a future app shell).
  const registry = modules.map(({ id, title, description, status = "available", card }) => ({
    id, title, description, status, url: moduleUrl(modules.find((x) => x.id === id)), image: images[id] ?? null, facts: card?.facts ?? [],
  }));
  await writeFile(join(DIST, "modules.json"), JSON.stringify(registry, null, 2) + "\n");
  console.log(`\n▸ Homepage  ✓ ${modules.length} module card(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────

function run(command, cwd, env = {}) {
  console.log(`  $ ${command}`);
  const r = spawnSync(command, { cwd, shell: true, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) fail(`"${command}" failed in ${relative(ROOT, cwd)} (exit ${r.status ?? r.signal})`);
}

function skipByDefault(name) {
  return name.startsWith(".") || name === "node_modules" || /\.md$/i.test(name) || /^\.env/.test(name);
}

async function dirSize(dir) {
  let total = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    total += e.isDirectory() ? await dirSize(p) : (await stat(p)).size;
  }
  return total;
}

function formatBytes(n) {
  return n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} kB`;
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}
