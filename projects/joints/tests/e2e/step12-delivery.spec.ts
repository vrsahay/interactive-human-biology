import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
type Delivery = { tier: string; groups: number; stages: { stageId: string; status: string }[] };

/** Open the film recording every asset request (path only). */
async function openRecording(page: Page, query: string) {
  const requests: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/assets/")) requests.push(u.pathname);
  });
  await page.goto(`/?qa=1&dpr=1&autoplay=0${query}`);
  await page.waitForFunction(() => (window as any).__jointsFilm || document.querySelector("[data-testid=error]"), null, { timeout: 90_000 });
  expect(await page.locator("[data-testid=error]").count()).toBe(0);
  await settle(page);
  return requests;
}
const delivery = (page: Page) => film<Delivery>(page, "bodyDelivery");
const waitStages = (page: Page) => page.waitForFunction(() => (window as any).__jointsFilm.bodyDelivery().stages.every((s: { status: string }) => s.status === "ready" || s.status === "applied"), null, { timeout: 60_000 });
const report: Record<string, unknown> = {};

test.describe("Step 12 delivery: quality tiers, lazy loading, handover", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step12.delivery_e2e.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  for (const tier of ["high", "medium", "low"] as const) {
    test(`tier ${tier}: selected before the body download, only its files are requested, elbow deferred`, async ({ page }) => {
      const log = trackConsole(page);
      const requests = await openRecording(page, `&quality=${tier}`);
      const manifest = await page.evaluate(() => fetch("/assets/body/v3/body-delivery.json").then((r) => r.json()));
      expect(await page.evaluate(() => document.documentElement.dataset.quality)).toBe(tier);
      expect((await delivery(page)).tier).toBe(tier);
      // the close-up stage is preloaded right after start (fixed.travel is within the 30 s lookahead)
      await waitStages(page);
      const expected = manifest.tiers[tier].stages.flatMap((s: { files: string[] }) => s.files.map((f: string) => `/assets/body/v3/${manifest.files[f].url}`)).sort();
      const bodyFiles = [...new Set(requests.filter((r) => r.startsWith("/assets/body/") && r.endsWith(".glb")))].sort();
      expect(bodyFiles).toEqual(expected);
      expect(requests.filter((r) => /\/assets\/body\/body\.(skeleton|skin)\.glb$/.test(r))).toEqual([]); // Step-11 files never requested
      expect(requests.filter((r) => r.includes("/joints/elbow_r/") && r.endsWith(".glb"))).toEqual([]); // elbow not needed at the intro
      expect(requests).toContain("/assets/shared/body-materials.glb");
      expect(requests.filter((r) => r.includes("/env/")).sort()).toEqual(["/assets/shared/env/environment.json", "/assets/shared/env/room_env_cubeuv_64.rgbe"]);
      expect(await film(page, "manifestValidation")).toBe("build-pinned");
      // first frame = the delivery-only proxy (2 body meshes); the grouped representation replaces it at a cut
      expect((await delivery(page)).groups).toBe(2);
      await film(page, "seekShot", "intro.map", 1000);
      await settle(page);
      const d = await delivery(page);
      expect(d.groups).toBe(manifest.groups.length);
      report[`tier_${tier}`] = { bodyFiles, requests: [...new Set(requests)], groups: d.groups };
      expect(log.errors).toEqual([]);
    });
  }

  test("the elbow asset loads when the film needs it (seek buffers, then reconstructs); the context tier is never requested", async ({ page }) => {
    const log = trackConsole(page);
    const requests = await openRecording(page, "&quality=medium");
    expect(await film(page, "jointAttached")).toBe(false);
    await film(page, "seekShot", "hinge.bones", 2000);
    const buffering = (await film<{ buffering: boolean }>(page, "state")).buffering;
    await settle(page);
    expect(await film(page, "jointAttached")).toBe(true);
    const joint = await film<string[]>(page, "jointVisible");
    expect(joint).toEqual(expect.arrayContaining(["humerus_r", "radius_r", "ulna_r"]));
    await film(page, "seekShot", "hinge.support", 6000);
    await settle(page);
    const elbow = [...new Set(requests.filter((r) => r.includes("/joints/elbow_r/")))].sort();
    expect(elbow).toEqual(["/assets/joints/elbow_r/elbow_r.core.glb", "/assets/joints/elbow_r/elbow_r.detail.glb", "/assets/joints/elbow_r/joint-manifest.json"]);
    report.lazyJoint = { bufferedOnSeek: buffering, elbowRequests: elbow };
    expect(log.errors).toEqual([]);
  });

  test("learner intent preloads a chapter: focusing the hinge marker fetches the elbow before the jump", async ({ page }) => {
    const requests = await openRecording(page, "&quality=medium");
    await page.getByTestId("film-chapter-hinge").focus();
    await expect.poll(() => requests.some((r) => r.endsWith("elbow_r.core.glb")), { timeout: 20_000 }).toBe(true);
    await page.waitForFunction(() => (window as any).__jointsFilm.jointAttached(), null, { timeout: 30_000 });
    await page.keyboard.press("Enter");
    await settle(page);
    expect((await film<{ buffering: boolean; chapterId: string }>(page, "state")).chapterId).toBe("hinge");
  });

  test("LOD upgrades are applied only on full-body framing or a cut (never inside a close-up)", async ({ page }) => {
    await openRecording(page, "&quality=high");
    await waitStages(page);
    // prepared, but not swapped in the middle of the title shot
    await page.waitForTimeout(1000);
    expect((await delivery(page)).groups).toBe(2);
    expect(await film(page, "bodyUpgrades")).toEqual([]);
    const entries = await film<{ id: string; endMs: number }[]>(page, "entries");
    await film(page, "seek", entries.find((e) => e.id === "intro.title")!.endMs - 400);
    await settle(page);
    await film(page, "play");
    await page.waitForFunction(() => (window as any).__jointsFilm.state().shotId === "hook.shoulder", null, { timeout: 15_000 });
    await film(page, "pause");
    const upgrades = await film<{ atShot: string | null; groups: number }[]>(page, "bodyUpgrades");
    const bodyShots = ["intro.title", "hook.question", "intro.map", "concept.different", "compare.pullback", "compare.together", "recall.open", "recall.challenge", "map.intro", "map.all", null];
    expect(upgrades.length).toBeGreaterThan(0);
    for (const u of upgrades) expect(bodyShots).toContain(u.atShot);
    report.upgrades = upgrades;
  });

  test("elbow handover is seamless: no duplicate bones, joint asset aligned with the body at the source pose", async ({ page }) => {
    const log = trackConsole(page);
    await openRecording(page, "&quality=high");
    await film(page, "seekShot", "hinge.bones", 3000);
    await settle(page);
    const body = await page.evaluate(() => (window as any).__jointsFilm.body());
    const handed: string[] = body.handedOver;
    for (const id of ["body.humerus_right", "body.radius_right", "body.ulna_right", "body.scaphoid_bone_right"]) expect(handed).toContain(id);
    // no body copy of a handed-over bone is visible while the joint asset shows it
    const visibleBody = await page.evaluate(() => (window as any).__jointsFilm.presentation("body.humerus_right"));
    expect(visibleBody).toBe("handedOver");
    const pairs = [["humerus_r", "body.humerus_right"], ["radius_r", "body.radius_right"], ["ulna_r", "body.ulna_right"], ["capitate_r", "body.capitate_bone_right"]];
    const deviations: Record<string, number> = {};
    for (const [jointId, bodyId] of pairs) {
      const j = await film<{ min: number[]; max: number[] }>(page, "jointBox", jointId);
      const b = await film<{ min: number[]; max: number[] }>(page, "bodyBox", bodyId);
      deviations[jointId] = Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(j.min[k] - b.min[k]), Math.abs(j.max[k] - b.max[k])])) * 1000;
    }
    report.handover = { pose: "sourcePose (13.625 deg)", bboxDeviationMm: deviations };
    for (const [id, mm] of Object.entries(deviations)) expect(mm, id).toBeLessThanOrEqual(2.0);
    // material look: joint asset and body use the same (deduplicated) tissue textures
    const tex = await film<{ gpuTextures: number; unique: number; deduplicated: number }>(page, "textures");
    expect(tex.deduplicated).toBeGreaterThan(0);
    report.textures = tex;
    expect(log.errors).toEqual([]);
  });

  test("labels skip layout when nothing moved on screen", async ({ page }) => {
    await openRecording(page, "&quality=high");
    await film(page, "seekShot", "map.all", 5000);
    await settle(page);
    const before = await film<{ layouts: number; skipped: number }>(page, "labelStats");
    for (let i = 0; i < 10; i++) await page.evaluate(() => (window as any).__jointsQA.renderNow());
    const after = await film<{ layouts: number; skipped: number }>(page, "labelStats");
    expect(after.skipped - before.skipped).toBeGreaterThanOrEqual(8);
    expect(after.layouts - before.layouts).toBeLessThanOrEqual(2);
    report.labelLayout = { renders: 10, layouts: after.layouts - before.layouts, skipped: after.skipped - before.skipped };
  });
});
