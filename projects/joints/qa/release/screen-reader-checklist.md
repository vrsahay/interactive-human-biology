# Screen-reader test checklist

**Status: NOT AVAILABLE — MANUAL TEST REQUIRED.** No screen reader was available in this environment, so no item below has
been executed. Automated checks (axe: 0 violations; measured contrast: 196 rows, 0 failures; keyboard journey; reduced
motion; one semantic quiz prompt) do **not** substitute for a real screen-reader pass and must not be reported as one.

Test on both:

- **NVDA + Chrome** and **NVDA + Edge** on Windows (latest stable NVDA)
- **VoiceOver + Safari** on macOS, and **VoiceOver + Safari** on iPadOS if an iPad is obtained

Run the whole lesson twice per combination: once with the mouse unplugged (keyboard only), once in browse mode.

## Design facts the tester needs

- The 3D label overlay is `aria-hidden="true"`. Anatomy label names (Humerus, Radius, …) are **never announced**; all
  educational content must reach the user through captions, the `aria-live` announcements and the shot descriptions
  (`a11yKey` per shot). Confirm this is acceptable or raise it.
- The film is a `<main>` landmark; dialogs are modal with a focus trap and Escape-to-close; the timeline is a custom control
  with a 44 px track; the flexion control is `role="slider"` with `aria-valuenow`/`aria-valuetext`.
- The quiz prompt is rendered exactly once: when the caption already carries the prompt text, the interaction panel is
  labelled by it (`aria-labelledby`) instead of repeating it.

## Checklist

| # | Item | What must be announced | NVDA+Chrome | NVDA+Edge | VO+Safari | Result |
|---|---|---|---|---|---|---|
| 1 | Chapter announcement | The chapter number and name when the chapter changes (e.g. "05 Hinge joint") | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 2 | Shot announcement | The per-shot description (`a11yKey`) as each shot begins, without interrupting the caption | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 3 | Play / pause | Button name and state change; the control is reachable and operable by keyboard | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 4 | Current time | Elapsed and total time available on demand (not spammed on every tick) | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 5 | Timeline position | The scrub control exposes its position and range, and seeking by keyboard announces the new position | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 6 | Current flexion | The slider announces name, value in degrees, and the range status (approximate teaching range) | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 7 | Selected structure | Entering Explore and selecting a structure announces the structure name | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 8 | Quiz prompt | The prompt is announced exactly once, not twice (caption + panel) | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 9 | Quiz feedback | "correct" / "not quite yet" is announced when the answer is checked (`role="status"`) | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 10 | Lesson complete | Completion is announced when the film ends | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 11 | Dialogs | Opening announces the dialog name; focus moves inside; Tab stays inside; Escape closes; focus returns to the opener | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 12 | Settings dialog | Quality, motion and caption-size groups announce as grouped radios with their current value | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 13 | Sources dialog | The provenance legend, the DRAFT explanation, the elbow-range citation and the pending licence line are all readable in order | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 14 | Provenance badges | The DRAFT badge is announced (or its meaning is otherwise conveyed) so a user does not mistake draft text for curriculum wording | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 15 | Schematic notes | The schematic-indicator notes are announced with their captions, so a non-sighted user learns that those joints are not animated | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 16 | Buffering / errors | A buffering pill and a load error are announced rather than leaving silence | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 17 | Reduced motion | With OS reduced-motion on, nothing animates and no announcement storm occurs | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |
| 18 | No announcement storm | During a 30 s drag the live region does not announce on every frame | ☐ | ☐ | ☐ | MANUAL TEST REQUIRED |

## Reporting

Record one row per combination with the exact NVDA/VoiceOver and browser versions, verbatim announcements where they differ
from the expectation, and any item that fails. Write the results to `qa/reports/step13.screenreader.<combination>.json` and
update `qa/expert/step13_review.json` item 14. Until then, item 14 stays PASS_WITH_NOTE with screen-reader testing
NOT AVAILABLE.
