/**
 * Narration playback for the film.
 *
 * The audio is synthesized at build time (pipeline/audio/build_narration.ts) and shipped as one clip per shot, so no API
 * key, no network service and no per-view cost is involved at runtime. The spoken text is assembled from the same locale
 * strings the captions use, which means narration repeats the captions rather than adding unreviewed content.
 *
 * Sync model: the film owns the clock. `sync()` is called whenever the timeline's shot, seek counter or run state
 * changes, and the clip is positioned from the shot's local time - never the other way round. A clip is always shorter
 * than its shot, so it finishes inside the shot and the film never waits for audio.
 *
 * Autoplay: browsers refuse to start audio before a user gesture. A refusal is not an error here; it sets `blocked`, and
 * the UI offers a control. Providing that control is also what WCAG 1.4.2 requires of automatically starting audio.
 */
/** How far narration may drift from the film clock before it is re-positioned (seconds). */
const DRIFT_TOLERANCE_S = 0.3;
/**
 * Minimum time between two re-positionings of the same clip (Step 16C).
 *
 * Assigning currentTime restarts the element's seek. sync() runs on every timeline emit - about sixty times a second -
 * so an unguarded corrector re-seeks a clip faster than a seek can complete, and the clip never advances past zero: it
 * reports itself as playing while currentTime stays at 0. Measured on the first, uncached clip of the lesson: 353
 * currentTime assignments and 353 seeking/seeked/waiting cycles in nine seconds, with the clip frozen at 0.00 for 5.9
 * of them. One correction, then time to act on it.
 */
const CORRECTION_INTERVAL_MS = 700;
/** A clip held because it ran ahead of the film resumes once it is no more than this far ahead (seconds). */
const HOLD_RELEASE_S = 0.03;
/**
 * A clip that falls a little behind the film catches up by speaking slightly faster (pitch preserved) rather than by
 * skipping forward, which would drop the start of a word. Only a clip further behind than CATCH_UP_MAX_S - a real
 * stall - is moved forward to the film.
 */
const CATCH_UP_RATE = 1.15;
const CATCH_UP_MAX_S = 1.5;
/** Who is speaking. There is exactly one narration owner at any moment. */
export type NarrationOwner = "none" | "film" | "cue";

export interface NarrationClip {
  url: string;
  durationMs: number;
  leadInMs: number;
  /** Absent on a cue: a cue is not bound to a shot. */
  shotDurationMs?: number;
  textKeys: string[];
  text: string;
}

export interface NarrationManifest {
  schema: string;
  lessonId: string;
  localeId: string;
  voice: { name: string; languageCode: string; gender: string; accent: string; provider: string };
  timing: { leadInMs: number; tailMs: number };
  shots: Record<string, NarrationClip>;
  /** Learner-paced lines (explore instructions, recall questions and reveals), keyed by locale key. */
  cues?: Record<string, NarrationClip>;
}

export class NarrationPlayer {
  private readonly audio: HTMLAudioElement;
  /**
   * Cues play on their own element. They are spoken while the film is paused (an exploration, a recall question), and the
   * shot element is paused exactly then - one element could not do both without one silencing the other.
   */
  private readonly cueAudio: HTMLAudioElement;
  private currentCue = "";
  private readonly baseUrl: string;
  private readonly manifestUrl: string;
  private manifest: NarrationManifest | null = null;
  private enabled: boolean;
  private currentKey = "";
  private currentShot = "";
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  /**
   * The one-owner rule (Step 16C). Two elements exist because a learner-paced line has to be able to speak while the
   * film is paused, but only one of them may ever be audible: the shot clip and an exploration cue used to overlap for
   * seconds at a time at every handover.
   */
  private owner: NarrationOwner = "none";
  private lastCorrectionAt = 0;
  /** The clip got ahead of the film and is waiting, silent, for the film to catch up (Step 16G). */
  private holdingAhead = false;
  /** The clip is behind the film and speaking at CATCH_UP_RATE until it is level again (Step 16G). */
  private catchingUp = false;
  private pendingSeek: (() => void) | null = null;
  private readonly prefetched = new Set<string>();

  /** Set when the browser refused playback (no user gesture yet). The UI turns this into an affordance. */
  blocked = false;
  onChange: (() => void) | null = null;

  constructor(manifestUrl: string, options: { enabled: boolean; volume?: number } = { enabled: true }) {
    this.baseUrl = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);
    this.enabled = options.enabled;
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.volume = options.volume ?? 1;
    this.cueAudio = new Audio();
    this.cueAudio.preload = "auto";
    this.cueAudio.volume = options.volume ?? 1;
    // a cue that finishes hands narration back to the film, which then re-positions itself from lesson time
    this.cueAudio.addEventListener("ended", () => this.releaseCue());
    this.manifestUrl = manifestUrl;
  }

  get loaded(): boolean {
    return !!this.manifest;
  }

  get voice(): NarrationManifest["voice"] | null {
    return this.manifest?.voice ?? null;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Observable playback state, for QA hooks and tests. */
  diagnostics(): { enabled: boolean; loaded: boolean; blocked: boolean; shot: string; paused: boolean; currentTime: number; duration: number; src: string; voice: string | null; cue: string; cuePlaying: boolean; owner: NarrationOwner; owners: number } {
    const speaking = (!this.audio.paused ? 1 : 0) + (!!this.cueAudio.src && !this.cueAudio.paused ? 1 : 0);
    return {
      owner: this.owner,
      /** How many elements are actually audible right now. The invariant is that this never exceeds one. */
      owners: speaking,
      enabled: this.enabled,
      loaded: !!this.manifest,
      blocked: this.blocked,
      shot: this.currentShot,
      paused: this.audio.paused,
      currentTime: this.audio.currentTime,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      src: this.audio.src.split("/").pop() ?? "",
      cue: this.currentCue,
      cuePlaying: !!this.cueAudio.src && !this.cueAudio.paused,
      voice: this.manifest?.voice.name ?? null,
    };
  }

  /** Clip text for a shot (QA / diagnostics). */
  clip(shotId: string): NarrationClip | null {
    return this.manifest?.shots[shotId] ?? null;
  }

  /** Clip for a learner-paced line, keyed by its locale key. */
  cue(key: string): NarrationClip | null {
    return this.manifest?.cues?.[key] ?? null;
  }

  /**
   * Speak a learner-paced line now: an exploration's instruction, a recall question, a correction, a reveal.
   * Calling it again replaces whatever is speaking, because the newer line is always the one the learner just caused.
   */
  playCue(key: string): void {
    if (this.disposed) return;
    const clip = this.manifest?.cues?.[key];
    if (!this.enabled || !clip) return;
    // Take ownership first: the film's own clip stops before a learner-paced line starts, so the two can never be
    // audible together. Before this, an exploration handover produced about four seconds of two voices at once.
    this.owner = "cue";
    this.stop();
    this.currentCue = key;
    this.cueAudio.pause();
    this.cueAudio.src = this.baseUrl + clip.url;
    this.cueAudio.currentTime = 0;
    this.cueAudio.play().then(
      () => {
        if (this.blocked) {
          this.blocked = false;
          this.onChange?.();
        }
      },
      () => {
        if (!this.blocked) {
          this.blocked = true;
          this.onChange?.();
        }
      },
    );
  }

  /** Stop a learner-paced line (leaving an exploration, closing the recall panel). */
  stopCue(): void {
    this.cueAudio.pause();
    this.releaseCue();
  }

  /**
   * Hand narration back to the film. The shot key is cleared as well, so the next sync() takes the "new position"
   * branch and re-positions the clip from lesson time rather than resuming wherever it happened to be paused.
   */
  private releaseCue(): void {
    this.currentCue = "";
    if (this.owner !== "cue") return;
    this.owner = "none";
    this.currentKey = "";
  }

  /**
   * Warm the HTTP cache for a clip that is about to be needed (Step 16C).
   *
   * A clip that has to be fetched at the moment its shot begins starts late; the corrector then has real drift to close
   * on the very first beat. One clip ahead is about 25 KB, so lazy loading is preserved - this is not a bulk download.
   */
  prefetch(shotId: string): void {
    const clip = this.manifest?.shots[shotId];
    if (!clip || this.prefetched.has(shotId) || this.disposed) return;
    this.prefetched.add(shotId);
    void fetch(this.baseUrl + clip.url, { cache: "force-cache" }).catch(() => undefined);
  }

  async load(): Promise<void> {
    if (this.manifest || this.disposed) return;
    const res = await fetch(this.manifestUrl);
    if (!res.ok) throw new Error(`narration manifest ${this.manifestUrl}: ${res.status}`);
    const manifest = (await res.json()) as NarrationManifest;
    if (!manifest.shots) throw new Error(`narration manifest ${this.manifestUrl}: no shots`);
    if (!this.disposed) this.manifest = manifest;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      this.stopCue();
      this.owner = "none";
      this.currentKey = "";
      this.currentShot = "";
    }
    this.onChange?.();
  }

  /**
   * Position the narration against the film.
   * @param key changes whenever the film jumps (shot id + seek counter), forcing a re-position.
   */
  sync(shotId: string, localMs: number, running: boolean, key: string): void {
    if (this.disposed) return;
    const clip = this.manifest?.shots[shotId];
    if (!this.enabled || !clip) {
      this.stop();
      return;
    }
    // A learner-paced line owns narration while it speaks. The film waits, and re-positions itself when it gets the
    // floor back - it never talks over a cue and never resumes mid-word behind one.
    if (this.owner === "cue") {
      this.stop();
      return;
    }
    if (key !== this.currentKey) {
      this.currentKey = key;
      this.clearTimer();
      this.holdingAhead = false;
      this.setRate(1);
      if (shotId !== this.currentShot) {
        this.currentShot = shotId;
        this.audio.src = this.baseUrl + clip.url;
      }
      const offsetMs = localMs - clip.leadInMs;
      if (offsetMs >= clip.durationMs) {
        // The film is past this clip (a seek landed late in the shot): stay silent rather than talk over the next cut.
        this.stop();
        return;
      }
      this.seekTo(Math.max(0, offsetMs) / 1000);
      this.lastCorrectionAt = performance.now();
      if (!running) {
        this.audio.pause();
        return;
      }
      if (offsetMs < 0) {
        // Do not speak over the cut: wait out the lead-in.
        this.startLeadIn(-offsetMs);
        return;
      }
      this.owner = "film";
      void this.play();
      return;
    }
    // Same shot, same seek: keep the clip aligned with the film clock, but never revive a finished one.
    // (play() on an ended element rewinds it to 0, which would loop the narration for the rest of the shot.)
    if (!running) {
      // a lead-in timer must not start a clip on a paused film; resuming re-arms it from lesson time
      this.clearTimer();
      this.holdingAhead = false;
      this.setRate(1);
      this.audio.pause();
      return;
    }
    if (this.audio.ended) return;
    const expected = (localMs - clip.leadInMs) / 1000;
    // Step 16G. Still inside the lead-in: stay silent until it ends. This branch runs on the frame after a shot starts,
    // and used to fall through to "the element is paused, so play it" - starting the clip up to 0.35 s before its
    // lead-in ended, ahead of the film. The corrector then pulled it back 0.3 s, and the learner heard the first words
    // twice ("... joints ... joints"). Measured on a full playthrough: hook.elbow, hook.question, fixed.try.
    if (expected < 0) {
      if (!this.audio.paused) this.audio.pause();
      if (this.startTimer === null) this.startLeadIn(-expected * 1000);
      return;
    }
    const inClip = expected < clip.durationMs / 1000;
    // Follow the film, not the audio - but only when the element is in a state where a correction can actually take
    // effect, and never faster than one correction can complete. Correcting a clip that is mid-seek, or that has no
    // decoded data yet, cancels the work that would have closed the drift and pins it at zero instead.
    // Step 16G: speech that is AHEAD of the film is never rewound - a rewind replays words the learner has just heard.
    // It holds, silent, until the film catches up, then carries on from the same word.
    if (this.holdingAhead) {
      if (this.audio.currentTime - expected > HOLD_RELEASE_S) return;
      this.holdingAhead = false;
    }
    if (inClip && !this.audio.seeking && this.audio.readyState >= 2) {
      const ahead = this.audio.currentTime - expected;
      if (this.catchingUp && ahead >= -HOLD_RELEASE_S) this.setRate(1);
      if (ahead > DRIFT_TOLERANCE_S) {
        this.setRate(1);
        this.holdingAhead = true;
        this.audio.pause();
        return;
      } else if (-ahead > CATCH_UP_MAX_S) {
        // far behind (a real stall): skip forward to the film - never backwards
        const now = performance.now();
        if (now - this.lastCorrectionAt > CORRECTION_INTERVAL_MS) {
          this.lastCorrectionAt = now;
          this.setRate(1);
          this.seekTo(expected);
        }
      } else if (-ahead > DRIFT_TOLERANCE_S && !this.catchingUp) {
        // a little behind (the first clip decoding late, say): speak slightly faster until level, dropping no words
        this.setRate(CATCH_UP_RATE);
      }
    }
    this.owner = "film";
    // play() on an already-playing element is a no-op that still allocates a promise every frame, and issuing it during
    // a seek can restart that seek. Ask only when the element is actually paused.
    if (this.audio.paused) void this.play();
  }

  /** Retry after a user gesture: the browser will now allow playback. */
  retryBlocked(): void {
    if (this.blocked) {
      this.blocked = false;
      this.onChange?.();
    }
  }

  private async play(): Promise<void> {
    if (!this.enabled || this.disposed || !this.audio.src) return;
    try {
      await this.audio.play();
      if (this.blocked) {
        this.blocked = false;
        this.onChange?.();
      }
    } catch {
      // No user gesture yet (or the element was re-pointed mid-play). Surface it instead of retrying in a loop.
      if (!this.blocked) {
        this.blocked = true;
        this.onChange?.();
      }
    }
  }

  /** currentTime is ignored (or throws) before metadata arrives, so a fresh clip is positioned once it is seekable. */
  private seekTo(seconds: number): void {
    // One pending listener at a time. sync() runs at frame rate, so registering a listener per call left dozens of them
    // queued on a slow clip, each closing over a stale offset, all firing at once when metadata finally arrived.
    if (this.pendingSeek) {
      this.audio.removeEventListener("loadedmetadata", this.pendingSeek);
      this.pendingSeek = null;
    }
    if (this.audio.readyState >= 1) {
      this.audio.currentTime = seconds;
      return;
    }
    const onMeta = () => {
      this.audio.removeEventListener("loadedmetadata", onMeta);
      this.pendingSeek = null;
      if (!this.disposed) this.audio.currentTime = seconds;
    };
    this.pendingSeek = onMeta;
    this.audio.addEventListener("loadedmetadata", onMeta);
  }

  private clearTimer(): void {
    if (this.startTimer !== null) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
  }

  /** Start the film's clip once its lead-in has elapsed - and not a moment before. */
  private startLeadIn(ms: number): void {
    this.clearTimer();
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      if (this.disposed || this.owner === "cue") return;
      this.owner = "film";
      void this.play();
    }, ms);
  }

  private setRate(rate: number): void {
    this.catchingUp = rate !== 1;
    if (this.audio.playbackRate !== rate) this.audio.playbackRate = rate;
  }

  private stop(): void {
    this.holdingAhead = false;
    this.setRate(1);
    this.clearTimer();
    this.audio.pause();
    if (this.owner === "film") this.owner = "none";
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.cueAudio.pause();
    this.cueAudio.removeAttribute("src");
    this.onChange = null;
  }
}
