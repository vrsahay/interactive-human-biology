import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NarrationPlayer, type NarrationManifest } from "../../src/engine/video/NarrationPlayer";

/**
 * Step 16G: narration must never repeat words.
 *
 * A learner heard "... joints ... joints": a shot's clip started up to 0.35 s before its lead-in ended (the frame after
 * a shot change fell through to "the element is paused, so play it"), ran ahead of the film, and the drift corrector
 * then rewound it 0.3 s - replaying the words just spoken. These tests drive the real player against a fake audio
 * element that records every position it is given.
 */
class FakeAudio {
  static all: FakeAudio[] = [];
  src = "";
  preload = "";
  volume = 1;
  paused = true;
  ended = false;
  seeking = false;
  readyState = 4;
  duration = 3;
  playbackRate = 1;
  private t = 0;
  /** every currentTime assignment, in order */
  assigned: number[] = [];
  constructor() {
    FakeAudio.all.push(this);
  }
  get currentTime(): number {
    return this.t;
  }
  set currentTime(v: number) {
    this.assigned.push(v);
    this.t = v;
  }
  /** audio playing for `ms` of wall clock */
  advance(ms: number): void {
    if (!this.paused) this.t += (ms / 1000) * this.playbackRate;
  }
  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  addEventListener(): void {}
  removeEventListener(): void {}
  removeAttribute(): void {}
}

const manifest: NarrationManifest = {
  schema: "joints.narration/1",
  lessonId: "t",
  localeId: "en",
  voice: { name: "v", languageCode: "en", gender: "F", accent: "", provider: "" },
  timing: { leadInMs: 350, tailMs: 400 },
  shots: { a: { url: "a.mp3", durationMs: 8000, leadInMs: 350, textKeys: [], text: "Here they are, joints." } },
};

async function player(): Promise<{ p: NarrationPlayer; audio: FakeAudio }> {
  const p = new NarrationPlayer("/n/narration.json", { enabled: true });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => manifest })));
  await p.load();
  return { p, audio: FakeAudio.all[0] };
}

describe("narration never repeats words (Step 16G)", () => {
  beforeEach(() => {
    FakeAudio.all = [];
    vi.stubGlobal("Audio", FakeAudio);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a clip does not start before its lead-in ends, even though sync() runs every frame", async () => {
    const { p, audio } = await player();
    // the shot starts; the film ticks at 60 Hz through the 350 ms lead-in
    for (let local = 0; local < 350; local += 16) {
      p.sync("a", local, true, "a#0");
      expect(audio.paused, `speaking at ${local} ms, inside the lead-in`).toBe(true);
      vi.advanceTimersByTime(16);
    }
    vi.advanceTimersByTime(20);
    p.sync("a", 370, true, "a#0");
    expect(audio.paused, "speaking once the lead-in has ended").toBe(false);
  });

  it("a clip that runs ahead of the film is held, never rewound", async () => {
    const { p, audio } = await player();
    p.sync("a", 400, true, "a#0"); // a seek into the clip: starts at 0.05 s
    const start = audio.currentTime;
    // the audio runs 0.5 s further than the film does (the film stalled for a moment)
    audio.advance(1000);
    vi.advanceTimersByTime(1000);
    p.sync("a", 900, true, "a#0");
    const aheadAt = audio.currentTime;
    // it must not have been moved backwards: every position it was given is at or after the one before
    for (let i = 1; i < audio.assigned.length; i++) expect(audio.assigned[i]).toBeGreaterThanOrEqual(audio.assigned[i - 1]);
    expect(audio.currentTime, "the clip was rewound").toBe(aheadAt);
    expect(audio.paused, "the clip keeps talking ahead of the film").toBe(true);
    // the film catches up; the clip carries on from the same word
    for (let local = 900; local <= 1500; local += 16) p.sync("a", local, true, "a#0");
    expect(audio.paused).toBe(false);
    expect(audio.currentTime).toBeCloseTo(aheadAt, 5);
    expect(start).toBeCloseTo(0.05, 5);
  });

  it("a clip a little behind the film speaks slightly faster until level - it drops no words", async () => {
    const { p, audio } = await player();
    p.sync("a", 400, true, "a#0"); // clip at 0.05 s
    const seeksBefore = audio.assigned.length;
    // the clip started late: after 650 ms of film it has only spoken 300 ms - 0.35 s behind
    vi.advanceTimersByTime(650);
    audio.advance(300);
    p.sync("a", 1050, true, "a#0");
    expect(audio.assigned.length, "a late clip was skipped forward, dropping words").toBe(seeksBefore);
    expect(audio.playbackRate).toBe(1.15);
    // still closing the gap
    vi.advanceTimersByTime(2000);
    audio.advance(2000);
    p.sync("a", 3050, true, "a#0");
    expect(audio.playbackRate).toBe(1.15);
    // level again: back to the natural rate, still without a single seek
    vi.advanceTimersByTime(400);
    audio.advance(400);
    p.sync("a", 3450, true, "a#0");
    expect(audio.playbackRate).toBe(1);
    expect(audio.assigned.length).toBe(seeksBefore);
  });

  it("a clip far behind the film (a real stall) skips forward to it, never back", async () => {
    const { p, audio } = await player();
    p.sync("a", 400, true, "a#0");
    vi.advanceTimersByTime(2500); // stalled: no audio progress for 2.5 s of film
    p.sync("a", 2400, true, "a#0");
    expect(audio.currentTime).toBeCloseTo(2.05, 5);
    for (let i = 1; i < audio.assigned.length; i++) expect(audio.assigned[i]).toBeGreaterThanOrEqual(audio.assigned[i - 1]);
  });

  it("pausing the film during the lead-in does not let the clip start", async () => {
    const { p, audio } = await player();
    p.sync("a", 16, true, "a#0");
    p.sync("a", 100, false, "a#0"); // paused 100 ms into the lead-in
    vi.advanceTimersByTime(1000);
    expect(audio.paused, "a paused film started speaking").toBe(true);
    p.sync("a", 100, true, "a#0"); // resumed: the rest of the lead-in, then speech
    expect(audio.paused).toBe(true);
    vi.advanceTimersByTime(260);
    expect(audio.paused).toBe(false);
  });
});
