import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};
const STEPS = [
  { stepId: "skull", answer: "fixed" },
  { stepId: "neck", answer: "pivot" },
  { stepId: "shoulder", answer: "ball_and_socket" },
  { stepId: "elbow", answer: "hinge" },
  { stepId: "knee", answer: "hinge" },
];

/**
 * The recap must make the learner retrieve the category, not read it. These tests check the retrieval itself: the question
 * describes the MOVEMENT, the category is revealed only after an answer, and a wrong answer is corrected without punishment.
 */
test.describe("Step 14 recap: retrieval, not a labelled diagram", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step14.recall.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("all four joints are recalled from how they move, and the category is revealed only after answering", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "recall.open", 2000);
    await film(page, "pause");
    await settle(page);

    await page.getByTestId("film-recall-start").click();
    await expect(page.getByTestId("film-recall")).toBeVisible();
    await settle(page);

    const rows: { stepId: string; question: string; revealedBeforeAnswer: boolean; reveal: string }[] = [];
    for (let i = 0; i < STEPS.length; i++) {
      const question = (await page.getByTestId("film-recall-question").textContent())!.trim();
      // the question is about movement; the category name must not be given away in it
      const givenAway = /fixed|pivot|ball[- ]and[- ]socket|hinge/i.test(question);
      const feedbackBefore = (await page.getByTestId("film-recall-feedback").textContent())!.trim();

      await page.getByTestId(`film-recall-option-${STEPS[i].answer}`).click();
      await page.waitForTimeout(250);
      const reveal = (await page.getByTestId("film-recall-feedback").textContent())!.trim();
      expect(reveal.length, "answering reveals the category").toBeGreaterThan(0);
      rows.push({ stepId: STEPS[i].stepId, question, revealedBeforeAnswer: givenAway || feedbackBefore.length > 0, reveal });
      expect(givenAway, `question ${i + 1} names the category instead of asking for it`).toBe(false);
      expect(feedbackBefore, `question ${i + 1} showed feedback before an answer`).toBe("");

      await page.getByTestId("film-recall-next").click();
      await settle(page);
      await page.waitForTimeout(200);
    }
    report.steps = rows;
    expect(log.errors).toEqual([]);
  });

  test("a wrong answer is corrected and the learner can try again", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "recall.open", 2000);
    await film(page, "pause");
    await settle(page);
    await page.getByTestId("film-recall-start").click();
    await expect(page.getByTestId("film-recall")).toBeVisible();

    // step 1 is the skull: answer "hinge" first
    await page.getByTestId("film-recall-option-hinge").click();
    await page.waitForTimeout(250);
    const wrong = (await page.getByTestId("film-recall-feedback").textContent())!.trim();
    expect(wrong.length).toBeGreaterThan(0);
    // the sequence does not advance on a wrong answer, and the right option is still available
    await expect(page.getByTestId("film-recall-next")).toHaveCount(0);
    await expect(page.getByTestId("film-recall-option-fixed")).toBeEnabled();

    await page.getByTestId("film-recall-option-fixed").click();
    await page.waitForTimeout(250);
    await expect(page.getByTestId("film-recall-next")).toBeVisible();
    // once answered, the options lock so the learner cannot thrash
    await expect(page.getByTestId("film-recall-option-pivot")).toBeDisabled();
    report.wrongAnswer = { feedback: wrong, advancedOnWrongAnswer: false };
    expect(log.errors).toEqual([]);
  });

  test("right and wrong are not signalled by colour alone", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "recall.open", 2000);
    await film(page, "pause");
    await settle(page);
    await page.getByTestId("film-recall-start").click();
    await expect(page.getByTestId("film-recall")).toBeVisible();
    await page.getByTestId("film-recall-option-hinge").click();
    await page.getByTestId("film-recall-option-fixed").click();
    await page.waitForTimeout(250);
    const marks = await page.evaluate(() => {
      const mark = (id: string) => {
        const el = document.querySelector(`[data-testid=film-recall-option-${id}]`)!;
        return { pressed: el.getAttribute("aria-pressed"), after: getComputedStyle(el, "::after").content };
      };
      return { right: mark("fixed"), wrong: mark("hinge"), feedbackRole: document.querySelector("[data-testid=film-recall-feedback]")?.getAttribute("role") };
    });
    // a tick / cross glyph and the live feedback line carry the meaning, not just the fill colour
    expect(marks.right.after).toContain("✓");
    expect(marks.wrong.after).toContain("✕");
    expect(marks.feedbackRole).toBe("status");
    report.nonColourSignals = marks;
    expect(log.errors).toEqual([]);
  });

  test("the body map closes the lesson, after the recall rather than instead of it", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "recall.open", 2000);
    await film(page, "pause");
    await settle(page);
    await page.getByTestId("film-recall-start").click();
    await expect(page.getByTestId("film-recall")).toBeVisible();
    for (const s of STEPS) {
      await page.getByTestId(`film-recall-option-${s.answer}`).click();
      await page.waitForTimeout(200);
      await page.getByTestId("film-recall-next").click();
      await settle(page);
    }
    // answering the last question carries the learner into the final body map chapter - which is where the labelled
    // map now lives, after the recall rather than instead of it
    await expect(page.getByTestId("film-recall")).toHaveCount(0);
    const state = await film<{ chapterId: string; shotId: string }>(page, "state");
    expect(state.chapterId).toBe("body_map");
    await film(page, "seekShot", "map.all", 2000);
    await settle(page);
    const labels = await film<[string, string][]>(page, "siteLabels");
    expect(labels.length, "the closing body map still names every site").toBeGreaterThanOrEqual(4);
    report.closing = { chapter: state.chapterId, shot: state.shotId, siteLabels: labels.length };
    expect(log.errors).toEqual([]);
  });
});
