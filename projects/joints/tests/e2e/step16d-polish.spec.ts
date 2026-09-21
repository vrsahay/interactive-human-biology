import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

/**
 * Step 16D: the learner-facing surface.
 *
 * The lesson architecture is settled; what these tests hold is that a learner is being taught anatomy rather than shown
 * a review build. Review-state markers, source controls and reviewer vocabulary belong to the teacher layer, and the
 * classification underneath them is untouched - a test asserts that too, because the point is to move the marker, not
 * to lose the metadata.
 *
 * The Step-16C invariants (explore isolation, one audio owner, frame-drop synchronisation, the validated elbow) run
 * unchanged in `step16c-invariants.spec.ts`; the cheap ones are spot-checked here as well so a regression in this
 * step's UI work cannot hide behind a green file elsewhere.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};
const lesson = JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8")) as Lesson;
const locale = JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8")) as Locale;
const narration = JSON.parse(readFileSync(join(ROOT, "public/assets/audio/narration/narration.json"), "utf8")) as Narration;

interface Shot { id: string; durationMs: number; narrationKey?: string; caption: { titleKey?: string; textKey?: string; noteKey?: string } }
interface Lesson { chapters: { id: string; shots: Shot[] }[]; explores: { exploreId: string; chapterId: string; task?: { promptKey: string } }[] }
interface Locale { strings: Record<string, { text: string; provenance: string }> }
interface Narration { shots: Record<string, { text: string }>; cues: Record<string, { text: string }> }

const t = (k?: string) => (k ? locale.strings[k].text : "");
const shots = lesson.chapters.flatMap((c) => c.shots);
const spokenOf = (s: Shot) => narration.shots[s.id]?.text ?? "";
const headOf = (s: Shot) => [t(s.caption.titleKey), t(s.caption.textKey)].filter(Boolean).join(" ");

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["this", "that", "with", "they", "them", "your", "from", "like", "have", "what", "when", "then", "here", "into", "which", "their", "than", "over", "also", "does", "each"]);
const toks = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 3 && !STOP.has(w)));
function similarity(a: string, b: string): number {
  const A = toks(a);
  const B = toks(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n / (A.size + B.size - n);
}

/** Everything on screen that a learner can actually see. */
const visibleText = (page: Page, selector: string) =>
  page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.02;
  }).length, selector);

test.describe("Step 16D learner polish", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step16d.polish.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("1. no review-state badge is on screen anywhere in normal playback", async ({ page }) => {
    test.setTimeout(300_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: { shot: string; badges: number }[] = [];
    for (const s of shots) {
      await film(page, "seekShot", s.id, Math.min(900, Math.round(s.durationMs * 0.5)));
      await film(page, "pause");
      await settle(page);
      const badges = await visibleText(page, ".film-caption .film-badge");
      rows.push({ shot: s.id, badges });
    }
    const offenders = rows.filter((r) => r.badges > 0);
    expect(offenders, "a review-state badge must not appear in the learner's caption").toEqual([]);
    report.badges = { shotsChecked: rows.length, shotsWithABadge: 0 };
    expect(log.errors).toEqual([]);
  });

  test("2. the Sources control is off the teaching surface, and one deliberate step away", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "fixed.why", 2000);
    await settle(page);
    // not on the stage, and no source panel open by itself
    expect(await page.getByTestId("sources-toggle").count(), "Sources must not sit on the teaching surface").toBe(0);
    expect(await page.getByTestId("sources").count(), "no source panel may be open during teaching").toBe(0);

    // but reachable: Settings -> For teachers -> Sources
    await page.getByTestId("settings-toggle").click();
    await expect(page.getByTestId("settings")).toBeVisible();
    await expect(page.getByTestId("sources-toggle")).toBeVisible();
    await page.getByTestId("sources-toggle").click();
    await expect(page.getByTestId("sources")).toBeVisible();
    const text = (await page.getByTestId("sources").textContent()) ?? "";
    // the teacher layer still carries the whole evidence trail
    expect(text.toLowerCase()).toContain("draft");
    expect(text.toLowerCase()).toContain("subject-expert review");
    await expect(page.getByTestId("sources-validation")).toBeVisible();
    report.sources = { onTeachingSurface: false, reachableFromSettings: true };
    expect(log.errors).toEqual([]);
  });

  test("3. the classification underneath is untouched", async () => {
    // the provenance is still on every string ...
    const classes = new Set(Object.values(locale.strings).map((s) => s.provenance));
    expect([...classes].sort()).toEqual(["draft-enrichment", "figure-reference", "source-excerpt", "ui"]);
    const draft = Object.entries(locale.strings).filter(([, s]) => s.provenance === "draft-enrichment");
    expect(draft.length, "the draft classification is still carried by the content").toBeGreaterThan(100);
    // ... exactly one source-excerpt, as in every step since 13 ...
    expect(Object.values(locale.strings).filter((s) => s.provenance === "source-excerpt")).toHaveLength(1);
    // ... every spoken explanation is still draft and still needs review ...
    for (const [k, v] of Object.entries(locale.strings)) if (k.startsWith("narr.")) expect(v.provenance, k).toBe("draft-enrichment");
    // ... and the legend that explains what that means is still in the locale
    for (const p of ["source-excerpt", "figure-reference", "draft-enrichment", "ui"]) {
      expect((locale as unknown as { provenanceLegend: Record<string, string> }).provenanceLegend[p], p).toBeTruthy();
    }
    report.provenance = { classes: [...classes].sort(), draftStrings: draft.length, sourceExcerpts: 1 };
  });

  test("3b. the caption still carries its provenance for QA, without showing it to the learner", async ({ page }) => {
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "fixed.name", 2000);
    await settle(page);
    const el = page.getByTestId("film-caption").locator("[data-provenance]").first();
    await expect(el).toHaveAttribute("data-provenance", /draft-enrichment|source-excerpt|figure-reference/);
    expect(await visibleText(page, ".film-caption .film-badge")).toBe(0);
    expect(log.errors).toEqual([]);
  });

  test("4. the draft disclaimer is not announced once per caption", async ({ page }) => {
    test.setTimeout(240_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: { shot: string; disclaimers: number }[] = [];
    for (const s of shots) {
      await film(page, "seekShot", s.id, Math.min(900, Math.round(s.durationMs * 0.5)));
      await film(page, "pause");
      await settle(page);
      const n = await page.evaluate(() => [...document.querySelectorAll(".sr-only")].filter((el) => /draft explanatory text/i.test(el.textContent ?? "")).length);
      rows.push({ shot: s.id, disclaimers: n });
    }
    const offenders = rows.filter((r) => r.disclaimers > 0);
    expect(offenders, "the reviewer legend must not be read out after every caption").toEqual([]);

    // and the honesty that the learner does need is still announced, once, on entering a teaching simulation
    await film(page, "seekShot", "pivot.bones", 600);
    await film(page, "pause");
    await settle(page);
    await page.getByTestId("film-explore").click();
    await expect(page.getByTestId("film-explore-panel")).toBeVisible();
    await expect(page.getByTestId("film-explore-status")).toHaveAttribute("data-status", "teaching-simulation");
    await expect(page.getByTestId("film-explore-teaching")).toBeVisible();
    const live = (await page.getByTestId("film-live").textContent()) ?? "";
    expect(live.length, "entering an exploration announces it").toBeGreaterThan(0);
    report.screenReader = { shotsChecked: rows.length, shotsRepeatingTheDisclaimer: 0, statusOnExploreEntry: true };
    expect(log.errors).toEqual([]);
  });

  test("5. no spoken line repeats another, and none simply reads its own caption aloud", async () => {
    // (a) nothing is said twice across the lesson beyond the two deliberate call-backs
    const pairs: { a: string; b: string; score: number }[] = [];
    for (let i = 0; i < shots.length; i++) {
      for (let j = i + 1; j < shots.length; j++) {
        const score = similarity(spokenOf(shots[i]), spokenOf(shots[j]));
        if (score >= 0.45) pairs.push({ a: shots[i].id, b: shots[j].id, score: +score.toFixed(2) });
      }
    }
    // The two that remain are deliberate and are named here, so a new one cannot slip in unnoticed.
    const INTENDED = new Set(["hinge.name|map.hinge", "compare.together|map.all"]);
    const unintended = pairs.filter((p) => !INTENDED.has(`${p.a}|${p.b}`));
    expect(unintended, "a spoken line repeats another without adding anything").toEqual([]);

    // (b) the exploration cues no longer append the instruction to the task
    for (const e of lesson.explores) {
      if (!e.task) continue;
      const cue = narration.cues[e.task.promptKey]?.text ?? "";
      expect(cue, `${e.exploreId}: the task cue must say the task, once`).toBe(t(e.task.promptKey).trim());
    }

    // (c) the two layers have not collapsed back into one
    const collapsed = shots.filter((s) => spokenOf(s) && norm(headOf(s)) === norm(spokenOf(s))).map((s) => s.id);
    // Instructions and short transitions may legitimately read and sound the same; the teaching beats may not.
    const ALLOWED = new Set(["hinge.axis", "hinge.check", "hinge.return", "recall.challenge", "map.intro"]);
    expect(collapsed.filter((id) => !ALLOWED.has(id)), "a teaching beat is reading its own caption aloud").toEqual([]);
    report.narrationDuplication = { nearDuplicatePairs: pairs, collapsedLayers: collapsed };
  });

  test("6. the repetition that teaches is still there", async () => {
    const said = (id: string) => spokenOf(shots.find((s) => s.id === id)!).toLowerCase();
    // introduce -> demonstrate -> extend -> apply, for the elbow
    expect(said("hook.elbow"), "introduce").toMatch(/bends? and.*straightens?/);
    expect(said("hinge.flexion"), "name the movement").toContain("flexion");
    expect(said("hinge.extension"), "name the other one").toContain("extension");
    expect(said("hinge.why"), "explain why").toMatch(/\bso\b|because/);
    expect(said("hinge.knee"), "extend to a second example").toContain("knee");
    expect(narration.cues["explore.hinge.done"].text.toLowerCase(), "apply, in the learner's own hands").toContain("flexion");
    // the thesis is stated when it is introduced and again when the lesson closes
    expect(said("concept.different")).toMatch(/decides/);
    expect(said("compare.together")).toMatch(/decides/);
    expect(said("map.all")).toMatch(/decides/);
    // one memorable takeaway per category survives
    expect(said("compare.fixed")).toMatch(/almost no movement|no movement/);
    expect(said("compare.pivot")).toMatch(/turning|turns/);
    expect(said("compare.ball")).toMatch(/many directions/);
    expect(said("compare.hinge")).toMatch(/bending and straightening|bends and straightens/);
    report.retainedRepetition = { elbowArc: true, thesisRestated: 3, takeawayPerCategory: 4 };
  });

  test("10. no site label is hidden behind a panel, at any supported width", async ({ page }) => {
    test.setTimeout(300_000);
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const [w, h] of [[1280, 800], [1440, 900], [1024, 768], [768, 1024], [412, 844], [390, 844], [320, 800]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const e of lesson.explores) {
        const chapter = lesson.chapters.find((c) => c.id === e.chapterId)!;
        await film(page, "seekShot", chapter.shots[1].id, 600);
        await film(page, "pause");
        await settle(page);
        if (!(await page.getByTestId("film-explore-panel").count())) await page.getByTestId("film-explore").click();
        await expect(page.getByTestId("film-explore-panel")).toBeVisible();
        await settle(page);
        await page.waitForTimeout(200);
        const r = await page.evaluate(() => {
          const panel = document.querySelector('[data-testid="film-explore-panel"]')!.getBoundingClientRect();
          const labels = [...document.querySelectorAll(".label")].map((el) => ({ text: el.textContent!.trim(), r: el.getBoundingClientRect() })).filter((l) => l.r.width > 2 && l.text);
          return {
            behindPanel: labels.filter((l) => l.r.left < panel.right && l.r.right > panel.left && l.r.top < panel.bottom && l.r.bottom > panel.top).map((l) => l.text),
            offscreen: labels.filter((l) => l.r.left < 0 || l.r.right > innerWidth || l.r.top < 0 || l.r.bottom > innerHeight).map((l) => l.text),
            hScroll: document.documentElement.scrollWidth > innerWidth,
            labels: labels.length,
          };
        });
        rows.push({ width: w, explore: e.exploreId, ...r });
        expect(r.behindPanel, `${w}px ${e.exploreId}: a label is hidden behind the panel`).toEqual([]);
        expect(r.offscreen, `${w}px ${e.exploreId}: a label is off screen`).toEqual([]);
        expect(r.hScroll, `${w}px ${e.exploreId}: horizontal scroll`).toBe(false);
        await page.getByTestId("film-explore-exit").click();
        await film(page, "pause");
        await settle(page);
      }
    }
    report.labelClipping = { checks: rows.length, problems: 0 };
    expect(log.errors).toEqual([]);
  });

  test("7,8,11,13. the Step-16C invariants still hold after this step's UI work", async ({ page }) => {
    test.setTimeout(180_000);
    const log = trackConsole(page);
    await openFilm(page);
    // 8 + 13: after navigation, the clip, the caption and the picture still name the same shot, with one owner
    for (const [chapter, shot] of [[2, "fixed.why"], [5, "hinge.axis"], [8, "map.all"]] as const) {
      await film(page, "seekChapter", chapter);
      await settle(page);
      await film(page, "seekShot", shot, 1200);
      await settle(page);
      await page.waitForTimeout(250);
      const state = await film<{ shotId: string }>(page, "state");
      const n = await film<{ src: string; owners: number }>(page, "narration");
      const captionShot = (await page.getByTestId("film-caption").count()) ? await page.getByTestId("film-caption").getAttribute("data-shot") : null;
      expect(state.shotId).toBe(shot);
      if (n.src) expect(n.src, "stale clip after navigation").toBe(`${shot}.mp3`);
      if (captionShot) expect(captionShot).toBe(shot);
      expect(n.owners, "more than one narration owner").toBeLessThanOrEqual(1);
    }
    // 11: the validated elbow
    await film(page, "seekShot", "hinge.flexion", 2000);
    await settle(page);
    const joint = await qa<{ dofs: { id: string; min: number; max: number }[] }>(page, "joint");
    expect(joint.dofs).toHaveLength(1);
    expect(joint.dofs[0]).toMatchObject({ id: "flexion", min: 0, max: 145 });
    const poses: number[] = [];
    for (const deg of [0, 45, 90, 145]) {
      await qa(page, "setDof", "flexion", deg);
      await settle(page);
      poses.push(await qa<number>(page, "getDof", "flexion"));
    }
    expect(poses).toEqual([0, 45, 90, 145]);
    report.invariantsStillHold = { navigationChecks: 3, elbowPoses: poses };
    expect(log.errors).toEqual([]);
  });
});
