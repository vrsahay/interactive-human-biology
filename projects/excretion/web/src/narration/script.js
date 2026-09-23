/**
 * The spoken script: every narration clip and cue the lesson needs, derived from the
 * lesson data. Shared by the runtime (to find a clip) and by the build-time TTS pipeline
 * (pipeline/narration), so the two can never disagree about a file name or a line.
 *
 *   shot clips   one per shot                      e.g. 03c_vacuole_store.mp3
 *   cues         learner-paced lines, by key       e.g. cue_recall_water_question.mp3
 *
 * Plain data only: no browser APIs, no credentials.
 */

const SECTION_LETTERS = 'abcdefghij';

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase();

/** Stable clip file for a shot: chapter number (+ section letter) + shot id. */
export function clipFile(chapter, shot) {
  const secIdx = (chapter.sections || []).findIndex((s) => s.id === shot.section);
  const prefix = chapter.number + (secIdx >= 0 ? SECTION_LETTERS[secIdx] : '');
  return `${prefix}_${slug(shot.id)}.mp3`;
}

export const cueFile = (key) => `cue_${slug(key)}.mp3`;

/** Keys for learner-paced lines. */
export const CUE = {
  taskDone: (shotId) => `task.${shotId}.done`,
  taskWrong: (shotId) => `task.${shotId}.wrong`,
  recallQuestion: (id) => `recall.${id}.question`,
  recallReveal: (id) => `recall.${id}.reveal`,
  recallIncorrect: 'recall.incorrect',
  recallOpen: 'recall.open.prompt',
  recallModel: 'recall.open.model',
  recallComplete: 'recall.complete',
  exploreIntro: 'explore.intro',
  exploreModel: (id) => `explore.${id}`,
};

export function shotClips(lesson) {
  return lesson.chapters.flatMap((c) =>
    c.shots.map((s) => ({ id: s.id, chapter: c.number, file: clipFile(c, s), text: s.narration })));
}

export function cueLines({ lesson, recall, explore }) {
  const out = [];
  const add = (key, text) => text && out.push({ key, file: cueFile(key), text });
  for (const c of lesson.chapters) {
    for (const s of c.shots) {
      const it = s.interaction;
      if (!it || it.kind === 'recall') continue;
      add(CUE.taskDone(s.id), it.done);
      add(CUE.taskWrong(s.id), it.wrong);
    }
  }
  if (recall) {
    for (const q of recall.questions) {
      add(CUE.recallQuestion(q.id), q.q);
      add(CUE.recallReveal(q.id), `${recall.correct} ${q.reveal}`);
    }
    add(CUE.recallIncorrect, recall.incorrect);
    add(CUE.recallOpen, recall.open.prompt);
    add(CUE.recallModel, recall.open.model);
    add(CUE.recallComplete, recall.complete);
  }
  if (explore) {
    add(CUE.exploreIntro, explore.intro);
    for (const m of explore.models) add(CUE.exploreModel(m.id), m.about);
  }
  return out;
}
