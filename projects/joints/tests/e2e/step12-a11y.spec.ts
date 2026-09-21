import { writeFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const results: Record<string, unknown> = {};

async function axe(page: Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  results[name] = {
    violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 8) })),
    incomplete: r.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })),
    passes: r.passes.length,
  };
  return r;
}

/** The element that has focus: role, accessible-ish name, and whether a focus indicator is painted. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const indicator = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== "none";
    const r = el.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), name: el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40) ?? "", testid: el.dataset.testid ?? null, indicator, w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 };
  });

test.describe("Step 12 accessibility", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step12.accessibility.json"), JSON.stringify({ generatedAt: new Date().toISOString(), tags: TAGS, results }, null, 1)));

  for (const [label, viewport] of [["desktop", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]] as const) {
    test(`axe (${label}): intro, dialogs, interactive elbow, quiz, explore`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openFilm(page);
      await film(page, "seekShot", "intro.title", 4000);
      await settle(page);
      await page.waitForTimeout(1000);
      const states: [string, () => Promise<void>][] = [
        ["intro", async () => undefined],
        ["settings-dialog", async () => {
          await page.getByTestId("settings-toggle").click();
          await expect(page.getByTestId("settings")).toBeVisible();
        }],
        ["sources-dialog", async () => {
          await page.keyboard.press("Escape");
          // Step 16D: Sources moved into Settings -> For teachers
          await page.getByTestId("settings-toggle").click();
          await page.getByTestId("sources-toggle").click();
          await expect(page.getByTestId("sources")).toBeVisible();
        }],
        ["hinge-interactive", async () => {
          await page.keyboard.press("Escape");
          await film(page, "seekShot", "hinge.try", 3000);
          await settle(page);
          await expect(page.getByTestId("film-interact")).toBeVisible();
        }],
        ["quiz", async () => {
          await film(page, "seekShot", "hinge.check", 6000);
          await settle(page);
          await page.getByTestId("film-check").click();
        }],
        ["explore", async () => {
          await page.getByTestId("film-explore").click();
          await settle(page);
        }],
      ];
      const summary: Record<string, number> = {};
      for (const [name, act] of states) {
        await act();
        await page.waitForTimeout(700);
        const r = await axe(page, `${label}:${name}`);
        summary[name] = r.violations.length;
      }
      expect(summary, JSON.stringify(results, null, 1)).toEqual(Object.fromEntries(states.map(([n]) => [n, 0])));
    });
  }

  test("keyboard only: the whole lesson can be completed without a pointer (focus visible, no traps, completion announced)", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    const order: unknown[] = [];
    // 1. Tab through the shell once: every stop is visible and shows a focus indicator; Tab never gets stuck.
    await page.locator("body").focus();
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const f = await focused(page);
      if (!f) continue;
      order.push(f);
      expect(f.visible, JSON.stringify(f)).toBe(true);
      expect(f.indicator, JSON.stringify(f)).toBe(true);
      const key = `${f.testid ?? f.name}`;
      if (seen.has(key) && key === "film-fullscreen") break;
      seen.add(key);
    }
    expect([...seen]).toEqual(expect.arrayContaining(["settings-toggle", "film-play", "film-replay", "film-scrubber", "film-chapter-hook", "film-chapter-what_is_joint", "film-explore", "film-fullscreen"]));

    // 2. Playback with the keyboard.
    await page.getByTestId("film-play").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("film-live")).toHaveText("Playing");
    await page.keyboard.press("k");
    await expect(page.getByTestId("film-live")).toHaveText("Paused");

    // 3. Every chapter from its marker (Enter); the chapter is announced.
    for (const id of ["what_is_joint", "fixed", "pivot", "ball_socket", "hinge", "compare", "recall", "body_map"]) {
      await page.getByTestId(`film-chapter-${id}`).focus();
      await page.keyboard.press("Enter");
      await settle(page);
      expect((await film<{ chapterId: string }>(page, "state")).chapterId).toBe(id);
      await expect(page.getByTestId("film-live")).toContainText(/0[2-9] /);
    }

    // 4. Hinge chapter: reach the interactive shot with the timeline slider, bend the elbow with the keyboard.
    await page.getByTestId("film-chapter-hinge").focus();
    await page.keyboard.press("Enter");
    await settle(page);
    await page.getByTestId("film-scrubber").focus();
    const entries = await film<{ id: string; startMs: number }[]>(page, "entries");
    const tryStart = entries.find((e) => e.id === "hinge.try")!.startMs;
    for (let i = 0; i < 40 && (await film<{ shotId: string }>(page, "state")).shotId !== "hinge.try"; i++) {
      const t = (await film<{ timeMs: number }>(page, "state")).timeMs;
      await page.keyboard.press(t + 15000 <= tryStart + 2000 ? "Shift+ArrowRight" : "ArrowRight");
      await settle(page);
    }
    expect((await film<{ shotId: string }>(page, "state")).shotId).toBe("hinge.try");
    const slider = page.getByTestId("film-interact").getByRole("slider");
    await slider.focus();
    const before = (await qa<number>(page, "getDof", "flexion")) ?? 0;
    for (let i = 0; i < 4; i++) await page.keyboard.press("PageUp");
    expect(await qa<number>(page, "getDof", "flexion")).toBeGreaterThan(before + 30);
    await expect(slider).toHaveAttribute("aria-valuetext", /°|degree/);

    // 5. The guided check now sits inside the hinge chapter: arrow along to it, answer it with the slider and the Check
    //    button, and read the confirmation - all without a pointer.
    await page.getByTestId("film-scrubber").focus();
    const checkStart = entries.find((e) => e.id === "hinge.check")!.startMs;
    for (let i = 0; i < 40 && (await film<{ shotId: string }>(page, "state")).shotId !== "hinge.check"; i++) {
      const t = (await film<{ timeMs: number }>(page, "state")).timeMs;
      await page.keyboard.press(t + 15000 <= checkStart + 2000 ? "Shift+ArrowRight" : "ArrowRight");
      await settle(page);
    }
    expect((await film<{ shotId: string }>(page, "state")).shotId).toBe("hinge.check");
    const quizSlider = page.getByTestId("film-interact").getByRole("slider");
    await quizSlider.focus();
    await page.keyboard.press("Home");
    for (let i = 0; i < 6; i++) await page.keyboard.press("PageUp");
    await page.getByTestId("film-check").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("film-check-feedback")).toContainText("90");

    // 6. And the end of the lesson is reachable and announced from the keyboard.
    await page.getByTestId("film-scrubber").focus();
    await page.keyboard.press("End");
    await settle(page);
    expect((await film<{ shotId: string }>(page, "state")).shotId).toBe("map.all");
    await expect(page.getByTestId("film-live")).toHaveText("Lesson complete.");
    results.keyboardJourney = { tabOrder: order, completed: true };
    expect(log.errors).toEqual([]);
  });

  test("dialogs: focus moves in, Tab stays inside, Escape closes, focus returns to the opener", async ({ page }) => {
    await openFilm(page);
    const toggle = page.getByTestId("settings-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("settings")).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press(i % 3 === 0 ? "Shift+Tab" : "Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
    }
    // arrow keys change a radio group; the setting applies (reduced motion)
    await page.getByTestId("setting-motion-system").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("film")).toHaveAttribute("data-motion", "reduce");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings")).toHaveCount(0);
    expect(await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.testid)).toBe("settings-toggle");
    // Space does not toggle playback while a dialog is open
    await toggle.press("Enter");
    await expect(page.getByTestId("settings")).toBeVisible();
    const playing = (await film<{ playing: boolean }>(page, "state")).playing;
    await page.keyboard.press("k");
    expect((await film<{ playing: boolean }>(page, "state")).playing).toBe(playing);
    await page.keyboard.press("Escape");
  });

  test("target size >= 44 px, reflow at 320 px, captions readable", async ({ page }) => {
    const sizes: Record<string, unknown> = {};
    for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(vp);
      await openFilm(page);
      await film(page, "seekShot", "hinge.try", 3000);
      await settle(page);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("button, [role=slider], input, a[href]")]
          .filter((el) => el.offsetParent !== null && !el.closest(".dof-slider__control .dof-slider__thumb"))
          .map((el) => {
            const r = (el.matches("input[type=radio]") ? el.closest("label")! : el).getBoundingClientRect();
            return { id: el.dataset.testid ?? el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) };
          })
          .filter((b) => b.w < 44 || b.h < 44),
      );
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const captionPx = await page.getByTestId("film-caption").locator(".film-caption__text").evaluate((el) => parseFloat(getComputedStyle(el).fontSize)).catch(() => null);
      sizes[`${vp.width}x${vp.height}`] = { small, overflow, captionPx };
      expect(small, `${vp.width}: ${JSON.stringify(small)}`).toEqual([]);
      expect(overflow).toBeLessThanOrEqual(0);
      if (captionPx !== null) expect(captionPx).toBeGreaterThanOrEqual(16);
    }
    results.targets = sizes;
  });

  test("measured text contrast over the rendered scene (not only automated tooling)", async ({ page }) => {
    const TEXT = ".film-caption.is-visible .film-caption__title, .film-caption.is-visible .film-caption__text, .film-caption.is-visible .film-caption__note, .film-caption.is-visible .film-caption__eyebrow, .film-top__brand, .film-top__chapter, .film-link, .film-time, .film-chapter__num, .label__title, .film-badge, .film-interact__prompt, .dof-slider__label, .dof-slider__scale, .film-dialog__small, .film-radio, .film-teachmark, .film-subtitle, .film-start__title, .film-start__thesis, .film-start__eyebrow, .film-start__sound, .film-end__title";
    const lum = (r: number, g: number, b: number) => {
      const c = [r, g, b].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const rows: { state: string; vp: string; selector: string; text: string; px: number; large: boolean; ratio: number; required: number }[] = [];
    const sharp = (await import("sharp")).default;
    for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      await openFilm(page);
      // Step 16B adds two states that are not shots: the landing card the lesson starts from, and the completion card.
      for (const [state, shot, offset, extra] of [["intro", "intro.title", 5000, null], ["fixed", "fixed.name", 7000, null], ["hinge-try", "hinge.try", 3000, null], ["support", "hinge.support", 9000, null], ["recap", "map.all", 7000, null], ["settings", "intro.map", 6000, "settings"], ["why", "ball.why", 7000, null], ["complete", "map.all", 7000, "complete"], ["start", "intro.title", 0, "start"]] as const) {
        if (extra === "start") {
          await page.goto("/?qa=1&dpr=1");
          await page.waitForFunction(() => (window as any).__jointsFilm, null, { timeout: 90_000 });
          await settle(page);
        } else {
          await film(page, "seekShot", shot, offset);
          await settle(page);
        }
        if (extra === "settings") await page.getByTestId("settings-toggle").click();
        if (extra === "complete") {
          await film(page, "seek", 10_000_000);
          await settle(page);
          await expect(page.getByTestId("film-end")).toBeVisible();
        }
        await page.waitForTimeout(1200);
        const els = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => {
          if (el.offsetParent === null || !el.textContent!.trim()) return false;
          // Step 16D: text faded out behind a dialog is not shown to anyone, so it is not measured. It stays in the
          // DOM and focusable, which is what lets focus return to the control that opened the dialog.
          let alpha = 1;
          for (let p: HTMLElement | null = el; p; p = p.parentElement) alpha *= parseFloat(getComputedStyle(p).opacity);
          return alpha > 0.02;
        }).map((el, i) => {
          el.dataset.contrastIdx = String(i);
          // sample behind the glyphs only (text range rects), not padding or borders of the element box
          const rects: DOMRect[] = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const parent = n.parentElement!;
            if (!n.textContent!.trim() || parent.closest(".sr-only") || (parent.closest(".film-badge") && !el.classList.contains("film-badge"))) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            rects.push(...[...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0));
          }
          const r = rects.length ? rects.reduce((u, q) => new DOMRect(Math.min(u.left, q.left), Math.min(u.top, q.top), Math.max(u.right, q.right) - Math.min(u.left, q.left), Math.max(u.bottom, q.bottom) - Math.min(u.top, q.top))) : el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          let alpha = 1;
          for (let p: HTMLElement | null = el; p; p = p.parentElement) alpha *= parseFloat(getComputedStyle(p).opacity);
          const m = cs.color.match(/[0-9.]+/g)!.map(Number);
          return { i, cls: el.className, text: el.textContent!.trim().slice(0, 30), x: r.left, y: r.top, w: r.width, h: r.height, color: [m[0], m[1], m[2], (m[3] ?? 1) * alpha], px: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight) };
        }), TEXT);
        // background = the same frame with every text glyph made transparent
        await page.addStyleTag({ content: "[data-contrast-idx], [data-contrast-idx] * { color: transparent !important; text-shadow: none !important; }" }).then((h) => h.evaluate((n) => ((n as HTMLElement).id = "contrast-hide")));
        const shotBuf = await page.screenshot();
        await page.evaluate(() => document.getElementById("contrast-hide")?.remove());
        const img = await sharp(shotBuf).raw().toBuffer({ resolveWithObject: true });
        for (const e of els) {
          const x0 = Math.max(0, Math.floor(e.x)), y0 = Math.max(0, Math.floor(e.y)), x1 = Math.min(img.info.width - 1, Math.ceil(e.x + e.w)), y1 = Math.min(img.info.height - 1, Math.ceil(e.y + e.h));
          const ls: number[] = [];
          for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
            const o = (y * img.info.width + x) * img.info.channels;
            ls.push(lum(img.data[o], img.data[o + 1], img.data[o + 2]));
          }
          if (!ls.length) continue;
          ls.sort((a, b) => a - b);
          const [r, g, b, a] = e.color;
          // text colour composited over the background; worst case = the background extreme closest to the text luminance
          const worst = (bgL: number, bgGray: number) => {
            const blend = (c: number) => c * a + bgGray * (1 - a);
            const tL = lum(blend(r), blend(g), blend(b));
            return (Math.max(tL, bgL) + 0.05) / (Math.min(tL, bgL) + 0.05);
          };
          const toGray = (L: number) => 255 * (L <= 0.0031308 ? L * 12.92 : 1.055 * Math.pow(L, 1 / 2.4) - 0.055);
          const lightTextOnDark = lum(r, g, b) > 0.5;
          const bgL = lightTextOnDark ? ls[Math.floor(ls.length * 0.95)] : ls[Math.floor(ls.length * 0.05)];
          const large = e.px >= 24 || (e.px >= 18.66 && e.weight >= 700);
          rows.push({ state, vp: `${vp.width}x${vp.height}`, selector: String(e.cls).split(" ")[0], text: e.text, px: e.px, large, ratio: +worst(bgL, toGray(bgL)).toFixed(2), required: large ? 3 : 4.5 });
        }
        if (extra === "settings") await page.keyboard.press("Escape");
      }
    }
    const failing = rows.filter((r) => r.ratio < r.required);
    results.contrast = { method: "text hidden, rendered frame captured, 95th-percentile background luminance under each text box (5th for dark text), text colour alpha-composited; WCAG 1.4.3 thresholds", rows, failing };
    expect(failing, JSON.stringify(failing, null, 1)).toEqual([]);
  });

  test("quiz prompt: exactly one semantic prompt (DOM and accessibility tree) at every width", async ({ page }) => {
    const rows: Record<string, unknown> = {};
    for (const vp of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
      await page.setViewportSize(vp);
      await openFilm(page);
      await film(page, "seekShot", "hinge.check", 6000);
      await settle(page);
      await page.waitForTimeout(900);
      const text = "Try it: bend the elbow to about 90°.";
      const domCount = await page.evaluate((t) => [...document.querySelectorAll("body *")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.includes(t))).length, text);
      const snapshot = await page.locator("body").ariaSnapshot();
      // the panel is a region *named by* the caption prompt (aria-labelledby): its name is a reference, not a second prompt
      const lines = snapshot.split(/\r?\n/).filter((l) => l.includes(text));
      const treeCount = lines.filter((l) => !/region "/.test(l)).length;
      const regionNamedByPrompt = lines.some((l) => /region "/.test(l));
      const panel = page.getByTestId("film-interact");
      await expect(panel).toHaveAccessibleName(/Try it: bend the elbow to about 90°/);
      rows[`${vp.width}x${vp.height}`] = { domCount, treeCount, regionNamedByPrompt, snapshotLines: lines };
      expect(domCount, JSON.stringify(vp)).toBe(1);
      expect(treeCount, JSON.stringify(vp)).toBe(1);
    }
    results.quizPrompt = rows;
  });

  test("live announcements: selection in Explore is announced", async ({ page }) => {
    await openFilm(page);
    // Free-look Explore, which is the mode this announcement belongs to. A joint exploration (Step 14) deliberately
    // turns picking off - the learner is there to move the joint, not to select bones - so it is not the subject here.
    // This test used to open one from the hinge chapter and passed only because the click beat the policy change.
    await film(page, "seekShot", "hinge.flexion", 3000);
    await settle(page);
    await film(page, "explore", true);
    await settle(page);
    expect((await film<{ picking: boolean }>(page, "interaction")).picking, "free-look Explore lets the learner pick").toBe(true);
    const pt = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "humerus_r", false);
    expect(pt).not.toBeNull();
    await page.mouse.click(pt!.x, pt!.y);
    await expect(page.getByTestId("film-live")).toContainText("Selected: Humerus");
  });
});
