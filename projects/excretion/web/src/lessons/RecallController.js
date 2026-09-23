import { FilmCamera } from '../camera/FilmCamera.js';
import { easeInOutCubic } from '../animation/easing.js';
import { el } from '../ui/FilmUI.js';
import { CUE } from '../narration/script.js';

/**
 * Recall (platform pattern): bottom-left panel, one question at a time. For each
 * question the camera returns to where it happened, with no labels, so the view
 * reminds without giving the answer away. Wrong answers can be retried; right answers
 * lock, reveal the idea, and are spoken.
 *
 * It ends with an open prompt, not a score: the learner explains the whole idea in
 * their own words (aloud or typed; nothing is sent anywhere), then compares with a
 * model answer and ticks what they included.
 */
export class RecallController {
  constructor(app, data) {
    this.app = app;
    this.data = data;
    this.active = false;
    this.soil = 'solid';
  }

  open(onDone) {
    const app = this.app;
    this.active = true;
    this.onDone = onDone;
    this.i = 0;
    this.score = 0;
    this.firstTry = true;
    app.world.owner = this;
    this.time = app.timeline.total - 1;
    app.labels.clear();
    this.show();
  }

  highlight() {
    return [];
  }

  travelTo(stage, preset, soil) {
    if (!this.app.world.stageReady(stage)) {
      // its model is still loading in the background: go there as soon as it arrives
      this.app.world.waitStage(stage).then(() => this.active && this.travelTo(stage, preset, soil));
      return;
    }
    const app = this.app;
    this.soil = soil || 'solid';
    app.world.showStage(stage);
    this.travel = { from: { ...app.camera.pose }, to: app.camera.resolve(preset), t: 0, dur: app.camera.reduced ? 0.01 : 0.9 };
  }

  show() {
    const app = this.app;
    const q = this.data.questions[this.i];
    this.firstTry = true;
    this.travelTo(q.stage, q.preset, q.soil);
    const status = el('p', { class: 'film-status', role: 'status' });
    const nav = el('div', { class: 'film-row' });
    const opts = el('div', { class: 'film-options', role: 'group', 'aria-label': 'Answers' }, q.options.map((o, k) => el('button', {
      type: 'button',
      onClick: (e) => this.answer(k, e.currentTarget, status, nav, opts),
    }, o)));
    const heading = el('p', { class: 'film-recall__q', tabindex: '-1' }, q.q);
    app.ui.recall.replaceChildren(
      el('p', { class: 'film-recall__progress' }, `Question ${this.i + 1} of ${this.data.questions.length}`),
      heading, opts, status, nav);
    app.ui.recall.hidden = false;
    app.ui.quietWords(true);
    setTimeout(() => heading.focus({ preventScroll: true }), 60);
    app.cue(CUE.recallQuestion(q.id));
  }

  answer(k, btn, status, nav, opts) {
    const app = this.app;
    const q = this.data.questions[this.i];
    if (k !== q.answer) {
      this.firstTry = false;
      btn.classList.add('is-wrong');
      btn.textContent += ' ✕';
      btn.disabled = true;
      status.className = 'film-status is-warm';
      status.textContent = this.data.incorrect;
      app.cue(CUE.recallIncorrect);
      return;
    }
    if (this.firstTry) this.score++;
    btn.classList.add('is-right');
    btn.textContent += ' ✓';
    [...opts.children].forEach((b) => (b.disabled = true));
    status.className = 'film-status is-good';
    status.textContent = `${this.data.correct} ${q.reveal}`;
    app.cue(CUE.recallReveal(q.id));
    const last = this.i === this.data.questions.length - 1;
    const next = el('button', { class: 'film-btn film-btn--primary', type: 'button', onClick: () => {
      if (last) this.showOpen();
      else {
        this.i++;
        this.show();
      }
    } }, 'Next');
    nav.replaceChildren(next);
    setTimeout(() => next.focus(), 30);
  }

  /** The final step: explain it in your own words, then compare. */
  showOpen() {
    const app = this.app;
    const o = this.data.open;
    this.travelTo(o.stage, o.preset, o.soil);
    const heading = el('p', { class: 'film-recall__q', tabindex: '-1' }, o.prompt);
    const box = el('textarea', { class: 'film-own', rows: '4', 'aria-label': 'Your explanation (optional, stays on this device)', placeholder: 'Plants deal with their wastes by…' });
    const reveal = el('div', { class: 'film-model', hidden: true });
    const nav = el('div', { class: 'film-row' });
    const show = el('button', { class: 'film-btn film-btn--primary', type: 'button', onClick: () => {
      reveal.hidden = false;
      show.hidden = true;
      app.cue(CUE.recallModel);
      nav.replaceChildren(el('button', { class: 'film-btn film-btn--primary', type: 'button', onClick: () => this.finish() }, 'Finish'));
      reveal.querySelector('input')?.focus();
    } }, 'Compare with a model answer');
    reveal.append(
      el('h3', {}, 'A model answer'),
      el('p', {}, o.model),
      el('fieldset', { class: 'film-checks' },
        el('legend', {}, 'Did your explanation include…'),
        o.checklist.map((c) => el('label', {}, el('input', { type: 'checkbox' }), el('span', {}, c)))));
    nav.append(show);
    app.ui.recall.replaceChildren(
      el('p', { class: 'film-recall__progress' }, 'In your own words'),
      heading, el('p', { class: 'film-hint-text' }, o.hint), box, reveal, nav);
    app.ui.recall.hidden = false;
    setTimeout(() => heading.focus({ preventScroll: true }), 60);
    app.cue(CUE.recallOpen);
  }

  update(dt) {
    const tr = this.travel;
    if (!this.active || !tr) return;
    tr.t += dt;
    const e = easeInOutCubic(Math.min(1, tr.t / tr.dur));
    this.app.camera.apply(FilmCamera.lerpPose(tr.from, tr.to, e));
    if (e >= 1) this.travel = null;
  }

  close() {
    this.finish(true);
  }

  finish(early = false) {
    const app = this.app;
    if (!this.active) return;
    this.active = false;
    app.world.owner = null;
    app.ui.recall.hidden = true;
    app.ui.quietWords(false);
    app.progress.recallScore = early ? null : this.score;
    if (early) app.narration.stopCue();
    else app.cue(CUE.recallComplete);
    this.onDone?.();
  }
}
