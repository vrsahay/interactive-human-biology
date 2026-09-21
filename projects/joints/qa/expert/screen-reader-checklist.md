# Screen-reader checklist — manual tests only

**Status: NOT TESTED.**

| Screen reader | Status |
|---|---|
| NVDA (Windows, with Chrome and with Edge) | **NOT TESTED** |
| VoiceOver (macOS Safari, and iPadOS Safari if an iPad is obtained) | **NOT TESTED** |

No screen reader was available in this environment. **No screen-reader certification is claimed.** Every item below is a
manual test that a human must perform; none can be satisfied by an automated tool.

What automated tooling already established (and what it does not cover): axe reports 0 violations across 12 scopes, 201
measured contrast rows pass, the keyboard journey completes, reduced motion is honoured, and the quiz prompt appears exactly
once in the accessibility tree. None of that tells you how the lesson actually sounds.

Engineering counterpart with the detailed test plan: [../release/screen-reader-checklist.md](../release/screen-reader-checklist.md).

## Facts the tester needs before starting

- The 3D label overlay is `aria-hidden="true"`. Anatomy label names (Humerus, Radius, Elbow joint, the ligament bands) are
  **never announced**. All teaching content must reach a non-sighted learner through the captions, the live-region
  announcements and the per-shot descriptions. Decide whether that is acceptable.
- The film is a `<main>` landmark. Dialogs are modal with a focus trap and Escape to close.
- The flexion control is `role="slider"` with `aria-valuenow` and `aria-valuetext`.
- When the caption already carries the quiz prompt, the interaction panel is labelled by it rather than repeating it.

## Manual checks

Each item: perform the action, record what was actually announced, then decide.

| # | Item | Expected announcement | Status | Reviewer | Comments | Decision |
|---|---|---|---|---|---|---|
| 1 | Chapter change | chapter number and name, e.g. "05 Hinge joint" | NOT TESTED | | | |
| 2 | Shot change | the per-shot description, without cutting off the caption | NOT TESTED | | | |
| 3 | Play / pause | button name and new state | NOT TESTED | | | |
| 4 | Current time | elapsed and total available on demand, not spoken every tick | NOT TESTED | | | |
| 5 | Timeline position | position and range exposed; keyboard seek announces the new position | NOT TESTED | | | |
| 6 | Current flexion | slider name, value in degrees, and that the range is an approximate teaching range | NOT TESTED | | | |
| 7 | Selected structure (Explore) | the structure name on selection | NOT TESTED | | | |
| 8 | Quiz prompt | announced exactly once, not twice | NOT TESTED | | | |
| 9 | Quiz feedback | "correct" / "not quite yet" when checked | NOT TESTED | | | |
| 10 | Lesson complete | completion announced | NOT TESTED | | | |
| 11 | Dialogs | name on open, focus moves in, Tab stays inside, Escape closes, focus returns | NOT TESTED | | | |
| 12 | Settings dialog | quality, motion and caption-size groups announce as grouped radios with current value | NOT TESTED | | | |
| 13 | Sources dialog | provenance legend, DRAFT explanation, elbow-range citation and pending-licence line readable in order | NOT TESTED | | | |
| 14 | DRAFT badges | the draft status is conveyed, so draft text is not mistaken for curriculum wording | NOT TESTED | | | |
| 15 | Schematic notes | the schematic-indicator notes are announced with their captions, so a non-sighted learner learns those joints are not animated | NOT TESTED | | | |
| 16 | Buffering and errors | announced rather than silent | NOT TESTED | | | |
| 17 | Reduced motion | nothing animates; no announcement storm | NOT TESTED | | | |
| 18 | No announcement storm during interaction | a 30 s drag does not announce on every frame | NOT TESTED | | | |
| 19 | Anatomy names unavailable by design | confirm the aria-hidden label overlay is acceptable, or request a fix | NOT TESTED | | | |

## Sign-off

- Screen reader and version:
- Browser and version:
- Operating system:
- Reviewer:
- Date:
- Overall decision: PENDING (PASS · PASS_WITH_NOTE · REQUEST_FIX · NOT_APPLICABLE)
- Items requiring a fix:
