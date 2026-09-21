// Step 15A: the capture set a human expert reviews, taken from the `step14b-complete` candidate build.
//
// Read-only. It serves the existing dist, drives the same QA hooks the tests use, and writes PNGs. It changes nothing in
// the product, the content or the assets.
//
//   node qa/expert/step15/capture_review_set.mjs
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 4192;
const OUT = "qa/visual/step15";
const lesson = JSON.parse(readFileSync("content/lessons/hinge-elbow.json", "utf8"));

mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

const captures = [];
const errors = [];

async function open(page) {
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
}
const settle = (page) => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

async function shoot(page, name, note) {
  const file = join(OUT, `${name}.png`);
  const buf = await page.screenshot({ path: file });
  captures.push({ name, path: file.replace(/\\/g, "/"), bytes: buf.byteLength, sha256: createHash("sha256").update(new Uint8Array(buf)).digest("hex"), note });
  process.stdout.write(`${name}\n`);
}

try {
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

    // ---------------------------------------------------------------- the four explorations
    for (const e of lesson.explores) {
      const chapter = lesson.chapters.find((c) => c.id === e.chapterId);
      await page.evaluate((id) => window.__jointsFilm.seekShot(id, 1000), chapter.shots.at(-1).id);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle(page);
      await page.getByTestId("film-explore").click();
      await page.waitForSelector("[data-testid=film-explore-panel]");
      await settle(page);
      await page.waitForTimeout(500);
      await shoot(page, `explore_${e.exploreId.split(".")[1]}_open`, `${e.exploreId} as opened (${e.status})`);
      await page.evaluate(() => window.__jointsFilm.exploreStep(8, 4));
      await settle(page);
      await page.waitForTimeout(300);
      await shoot(page, `explore_${e.exploreId.split(".")[1]}_moved`, `${e.exploreId} after the learner moves it (${e.status})`);
      await page.getByTestId("film-explore-exit").click();
      await settle(page);
    }

    // ---------------------------------------------------------------- the recall challenge
    await page.evaluate(() => window.__jointsFilm.seekShot("recall.open", 1500));
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle(page);
    await page.getByTestId("film-recall-start").click();
    await page.waitForSelector("[data-testid=film-recall]");
    const answers = ["fixed", "pivot", "ball_and_socket", "hinge", "hinge"];
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
    await page.close();
  }

  // ---------------------------------------------------------------- phone width
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await open(page);
    for (const id of ["hook.shoulder", "concept.meet", "fixed.detail", "hinge.try", "compare.together", "map.all"]) {
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2500), id);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle(page);
      await page.waitForTimeout(350);
      await shoot(page, `phone_${id}`, `${id} at 390x844`);
    }
    await page.evaluate(() => window.__jointsFilm.seekShot("recall.open", 1500));
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle(page);
    await page.getByTestId("film-recall-start").click();
    await page.waitForSelector("[data-testid=film-recall]");
    await settle(page);
    await page.waitForTimeout(500);
    await shoot(page, "phone_recall_question", "recall challenge at 390x844");
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

writeFileSync(join(OUT, "captures.json"), JSON.stringify({ generatedAt: new Date().toISOString(), build: "step14b-complete", viewport: "1280x800 unless the name says otherwise", consoleErrors: errors, captures }, null, 1));
console.log(`\n${captures.length} captures, ${errors.length} console errors`);
