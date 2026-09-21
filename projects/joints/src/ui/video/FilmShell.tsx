import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { JOINT_CONTENT } from "../../content";
import { DEFAULT_LESSON, LESSONS } from "../../content/lessons";
import { App } from "../../engine/core/App";
import { parseQualityTier, type QualityTier } from "../../engine/quality/qualityTier";
import { AppVideoRuntime } from "../../engine/video/AppVideoRuntime";
import { assertValidVideoLesson } from "../../engine/video/validateVideoLesson";
import { VideoTimeline, type TimelineState } from "../../engine/video/VideoTimeline";
import { NarrationPlayer } from "../../engine/video/NarrationPlayer";
import { RecallSequence, type RecallState } from "../../engine/explore/RecallSequence";
import { taskDone } from "../../engine/explore/exploreTypes";
import type { LocaleString, Shot, VideoLesson, VideoLocale } from "../../engine/video/videoTypes";
import { FlexionSlider } from "../FlexionSlider";
import { createUiStore, type UiStore } from "../store";
import { FilmDialog } from "./FilmDialog";

interface Film {
  lesson: VideoLesson;
  locale: VideoLocale;
  timeline: VideoTimeline;
  runtime: AppVideoRuntime;
}

type MotionSetting = "system" | "reduce" | "full";
type CaptionSetting = "standard" | "large";

/** Development A/B of the image-based lighting: ?env=live regenerates the Step-11 runtime PMREM. */
function envParam(value: string | null): { live: true } | undefined {
  return value === "live" ? { live: true } : undefined;
}

/** Per-viewer settings are a convenience: storage may be unavailable (private mode, blocked site data). */
export function readSetting(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    /* settings are optional */
  }
}

const systemReducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionSetting = (v: string | null): MotionSetting => (v === "reduce" || v === "full" ? v : "system");
const effectiveReduced = (m: MotionSetting) => m === "reduce" || (m === "system" && systemReducedMotion());

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Provenance marker for the teacher / reviewer layer (Step 16D).
 *
 * It used to sit in the learner's caption: a DRAFT chip under 28 of 52 shots, each carrying the full twenty-word
 * reviewer legend in an `sr-only` span, so a screen-reader learner heard that notice after almost every sentence. The
 * classification itself is untouched - it is still on every string, still on the caption element as
 * `data-provenance`, and it is still shown, in words, in Sources & draft status. It is simply no longer part of being
 * taught.
 */
function Badge({ entry, locale }: { entry: LocaleString; locale: VideoLocale }) {
  if (entry.provenance !== "source-excerpt" && entry.provenance !== "draft-enrichment") return null;
  const source = entry.provenance === "source-excerpt";
  return (
    <span class={`film-badge ${source ? "film-badge--source" : "film-badge--draft"}`} data-provenance={entry.provenance} title={locale.provenanceLegend[entry.provenance]}>
      {locale.strings[source ? "ui.source" : "ui.draft"].text}
      <span class="sr-only">: {locale.provenanceLegend[entry.provenance]}</span>
    </span>
  );
}

function Caption({ shot, state, locale, reduced }: { shot: Shot; state: TimelineState; locale: VideoLocale; reduced: boolean }) {
  const c = shot.caption;
  const visible = !state.buffering && (reduced || state.localMs >= c.appearAtMs);
  if (!c.titleKey && !c.textKey && !c.eyebrowKey) return null;
  const s = (k?: string) => (k ? locale.strings[k] : undefined);
  const eyebrow = s(c.eyebrowKey);
  const title = s(c.titleKey);
  const text = s(c.textKey);
  const note = s(c.noteKey);
  return (
    <div class={`film-caption film-caption--${c.style} ${visible ? "is-visible" : ""}`} data-testid="film-caption" data-shot={shot.id} aria-hidden={visible ? undefined : "true"}>
      {eyebrow && <p class="film-caption__eyebrow">{eyebrow.text}</p>}
      {title && (
        <h2 class="film-caption__title" data-text-key={c.titleKey}>
          {title.text}
        </h2>
      )}
      {text && (
        <p id="film-caption-text" class={`film-caption__text ${text.provenance === "source-excerpt" ? "is-source" : ""}`} data-text-key={c.textKey} data-provenance={text.provenance}>
          {text.text}
        </p>
      )}
      {note && (
        <p class="film-caption__note" data-text-key={c.noteKey} data-provenance={note.provenance}>
          {note.text}
        </p>
      )}
    </div>
  );
}

/**
 * The spoken explanation, shown as it is spoken (Step 16B).
 *
 * The caption is the headline a learner can hold on to; this is the fuller sentence that says what is being looked at,
 * what is happening and why it matters. It is revealed a sentence at a time so the reading matches the voice, and it is
 * not announced - the caption and the per-shot description already carry the shot for assistive technology, and a live
 * region firing every few seconds would talk over them.
 */
const SENTENCES = /[^.!?]+[.!?]*/g;

export function subtitleIndex(text: string, elapsedMs: number, spanMs: number): number {
  const parts = text.match(SENTENCES)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (parts.length < 2) return 0;
  const total = parts.reduce((a, s) => a + s.length, 0);
  let seen = 0;
  for (let i = 0; i < parts.length; i++) {
    seen += parts[i].length;
    if (elapsedMs < (seen / total) * spanMs) return i;
  }
  return parts.length - 1;
}

function Subtitle({ shot, state, locale, clip, reduced }: { shot: Shot; state: TimelineState; locale: VideoLocale; clip: { durationMs: number; leadInMs: number } | null; reduced: boolean }) {
  if (!shot.narrationKey || state.buffering) return null;
  const entry = locale.strings[shot.narrationKey];
  if (!entry) return null;
  const parts = entry.text.match(SENTENCES)?.map((s) => s.trim()).filter(Boolean) ?? [entry.text];
  const lead = clip?.leadInMs ?? 350;
  const span = clip?.durationMs ?? Math.max(1200, shot.durationMs - lead - 400);
  if (state.localMs < lead && !reduced) return null;
  // Reduced motion asks for no timed reveal: the whole line at once, as the lesson's reducedMotion contract says.
  const text = reduced ? entry.text : parts[subtitleIndex(entry.text, state.localMs - lead, span)];
  return (
    <p class="film-subtitle" data-testid="film-subtitle" data-text-key={shot.narrationKey} data-provenance={entry.provenance} aria-hidden="true">
      {text}
    </p>
  );
}

/** Joint sliders subscribe to the pose signal themselves, so a drag re-renders only this leaf (not the film shell). */
function JointSliders({ app, store, content }: { app: App; store: UiStore; content: (typeof JOINT_CONTENT)[string] }) {
  const pose = store.pose.value;
  return (
    <>
      {app.joint.dofs.map((dof) => (
        <FlexionSlider key={dof.id} id={`film-dof-${dof.id}`} dof={dof} content={content.dofControls[dof.id]} value={pose[dof.id] ?? app.joint.getDof(dof.id)} onChange={(v, source) => app.setDof(dof.id, v, source)} />
      ))}
    </>
  );
}

function RadioGroup<T extends string>({ name, legend, value, options, onChange }: { name: string; legend: string; value: T; options: { value: T; label: string; detail?: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset class="film-setting">
      <legend class="film-setting__legend">{legend}</legend>
      {options.map((o) => (
        <label class="film-radio" key={o.value}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} data-testid={`setting-${name}-${o.value}`} onChange={() => onChange(o.value)} />
          <span>
            {o.label}
            {o.detail && <span class="film-radio__detail"> {o.detail}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function FilmShell({ qa, fixedPixelRatio }: { qa: boolean; fixedPixelRatio?: number }) {
  const params = new URLSearchParams(location.search);
  const entry = LESSONS[params.get("lesson") ?? DEFAULT_LESSON] ?? LESSONS[DEFAULT_LESSON];
  const content = JOINT_CONTENT[entry.jointContentId];
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<App | null>(null);
  const [store, setStore] = useState<UiStore | null>(null);
  const [film, setFilm] = useState<Film | null>(null);
  const [state, setState] = useState<TimelineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idle, setIdle] = useState(false);
  const [panel, setPanel] = useState<"sources" | "settings" | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [showBuffering, setShowBuffering] = useState(false);
  const [motion, setMotion] = useState<MotionSetting>(() => motionSetting(readSetting("joints.motion")));
  const [, setMediaTick] = useState(0);
  const [captions, setCaptions] = useState<CaptionSetting>(() => (readSetting("joints.captions") === "large" ? "large" : "standard"));
  // Narration: build-time audio of the same sentences the captions show. On by default, but a browser will not start audio
  // before a user gesture, so `narrationBlocked` drives an affordance instead of silently failing.
  const [narration, setNarration] = useState<boolean>(() => readSetting("joints.narration") !== "off");
  const [narrationBlocked, setNarrationBlocked] = useState(false);
  const narrator = useRef<NarrationPlayer | null>(null);
  // Step 14: the joint exploration the learner has open, if any. The film is paused while it is open and the shot is
  // restored on exit, so an exploration never changes where the lesson is.
  const [exploreId, setExploreId] = useState<string | null>(null);
  const [exploreReadout, setExploreReadout] = useState<{ primary: number; secondary: number | null; atLimit: boolean } | null>(null);
  // Step 16B: the one thing the learner is asked to do in an exploration, and whether they have done it. The peak is
  // kept rather than the current angle, so a task is finished by having reached the position, not by staying there.
  const taskPeak = useRef({ primary: 0, secondary: 0 });
  const taskDoneRef = useRef<string | null>(null);
  /** True while the open exploration is one the film handed over to, rather than one the learner opened themselves. */
  const handedOver = useRef(false);
  const [taskDoneId, setTaskDoneId] = useState<string | null>(null);
  /** Explorations already offered on this visit to their chapter (the film hands over once, like the recall). */
  const exploreTaken = useRef<Record<string, boolean>>({});
  // Step 16B: the film no longer starts on its own. "Start lesson" is the learner's intent and the user gesture a
  // browser requires before it will play audio at all; ?autoplay=0 keeps the old test-driven behaviour.
  const noAutoplay = params.get("autoplay") === "0";
  const [started, setStarted] = useState(noAutoplay);
  // Retrieval practice in the recap: the learner names the category from the movement, instead of reading a labelled map.
  const recall = useRef<RecallSequence | null>(null);
  const [recallState, setRecallState] = useState<RecallState | null>(null);
  const savedQuality = parseQualityTier(readSetting("joints.quality"));
  const [qualityChoice, setQualityChoice] = useState<QualityTier | "auto">(savedQuality ?? "auto");
  const reduced = effectiveReduced(motion);
  // The engine reads motion preference on demand; a ref keeps it current without re-creating the app.
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const announce = (message: string) => setAnnouncement((prev) => (prev === message ? `${message} ` : message));

  useEffect(() => {
    performance.mark("joints:app-construct");
    const instance = new App(stageRef.current!, { ...content, initialLayers: { ...content.initialLayers, labels: true, axis: true, bands: true } }, {
      qa,
      fixedPixelRatio,
      bodyManifestUrl: entry.bodyManifestUrl,
      theme: "cinematic",
      jointHiddenAtStart: true,
      prefersReducedMotion: () => reducedRef.current,
      // The elbow asset is fetched when the film approaches the hinge chapter (or a learner jumps there), not at start.
      deferJoint: true,
      quality: { urlValue: params.get("quality"), savedValue: readSetting("joints.quality") },
      environment: envParam(params.get("env")),
    });
    // Nothing is drawn until the first shot is applied and its shader programs have compiled in parallel.
    instance.loop.suspend();
    instance.events.on("quality", (q) => (document.documentElement.dataset.quality = q.tier));
    const s = createUiStore(instance.events, content.initialLayers);
    setApp(instance);
    setStore(s);
    // QA hooks are development tooling: loaded only with ?qa=1 (not in the startup bundle).
    const qaTools = qa ? import("./filmQa") : null;
    if (qaTools) void qaTools.then((m) => m.installQaApi(instance));
    let timeline: VideoTimeline | null = null;
    const offs: (() => void)[] = [];
    instance
      .start()
      .then(async () => {
        performance.mark("joints:app-started");
        performance.mark("joints:validate-start");
        const { lesson, locale, report } = assertValidVideoLesson(entry.lesson, entry.locale, instance.manifest, instance.body!.manifest);
        const runtime = new AppVideoRuntime(instance, (k) => {
          const e = locale.strings[k];
          if (!e) throw new Error(`missing text key ${k}`);
          return e.text;
        });
        instance.labels.insets = { top: 100, bottom: innerWidth < 900 ? 190 : 170 };
        timeline = new VideoTimeline(lesson, runtime);
        const player = new NarrationPlayer(`${import.meta.env.BASE_URL}assets/audio/narration/narration.json`, { enabled: readSetting("joints.narration") !== "off" });
        player.onChange = () => setNarrationBlocked(player.blocked);
        narrator.current = player;
        offs.push(() => { player.dispose(); narrator.current = null; });
        void player
          .load()
          // The first clip cannot be warmed by the shot before it, and the landing card is on screen for as long as the
          // learner takes to press Start - so warm it there. Without this the opening line began several seconds late
          // and the corrector had real drift to close on the very first beat (Step 16C).
          .then(() => {
            const here = timeline?.entries[timeline.state.shotIndex];
            if (here) player.prefetch(here.shot.id);
          })
          .catch((e) => console.warn(`narration unavailable: ${(e as Error).message}`));
        // UI refresh is throttled (~10 Hz) except for discrete changes, so a playing film does not re-render the DOM every frame.
        let last: TimelineState | null = null;
        let lastAt = 0;
        offs.push(
          timeline.events.on("state", (next) => {
            const now = performance.now();
            // The film owns the clock: narration is positioned from the shot's local time, never the reverse.
            const running = next.playing && !next.buffering && next.learner !== "active" && !next.holdingForCheck;
            player.sync(next.shotId, next.localMs, running, `${next.shotId}|${next.seeks}`);
            const discrete = !last || last.shotId !== next.shotId || last.playing !== next.playing || last.learner !== next.learner || last.check.status !== next.check.status || last.explore !== next.explore || last.holdingForCheck !== next.holdingForCheck || last.ended !== next.ended || last.seeks !== next.seeks || last.buffering !== next.buffering || last.loadError !== next.loadError;
            const captionEdge = !!last && next.shotId === last.shotId && (() => { const c = timeline!.entries[next.shotIndex].shot.caption.appearAtMs; return last!.localMs < c && next.localMs >= c; })();
            if (discrete || captionEdge || now - lastAt > 100) {
              last = next;
              lastAt = now;
              setState(next);
            }
          }),
        );
        offs.push(
          timeline.events.on("shot", ({ entry: e }) => {
            const chapter = lesson.chapters[e.chapterIndex];
            announce(`${chapter.number} ${locale.strings[chapter.titleKey].text}. ${locale.strings[e.shot.a11yKey].text}`);
            // Warm the next clip so a beat never begins with audio that still has to be fetched (Step 16C).
            const next = timeline!.entries[timeline!.entries.indexOf(e) + 1];
            if (next) player.prefetch(next.shot.id);
          }),
        );
        setFilm({ lesson, locale, timeline, runtime });
        if (qaTools) (await qaTools).installFilmQa(timeline, instance, report, runtime, player);
        const startAt = Number(params.get("t") ?? 0);
        const chapter = params.get("chapter");
        performance.mark("joints:scene-create-start");
        timeline.start(chapter ? timeline.chapterStartMs(lesson.chapters.findIndex((c) => c.id === chapter)) : startAt, { deferPreload: true });
        performance.mark("joints:scene-created");
        await instance.precompileVisible();
        performance.mark("joints:shaders-ready");
        instance.loop.resume();
        performance.mark("joints:film-started");
        // Background work starts only once the first frame is on screen: upcoming assets, then the remaining shader programs.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            timeline!.preload(true);
            void instance.precompileBodyStates();
          }),
        );
        // Nothing plays until the learner asks for it (see `started`).
      })
      .catch((e) => {
        console.error(e);
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      offs.forEach((off) => off());
      timeline?.dispose();
      s.dispose();
      instance.dispose();
    };
  }, []);

  // Quiet controls during playback when the pointer rests (keyboard focus always brings them back).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastWake = 0;
    const wake = () => {
      // pointermove fires per frame during a drag: re-arm the idle timer at most every 400 ms
      const now = performance.now();
      if (now - lastWake < 400) return;
      lastWake = now;
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 2600);
    };
    wake();
    const el = rootRef.current!;
    el.addEventListener("pointermove", wake);
    el.addEventListener("keydown", wake);
    el.addEventListener("focusin", wake);
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    const mq = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    const onMq = () => setMediaTick((n) => n + 1);
    mq?.addEventListener?.("change", onMq);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("pointermove", wake);
      el.removeEventListener("keydown", wake);
      el.removeEventListener("focusin", wake);
      document.removeEventListener("fullscreenchange", onFs);
      mq?.removeEventListener?.("change", onMq);
    };
  }, []);

  // Keyboard: Space / K toggles playback (unless a control that uses Space has focus, or a panel is open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!film || panel || document.querySelector("[role=dialog]")) return;
      const t = e.target as HTMLElement;
      const interactive = t.closest("button, input, [role=slider], summary, a, [role=dialog]");
      if ((e.key === " " && !interactive) || ((e.key === "k" || e.key === "K") && !t.closest("input, [role=dialog]"))) {
        e.preventDefault();
        film.timeline.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [film, panel]);


  // A browser refuses audio before a user gesture, so the first interaction anywhere in the film starts the narration.
  // Without this the learner would have to find the narration button specifically, having already pressed play.
  useEffect(() => {
    if (!film || !narration || !narrationBlocked) return;
    const start = () => {
      const p = narrator.current;
      if (!p) return;
      p.retryBlocked();
      const st = film.timeline.state;
      const running = st.playing && !st.buffering && st.learner !== "active" && !st.holdingForCheck;
      p.sync(st.shotId, st.localMs, running, `${st.shotId}|${st.seeks}|gesture`);
      setNarrationBlocked(p.blocked);
    };
    window.addEventListener("pointerdown", start, { once: true, capture: true });
    window.addEventListener("keydown", start, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", start, { capture: true });
      window.removeEventListener("keydown", start, { capture: true });
    };
  }, [film, narration, narrationBlocked]);

  // Announcements for state that has no visible focusable control of its own.
  const lastPlaying = useRef<boolean | null>(null);
  const playerObserved = useRef<HTMLElement | null>(null);
  /** The challenge has already been offered on this visit to the recall chapter. */
  const recallTaken = useRef(false);
  /** Width of the chapter strip, so nine markers can be spaced without overlapping on a narrow desktop. */
  const [stripWidth, setStripWidth] = useState(0);
  const stripObserved = useRef<HTMLElement | null>(null);
  const stripRef = (el: HTMLElement | null) => {
    if (!el || stripObserved.current === el) return;
    stripObserved.current = el;
    const publish = () => setStripWidth(Math.round(el.getBoundingClientRect().width));
    publish();
    new ResizeObserver(publish).observe(el);
  };
  useEffect(() => {
    if (!film || !state) return;
    if (lastPlaying.current !== null && lastPlaying.current !== state.playing && !state.ended) announce(film.locale.strings[state.playing ? "ui.playing" : "ui.paused"].text);
    lastPlaying.current = state.playing;
  }, [state?.playing]);
  useEffect(() => {
    if (film && state?.ended) announce(film.locale.strings["ui.complete"].text);
  }, [state?.ended]);
  useEffect(() => {
    if (!state?.buffering) {
      setShowBuffering(false);
      return;
    }
    // Only show a loading state when an asset is genuinely late (no flicker for fast loads).
    const t = setTimeout(() => {
      setShowBuffering(true);
      if (film) announce(film.locale.strings["ui.loading_part"].text);
    }, 400);
    return () => clearTimeout(t);
  }, [state?.buffering]);
  const selection = store?.selection.value ?? null;
  useEffect(() => {
    if (film && selection) announce(`${film.locale.strings["ui.selected"].text}: ${selection.label}`);
  }, [selection?.structureId]);

  const t = (k: string) => film!.locale.strings[k].text;
  const chapterId = state ? film!.lesson.chapters[state.chapterIndex].id : null;
  const chapterExplore = (film?.lesson.explores ?? []).find((e) => e.chapterId === chapterId) ?? null;
  const openExplore = (film?.lesson.explores ?? []).find((e) => e.exploreId === exploreId) ?? null;

  /**
   * Read the session and note how far the learner has got. The task is judged on the furthest position reached on each
   * axis, not the current one, so letting go does not undo it - and a joint that springs back (the fixed one) can still
   * be "tried".
   */
  const refreshReadout = (config = openExplore) => {
    const s = film?.runtime.exploreSession;
    const r = s ? s.readout() : null;
    setExploreReadout(r);
    if (!r || !config?.task) return;
    const peak = taskPeak.current;
    peak.primary = Math.max(peak.primary, Math.abs(r.primary));
    peak.secondary = Math.max(peak.secondary, Math.abs(r.secondary ?? 0));
    if (taskDoneRef.current !== config.exploreId && taskDone(config.task.goal, peak)) {
      taskDoneRef.current = config.exploreId;
      setTaskDoneId(config.exploreId);
      announce(t(config.task.doneKey));
      narrator.current?.playCue(config.task.doneKey);
    }
  };
  /** `handover` marks an exploration the film opened by itself: leaving one of those carries the lesson on. */
  const enterExplore = async (config = chapterExplore, handover = false) => {
    if (!film || !config) return;
    handedOver.current = handover;
    const active = document.activeElement as HTMLElement | null;
    exploreOpener.current = active && active !== document.body ? active : null;
    film.timeline.pause();
    await film.runtime.openExplore(config);
    // the wait above is a real one on a cold cache: anything that started the film meanwhile must not run on behind the panel
    film.timeline.pause();
    taskPeak.current = { primary: 0, secondary: 0 };
    taskDoneRef.current = null;
    setTaskDoneId(null);
    setExploreId(config.exploreId);
    refreshReadout(config);
    const instruction = config.task ? t(config.task.promptKey) : t(config.instructionKey);
    announce(`${t(config.titleKey)}. ${instruction}`);
    narrator.current?.playCue(config.task ? config.task.promptKey : config.instructionKey);
  };
  const leaveExplore = () => {
    if (!film) return;
    narrator.current?.stopCue();
    film.runtime.closeExplore(film.timeline.entries[film.timeline.state.shotIndex].shot);
    setExploreId(null);
    setExploreReadout(null);
    taskDoneRef.current = null;
    handedOver.current = false;
    setTaskDoneId(null);
  };
  /** Leaving an exploration the film handed over to: the lesson carries on where it was. */
  const endExplore = () => {
    leaveExplore();
    film?.timeline.play();
  };
  const resetExplore = () => {
    film?.runtime.exploreSession?.reset();
    // the task itself is not un-done by a reset: the learner has already shown they can do it
    taskPeak.current = { primary: 0, secondary: 0 };
    refreshReadout();
  };

  const startRecall = async () => {
    if (!film?.lesson.recall) return;
    film.timeline.pause();
    // the challenge lights individual bones, and the learner may have jumped straight to this chapter
    await film.runtime.ensureGroupedBody();
    // the wait above is a real one on a cold cache: anything that started the film meanwhile must not run on behind the panel
    film.timeline.pause();
    const sequence = recall.current ?? new RecallSequence(film.lesson.recall);
    recall.current = sequence;
    const next = sequence.restart();
    film.runtime.presentRecallStep(next.step);
    setRecallState(next);
    announce(t(next.step.questionKey));
    narrator.current?.playCue(next.step.questionKey);
  };
  const answerRecall = (optionId: string) => {
    const sequence = recall.current;
    if (!sequence || !film) return;
    const status = sequence.answer(optionId);
    setRecallState(sequence.state);
    announce(status === "correct" ? `${t(film.lesson.recall!.correctKey)} ${t(sequence.state.step.revealKey)}` : t(film.lesson.recall!.incorrectKey));
    narrator.current?.playCue(status === "correct" ? sequence.state.step.revealKey : film.lesson.recall!.incorrectKey);
  };
  const nextRecall = () => {
    const sequence = recall.current;
    if (!sequence || !film) return;
    const next = sequence.next();
    if (next.status === "complete") {
      // The body map is the conclusion, not the substitute: the film carries the learner into it, and only now.
      announce(t(film.lesson.recall!.completeKey));
      narrator.current?.playCue(film.lesson.recall!.completeKey);
      closeRecall(true);
      const here = film.lesson.chapters.findIndex((c) => c.id === film.lesson.recall!.chapterId);
      if (here >= 0 && here + 1 < film.lesson.chapters.length) {
        film.timeline.seekChapter(here + 1);
        film.timeline.play();
      }
      return;
    }
    setRecallState(next);
    film.runtime.presentRecallStep(next.step);
    announce(t(next.step.questionKey));
    narrator.current?.playCue(next.step.questionKey);
  };
  /** Close the panel and restore the shot; the film clock has not moved. */
  const closeRecall = (keepSpeaking = false) => {
    if (!film) return;
    // The completion line used to be stopped in the same call stack that started it, so the learner heard a fragment
    // of it at most. It now keeps the floor, and the body map's narration waits its turn (Step 16C).
    if (!keepSpeaking) narrator.current?.stopCue();
    recallTaken.current = true;
    setRecallState(null);
    recall.current = null;
    film.runtime.applyShot(film.timeline.entries[film.timeline.state.shotIndex].shot, { cut: true, reduced });
  };
  /** Leaving the challenge early (Escape, or the return button) lets the film run on to the body map. */
  const endRecall = () => {
    if (!film) return;
    closeRecall();
    film.timeline.play();
  };

  // The recall challenge is a chapter of its own: reaching its shot hands the film over to the learner. It is offered
  // once per visit - leaving the chapter arms it again, so a learner who scrubs back can take it again.
  useEffect(() => {
    const cfg = film?.lesson.recall;
    if (!film || !cfg?.shotId || !state) return;
    if (chapterId !== cfg.chapterId) {
      recallTaken.current = false;
      return;
    }
    if (state.shotId !== cfg.shotId || recallState || recallTaken.current || exploreId) return;
    void startRecall();
  }, [state?.shotId, chapterId, recallState, exploreId]);

  /**
   * Step 16B: every category chapter hands the learner the joint, the way the recall chapter hands them the questions.
   * Before this, participation happened once in the whole lesson and only at the elbow - so three of the four
   * categories taught the learner that they were there to watch. Offered once per visit: leaving the chapter arms it
   * again, and a learner who would rather not can return to the lesson at any point.
   */
  useEffect(() => {
    if (!film || !state || recallState || exploreId || !started) return;
    const handover = (film.lesson.explores ?? []).find((e) => e.openAtShotId === state.shotId);
    if (!handover || exploreTaken.current[handover.exploreId]) return;
    // Wait until the shot has finished saying its line. Opening on entry cut the film off mid-sentence and started the
    // exploration's own cue over the top of it - about four seconds of two voices at once, measured in Step 16C.
    const clip = narrator.current?.clip(state.shotId) ?? null;
    const readyAt = clip ? clip.leadInMs + clip.durationMs : shot ? shot.durationMs * 0.6 : 0;
    if (state.localMs < readyAt) return;
    exploreTaken.current[handover.exploreId] = true;
    void enterExplore(handover, true);
  }, [state?.shotId, state?.localMs, recallState, exploreId, started]);

  useEffect(() => {
    // leaving a chapter arms its exploration again
    for (const e of film?.lesson.explores ?? []) if (e.chapterId !== chapterId) delete exploreTaken.current[e.exploreId];
  }, [chapterId]);

  // Retrieval belongs to its chapter. Escape returns to the lesson exactly as it does in an exploration, and leaving the
  // chapter - by scrubbing, by a chapter jump, or by playback running on - ends the sequence rather than leaving a
  // question hanging over a different part of the body.
  useEffect(() => {
    if (!recallState || !film?.lesson.recall) return;
    if (chapterId !== film.lesson.recall.chapterId) {
      // the learner has gone somewhere else: put the question away, but do not start the film for them
      closeRecall();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target as HTMLElement).closest("[role=dialog]")) return;
      e.preventDefault();
      endRecall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recallState, chapterId, film]);

  // Explore is fully operable from the keyboard: arrows move the joint, R resets, Escape returns to the lesson.
  useEffect(() => {
    if (!film || !exploreId) return;
    const onKey = (e: KeyboardEvent) => {
      const session = film.runtime.exploreSession;
      if (!session || (e.target as HTMLElement).closest("[role=dialog]")) return;
      const step = e.shiftKey ? 3 : 1;
      if (e.key === "ArrowLeft") session.step(-step, 0);
      else if (e.key === "ArrowRight") session.step(step, 0);
      else if (e.key === "ArrowUp") session.step(0, -step);
      else if (e.key === "ArrowDown") session.step(0, step);
      else if (e.key === "r" || e.key === "R") session.reset();
      else if (e.key === "Escape") {
        // an exploration the film handed over to returns the learner to the lesson, running
        if (handedOver.current) endExplore();
        else leaveExplore();
        return;
      } else return;
      e.preventDefault();
      refreshReadout();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [film, exploreId, openExplore]);

  // Pointer drag inside an exploration. The joint asset has its own drag gesture (the validated rig); a teaching
  // simulation is driven here, from the same stage element, so both feel identical to the learner.
  useEffect(() => {
    if (!film || !exploreId || !openExplore || openExplore.motion.kind === "dof") return;
    const stage = stageRef.current;
    if (!stage) return;
    let pointer: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* no active pointer: dragging still works without capture */
      }
    };
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      const session = film.runtime.exploreSession;
      if (!session) return;
      session.drag(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      refreshReadout();
    };
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      film.runtime.exploreSession?.endGesture();
      const tick = () => {
        if (film.runtime.exploreSession?.tick()) requestAnimationFrame(tick);
        else refreshReadout();
      };
      requestAnimationFrame(tick);
    };
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    return () => {
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
    };
  }, [film, exploreId, openExplore]);
  const narrationOn = narration && !narrationBlocked;
  const resyncNarration = (enabled: boolean) => {
    const p = narrator.current;
    if (!p || !state || !enabled) return;
    const running = state.playing && !state.buffering && state.learner !== "active" && !state.holdingForCheck;
    // A fresh key forces the clip to be re-positioned from the film's current time.
    p.sync(state.shotId, state.localMs, running, `${state.shotId}|${state.seeks}|${performance.now()}`);
  };
  const toggleNarration = () => {
    const p = narrator.current;
    if (narrationBlocked) {
      // This click is the user gesture the browser was waiting for.
      setNarrationBlocked(false);
      p?.retryBlocked();
      p?.setEnabled(true);
      setNarration(true);
      writeSetting("joints.narration", null);
      resyncNarration(true);
      return;
    }
    const next = !narration;
    setNarration(next);
    writeSetting("joints.narration", next ? null : "off");
    p?.setEnabled(next);
    resyncNarration(next);
  };
  const shot = film && state ? film.timeline.entries[state.shotIndex].shot : null;
  const chapter = film && state ? film.lesson.chapters[state.chapterIndex] : null;
  /**
   * The learner's own gesture: it starts the film and, in the same call stack, tells the narration player to try again.
   * A browser only grants audio permission inside a real user gesture, so this has to be the click handler itself.
   */
  const startLesson = () => {
    setStarted(true);
    const p = narrator.current;
    if (p && narration) {
      p.retryBlocked();
      p.setEnabled(true);
    }
    film?.timeline.play();
    setNarrationBlocked(p?.blocked ?? false);
  };
  const replayLesson = () => {
    exploreTaken.current = {};
    recallTaken.current = false;
    film?.timeline.replay();
  };
  const restartRecall = () => {
    if (!film?.lesson.recall) return;
    const at = film.lesson.chapters.findIndex((c) => c.id === film.lesson.recall!.chapterId);
    recallTaken.current = false;
    if (at >= 0) film.timeline.seekChapter(at);
    void startRecall();
  };
  /**
   * Chapter markers sit where their chapter starts, which is what makes the strip a map of the film. With nine chapters
   * a short one (the recall challenge is a few seconds of film) can start closer to its neighbour than a 44 px target is
   * wide, and two markers would then overlap. Positions are nudged apart to keep every target reachable, forwards and
   * then backwards so the last marker stays on screen; the order and the approximate mapping to time are preserved.
   */
  const markerLeft = (spans: { start: number }[], duration: number, width: number): number[] => {
    const MIN = 46;
    if (!width || !spans.length) return spans.map((sp) => (sp.start / duration) * Math.max(width, 1));
    const x = spans.map((sp) => (sp.start / duration) * width);
    for (let i = 1; i < x.length; i++) x[i] = Math.max(x[i], x[i - 1] + MIN);
    for (let i = x.length - 1; i >= 0; i--) {
      const limit = i === x.length - 1 ? width - MIN : x[i + 1] - MIN;
      x[i] = Math.min(x[i], Math.max(0, limit));
    }
    return x;
  };

  const chapterSpans = useMemo(() => (film ? film.lesson.chapters.map((c, i) => ({ c, start: film.timeline.chapterStartMs(i), end: i + 1 < film.lesson.chapters.length ? film.timeline.chapterStartMs(i + 1) : film.timeline.durationMs })) : []), [film]);
  const chapterMarkerX = useMemo(() => markerLeft(chapterSpans, film?.timeline.durationMs ?? 1, stripWidth), [chapterSpans, stripWidth, film]);
  const status = store?.status.value;
  const quiet = idle && !!state?.playing && state.learner !== "active" && !panel;
  const guided = !!shot && shot.interaction.mode === "guided" && shot.joint.visible;
  // Joint controls exist only once the deferred joint asset is attached and the shot is no longer buffering.
  const jointReady = !!app?.jointAttached && !state?.buffering;
  // While an exploration is open it owns the interaction: the lesson panel would otherwise show a second identical slider.
  const showJointControls = !exploreId && jointReady && (guided || (!!state?.explore && !!shot?.joint.visible));
  const promptKey = shot ? (shot.interaction.check?.promptKey ?? shot.interaction.promptKey) : undefined;
  const panelPromptKey = promptKey && shot && promptKey !== shot.caption.textKey && promptKey !== shot.caption.titleKey ? promptKey : undefined;

  /**
   * A panel on the stage owns its rectangle, and labels are laid out around it (Step 16D).
   *
   * At 1280x800 the exploration panel runs to x = 424 while the site label started at x = 364-399, so the learner read
   * "...ot joint - top of the neck". The panel measures itself and hands the rectangle to the label system, which slides
   * an affected label clear instead of letting it disappear behind the panel.
   */
  /*
   * Step 16E: the camera uses the same measurement. While an exploration is open the subject is composed into the stage
   * the panel leaves free (and, on a narrow screen, below the top bar), so the joint the learner is asked to move is
   * never underneath the card that asks them to move it.
   */
  const panelObserved = useRef<HTMLElement | null>(null);
  const panelWatch = useRef<(() => void) | null>(null);
  /*
   * Focus follows the player out and back (Step 16E). On a narrow screen the control that opened the exploration leaves
   * with the player; a keyboard user must not be left focused on nothing, so focus moves into the panel. When the panel
   * closes and focus has nowhere to be, it goes back to the control that opened it.
   */
  const exploreOpener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = stageRef.current?.closest(".film");
    if (!root) return;
    if (exploreId) {
      // the opener was recorded when the exploration was asked for: by now the browser may already have blurred it
      const opener = exploreOpener.current;
      if (opener && opener.getClientRects().length === 0) root.querySelector<HTMLElement>('[data-testid="film-explore-panel"]')?.focus();
      return;
    }
    const opener = exploreOpener.current ?? root.querySelector<HTMLElement>('[data-testid="film-explore"]');
    exploreOpener.current = null;
    if ((!document.activeElement || document.activeElement === document.body) && opener?.isConnected && opener.getClientRects().length) opener.focus();
  }, [exploreId]);
  const panelRef = (el: HTMLElement | null) => {
    // the label system exists only once the app has started; a panel can mount before that on a slow first load
    const labels = app?.labels;
    if (!labels) return;
    if (!el) {
      panelWatch.current?.();
      panelWatch.current = null;
      labels.reserved = null;
      panelObserved.current = null;
      labels.invalidate();
      film?.runtime.setExploreReserve(null);
      return;
    }
    if (panelObserved.current === el) return;
    panelWatch.current?.();
    panelObserved.current = el;
    const publish = () => {
      const stage = stageRef.current?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (!stage || !r.width) return;
      const panel = { left: r.left - stage.left, top: r.top - stage.top, right: r.right - stage.left, bottom: r.bottom - stage.top };
      labels.reserved = panel;
      labels.invalidate();
      const bar = el.closest(".film")?.querySelector(".film-top")?.getBoundingClientRect();
      film?.runtime.setExploreReserve({ panel, topInset: bar ? bar.bottom - stage.top : 0 });
    };
    publish();
    // the panel's size changes with its content; its position changes with the viewport (it is anchored to the bottom)
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    addEventListener("resize", publish);
    panelWatch.current = () => {
      observer.disconnect();
      removeEventListener("resize", publish);
    };
  };
  /*
   * Step 16F: with no panel open, the current-topic heading at the top left owns its rectangle instead. The heading
   * reaches lower than the top bar the labels already keep clear of, and on the body map a site label ("Fixed", at the
   * skull) landed under it on a phone. The same pre-pass that keeps labels out from under a panel slides it clear.
   */
  const leadEl = useRef<HTMLDivElement | null>(null);
  const leadWatch = useRef<(() => void) | null>(null);
  const publishLeadLatest = useRef<() => void>(() => undefined);
  // Attached when the lead mounts - it only exists once the film has a shot to show, well after the app starts - and
  // stable across renders, so the observer is not torn down and rebuilt on every frame the film re-renders.
  const leadRef = useCallback((el: HTMLDivElement | null) => {
    if (el === leadEl.current) return;
    leadWatch.current?.();
    leadWatch.current = null;
    leadEl.current = el;
    if (!el) return;
    // the heading changes size with each shot's text, and position with the viewport
    const publish = () => publishLeadLatest.current();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    addEventListener("resize", publish);
    leadWatch.current = () => {
      observer.disconnect();
      removeEventListener("resize", publish);
    };
    publish();
  }, []);
  const publishLead = () => {
    const labels = app?.labels;
    if (!labels || panelObserved.current) return;
    const stage = stageRef.current?.getBoundingClientRect();
    // the layout box, not the painted one: the caption eases in from a small offset, and a rectangle measured mid-fade
    // would be a few pixels off for as long as the shot lasts (a transform does not trigger the resize observer)
    const lead = leadEl.current;
    const cap = lead?.querySelector<HTMLElement>('[data-testid="film-caption"]');
    const l = lead?.getBoundingClientRect();
    const next =
      stage && l && cap && cap.offsetWidth
        ? { left: l.left - stage.left + cap.offsetLeft, top: l.top - stage.top + cap.offsetTop, right: l.left - stage.left + cap.offsetLeft + cap.offsetWidth, bottom: l.top - stage.top + cap.offsetTop + cap.offsetHeight }
        : null;
    const cur = labels.reserved;
    if (cur === next || (cur && next && cur.left === next.left && cur.top === next.top && cur.right === next.right && cur.bottom === next.bottom)) return;
    labels.reserved = next;
    labels.invalidate();
    // invalidate() only drops the layout cache: a paused film renders nothing until asked, so ask
    app?.loop.requestRender();
  };
  publishLeadLatest.current = publishLead;
  useEffect(() => {
    // the rectangle belongs to whichever panel is open; with none open, it is the heading's
    if (!app?.labels || exploreId || recallState) return;
    panelWatch.current?.();
    panelWatch.current = null;
    app.labels.reserved = null;
    panelObserved.current = null;
    publishLead();
    app.labels.invalidate();
    film?.runtime.setExploreReserve(null);
  }, [app, exploreId, recallState]);

  const scrubRef = useRef<HTMLDivElement>(null);
  // The control row wraps when a chapter offers more than one action, so the player is not a fixed height. Publish the
  // height it actually has; the caption, the joint panel and the explore/recall panels clear that instead of a constant.
  const playerRef = (el: HTMLElement | null) => {
    if (!el || playerObserved.current === el) return;
    playerObserved.current = el;
    const root = rootRef.current;
    // a player hidden for an exploration (narrow screens, Step 16E) keeps its last height, ready for when it returns
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) root?.style.setProperty("--film-player-h", `${h}px`);
    };
    publish();
    new ResizeObserver(publish).observe(el);
  };
  const seekFromPointer = (clientX: number) => {
    const r = scrubRef.current!.getBoundingClientRect();
    film!.timeline.seek(((clientX - r.left) / r.width) * film!.timeline.durationMs);
  };
  const saveMotion = (m: MotionSetting) => {
    setMotion(m);
    writeSetting("joints.motion", m === "system" ? null : m);
  };
  const saveCaptions = (c: CaptionSetting) => {
    setCaptions(c);
    writeSetting("joints.captions", c === "standard" ? null : c);
    app?.labels.invalidate();
  };
  const saveQuality = (q: QualityTier | "auto") => {
    setQualityChoice(q);
    writeSetting("joints.quality", q === "auto" ? null : q);
  };
  const currentTier = app?.quality?.tier ?? null;
  const pendingQuality = currentTier !== null && (qualityChoice === "auto" ? app?.quality?.source === "override" && !params.get("quality") : qualityChoice !== currentTier);

  return (
    <main
      class={`film ${quiet ? "is-quiet" : ""} ${state?.explore ? "is-explore" : ""}`}
      ref={rootRef}
      data-testid="film"
      data-chapter={state?.chapterId ?? ""}
      data-shot={state?.shotId ?? ""}
      data-motion={reduced ? "reduce" : "full"}
      data-captions={captions}
      data-buffering={state?.buffering ? "true" : undefined}
    >
      <div class="film-stage" ref={stageRef} data-testid="stage" role="img" aria-label={shot && film ? t(shot.a11yKey) : `${content.title} 3D film`} />
      <div class="film-vignette" aria-hidden="true" />

      {(status?.phase === "loading" || (!film && !error && status?.phase !== "error")) && (
        <div class="film-loading" role="status" aria-live="polite" data-testid="loading">
          <p class="film-loading__title">Types of Joints</p>
          <p class="film-loading__step">{status?.phase === "loading" ? status.step : "Preparing the film"}…</p>
        </div>
      )}
      {(error || status?.phase === "error") && (
        <div class="film-loading film-loading--error" role="alert" data-testid="error">
          <p class="film-loading__title">The lesson could not be loaded.</p>
          <p class="film-loading__detail">{error ?? (status?.phase === "error" ? status.message : "")}</p>
          <button type="button" class="film-btn" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      )}

      {/*
        The lesson used to begin playing the moment the page loaded. That gave the learner no idea what they had walked
        into and - on a browser with the ordinary autoplay policy - no narration either, silently, for four and a half
        minutes. Start lesson sets the expectation and is the user gesture audio needs.
      */}
      {film && !started && (
        <div class="film-start" data-testid="film-start">
          <div class="film-start__card">
            <p class="film-start__eyebrow">{t("ui.start_meta")}</p>
            <h1 class="film-start__title">{t(film.lesson.titleKey)}</h1>
            <p class="film-start__thesis">{t("ui.start_thesis")}</p>
            <button type="button" class="film-btn film-btn--primary film-start__go" data-testid="film-start-button" onClick={startLesson}>
              {t("ui.start_lesson")}
            </button>
            <p class="film-start__sound">{t("ui.start_sound")}</p>
          </div>
        </div>
      )}

      {film && state && shot && chapter && (
        <>
          <header class="film-top">
            <p class="film-top__brand">{t(film.lesson.titleKey)}</p>
            <p class="film-top__chapter" data-testid="film-chapter" key={chapter.id}>
              <span class="film-top__num">{chapter.number}</span> {t(chapter.titleKey)}
            </p>
            <div class="film-top__actions">
              <button
                type="button"
                class={`film-icon ${narrationBlocked ? "is-attention" : ""}`}
                data-testid="film-narration"
                aria-pressed={narrationOn}
                aria-label={narrationBlocked ? t("ui.narration_blocked") : narrationOn ? t("ui.narration_off") : t("ui.narration_on")}
                title={narrationBlocked ? t("ui.narration_blocked") : narrationOn ? t("ui.narration_off") : t("ui.narration_on")}
                onClick={toggleNarration}
              >
                {narrationOn ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 2v2a8 8 0 0 1 0 16v2a10 10 0 0 0 0-20z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9.5 20.5 14M20.5 9.5 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" /></svg>
                )}
              </button>
              {/*
                Step 16D: "Sources & draft status" used to sit beside the chapter title on all 52 shots. It is teacher
                and reviewer material, not teaching material, so it now lives one deliberate step away - inside
                Settings, under "For teachers". Nothing was removed: the dialog and everything in it are unchanged.
              */}
              <button type="button" class="film-icon film-top__settings" aria-haspopup="dialog" aria-expanded={panel === "settings"} aria-label={t("ui.settings")} onClick={() => setPanel("settings")} data-testid="settings-toggle">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
              </button>
            </div>
          </header>

          {/*
            The honest statement that the animated marks show a kind of movement rather than a measured one. It used to
            sit under fifteen captions in reviewer language, which taught a Class 10 learner nothing and invited the
            question "then what am I looking at?". It is now said once, quietly, for exactly as long as those marks are
            on screen - and the full technical wording lives in Sources & draft status for a teacher or reviewer.
          */}
          {/*
            The lead (Step 16F): what the learner is learning, at the top left under the chapter line - the current topic,
            then the teaching-view status beneath it. One place, one grammar, for every chapter.
          */}
          <div class="film-lead" ref={leadRef}>
            {/* the landing card and the completion card own the frame; a caption underneath one is text the learner cannot read */}
            {!exploreId && !recallState && started && !state.ended && <Caption shot={shot} state={state} locale={film.locale} reduced={reduced} />}
            {!!shot?.overlays.concepts.length && !exploreId && !recallState && (
              <p class="film-teachmark" data-testid="film-teachmark">{t("ui.teaching_view")}</p>
            )}
          </div>

          {panel === "sources" && (
            <FilmDialog id="film-sources" title={t("ui.sources")} testid="sources" onClose={() => setPanel(null)}>
              <p>{t(film.lesson.curriculum.noteKey)}</p>
              <dl>
                {(["source-excerpt", "figure-reference", "draft-enrichment"] as const).map((p) => (
                  <div key={p}>
                    <dt>
                      {p === "source-excerpt" ? "Source excerpt" : p === "figure-reference" ? "NCERT figure reference" : "Draft"}
                      {p !== "figure-reference" && <Badge entry={{ text: "", provenance: p }} locale={film.locale} />}
                    </dt>
                    <dd>{film.locale.provenanceLegend[p]}</dd>
                  </div>
                ))}
              </dl>
              <p class="film-dialog__small" data-testid="sources-classification">
                Every line in this lesson carries one of these classifications in the content itself. The markers are
                shown here rather than over the lesson, where they competed with the anatomy; the classification is
                unchanged, and every draft line still requires subject-expert review before release.
              </p>
              <p class="film-dialog__small">
                The 0–145° elbow range is an approximate teaching range. Normative reference: Zwerus et al., “Normative values and affecting factors for the elbow range of
                motion”, Shoulder &amp; Elbow 11(3):215–224 (2019), doi:10.1177/1758573217728711 — mean active flexion 146° across 352 healthy adults; elbow range varies with
                age, sex and BMI. The reference supports the choice of teaching range. It does not validate this model’s geometry, and no subject expert has reviewed this
                lesson yet. Source anatomy licence: pending.
              </p>
              <p class="film-dialog__small" data-testid="sources-validation">
                What moves, and how. {t("note.recap_schematic")} {t("note.schematic_indicator")} The blue line at the elbow is the hinge axis fitted to this 3D model. The
                skull, neck and shoulder explorations move whole groups of bones to demonstrate a kind of movement; they are not measured joint models.
              </p>
            </FilmDialog>
          )}

          {panel === "settings" && (
            <FilmDialog id="film-settings" title={t("ui.settings")} testid="settings" onClose={() => setPanel(null)}>
              <RadioGroup
                name="quality"
                legend={t("ui.quality")}
                value={qualityChoice}
                onChange={saveQuality}
                options={[
                  { value: "auto", label: t("ui.quality_auto"), detail: app?.quality?.source === "auto" ? `(${t("ui.current_quality").toLowerCase()}: ${t(`ui.quality_${app.quality.tier}`)})` : undefined },
                  { value: "high", label: t("ui.quality_high") },
                  { value: "medium", label: t("ui.quality_medium") },
                  { value: "low", label: t("ui.quality_low") },
                ]}
              />
              <p class="film-dialog__small" id="quality-note">{t("ui.quality_note")}</p>
              {pendingQuality && (
                <button type="button" class="film-btn" data-testid="setting-reload" onClick={() => location.reload()}>
                  {t("ui.reload")}
                </button>
              )}
              <RadioGroup
                name="motion"
                legend={t("ui.motion")}
                value={motion}
                onChange={saveMotion}
                options={[
                  { value: "system", label: t("ui.motion_system"), detail: `(${systemReducedMotion() ? t("ui.motion_reduce") : t("ui.motion_full")})`.toLowerCase() },
                  { value: "reduce", label: t("ui.motion_reduce") },
                  { value: "full", label: t("ui.motion_full") },
                ]}
              />
              <RadioGroup
                name="captions"
                legend={t("ui.captions")}
                value={captions}
                onChange={saveCaptions}
                options={[
                  { value: "standard", label: t("ui.captions_standard") },
                  { value: "large", label: t("ui.captions_large") },
                ]}
              />
              <h3 class="film-setting__legend">{t("ui.shortcuts")}</h3>
              <p class="film-dialog__small">{t("ui.shortcuts_text")}</p>
              <h3 class="film-setting__legend">{t("ui.for_teachers")}</h3>
              <button type="button" class="film-btn" aria-haspopup="dialog" data-testid="sources-toggle" onClick={() => setPanel("sources")}>
                {t("ui.sources")}
              </button>
            </FilmDialog>
          )}

          {/* the joint panel already carries the prompt on a guided shot, and on a phone it owns the bottom of the frame */}
          {!exploreId && !recallState && !state.ended && started && !showJointControls && <Subtitle shot={shot} state={state} locale={film.locale} clip={narrator.current?.clip(shot.id) ?? null} reduced={reduced} />}

          {showBuffering && (
            <p class="film-buffering" data-testid="film-buffering" aria-hidden="true">
              <span class="film-buffering__dot" /> {t("ui.loading_part")}…
            </p>
          )}
          {state.loadError && (
            <div class="film-alert" role="alert" data-testid="film-load-error">
              <p>{t("ui.load_error")}</p>
              <button type="button" class="film-btn" data-testid="film-retry" onClick={() => film.timeline.seek(state.timeMs)}>
                {t("ui.retry")}
              </button>
            </div>
          )}

          {showJointControls && app && store && (
            <section class="film-interact" aria-label={panelPromptKey ? "Move the elbow" : undefined} aria-labelledby={panelPromptKey ? undefined : "film-caption-text"} data-testid="film-interact">
              {/* One prompt: when the caption already shows the prompt text, the panel is labelled by it instead of repeating it. */}
              {panelPromptKey && <p class="film-interact__prompt" data-testid="film-interact-prompt">{t(panelPromptKey)}</p>}
              <JointSliders app={app} store={store} content={content} />
              {shot.interaction.check && (
                <div class="film-interact__check">
                  <button type="button" class="film-btn" data-testid="film-check" onClick={() => film.timeline.answerCheck()}>
                    {t("ui.check")}
                  </button>
                  <p class={`film-interact__feedback is-${state.check.status}`} role="status" data-testid="film-check-feedback">
                    {state.check.status === "correct" ? t(shot.interaction.check.correctKey) : state.check.status === "incorrect" ? t(shot.interaction.check.incorrectKey) : ""}
                  </p>
                </div>
              )}
              {(state.learner === "active" || state.explore || state.holdingForCheck) && (
                <button type="button" class="film-btn film-btn--primary" data-testid="film-resume" onClick={() => (state.holdingForCheck ? film.timeline.continuePastCheck() : film.timeline.resume())}>
                  {state.holdingForCheck ? t("ui.continue") : t("ui.resume")}
                </button>
              )}
            </section>
          )}
          {recallState && film.lesson.recall && (
            <section class="film-recall" ref={panelRef} data-testid="film-recall" aria-label={t(film.lesson.recall.promptKey)}>
              <p class="film-recall__progress">
                {t("ui.recall_progress")} {recallState.index + 1} / {recallState.total}
              </p>
              <p class="film-recall__question" data-testid="film-recall-question">
                {t(recallState.step.questionKey)}
              </p>
              <p class="film-recall__prompt">{t(film.lesson.recall.promptKey)}</p>
              <div class="film-recall__options" role="group" aria-label={t("ui.recall_answer")}>
                {film.lesson.recall.options.map((o) => {
                  const chosen = recallState.tried.includes(o.optionId);
                  const isAnswer = o.optionId === recallState.step.answer;
                  const settled = recallState.status === "correct";
                  return (
                    <button
                      key={o.optionId}
                      type="button"
                      class={`film-recall__option ${chosen && !isAnswer ? "is-wrong" : ""} ${settled && isAnswer ? "is-right" : ""}`}
                      data-testid={`film-recall-option-${o.optionId}`}
                      aria-pressed={chosen}
                      disabled={settled}
                      onClick={() => answerRecall(o.optionId)}
                    >
                      {t(o.labelKey)}
                    </button>
                  );
                })}
              </div>
              <p class={`film-recall__feedback is-${recallState.status}`} data-testid="film-recall-feedback" role="status">
                {recallState.status === "correct" ? `${t(film.lesson.recall.correctKey)} ${t(recallState.step.revealKey)}` : recallState.status === "incorrect" ? t(film.lesson.recall.incorrectKey) : ""}
              </p>
              <div class="film-recall__actions">
                {recallState.status === "correct" && (
                  <button type="button" class="film-btn film-btn--primary" data-testid="film-recall-next" onClick={nextRecall}>
                    {recallState.index + 1 >= recallState.total ? t("ui.recall_finish") : t("ui.recall_next")}
                  </button>
                )}
                <button type="button" class="film-btn" data-testid="film-recall-exit" onClick={endRecall}>
                  {t("ui.explore_return")}
                </button>
              </div>
            </section>
          )}

          {openExplore && (
            <section class="film-explore" ref={panelRef} data-testid="film-explore-panel" aria-label={t(openExplore.titleKey)} tabIndex={-1}>
              <div class="film-explore__head">
                <h2 class="film-explore__title">{t(openExplore.titleKey)}</h2>
                <span class={`film-explore__status film-explore__status--${openExplore.status === "validated-rig" ? "validated" : "teaching"}`} data-testid="film-explore-status" data-status={openExplore.status}>
                  {t(openExplore.statusKey)}
                </span>
              </div>
              {openExplore.status !== "validated-rig" && (
                <p class="film-explore__teaching" data-testid="film-explore-teaching">{t("ui.explore_teaching_note")}</p>
              )}
              {/* The task is what the learner is here to do; the drag instruction below it is how to do it. */}
              {openExplore.task && (
                <p class={`film-explore__task ${taskDoneId === openExplore.exploreId ? "is-done" : ""}`} data-testid="film-explore-task" data-done={taskDoneId === openExplore.exploreId ? "true" : "false"}>
                  <span class="film-explore__task-label">{t("ui.task")}</span> {t(openExplore.task.promptKey)}
                </p>
              )}
              <p class="film-explore__instruction" data-testid="film-explore-instruction">
                {t(openExplore.instructionKey)}
              </p>
              <p class={`film-explore__readout ${openExplore.motion.kind === "dof" ? "film-explore__readout--dof" : ""}`} data-testid="film-explore-readout" role="status">
                {openExplore.motion.kind === "resist"
                  ? exploreReadout && Math.abs(exploreReadout.primary) > 0.05
                    ? t(openExplore.explanationKey)
                    : ""
                  : exploreReadout
                    ? `${Math.round(exploreReadout.primary)}°${exploreReadout.secondary !== null ? ` · ${Math.round(exploreReadout.secondary)}°` : ""}`
                    : ""}
              </p>
              {openExplore.task && taskDoneId === openExplore.exploreId && (
                <p class="film-explore__done" data-testid="film-explore-task-done" role="status">
                  {t(openExplore.task.doneKey)}
                </p>
              )}
              <p class="film-explore__explanation">{t(openExplore.explanationKey)}</p>
              {openExplore.motion.kind === "dof" && app && store && jointReady && (
                // The validated joint keeps its own validated control: the same slider the lesson uses, on the same
                // setDof path. A teaching simulation has no such control - it is dragged and stepped, not dialled.
                <div class="film-explore__control">
                  <JointSliders app={app} store={store} content={content} />
                </div>
              )}
              <p class="film-explore__keys film-dialog__small">{t("ui.explore_keys")}</p>
              <div class="film-explore__actions">
                <button type="button" class="film-btn" data-testid="film-explore-reset" onClick={resetExplore}>
                  {t("ui.explore_reset")}
                </button>
                <button type="button" class="film-btn film-btn--primary" data-testid="film-explore-exit" onClick={() => (handedOver.current ? endExplore() : leaveExplore())}>
                  {t("ui.explore_return")}
                </button>
              </div>
            </section>
          )}

          {/*
            The film used to stop, leaving the learner on a still frame with no way of telling whether that was the end.
            This is a close, not a dashboard: it says the lesson finished and offers the three things worth doing next.
          */}
          {state.ended && !exploreId && !recallState && (
            <div class="film-end" data-testid="film-end" role="group" aria-label={t("ui.complete_title")}>
              <p class="film-end__title">{t("ui.complete_title")}</p>
              <div class="film-end__actions">
                <button type="button" class="film-btn film-btn--primary" data-testid="film-end-replay" onClick={replayLesson}>
                  {t("ui.complete_replay")}
                </button>
                {film.lesson.recall && (
                  <button type="button" class="film-btn" data-testid="film-end-recall" onClick={restartRecall}>
                    {t("ui.complete_recall")}
                  </button>
                )}
                <button type="button" class="film-btn" data-testid="film-end-explore" onClick={() => film.timeline.setExplore(true)}>
                  {t("ui.complete_explore")}
                </button>
              </div>
            </div>
          )}

          {/* the free-orbit hint would contradict the explore instruction, so it yields while a session is open */}
          {!exploreId && state.explore && !shot.joint.visible && (
            <p class="film-explore-hint">
              Drag to look around ·{" "}
              <button type="button" class="film-link" onClick={() => film.timeline.resume()}>
                {t("ui.return_guided")}
              </button>
            </p>
          )}

          <footer class="film-player" ref={playerRef} aria-label={t("ui.film_controls")}>
            <button type="button" class="film-icon" data-testid="film-play" aria-label={state.playing ? t("ui.pause") : t("ui.play")} onClick={() => film.timeline.toggle()}>
              {state.playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
              )}
            </button>
            <button type="button" class="film-icon" data-testid="film-replay" aria-label={t("ui.replay")} onClick={() => film.timeline.replay()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" /></svg>
            </button>

            <div class="film-timeline">
              <div
                class="film-timeline__track"
                ref={scrubRef}
                role="slider"
                tabIndex={0}
                aria-label={t("ui.timeline")}
                aria-valuemin={0}
                aria-valuemax={Math.round(film.timeline.durationMs / 1000)}
                aria-valuenow={Math.round(state.timeMs / 1000)}
                aria-valuetext={`${fmt(state.timeMs)} of ${fmt(film.timeline.durationMs)}, ${t(chapter.titleKey)}`}
                data-testid="film-scrubber"
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  seekFromPointer(e.clientX);
                }}
                onPointerMove={(e) => {
                  if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) seekFromPointer(e.clientX);
                }}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 15000 : 5000;
                  const map: Record<string, number> = { ArrowRight: state.timeMs + step, ArrowUp: state.timeMs + step, ArrowLeft: state.timeMs - step, ArrowDown: state.timeMs - step, Home: 0, End: film.timeline.durationMs };
                  if (e.key in map) {
                    e.preventDefault();
                    film.timeline.seek(map[e.key]);
                  }
                }}
              >
                {chapterSpans.map(({ c, start, end }, i) => (
                  <span key={c.id} class={`film-timeline__segment ${i === state.chapterIndex ? "is-current" : ""}`} style={{ left: `${(start / film.timeline.durationMs) * 100}%`, width: `${((end - start) / film.timeline.durationMs) * 100}%` }}>
                    <span class="film-timeline__fill" style={{ width: `${Math.min(100, Math.max(0, ((state.timeMs - start) / (end - start)) * 100))}%` }} />
                  </span>
                ))}
              </div>
              <ol class="film-chapters" ref={stripRef} aria-label={t("ui.chapters")}>
                {chapterSpans.map(({ c, start, end }, i) => (
                  <li key={c.id} style={{ "--start": `${chapterMarkerX[i]}px`, "--span": `${((end - start) / film.timeline.durationMs) * 100}%` }}>
                    <button
                      type="button"
                      class={`film-chapter ${i === state.chapterIndex ? "is-current" : ""}`}
                      aria-current={i === state.chapterIndex ? "true" : undefined}
                      aria-label={`${c.number} ${t(c.titleKey)}`}
                      data-testid={`film-chapter-${c.id}`}
                      onClick={() => film.timeline.seekChapter(i)}
                      onFocus={() => film.timeline.preloadChapter(i)}
                      onPointerEnter={() => film.timeline.preloadChapter(i)}
                    >
                      <span class="film-chapter__num" aria-hidden="true">{c.number}</span>
                      <span class="film-chapter__title" aria-hidden="true">{t(c.titleKey)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <p class="film-time" data-testid="film-time" aria-hidden="true">
              {fmt(state.timeMs)} <span>/ {fmt(film.timeline.durationMs)}</span>
            </p>
            {film.lesson.recall && chapterId === film.lesson.recall.chapterId && !recallState ? (
              <button type="button" class="film-pill" data-testid="film-recall-start" onClick={() => void startRecall()}>
                {t("ui.recall_answer")}
              </button>
            ) : null}
            {chapterExplore ? (
              <button type="button" class={`film-pill ${exploreId ? "is-on" : ""}`} data-testid="film-explore" aria-pressed={!!exploreId} onClick={() => (exploreId ? leaveExplore() : void enterExplore())}>
                {exploreId ? t("ui.explore_return") : t("ui.explore_this_joint")}
              </button>
            ) : (
              <button type="button" class={`film-pill ${state.explore ? "is-on" : ""}`} data-testid="film-explore" aria-pressed={state.explore} onClick={() => (state.explore ? film.timeline.resume() : film.timeline.setExplore(true))}>
                {state.explore ? t("ui.resume") : t("ui.explore")}
              </button>
            )}
            <button
              type="button"
              class="film-icon"
              data-testid="film-fullscreen"
              aria-label={fullscreen ? t("ui.exit_fullscreen") : t("ui.fullscreen")}
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen?.())}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm10-5h6v5h-2V6h-4V4zM4 15h2v3h3v2H4v-5zm14 3v-3h2v5h-5v-2h3z" /></svg>
            </button>
          </footer>
          <div class="sr-only" aria-live="polite" aria-atomic="true" data-testid="film-live">
            {announcement}
          </div>
        </>
      )}
    </main>
  );
}
