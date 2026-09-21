/**
 * Retrieval practice: its own chapter in the lesson.
 *
 * The lesson used to state the four categories on a labelled body. Naming something is not the same as knowing it, so the
 * learner is now shown one joint at a time, told how it MOVES, and asked which category that makes it. The name is revealed
 * only after they answer, which is the point: the category is a consequence of the movement, not a label on a diagram.
 *
 * State only - no rendering, no DOM, no anatomy knowledge. The caller frames the camera and lights the structures each step
 * declares, exactly as it does for a shot.
 */
export interface RecallStep {
  stepId: string;
  site: string;
  questionKey: string;
  revealKey: string;
  answer: string;
  highlight: string[];
  camera: { view: string; scale: number; elevation?: number };
}

export interface RecallConfig {
  chapterId: string;
  /** The shot the panel opens on. Reaching it in the film hands over to the learner. */
  shotId?: string;
  promptKey: string;
  correctKey: string;
  incorrectKey: string;
  completeKey: string;
  options: { optionId: string; labelKey: string }[];
  steps: RecallStep[];
}

export type RecallStatus = "asking" | "correct" | "incorrect" | "complete";

export interface RecallState {
  index: number;
  total: number;
  step: RecallStep;
  status: RecallStatus;
  /** Options already tried on this step, so the UI can mark them without re-asking. */
  tried: string[];
  answeredFirstTry: number;
}

export class RecallSequence {
  private index = 0;
  private status: RecallStatus = "asking";
  private tried: string[] = [];
  private firstTry = 0;

  constructor(readonly config: RecallConfig) {
    if (!config.steps.length) throw new Error("recall: no steps");
  }

  get state(): RecallState {
    return { index: this.index, total: this.config.steps.length, step: this.config.steps[this.index], status: this.status, tried: [...this.tried], answeredFirstTry: this.firstTry };
  }

  /** Answer the current step. A wrong answer is not punished: it says so and lets the learner look again. */
  answer(optionId: string): RecallStatus {
    if (this.status === "correct" || this.status === "complete") return this.status;
    const correct = optionId === this.config.steps[this.index].answer;
    if (correct && !this.tried.length) this.firstTry++;
    if (!this.tried.includes(optionId)) this.tried.push(optionId);
    this.status = correct ? "correct" : "incorrect";
    return this.status;
  }

  /** Move to the next joint, or finish. */
  next(): RecallState {
    if (this.index + 1 >= this.config.steps.length) {
      this.status = "complete";
      return this.state;
    }
    this.index++;
    this.status = "asking";
    this.tried = [];
    return this.state;
  }

  restart(): RecallState {
    this.index = 0;
    this.status = "asking";
    this.tried = [];
    this.firstTry = 0;
    return this.state;
  }
}

export interface RecallValidationSources {
  structureIds: Set<string>;
  siteIds: Set<string>;
  textKeys: Set<string>;
  chapterIds: Set<string>;
}

/** Build-time checks: same rule as the rest of the lesson - every reference resolves or the build fails. */
export function checkRecallConfig(config: RecallConfig | undefined, sources: RecallValidationSources): string[] {
  if (!config) return [];
  const problems: string[] = [];
  if (!sources.chapterIds.has(config.chapterId)) problems.push(`recall: unknown chapterId ${config.chapterId}`);
  for (const k of [config.promptKey, config.correctKey, config.incorrectKey, config.completeKey]) if (!sources.textKeys.has(k)) problems.push(`recall: missing text key ${k}`);
  const optionIds = new Set(config.options.map((o) => o.optionId));
  for (const o of config.options) if (!sources.textKeys.has(o.labelKey)) problems.push(`recall option ${o.optionId}: missing text key ${o.labelKey}`);
  const stepIds = new Set<string>();
  for (const s of config.steps) {
    const at = `recall step ${s.stepId}`;
    if (stepIds.has(s.stepId)) problems.push(`${at}: duplicate stepId`);
    stepIds.add(s.stepId);
    if (!sources.siteIds.has(s.site)) problems.push(`${at}: unknown site ${s.site}`);
    if (!optionIds.has(s.answer)) problems.push(`${at}: answer ${s.answer} is not one of the options`);
    for (const k of [s.questionKey, s.revealKey]) if (!sources.textKeys.has(k)) problems.push(`${at}: missing text key ${k}`);
    for (const id of s.highlight) if (!sources.structureIds.has(id)) problems.push(`${at}: unknown structure ${id}`);
  }
  // Every option should be the answer to something, or the learner is choosing between categories the lesson never tested.
  for (const id of optionIds) if (!config.steps.some((s) => s.answer === id)) problems.push(`recall: option ${id} is never the answer to any step`);
  return problems;
}
