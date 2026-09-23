/**
 * Lays the lesson's shots on one clock.
 *
 * Shot length = lead-in + narration clip + tail, never shorter than the shot's own
 * floor (minMs, its camera travel, its heading). With rendered narration the clip
 * length is the real, measured one; without it (a lesson still being written) it
 * is estimated, so the film always has a timing.
 *
 * Captions: one concise line per spoken sentence. The clip manifest records where
 * each sentence starts (measured from the audio's pauses at build time); without
 * it the start is estimated from the sentence's share of the words.
 */
export const LEAD_IN_MS = 350;
export const TAIL_MS = 700;

export function estimateSpeechMs(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  const sentences = (text.match(/[.!?](\s|$)/g) || []).length;
  return Math.round((words / 2.45) * 1000 + sentences * 240);
}

export function splitSentences(text) {
  return (text || '').match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [];
}

/** Sentence start times (ms from clip start), estimated from each sentence's length. */
export function estimateSentenceStarts(sentences, speechMs) {
  const total = sentences.reduce((n, s) => n + s.length, 0) || 1;
  let acc = 0;
  return sentences.map((s) => {
    const at = Math.round((acc / total) * speechMs);
    acc += s.length;
    return at;
  });
}

/** Shot as authored (brief's field names) → shot as the engine uses it. */
function normalise(shot, chapter) {
  const captions = Array.isArray(shot.caption) ? shot.caption : shot.caption ? [shot.caption] : [];
  return {
    ...shot,
    chapter,
    camera: shot.cameraTarget,
    heading: shot.heading || null,
    captions,
    view: { ...(shot.view || {}), highlight: shot.highlightObjects || [] },
    minMs: shot.duration?.minMs || 0,
    tailMs: shot.duration?.tailMs ?? TAIL_MS,
  };
}

export class Timeline {
  constructor(lesson, { clips = {} } = {}) {
    this.lesson = lesson;
    this.shots = [];
    this.chapters = [];
    this.sections = [];
    this.tracks = [];
    this.clipped = 0;
    let t = 0;
    for (const chapter of lesson.chapters) {
      const cStart = t;
      for (const raw of chapter.shots) {
        const shot = normalise(raw, chapter);
        const clip = clips[shot.id];
        if (clip) this.clipped++;
        const sentences = splitSentences(shot.narration);
        const speechMs = clip?.durationMs ?? estimateSpeechMs(shot.narration);
        const needed = LEAD_IN_MS + speechMs + shot.tailMs;
        const floor = Math.max(shot.minMs, (shot.camera?.transitionMs || 0) + 1200, (shot.heading?.appearAtMs || 0) + 1600);
        const duration = Math.ceil(Math.max(needed, floor) / 100) * 100;
        const starts = clip?.sentenceStartsMs?.length === sentences.length ? clip.sentenceStartsMs : estimateSentenceStarts(sentences, speechMs);
        this.shots.push({ ...shot, index: this.shots.length, start: t, end: t + duration, duration, speechMs, sentences, sentenceStarts: starts, clip: clip || null });
        t += duration;
      }
      this.chapters.push({ ...chapter, start: cStart, end: t });
    }
    this.total = t;
    this.byId = new Map(this.shots.map((s) => [s.id, s]));

    // sections of a chapter (chapter 03's six places), in lesson time
    for (const c of this.chapters) {
      for (const sec of c.sections || []) {
        const own = this.shots.filter((s) => s.chapter.id === c.id && s.section === sec.id);
        if (own.length) this.sections.push({ ...sec, chapter: c.id, start: own[0].start, end: own.at(-1).end });
      }
    }

    // process tracks: each shot's animation runs from that shot to `through` (default: the same shot)
    for (const s of this.shots) {
      for (const a of s.animation || []) {
        const to = a.through === 'END' ? null : this.byId.get(a.through || s.id);
        if (a.through !== 'END' && !to) throw new Error(`${s.id}: animation ${a.process} runs through unknown shot ${a.through}`);
        this.tracks.push({ ...a, from: s.id, to: a.through || s.id, start: s.start, end: to ? to.end : Infinity, chapter: s.chapter.id });
      }
    }
  }

  locate(t) {
    const s = this.shots;
    let lo = 0;
    let hi = s.length - 1;
    const tt = Math.max(0, Math.min(this.total - 1, t));
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid].start <= tt) lo = mid;
      else hi = mid - 1;
    }
    return s[lo];
  }

  chapterAt(t) {
    return this.chapters.find((c) => t >= c.start && t < c.end) || this.chapters[this.chapters.length - 1];
  }

  sectionAt(t) {
    return this.sections.find((s) => t >= s.start && t < s.end) || null;
  }

  /** Which sentence is being spoken at shot-local time (drives the caption line). */
  sentenceAt(shot, localMs) {
    const k = localMs - LEAD_IN_MS;
    let idx = 0;
    for (let i = 0; i < shot.sentenceStarts.length; i++) if (k >= shot.sentenceStarts[i] - 120) idx = i;
    return idx;
  }

  /** The caption line for this moment: one concise idea per spoken sentence. */
  captionAt(shot, localMs) {
    if (!shot.captions.length) return '';
    if (localMs < LEAD_IN_MS - 100 || localMs > LEAD_IN_MS + shot.speechMs + 1100) return '';
    if (shot.captions.length === 1) return shot.captions[0];
    return shot.captions[Math.min(shot.captions.length - 1, this.sentenceAt(shot, localMs))];
  }

  /** Every spoken sentence (the "every spoken word" caption option). */
  wordsAt(shot, localMs) {
    if (localMs < LEAD_IN_MS - 100 || localMs > LEAD_IN_MS + shot.speechMs + 1100) return '';
    return shot.sentences[this.sentenceAt(shot, localMs)] || '';
  }

  activeTracks(t) {
    return this.tracks.filter((tr) => t >= tr.start && t < tr.end);
  }
}
