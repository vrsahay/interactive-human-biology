# Accessibility review — `step16g-narration-repetition-fixed`

> **NVDA = NOT TESTED**
> **VoiceOver = NOT TESTED**
> **TalkBack = NOT TESTED**

No screen-reader certification is claimed, and none may be issued from this package. If certification is required, a
person must perform real screen-reader walkthroughs. Every item is **PENDING**; record decisions in
`expert-review-status.json → accessibilityHuman`.

The earlier walkthrough script still applies to the interface as it is:
`qa/expert/step15b/screen-reader-checklist.md`. Use it with this candidate.

---

## 1. Automated evidence on this candidate (evidence, not certification)

| Area | Check | Result |
|---|---|---|
| **axe** | desktop and mobile: intro, dialogs, interactive elbow, quiz, explore | 0 violations |
| | every explore panel and both recall states, both widths | 0 violations |
| **Contrast** | measured over the rendered 3D scene, not only by tooling: captions, topic heading, subtitle, panels, controls | 0 below threshold |
| **Keyboard** | the whole lesson completed without a pointer; focus visible; no traps; completion announced | pass |
| | all four exploration tasks completable from the keyboard | pass |
| | on a phone, when the player steps aside for an exploration, focus moves into the panel and returns to the opener | pass |
| **Dialogs** | focus moves in; Tab stays inside; Escape closes; focus returns to the opener | pass |
| **Reduced motion** | over the entire film: cuts instead of travel, no dolly during a shot, static marks | pass |
| **Responsive layout** | 9 widths from 320 to 1440; reflow at 320 px; no horizontal scroll | pass |
| **Targets** | every control ≥ 44 px, at every width tested | pass |
| **aria-live** | one polite, atomic live region: each shot's description; exploration name and task once on entry; task done; recall question, correction and reveal. The provenance classification is **never** announced | pass |
| **Captions** | the topic heading and the spoken sentence (as a subtitle) are on screen for every shot; a large-caption setting is provided | pass |
| **Audio** | narration starts only after the learner presses Start; a narration on/off control is provided | pass |

Sources: `step12-a11y`, `step14-a11y`, `step14-responsive`, `step16e-mobile`, `step16f-hierarchy` and
`step12-motion-visual`, all passing on this candidate.

## 2. Changes since the last package that affect assistive technology

| Step | Change |
|---|---|
| 16D | the per-caption reviewer disclaimer, previously announced after 28 of 52 captions, was removed. The exploration status is announced once on entry |
| 16E | on a phone, the player hides during an exploration and focus moves into the panel. The elbow's duplicate angle readout is visually hidden but stays in the accessibility tree as the live status |
| 16F | the topic heading and the teaching-view status share one top-left region, read in that order |
| 16G | narration timing only; no change to announcements |

The spoken-line subtitle is `aria-hidden` deliberately. The caption and the stage's own description already carry each
shot, and a live region firing every few seconds as sentences advance would talk over both.

## 3. What a human must do

- [ ] **H1** NVDA (Windows) walkthrough of the whole lesson, including both interactive detours. — **PENDING**
- [ ] **H2** VoiceOver (macOS and iOS) walkthrough. — **PENDING**
- [ ] **H3** TalkBack (Android) walkthrough. — **PENDING**
- [ ] **H4** The shot descriptions tell a blind learner what is on screen usefully. — **PENDING**
- [ ] **H5** Announcements are neither missing nor overwhelming. — **PENDING**
- [ ] **H6** A keyboard-only learner can complete every task comfortably, not only technically. — **PENDING**

## 4. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Assistive technology and versions used | |
| Findings | |
| Decision | |
