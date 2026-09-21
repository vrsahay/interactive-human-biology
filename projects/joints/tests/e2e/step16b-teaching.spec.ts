import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

/**
 * Step 16B: the four joint categories are taught to the same depth, the lesson says why and not only what, the learner
 * is asked to do something in every category, and playback is reliable - it starts on a real gesture and its clock does
 * not slow down when frames are dropped. Each test below is the proof for one of those, in the shipped content and in
 * the running build.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};
const lesson = JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8")) as Lesson;
const locale = JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8")) as Locale;
const narration = JSON.parse(readFileSync(join(ROOT, "public/assets/audio/narration/narration.json"), "utf8")) as Narration;
const bodyManifest = JSON.parse(readFileSync(join(ROOT, "public/assets/body/body-manifest.json"), "utf8")) as { jointSites: { siteId: string; structureIds: string[] }[] };
const siteStructures = (siteId: string) => bodyManifest.jointSites.find((s) => s.siteId === siteId)?.structureIds ?? [];

interface Teaching { arrive: string; look: string; movement: string; reason: string; name: string; explore: string }
interface Shot { id: string; durationMs: number; minDurationMs?: number; durationFrom?: string; narrationKey?: string; caption: { titleKey?: string; textKey?: string; noteKey?: string }; overlays: { concepts: string[] }; body: { highlight: string[] }; camera: { preset: string; site?: string; scale: number; endScale?: number; view: string } }
interface Chapter { id: string; number: string; titleKey: string; shots: Shot[]; teaching?: Teaching }
interface Explore { exploreId: string; chapterId: string; status: string; openAtShotId?: string; task?: { promptKey: string; doneKey: string; goal: { kind: string; primaryDeg?: number; secondaryDeg?: number } }; motion: { kind: string; limitsDeg: { primary: [number, number]; secondary?: [number, number] } } }
interface Lesson { chapters: Chapter[]; explores: Explore[]; recall: { steps: { stepId: string }[] } }
interface Locale { strings: Record<string, { text: string; provenance: string }> }
interface Narration { shots: Record<string, { durationMs: number; speakingRate: number; text: string }>; cues: Record<string, { text: string }>; timing: { leadInMs: number; tailMs: number } }

const t = (k?: string) => (k ? locale.strings[k].text : "");
const CATEGORIES = ["fixed", "pivot", "ball_socket", "hinge"] as const;
const categoryChapters = () => CATEGORIES.map((id) => lesson.chapters.find((c) => c.id === id)!);
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** Everything the learner reads or hears on a shot. */
const learnerText = (s: Shot) => [t(s.caption.titleKey), t(s.caption.textKey), t(s.narrationKey)].filter(Boolean).join(" ");

/** Screen-space bounding box of some body structures, as a fraction of the viewport. */
async function screenExtent(page: import("@playwright/test").Page, structureIds: string[]): Promise<{ w: number; h: number; offscreen: number; corners: number }> {
  const b = await film<{ width: number; height: number; corners: number; offscreen: number } | null>(page, "bodyScreenBounds", structureIds);
  return { w: b?.width ?? 0, h: b?.height ?? 0, offscreen: b?.offscreen ?? 0, corners: b?.corners ?? 0 };
}

test.describe("Step 16B teaching depth and playback reliability", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step16b.teaching.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("1. all four categories are taught in the same shape, to comparable depth", async () => {
    const rows = categoryChapters().map((c) => {
      const teach = c.teaching!;
      const order = c.shots.map((s) => s.id);
      return {
        chapter: c.id,
        shots: c.shots.length,
        durationS: +(c.shots.reduce((a, s) => a + s.durationMs, 0) / 1000).toFixed(1),
        spokenWords: c.shots.reduce((a, s) => a + words(t(s.narrationKey)), 0),
        beats: Object.fromEntries(Object.entries(teach).filter(([k]) => k !== "explore").map(([k, v]) => [k, order.indexOf(v as string)])),
        explore: teach.explore,
      };
    });
    for (const r of rows) {
      // every beat exists, and they happen in the order the shape declares
      expect(r.beats.arrive, `${r.chapter}: arrive`).toBeGreaterThanOrEqual(0);
      const seq = [r.beats.arrive, r.beats.look, r.beats.movement, r.beats.reason, r.beats.name];
      expect(seq, `${r.chapter} beats out of order: ${JSON.stringify(r.beats)}`).toEqual([...seq].sort((a, b) => a - b));
      expect(r.shots, `${r.chapter} needs a beat for each step`).toBeGreaterThanOrEqual(6);
      // comparable depth: no category may be taught in a fraction of the words another gets
      expect(r.spokenWords, `${r.chapter} spoken words`).toBeGreaterThanOrEqual(90);
    }
    // the three chapters that used to be introductions are now within a factor of 1.5 of each other
    const lite = rows.filter((r) => r.chapter !== "hinge").map((r) => r.durationS);
    expect(Math.max(...lite) / Math.min(...lite), `durations ${JSON.stringify(lite)}`).toBeLessThan(1.5);
    // and none of them is a tenth of the elbow chapter any more
    const hinge = rows.find((r) => r.chapter === "hinge")!.durationS;
    expect(Math.min(...lite) / hinge, "the thinnest category against the elbow chapter").toBeGreaterThan(0.33);
    report.beats = rows;
  });

  test("2. every category says why that shape produces that movement", async () => {
    const rows = categoryChapters().map((c) => {
      const reason = c.shots.find((s) => s.id === c.teaching!.reason)!;
      const text = learnerText(reason);
      return { chapter: c.id, shot: reason.id, words: words(text), text, spoken: !!narration.shots[reason.id] };
    });
    for (const r of rows) {
      // a reason is a sentence about structure causing movement, not a label
      expect(r.words, `${r.chapter}: the reason beat is too short to be a reason`).toBeGreaterThanOrEqual(18);
      expect(r.text, `${r.chapter}: the reason must connect the shape to the movement`).toMatch(/\bso\b|\bbecause\b|\bwhich\b|\bthat is why\b|\ballows\b|\bcannot\b/i);
      expect(r.spoken, `${r.chapter}: the reason must be spoken`).toBe(true);
    }
    // and the naming comes after the reason, never before it
    for (const c of categoryChapters()) {
      const order = c.shots.map((s) => s.id);
      expect(order.indexOf(c.teaching!.name), `${c.id}: named before explained`).toBeGreaterThanOrEqual(order.indexOf(c.teaching!.reason));
    }
    report.reasons = rows;
  });

  test("3. every exploration asks the learner to do one thing, and the goal is reachable", async ({ page }) => {
    for (const e of lesson.explores) {
      expect(e.task, `${e.exploreId} has no task`).toBeTruthy();
      expect(t(e.task!.promptKey).length, `${e.exploreId} prompt`).toBeGreaterThan(10);
      expect(t(e.task!.doneKey).length, `${e.exploreId} confirmation`).toBeGreaterThan(10);
      expect(narration.cues[e.task!.promptKey], `${e.exploreId} task is spoken`).toBeTruthy();
      const goal = e.task!.goal;
      if (goal.kind !== "attempt") {
        const reach = Math.max(...e.motion.limitsDeg.primary.map(Math.abs));
        expect(goal.primaryDeg!, `${e.exploreId} primary goal beyond the joint's range`).toBeLessThanOrEqual(reach);
      }
      if (goal.kind === "twoWay") {
        const sec = Math.max(...(e.motion.limitsDeg.secondary ?? [0, 0]).map(Math.abs));
        expect(goal.secondaryDeg!, `${e.exploreId} secondary goal beyond range`).toBeLessThanOrEqual(sec);
      }
    }
    // three of the four chapters hand the learner the joint by themselves; the elbow already does it inside the film
    const handovers = lesson.explores.filter((e) => e.openAtShotId);
    expect(handovers.map((e) => e.chapterId).sort()).toEqual(["ball_socket", "fixed", "pivot"]);
    for (const e of handovers) expect(lesson.chapters.flatMap((c) => c.shots).some((s) => s.id === e.openAtShotId), `${e.exploreId} handover shot`).toBe(true);

    // running build: the film hands over, the panel states the task, and doing it is confirmed
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const e of handovers) {
      // Step 16C: the film hands over only once the handover shot has finished speaking, so arrive near its end.
      const handoverShot = lesson.chapters.flatMap((ch) => ch.shots).find((s) => s.id === e.openAtShotId)!;
      await film(page, "seekShot", e.openAtShotId!, handoverShot.durationMs - 150);
      await settle(page);
      await expect(page.getByTestId("film-explore-panel")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("film-explore-task")).toHaveAttribute("data-done", "false");
      expect((await page.getByTestId("film-explore-task").textContent()) ?? "").toContain(t(e.task!.promptKey));
      // do the task with the keyboard, which is the only input every learner is guaranteed to have
      for (let i = 0; i < 60 && (await page.getByTestId("film-explore-task").getAttribute("data-done")) !== "true"; i++) {
        // move toward the wider side of each axis, so the goal is reachable whichever way the joint is set up
        await page.keyboard.press(e.task!.goal.kind === "twoWay" && i % 2 ? "ArrowDown" : "ArrowLeft");
      }
      expect(await page.getByTestId("film-explore-task").getAttribute("data-done"), `${e.exploreId}: the task never completed (readout ${await page.getByTestId("film-explore-readout").textContent()})`).toBe("true");
      await expect(page.getByTestId("film-explore-task-done")).toHaveText(t(e.task!.doneKey));
      rows.push({ explore: e.exploreId, prompt: t(e.task!.promptKey), done: t(e.task!.doneKey) });
      await page.keyboard.press("Escape");
      await film(page, "pause");
      await settle(page);
    }
    report.tasks = rows;
    expect(log.errors).toEqual([]);
  });

  test("4. no unsupported curriculum claim is introduced: every new explanation is draft and reviewable", async () => {
    const spoken = new Set<string>();
    for (const c of Object.values(narration.shots)) spoken.add(c.text);
    const narrKeys = Object.keys(locale.strings).filter((k) => k.startsWith("narr."));
    expect(narrKeys.length).toBeGreaterThan(30);
    for (const k of narrKeys) {
      // a spoken explanation is content, never interface text, and is always flagged for expert review
      expect(locale.strings[k].provenance, k).toBe("draft-enrichment");
      // and it never dresses itself up as a citation or as settled fact from a source we do not have
      expect(locale.strings[k].text, k).not.toMatch(/NCERT|textbook|chapter \d|page \d|studies show|scientists/i);
    }
    // the one supplied sentence is still the only source-excerpt in the lesson
    const sources = Object.entries(locale.strings).filter(([, s]) => s.provenance === "source-excerpt");
    expect(sources).toHaveLength(1);
    // the hip's classification is still pending, so nothing teaches or asks it
    const hipShots = lesson.chapters.flatMap((c) => c.shots).filter((s) => s.camera.site === "ball_socket.hip_right");
    expect(hipShots.map((s) => s.id), "the hip is not taught while its classification is pending").toEqual([]);
    for (const step of lesson.recall.steps) expect(step.stepId).not.toContain("hip");
    report.claims = { narrationStrings: narrKeys.length, allDraft: true, sourceExcerpts: sources.length, hipTaught: false };
  });

  test("5. the lesson starts on the learner's gesture, and that gesture is what starts the audio", async ({ page }) => {
    const log = trackConsole(page);
    // the default route, with no autoplay override: the landing card holds the lesson
    await page.goto("/?qa=1&dpr=1");
    await page.waitForFunction(() => (window as unknown as { __jointsFilm?: unknown }).__jointsFilm, null, { timeout: 90_000 });
    await expect(page.getByTestId("film-start")).toBeVisible();
    await expect(page.getByTestId("film-start-button")).toBeVisible();
    // nothing plays, and nothing is spoken, before the learner asks for it
    expect((await film<{ playing: boolean }>(page, "state")).playing, "the film waits").toBe(false);
    const before = await film<{ paused: boolean; shot: string }>(page, "narration");
    expect(before.paused, "no audio before the gesture").toBe(true);

    await page.getByTestId("film-start-button").click();
    await expect(page.getByTestId("film-start")).toHaveCount(0);
    await page.waitForFunction(() => (window as unknown as { __jointsFilm: { state: () => { playing: boolean } } }).__jointsFilm.state().playing, null, { timeout: 10_000 });
    // the audio element is now running, positioned by the film clock
    await page.waitForFunction(() => !(window as unknown as { __jointsFilm: { narration: () => { paused: boolean } } }).__jointsFilm.narration().paused, null, { timeout: 15_000 });
    const after = await film<{ paused: boolean; blocked: boolean; shot: string; currentTime: number }>(page, "narration");
    expect(after.blocked, "the gesture cleared the autoplay block").toBe(false);
    expect(after.shot).toBe("intro.title");
    // and the caption the learner reads is the line being spoken
    await expect(page.getByTestId("film-subtitle")).toBeVisible({ timeout: 10_000 });
    report.start = { cardShown: true, pausedBefore: before.paused, playingAfter: true, narrationShot: after.shot };
    expect(log.errors).toEqual([]);
  });

  test("6. dropped frames cost frames, not lesson time", async ({ page }) => {
    // Throttle animation frames to roughly 5 fps before the app is created. The render loop clamps its own frame delta
    // (a camera tween must never be flung across the scene by one long gap), so before Step 16B the film clock inherited
    // that clamp and the lesson ran in slow motion while the narration, on the audio clock, carried on.
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "hinge.flexion", 500);
    // Throttle animation frames to about 5 fps. The render loop resolves requestAnimationFrame at call time, so this
    // reaches it; startup is left alone so the test measures the clock, not the loader.
    await page.evaluate(() => {
      (window as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame = (cb: FrameRequestCallback) =>
        window.setTimeout(() => cb(performance.now()), 200);
    });
    await film(page, "play");
    // Sample on frame boundaries at both ends: at 5 fps a sample taken mid-gap would lose up to a fifth of a second
    // to the phase of the measurement rather than to the clock under test.
    const measured = await page.evaluate(() => new Promise<{ film: number; wall: number }>((resolve) => {
      const f = () => (window as unknown as { __jointsFilm: { state: () => { timeMs: number } } }).__jointsFilm.state().timeMs;
      requestAnimationFrame(() => {
        const film0 = f();
        const wall0 = performance.now();
        setTimeout(() => requestAnimationFrame(() => resolve({ film: f() - film0, wall: performance.now() - wall0 })), 6000);
      });
    }));
    await film(page, "pause");
    const ratio = measured.film / measured.wall;
    const t1 = { timeMs: measured.film };
    const wall = measured.wall;
    const fps = await page.evaluate(() => new Promise<number>((resolve) => {
      let n = 0;
      const start = performance.now();
      const tick = () => (performance.now() - start < 1000 ? (n++, requestAnimationFrame(tick)) : resolve(n));
      requestAnimationFrame(tick);
    }));
    report.throttledClock = { fps, filmMs: Math.round(t1.timeMs), wallMs: Math.round(wall), ratio: +ratio.toFixed(3) };
    expect(fps, "the harness really is dropping frames").toBeLessThan(15);
    expect(ratio, `lesson time ran at ${ratio.toFixed(2)}x wall clock at ${fps} fps`).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
    expect(log.errors).toEqual([]);
  });

  test("7. the shoulder beat shows the rounded end and the hollow it sits in", async ({ page }) => {
    const chapter = lesson.chapters.find((c) => c.id === "ball_socket")!;
    const look = chapter.shots.find((s) => s.id === chapter.teaching!.look)!;
    expect(look.body.highlight).toEqual(expect.arrayContaining(["body.humerus_right", "body.scapula_right"]));
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", look.id, Math.round(look.durationMs * 0.8));
    await film(page, "pause");
    await settle(page);
    const site = await film<{ x: number; y: number; inView: boolean } | null>(page, "siteOnScreen", "ball_socket.shoulder_right");
    const humerus = await screenExtent(page, ["body.humerus_right"]);
    const scapula = await screenExtent(page, ["body.scapula_right"]);
    // the joint itself is in frame - the old framing let the sentence describe a socket that was off the bottom edge
    expect(site?.inView, "the shoulder joint must be in frame").toBe(true);
    // and both structures the sentence is about are large enough to read
    expect(humerus.w, "the rounded end of the upper-arm bone is readable").toBeGreaterThan(0.15);
    expect(scapula.w, "the shoulder blade carrying the hollow is readable").toBeGreaterThan(0.15);
    const labels = await qa<{ id: string }[]>(page, "labels");
    report.shoulder = { shot: look.id, camera: look.camera, site, humerus, scapula, labels: labels.length };
    expect(log.errors).toEqual([]);
  });

  test("8. the comparison beats are close enough to read, and the summary uses labels", async ({ page }) => {
    const compare = lesson.chapters.find((c) => c.id === "compare")!;
    const moments = compare.shots.filter((s) => s.camera.preset === "site");
    expect(moments.length, "four readable moments").toBe(4);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const s of moments) {
      // one idea per frame: a single indicator, framed on its own site rather than on the whole body
      expect(s.overlays.concepts.length, `${s.id}`).toBe(1);
      expect(s.camera.scale, `${s.id} is framed on the joint, not the body`).toBeLessThanOrEqual(4.5);
      await film(page, "seekShot", s.id, Math.round(s.durationMs * 0.7));
      await film(page, "pause");
      await settle(page);
      // the structures the beat is about: the shot lights a region, which the body manifest resolves to bones
      const ids = s.body.highlight.flatMap((h) => (h.startsWith("body.") ? [h] : siteStructures(s.overlays.concepts[0])));
      const ext = await screenExtent(page, ids);
      rows.push({ shot: s.id, scale: s.camera.scale, widthFraction: +ext.w.toFixed(3), heightFraction: +ext.h.toFixed(3) });
      expect(Math.max(ext.w, ext.h), `${s.id}: the structure being compared fills too little of the frame`).toBeGreaterThan(0.25);
    }
    const summary = compare.shots.at(-1)!;
    expect(summary.overlays.concepts, "the summary does not rely on indicators too small to read").toEqual([]);
    await film(page, "seekShot", summary.id, Math.round(summary.durationMs * 0.7));
    await film(page, "pause");
    await settle(page);
    const sites = await film<[string, string][]>(page, "siteLabels");
    expect(sites.length, "the summary marks all four with labels").toBeGreaterThanOrEqual(4);
    report.compare = { moments: rows, summaryLabels: sites.map(([id, text]) => `${id}: ${text}`) };
    expect(log.errors).toEqual([]);
  });

  test("9. the end of the lesson is reachable and operable from the keyboard alone", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await page.getByTestId("film-scrubber").focus();
    await page.keyboard.press("End");
    await settle(page);
    await expect(page.getByTestId("film-end")).toBeVisible();
    const replay = page.getByTestId("film-end-replay");
    await replay.focus();
    await expect(replay).toBeFocused();
    // every action on the card is reachable by tabbing from the first one
    const names: string[] = [];
    for (let i = 0; i < 3; i++) {
      names.push((await page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "")) as string);
      await page.keyboard.press("Tab");
    }
    expect(names).toEqual(["film-end-replay", "film-end-recall", "film-end-explore"]);
    await replay.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => (window as unknown as { __jointsFilm: { state: () => { timeMs: number; playing: boolean } } }).__jointsFilm.state().timeMs < 5000, null, { timeout: 10_000 });
    await film(page, "pause");
    await expect(page.getByTestId("film-end")).toHaveCount(0);
    report.completion = { reachableByKeyboard: true, actions: names };
    expect(log.errors).toEqual([]);
  });

  test("10. the validated elbow is untouched by any of this", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    // the elbow asset is deferred: reach the chapter that uses it before asking the rig anything
    await film(page, "seekShot", "hinge.flexion", 2000);
    await settle(page);
    const joint = await qa<{ jointId: string; jointType: string; dofs: { id: string; min: number; max: number; neutral: number; axis: string }[] }>(page, "joint");
    expect(joint.dofs).toHaveLength(1);
    expect(joint.dofs[0].id).toBe("flexion");
    expect(joint.dofs[0].min).toBe(0);
    expect(joint.dofs[0].max).toBe(145);
    // the elbow exploration is still the only validated one, and it still drives the rig rather than displacing groups
    const hinge = lesson.explores.find((e) => e.exploreId === "explore.hinge")!;
    expect(hinge.status).toBe("validated-rig");
    expect(hinge.motion.kind).toBe("dof");
    expect(lesson.explores.filter((e) => e.status === "validated-rig")).toHaveLength(1);
    // and the poses the lesson plays through are the same four the gate checks
    const angles: number[] = [];
    for (const deg of [0, 45, 90, 145]) {
      await qa(page, "setDof", "flexion", deg);
      await settle(page);
      angles.push(await qa<number>(page, "getDof", "flexion"));
    }
    expect(angles).toEqual([0, 45, 90, 145]);
    report.elbow = { dof: joint.dofs[0], validatedExplores: ["explore.hinge"], poses: angles };
    expect(log.errors).toEqual([]);
  });
});
