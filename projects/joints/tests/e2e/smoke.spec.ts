import { expect, test } from "@playwright/test";
import { openApp, qa, settle, trackConsole } from "./support";

test.describe("elbow vertical slice smoke", () => {
  test("application loads and the elbow appears", async ({ page }) => {
    const log = trackConsole(page);
    await openApp(page);
    const counts = await qa<{ structures: number; anchors: number; tiers: string[] }>(page, "counts");
    expect(counts.structures).toBe(30);
    expect(counts.anchors).toBe(13);
    expect(counts.tiers).toEqual(["core"]);
    const rig = await qa<{ controller: string; pivot: string }>(page, "rigNodes");
    expect(rig).toEqual({ controller: "controller", pivot: "pivot" });
    const perf = await qa<{ drawCalls: number; triangles: number }>(page, "perf");
    expect(perf.drawCalls).toBeGreaterThan(30);
    expect(perf.triangles).toBeGreaterThanOrEqual(19982);
    // Rendered pixels are not blank: sample the canvas for non-transparent anatomy pixels.
    const opaque = await page.evaluate(() => {
      const c = document.querySelector("canvas")!;
      const probe = document.createElement("canvas");
      probe.width = c.width;
      probe.height = c.height;
      const ctx = probe.getContext("2d")!;
      ctx.drawImage(c, 0, 0);
      const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
      let n = 0;
      for (let i = 3; i < data.length; i += 16) if (data[i] > 200) n++;
      return n;
    });
    expect(opaque).toBeGreaterThan(2000);
    await expect(page.getByTestId("angle-readout")).toHaveText("0°");
    expect(log.errors).toEqual([]);
  });

  test("slider (keyboard + pointer) changes pose, 90° is reached, reset returns to 0°", async ({ page }) => {
    const log = trackConsole(page);
    await openApp(page);
    const slider = page.getByRole("slider", { name: "Elbow flexion" });
    await expect(slider).toHaveAttribute("aria-valuemin", "0");
    await expect(slider).toHaveAttribute("aria-valuemax", "145");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    expect(await qa(page, "getDof", "flexion")).toBe(1);
    await page.keyboard.press("Shift+ArrowRight");
    expect(await qa(page, "getDof", "flexion")).toBe(11);
    await page.keyboard.press("PageUp");
    expect(await qa(page, "getDof", "flexion")).toBe(26);
    await page.keyboard.press("PageDown");
    await page.keyboard.press("ArrowLeft");
    expect(await qa(page, "getDof", "flexion")).toBe(10);
    await page.keyboard.press("End");
    expect(await qa(page, "getDof", "flexion")).toBe(145);
    await expect(page.getByTestId("angle-readout")).toHaveText("145°");
    await page.keyboard.press("ArrowRight");
    expect(await qa(page, "getDof", "flexion")).toBe(145);
    await page.keyboard.press("Home");
    expect(await qa(page, "getDof", "flexion")).toBe(0);
    await page.keyboard.press("ArrowLeft");
    expect(await qa(page, "getDof", "flexion")).toBe(0);

    // Pointer on the track: middle of the track ~ 72.5°
    const track = page.locator(".dof-slider__track");
    const box = (await track.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    const mid = await qa<number>(page, "getDof", "flexion");
    expect(mid).toBeGreaterThan(68);
    expect(mid).toBeLessThan(77);

    await page.getByTestId("preset-90").click();
    await page.waitForFunction(() => (window as any).__jointsQA.getDof("flexion") === 90);
    await expect(page.getByTestId("angle-readout")).toHaveText("90°");
    await expect(slider).toHaveAttribute("aria-valuenow", "90");

    await page.getByTestId("reset-pose").click();
    await page.waitForFunction(() => (window as any).__jointsQA.getDof("flexion") === 0);
    await expect(page.getByTestId("angle-readout")).toHaveText("0°");
    expect(log.errors).toEqual([]);
  });

  test("dragging the forearm bends the elbow (and does not orbit)", async ({ page }) => {
    const log = trackConsole(page);
    await openApp(page);
    await qa(page, "view", "closeUp", true);
    await settle(page);
    const camBefore = await page.evaluate(() => (window as any).__jointsQA.project([-0.2213899940252304, 1.1033600568771362, -0.03483999893069267]));
    const start = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "ulna_r", true);
    expect(start, "a visible, pickable ulna point").not.toBeNull();
    const pivot = camBefore as { x: number; y: number };
    // Move perpendicular to the pivot->grab vector, towards the projected flexion travel direction.
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
    await page.mouse.move(start!.x, start!.y);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(start!.x + travel.x * i * 8, start!.y + travel.y * i * 8);
    const during = await qa<number>(page, "getDof", "flexion");
    await page.mouse.up();
    await settle(page);
    expect(during).toBeGreaterThan(15);
    const pivotAfter = await page.evaluate(() => (window as any).__jointsQA.project([-0.2213899940252304, 1.1033600568771362, -0.03483999893069267]));
    // Camera did not orbit during the joint drag: the pivot projects to the same pixel.
    expect(Math.hypot((pivotAfter as any).x - pivot.x, (pivotAfter as any).y - pivot.y)).toBeLessThan(0.5);
    await expect(page.getByTestId("angle-readout")).toHaveText(`${Math.round(await qa<number>(page, "getDof", "flexion"))}°`);

    // Drag back past extension clamps at 0.
    const back = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "ulna_r", true);
    await page.mouse.move(back!.x, back!.y);
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) await page.mouse.move(back!.x - travel.x * i * 10, back!.y - travel.y * i * 10);
    await page.mouse.up();
    expect(await qa<number>(page, "getDof", "flexion")).toBeGreaterThanOrEqual(0);
    expect(await qa<number>(page, "getDof", "flexion")).toBeLessThan(during);
    expect(log.errors).toEqual([]);
  });

  test("dragging a stationary structure orbits the camera (distinct mode) and never changes the pose", async ({ page }) => {
    const log = trackConsole(page);
    await openApp(page);
    await qa(page, "setDof", "flexion", 40);
    await qa(page, "view", "closeUp", true);
    await settle(page);
    const start = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "humerus_r", true);
    expect(start).not.toBeNull();
    const before = await page.evaluate(() => (window as any).__jointsQA.anchorScreen("elbow_r.anchor.olecranon"));
    await page.mouse.move(start!.x, start!.y);
    await page.mouse.down();
    for (let i = 1; i <= 15; i++) await page.mouse.move(start!.x + i * 12, start!.y);
    await page.mouse.up();
    await settle(page);
    const after = await page.evaluate(() => (window as any).__jointsQA.anchorScreen("elbow_r.anchor.olecranon"));
    expect(await qa(page, "getDof", "flexion")).toBe(40);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(5);
    expect(log.errors).toEqual([]);
  });

  test("structures can be selected by click (structureId, pose preserved)", async ({ page }) => {
    const log = trackConsole(page);
    await openApp(page);
    await qa(page, "setDof", "flexion", 60);
    await qa(page, "view", "closeUp", true);
    await settle(page);
    for (const id of ["humerus_r", "radius_r", "ulna_r"]) {
      const p = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", id, false);
      expect(p, id).not.toBeNull();
      await page.mouse.click(p!.x, p!.y);
      await expect(page.getByTestId("selection")).toHaveAttribute("data-structure-id", id);
      expect(await qa(page, "getDof", "flexion")).toBe(60);
    }
    await qa(page, "view", "overview", true);
    await settle(page);
    const hand = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "metacarpal_3_r", false);
    expect(hand).not.toBeNull();
    await page.mouse.click(hand!.x, hand!.y);
    await expect(page.getByTestId("selection")).toHaveAttribute("data-structure-id", "metacarpal_3_r");
    expect(await qa(page, "selection")).toBe("metacarpal_3_r");
    await expect(page.locator('.label[data-label-id="selection"]')).toBeVisible();
    expect(await qa(page, "getDof", "flexion")).toBe(60);
    expect(log.errors).toEqual([]);
  });

  test("camera presets and reduced-motion cut transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const log = trackConsole(page);
    await openApp(page);
    const pivot: [number, number, number] = [-0.2213899940252304, 1.1033600568771362, -0.03483999893069267];
    await page.getByTestId("view-closeUp").click();
    // Reduced motion: the camera cuts, so the very next frame is already the close-up (pivot at screen centre of the stage).
    const p = await page.evaluate((pv) => (window as any).__jointsQA.project(pv), pivot);
    const stage = (await page.getByTestId("stage").boundingBox())!;
    expect(Math.abs(p.x - (stage.x + stage.width / 2))).toBeLessThan(2);
    expect(Math.abs(p.y - (stage.y + stage.height / 2))).toBeLessThan(2);
    await page.getByTestId("view-reset").click();
    const q = await page.evaluate((pv) => (window as any).__jointsQA.project(pv), pivot);
    expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeGreaterThan(5);
    expect(log.errors).toEqual([]);
  });
});
