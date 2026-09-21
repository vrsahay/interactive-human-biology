import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const ROOT = resolve(import.meta.dirname);
// Public URL prefix: "/" when deployed on its own; the Interactive Human Biology platform builds with BASE_PATH=/joints/.
const BASE = process.env.BASE_PATH ?? "/";

type GeneratedValidator = ((data: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };

/**
 * Build-time content validation. JSON-schema validation of the bundled lesson + locale content and of every shipped joint
 * manifest runs here (the build, dev server and test runner fail on any problem), so the browser bundle carries no schema
 * validators for bundled content. Fetched manifests are pinned by sha256: a byte-identical manifest skips runtime schema
 * validation; any other manifest is validated in full at runtime by a lazily loaded validator.
 */
function contentValidation(): Plugin {
  return {
    name: "joints-content-validation",
    async config() {
      const load = async (p: string) => (await import(pathToFileURL(join(ROOT, p)).href)).default as GeneratedValidator;
      const problems: string[] = [];
      const check = (v: GeneratedValidator, data: unknown, label: string) => {
        if (!v(data)) problems.push(...(v.errors ?? []).map((e) => `${label}${e.instancePath || "/"} ${e.message}`));
      };
      const lessonSchema = await load("src/engine/video/generated/videoLessonSchemaValidator.js");
      const localeSchema = await load("src/engine/video/generated/localeSchemaValidator.js");
      for (const f of readdirSync(join(ROOT, "content/lessons")).filter((x) => x.endsWith(".json"))) check(lessonSchema, JSON.parse(readFileSync(join(ROOT, "content/lessons", f), "utf8")), `content/lessons/${f}`);
      for (const f of readdirSync(join(ROOT, "content/locales/en")).filter((x) => x.endsWith(".json"))) check(localeSchema, JSON.parse(readFileSync(join(ROOT, "content/locales/en", f), "utf8")), `content/locales/en/${f}`);
      const manifestSchema = await load("src/engine/assets/generated/manifestSchemaValidator.js");
      const validated: Record<string, string> = {};
      const jointsDir = join(ROOT, "public/assets/joints");
      for (const joint of existsSync(jointsDir) ? readdirSync(jointsDir) : []) {
        const path = join(jointsDir, joint, "joint-manifest.json");
        if (!existsSync(path)) continue;
        const text = readFileSync(path, "utf8");
        const before = problems.length;
        check(manifestSchema, JSON.parse(text), `public/assets/joints/${joint}/joint-manifest.json`);
        if (problems.length === before) validated[`${BASE}assets/joints/${joint}/joint-manifest.json`] = createHash("sha256").update(text).digest("hex");
      }
      if (problems.length) throw new Error(`content validation failed:\n - ${problems.join("\n - ")}`);
      return { define: { __VALIDATED_MANIFESTS__: JSON.stringify(validated) } };
    },
  };
}

/**
 * First-frame network path: the film's startup requests (manifests, baked environment, and the first body stage, which is
 * identical for every quality tier) start while the HTML is parsed instead of after the JS bundle has run. The list is
 * derived at build time from the lesson registry and the delivery manifest; the sandbox route does not preload it.
 */
function filmPreload(): Plugin {
  return {
    name: "joints-film-preload",
    transformIndexHtml() {
      const registry = readFileSync(join(ROOT, "src/content/lessons/index.ts"), "utf8");
      const bodyUrl = /bodyManifestUrl: `\$\{import\.meta\.env\.BASE_URL\}([^`]+)`/.exec(registry)?.[1];
      if (!bodyUrl) throw new Error("film preload: no bodyManifestUrl in the lesson registry");
      const body = JSON.parse(readFileSync(join(ROOT, "public", bodyUrl), "utf8"));
      const tiers = Object.values(body.tiers) as { stages: { files: string[] }[] }[];
      const common = tiers[0].stages[0].files.filter((f) => tiers.every((t) => t.stages[0].files.includes(f)));
      const base = BASE + bodyUrl.slice(0, bodyUrl.lastIndexOf("/") + 1);
      const env = JSON.parse(readFileSync(join(ROOT, "public/assets/shared/env/environment.json"), "utf8"));
      // All five are on the critical path for the first frame: two manifests, the baked environment and the first-stage meshes.
      // (Step 12R measured fetchPriority="low" on the meshes: no change to the bundle's download time on an emulated Fast 4G
      // link, because the link is saturated either way - see qa/reports/step12r.profile.json.)
      const urls = [BASE + bodyUrl, `${BASE}assets/joints/elbow_r/joint-manifest.json`, `${BASE}assets/shared/env/environment.json`, `${BASE}assets/shared/env/${env.variants[0].url}`, ...common.map((f) => base + body.files[f].url)];
      const code = `(function(){if(new URLSearchParams(location.search).get("mode")==="sandbox")return;${JSON.stringify(urls)}.forEach(function(h){var l=document.createElement("link");l.rel="preload";l.as="fetch";l.crossOrigin="anonymous";l.href=h;document.head.appendChild(l);});})();`;
      return [{ tag: "script", children: code, injectTo: "head-prepend" }];
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [contentValidation(), filmPreload()],
  // public/assets/joints/** is served as-is; keep Vite's own bundle output out of /assets.
  build: { assetsDir: "app", target: "es2022", sourcemap: true },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
