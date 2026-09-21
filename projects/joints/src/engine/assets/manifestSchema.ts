import validateSchema, { schemaSha256 } from "./generated/manifestSchemaValidator.js";
import { ManifestError, checkManifestSemantics } from "./ManifestLoader";
import type { JointManifest } from "./manifestTypes";

// Full JSON-schema validation. Runs at build time for shipped manifests (vite.config.ts) and at runtime only when a fetched
// manifest is not byte-identical to one validated at build time (loaded on demand, not part of the startup bundle).

/** Parses + validates manifest text. Throws ManifestError with every problem found. */
export function parseManifest(text: string): JointManifest {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new ManifestError(`manifest is not valid JSON (${(e as Error).message})`);
  }
  if (!validateSchema(data)) {
    const errors = (validateSchema.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? e.keyword}`);
    throw new ManifestError(`manifest failed schema validation (schema ${schemaSha256.slice(0, 12)})`, errors);
  }
  const manifest = data as JointManifest;
  const problems = checkManifestSemantics(manifest);
  if (problems.length) throw new ManifestError("manifest failed runtime invariants", problems);
  return manifest;
}
