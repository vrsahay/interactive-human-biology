import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const STEP = process.env.QA_STEP ?? "step12";
const OUT = join(ROOT, "qa", "visual", STEP, STEP === "step11" ? "" : "film");

const CAPTURES: [string, string, number][] = [
  ["01_intro_full_body", "intro.title", 3500],
  ["01b_intro_joint_map", "intro.map", 6000],
  ["02_fixed_skull", "fixed.name", 6000],
  ["03_pivot_upper_neck", "pivot.rotate", 6500],
  ["04_ball_socket_shoulder", "ball.move", 5000],
  ["04b_ball_socket_bones", "ball.bones", 5000],
  ["06_hinge_elbow_source", "hinge.source", 6000],
  ["06b_hinge_elbow_bones", "hinge.bones", 5000],
  ["06c_hinge_elbow_axis", "hinge.axis", 6000],
  ["06d_hinge_elbow_support", "hinge.support", 8000],
  ["07_hinge_knee", "hinge.knee", 7500],
  ["08_compare_full_body", "compare.pullback", 4000],
  ["08b_recap_compare", "map.all", 6000],
  ["09_check", "hinge.check", 9000],
  ["elbow_000", "hinge.flexion", 1000],
  ["elbow_045", "hinge.flexion", 5000],
  ["elbow_090", "hinge.flexion", 9000],
  ["elbow_145", "hinge.extension", 4000],
];

test("film visual QA: deterministic frames for every chapter and the elbow poses", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });
  const log = trackConsole(page);
  await openFilm(page);
  const rows = [];
  for (const [name, shotId, offset] of CAPTURES) {
    await film(page, "seekShot", shotId, offset);
    await settle(page);
    await page.waitForTimeout(950); // caption fade-in (CSS)
    await settle(page);
    const file = join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    const labels = await page.evaluate(() => (window as any).__jointsQA.labels());
    let overlaps = 0;
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      if (a.left < b.left + b.w && b.left < a.left + a.w && a.top < b.top + b.h && b.top < a.top + a.h) overlaps++;
    }
    const state = await film<any>(page, "state");
    rows.push({ name, shotId, offset, flexion: await page.evaluate(() => (window as any).__jointsQA.getDof("flexion")), labels: labels.length, overlaps, chapter: state.chapterId, concepts: await film(page, "concepts"), body: await page.evaluate(() => { const b = (window as any).__jointsFilm.body(); return { visible: b.visible, shell: b.shell, highlighted: b.highlighted.length, handedOver: b.handedOver.length }; }), jointVisible: (await film<string[]>(page, "jointVisible")).length });
  }
  writeFileSync(join(ROOT, "qa", "reports", `${STEP}.film_visual.json`), JSON.stringify({ generatedAt: new Date().toISOString(), viewport: page.viewportSize(), rows, consoleErrors: log.errors }, null, 1));
  expect(log.errors).toEqual([]);
});
