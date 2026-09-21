# Information density comparison

Counted from the running builds at 1280×800 (ours: `qa/visual/step15b_review/`; reference: live capture).

---

## 1. Persistent UI during teaching

### Reference — 5 persistent elements, 0 controls

| Element | Notes |
|---|---|
| Scene counter | `RESPIRATORY SYSTEM · 04 / 13`, small caps, top-left |
| Scene title | one short noun phrase |
| Progress underline | a 4 px rule under the title |
| Caption | one line, under the title |
| Subtitle | 1–2 lines, bottom-centre, the sentence being spoken |

The control bar carries `class="controls hidden"` and was absent for the whole of scenes 1–8.

### Ours — 15 persistent elements, 13 of them controls

| Element | Kind |
|---|---|
| `TYPES OF JOINTS` | product name |
| `06 HINGE JOINT` | chapter number + name |
| `Teaching view: the moving marks show the kind of movement.` | persistent status pill (Step 15B) |
| Narration on/off | control |
| `Sources & draft status` | control |
| Settings gear | control |
| Progress bar, 10 segments | control |
| Chapter numbers `01`–`09` | **9 controls** |
| Play/pause | control |
| Replay | control |
| Time readout `2:11 / 4:40` | status |
| `Explore this joint` | control — visually the most prominent element on screen after the caption |
| Fullscreen | control |
| Caption panel | content |
| `DRAFT` badge | status, on **36 of 40** shots |

**Nothing auto-hides.** Every item above is on screen for all 280 seconds.

---

## 2. Text on screen at once

| | Reference | Ours |
|---|---|---|
| Distinct text blocks during a typical teaching beat | 4 (counter, title, caption, subtitle) | 6 (name, chapter, teach-mark pill, caption, DRAFT badge, time) + 9 chapter numbers |
| Caption length | 8–14 words | 6–24 words (mean 9.9) |
| Longest caption | 13 words | **24 words** (`ball.shoulder`) |
| Model labels on screen at once | 0–3 (peak 3 in `alveoli`, `exhalation`) | 0–3 during teaching, **6 in `map.all`** |
| Simultaneous distinct concepts at the peak | 1 (gas exchange, with a 3-item legend) | **4** (`compare.together`, `map.all`) |

---

## 3. Where we are visually over-explaining

### 3.1 The DRAFT badge, 36 times
The visible chip is small and fine. The cost is elsewhere: each badge carries a `sr-only` span with the full
sentence *"Draft explanatory text written for this lesson. Not curriculum wording. Requires subject-expert
review before release."* A screen-reader user hears that 36 times in one 4:40 lesson — once after almost every
caption. Step 15B removed the disclaimer from the visible caption; the spoken-to-assistive-tech version is
still per-caption. (Verified in the running build: `.film-badge--draft > .sr-only`.)

### 3.2 Nine chapter buttons, always
At 1280×800 they sit in one row under the progress bar. At 800 px they **wrap to two rows** and the control
band grows to ~150 px; the Explore hint text `Drag to look around · Return to film view` then renders across
the numbers `02 03 04` (observed live at 800×783). They are a navigation aid the learner does not need while
watching, and their presence implies the lesson is a menu of nine things rather than one argument.

### 3.3 The persistent teaching-status pill
`Teaching view: the moving marks show the kind of movement.` is correct, well-contrasted (measured 7.42:1) and
solves a real honesty problem from Step 15B. It is also on screen for most of the lesson in the top-left, next
to the chapter title, competing with it. The reference's equivalent honesty problem does not exist because it
draws no schematic indicators — which is not a solution available to us.

### 3.4 `Explore this joint`, always
A filled pill in the bottom-right, one of the highest-contrast objects on screen, present during every shot —
including the five chapters where pressing it yields only free orbit with no content (see
`explore-comparison.md`).

### 3.5 `compare.together` and `map.all`
Four and six concepts respectively, at once. `map.all` works (short labels, clean leaders). `compare.together`
does not (four schematic indicators on a 1.12× full body, each 10–30 px).

---

## 4. Frequency of visual change

| | Reference | Ours |
|---|---|---|
| Scene/shot changes | 13 in 168 s → **one every 13.0 s** | 40 in 280 s → **one every 7.0 s** |
| Changes per minute | 4.6 | 8.6 |
| Camera moves | continuous slow push-in, no cuts within a scene | 5 dedicated travel shots + per-shot transitions |

A change every 7 s with 8.9 words attached gives the learner less than the time it takes to read the caption
twice before the picture changes. This is the single clearest quantitative difference between the two
products, and it is the mechanism behind "the reference feels calmer".

---

## 5. Interactive elements visible during teaching

| | Reference | Ours |
|---|---|---|
| During a teaching scene | **0** | **13** |
| On demand | 6 (play, prev, replay, mute, Explore, fullscreen) + a 13-tick scrubber | same 13, always |
| Focusable elements in the document | 16 | 18 |

---

## 6. What this does *not* mean

It does not mean we should copy the reference's chrome. Two of our persistent elements exist for reasons the
reference does not have and should survive in some form:

- the **draft / teaching-simulation honesty surface**, which is a deliberate commitment of this project;
- **keyboard-reachable chapter navigation**, which is part of our accessibility posture and is stronger than
  the reference's (the reference has no chapter navigation at all).

The finding is about *persistence and prominence*, not existence. The reference's principle —
**non-essential controls are hidden while teaching and return on demand** — is transferable without giving up
either of those commitments.
