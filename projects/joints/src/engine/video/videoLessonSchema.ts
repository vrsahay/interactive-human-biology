import type { JointManifestModel } from "../assets/ManifestLoader";
import type { BodyManifest } from "../body/BodyLayer";
import validateLessonSchema, { schemaSha256 } from "./generated/videoLessonSchemaValidator.js";
import validateLocaleSchema from "./generated/localeSchemaValidator.js";
import { validateVideoLesson, type VideoValidationReport } from "./validateVideoLesson";

// JSON-schema validation of lesson + locale content. Used by the build (vite.config.ts, via the generated validators) and by
// tests; the browser bundle only runs the reference checks in validateVideoLesson.

const schemaErrors = (v: typeof validateLessonSchema, data: unknown, label: string) =>
  v(data) ? [] : (v.errors ?? []).map((e) => `${label}${e.instancePath || "/"} ${e.message ?? e.keyword}`);

export const lessonSchemaSha256 = schemaSha256;

export function validateVideoLessonSchema(lessonData: unknown, localeData: unknown): string[] {
  return [...schemaErrors(validateLessonSchema, lessonData, "lesson"), ...schemaErrors(validateLocaleSchema, localeData, "locale")];
}

/** Schema + references (what build + runtime together guarantee). */
export function validateVideoLessonFull(lessonData: unknown, localeData: unknown, joint: JointManifestModel, body: BodyManifest): VideoValidationReport {
  const schema = validateVideoLessonSchema(lessonData, localeData);
  if (schema.length) return { schemaValidation: "build", chapters: 0, shots: 0, durationMs: 0, textKeys: 0, problems: schema };
  return validateVideoLesson(lessonData, localeData, joint, body);
}
