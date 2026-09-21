// Step 17: the capture set a human expert reviews, taken from the Step-16G candidate build
// (`step16g-narration-repetition-fixed`, 11560e3).
//
// Read-only. It serves the existing dist, drives the same QA hooks the tests use, and writes PNGs plus captures.json with
// a SHA-256 per image. It changes nothing in the product, the content or the assets.
//
//   CANDIDATE=step16g-narration-repetition-fixed node qa/expert/step17/capture_review_set.mjs
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 4194;
const OUT = "qa/visual/step17_review";
const BUILD = process.env.CANDIDATE ?? "step16g-narration-repetition-fixed";
const lesson = JSON.parse(readFileSync("content/lessons/hinge-elbow.json", "utf8"));

mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--autoplay-policy=no-user-gesture-required"] });

const captures = [];
const errors = [];

async function open(page, query = "&autoplay=0") {
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1${query}`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
}
const settle = (page) => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

async function shoot(page, name, note, extra = {}) {
  const file = join(OUT, `${name}.png`);
  const buf = await page.screenshot({ path: file });
  captures.push({ name, path: file.replace(/\\/g, "/"), bytes: buf.byteLength, sha256: createHash("sha256").update(new Uint8Array(buf)).digest("hex"), note, ...extra });
  process.stdout.write(`${name}\n`);
}

const openOn = (e) => (e.status === "validated-rig" ? "hinge.axis" : lesson.chapters.find((c) => c.id === e.chapterId).shots[1].id);

/**
 * Each exploration in the four states the brief names: before movement, task in progress, mid-drag (button held, a real
 * pointer drag that starts on the target), task completed.
 */
async function exploreStates(page, prefix, label) {
  for (const e of lesson.explores) {
    const key = e.exploreId.split(".")[1];
    await page.evaluate((id) => window.__jointsFilm.seekShot(id, 600), openOn(e));
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle(page);
    await page.getByTestId("film-explore").click();
    await page.waitForSelector("[data-testid=film-explore-panel]");
    await settle(page);
    await page.waitForTimeout(1300);
    await page.mouse.move(2, 2);
    await shoot(page, `${prefix}explore_${key}_1_before`, `${e.exploreId} as opened, before any movement (${e.status})${label}`);
    const keyName = e.status === "validated-rig" ? "ArrowRight" : "ArrowLeft";
    for (let i = 0; i < 4; i++) await page.keyboard.press(keyName);
    await page.waitForTimeout(250);
    await shoot(page, `${prefix}explore_${key}_2_task`, `${e.exploreId} with the task in progress${label}`);
    const t = await page.evaluate(() => window.__jointsFilm.exploreTarget());
    const [dx, dy] = e.status === "validated-rig" ? [0, -60] : e.exploreId === "explore.pivot" ? [70, 0] : [50, -40];
    await page.mouse.move(t.grip.x, t.grip.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(t.grip.x + (dx * i) / 12, t.grip.y + (dy * i) / 12);
    await page.waitForTimeout(200);
    await shoot(page, `${prefix}explore_${key}_3_mid`, `${e.exploreId} mid-drag, the learner's pointer held on the target${label}`);
    await page.mouse.up();
    await page.mouse.move(2, 2);
    for (let i = 0; i < 30; i++) {
      if ((await page.getByTestId("film-explore-task").getAttribute("data-done")) === "true") break;
      await page.keyboard.press(keyName);
      if (e.exploreId === "explore.ball") await page.keyboard.press("ArrowDown");
    }
    await page.waitForTimeout(400);
    await shoot(page, `${prefix}explore_${key}_4_done`, `${e.exploreId} with the learner's task completed${label}`);
    await page.getByTestId("film-explore-exit").click();
    await page.evaluate(() => window.__jointsFilm.pause());
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
        // two thirds into the shot: the topic heading is up and the authored dolly has mostly run
        await page.evaluate(([id, off]) => window.__jointsFilm.seekShot(id, off), [shot.id, Math.round(shot.durationMs * 0.66)]);
        await page.evaluate(() => window.__jointsFilm.pause());
        await settle(page);
        await page.waitForTimeout(1100);
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

    // ---------------------------------------------------------------- the four explorations, four states each
    await exploreStates(page, "", " at 1280x800");

    // ---------------------------------------------------------------- the film handing a learner into an exploration
    // The last beat of each category chapter hands over to its exploration, and the task is spoken as a cue while the
    // film's own clip is silent: one narration owner at a time. The owner is recorded with the capture.
    for (const e of lesson.explores) {
      const ch = lesson.chapters.find((c) => c.id === e.chapterId);
      const taskShot = e.openAtShotId ?? ch.shots.at(-1).id;
      const entry = await page.evaluate((id) => window.__jointsFilm.entries().find((x) => x.id === id), taskShot);
      if (!entry) continue;
      await page.evaluate((ms) => window.__jointsFilm.seek(ms), entry.endMs - 1500);
      await page.evaluate(() => window.__jointsFilm.play());
      const opened = await page.waitForSelector("[data-testid=film-explore-panel]", { timeout: 20000 }).then(() => true, () => false);
      if (!opened) continue;
      await page.waitForTimeout(900);
      await page.mouse.move(2, 2);
      const n = await page.evaluate(() => window.__jointsFilm.narration());
      await shoot(page, `handover_${e.exploreId.split(".")[1]}`, `${e.exploreId}: the film hands the learner in; the task is spoken as a cue`, { narration: { owner: n.owner, owners: n.owners, cue: n.cue, filmClipPaused: n.paused } });
      await page.getByTestId("film-explore-exit").click();
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle(page);
    }

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
    await page.getByTestId("film-end").waitFor({ state: "visible", timeout: 20000 });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(700);
    await shoot(page, "completion", "the end of the lesson: the completion card");
    await page.close();
  }

  // ---------------------------------------------------------------- phone and tablet widths (EMULATED, not real devices)
  for (const [w, h] of [[390, 844], [412, 844], [768, 1024]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await open(page);
    for (const id of ["hook.shoulder", "concept.meet", "fixed.bones", "pivot.travel", "ball.move", "hinge.flexion", "hinge.try", "compare.together", "map.all"]) {
      await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2500), id);
      await page.evaluate(() => window.__jointsFilm.pause());
      await settle(page);
      await page.waitForTimeout(1100);
      await shoot(page, `w${w}_${id}`, `${id} at ${w}x${h} (emulated viewport)`);
    }
    if (w !== 768) await exploreStates(page, `w${w}_`, ` at ${w}x${h} (emulated viewport)`);
    await page.evaluate(() => window.__jointsFilm.seekShot("recall.open", 1500));
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle(page);
    await page.getByTestId("film-recall-start").click();
    await page.waitForSelector("[data-testid=film-recall]");
    await settle(page);
    await page.waitForTimeout(500);
    await shoot(page, `w${w}_recall_question`, `recall challenge at ${w}x${h} (emulated viewport)`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

writeFileSync(join(OUT, "captures.json"), JSON.stringify({ generatedAt: new Date().toISOString(), build: BUILD, viewport: "1280x800 unless the name says otherwise; w390/w412/w768 are EMULATED viewports in desktop Chrome, not devices", consoleErrors: errors, captures }, null, 1));
console.log(`\n${captures.length} captures, ${errors.length} console errors`);
