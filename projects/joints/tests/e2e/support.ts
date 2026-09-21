import { expect, type Page } from "@playwright/test";

export interface ConsoleLog {
  errors: string[];
  warnings: string[];
}

/** Collect console errors + uncaught page errors for the whole test. */
export function trackConsole(page: Page): ConsoleLog {
  const log: ConsoleLog = { errors: [], warnings: [] };
  page.on("console", (m) => {
    if (m.type() === "error") log.errors.push(m.text());
    if (m.type() === "warning") log.warnings.push(m.text());
  });
  page.on("pageerror", (e) => log.errors.push(`pageerror: ${e.message}`));
  return log;
}

/** Step-10 sandbox route. */
export async function openApp(page: Page, query = ""): Promise<void> {
  await page.goto(`/?mode=sandbox&qa=1&dpr=1${query}`);
  await page.waitForFunction(() => (window as any).__jointsQA?.status?.phase === "ready" || (window as any).__jointsQA?.status?.phase === "error", null, { timeout: 60_000 });
  const status = await page.evaluate(() => (window as any).__jointsQA.status);
  expect(status.phase, JSON.stringify(status)).toBe("ready");
  await settle(page);
}

/** Wait for the render-on-demand loop to go idle (no pending frames / tickers), then two more frames. */
export async function settle(page: Page): Promise<void> {
  // Film: also wait for a buffering shot (deferred assets) to be reconstructed.
  await page.waitForFunction(() => (window as any).__jointsQA.idle() && !(window as any).__jointsFilm?.state().buffering, null, { timeout: 60_000 });
  await page.waitForFunction(() => (window as any).__jointsQA.idle(), null, { timeout: 20_000 });
  await page.evaluate(() => (window as any).__jointsQA.renderNow());
}

export const qa = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(([f, a]) => (window as any).__jointsQA[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;

export type V3 = [number, number, number];
export const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Film route (default). autoplay=0 so tests drive the clock deterministically. */
export async function openFilm(page: Page, query = "") {
  await page.goto(`/?qa=1&dpr=1&autoplay=0${query}`);
  await page.waitForFunction(() => (window as any).__jointsFilm || document.querySelector("[data-testid=error]"), null, { timeout: 90_000 });
  expect(await page.locator("[data-testid=error]").count()).toBe(0);
  await settle(page);
}

export const film = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(([f, a]) => (window as any).__jointsFilm[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;
