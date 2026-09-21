// Step 14: walk the recap retrieval sequence as a learner does.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4202;
mkdirSync("qa/visual/step14", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
  await page.evaluate(() => window.__jointsFilm.seekShot("recap.compare", 2000));
  await settle();
  await page.getByTestId("film-recall-start").click();
  await page.waitForSelector("[data-testid=film-recall]");
  await settle();

  const ANSWERS = [["fixed", "pivot"], ["pivot", null], ["ball_and_socket", null], ["hinge", null]];
  for (let i = 0; i < ANSWERS.length; i++) {
    await page.waitForTimeout(500);
    const q = await page.getByTestId("film-recall-question").textContent();
    writeFileSync(`qa/visual/step14/recall_${i + 1}_question.png`, await page.screenshot());
    // first step: answer wrong once on purpose, to check the feedback path
    if (i === 0) {
      await page.getByTestId("film-recall-option-hinge").click();
      await page.waitForTimeout(300);
      const wrong = await page.getByTestId("film-recall-feedback").textContent();
      writeFileSync("qa/visual/step14/recall_1_wrong.png", await page.screenshot());
      console.log(`step ${i + 1} wrong-answer feedback: ${JSON.stringify(wrong?.trim())}`);
    }
    await page.getByTestId(`film-recall-option-${ANSWERS[i][0]}`).click();
    await page.waitForTimeout(400);
    const fb = await page.getByTestId("film-recall-feedback").textContent();
    console.log(`step ${i + 1} ${JSON.stringify(q?.trim())} -> ${JSON.stringify(fb?.trim().slice(0, 70))}`);
    writeFileSync(`qa/visual/step14/recall_${i + 1}_answered.png`, await page.screenshot());
    await page.getByTestId("film-recall-next").click();
    await settle();
  }
  await page.waitForTimeout(600);
  writeFileSync("qa/visual/step14/recall_5_complete.png", await page.screenshot());
  const done = await page.evaluate(() => ({ panel: !!document.querySelector("[data-testid=film-recall]"), shot: window.__jointsFilm.state().shotId }));
  console.log("after the last step:", JSON.stringify(done), "| console errors:", errors.length, errors.slice(0, 3));
} finally { await browser.close(); server.kill(); }
