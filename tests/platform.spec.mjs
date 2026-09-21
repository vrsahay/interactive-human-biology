// Platform smoke tests. Module-specific behaviour is covered by each project's own test suite; these tests check the
// integration: routing, refresh, asset paths under each route, back navigation and the generated homepage.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(new URL("../dist/modules.json", import.meta.url), "utf8"));
const available = registry.filter((m) => m.status === "available");

/** Records failed requests and console errors for one page. */
function watch(page) {
  const problems = [];
  const assets = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (!/net::ERR_ABORTED/.test(r.failure()?.errorText ?? "")) problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => {
    const url = new URL(r.url());
    if (url.hostname === "localhost") assets.push({ path: url.pathname, status: r.status() });
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return { problems, assets };
}

test("homepage lists every module from the registry, with internal links", async ({ page }) => {
  const w = watch(page);
  await page.goto("/");
  await expect(page).toHaveTitle("Interactive Human Biology");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Interactive Human Biology");
  const cards = page.locator(".card[data-module]");
  await expect(cards).toHaveCount(registry.length);
  for (const m of available) {
    const link = page.locator(`.card[data-module="${m.id}"] a.card-link`);
    await expect(link).toHaveAttribute("href", m.url);
    await expect(link).toHaveText(m.title);
  }
  await page.waitForLoadState("networkidle");
  // card images and fonts resolve
  expect(await page.locator(".card img").evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Manrope"'))).toBe(true);
  expect(w.problems).toEqual([]);
});

for (const m of available) {
  test.describe(m.title, () => {
    test(`card opens ${m.url}; refresh and back navigation work`, async ({ page }) => {
      const w = watch(page);
      await page.goto("/");
      await page.locator(`.card[data-module="${m.id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${m.url}$`));
      await expect(page.locator("canvas").first()).toBeVisible();

      await page.reload();                                   // browser refresh on the module route
      await expect(page).toHaveURL(new RegExp(`${m.url}$`));
      await expect(page.locator("canvas").first()).toBeVisible();

      const back = page.locator("#hb-back");
      await expect(back).toBeVisible();
      await expect(back).toHaveAccessibleName("Back to Interactive Human Biology home");
      await back.click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Interactive Human Biology");
      await page.goBack();                                   // browser back returns to the module
      await expect(page).toHaveURL(new RegExp(`${m.url}$`));
      expect(w.problems).toEqual([]);
    });

    test(`direct navigation without trailing slash redirects to ${m.url}`, async ({ page }) => {
      const res = await page.goto(m.url.replace(/\/$/, ""));
      expect(res.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${m.url}$`));
    });
  });
}

test("Respiratory System: model, fonts and narration load; the lesson plays", async ({ page }) => {
  const w = watch(page);
  const glb = page.waitForResponse((r) => r.url().endsWith("/respiratory/respiratory_system.glb"));
  await page.goto("/respiratory/");
  expect((await glb).status()).toBe(200);
  const start = page.getByRole("button", { name: "Start lesson" });
  await expect(start).toBeVisible({ timeout: 150_000 });    // shown once the 63 MB model and narration are ready
  // "cloud" = Google TTS clips were fetched and decoded; otherwise the lesson fell back to the browser voice
  // (no GOOGLE_TTS_API_KEY at build time, or the key's HTTP-referrer restriction does not allow this origin).
  expect(await page.evaluate(() => window.lesson.speech.kind)).toBe("cloud");
  expect(await page.evaluate(() => window.lesson.speech.buffers.size)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.fonts.check('800 16px "Manrope"'))).toBe(true);
  await start.click();
  await page.waitForTimeout(4000);
  const t = await page.evaluate(() => window.lesson.player.T);
  expect(t).toBeGreaterThan(1000);                          // the timeline is advancing
  await page.keyboard.press("e");                           // Explore mode still works
  await expect(page.locator(".explore")).toBeVisible();
  expect(w.problems).toEqual([]);
  expect(w.assets.filter((a) => a.status >= 400)).toEqual([]);
});

test("Types of Joints: manifests, models, environment and narration load under /joints/", async ({ page }) => {
  const w = watch(page);
  await page.goto("/joints/?qa=1");
  await page.getByRole("button", { name: "Start lesson" }).click({ timeout: 150_000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.__jointsFilm.seekChapter(4));
  await page.waitForTimeout(6000);
  const paths = w.assets.map((a) => a.path);
  for (const needle of [".glb", "joint-manifest.json", "body-delivery.json", "environment.json", ".rgbe", "narration.json", ".mp3"]) {
    expect(paths.some((p) => p.includes(needle)), `a ${needle} request`).toBe(true);
  }
  expect(paths.filter((p) => !p.startsWith("/joints/"))).toEqual([]);   // nothing escapes the module's route
  expect(w.problems).toEqual([]);
});

test("unknown routes return the platform 404 page", async ({ page }) => {
  const res = await page.goto("/digestive/");
  expect(res.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("isn’t part of the body");
  await expect(page.getByRole("link", { name: "Go to the homepage" })).toBeVisible();
});

// The homepage is a single screen on desktops and laptops: intro and every module card visible without scrolling.
for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]]) {
  test(`homepage fits one screen at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
    for (const cta of await page.locator(".card-cta").all()) await expect(cta).toBeInViewport({ ratio: 1 });
  });
}

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("homepage fits a phone screen without horizontal scrolling", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const boxes = await page.locator(".card[data-module]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    for (const w of boxes) expect(w).toBeLessThanOrEqual(390 - 32 + 1);
  });
  for (const m of available) {
    test(`${m.title} back link is reachable on a phone`, async ({ page }) => {
      await page.goto(m.url);
      await expect(page.locator("#hb-back")).toBeInViewport();
    });
  }
});
