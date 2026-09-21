import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
type Cam = { position: number[]; target: number[] };
const camera = (page: Page) => film<Cam>(page, "camera");
const moved = (a: Cam, b: Cam) => Math.hypot(...a.position.map((v, i) => v - b.position[i]), ...a.target.map((v, i) => v - b.target[i]));
const report: Record<string, unknown> = {};

test.describe("Step 12 reduced motion (entire film)", () => {
  test("every shot: cut on entry, no dolly while playing, static indicators, stepped poses, captions without transitions", async ({ page }) => {
    test.setTimeout(900_000);
    const log = trackConsole(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openFilm(page);
    await expect(page.getByTestId("film")).toHaveAttribute("data-motion", "reduce");
    const entries = await film<{ id: string; startMs: number; endMs: number; chapterIndex: number }[]>(page, "entries");
    const rows = [];
    for (const e of entries) {
      // play across the boundary into the shot: with reduced motion the new framing must be in place on entry (cut)
      await film(page, "seek", Math.max(0, e.startMs - 250));
      await settle(page);
      await film(page, "play");
      // Several beats now hand the film to the learner and stop the clock - the guided check, the recall challenge and
      // (Step 16B) each category's exploration task - so a traversal has to step past them the way a learner would, or
      // playback never reaches the chapters after them.
      for (let tries = 0; tries < 80; tries++) {
        const st = await film<{ shotId: string; buffering: boolean; playing: boolean; holdingForCheck: boolean }>(page, "state");
        if (st.shotId === e.id && !st.buffering) break;
        if (await page.getByTestId("film-explore-panel").count()) {
          await page.getByTestId("film-explore-exit").click();
          await film(page, "play");
        } else if (await page.getByTestId("film-recall").count()) {
          await page.getByTestId("film-recall-exit").click();
          await film(page, "play");
        } else if (st.holdingForCheck) {
          await page.getByTestId("film-resume").click();
          await film(page, "play");
        } else if (!st.playing && !st.buffering) await film(page, "play");
        await page.waitForTimeout(250);
      }
      await page.waitForFunction((id) => (window as any).__jointsFilm.state().shotId === id && !(window as any).__jointsFilm.state().buffering, e.id, { timeout: 60_000 });
      // A beat that hands the learner the joint or the questions moves the camera to the site when its panel opens.
      // Close it before measuring, or the measurement catches that authored move and calls it a dolly.
      for (const id of ["film-recall-exit", "film-explore-exit"]) {
        if (await page.getByTestId(id).count()) {
          await page.getByTestId(id).click();
          await page.waitForTimeout(1200);
          await film(page, "seek", Math.max(0, e.startMs + 200));
          await settle(page);
        }
      }
      const entryCam = await camera(page);
      await page.waitForTimeout(700);
      const laterCam = await camera(page);
      const state = await film<{ shotId: string; playing: boolean; holdingForCheck: boolean }>(page, "state");
      await film(page, "pause");
      const concepts = await film<string[]>(page, "concepts");
      const phases = await Promise.all(concepts.map((s) => film<number | null>(page, "conceptPhase", s)));
      const transition = await page.evaluate(() => {
        const el = document.querySelector("[data-testid=film-caption]");
        return el ? getComputedStyle(el).transitionDuration : "0s";
      });
      const row = { shot: e.id, cameraMovedDuringPlayback: +moved(entryCam, laterCam).toFixed(6), concepts: concepts.length, phases, captionTransition: transition, stillInShot: state.shotId === e.id };
      rows.push(row);
      if (state.shotId === e.id) expect(row.cameraMovedDuringPlayback, e.id).toBeLessThan(1e-6);
      for (const p of phases) expect(p, e.id).toBeCloseTo(0.125, 6);
      expect(transition.split(",").every((d) => parseFloat(d) <= 0.01), e.id).toBe(true);
    }
    // poses stay understandable: keyframes are shown (no in-between motion)
    const flex = entries.find((x) => x.id === "hinge.flexion")!;
    await film(page, "seek", flex.startMs + 2600);
    await settle(page);
    expect(await qa<number>(page, "getDof", "flexion")).toBe(0);
    await film(page, "seek", flex.startMs + 6000);
    await settle(page);
    expect(await qa<number>(page, "getDof", "flexion")).toBe(45);
    // the interactive elbow and the quiz still work
    await film(page, "seekShot", "hinge.check", 6000);
    await settle(page);
    const slider = page.getByTestId("film-interact").getByRole("slider");
    await slider.focus();
    await page.keyboard.press("Home");
    for (let i = 0; i < 6; i++) await page.keyboard.press("PageUp");
    await page.getByTestId("film-check").click();
    await expect(page.getByTestId("film-check-feedback")).toContainText("90");
    report.reducedMotion = rows;
    writeFileSync(join(ROOT, "qa", "reports", "step12.reduced_motion.json"), JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
    expect(log.errors).toEqual([]);
  });

  test("the learner setting overrides the system preference (full motion restores travel)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openFilm(page);
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("setting-motion-full").check();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("film")).toHaveAttribute("data-motion", "full");
    const entries = await film<{ id: string; endMs: number }[]>(page, "entries");
    await film(page, "seek", entries.find((e) => e.id === "intro.map")!.endMs - 200);
    await settle(page);
    await film(page, "play");
    await page.waitForFunction(() => (window as any).__jointsFilm.state().shotId === "fixed.travel", null, { timeout: 15_000 });
    const a = await camera(page);
    await page.waitForTimeout(500);
    const b = await camera(page);
    await film(page, "pause");
    expect(moved(a, b)).toBeGreaterThan(1e-3);
  });
});

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
];
const STATES: [string, string, number, string?][] = [
  ["intro", "intro.title", 5000],
  ["fixed", "fixed.name", 7000],
  ["pivot", "pivot.rotate", 7000],
  ["shoulder", "ball.move", 6000],
  ["ball_why", "ball.why", 6000],
  ["elbow", "hinge.flexion", 8000],
  ["knee", "hinge.knee", 7500],
  ["recap", "map.all", 7000],
  ["quiz", "hinge.check", 6000, "quiz"],
  ["explore", "hinge.support", 9000, "explore"],
  ["reduced_motion", "hinge.axis", 4000, "reduced"],
];

test.describe("Step 12 responsive visual regression", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step12.visual_regression.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  for (const vp of VIEWPORTS) {
    test(`captures + layout checks at ${vp.name}`, async ({ page }) => {
      test.setTimeout(400_000);
      const log = trackConsole(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const out = join(ROOT, "qa", "visual", "step12", "regression", vp.name);
      mkdirSync(out, { recursive: true });
      await openFilm(page);
      const rows = [];
      for (const [name, shot, offset, mode] of STATES) {
        if (mode === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
        await film(page, "seekShot", shot, offset);
        await settle(page);
        if (mode === "quiz") {
          const slider = page.getByTestId("film-interact").getByRole("slider");
          await slider.focus();
          await page.keyboard.press("Home");
          for (let i = 0; i < 6; i++) await page.keyboard.press("PageUp");
          await page.getByTestId("film-check").click();
        }
        if (mode === "explore") {
          await page.getByTestId("film-explore").click();
          await settle(page);
        }
        await page.waitForTimeout(1100);
        await settle(page);
        await page.screenshot({ path: join(out, `${name}.png`) });
        const layout = await page.evaluate(() => {
          const box = (sel: string) => {
            const el = document.querySelector<HTMLElement>(sel);
            if (!el || el.offsetParent === null || getComputedStyle(el).opacity === "0") return null;
            const r = el.getBoundingClientRect();
            return { x: r.left, y: r.top, w: r.width, h: r.height };
          };
          const overlap = (a: { x: number; y: number; w: number; h: number } | null, b: { x: number; y: number; w: number; h: number } | null) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          const caption = box(".film-caption.is-visible");
          const player = box(".film-player");
          const interact = box("[data-testid=film-interact]");
          const top = box(".film-top");
          const labels = (window as any).__jointsQA.labels() as { left: number; top: number; w: number; h: number }[];
          let labelOverlaps = 0;
          for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i], b = labels[j];
            if (a.left < b.left + b.w && b.left < a.left + a.w && a.top < b.top + b.h && b.top < a.top + a.h) labelOverlaps++;
          }
          const labelsOverUi = labels.filter((l) => [player, top].some((u) => u && overlap({ x: l.left, y: l.top, w: l.w, h: l.h }, u))).length;
          const offscreen = [...document.querySelectorAll<HTMLElement>("button, [role=slider], .film-caption.is-visible")].filter((el) => el.offsetParent !== null).map((el) => el.getBoundingClientRect()).filter((r) => r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1).length;
          const chapters = [...document.querySelectorAll<HTMLElement>(".film-chapter")].map((el) => el.getBoundingClientRect());
          let chapterOverlaps = 0;
          for (let i = 0; i < chapters.length; i++) for (let j = i + 1; j < chapters.length; j++) if (chapters[i].left < chapters[j].right - 1 && chapters[j].left < chapters[i].right - 1 && chapters[i].top < chapters[j].bottom && chapters[j].top < chapters[i].bottom) chapterOverlaps++;
          const titleClipped = [...document.querySelectorAll<HTMLElement>(".film-caption.is-visible .film-caption__title, .film-caption.is-visible .film-caption__text")].filter((el) => el.scrollWidth > el.clientWidth + 1).length;
          return { captionOverPlayer: overlap(caption, player), captionOverInteract: overlap(caption, interact), interactOverPlayer: overlap(interact, player), labelOverlaps, labelsOverUi, offscreen, chapterOverlaps, titleClipped, horizontalScroll: document.documentElement.scrollWidth > innerWidth };
        });
        const pivot = await page.evaluate(() => ((window as any).__jointsFilm.jointAttached() ? (window as any).__jointsQA.project((window as any).__jointsQA.hinge().pivot) : null));
        const row = { name, shot, ...layout, elbowPivotOnScreen: pivot ? pivot.inView && pivot.y < vp.height - 150 : null };
        rows.push(row);
        expect.soft(layout.captionOverPlayer, `${vp.name} ${name} caption/player`).toBe(false);
        expect.soft(layout.captionOverInteract, `${vp.name} ${name} caption/interact`).toBe(false);
        expect.soft(layout.interactOverPlayer, `${vp.name} ${name} interact/player`).toBe(false);
        expect.soft(layout.labelOverlaps, `${vp.name} ${name} labels`).toBe(0);
        expect.soft(layout.offscreen, `${vp.name} ${name} clipped controls`).toBe(0);
        expect.soft(layout.chapterOverlaps, `${vp.name} ${name} chapter markers`).toBe(0);
        expect.soft(layout.titleClipped, `${vp.name} ${name} typography`).toBe(0);
        expect.soft(layout.horizontalScroll, `${vp.name} ${name} horizontal scroll`).toBe(false);
        if (["elbow", "quiz", "explore", "reduced_motion"].includes(name)) expect.soft(row.elbowPivotOnScreen, `${vp.name} ${name} elbow visible above controls`).toBe(true);
        if (mode === "explore") await film(page, "resume").then(() => film(page, "pause"));
      }
      await page.emulateMedia({ reducedMotion: null });
      report[vp.name] = rows;
      writeFileSync(join(ROOT, "qa", "reports", `step12.visual_regression.${vp.name}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), viewport: vp, rows }, null, 1));
      expect(log.errors).toEqual([]);
    });
  }
});
