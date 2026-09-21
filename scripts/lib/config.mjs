// Loads and validates modules.config.mjs, so a typo fails the build with a clear message instead of a broken site.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = resolve(import.meta.dirname, "../..");
export const DIST = join(ROOT, "dist");

/** Site base path: "/" for a domain root; set SITE_BASE=/repo-name/ for e.g. a GitHub Pages project site. */
export const SITE_BASE = normaliseBase(process.env.SITE_BASE ?? "/");

function normaliseBase(b) {
  return ("/" + b + "/").replace(/\/+/g, "/");
}

const RESERVED = new Set(["", "static", "assets", "site", "404", "index", "modules.json", "favicon.ico"]);

/** @returns {Promise<import("./types.js").Module[]>} */
export async function loadModules() {
  const url = pathToFileURL(join(ROOT, "modules.config.mjs")).href + `?t=${Date.now()}`; // fresh copy in watch mode
  const modules = (await import(url)).default;
  const problems = [];
  const seen = new Map();
  if (!Array.isArray(modules)) throw new Error("modules.config.mjs must `export default` an array of modules.");

  modules.forEach((m, i) => {
    const at = `module #${i + 1}${m?.id ? ` ("${m.id}")` : ""}`;
    for (const key of ["id", "title", "description", "route", "source"]) {
      if (typeof m?.[key] !== "string" || !m[key].trim()) problems.push(`${at}: "${key}" is required`);
    }
    if (typeof m?.route === "string") {
      if (!/^\/[a-z0-9][a-z0-9-]*\/$/.test(m.route)) problems.push(`${at}: route "${m.route}" must look like "/my-module/" (lowercase, one segment)`);
      if (RESERVED.has(m.route.replaceAll("/", ""))) problems.push(`${at}: route "${m.route}" is reserved by the platform`);
    }
    for (const key of ["id", "route"]) {
      if (m?.[key] && seen.has(`${key}:${m[key]}`)) problems.push(`${at}: duplicate ${key} "${m[key]}"`);
      seen.set(`${key}:${m?.[key]}`, true);
    }
    const status = m?.status ?? "available";
    if (!["available", "coming-soon"].includes(status)) problems.push(`${at}: status must be "available" or "coming-soon"`);
    if (status === "available") {
      if (m?.source && !existsSync(join(ROOT, m.source))) problems.push(`${at}: source folder "${m.source}" does not exist`);
      if (!["static", "npm"].includes(m?.build?.type)) problems.push(`${at}: build.type must be "static" or "npm"`);
    }
    if (m?.card?.image && !existsSync(join(ROOT, m.card.image))) problems.push(`${at}: card.image "${m.card.image}" does not exist`);
    const pos = m?.backLink?.position;
    if (pos && !["left-center", "top-left", "top-right", "bottom-left", "bottom-right"].includes(pos)) problems.push(`${at}: backLink.position "${pos}" is not valid`);
  });

  if (problems.length) throw new Error(`modules.config.mjs has problems:\n  - ${problems.join("\n  - ")}`);
  return modules;
}

/** Public URL of a module, including the site base: "/respiratory/" or "/my-repo/respiratory/". */
export const moduleUrl = (m) => SITE_BASE + m.route.slice(1);
