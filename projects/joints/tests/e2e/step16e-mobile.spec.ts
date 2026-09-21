import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, settle, trackConsole } from "./support";

/**
 * Step 16E: when an exploration asks the learner to move a joint, the learner can see that joint, it is not under the
 * card that asks, it is as prominent as in the reviewed desktop framing, and it takes the drag.
 *
 * The defect (`qa/step16e/mobile-overlap-analysis.md`): at 390 x 844 the panel and the player covered 68-78 % of the
 * screen, the composition reserved a fixed 40 %, and the old view offset silently changed the camera's aspect so the
 * framing stood 1.39x further back than it asked for. The target was 100 % covered in every exploration at 320-390 px.
 *
 * Definitions, fixed before any fix was measured against them:
 *  - target: the parts the learner moves (the exploration's declared render groups; for the validated elbow, the joint
 *    asset), projected to the screen;
 *  - interaction region: the target, inside the exploration's own framing circle (its framing sphere around the joint
 *    site, projected), inside the viewport. It is what the exploration is authored to show. A hand hanging beyond that
 *    radius is cropped off the bottom of the screen on desktop by the same framing, and is not part of it;
 *  - covered: the fraction of the interaction region's area under the panel. Threshold 2 %;
 *  - prominence: the region's longer side over the viewport's shorter side. It must be at least 0.8 x its value at
 *    1280 x 800, the framing that was reviewed.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const lesson = JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8")) as Lesson;
const locale = JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8")) as { strings: Record<string, { text: string; provenance: string }> };
const narration = JSON.parse(readFileSync(join(ROOT, "public/assets/audio/narration/narration.json"), "utf8")) as { shots: Record<string, { text: string; fits: boolean; speakingRate: number }> };
const report: Record<string, unknown> = {};

interface Explore { exploreId: string; chapterId: string; status: string; site: string; motion: { kind: string; groups: string[] } }
interface Lesson { chapters: { id: string; shots: { id: string }[] }[]; explores: Explore[] }
interface Rect { left: number; top: number; right: number; bottom: number }
interface Target extends Rect { region: Rect; framed: { x: number; y: number; radius: number }; grip: { x: number; y: number }; viewport: { width: number; height: number } }
type GroupState = Record<string, { matrixWorld: number[]; bbox: number[] | null }>;

const WIDTHS = [[320, 844], [360, 800], [390, 844], [412, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900]] as const;
const COVER_MAX = 0.02;
const PARITY_MIN = 0.8;
const TOL = 1e-4;

const area = (r: Rect) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
const overlap = (a: Rect, b: Rect) => area({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });
const prominence = (t: Target) => Math.max(t.region.right - t.region.left, t.region.bottom - t.region.top) / Math.min(t.viewport.width, t.viewport.height);

async function open(page: Page, e: Explore): Promise<void> {
  const chapter = lesson.chapters.find((c) => c.id === e.chapterId)!;
  await film(page, "seekShot", e.status === "validated-rig" ? "hinge.axis" : chapter.shots[1].id, 600);
  await film(page, "pause");
  await settle(page);
  if (!(await page.getByTestId("film-explore-panel").count())) await page.getByTestId("film-explore").click();
  await expect(page.getByTestId("film-explore-panel")).toBeVisible({ timeout: 20_000 });
  await settle(page);
  // the brisk explore move (1.1 s) must have landed before anything is measured
  await page.waitForFunction(() => { const c = (window as any).__jointsFilm.camera(); return c.mode === "guided"; });
  await page.waitForTimeout(1300);
  await page.mouse.move(1, 1);
}

async function close(page: Page): Promise<void> {
  await page.getByTestId("film-explore-exit").click();
  await film(page, "pause");
  await settle(page);
}

/** What the learner sees of the target right now, and what is drawn over it. */
async function measure(page: Page) {
  const target = await film<Target>(page, "exploreTarget");
  const dom = await page.evaluate(([gx, gy]) => {
    const vis = (el: Element) => { const s = getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0.05 && el.getBoundingClientRect().width > 1; };
    const r = (el: Element | null) => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; };
    const panel = document.querySelector('[data-testid="film-explore-panel"]')!;
    const hit = document.elementFromPoint(gx, gy);
    const labels = [...document.querySelectorAll(".label")].map((el) => ({ text: el.textContent!.trim(), r: el.getBoundingClientRect() })).filter((l) => l.r.width > 2 && l.text);
    const p = panel.getBoundingClientRect();
    const buttons = [...panel.querySelectorAll("button")].filter(vis).map((b) => b.getBoundingClientRect());
    const task = panel.querySelector('[data-testid="film-explore-task"]');
    return {
      panel: r(panel)!,
      gripHit: hit ? (hit.tagName === "CANVAS" ? "canvas" : hit.closest("[data-testid]")?.getAttribute("data-testid") ?? hit.tagName) : null,
      labelsBehind: labels.filter((l) => l.r.left < p.right && l.r.right > p.left && l.r.top < p.bottom && l.r.bottom > p.top).map((l) => l.text),
      labelsOff: labels.filter((l) => l.r.left < 0 || l.r.right > innerWidth || l.r.top < 0 || l.r.bottom > innerHeight).map((l) => l.text),
      smallestControl: buttons.length ? Math.min(...buttons.map((b) => Math.min(b.width, b.height))) : 0,
      controlsInView: buttons.every((b) => b.top >= 0 && b.bottom <= innerHeight + 0.5 && b.left >= 0 && b.right <= innerWidth + 0.5),
      task: task && vis(task) ? r(task) : null,
      draftBadges: [...document.querySelectorAll(".film-badge, [data-provenance-badge]")].filter(vis).length,
      hScroll: document.documentElement.scrollWidth > innerWidth,
    };
  }, [target.grip.x, target.grip.y]);
  const covered = overlap(target.region, dom.panel) / Math.max(1, area(target.region));
  return { target, ...dom, covered: +covered.toFixed(4), prominence: +prominence(target).toFixed(4) };
}

test.describe("Step 16E mobile explore visibility", () => {
  test.afterAll(() => writeFileSync(join(ROOT, `qa/reports/${process.env.QA_STEP ?? "step16e"}.mobile.json`), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("1,2,7,8,9. at every required width, every exploration's target is visible, clear of the panel and as prominent as the reviewed desktop framing", async ({ page }) => {
    test.setTimeout(600_000);
    const log = trackConsole(page);
    await openFilm(page);
    // the reviewed framing first: 1280 x 800
    const reference: Record<string, number> = {};
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const e of lesson.explores) {
      await open(page, e);
      reference[e.exploreId] = (await measure(page)).prominence;
      await close(page);
    }
    const rows: Record<string, unknown>[] = [];
    for (const [w, h] of WIDTHS) {
      await page.setViewportSize({ width: w, height: h });
      for (const e of lesson.explores) {
        await open(page, e);
        const m = await measure(page);
        const parity = +(m.prominence / reference[e.exploreId]).toFixed(3);
        rows.push({ width: w, height: h, explore: e.exploreId, covered: m.covered, parity, prominence: m.prominence, gripHit: m.gripHit, framedRadius: m.target.framed.radius, region: m.target.region, panel: m.panel, smallestControl: Math.round(m.smallestControl) });
        const at = `${w}x${h} ${e.exploreId}`;
        expect(area(m.target.region), `${at}: the target is not on screen at all`).toBeGreaterThan(0);
        expect(m.covered, `${at}: ${(m.covered * 100).toFixed(1)} % of the target is under the panel`).toBeLessThanOrEqual(COVER_MAX);
        expect(m.gripHit, `${at}: a pointer on the target reaches ${m.gripHit}, not the stage`).toBe("canvas");
        expect(parity, `${at}: the target is ${parity}x as prominent as at 1280x800`).toBeGreaterThanOrEqual(PARITY_MIN);
        expect(m.target.framed.radius * 2, `${at}: the framed region is squeezed`).toBeGreaterThanOrEqual(0.5 * Math.min(w, h));
        expect(m.labelsBehind, `${at}: a site label is behind the panel`).toEqual([]);
        expect(m.labelsOff, `${at}: a site label is off screen`).toEqual([]);
        expect(m.task, `${at}: the task is not readable`).not.toBeNull();
        expect(m.task!.bottom <= h && m.task!.top >= 0, `${at}: the task is off screen`).toBe(true);
        expect(m.smallestControl, `${at}: a panel control is below 44 px`).toBeGreaterThanOrEqual(44);
        expect(m.controlsInView, `${at}: a panel control is off screen`).toBe(true);
        expect(m.draftBadges, `${at}: a DRAFT badge is visible`).toBe(0);
        expect(m.hScroll, `${at}: horizontal scroll`).toBe(false);
        await close(page);
      }
    }
    report.visibility = { reference, rows, thresholds: { coverMax: COVER_MAX, parityMin: PARITY_MIN } };
    expect(log.errors).toEqual([]);
  });

  test("3,4,5,6. a real drag that starts on the target moves the target, and nothing else - before, during and after the task", async ({ page }) => {
    test.setTimeout(300_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const [w, h] of [[390, 844], [412, 844], [1280, 800]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const e of lesson.explores) {
        await open(page, e);
        const at = `${w}x${h} ${e.exploreId}`;
        const before = await measure(page);
        const groups0 = await film<GroupState>(page, "bodyGroupWorldState");
        const cam0 = await film<{ position: number[]; target: number[] }>(page, "camera");
        const state0 = await film<{ readout: { primary: number; secondary: number | null } }>(page, "exploreState");
        expect(await film(page, "orbitEnabled"), `${at}: orbit must be off while the exploration owns the pointer`).toBe(false);
        expect(before.gripHit, `${at}: the panel is over the grip point`).toBe("canvas");

        // the learner's gesture, starting on the target itself
        const { x, y } = before.target.grip;
        const dx = e.motion.kind === "dof" ? 0 : 60;
        const dy = e.motion.kind === "dof" ? -70 : e.motion.kind === "oneAxis" ? 0 : -40;
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let i = 1; i <= 16; i++) await page.mouse.move(x + (dx * i) / 16, y + (dy * i) / 16);
        const mid = await measure(page);
        const stateMid = await film<{ readout: { primary: number; secondary: number | null } }>(page, "exploreState");
        await page.mouse.up();

        // 3/4: the target took the drag (the fixed joint resists by design, so it only has to register the attempt)
        const moved = Math.abs(stateMid.readout.primary - state0.readout.primary) + Math.abs((stateMid.readout.secondary ?? 0) - (state0.readout.secondary ?? 0));
        expect(moved, `${at}: the drag did not reach the target`).toBeGreaterThan(e.motion.kind === "resist" ? 0.05 : 2);
        // 6: the camera did not orbit from the same gesture
        const cam1 = await film<{ position: number[]; target: number[] }>(page, "camera");
        const camMoved = Math.hypot(...cam0.position.map((v, i) => v - cam1.position[i]));
        expect(camMoved, `${at}: the camera moved with the drag`).toBeLessThan(TOL);
        // 5: only the declared groups moved
        const groups1 = await film<GroupState>(page, "bodyGroupWorldState");
        const unexpected = Object.keys(groups0).filter((g) => !e.motion.groups.includes(g) && groups1[g] && Math.max(...groups0[g].matrixWorld.map((v, i) => Math.abs(v - groups1[g].matrixWorld[i]))) > TOL);
        expect(unexpected, `${at}: context anatomy moved`).toEqual([]);
        // 2 while moving: still clear of the panel
        expect(mid.covered, `${at}: mid-movement, the target went under the panel`).toBeLessThanOrEqual(COVER_MAX);

        // completed: drive to the task goal from the keyboard, then look again
        for (let i = 0; i < 30; i++) await page.keyboard.press(e.motion.kind === "dof" ? "ArrowRight" : "ArrowLeft");
        if (e.motion.kind === "twoAxis") for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(300);
        const done = await measure(page);
        expect(done.covered, `${at}: at the end of the task, the target is under the panel`).toBeLessThanOrEqual(COVER_MAX);
        rows.push({ width: w, explore: e.exploreId, grip: before.target.grip, moved: +moved.toFixed(2), camMoved: +camMoved.toFixed(6), unexpected: unexpected.length, covered: { before: before.covered, mid: mid.covered, done: done.covered } });
        await close(page);
      }
    }
    report.pointer = rows;
    expect(log.errors).toEqual([]);
  });

  test("keyboard on a phone: focus goes into the panel when the player steps aside, and comes back to the opener", async ({ page }) => {
    const log = trackConsole(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFilm(page);
    const e = lesson.explores[0];
    const chapter = lesson.chapters.find((c) => c.id === e.chapterId)!;
    await film(page, "seekShot", chapter.shots[1].id, 600);
    await film(page, "pause");
    await settle(page);
    await page.getByTestId("film-explore").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("film-explore-panel")).toBeVisible();
    await settle(page);
    // the player (and the button that opened this) has stepped aside; focus must not be left on nothing
    await expect(page.locator(".film-player")).toBeHidden();
    const inPanel = await page.evaluate(() => !!document.activeElement?.closest('[data-testid="film-explore-panel"]'));
    expect(inPanel, "focus moved into the panel").toBe(true);
    // the task is announced once, on entry
    await expect(page.getByTestId("film-live")).toContainText(locale.strings["explore.fixed.task"].text);
    // Tab reaches the panel's own controls, in order
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("film-explore-reset")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("film-explore-exit")).toBeFocused();
    // Escape returns; the player comes back and focus goes back to the control that opened the exploration
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("film-explore-panel")).toHaveCount(0);
    await expect(page.locator(".film-player")).toBeVisible();
    await expect(page.getByTestId("film-explore")).toBeFocused();
    expect(log.errors).toEqual([]);
  });

  test("returning from an exploration on a phone restores the shot's framing exactly", async ({ page }) => {
    const log = trackConsole(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const e of lesson.explores) {
      const chapter = lesson.chapters.find((c) => c.id === e.chapterId)!;
      const shot = e.status === "validated-rig" ? "hinge.axis" : chapter.shots[1].id;
      await film(page, "seekShot", shot, 600);
      await film(page, "pause");
      await settle(page);
      const cam0 = await film<{ position: number[]; target: number[] }>(page, "camera");
      const c0 = await film<{ shift: number; lift: number }>(page, "compose");
      await open(page, e);
      await close(page);
      await film(page, "seekShot", shot, 600);
      await film(page, "pause");
      await settle(page);
      const cam1 = await film<{ position: number[]; target: number[] }>(page, "camera");
      const c1 = await film<{ shift: number; lift: number }>(page, "compose");
      const d = Math.hypot(...cam0.position.map((v, i) => v - cam1.position[i]));
      rows.push({ explore: e.exploreId, shot, cameraDelta: +d.toFixed(6), lift: [c0.lift, c1.lift] });
      expect(d, `${e.exploreId}: the shot's camera is not where it was`).toBeLessThan(1e-3);
      expect(c1.lift, `${e.exploreId}: the shot's composition is not restored`).toBeCloseTo(c0.lift, 4);
    }
    report.roundTrip = rows;
    expect(log.errors).toEqual([]);
  });

  test("10,11. the unsourced comparative claim is gone, and the line that replaced it is still marked for review", () => {
    const banned = /freest|more freedom than any|most mobile|widest range|than any other (joint|in the body)/i;
    const offenders = Object.entries(locale.strings).filter(([, v]) => banned.test(v.text)).map(([k]) => k);
    expect(offenders, "no learner-facing string makes the comparative claim").toEqual([]);
    for (const clip of Object.values(narration.shots)) expect(banned.test(clip.text), "no narration clip speaks it").toBe(false);
    const line = locale.strings["narr.ball.move"];
    expect(line.provenance, "the changed instructional line stays draft enrichment").toBe("draft-enrichment");
    expect(line.text).toMatch(/many directions/);
    // the clip says exactly the new line, at the natural rate, and fits its shot
    expect(narration.shots["ball.move"].text).toBe(line.text.trim());
    expect(narration.shots["ball.move"].speakingRate).toBe(1);
    expect(narration.shots["ball.move"].fits).toBe(true);
    // the draft layer underneath is intact
    const counts: Record<string, number> = {};
    for (const v of Object.values(locale.strings)) counts[v.provenance] = (counts[v.provenance] ?? 0) + 1;
    expect(counts["draft-enrichment"]).toBe(126);
    expect(counts["source-excerpt"]).toBe(1);
    report.content = { offenders, provenance: counts, replacement: line.text };
  });
});
