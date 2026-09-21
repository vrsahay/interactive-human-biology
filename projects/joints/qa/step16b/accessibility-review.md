# Accessibility review — Step 16B

Everything Step 15B guaranteed had to survive this step, and three new surfaces had to meet the same bar: the landing
card, the spoken-line subtitle, and the exploration task.

---

## 1. The new surfaces

### Landing card
- A real `<button>` in the document, focusable, labelled by its own text (*Start lesson*).
- It is the first focusable element on the page, so a keyboard learner reaches it with one Tab.
- It is not a modal trap: nothing else is interactive behind it while it is shown, and it removes itself on activation.
- Its text is ordinary content: the title (`h1`), the duration and part count, the lesson's thesis and the sound prompt.

### Spoken-line subtitle
- `aria-hidden="true"`, deliberately. The caption and the stage's own `role="img"` description already carry every shot
  for assistive technology; a live region firing every few seconds as sentences advance would talk over both, and would
  repeat what the shot's description has already said.
- It carries `data-text-key` and `data-provenance`, so it is machine-readable for QA and review.
- Under reduced motion it renders the whole line at once with no timed reveal and no animation, honouring the lesson's
  `reducedMotion.captions: "instant"` contract.
- It is withheld while the joint control panel is open, so the two never stack.

### Exploration task
- The prompt is ordinary text inside the panel, which is labelled by the exploration's title.
- Reaching the goal announces the confirmation through the existing polite live region, and the confirmation is also
  rendered with `role="status"`.
- `data-done` on the task element is the machine-readable state the tests assert.
- **The task is completable from the keyboard alone** — that is how the Step-16B test does it: arrow keys move the
  joint, the goal is met, the confirmation appears, Escape returns to the lesson.

### Completion card
- Three real buttons — *Replay*, *Try the recall again*, *Explore the body* — in a `role="group"` labelled *Lesson
  complete*.
- Reachable and operable with the keyboard alone: `step16b-teaching` §9 seeks to the end with the `End` key on the
  timeline slider, tabs through all three actions in order, and activates *Replay* with Enter.

---

## 2. What was re-run

The whole Step-12 and Step-14 accessibility programme, unchanged, plus the new states.

| Check | Result |
|---|---|
| axe — lesson, dialog and interactive states at 1280×800 and 390×844 | **0 violations** |
| axe — explore, task and recall panel states at both widths (12 states) | **0 violations** |
| Measured contrast over the rendered frame — lesson text, 9 states × 2 widths | **346 runs, 0 below threshold** |
| Measured contrast — explore and recall panels | **120 runs, 0 below threshold** |
| Spoken-line subtitle (`.film-subtitle`) | lowest **13.08:1** |
| Landing card (`.film-start__title / __thesis / __eyebrow / __sound`) | lowest **6.84:1** |
| Completion card (`.film-end__title`) | **16.21:1** |
| Exploration task (`.film-explore__task`, `__task-label`) | **16.35:1**, **9.41:1** |
| Keyboard-only journey: all nine chapters, the four tasks, the guided check, the end announced | pass |
| Reduced motion across all 52 shots | pass |
| Target size ≥ 44 px, reflow at 320 px | pass |
| Phone layout at 375, 390 and 412 px: headline above, subtitle below, nothing under the controls, no horizontal scroll | pass — verified directly at 375×812 (caption 435–498, subtitle 511–594, player top 616, `scrollWidth` 375) |

### Two defects the extended sweep found, and this step fixed

1. **The subtitle measured 2.65:1** over lit bone on wide screens — plain text with only a shadow behind it. It now has
   the same feathered backdrop the caption got in Step 13, and measures **13.08:1**. This is exactly why the measured
   sweep exists: axe reported no violation, because axe cannot see what the WebGL frame is drawing behind the text.
2. **The caption was still rendered behind the landing card and the completion card**, so the sweep was measuring text
   a learner cannot read. It is no longer rendered while either card is up.

---

## 3. What did not change

- `lang="en"`, the `main` / `header` / `footer` landmarks, the `role="img"` stage with a per-shot description, and the
  polite live region.
- Every control keeps its `aria-label`; the chapter strip is still fully keyboard-reachable, and the nine chapter
  buttons still meet the 44 px target on a phone.
- The DRAFT badge still carries its full explanation to assistive technology. **The audit noted that this means a
  screen-reader user hears the same 20-word notice after nearly every caption — 36 times before this step, and more
  now that there are more shots. That is still open.** It was outside this step's scope (teaching depth and playback
  reliability) and is carried forward as a known issue.

---

## 4. Known issues carried forward

| Issue | Status |
|---|---|
| The `sr-only` draft disclaimer is announced once per caption | **open** — raised by the Step-16 audit, not addressed here |
| Real NVDA / VoiceOver testing | **NOT TESTED**, unchanged since Step 12 |
| Real Android device / real iPad | **NOT TESTED**, unchanged since Step 12 |
| Step 12 emulated phone ×4 misses | unchanged and still open |

No accessibility certification is claimed.
