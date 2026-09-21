import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { NarrationManifest } from "../../src/engine/video/NarrationPlayer";
import type { VideoLesson, VideoLocale } from "../../src/engine/video/videoTypes";

const ROOT = join(import.meta.dirname, "..", "..");
const DIR = join(ROOT, "public", "assets", "audio", "narration");
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const manifest = read("public/assets/audio/narration/narration.json") as NarrationManifest & { shots: Record<string, { url: string; bytes: number; sha256: string; durationMs: number; budgetMs: number; fits: boolean; speakingRate: number; textKeys: string[]; text: string }> };
const lesson = read("content/lessons/hinge-elbow.json") as VideoLesson;
const locale = read("content/locales/en/hinge-elbow.json") as VideoLocale;
const shots = lesson.chapters.flatMap((c) => c.shots);

describe("narration audio", () => {
  it("is the requested voice: Indian English, female", () => {
    expect(manifest.voice.languageCode).toBe("en-IN");
    expect(manifest.voice.gender).toBe("FEMALE");
    expect(manifest.voice.name.startsWith("en-IN-")).toBe(true);
  });

  it("ships no API key anywhere in the manifest or the audio directory", () => {
    const text = readFileSync(join(DIR, "narration.json"), "utf8");
    // Google API keys are AIza + 35 chars; a key must never reach a shipped file.
    expect(/AIza[0-9A-Za-z_-]{35}/.test(text)).toBe(false);
    expect(text).not.toMatch(/api[_-]?key"\s*:/i);
  });

  /**
   * The narration content rule: spoken text is assembled only from locale strings that already exist, so narration
   * introduces no new educational claim and inherits the captions' provenance.
   */
  it("speaks only existing locale strings, in caption order", () => {
    const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
    for (const [shotId, clip] of Object.entries(manifest.shots)) {
      const shot = shots.find((s) => s.id === shotId);
      expect(shot, `${shotId} is a shot of this lesson`).toBeTruthy();
      for (const key of clip.textKeys) expect(locale.strings[key], `${shotId}: ${key} exists in the locale`).toBeTruthy();
      expect(clip.text, shotId).toBe(clip.textKeys.map((k) => sentence(locale.strings[k].text)).join(" "));
      // Only the shot's own spoken explanation, its caption title/text, or the interaction prompt may be spoken - and a
      // shot with a narrationKey says that instead of repeating its headline back at the learner.
      const allowed = shot!.narrationKey
        ? [shot!.narrationKey, shot!.interaction.check?.promptKey ?? shot!.interaction.promptKey].filter(Boolean)
        : [shot!.caption?.titleKey, shot!.caption?.textKey, shot!.interaction.check?.promptKey ?? shot!.interaction.promptKey].filter(Boolean);
      for (const key of clip.textKeys) expect(allowed, `${shotId}: ${key} is this shot's own reviewed text`).toContain(key);
      // Every spoken teaching sentence is reviewable content with a provenance class. An interaction prompt ("Try it:
      // bend the elbow…") is interface text and is allowed to be ui - it asks for an action, it does not teach a fact.
      const promptKey = shot!.interaction.check?.promptKey ?? shot!.interaction.promptKey;
      for (const key of clip.textKeys) if (key !== promptKey) expect(locale.strings[key].provenance, `${shotId}: ${key} provenance`).not.toBe("ui");
    }
  });

  it("does not speak the provenance or schematic notes (they stay on screen)", () => {
    const noteKeys = new Set(shots.map((s) => s.caption?.noteKey).filter(Boolean) as string[]);
    expect(noteKeys.size).toBeGreaterThan(0);
    for (const [shotId, clip] of Object.entries(manifest.shots)) for (const key of clip.textKeys) expect(noteKeys.has(key), `${shotId} speaks note ${key}`).toBe(false);
  });

  it("every clip fits inside its shot, at a natural speaking rate", () => {
    for (const [shotId, clip] of Object.entries(manifest.shots)) {
      expect(clip.fits, `${shotId}: ${clip.durationMs} ms of speech in a ${clip.budgetMs} ms budget`).toBe(true);
      expect(clip.durationMs).toBeLessThanOrEqual(clip.budgetMs);
      expect(clip.speakingRate, `${shotId} speaking rate`).toBeLessThanOrEqual(1.35);
      expect(clip.speakingRate).toBeGreaterThanOrEqual(1);
    }
  });

  /**
   * Step 16B: an instructional shot is as long as the thing it has to say, with a visual floor. The picture is cut to
   * the voice, not the voice compressed into the picture - so a teaching beat can neither end mid-sentence nor hold a
   * dead frame after the voice has finished.
   */
  it("speech-timed shots take the length their narration needs, at the natural rate", () => {
    const timed = shots.filter((s) => s.durationFrom === "speech");
    expect(timed.length).toBeGreaterThan(30);
    const lead = manifest.timing.leadInMs;
    const tail = (manifest.timing as { tailMs: number }).tailMs;
    for (const shot of timed) {
      const clip = manifest.shots[shot.id];
      expect(clip, `${shot.id} is spoken`).toBeTruthy();
      expect(clip.speakingRate, `${shot.id} is never compressed`).toBe(1);
      const want = Math.max(shot.minDurationMs ?? 0, lead + clip.durationMs + tail);
      expect(shot.durationMs, `${shot.id} length`).toBe(Math.ceil(want / 100) * 100);
      // no dead tail: whatever is left after the voice is the floor, never more than a second of nothing
      const slack = shot.durationMs - lead - clip.durationMs;
      if (!shot.minDurationMs || shot.durationMs > shot.minDurationMs) expect(slack, `${shot.id} tail`).toBeLessThanOrEqual(tail + 100);
    }
  });

  it("covers every shot that shows a caption or asks something, and nothing else", () => {
    const spoken = new Set(Object.keys(manifest.shots));
    for (const shot of shots) {
      const hasWords = !!(shot.narrationKey || shot.caption?.titleKey || shot.caption?.textKey || shot.interaction.check?.promptKey || shot.interaction.promptKey);
      expect(spoken.has(shot.id), `${shot.id} narration present = ${hasWords}`).toBe(hasWords);
    }
  });

  it("audio files on disk match the manifest bytes and sha256", () => {
    for (const [shotId, clip] of Object.entries(manifest.shots)) {
      const path = join(DIR, clip.url);
      expect(existsSync(path), `${shotId}: ${clip.url}`).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.byteLength, clip.url).toBe(clip.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), clip.url).toBe(clip.sha256);
    }
  });
});
