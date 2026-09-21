# Screen-reader and accessibility checklist — `step15b-learner-clarity-complete`

## Status

**NVDA = NOT TESTED. VoiceOver = NOT TESTED.**

**No screen-reader certification may be claimed for this build.** No automated tool used here can substitute for a
screen-reader walkthrough, and nothing in this document does.

---

## 1. Automated evidence carried forward

Recorded so a reviewer can weigh it. It is evidence, not approval, and it covers only what a machine can check.

| Check | Result | Report |
|---|---|---|
| axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice) — intro, settings dialog, sources dialog, interactive elbow, quiz, explore, at 1280×800 and 390×844 | **0 violations** across 12 states | `qa/reports/step12.accessibility.json` |
| axe — all four Explore panels and both recall states, at 1280×800 and 390×844 | **0 violations** across 12 states | `qa/reports/step14.accessibility.json` |
| Measured text contrast over the *rendered frame* (glyphs hidden, frame captured, 95th-percentile background luminance under each text box, text colour alpha-composited; WCAG 1.4.3) — lesson text | 237 text runs, **0 below threshold** | `qa/reports/step12.accessibility.json` |
| Measured text contrast — the Explore and recall panels | 104 text runs, **0 below threshold**, lowest **5.52:1** against a required 4.5:1 | `qa/reports/step14.accessibility.json` |
| Measured contrast — the persistent teaching status added in Step 15B | 4 runs, lowest **7.42:1** | `qa/reports/step12.accessibility.json` |
| Measured contrast — the plain teaching note added in Step 15B | 6 runs, lowest **9.28:1** | `qa/reports/step14.accessibility.json` |
| Keyboard-only journey: tab order visible with focus indicators and no trap; play/pause; **all nine chapters from their markers**; the elbow by slider; the guided check answered; the end of the lesson reached with `End` and announced | pass | `qa/reports/step12.accessibility.json` |
| Keyboard-only in both detours: arrows move, Shift coarse, R resets, Escape returns; recall answered with ordinary buttons | pass | `qa/reports/step14.explore.json`, `step14.recall.json` |
| Reduced motion across the whole film: every one of the 39 shots cuts on entry, holds its framing, freezes the indicators, no caption transition, poses step between keyframes | pass | `qa/reports/step12.reduced_motion.json` |
| Target size ≥ 44 px and reflow at 320 px | pass at 320×640, 390×844, 1280×800 | `qa/reports/step12.accessibility.json` |
| Phone-width layout: no panel under the controls, every control on screen and ≥ 44 px, no horizontal scroll | pass at 390 and 412 px | `qa/reports/step14.responsive.json` |
| Correctness never signalled by colour alone (✓ / ✕ glyphs plus an `aria-live` status) | pass | `qa/reports/step14.recall.json` |

**What axe cannot judge here:** every state reports one `incomplete` for `color-contrast`, because the text sits over a
WebGL canvas that axe cannot sample. That is precisely why the measured-contrast pass above exists — it screenshots the
real frame and measures against it.

---

## 2. What a human screen-reader reviewer must do

Nothing below may be marked from automated evidence.

### 2.1 NVDA (Windows, Chrome and Firefox)

- [ ] **S1.1** The lesson can be started and played to the end using NVDA alone. — **PENDING**
- [ ] **S1.2** Each shot's description (`a11y.*`, on the stage element as `role="img"`) is announced at the right moment
      and describes what is on screen usefully. 39 descriptions; they are listed per shot in `review-manifest.json`. — **PENDING**
- [ ] **S1.3** Chapter changes are announced (`"03 Fixed joint. …"`) without drowning the learner. — **PENDING**
- [ ] **S1.4** Play, pause and the timeline slider announce state and position sensibly (`aria-valuetext` gives the time
      and the chapter). — **PENDING**
- [ ] **S1.5** The nine chapter markers are reachable, distinguishable and correctly labelled. — **PENDING**
- [ ] **S1.6** The elbow slider announces degrees and its range. — **PENDING**
- [ ] **S1.7** The guided check: prompt, answer, and the "That is about 90°. Well done." confirmation are all announced. — **PENDING**
- [ ] **S1.8** **Explore**: opening it is announced with the joint's name, its status ("Interactive teaching simulation" /
      "Validated 3D rig") and its instruction; the readout updates are followable; Escape returns. — **PENDING**
- [ ] **S1.9** **Recall challenge**: opening, each question, a wrong answer, a correct answer with its reveal, and the
      completion are all announced; the four options are reachable and labelled. — **PENDING**
- [ ] **S1.10** The settings and sources dialogs trap focus correctly and return it to the opener. — **PENDING**
- [ ] **S1.11** The DRAFT badge is announced, and so is the persistent teaching status *"Teaching view: the moving marks
      show the kind of movement."* — a screen-reader user must learn that content is draft and that an indicator is a
      demonstration, exactly as a sighted user does. **This changed in Step 15B**: the statement moved from a note under
      each caption to one persistent element, so please check specifically that it is reachable, and that it is not
      announced so often that it becomes noise. — **PENDING**
- [ ] **S1.12** Narration and the screen reader do not fight each other. Narration can be switched off from the top bar;
      check that control is reachable and its state is announced. — **PENDING**

### 2.2 VoiceOver (macOS Safari, and iOS if a phone build is in scope)

- [ ] **S2.1** – **S2.12** Repeat every item in §2.1 under VoiceOver. — **PENDING**
- [ ] **S2.13** On iOS, the two learner-paced detours are operable by touch with VoiceOver on. — **PENDING**

### 2.3 Judgements only a human can make

- [ ] **S3.1** Are the shot descriptions the *right* descriptions — do they convey the teaching point, not just the
      picture? — **PENDING**
- [ ] **S3.2** Is the volume of live announcements right, or is it overwhelming during the recall challenge? — **PENDING**
- [ ] **S3.3** Can a blind Class 10 learner actually learn the four categories from this lesson, given that the core
      evidence is visual movement? If not, what would have to change? — **PENDING**
- [ ] **S3.4** Is anything conveyed *only* visually that has no text equivalent? — **PENDING**

---

## 3. Known gaps, stated plainly

- **No real screen reader has ever been run against this product.** Not once, at any step.
- Automated checks cover structure, contrast, keyboard operation, reduced motion and target size. They do not cover
  whether the lesson is *comprehensible* without sight.
- No testing has been done with an actual assistive-technology user.
- No mobile screen-reader testing has been done, on any device.

---

## 4. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Screen reader, version, browser, OS | |
| Findings | |
| Decision | |
