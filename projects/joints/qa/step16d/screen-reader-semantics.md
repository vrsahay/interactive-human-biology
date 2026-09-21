# Screen-reader semantics — Step 16D

The open issue carried forward from the Step-16A audit and restated in §13 of this brief: *"the `sr-only` draft
disclaimer is announced once per caption."* Fixed, and measured.

**No real screen reader was used. NVDA and VoiceOver remain NOT TESTED.** What follows is DOM semantics and automated
tooling.

---

## 1. What was wrong

The provenance badge in the caption carried a visually hidden span with the full reviewer legend:

```html
<span class="film-badge film-badge--draft" data-provenance="draft-enrichment" title="…">
  Draft
  <span class="sr-only">: Draft explanatory text written for this lesson. Not curriculum wording.
                          Requires subject-expert review before release.</span>
</span>
```

Measured across all 52 shots: **28 of them carried it**. A learner using a screen reader heard that twenty-word notice
after more than half the sentences in the lesson. Sighted learners saw a small chip; screen-reader learners got a
paragraph.

The visual and the non-visual experience were not equivalent — the accessible version was *worse*, which is the wrong
way round.

## 2. What it is now

The badge is gone from the caption entirely, visible span and hidden span together. What remains:

| | Where | How often |
|---|---|---|
| The classification itself | `data-provenance` on the caption element | every shot, machine-readable, not announced |
| What the classification means | Settings → For teachers → Sources & draft status, with the marker shown beside each class | on request |
| The honesty a learner needs about schematic movement | the teaching-view status, ordinary text in the document | once per shot that shows indicators, read in normal flow |
| The status of an exploration | the panel's status badge, its one plain line, **and** a single live-region announcement on entry | once, on entry |

Measured after: **0 of 52 shots repeat the disclaimer.**

## 3. Announcements, and when they happen

| Event | Announced | Times |
|---|---|---|
| Shot change | `"<chapter number> <chapter title>. <shot description>"` | once per shot |
| Entering an exploration | `"<joint name>. <task>"` | once, on entry |
| Completing the task | the confirmation line | once |
| Recall question / answer / completion | the question, then the reveal or the correction | once each |
| Play, pause, buffering, selection, end of lesson | the existing short messages | once each |
| **The draft classification** | **never** | **0** |

The spoken-line subtitle is `aria-hidden` on purpose: the caption and the stage's own `role="img"` description already
carry each shot, and a live region firing every few seconds as sentences advance would talk over both.

## 4. No stale status

- The exploration's status is part of the panel, so it leaves with the panel.
- The live region is `aria-live="polite"` with `aria-atomic="true"`; each announcement replaces the last, so nothing
  accumulates.
- Leaving an exploration releases narration ownership and announces nothing further (Step-16C invariant E, still
  passing).
- `step16d-polish` §4 checks all 52 shots for the disclaimer and then checks that entering an exploration still
  announces its status and still shows `data-status="teaching-simulation"` with its plain line.

## 5. No duplicate instructional announcements

The exploration task is announced once, from `enterExplore`. The task cue speaks the same words — but a cue is audio
for everyone, not a second announcement; the live region fires once.

In Step 16D the task cue also stopped appending the drag instruction, so the audio and the announcement now say the
same one thing rather than the announcement saying one sentence and the audio two.

## 6. One change this step made to the visual side, for the same reason

While a dialog is open, the top bar is faded out and made non-interactive. It stays in the DOM and stays focusable, so
**focus still returns to the control that opened the dialog** when it closes — the `step12-a11y` dialog test asserts
exactly that and passes. Without the fade, on a narrow layout the dialog covered the chapter title completely and the
measured contrast of that hidden text was 1.68:1: text no one could read, failing a check it could never pass.

The contrast sweep was corrected in the same breath to skip text that is not visible at all. Measuring invisible text
is not a contrast audit.

## 7. What was verified

| Check | Result |
|---|---|
| Shots repeating the draft disclaimer | **0 of 52** |
| axe, desktop and mobile, across intro / dialogs / interactive elbow / quiz / explore | **0 violations** |
| axe, every explore panel and both recall states, both widths | **0 violations** |
| Keyboard only: the whole lesson, focus visible, no traps, completion announced | pass |
| Dialogs: focus moves in, Tab stays inside, Escape closes, **focus returns to the opener** | pass |
| Measured contrast over the rendered frame | 0 below threshold |
| Exploration status announced once on entry | pass |
| NVDA | **NOT TESTED** |
| VoiceOver | **NOT TESTED** |

No screen-reader certification is claimed.
