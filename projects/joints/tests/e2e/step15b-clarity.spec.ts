import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { film, openFilm, qa, settle, trackConsole } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");
const report: Record<string, unknown> = {};
const lesson = JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8")) as Lesson;
const locale = JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8")) as Locale;
const narration = JSON.parse(readFileSync(join(ROOT, "public/assets/audio/narration/narration.json"), "utf8")) as Narration;

interface Shot { id: string; durationMs: number; narrationKey?: string; caption: { titleKey?: string; textKey?: string; noteKey?: string }; overlays: { concepts: string[] }; body: { highlight: string[] }; camera: Record<string, unknown> }
interface Lesson { chapters: { id: string; number: string; shots: Shot[] }[]; explores: { exploreId: string; status: string; explanationKey: string; statusKey: string }[] }
interface Locale { strings: Record<string, { text: string; provenance: string }> }
interface Narration { shots: Record<string, { text: string }>; cues: Record<string, { text: string }> }

const t = (k?: string) => (k ? locale.strings[k].text : "");
const shots = lesson.chapters.flatMap((c) => c.shots);
/**
 * Everything the learner reads or hears on a shot: the headline caption, the spoken explanation shown as a subtitle,
 * and any note still attached to it. Step 16B moved most of the teaching sentences from the caption into the spoken
 * line, so every check below now covers both - which makes these assertions wider than they were, not narrower.
 */
const learnerText = (s: Shot) => [t(s.caption.titleKey), t(s.caption.textKey), t(s.narrationKey), t(s.caption.noteKey)].filter(Boolean).join(" ");
const shotOrder = shots.map((s) => s.id);

/**
 * Step 15B: six things a beginner tripped over in direct review. Each test below is the proof that one of them is
 * actually fixed in the shipped content and the running build - not that it was written down somewhere.
 */
test.describe("Step 15B learner clarity", () => {
  test.afterAll(() => writeFileSync(join(ROOT, "qa", "reports", "step15b.clarity.json"), JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 1)));

  test("1. the repeated technical disclaimer is gone from the captions, and said once on the stage instead", async ({ page }) => {
    // content side: no caption carries the reviewer-language note any more, and no note is used twice
    const repeated = shots.filter((s) => s.caption.noteKey === "note.schematic_indicator" || s.caption.noteKey === "note.recap_schematic");
    expect(repeated.map((s) => s.id)).toEqual([]);
    const notes = shots.map((s) => s.caption.noteKey).filter(Boolean) as string[];
    expect(new Set(notes).size, `a note is repeated: ${notes.join(", ")}`).toBe(notes.length);

    // running build: whenever the movement marks are on screen, the status is there - including on shots with no caption
    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const s of shots) {
      if (!s.overlays.concepts.length && s.id !== "intro.title") continue;
      await film(page, "seekShot", s.id, Math.round(s.durationMs * 0.6));
      await film(page, "pause");
      await settle(page);
      const mark = await page.getByTestId("film-teachmark").count();
      rows.push({ shot: s.id, indicators: s.overlays.concepts.length, teachmark: mark });
      expect(mark, `${s.id}: indicators ${s.overlays.concepts.length}, status shown ${mark}`).toBe(s.overlays.concepts.length ? 1 : 0);
    }
    const text = (await page.getByTestId("film-teachmark").textContent()) ?? "";
    expect(text.toLowerCase()).toContain("movement");
    expect(text.split(/\s+/).length, "the persistent status stays short").toBeLessThanOrEqual(14);
    report.disclaimer = { captionsCarryingIt: 0, statusText: text.trim(), checked: rows.length };
    expect(log.errors).toEqual([]);
  });

  test("2. learner captions are plain English: the anatomical names live on the labels, not in the sentences", async ({ page }) => {
    const LATIN = /\bhumerus\b|\bradius\b|\bulna\b|\bscapula\b|\batlas\b|\bfemur\b|\btibia\b|\bpatella\b/i;
    const offenders = shots.filter((s) => LATIN.test(learnerText(s))).map((s) => ({ id: s.id, text: learnerText(s) }));
    expect(offenders, "anatomical names belong on the labels, not in the caption").toEqual([]);

    // and they really are still on screen where the lesson needs them
    const log = trackConsole(page);
    await openFilm(page);
    await film(page, "seekShot", "hinge.bones", 4500);
    await film(page, "pause");
    await settle(page);
    // the laid-out labels are what the learner actually reads on the model in this shot
    const labels = await qa<{ id: string }[]>(page, "labels");
    const laidOut = labels.map((l) => l.id.toLowerCase()).join(" ");
    for (const n of ["humerus", "radius", "ulna"]) expect(laidOut, `${n} must still be labelled on screen`).toContain(n);
    report.terminology = { captionsWithLatinNames: 0, labelsOnHingeBones: labels.map((l) => l.id) };
    expect(log.errors).toEqual([]);
  });

  test("3. axis is explained in the same breath as it is named, and never used before that", async () => {
    const usesAxis = shots.filter((s) => /\baxis\b/i.test(learnerText(s)));
    expect(usesAxis.length, "the word should be introduced once, not scattered").toBeGreaterThan(0);
    const first = usesAxis[0];
    const text = learnerText(first);
    // the shot that first says "axis" also says what the line does, before naming it
    expect(text.toLowerCase()).toMatch(/line/);
    expect(text.toLowerCase().indexOf("line")).toBeLessThan(text.toLowerCase().indexOf("axis"));
    // the blue line is actually on screen in that shot
    const shot = shots.find((s) => s.id === first.id)!;
    expect((shot as unknown as { overlays: { axis: boolean } }).overlays.axis, `${first.id} must show the axis overlay`).toBe(true);
    // nothing earlier in the lesson used the word
    const earlier = shots.slice(0, shotOrder.indexOf(first.id)).filter((s) => /\baxis\b/i.test(learnerText(s)));
    expect(earlier.map((s) => s.id), "axis was used before it was explained").toEqual([]);
    report.axis = { introducedIn: first.id, text };
  });

  test("4. the pivot chapter shows the two bones, then one turning around the other", async ({ page }) => {
    const pivot = lesson.chapters.find((c) => c.id === "pivot")!;
    expect(pivot.shots.length, "the chapter needs a beat for the bones and a beat for the movement").toBeGreaterThanOrEqual(3);
    const bones = pivot.shots.find((s) => s.id === "pivot.bones")!;
    const rotate = pivot.shots.find((s) => s.id === "pivot.rotate")!;
    // the bones beat holds still and shows the structures; the movement beat adds the indicator
    expect(bones.overlays.concepts, "the bones beat shows no movement yet").toEqual([]);
    expect(rotate.overlays.concepts.length, "the movement beat shows the rotation").toBeGreaterThan(0);
    // both beats light the same thing (one region ref, which the body manifest resolves to the two neck bones)
    expect(bones.body.highlight).toEqual(rotate.body.highlight);
    expect(bones.body.highlight).toEqual(["region:upper_neck"]);
    // the two beats are framed differently: the bones are looked at, then the head is brought back into frame
    expect(bones.camera.scale).not.toBe(rotate.camera.scale);
    // and the words say what the learner is looking at, without claiming mechanics the lesson cannot source
    expect(learnerText(bones).toLowerCase()).toContain("on top of");
    expect(learnerText(rotate).toLowerCase()).toContain("turns around");
    expect(learnerText(rotate).toLowerCase()).not.toContain("dens");

    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const s of [bones, rotate]) {
      await film(page, "seekShot", s.id, Math.round(s.durationMs * 0.7));
      await film(page, "pause");
      await settle(page);
      const body = await film<{ highlighted: string[] }>(page, "body");
      const concepts = await film<string[]>(page, "concepts");
      rows.push({ shot: s.id, highlighted: body.highlighted, concepts });
      expect(body.highlighted.sort()).toEqual(["body.atlas_c1", "body.axis_c2"]);
    }
    expect(rows[0].concepts).toEqual([]);
    expect((rows[1].concepts as string[]).length).toBeGreaterThan(0);
    report.pivot = rows;
    expect(log.errors).toEqual([]);
  });

  test("5. flexion and extension are tied to the action, and used again where the learner performs it", async () => {
    const flex = shots.find((s) => s.id === "hinge.flexion")!;
    const ext = shots.find((s) => s.id === "hinge.extension")!;
    // the term arrives attached to what the learner just watched
    expect(learnerText(flex).toLowerCase()).toMatch(/bends?.*flexion/);
    expect(learnerText(ext).toLowerCase()).toMatch(/straightens?.*extension/);
    // and it is used once more, in the exploration where the learner does both
    const hinge = lesson.explores.find((e) => e.exploreId === "explore.hinge")!;
    const explanation = t(hinge.explanationKey).toLowerCase();
    expect(explanation).toContain("flexion");
    expect(explanation).toContain("extension");
    report.flexionExtension = { taughtIn: [flex.id, ext.id], reusedIn: hinge.exploreId, explanation: t(hinge.explanationKey) };
  });

  test("6. no shot runs silent, and the transition that felt like a stall now says what it is doing", async () => {
    const silent = shots.filter((s) => !narration.shots[s.id]);
    expect(silent.map((s) => s.id), "a shot with no narration reads as a stall").toEqual([]);
    const ret = shots.find((s) => s.id === "hinge.return")!;
    expect(ret.caption.textKey ?? ret.narrationKey, "the transition must say what it is doing").toBeTruthy();
    // the beat ends when its motion does, instead of holding a static frame
    expect(ret.durationMs).toBeLessThanOrEqual(4800);
    expect(ret.durationMs).toBeGreaterThanOrEqual(4300);
    report.timing = { silentShots: [], hingeReturnMs: ret.durationMs, hingeReturnSays: learnerText(ret) };
  });

  test("7. the expert metadata is still underneath: statuses, indicators, and the technical wording", async ({ page }) => {
    // the lesson still declares which shots are schematic and which exploration is the validated one
    expect(shots.filter((s) => s.overlays.concepts.length).length).toBeGreaterThan(10);
    expect(lesson.explores.filter((e) => e.status === "validated-rig").map((e) => e.exploreId)).toEqual(["explore.hinge"]);
    expect(lesson.explores.filter((e) => e.status === "teaching-simulation").length).toBe(3);
    // the reviewer-language strings still exist
    for (const k of ["note.schematic_indicator", "note.recap_schematic"]) expect(locale.strings[k], k).toBeTruthy();

    const log = trackConsole(page);
    await openFilm(page);
    // the status is still machine-readable on the exploration panel
    await film(page, "seekShot", "pivot.rotate", 3000);
    await film(page, "pause");
    await settle(page);
    await page.getByTestId("film-explore").click();
    await expect(page.getByTestId("film-explore-panel")).toBeVisible();
    await expect(page.getByTestId("film-explore-status")).toHaveAttribute("data-status", "teaching-simulation");
    await expect(page.getByTestId("film-explore-teaching")).toBeVisible();
    await page.getByTestId("film-explore-exit").click();
    await settle(page);

    // and the full technical wording is still there for a teacher or a reviewer - one deliberate step away (Step 16D)
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("sources-toggle").click();
    await expect(page.getByTestId("sources")).toBeVisible();
    const sources = (await page.getByTestId("sources-validation").textContent()) ?? "";
    expect(sources.toLowerCase()).toContain("validated 3d rig");
    expect(sources.toLowerCase()).toContain("schematic");
    expect(sources.toLowerCase()).toContain("fitted to this 3d model");
    report.metadata = { validatedExplores: ["explore.hinge"], sourcesDialogKeepsTechnicalWording: true };
    expect(log.errors).toEqual([]);
  });

  test("8. no new validation claim reached the learner, and the teaching simulations still say so", async ({ page }) => {
    // no caption anywhere tells the learner about rigs, validation or schematics
    const CLAIM = /\bvalidated\b|\brig\b|\bschematic\b|scientifically|accurate/i;
    const offenders = shots.filter((s) => CLAIM.test(learnerText(s))).map((s) => ({ id: s.id, text: learnerText(s) }));
    expect(offenders, "reviewer vocabulary must not be in a caption").toEqual([]);

    const log = trackConsole(page);
    await openFilm(page);
    const rows: Record<string, unknown>[] = [];
    for (const e of lesson.explores) {
      const chapter = lesson.chapters.find((c) => c.shots.some((s) => s.id.startsWith(e.exploreId.split(".")[1])) || c.id === (e as unknown as { chapterId: string }).chapterId)!;
      // the last beat of a category chapter now hands the learner the joint by itself, so this opens it from the button
      await film(page, "seekShot", (chapter.shots.at(-2) ?? chapter.shots.at(-1)!).id, 1000);
      await film(page, "pause");
      await settle(page);
      await page.getByTestId("film-explore").click();
      await expect(page.getByTestId("film-explore-panel")).toBeVisible();
      const status = (await page.getByTestId("film-explore-status").textContent())?.trim() ?? "";
      const teaching = await page.getByTestId("film-explore-teaching").count();
      rows.push({ explore: e.exploreId, declared: e.status, shown: status, plainNote: teaching });
      if (e.status === "teaching-simulation") {
        expect(status.toLowerCase(), `${e.exploreId} must still say it is a teaching simulation`).toContain("teaching simulation");
        expect(teaching, "and say once, plainly, what that means").toBe(1);
      } else {
        // the validated rig no longer lectures the learner about validation - and must not claim more than it is
        expect(status.toLowerCase()).not.toContain("validated");
        expect(status.toLowerCase()).not.toMatch(/accurate|real|correct/);
        expect(teaching, "the rig carries no teaching-simulation note").toBe(0);
      }
      await page.getByTestId("film-explore-exit").click();
      await settle(page);
    }
    report.claims = rows;
    expect(log.errors).toEqual([]);
  });
});
