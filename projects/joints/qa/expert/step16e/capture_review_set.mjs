// Step 16E: the capture set a human expert reviews, taken from the Step-16E candidate build.
//
// Read-only. It serves the existing dist, drives the same QA hooks the tests use, and writes PNGs. It changes nothing in
// the product, the content or the assets.
//
//   node qa/expert/step16e/capture_review_set.mjs
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 4193;
const OUT = "qa/visual/step16e_review";
const BUILD = process.env.CANDIDATE ?? "step16e candidate";
const lesson = JSON.parse(readFileSync("content/lessons/hinge-elbow.json", "utf8"));

mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

const captures = [];
const errors = [];

async function open(page, query = "&autoplay=0") {
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1${query}`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
}
const settle = (page) => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

async function shoot(page, name, note) {
  const file = join(OUT, `${name}.png`);
  const buf = await page.screenshot({ path: file });
  captures.push({ name, path: file.replace(/\\/g, "/"), bytes: buf.byteLength, sha256: createHash("sha256").update(new Uint8Array(buf)).digest("hex"), note });
  process.stdout.write(`${name}\n`);
}

/** Open each exploration from its button, photograph it as opened and after the learner moves it. */
async function explorations(page, prefix, label) {
  for (const e of lesson.explores) {
    const chapter = lesson.chapters.find((c) => c.id === e.chapterId);
    await page.evaluate((id) => window.__jointsFilm.seekShot(id, 600), e.status === "validated-rig" ? "hinge.axis" : chapter.shots[1].id);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle(page);
    await page.getByTestId("film-explore").click();
    await page.waitForSelector("[data-testid=film-explore-panel]");
    await settle(page);
    await page.waitForTimeout(1300);
    await page.mouse.move(2, 2);
    const key = e.exploreId.split(".")[1];
    await shoot(page, `${prefix}explore_${key}_open`, `${e.exploreId} as opened (${e.status})${label}`);
    await page.evaluate(() => window.__jointsFilm.exploreStep(8, 4));
    await settle(page);
    await page.waitForTimeout(300);
    await shoot(page, `${prefix}explore_${key}_moved`, `${e.exploreId} after the learner moves it (${e.status})${label}`);
    await page.getByTestId("film-explore-exit").click();
    await settle(page);
  }
}

try {
  // ---------------------------------------------------------------- the landing card, before any gesture
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await open(page, "");
    await settle(page);
    await shoot(page, "00_landing", "the Start-lesson card: nothing plays or speaks until the learner asks");
    await page.close();
  }

  // ---------------------------------------------------------------- every shot of the nine chapters, desktop
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await open(page);
    for (const chapter of lesson.chapters) {
      for (const shot of chapter.shots) {
        // two thirds into the shot: the caption is up and the authored dolly has mostly run
        await page.evaluate(([id, off]) => window.__jointsFilm.seekShot(id, off), [shot.id, Math.round(shot.durationMs * 0.66)]);
        await page.evaluate(() => window.__jointsFilm.pause());
        await settle(page);
        await page.waitForTimeout(350);
        await shoot(page, `${chapter.number}_${chapter.id}__${shot.id}`, `chapter ${chapter.number} ${chapter.id}, shot ${shot.id}`);
      }
    }

    // ---------------------------------------------------------------- the validated elbow at the four review poses
    await page.evaluate(() => window.__jointsFilm.seekShot("hinge.try", 3000));
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle(page);
    for (const deg of [0, 45, 90, 145]) {
      await page.evaluate((d) => window.__jointsQA.setDof("flexion", d), deg);
      await settle(page);
      await page.waitForTimeout(250);
      await shoot(page, `elbow_${String(deg).padStart(3, "0")}`, `validated elbow rig, flexion ${deg} deg`);
    }

    await explorations(page, "", " at 1280x800");

    // ---------------------------------------------------------------- the recall challenge
    await page.evaluate(() => window.__jointsFilm.seekShot("recall.open", 1500));
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle(page);
    await page.getByTestId("film-recall-start").click();
    await page.waitForSelector("[data-testid=film-recall]");
    const answers = lesson.recall.steps.map((s) => s.answer);
    for (let i = 0; i < answers.length; i++) {
      await settle(page);
      await page.waitForTimeout(400);
      await shoot(page, `recall_${i + 1}_question`, `recall question ${i + 1} of ${answers.length}, category withheld`);
      if (i === 0) {
        // one wrong answer, so the reviewer sees how a mistake is handled
        await page.getByTestId("film-recall-option-hinge").click();
        await page.waitForTimeout(400);
        await shoot(page, `recall_${i + 1}_wrong`, "a wrong answer: corrected, not scored; the learner may try again");
      }
      await page.getByTestId(`film-recall-option-${answers[i]}`).click();
      await page.waitForTimeout(400);
      await shoot(page, `recall_${i + 1}_answered`, `recall answer ${i + 1} revealed after the learner named it`);
      if (i < answers.length - 1) await page.getByTestId("film-recall-next").click();
    }

    // ---------------------------------------------------------------- the teacher layer and the end of the lesson
    await page.getByTestId("film-recall-exit").click().catch(() => undefined);
    await settle(page);
    await page.getByTestId("settings-toggle").click();
    await settle(page);
    await page.getByTestId("sources-toggle").click();
    await settle(page);
    await shoot(page, "teacher_sources", "Settings > For teachers > Sources & draft status: where the provenance of every line is shown");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    const total = await page.evaluate(() => window.__jointsFilm.state().durationMs);
    // play out the last moment of the film: a paused film does not end, however close to the end it is
    await page.evaluate((t) => window.__jointsFilm.seek(t - 600), total);
    await page.evaluate(() => window.__jointsFilm.play());
    await settle(page);
    // the end card fades in: photograph it once it is there, with the pointer out of the way
    await page.getByTestId("film-end").waitFor({ state: "visible", timeout: 20000 });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(700);
    await shoot(page, "completion", "the end of the lesson: the completion card");
    await page.close();
  }

  // ---------------------------------------------------------------- phone widths (Step 16E: the explorations on a phone)
  for (const [w, h] of [[390, 844], [412, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await open(page);
    for (const id of ["hook.shoulder", "concept.meet", "fixed.bones", "ball.move", "hinge.try", "compare.together", "map.all"]) {
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2500), id);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle(page);
      await page.waitForTimeout(350);
      await shoot(page, `phone${w}_${id}`, `${id} at ${w}x${h}`);
    }
    await explorations(page, `phone${w}_`, ` at ${w}x${h}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

writeFileSync(join(OUT, "captures.json"), JSON.stringify({ generatedAt: new Date().toISOString(), build: BUILD, viewport: "1280x800 unless the name says otherwise", consoleErrors: errors, captures }, null, 1));
console.log(`\n${captures.length} captures, ${errors.length} console errors`);
