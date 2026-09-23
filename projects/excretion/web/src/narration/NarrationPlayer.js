/**
 * Narration: pre-rendered Google Cloud Text-to-Speech clips (pipeline/narration),
 * one per shot, plus "cues" for learner-paced lines (a task's confirmation, a recall
 * question, an Explore description). No device voice is ever used, and no key or
 * network service is involved at runtime: only the audio files ship.
 *
 * Ownership. Two audio elements exist (the film's clip and the cue) because a cue has to
 * speak while the film is held, but only ONE may be audible: `owner` is 'film', 'cue'
 * or 'none'. Starting a cue silences the film first; when the cue ends, the film takes
 * the floor back and re-positions itself from lesson time.
 *
 * Sync. The film owns the clock; audio follows it, never the other way round.
 *  - A clip starts after its lead-in, never before, so first words are never heard twice.
 *  - `key` (shot id + seek count) changes whenever the film jumps: seek, scrub, chapter
 *    jump, restart. Only then is the clip re-positioned. Landing after the words: silence.
 *  - Behind by a little: speak slightly faster (pitch kept) until level. Behind by a real
 *    stall (>1.5 s): move forward. Ahead: hold silently; never rewind (no repeated words).
 *  - Corrections are at least 700 ms apart, play() is only asked of a paused element,
 *    a finished clip is never revived, and at most one metadata listener is pending.
 */
const DRIFT_S = 0.3;
const CORRECT_EVERY_MS = 700;
const CATCH_UP_RATE = 1.15;
const STALL_S = 1.5;
const RELEASE_S = 0.03;

export class NarrationPlayer {
  constructor(manifest, baseUrl) {
    this.manifest = manifest && manifest.shots ? manifest : null;
    this.base = baseUrl;
    this.available = !!this.manifest && Object.keys(this.manifest.shots).length > 0;
    this.enabled = true;
    this.blocked = false;
    this.onChange = null;

    this.film = new Audio();
    this.film.preload = 'auto';
    this.film.preservesPitch = true;
    this.cueEl = new Audio();
    this.cueEl.preload = 'auto';
    this.cueEl.addEventListener('ended', () => this.releaseCue());

    this.owner = 'none';
    this.key = '';
    this.shotId = '';
    this.cueKey = '';
    this.cueDone = null;
    this.timer = null;
    this.pendingMeta = null;
    this.holdingAhead = false;
    this.catchingUp = false;
    this.lastFix = 0;
    this.prefetched = new Set();
    this.trace = null; // QA: set to [] to record every sync decision
    // QA: how often each thing happened, and the worst moment seen
    this.stats = { filmPlays: 0, filmRepositions: 0, cueStarts: 0, maxAudible: 0, rewinds: 0, playsPerKey: {} };
  }

  get voice() {
    return this.manifest?.voice || null;
  }

  clip(shotId) {
    return this.manifest?.shots?.[shotId] || null;
  }

  cue(key) {
    return this.manifest?.cues?.[key] || null;
  }

  hasCue(key) {
    return !!this.cue(key);
  }

  /** How many elements are audible right now. The invariant is ≤ 1. */
  audible() {
    const on = (el) => (el.src && !el.paused && !el.muted ? 1 : 0);
    return on(this.film) + on(this.cueEl);
  }

  diagnostics() {
    return {
      available: this.available,
      enabled: this.enabled,
      blocked: this.blocked,
      owner: this.owner,
      audible: this.audible(),
      shot: this.shotId,
      filmSrc: this.film.src.split('/').pop(),
      filmPaused: this.film.paused,
      filmTime: +this.film.currentTime.toFixed(2),
      rate: this.film.playbackRate,
      cue: this.cueKey,
      cuePlaying: !!this.cueEl.src && !this.cueEl.paused,
      voice: this.voice?.name || null,
      stats: JSON.parse(JSON.stringify(this.stats)),
    };
  }

  setEnabled(on) {
    if (this.enabled === on) return;
    this.enabled = on;
    if (!on) {
      this.stopFilm();
      this.stopCue();
      this.key = '';
      this.shotId = '';
    }
    this.onChange?.();
  }

  /**
   * Called inside the Start button's click: browsers only let audio start after a user
   * gesture, and some only for an element that was played during one.
   */
  unlock() {
    if (!this.available) return;
    // a 50 ms silent sound, played muted on both elements inside the gesture; if the lesson has
    // already given an element real work by the time this resolves, it is left alone
    const silent = URL.createObjectURL(new Blob([silentWav()], { type: 'audio/wav' }));
    for (const el of [this.film, this.cueEl]) {
      el.muted = true;
      el.src = silent;
      const release = () => {
        if (el.src !== silent) return;
        el.pause();
        el.removeAttribute('src');
        el.muted = false;
      };
      el.play().then(release, release);
    }
    this.shotId = '';
    this.key = '';
  }

  prefetch(shotId) {
    const c = this.clip(shotId);
    if (!c || this.prefetched.has(shotId)) return;
    this.prefetched.add(shotId);
    fetch(this.base + c.url, { cache: 'force-cache' }).catch(() => {});
  }

  /**
   * Keep the film's clip in step with lesson time.
   * @param running  the film clock is moving (not paused, not held)
   * @param key      changes whenever the film jumps (shot id + seek count)
   */
  sync(shotId, localMs, running, key) {
    const clip = this.clip(shotId);
    if (!this.enabled || !clip) {
      this.stopFilm();
      return;
    }
    if (this.owner === 'cue') {
      this.stopFilm();
      return;
    }
    const expected = (localMs - (clip.leadInMs ?? 350)) / 1000;
    const end = clip.durationMs / 1000;
    const now = performance.now();

    if (key !== this.key) {
      this.key = key;
      this.clearTimer();
      this.holdingAhead = false;
      this.setRate(1);
      if (shotId !== this.shotId) {
        this.shotId = shotId;
        this.film.src = this.base + clip.url;
      }
      if (!this.film.paused) this.film.pause();
      if (expected >= end - 0.05) {
        this.stopFilm();
        return;
      }
      this.stats.filmRepositions++;
      this.note('reposition', { to: +Math.max(0, expected).toFixed(3), running });
      this.repositioning = true;
      this.seekTo(Math.max(0, expected));
      this.repositioning = false;
      this.lastFix = now;
      if (!running) {
        this.film.pause();
        return;
      }
      if (expected < 0) {
        this.startAfter(-expected * 1000);
        return;
      }
      this.owner = 'film';
      this.play();
      return;
    }

    if (!running) {
      this.clearTimer();
      this.holdingAhead = false;
      this.setRate(1);
      if (!this.film.paused) this.film.pause();
      return;
    }
    if (this.film.ended) return;
    if (expected < 0) {
      if (!this.film.paused) this.film.pause();
      if (this.timer === null) this.startAfter(-expected * 1000);
      return;
    }
    if (this.holdingAhead) {
      if (this.film.currentTime - expected > RELEASE_S) {
        if (!this.film.paused) this.film.pause();
        return;
      }
      this.holdingAhead = false;
    }
    if (expected < end && !this.film.seeking && this.film.readyState >= 2) {
      const ahead = this.film.currentTime - expected;
      if (this.catchingUp && ahead >= -RELEASE_S) this.setRate(1);
      if (ahead > DRIFT_S) {
        this.note('hold-ahead', { expected: +expected.toFixed(3) });
        this.setRate(1);
        this.holdingAhead = true;
        this.film.pause();
        return;
      }
      if (-ahead > STALL_S) {
        if (now - this.lastFix > CORRECT_EVERY_MS) {
          this.note('stall-seek', { expected: +expected.toFixed(3) });
          this.lastFix = now;
          this.setRate(1);
          this.seekTo(expected);
        }
      } else if (-ahead > DRIFT_S && !this.catchingUp) {
        this.note('catch-up', { expected: +expected.toFixed(3) });
        this.setRate(CATCH_UP_RATE);
      }
    }
    if (expected >= end) return;
    this.owner = 'film';
    if (this.film.paused) {
      this.clearTimer();
      this.play();
    }
  }

  /**
   * Speak a learner-paced line now. The newest line always wins (it is the one the
   * learner just caused). Resolves when the line has finished or was stopped.
   */
  playCue(key) {
    const c = this.cue(key);
    this.cueDone?.();
    this.cueDone = null;
    if (!this.enabled || !c) return Promise.resolve(false);
    this.owner = 'cue';
    this.stopFilm();
    this.cueKey = key;
    this.stats.cueStarts++;
    this.cueEl.pause();
    this.cueEl.muted = false;
    this.cueEl.src = this.base + c.url;
    this.cueEl.currentTime = 0;
    const done = new Promise((resolve) => (this.cueDone = () => resolve(true)));
    this.cueEl.play().then(
      () => this.setBlocked(false),
      () => {
        this.setBlocked(true);
        this.releaseCue();
      },
    );
    this.track();
    return done;
  }

  stopCue() {
    if (this.cueEl.src && !this.cueEl.paused) this.cueEl.pause();
    this.releaseCue();
  }

  /** The cue is over: the film gets the floor back and re-positions from lesson time. */
  releaseCue() {
    this.cueKey = '';
    this.cueDone?.();
    this.cueDone = null;
    if (this.owner !== 'cue') return;
    this.owner = 'none';
    this.key = '';
  }

  // ------------------------------------------------------------ internals
  note(what, extra = {}) {
    if (!this.trace) return;
    this.trace.push({ t: Math.round(performance.now()), what, key: this.key, at: +this.film.currentTime.toFixed(3), paused: this.film.paused, ...extra });
    if (this.trace.length > 400) this.trace.shift();
  }

  play() {
    this.film.muted = false;
    if (!this.enabled || !this.film.src || !this.film.paused) return;
    this.note('play');
    this.stats.filmPlays++;
    this.stats.playsPerKey[this.key] = (this.stats.playsPerKey[this.key] || 0) + 1;
    this.film.play().then(
      () => this.setBlocked(false),
      () => this.setBlocked(true),
    );
    this.track();
  }

  setBlocked(v) {
    if (this.blocked === v) return;
    this.blocked = v;
    this.onChange?.();
  }

  track() {
    queueMicrotask(() => {
      this.stats.maxAudible = Math.max(this.stats.maxAudible, this.audible());
    });
  }

  seekTo(seconds) {
    // a backwards move inside the same shot would make the learner hear words twice
    if (this.film.readyState >= 1 && this.film.src && seconds < this.film.currentTime - 0.05 && this.repositioning !== true) this.stats.rewinds++;
    if (this.pendingMeta) {
      this.film.removeEventListener('loadedmetadata', this.pendingMeta);
      this.pendingMeta = null;
    }
    if (this.film.readyState >= 1) {
      this.film.currentTime = seconds;
      return;
    }
    const onMeta = () => {
      this.film.removeEventListener('loadedmetadata', onMeta);
      this.pendingMeta = null;
      this.film.currentTime = seconds;
    };
    this.pendingMeta = onMeta;
    this.film.addEventListener('loadedmetadata', onMeta);
  }

  startAfter(ms) {
    this.clearTimer();
    const key = this.key;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.owner === 'cue' || !this.enabled || this.key !== key || this.holdingAhead) return;
      this.note('lead-in timer');
      this.owner = 'film';
      if (this.film.paused) this.play();
    }, ms);
  }

  clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  setRate(r) {
    this.catchingUp = r !== 1;
    if (this.film.playbackRate !== r) this.film.playbackRate = r;
  }

  stopFilm() {
    this.holdingAhead = false;
    this.setRate(1);
    this.clearTimer();
    if (!this.film.paused) this.film.pause();
    if (this.owner === 'film') this.owner = 'none';
  }

  /** Stop everything (restart, leaving the page). */
  stopAll() {
    this.stopFilm();
    this.stopCue();
    this.key = '';
  }
}

/** 50 ms of silence as a 16-bit mono WAV (used only to unlock audio inside the Start gesture). */
function silentWav() {
  const n = 1200;
  const buf = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  dv.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, 24000, true);
  dv.setUint32(28, 48000, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  str(36, 'data');
  dv.setUint32(40, n * 2, true);
  return buf;
}
