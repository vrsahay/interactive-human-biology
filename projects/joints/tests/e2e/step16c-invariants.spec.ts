import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

/**
 * Step 16C invariants.
 *
 * Two learner-facing defects were found by hand and traced to their causes in `qa/step16c/explore-root-cause.md` and
 * `qa/step16c/audio-root-cause.md`:
 *
 *  - a drag inside an exploration was consumed twice - once by the exploration and once by OrbitControls - so the
 *    camera swung around the body while the target rotated, which reads as "the whole skeleton moved";
 *  - a 60 Hz drift corrector re-seeked the narration clip faster than a seek could complete, pinning it at zero, and
 *    nothing arbitrated between the shot clip and an exploration cue, so both spoke at once.
 *
 * These tests are the invariants that keep both fixed. Each is written so that it fails if the defect returns.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};
const lesson = JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8")) as Lesson;

interface Explore { exploreId: string; chapterId: string; status: string; openAtShotId?: string; motion: { kind: string; groups: string[] } }
interface Lesson { chapters: { id: string; shots: { id: string; durationMs: number }[] }[]; explores: Explore[] }

/** World transform tolerance. Anything a learner could see is orders of magnitude larger. */
const TOL = 1e-4;

type GroupState = Record<string, { matrixWorld: number[]; bbox: [number, number, number, number, number, number] | null }>;
type Narration = { paused: boolean; cuePlaying: boolean; owner: string; owners: number; shot: string; cue: string; src: string; currentTime: number; duration: number };

const groupState = (page: Page) => film<GroupState>(page, "bodyGroupWorldState");
const camera = (page: Page) => film<{ position: number[]; target: number[] }>(page, "camera");
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Every group whose world matrix or world bounding box changed by more than the tolerance. */
function movedGroups(before: GroupState, after: GroupState): { groupId: string; dMatrix: number; dBox: number }[] {
  const out: { groupId: string; dMatrix: number; dBox: number }[] = [];
  for (const [groupId, b] of Object.entries(before)) {
    const a = after[groupId];
    if (!a) continue;
    const dMatrix = Math.max(...b.matrixWorld.map((v, i) => Math.abs(v - a.matrixWorld[i])));
    const dBox = b.bbox && a.bbox ? Math.max(...b.bbox.map((v, i) => Math.abs(v - a.bbox![i]))) : 0;
    if (dMatrix > TOL || dBox > TOL) out.push({ groupId, dMatrix: +dMatrix.toFixed(6), dBox: +dBox.toFixed(6) });
  }
  return out;
}

/** Open an exploration the way a learner does - from the button - and confirm the session is really live. */
async function openFromButton(page: Page, e: Explore): Promise<void> {
  const chapter = lesson.chapters.find((c) => c.id === e.chapterId)!;
  // a beat before any handover, so the button is what opens it
  await film(page, "seekShot", chapter.shots[1].id, 600);
  await film(page, "pause");
  await settle(page);
  if (!(await page.getByTestId("film-explore-panel").count())) await page.getByTestId("film-explore").click();
  await expect(page.getByTestId("film-explore-panel")).toBeVisible({ timeout: 20_000 });
  await settle(page);
  expect(await film(page, "exploreState"), `${e.exploreId}: the session must be live before the drag`).not.toBeNull();
}

/** A learner's drag across the stage. */
async function dragStage(page: Page, dx: number, dy: number): Promise<void> {
  await page.mouse.move(700, 380);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(700 + (dx * i) / 20, 380 + (dy * i) / 20);
  await page.mouse.up();
}

const settleP = (page: Page) => settle(page);

test.describe("Step 16C invariants", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step16c.invariants.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("A1. only declared target groups move when a learner drags inside an exploration", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const e of lesson.explores) {
      await openFromButton(page, e);
      const before = await groupState(page);
      const camBefore = await camera(page);
      await dragStage(page, -180, 70);
      await settleP(page);
      const after = await groupState(page);
      const camAfter = await camera(page);
      const session = await film<{ displacedGroups: string[] } | null>(page, "exploreState");
      const declared = new Set(session?.displacedGroups ?? []);
      const moved = movedGroups(before, after);
      const unexpected = moved.filter((m) => !declared.has(m.groupId));
      rows.push({
        exploreId: e.exploreId,
        status: e.status,
        groupsMeasured: Object.keys(before).length,
        declared: [...declared],
        moved: moved.map((m) => m.groupId),
        unexpected: unexpected.map((m) => m.groupId),
        cameraMoved: +dist(camBefore.position, camAfter.position).toFixed(6),
        targetMoved: +dist(camBefore.target, camAfter.target).toFixed(6),
      });

      // INVARIANT A: nothing outside the declared targets may change world transform.
      expect(unexpected, `${e.exploreId}: context anatomy moved: ${unexpected.map((m) => `${m.groupId} (dBox ${m.dBox})`).join(", ")}`).toEqual([]);
      // and the camera must not orbit: that is what made the whole body appear to move
      expect(dist(camBefore.position, camAfter.position), `${e.exploreId}: the camera orbited during a learner drag`).toBeLessThan(1e-4);
      expect(dist(camBefore.target, camAfter.target), `${e.exploreId}: the camera target moved during a learner drag`).toBeLessThan(1e-4);
      expect(await film<boolean>(page, "orbitEnabled"), `${e.exploreId}: orbit must be locked while the exploration is open`).toBe(false);

      await page.getByTestId("film-explore-exit").click();
      await film(page, "pause");
      await settleP(page);
      // and released again the moment the lesson takes the pointer back
      expect(await film<boolean>(page, "orbitEnabled"), "orbit must be released when the exploration closes").toBe(true);
    }
    report.exploreIsolation = rows;
    expect(log.errors).toEqual([]);
  });

  test("A2. the teaching target really does move, and the context bones keep their exact world box", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const e of lesson.explores.filter((x) => x.motion.kind !== "dof")) {
      await openFromButton(page, e);
      const before = await groupState(page);
      // drive the motion through the session itself, so this test is about the transform model rather than the pointer
      await film(page, "exploreStep", -6, 0);
      await film(page, "exploreStep", -6, 0);
      await film(page, "exploreStep", -6, 0);
      await film(page, "exploreStep", 0, 6);
      await settleP(page);
      const after = await groupState(page);
      const moved = movedGroups(before, after);
      const declared = new Set(e.motion.groups);
      // the target moved
      expect(moved.length, `${e.exploreId}: nothing moved at all`).toBeGreaterThan(0);
      for (const m of moved) expect(declared.has(m.groupId), `${e.exploreId}: ${m.groupId} is not a declared target`).toBe(true);
      // every other group is byte-for-byte where it was
      const untouched = Object.keys(before).filter((g) => !declared.has(g));
      expect(untouched.length, "there must be context to keep still").toBeGreaterThan(20);
      for (const g of untouched) {
        const dMatrix = Math.max(...before[g].matrixWorld.map((v, i) => Math.abs(v - after[g].matrixWorld[i])));
        expect(dMatrix, `${e.exploreId}: ${g} moved`).toBeLessThan(TOL);
      }
      rows.push({ exploreId: e.exploreId, targetsMoved: moved.map((m) => m.groupId), contextGroupsHeldStill: untouched.length });
      await page.getByTestId("film-explore-exit").click();
      await film(page, "pause");
      await settleP(page);
    }
    report.targetMoves = rows;
    expect(log.errors).toEqual([]);
  });

  test("A3. the named context anatomy of the shoulder exploration never moves", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    const ball = lesson.explores.find((e) => e.exploreId === "explore.ball")!;
    await openFromButton(page, ball);
    // the structures the brief names: torso, spine, opposite arm, head, pelvis
    const CONTEXT = ["body.sternum", "body.scapula_right", "body.humerus_left", "body.frontal_bone", "body.mandible", "body.hip_bone_right", "body.femur_right", "body.atlas_c1"];
    const groupOf = await film<Record<string, string>>(page, "groupOfStructure", CONTEXT);
    const before = await groupState(page);
    await dragStage(page, -200, 90);
    await film(page, "exploreStep", -10, 6);
    await settleP(page);
    const after = await groupState(page);
    const rows: Record<string, number> = {};
    const offenders: string[] = [];
    for (const id of CONTEXT) {
      const g = groupOf[id];
      if (!g || !before[g]) continue;
      const dBox = Math.max(...before[g].bbox!.map((v, i) => Math.abs(v - after[g].bbox![i])));
      rows[id] = +dBox.toFixed(6);
      if (dBox > TOL) offenders.push(`${id} (${g}) moved ${dBox}`);
    }
    expect(offenders, "the torso, spine, opposite arm, head and pelvis must not move with the arm").toEqual([]);
    report.shoulderContext = rows;
    expect(log.errors).toEqual([]);
  });

  test("B. at most one narration owner is ever active", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seek", 0);
    await settleP(page);
    await page.evaluate(() => {
      const w = window as unknown as { __own: number[]; __ownOn: boolean; __jointsFilm: { narration: () => Narration } };
      w.__own = [];
      w.__ownOn = true;
      const tick = () => {
        if (!w.__ownOn) return;
        w.__own.push(w.__jointsFilm.narration().owners);
        setTimeout(tick, 20);
      };
      tick();
    });
    await film(page, "play");
    // play through the first exploration handover, which is where the two voices used to overlap
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000);
      if (await page.getByTestId("film-explore-exit").count()) await page.getByTestId("film-explore-exit").click();
    }
    await film(page, "pause");
    const owners = await page.evaluate(() => {
      const w = window as unknown as { __own: number[]; __ownOn: boolean };
      w.__ownOn = false;
      return w.__own;
    });
    const worst = Math.max(...owners);
    report.audioOwnership = { samples: owners.length, maxSimultaneousOwners: worst, overlapSamples: owners.filter((n) => n > 1).length };
    expect(owners.length, "the sampler must have run").toBeGreaterThan(1000);
    expect(worst, "two narration owners were audible at once").toBeLessThanOrEqual(1);
    expect(log.errors).toEqual([]);
  });

  test("E. entering and leaving an exploration leaves no stale narration", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    const ball = lesson.explores.find((e) => e.exploreId === "explore.ball")!;
    await openFromButton(page, ball);
    await page.waitForTimeout(400);
    const inside = await film<Narration>(page, "narration");
    // the film's own clip is silent and the cue owns the floor
    expect(inside.paused, "the shot clip must be silent inside an exploration").toBe(true);
    expect(inside.owner === "cue" || inside.owner === "none", `owner was ${inside.owner}`).toBe(true);
    expect(inside.owners, "one owner at most").toBeLessThanOrEqual(1);

    await page.getByTestId("film-explore-exit").click();
    await film(page, "pause");
    await settleP(page);
    const outside = await film<Narration>(page, "narration");
    expect(outside.cuePlaying, "the exploration cue must stop when the learner returns").toBe(false);
    expect(outside.owners).toBeLessThanOrEqual(1);
    report.exploreAudio = { inside: { owner: inside.owner, paused: inside.paused }, outside: { owner: outside.owner, cuePlaying: outside.cuePlaying } };
    expect(log.errors).toEqual([]);
  });

  test("C. caption, visual and narration all resolve from the same lesson time", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const entries = await film<{ id: string; startMs: number; endMs: number }[]>(page, "entries");
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
    const cases: { name: string; ms: number }[] = [
      { name: "inside the same shot", ms: byId["fixed.bones"].startMs + 1500 },
      { name: "into another shot", ms: byId["pivot.rotate"].startMs + 2000 },
      { name: "across chapters", ms: byId["hinge.axis"].startMs + 1500 },
      { name: "exactly on a chapter boundary", ms: byId["compare.pullback"].startMs },
      { name: "one millisecond before a boundary", ms: byId["compare.pullback"].startMs - 1 },
      { name: "the end of the lesson", ms: entries.at(-1)!.endMs },
    ];
    const rows: Record<string, unknown>[] = [];
    for (const c of cases) {
      await film(page, "seek", c.ms);
      await settleP(page);
      await page.waitForTimeout(250);
      const state = await film<{ shotId: string; localMs: number; ended: boolean }>(page, "state");
      const n = await film<Narration>(page, "narration");
      // the completion card replaces the caption, so ask only when one is on screen (a bare getAttribute waits for ever)
      const captionShot = (await page.getByTestId("film-caption").count()) ? await page.getByTestId("film-caption").getAttribute("data-shot") : null;
      const expectedSrc = `${state.shotId}.mp3`;
      rows.push({ case: c.name, seekMs: c.ms, shot: state.shotId, captionShot, clip: n.src, owners: n.owners, ended: state.ended });
      // the clip pointed at is this shot's clip - never the previous shot's
      if (n.src) expect(n.src, `${c.name}: the clip belongs to a different shot`).toBe(expectedSrc);
      // the caption on screen belongs to the same shot (the end card replaces the caption, so it may be absent there)
      if (captionShot) expect(captionShot, `${c.name}: the caption belongs to a different shot`).toBe(state.shotId);
      expect(n.owners, `${c.name}: more than one owner after a seek`).toBeLessThanOrEqual(1);
    }
    report.seekAgreement = rows;
    expect(log.errors).toEqual([]);
  });

  test("C2. chapter navigation leaves the right clip, caption and visual in place", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const [from, to] of [[2, 4], [4, 3], [5, 0], [0, 8]] as const) {
      await film(page, "seekChapter", from);
      await settleP(page);
      await film(page, "seekChapter", to);
      await settleP(page);
      await page.waitForTimeout(300);
      const state = await film<{ shotId: string; chapterIndex: number }>(page, "state");
      const n = await film<Narration>(page, "narration");
      // the completion card replaces the caption, so ask only when one is on screen (a bare getAttribute waits for ever)
      const captionShot = (await page.getByTestId("film-caption").count()) ? await page.getByTestId("film-caption").getAttribute("data-shot") : null;
      rows.push({ jump: `${from} -> ${to}`, chapterIndex: state.chapterIndex, shot: state.shotId, clip: n.src, owners: n.owners });
      expect(state.chapterIndex, `jump ${from} -> ${to}`).toBe(to);
      if (n.src) expect(n.src, `jump ${from} -> ${to}: stale clip`).toBe(`${state.shotId}.mp3`);
      if (captionShot) expect(captionShot).toBe(state.shotId);
      expect(n.owners).toBeLessThanOrEqual(1);
    }
    report.chapterNavigation = rows;
    expect(log.errors).toEqual([]);
  });

  test("D. lesson time and narration both follow the wall clock when frames are dropped", async ({ page }) => {
    test.setTimeout(300_000);
    const log = trackConsole(page);
    const rows: Record<string, unknown>[] = [];
    for (const fps of [15, 10, 5, 4]) {
      await openFilm(page);
      await film(page, "seekShot", "hinge.flexion", 400);
      await settleP(page);
      await page.evaluate((interval) => {
        (window as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame = (cb: FrameRequestCallback) =>
          window.setTimeout(() => cb(performance.now()), interval);
      }, Math.round(1000 / fps));
      await film(page, "play");
      const measured = await page.evaluate(() => new Promise<{ film: number; wall: number; clip: number }>((resolve) => {
        const w = window as unknown as { __jointsFilm: { state: () => { timeMs: number; localMs: number }; narration: () => { currentTime: number } } };
        requestAnimationFrame(() => {
          const f0 = w.__jointsFilm.state().timeMs;
          const c0 = w.__jointsFilm.narration().currentTime;
          const t0 = performance.now();
          setTimeout(() => requestAnimationFrame(() => resolve({ film: w.__jointsFilm.state().timeMs - f0, wall: performance.now() - t0, clip: w.__jointsFilm.narration().currentTime - c0 })), 5000);
        });
      }));
      await film(page, "pause");
      const lessonRatio = measured.film / measured.wall;
      const narrationRatio = measured.clip / (measured.film / 1000);
      rows.push({ fps, lessonMs: Math.round(measured.film), wallMs: Math.round(measured.wall), clipAdvancedS: +measured.clip.toFixed(2), lessonRatio: +lessonRatio.toFixed(3), narrationVsLesson: +narrationRatio.toFixed(3) });
      // INVARIANT D: dropped frames cost frames, not lesson time
      expect(lessonRatio, `at ${fps} fps the lesson ran at ${lessonRatio.toFixed(2)}x wall clock`).toBeGreaterThan(0.85);
      expect(lessonRatio).toBeLessThan(1.15);
      // and narration advances with the lesson, not independently of it
      expect(narrationRatio, `at ${fps} fps narration advanced ${narrationRatio.toFixed(2)}x lesson time`).toBeGreaterThan(0.8);
      expect(narrationRatio).toBeLessThan(1.2);
    }
    report.frameDrop = rows;
    expect(log.errors).toEqual([]);
  });

  test("F. the validated elbow is untouched, and its exploration still drives the rig", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "hinge.flexion", 2000);
    await settleP(page);
    const joint = await qa<{ dofs: { id: string; min: number; max: number }[] }>(page, "joint");
    expect(joint.dofs).toHaveLength(1);
    expect(joint.dofs[0]).toMatchObject({ id: "flexion", min: 0, max: 145 });
    const angles: number[] = [];
    for (const deg of [0, 45, 90, 145]) {
      await qa(page, "setDof", "flexion", deg);
      await settleP(page);
      angles.push(await qa<number>(page, "getDof", "flexion"));
    }
    expect(angles).toEqual([0, 45, 90, 145]);

    const hinge = lesson.explores.find((e) => e.exploreId === "explore.hinge")!;
    await openFromButton(page, hinge);
    const state = await film<{ status: string; dofId: string | null; displacedGroups: string[] }>(page, "exploreState");
    expect(state.status).toBe("validated-rig");
    expect(state.dofId).toBe("flexion");
    expect(state.displacedGroups, "the validated rig must never displace a body group").toEqual([]);
    report.elbow = { dof: joint.dofs[0], poses: angles, exploreState: state };
    expect(log.errors).toEqual([]);
  });
});
