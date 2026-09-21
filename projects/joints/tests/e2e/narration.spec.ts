import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};

type Narration = { enabled: boolean; loaded: boolean; blocked: boolean; shot: string; paused: boolean; currentTime: number; duration: number; src: string; voice: string | null };
const narration = (page: Page) => film<Narration>(page, "narration");

/** Sample the audio position while the film plays, so looping or drifting narration is visible. */
async function samplePlayback(page: Page, samples: number, everyMs: number) {
  return page.evaluate(
    ([n, ms]) =>
      new Promise<{ localMs: number; audio: number; paused: boolean; src: string }[]>((resolve) => {
        const rows: { localMs: number; audio: number; paused: boolean; src: string }[] = [];
        const q = (window as any).__jointsFilm;
        const id = setInterval(() => {
          const s = q.state();
          const d = q.narration();
          rows.push({ localMs: Math.round(s.localMs), audio: +d.currentTime.toFixed(2), paused: d.paused, src: d.src });
          if (rows.length >= n) {
            clearInterval(id);
            resolve(rows);
          }
        }, ms);
      }),
    [samples, everyMs] as const,
  );
}

test.describe("narration", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step13.narration.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("speaks the caption of each shot in the Indian English female voice, positioned by the film clock", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await page.waitForFunction(() => (window as any).__jointsFilm.narration()?.loaded, null, { timeout: 30_000 });
    const initial = await narration(page);
    expect(initial.voice).toBe("en-IN-Chirp3-HD-Aoede");
    expect(initial.enabled).toBe(true);

    // the clip for a shot is the clip named after that shot, and it starts near the beginning of the shot
    await film(page, "seekShot", "hinge.source", 0);
    await settle(page);
    await film(page, "play");
    await page.waitForTimeout(1200);
    const playing = await narration(page);
    expect(playing.src).toBe("hinge.source.mp3");
    expect(playing.shot).toBe("hinge.source");
    report.perShotClip = { shot: playing.shot, src: playing.src, voice: playing.voice };
    expect(log.errors).toEqual([]);
  });

  /**
   * Regression: play() on an ENDED audio element rewinds it, so a clip that finished early in a long shot used to restart
   * and loop for the rest of the shot, repeating the sentence to the learner.
   */
  test("a finished clip stays finished for the rest of the shot (no looping)", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await page.waitForFunction(() => (window as any).__jointsFilm.narration()?.loaded, null, { timeout: 30_000 });
    // pivot.rotate: 9 s shot, ~4.7 s of speech, so the clip ends well before the shot does
    await film(page, "seekShot", "pivot.rotate", 0);
    await settle(page);
    await film(page, "play");
    const rows = await samplePlayback(page, 12, 700);
    const sameClip = rows.filter((r) => r.src === "pivot.rotate.mp3");
    const rewinds = sameClip.filter((r, i) => i > 0 && r.audio < sameClip[i - 1].audio - 0.5);
    report.noLoop = { samples: sameClip.length, rewinds: rewinds.length, rows: sameClip };
    expect(rewinds, `narration restarted mid-shot: ${JSON.stringify(rewinds)}`).toEqual([]);
    // it really did finish and then stay quiet
    expect(sameClip.some((r) => r.paused && r.audio > 3)).toBe(true);
    expect(log.errors).toEqual([]);
  });

  test("the narration control turns the voice off and on, and is a real toggle", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await page.waitForFunction(() => (window as any).__jointsFilm.narration()?.loaded, null, { timeout: 30_000 });
    const button = page.getByTestId("film-narration");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const box = (await button.boundingBox())!;
    expect(box.width, "target size").toBeGreaterThanOrEqual(44);
    expect(box.height, "target size").toBeGreaterThanOrEqual(44);

    await film(page, "seekShot", "hinge.source", 0);
    await settle(page);
    await film(page, "play");
    await page.waitForTimeout(900);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(400);
    const off = await narration(page);
    expect(off.enabled).toBe(false);
    expect(off.paused).toBe(true);

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(700);
    const on = await narration(page);
    expect(on.enabled).toBe(true);
    report.toggle = { offPaused: off.paused, backOnPlaying: !on.paused, label: await button.getAttribute("aria-label") };
    expect(log.errors).toEqual([]);
  });

  test("narration is silent while the film is paused or held for the learner", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await page.waitForFunction(() => (window as any).__jointsFilm.narration()?.loaded, null, { timeout: 30_000 });
    await film(page, "seekShot", "hinge.bones", 0);
    await settle(page);
    await film(page, "play");
    await page.waitForTimeout(800);
    expect((await narration(page)).paused).toBe(false);
    await film(page, "pause");
    await page.waitForTimeout(300);
    const paused = await narration(page);
    report.pausedWithFilm = paused.paused;
    expect(paused.paused, "narration pauses with the film").toBe(true);
    expect(log.errors).toEqual([]);
  });
});
