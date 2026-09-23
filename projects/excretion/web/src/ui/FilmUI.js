const I = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/></svg>',
  voiceOn: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  voiceOff: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};

export const KIDNEY_FIGURE = `<svg viewBox="0 0 96 120" role="img" aria-label="Outline of a human body with the two kidneys marked">
  <g fill="none" stroke="rgba(242,240,234,.72)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="48" cy="14" r="10"/><path d="M32 30h32l5 38H59l-2 44H39l-2-44H27z"/><path d="M32 32L19 64M64 32l13 32"/></g>
  <g fill="#e2a95c"><path d="M38 50c-4 0-6 5-5 9s4 7 7 6 3-5 2-8 1-7-4-7z"/><path d="M58 50c4 0 6 5 5 9s-4 7-7 6-3-5-2-8-1-7 4-7z"/></g></svg>`;

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
export { el };

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Learner-facing film shell. Persistent: top bar + player. Everything else
 * appears only for the moment it is needed.
 */
export class FilmUI {
  constructor({ root, filmEl, lesson, timeline, handlers, sources }) {
    Object.assign(this, { root, filmEl, lesson, timeline, handlers, sources });
    this.live = document.getElementById('live');
    this.build();
    this.bindKeys();
    this.bindQuiet();
  }

  // ------------------------------------------------------------------ build
  build() {
    const H = this.handlers;
    const L = this.lesson;
    this.veil = el('div', { class: 'film-veil', 'aria-hidden': 'true' });
    this.chapterNum = el('span', { class: 'film-top__num' });
    this.chapterTitle = el('span');
    this.sectionTitle = el('span', { class: 'film-top__section', hidden: true });
    this.chapterLine = el('p', { class: 'film-top__chapter' }, this.chapterNum, this.chapterTitle, this.sectionTitle);
    this.voiceBtn = el('button', { class: 'film-icon', type: 'button', 'aria-label': 'Narration on', 'aria-pressed': 'true', html: I.voiceOn, onClick: () => H.onVoice() });
    this.top = el('header', { class: 'film-top' },
      el('p', { class: 'film-top__brand' }, L.title),
      this.chapterLine,
      el('span', { class: 'film-top__spacer' }),
      el('div', { class: 'film-top__actions' }, this.voiceBtn,
        el('button', { class: 'film-icon', type: 'button', 'aria-label': 'Settings', 'aria-haspopup': 'dialog', html: I.gear, onClick: () => this.openSettings() })));

    this.capEyebrow = el('p', { class: 'film-heading__eyebrow' });
    this.capTitle = el('h2', { class: 'film-heading__title' });
    this.capText = el('p', { class: 'film-heading__text' });
    this.caption = el('div', { class: 'film-heading' }, this.capEyebrow, this.capTitle, this.capText);
    this.figure = el('div', { class: 'film-figure', 'aria-hidden': 'true' },
      el('span', { html: KIDNEY_FIGURE }),
      el('p', {}, 'Humans: ', el('strong', {}, 'kidneys'), ' are special organs that remove wastes from the blood.'));
    this.lead = el('div', { class: 'film-lead' }, this.caption, this.figure);

    this.subtitle = el('p', { class: 'film-subtitle', 'aria-hidden': 'true' });

    // player
    this.playBtn = el('button', { class: 'film-icon', type: 'button', 'aria-label': 'Play', html: I.play, onClick: () => H.onPlay() });
    const segs = this.timeline.chapters.map((c) => {
      const fill = el('i');
      const ticks = this.timeline.sections.filter((x) => x.chapter === c.id && x.start > c.start)
        .map((x) => el('b', { style: `left:${((x.start - c.start) / (c.end - c.start)) * 100}%` }));
      const seg = el('div', { class: 'film-seg', style: `flex:${c.end - c.start} 1 0` }, fill, ticks);
      return { c, seg, fill };
    });
    this.segs = segs;
    this.bar = el('div', { class: 'film-timeline__bar' }, segs.map((s) => s.seg));
    this.marks = el('ol', { class: 'film-marks' });
    this.markBtns = this.timeline.chapters.map((c) => {
      const b = el('button', { type: 'button', 'data-title': c.title, 'aria-label': `Chapter ${c.number}: ${c.title}`, onClick: (e) => { e.stopPropagation(); H.onChapter(c.id); } }, c.number);
      const li = el('li', { 'data-at': String(c.start / this.timeline.total), style: `left:${(c.start / this.timeline.total) * 100}%` }, b);
      this.marks.append(li);
      return b;
    });
    this.nudgeMarks();
    this.scrub = el('div', {
      class: 'film-timeline', role: 'slider', tabindex: '0', 'aria-label': 'Lesson timeline',
      'aria-valuemin': '0', 'aria-valuemax': String(Math.round(this.timeline.total / 1000)),
    }, this.bar, this.marks);
    this.bindScrub();
    this.timeEl = el('span', { class: 'film-time' });
    this.pill = el('button', { class: 'film-pill', type: 'button', onClick: () => H.onExplore() }, 'Explore');
    this.mobileChapters = el('ol', { class: 'film-chapters-m' },
      this.timeline.chapters.map((c) => el('li', { style: 'display:contents' },
        el('button', { type: 'button', 'aria-label': `Chapter ${c.number}: ${c.title}`, onClick: () => H.onChapter(c.id) }, c.number))));
    this.player = el('div', { class: 'film-player', role: 'group', 'aria-label': 'Lesson player' },
      this.playBtn,
      el('button', { class: 'film-icon', type: 'button', 'aria-label': 'Replay from the start', html: I.replay, onClick: () => H.onReplay() }),
      this.scrub, this.timeEl, this.pill,
      el('button', { class: 'film-icon', type: 'button', 'aria-label': 'Full screen', html: I.full, onClick: () => this.fullscreen() }),
      this.mobileChapters);

    // panels (filled by controllers)
    this.interact = el('section', { class: 'film-panel film-interact', hidden: true, 'aria-label': 'Your turn' });
    this.explore = el('section', { class: 'film-panel film-explore', hidden: true, 'aria-label': 'Explore' });
    this.recall = el('section', { class: 'film-panel film-recall', hidden: true, 'aria-label': 'Recall' });
    this.hint = el('p', { class: 'film-hint', hidden: true });
    this.end = el('section', { class: 'film-panel film-end', hidden: true, 'aria-label': 'Lesson complete' });

    this.root.append(this.veil, this.top, this.lead, this.subtitle, this.interact, this.explore, this.recall, this.hint, this.end, this.player);
    this.buildStart();
    this.buildSettings();
    new ResizeObserver(() => this.filmEl.style.setProperty('--film-player-h', `${this.player.offsetHeight}px`)).observe(this.player);
  }

  nudgeMarks() {
    // keep chapter numbers readable: at least 46 px apart
    requestAnimationFrame(() => {
      const w = this.marks.offsetWidth || 800;
      let last = -99;
      for (const li of this.marks.children) {
        const want = parseFloat(li.dataset.at) * w;
        const x = Math.max(want, last + 30);
        li.style.left = `${x}px`;
        last = x;
      }
    });
  }

  buildStart() {
    const L = this.lesson;
    this.startBar = el('i');
    this.startBtn = el('button', { class: 'film-btn film-btn--primary', type: 'button', disabled: true, onClick: () => this.handlers.onStart() }, 'Start lesson');
    this.startCard = el('div', { class: 'film-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'start-title' },
      el('p', { class: 'film-card__eyebrow' }, `${this.timeline.chapters.length} parts · about ${Math.round(this.timeline.total / 60000)} minutes`),
      el('h1', { class: 'film-card__title', id: 'start-title' }, L.title),
      el('p', { class: 'film-card__thesis' }, L.thesis),
      el('div', { class: 'film-card__bar', 'aria-hidden': 'true' }, this.startBar),
      this.startBtn,
      el('p', { class: 'film-card__note' }, this.handlers.hasVoice?.() ? 'Narrated. Turn your sound on.' : 'Read along with the captions.'));
    this.start = el('div', { class: 'film-backdrop' }, this.startCard);
    this.root.append(this.start);
  }

  loadProgress(p) {
    this.startBar.style.width = `${Math.round(p * 100)}%`;
  }

  ready() {
    this.startBtn.disabled = false;
    this.startBtn.focus();
  }

  loadError(msg) {
    this.startCard.querySelector('.film-card__note').textContent = msg;
  }

  hideStart() {
    this.start.hidden = true;
  }

  // ------------------------------------------------------------ per frame
  setShot(shot, section = null) {
    const c = shot.chapter;
    const secTitle = section?.title || '';
    if (this.chapterNum.textContent !== c.number || this.sectionTitle.textContent !== secTitle) {
      this.chapterNum.textContent = c.number;
      this.chapterTitle.textContent = c.title;
      this.sectionTitle.textContent = secTitle;
      this.sectionTitle.hidden = !secTitle;
      this.chapterLine.style.animation = 'none';
      void this.chapterLine.offsetWidth;
      this.chapterLine.style.animation = '';
      document.title = `${c.number} ${c.title}${secTitle ? ' · ' + secTitle : ''} · ${this.lesson.title}`;
    }
    const cap = shot.heading || {};
    const same = this.capTitle.textContent === (cap.title || '') && this.capEyebrow.textContent === (cap.eyebrow || '');
    if (!same) {
      this.caption.classList.remove('is-on');
      this.capEyebrow.textContent = cap.eyebrow || '';
      this.capEyebrow.hidden = !cap.eyebrow;
      this.capTitle.textContent = cap.title || '';
      this.capText.textContent = cap.text || '';
      this.capText.hidden = !cap.text;
    } else {
      this.capText.textContent = cap.text || '';
      this.capText.hidden = !cap.text;
    }
    this.captionSame = same;
    this.markBtns.forEach((b, i) => { if (this.timeline.chapters[i].id === c.id) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    [...this.mobileChapters.querySelectorAll('button')].forEach((b, i) => { if (this.timeline.chapters[i].id === c.id) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    document.getElementById('stage').setAttribute('aria-label', shot.a11y || this.lesson.title);
    this.announce(`${c.number} ${c.title}${secTitle ? ', ' + secTitle : ''}. ${shot.a11y || ''}`);
  }

  setHeading(shot, local) {
    const at = this.captionSame ? 0 : shot.heading?.appearAtMs ?? 700;
    const on = !!shot.heading && local >= at && !this.captionHidden;
    if (on !== this.caption.classList.contains('is-on')) this.caption.classList.toggle('is-on', on);
  }

  /** The caption line: one concise idea at a time (not the transcript). */
  setCaption(text, key) {
    if (this.subtitleHidden) text = '';
    if (key === this.subKey && text === this.subText) return;
    this.subKey = key;
    this.subText = text;
    this.subtitle.replaceChildren(text ? el('span', {}, text) : '');
  }

  setVeil(v, tone) {
    if (Math.abs((this.veilV ?? -1) - v) < 0.002 && this.veilTone === tone) return;
    this.veilV = v;
    this.veilTone = tone;
    this.veil.style.opacity = String(v);
    this.veil.dataset.tone = tone;
  }

  setTime(t, total, chapter, section = null) {
    for (const s of this.segs) {
      const f = Math.max(0, Math.min(1, (t - s.c.start) / (s.c.end - s.c.start)));
      s.fill.style.width = `${f * 100}%`;
      s.seg.classList.toggle('is-current', s.c.id === chapter.id);
    }
    const txt = `${fmt(t)} / ${fmt(total)}`;
    if (txt !== this.lastTime) {
      this.lastTime = txt;
      this.timeEl.innerHTML = `${fmt(t)} <span>/ ${fmt(total)}</span>`;
      this.scrub.setAttribute('aria-valuenow', String(Math.round(t / 1000)));
      this.scrub.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(total)}, ${chapter.title}${section ? ', ' + section.title : ''}`);
    }
  }

  setPlaying(p) {
    this.playBtn.innerHTML = p ? I.pause : I.play;
    this.playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
    this.filmEl.classList.toggle('is-playing', p);
  }

  setVoice(on, attention = false) {
    this.voiceBtn.innerHTML = on ? I.voiceOn : I.voiceOff;
    this.voiceBtn.setAttribute('aria-pressed', String(on));
    this.voiceBtn.setAttribute('aria-label', on ? 'Narration on' : 'Narration off');
    this.voiceBtn.classList.toggle('is-attention', attention);
  }

  setPill(text) {
    this.pill.textContent = text;
  }

  showFigure(on) {
    if (this.figureOn === on) return;
    this.figureOn = on;
    this.figure.classList.toggle('is-on', on);
  }

  /** hide lead words while a panel owns the learner's attention */
  quietWords(on) {
    this.captionHidden = on;
    this.subtitleHidden = on;
    if (on) {
      this.caption.classList.remove('is-on');
      this.setCaption('', 'quiet');
    }
  }

  announce(msg) {
    this.live.textContent = '';
    setTimeout(() => (this.live.textContent = msg), 30);
  }

  showHint(text) {
    this.hint.textContent = text || '';
    this.hint.hidden = !text;
  }

  /** screen rect of the heading, so labels can avoid it */
  reservedRect() {
    if (!this.caption.classList.contains('is-on')) return null;
    const r = this.lead.getBoundingClientRect();
    const f = this.filmEl.getBoundingClientRect();
    return { left: r.left - f.left - 8, top: r.top - f.top - 8, right: r.right - f.left + 8, bottom: r.bottom - f.top + 8 };
  }

  // ------------------------------------------------------------- controls
  bindScrub() {
    const s = this.scrub;
    const toMs = (e) => {
      const r = this.bar.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * this.timeline.total;
    };
    s.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.film-marks')) return;
      s.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.handlers.onSeek(toMs(e));
    });
    s.addEventListener('pointermove', (e) => {
      if (this.dragging) this.handlers.onSeek(toMs(e));
    });
    s.addEventListener('pointerup', () => (this.dragging = false));
    s.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 15000 : 5000;
      const t = this.handlers.time();
      const map = { ArrowRight: t + step, ArrowUp: t + step, ArrowLeft: t - step, ArrowDown: t - step, Home: 0, End: this.timeline.total - 1 };
      if (e.key in map) {
        e.preventDefault();
        this.handlers.onSeek(map[e.key]);
      }
    });
  }

  bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (!this.dialog.hidden) this.closeSettings();
        else this.handlers.onEscape();
        return;
      }
      if (!this.dialog.hidden || !this.start.hidden) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'select', 'textarea'].includes(tag)) return;
      if ((e.key === ' ' && tag !== 'button' && e.target.getAttribute?.('role') !== 'slider') || e.key === 'k') {
        e.preventDefault();
        this.handlers.onPlay();
      }
    });
  }

  bindQuiet() {
    let timer = null;
    const wake = () => {
      this.filmEl.classList.remove('is-quiet');
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (this.filmEl.classList.contains('is-playing') && !this.dragging) this.filmEl.classList.add('is-quiet');
      }, 2600);
    };
    ['pointermove', 'pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, wake, { passive: true }));
    wake();
  }

  fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.filmEl.requestFullscreen?.();
  }

  // ------------------------------------------------------------- settings
  buildSettings() {
    const radios = (name, legend, options, current, onChange) => el('fieldset', { class: 'film-radios' },
      el('legend', {}, legend),
      options.map(([value, label]) => el('label', {},
        el('input', { type: 'radio', name, value, checked: value === current, onChange: () => onChange(value) }),
        el('span', {}, label))));
    const keys = [['Space', 'Play or pause'], ['K', 'Play or pause'], ['← →', 'Timeline: back or forward 5 s (Shift: 15 s)'], ['Esc', 'Close a panel or this dialog']];
    const src = this.sources;
    this.dialogBox = el('div', { class: 'film-dialog__box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
        el('h2', { id: 'settings-title' }, 'Settings'),
        el('button', { class: 'film-btn', type: 'button', onClick: () => this.closeSettings() }, 'Close')),
      radios('motion', 'Motion', [['system', 'Follow system'], ['reduce', 'Reduce'], ['full', 'Full']], 'system', (v) => this.handlers.onMotion(v)),
      el('div', { style: 'height:12px' }),
      radios('caption', 'Caption size', [['standard', 'Standard'], ['large', 'Large']], 'standard', (v) => (document.body.dataset.caption = v)),
      el('div', { style: 'height:12px' }),
      radios('words', 'Captions show', [['captions', 'The main idea'], ['all', 'Every spoken word']], 'captions', (v) => this.handlers.onWords?.(v)),
      el('h3', {}, 'Narration'),
      el('p', { class: 'film-sources', id: 'voice-note' }, ''),
      el('h3', {}, 'Keyboard'),
      el('ul', { class: 'film-keys' }, keys.map(([k, d]) => el('li', {}, el('kbd', {}, k), d))),
      el('h3', {}, 'For teachers'),
      el('div', { class: 'film-sources' },
        el('p', {}, src.intro),
        el('ol', {}, src.items.map((s) => el('li', {}, s))),
        el('p', {}, src.note)));
    this.dialog = el('div', { class: 'film-dialog', hidden: true, onClick: (e) => { if (e.target === this.dialog) this.closeSettings(); } }, this.dialogBox);
    this.dialogBox.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...this.dialogBox.querySelectorAll('button, input, select')].filter((x) => !x.disabled);
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    this.root.append(this.dialog);
  }

  setNarration(available) {
    this.dialogBox.querySelector('#voice-note').textContent = available
      ? 'The narration is recorded in Indian English. Use the speaker button to turn it off or on.'
      : 'This version has no sound. The captions carry the lesson.';
    this.voiceBtn.hidden = !available;
  }

  openSettings() {
    this.lastFocus = document.activeElement;
    this.dialog.hidden = false;
    this.top.style.opacity = '0';
    this.lead.style.opacity = '0';
    this.handlers.onDialog(true);
    this.dialogBox.querySelector('button').focus();
  }

  closeSettings() {
    this.dialog.hidden = true;
    this.top.style.opacity = '';
    this.lead.style.opacity = '';
    this.handlers.onDialog(false);
    this.lastFocus?.focus?.();
  }
}
