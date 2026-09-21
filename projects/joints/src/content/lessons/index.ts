import hingeElbow from "../../../content/lessons/hinge-elbow.json";
import hingeElbowEn from "../../../content/locales/en/hinge-elbow.json";

/** Lesson registry: video lesson JSON + locale + the joint content and body asset it uses. Validated at load. */
export const LESSONS: Record<string, { lesson: unknown; locale: unknown; jointContentId: string; bodyManifestUrl: string }> = {
  "hinge-elbow": { lesson: hingeElbow, locale: hingeElbowEn, jointContentId: "elbow_r", bodyManifestUrl: `${import.meta.env.BASE_URL}assets/body/v3/body-delivery.json` },
};

export const DEFAULT_LESSON = "hinge-elbow";
