import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};
const locale = JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8")) as { strings: Record<string, { text: string; provenance: string }> };

type ChapterInfo = { id: string; number: string; titleKey: string; shots: string[] };
type Clip = { url: string; durationMs: number; text: string; textKeys: string[] } | null;

const chapters = (page: Page) => film<ChapterInfo[]>(page, "chapters");
const CATEGORY = /\bfixed\b|\bpivot\b|ball[- ]and[- ]socket|\bhinge\b/i;

/**
 * Step 14B: the lesson is a nine-beat teaching arc, not six chapters with the joints in the middle. These tests check the
 * arc itself - that the hook comes before any terminology, that the concept chapter exists on its own, that comparison
 * teaches movement, that recall is its own chapter ahead of the body map - and that every new instructional line is
 * spoken and every chapter is deliberately framed.
 */
test.describe("Step 14B lesson architecture", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step14b.lesson.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("1-2. the nine beats are in order, and the hook runs before any joint category is named", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    const cs = await chapters(page);
    expect(cs.map((c) => [c.number, c.id])).toEqual([
      ["01", "hook"], ["02", "what_is_joint"], ["03", "fixed"], ["04", "pivot"], ["05", "ball_socket"],
      ["06", "hinge"], ["07", "compare"], ["08", "recall"], ["09", "body_map"],
    ]);
    for (const c of cs) await expect(page.getByTestId(`film-chapter-${c.id}`)).toBeAttached();

    // the hook asks a question about movement; no category name appears anywhere in it, nor in the concept chapter
    const before = cs.slice(0, 2).flatMap((c) => c.shots);
    const entries = await film<{ id: string; startMs: number }[]>(page, "entries");
    const said: { shot: string; text: string }[] = [];
    for (const shot of before) {
      const clip = await film<Clip>(page, "narrationClip", shot);
      if (clip) said.push({ shot, text: clip.text });
    }
    for (const s of said) expect(CATEGORY.test(s.text), `${s.shot} names a joint category before the lesson teaches one: "${s.text}"`).toBe(false);

    // and the first category chapter really does start after them
    const firstCategoryShot = cs[2].shots[0];
    expect(entries.find((e) => e.id === firstCategoryShot)!.startMs).toBeGreaterThan(entries.find((e) => e.id === before.at(-1)!)!.startMs);
    report.structure = { chapters: cs.map((c) => ({ ...c, title: locale.strings[c.titleKey].text })), hookLines: said };
    expect(log.errors).toEqual([]);
  });

  test("3-4. every joint chapter offers its own Explore, and it opens, moves, resets and closes", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const cs = await chapters(page);
    const explores = await film<{ exploreId: string; chapterId: string; status: string; kind: string }[]>(page, "explores");
    expect(explores.map((e) => e.chapterId).sort()).toEqual(["ball_socket", "fixed", "hinge", "pivot"]);

    const rows: Record<string, unknown>[] = [];
    for (const e of explores) {
      const chapter = cs.find((c) => c.id === e.chapterId)!;
      // Step 16B: the last beat of a category chapter hands the learner the joint by itself, so this test opens the
      // exploration the other way - from the button, on the beat before it.
      await film(page, "seekShot", chapter.shots.at(-2) ?? chapter.shots.at(-1), 1000);
      await film(page, "pause");
      await settle(page);
      await page.getByTestId("film-explore").click();
      await expect(page.getByTestId("film-explore-panel")).toBeVisible();
      await settle(page);
      const opened = await film<{ exploreId: string; status: string; dofId: string | null; displacedGroups: string[] }>(page, "exploreState");
      expect(opened.exploreId).toBe(e.exploreId);

      // 5-6. only the elbow drives the validated rig; a teaching simulation may never claim to be one
      if (e.kind === "dof") {
        expect(opened.status).toBe("validated-rig");
        expect(opened.dofId).toBe("flexion");
        expect(opened.displacedGroups).toEqual([]);
      } else {
        expect(opened.status).toBe("teaching-simulation");
        expect(opened.dofId).toBeNull();
      }
      await film(page, "exploreStep", 6, 0);
      await page.waitForTimeout(200);
      const moved = (await film<{ readout: { primary: number } }>(page, "exploreState")).readout.primary;
      await page.getByTestId("film-explore-reset").click();
      await page.waitForTimeout(250);
      expect(Math.abs((await film<{ readout: { primary: number } }>(page, "exploreState")).readout.primary)).toBeLessThan(0.01);
      await page.getByTestId("film-explore-exit").click();
      await settle(page);
      expect(await film(page, "exploreState")).toBeNull();
      rows.push({ chapter: e.chapterId, explore: e.exploreId, status: opened.status, movedTo: +moved.toFixed(2) });
    }
    report.explores = rows;
    expect(log.errors).toEqual([]);
  });

  test("7. compare teaches the four movement differences one at a time, then together", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    const compare = (await chapters(page)).find((c) => c.id === "compare")!;
    expect(compare.shots.length).toBeGreaterThanOrEqual(5);
    const rows: Record<string, unknown>[] = [];
    for (const shot of compare.shots) {
      await film(page, "seekShot", shot, 1500);
      await film(page, "pause");
      await settle(page);
      const concepts = await film<string[]>(page, "concepts");
      const labels = await film<[string, string][]>(page, "siteLabels");
      const caption = (await page.getByTestId("film-caption").textContent()) ?? "";
      rows.push({ shot, concepts: concepts.length, siteLabels: labels.map(([id]) => id), caption: caption.trim().slice(0, 80) });
    }
    // each of the four middle beats shows exactly one joint, and the last one shows them all
    const middle = rows.slice(1, 5);
    for (const r of middle) expect(r.concepts, `${r.shot} should isolate one movement`).toBe(1);
    // Step 16B: the closing beat is a summary, so it marks all four with short labels rather than with four
    // indicators that were 10-30 px wide at full-body scale.
    expect(rows.at(-1)!.concepts, "the summary does not rely on tiny indicators").toBe(0);
    expect((rows.at(-1)!.siteLabels as string[]).length, "the closing beat marks all four together").toBeGreaterThanOrEqual(4);
    report.compare = rows;
    expect(log.errors).toEqual([]);
  });

  test("8-10. recall is its own chapter, reaching it hands over to the learner, and the body map follows it", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const cs = await chapters(page);
    const cfg = (await film<{ chapterId: string; shotId: string | null; steps: { stepId: string; answer: string; questionKey: string }[] }>(page, "recall"))!;
    expect(cfg.chapterId).toBe("recall");
    expect(cs.findIndex((c) => c.id === "body_map")).toBe(cs.findIndex((c) => c.id === "recall") + 1);
    expect(cfg.steps.length).toBeGreaterThanOrEqual(4);
    // the question never contains the answer
    for (const s of cfg.steps) expect(CATEGORY.test(locale.strings[s.questionKey].text), `${s.stepId} gives the category away`).toBe(false);

    // Playing into the challenge opens it without the learner having to find a control, and stops the clock there.
    await film(page, "seekShot", "recall.open", 1500);
    await settle(page);
    await film(page, "play");
    await expect(page.getByTestId("film-recall")).toBeVisible({ timeout: 30_000 });
    expect((await film<{ shotId: string }>(page, "state")).shotId).toBe(cfg.shotId);
    expect((await film<{ playing: boolean }>(page, "state")).playing, "the film waits for the learner").toBe(false);

    for (const s of cfg.steps) {
      await page.getByTestId(`film-recall-option-${s.answer}`).click();
      await page.waitForTimeout(200);
      await page.getByTestId("film-recall-next").click();
      await page.waitForTimeout(400);
    }
    // the last answer carries the learner into the body map chapter, and no recall state survives
    await expect(page.getByTestId("film-recall")).toHaveCount(0);
    const after = await film<{ chapterId: string }>(page, "state");
    expect(after.chapterId).toBe("body_map");
    await film(page, "pause");
    await settle(page);
    report.recall = { chapterId: cfg.chapterId, shotId: cfg.shotId, steps: cfg.steps.length, endsIn: after.chapterId };
    expect(log.errors).toEqual([]);
  });

  test("11. every new instructional line is spoken, and no clip overruns its shot", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    const cs = await chapters(page);
    const silent: string[] = [];
    const overruns: string[] = [];
    const entries = await film<{ id: string; startMs: number; endMs: number }[]>(page, "entries");
    for (const c of cs) {
      for (const shot of c.shots) {
        const clip = await film<Clip>(page, "narrationClip", shot);
        const e = entries.find((x) => x.id === shot)!;
        if (!clip) {
          silent.push(shot);
          continue;
        }
        if (clip.durationMs > e.endMs - e.startMs) overruns.push(`${shot}: ${clip.durationMs} ms of speech in a ${e.endMs - e.startMs} ms shot`);
      }
    }
    // Step 15B closed the last silent beat: the transition that used to run wordless now says what it is doing, so
    // every shot in the lesson speaks. A new silent shot would be a regression, not an allowed exception.
    expect(silent, "a shot with instructional text must not be silent").toEqual([]);
    expect(overruns).toEqual([]);

    // learner-paced lines: explore instructions and every recall question, correction and reveal
    const explores = await film<{ exploreId: string; instructionKey: string }[]>(page, "explores");
    const cfg = (await film<{ steps: { questionKey: string; revealKey: string }[] }>(page, "recall"))!;
    const cueKeys = [
      ...explores.map((e) => e.instructionKey),
      ...cfg.steps.flatMap((st) => [st.questionKey, st.revealKey]),
      "recall.incorrect",
      "recall.complete",
    ];
    const missing: string[] = [];
    for (const key of cueKeys) if (!(await film<Clip>(page, "narrationCue", key))) missing.push(key);
    expect(missing, "learner-paced instructional lines must be narrated too").toEqual([]);
    report.narration = { shots: cs.flatMap((c) => c.shots).length, silent, cues: cueKeys.length, overruns };
    expect(log.errors).toEqual([]);
  });

  test("12-13. every chapter is deliberately framed, and the whole lesson plays without a console error", async ({ page }) => {
    test.setTimeout(300_000);
    const log = trackConsole(page);
    await openFilm(page);
    const cs = await chapters(page);
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < cs.length; i++) {
      await film(page, "seekChapter", i);
      await film(page, "pause");
      await settle(page);
      const cam = await film<{ position: number[]; target: number[]; preset: string }>(page, "camera");
      const first = await film<{ shotId: string }>(page, "state");
      rows.push({
        chapter: cs[i].id,
        shot: first.shotId,
        preset: cam.preset,
        target: cam.target.map((v) => +v.toFixed(3)),
        position: cam.position.map((v) => +v.toFixed(3)),
      });
    }
    // Each chapter opens the camera somewhere of its own: consecutive chapters never start from the same place, and the
    // lesson visits at least six distinct subjects rather than replaying one framing with different words over it.
    const framing = (r: Record<string, unknown>) => `${r.preset}:${(r.position as number[]).join(",")}|${(r.target as number[]).join(",")}`;
    for (let i = 1; i < rows.length; i++) {
      expect(framing(rows[i]), `${rows[i].chapter} opens exactly where ${rows[i - 1].chapter} did`).not.toBe(framing(rows[i - 1]));
    }
    // five distinct subjects: the whole body, and each of the four joint sites
    expect(new Set(rows.map((r) => (r.target as number[]).join(","))).size, JSON.stringify(rows, null, 1)).toBeGreaterThanOrEqual(5);
    report.camera = rows;
    expect(log.errors).toEqual([]);
  });
});
