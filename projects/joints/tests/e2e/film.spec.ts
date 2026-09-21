import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole, type V3 } from "./support";

type FilmState = { timeMs: number; playing: boolean; ended: boolean; chapterId: string; shotId: string; localMs: number; learner: string; explore: boolean; holdingForCheck: boolean; check: { status: string }; seeks: number };
type BodyInfo = { visible: number; shell: boolean; handedOver: string[]; highlighted: string[] };

const state = (page: Page) => film<FilmState>(page, "state");
const body = (page: Page) => page.evaluate(() => { const b = (window as any).__jointsFilm.body(); return { visible: b.visible, shell: b.shell, handedOver: b.handedOver, highlighted: b.highlighted } as BodyInfo; });
const camera = (page: Page) => film<{ position: V3; target: V3; mode: string }>(page, "camera");
const camDistance = (c: { position: V3; target: V3 }) => Math.hypot(c.position[0] - c.target[0], c.position[1] - c.target[1], c.position[2] - c.target[2]);
const seekShot = async (page: Page, id: string, offset = 0) => {
  await film(page, "seekShot", id, offset);
  await settle(page);
};

test.describe("video-first lesson (default route)", () => {
  test("opens on the full-body intro with the title card, no joint asset, badges and chapter markers", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await expect(page.getByTestId("film")).toHaveAttribute("data-shot", "intro.title");
    const b = await body(page);
    expect(b.visible).toBeGreaterThan(250);
    expect(b.shell).toBe(true);
    expect(await film<string[]>(page, "jointVisible")).toEqual([]);
    await expect(page.getByTestId("film-caption").locator("h2")).toHaveText("Types of Joints");
    // Step 16D: the review-state marker lives in the teacher layer now; the classification is still on the element.
    await expect(page.getByTestId("film-caption").locator("[data-provenance=draft-enrichment]")).toHaveCount(1);
    await expect(page.getByTestId("film-caption").locator(".film-badge")).toHaveCount(0);
    for (const id of ["hook", "what_is_joint", "fixed", "pivot", "ball_socket", "hinge", "compare", "recall", "body_map"]) await expect(page.getByTestId(`film-chapter-${id}`)).toBeAttached();
    // full body framed: the camera sees the whole skeleton from far away
    expect(camDistance(await camera(page))).toBeGreaterThan(2);
    expect(log.errors).toEqual([]);
  });

  test("play / pause, and the camera travels across a shot boundary into the skull", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    const entries = await film<{ id: string; endMs: number }[]>(page, "entries");
    const mapEnd = entries.find((e) => e.id === "intro.map")!.endMs;
    await film(page, "seek", mapEnd - 400);
    await settle(page);
    const before = await camera(page);
    await page.getByTestId("film-play").click();
    await page.waitForFunction(() => (window as any).__jointsFilm.state().shotId === "fixed.travel", null, { timeout: 15_000 });
    await page.waitForTimeout(700);
    const mid = await camera(page);
    await page.getByTestId("film-play").click(); // pause
    const paused = await state(page);
    expect(paused.playing).toBe(false);
    await page.waitForTimeout(600);
    expect((await state(page)).timeMs).toBe(paused.timeMs);
    // Travelling: moved toward the skull but not a cut (still between the two framings).
    expect(camDistance(mid)).toBeLessThan(camDistance(before));
    await seekShot(page, "fixed.travel", 5900);
    const arrived = await camera(page);
    expect(camDistance(mid)).toBeGreaterThan(camDistance(arrived));
    expect(arrived.target[1]).toBeGreaterThan(1.55);
    expect(log.errors).toEqual([]);
  });

  test("chapter markers seek and reconstruct each section: fixed, pivot, ball-and-socket, hinge", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    const seeksBefore = (await state(page)).seeks;

    await page.getByTestId("film-chapter-fixed").click();
    await settle(page);
    await expect(page.getByTestId("film")).toHaveAttribute("data-chapter", "fixed");
    expect((await body(page)).highlighted).toEqual(expect.arrayContaining(["body.frontal_bone"]));
    expect(await film<string[]>(page, "jointVisible")).toEqual([]);

    await page.getByTestId("film-chapter-pivot").click();
    await seekShot(page, "pivot.rotate", 4000);
    await expect(page.getByTestId("film")).toHaveAttribute("data-chapter", "pivot");
    expect(await film<string[]>(page, "concepts")).toEqual(["pivot.upper_neck"]);
    expect((await body(page)).highlighted.join(" ")).toMatch(/atlas/);
    expect((await body(page)).highlighted.join(" ")).toMatch(/axis/);

    await page.getByTestId("film-chapter-ball_socket").click();
    await seekShot(page, "ball.move", 4000);
    expect(await film<string[]>(page, "concepts")).toEqual(["ball_socket.shoulder_right"]);
    expect((await body(page)).highlighted).toEqual(expect.arrayContaining(["body.humerus_right"]));
    await seekShot(page, "ball.bones", 4000);
    expect(await film<string[]>(page, "concepts")).toEqual([]);
    expect((await body(page)).highlighted).toEqual(expect.arrayContaining(["body.scapula_right"]));

    await page.getByTestId("film-chapter-hinge").click();
    await settle(page);
    await expect(page.getByTestId("film")).toHaveAttribute("data-chapter", "hinge");
    await seekShot(page, "hinge.source", 4000);
    await expect(page.getByTestId("film-caption").locator("p[data-provenance=source-excerpt]")).toContainText("The elbow bends and straightens in one direction, similar to a door hinge.");
    // Step 16D: the review-state marker moved to the teacher layer. The classification is still on the element.
    await expect(page.getByTestId("film-caption").locator(".film-badge")).toHaveCount(0);
    await seekShot(page, "hinge.bones", 3000);
    const joint = await film<string[]>(page, "jointVisible");
    expect(joint).toEqual(expect.arrayContaining(["humerus_r", "radius_r", "ulna_r"]));
    // the body hands the shared bones over to the validated joint asset (no duplicate anatomy)
    expect((await body(page)).handedOver).toEqual(expect.arrayContaining(["body.humerus_right", "body.radius_right", "body.ulna_right"]));
    await seekShot(page, "hinge.knee", 5000);
    expect(await film<string[]>(page, "concepts")).toEqual(["hinge.knee_right"]);
    expect(await film<string[]>(page, "jointVisible")).toEqual([]);

    expect((await state(page)).seeks).toBeGreaterThan(seeksBefore + 6);
    expect(log.errors).toEqual([]);
  });

  test("elbow hero: plays from 45° to 90°, extension reaches the approximate 145° and returns to 0°", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await seekShot(page, "hinge.flexion", 3800);
    expect(await qa<number>(page, "getDof", "flexion")).toBeCloseTo(45, 6);
    await film(page, "play");
    // played (not seeked) through the 90° key: wait until the film clock passes it
    await page.waitForFunction(() => { const s = (window as any).__jointsFilm.state(); return s.shotId === "hinge.flexion" && s.localMs >= 7850; }, null, { timeout: 15_000 });
    await film(page, "pause");
    expect(await qa<number>(page, "getDof", "flexion")).toBeCloseTo(90, 6);
    await expect(page.getByTestId("film-caption").locator("[data-text-key='hinge.flexion']")).toBeVisible();
    await seekShot(page, "hinge.extension", 3200);
    expect(await qa<number>(page, "getDof", "flexion")).toBeCloseTo(145, 6);
    await expect(page.getByTestId("film-caption").locator("[data-text-key='hinge.range_note']")).toContainText("approximate");
    await seekShot(page, "hinge.extension", 9300);
    expect(await qa<number>(page, "getDof", "flexion")).toBeCloseTo(0, 6);
    const labels = await qa<{ id: string }[]>(page, "labels");
    expect(labels.length).toBeLessThanOrEqual(5);
    expect(log.errors).toEqual([]);
  });

  test("compare and the body map return to the full body with all four joint types marked", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await seekShot(page, "hinge.bones", 3000);
    const elbow = await camera(page);
    await page.getByTestId("film-chapter-compare").click();
    await seekShot(page, "compare.pullback", 4000);
    await expect(page.getByTestId("film")).toHaveAttribute("data-chapter", "compare");
    expect(await film<string[]>(page, "jointVisible")).toEqual([]);
    expect((await body(page)).shell).toBe(true); // full-body silhouette on the pullback
    await seekShot(page, "map.all", 5000);
    expect(await film<string[]>(page, "jointVisible")).toEqual([]);
    const b = await body(page);
    expect(b.highlighted.length).toBeGreaterThan(10);
    expect(b.handedOver).toEqual([]);
    expect(b.visible).toBeGreaterThan(250);
    // Step 16B: the body map is a memory anchor, so it marks the four categories with labels rather than with four
    // indicators too small to read at full-body scale. The movement itself is shown in the four compare beats.
    expect(await film<string[]>(page, "concepts")).toEqual([]);
    const sites = await film<[string, string][]>(page, "siteLabels");
    expect(sites.map(([, t]) => t)).toEqual(expect.arrayContaining(["Fixed", "Pivot", "Ball and socket", "Hinge"]));
    expect(new Set(sites.map(([id]) => id.split(".")[0]))).toEqual(new Set(["fixed", "pivot", "ball_socket", "hinge"]));
    expect(camDistance(await camera(page))).toBeGreaterThan(Math.max(2, camDistance(elbow) * 3));
    expect(log.errors).toEqual([]);
  });

  test("timeline keyboard seeking, replay and reset", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    const scrub = page.getByTestId("film-scrubber");
    await scrub.focus();
    await page.keyboard.press("End");
    await settle(page);
    expect((await state(page)).chapterId).toBe("body_map");
    await page.keyboard.press("Home");
    expect((await state(page)).timeMs).toBe(0);
    await page.keyboard.press("Shift+ArrowRight");
    expect((await state(page)).timeMs).toBe(15000);
    await expect(scrub).toHaveAttribute("aria-valuenow", "15");
    await seekShot(page, "hinge.axis", 2000);
    await page.getByTestId("film-replay").click();
    await page.waitForFunction(() => (window as any).__jointsFilm.state().timeMs > 100, null, { timeout: 10_000 });
    const s = await state(page);
    expect(s).toMatchObject({ chapterId: "hook", playing: true });
    expect(s.timeMs).toBeLessThan(5000);
    await film(page, "reset");
    expect(await state(page)).toMatchObject({ timeMs: 0, playing: false, shotId: "intro.title" });
    expect(await film<string[]>(page, "jointVisible")).toEqual([]);
    expect(log.errors).toEqual([]);
  });

  test("hinge chapter: dragging the forearm pauses the film, bends the elbow, and the film resumes", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await seekShot(page, "hinge.try", 600);
    expect((await film<{ mode: string }>(page, "interaction")).mode).toBe("guided");
    await expect(page.getByTestId("film-interact")).toBeVisible();
    await film(page, "play");
    const start = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "ulna_r", true);
    expect(start, "a visible, pickable ulna point").not.toBeNull();
    const travel = await page.evaluate(() => {
      const q = (window as any).__jointsQA;
      const h = q.hinge();
      const a = q.project(h.pivot);
      const d = h.direction;
      const t = [h.axis[1] * d[2] - h.axis[2] * d[1], h.axis[2] * d[0] - h.axis[0] * d[2], h.axis[0] * d[1] - h.axis[1] * d[0]];
      const b = q.project([h.pivot[0] + t[0] * 0.05, h.pivot[1] + t[1] * 0.05, h.pivot[2] + t[2] * 0.05]);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    });
    const flexBefore = await qa<number>(page, "getDof", "flexion");
    await page.mouse.move(start!.x, start!.y);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(start!.x + travel.x * i * 8, start!.y + travel.y * i * 8);
    const held = await state(page);
    expect(held.learner).toBe("active");
    const flexDrag = await qa<number>(page, "getDof", "flexion");
    expect(Math.abs(flexDrag - flexBefore)).toBeGreaterThan(10);
    await page.waitForTimeout(1200);
    expect((await state(page)).timeMs).toBe(held.timeMs); // film clock held while the learner has the joint
    expect(await qa<number>(page, "getDof", "flexion")).toBeCloseTo(flexDrag, 6);
    await page.mouse.up();
    await expect(page.getByTestId("film-resume")).toBeVisible();
    // idle >= resumeAfterIdleMs -> blend back onto the film and continue
    await page.waitForFunction((t) => { const s = (window as any).__jointsFilm.state(); return s.learner === "none" && s.timeMs > t; }, held.timeMs, { timeout: 10_000 });
    expect((await state(page)).playing).toBe(true);
    // explicit resume works too - from the same guided beat, so the test does not depend on where playback reached
    await film(page, "pause");
    await seekShot(page, "hinge.try", 600);
    await film(page, "play");
    const again = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "ulna_r", true);
    await page.mouse.move(again!.x, again!.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(again!.x + travel.x * i * 8, again!.y + travel.y * i * 8);
    await page.mouse.up();
    expect((await state(page)).learner).toBe("active");
    await page.getByTestId("film-resume").click();
    await page.waitForFunction(() => (window as any).__jointsFilm.state().learner === "none", null, { timeout: 5_000 });
    await film(page, "pause");
    expect(log.errors).toEqual([]);
  });

  test("interactive check: bending to about 90° with the keyboard is confirmed, and the film goes on", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await seekShot(page, "hinge.check", 6000);
    const slider = page.getByTestId("film-interact").getByRole("slider");
    await slider.focus();
    await page.keyboard.press("Home");
    await page.getByTestId("film-check").click();
    await expect(page.getByTestId("film-check-feedback")).toHaveText("Not quite yet. Aim for about 90°.");
    await slider.focus(); // the check button took focus
    for (let i = 0; i < 6; i++) await page.keyboard.press("PageUp"); // page step 15°
    const v = await qa<number>(page, "getDof", "flexion");
    expect(Math.abs(v - 90)).toBeLessThanOrEqual(5);
    await page.getByTestId("film-check").click();
    await page.waitForFunction(() => (window as any).__jointsFilm.state().check.status === "correct", null, { timeout: 5_000 });
    // the check sits inside the hinge chapter now: it is confirmed on screen, and the lesson has more to show
    await expect(page.getByTestId("film-check-feedback")).toHaveText("That is about 90°. Well done.");
    expect((await state(page)).ended).toBe(false);
    await page.getByTestId("film-resume").click();
    await page.waitForFunction(() => (window as any).__jointsFilm.state().shotId !== "hinge.check", null, { timeout: 10_000 });
    expect(log.errors).toEqual([]);
  });

  test("reduced motion: shot boundaries cut, poses hold keyframes, captions do not animate", async ({ page }) => {
    const log = trackConsole(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openFilm(page);
    await seekShot(page, "hinge.flexion", 2600);
    expect(await qa<number>(page, "getDof", "flexion")).toBe(0);
    const entries = await film<{ id: string; startMs: number; endMs: number }[]>(page, "entries");
    await film(page, "seek", entries.find((e) => e.id === "ball.travel")!.endMs - 200);
    await settle(page);
    await film(page, "play");
    await page.waitForFunction(() => (window as any).__jointsFilm.state().shotId === "ball.bones", null, { timeout: 10_000 });
    const first = await camera(page);
    await page.waitForTimeout(500);
    const later = await camera(page);
    await film(page, "pause");
    // no travel and no in-shot dolly: the framing is already final
    expect(Math.hypot(first.position[0] - later.position[0], first.position[1] - later.position[1], first.position[2] - later.position[2])).toBeLessThan(1e-6);
    const transition = await page.getByTestId("film-caption").evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(transition.split(",").every((d) => parseFloat(d) <= 0.01)).toBe(true);
    expect(log.errors).toEqual([]);
  });

  test("mobile viewport: no horizontal scroll, controls reachable, subject centred", async ({ page }) => {
    const log = trackConsole(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFilm(page);
    await seekShot(page, "hinge.flexion", 9000);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByTestId("film-play")).toBeInViewport();
    await expect(page.getByTestId("film-scrubber")).toBeInViewport();
    const pivot = await page.evaluate(() => { const q = (window as any).__jointsQA; return q.project(q.hinge().pivot); });
    expect(pivot.x).toBeGreaterThan(60);
    expect(pivot.x).toBeLessThan(330);
    expect(log.errors).toEqual([]);
  });
});
