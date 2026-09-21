# Accessibility review — Step 16D

Step 16D removed content from the accessibility tree (the repeated draft disclaimer), added a subtitle element, and
changed how the top bar behaves while a dialog is open. Each of those was re-checked rather than assumed.

**No real screen reader was used. NVDA and VoiceOver remain NOT TESTED, and no screen-reader certification is
claimed.** What follows is automated tooling, DOM semantics, keyboard operation and measured contrast.

---

## 1. The defect this step fixed

The `sr-only` draft disclaimer was announced once per caption — a twenty-word reviewer notice after **28 of 52 shots**.
Sighted learners saw a small chip; screen-reader learners heard a paragraph. The non-visual experience was worse than
the visual one, which is the wrong way round.

| | Before | After |
|---|---|---|
| Shots whose caption carried the hidden disclaimer | **28 of 52** | **0 of 52** |
| Where the classification now lives | the caption, spoken aloud | `data-provenance` (machine-readable, not announced) + Settings → For teachers |

Full detail in [screen-reader-semantics.md](screen-reader-semantics.md).

## 2. Automated tooling

| Check | Result |
|---|---|
| axe, desktop: intro, dialogs, interactive elbow, quiz, explore | **0 violations** |
| axe, mobile: the same five surfaces | **0 violations** |
| axe, each of the four explore panels and both recall states, both widths | **0 violations** |

## 3. Keyboard

| Check | Result |
|---|---|
| The whole lesson completed without a pointer, focus visible throughout, no traps, completion announced | **pass** |
| Dialogs: focus moves in, Tab stays inside, Escape closes, **focus returns to the opener** | **pass** |
| All four exploration tasks completable from the keyboard alone | **pass** |
| The recall challenge answerable from the keyboard | **pass** |
| Target size ≥ 44 px | **pass** |
| Reflow at 320 px, no horizontal scroll | **pass** |

The focus-return assertion matters this step: the top bar is now faded and made non-interactive while a dialog is open.
It stays in the DOM and stays focusable, which is why focus still returns to the control that opened the dialog. Had
the bar been removed from the layout instead, that test would fail — it was tried, and it did.

## 4. Contrast, measured over the rendered frame

Not only automated tooling: the sweep samples the actual composited pixels behind each piece of text, over lit bone and
over dark background, at every viewport in the responsive set.

| | Result |
|---|---|
| Text below threshold | **0** |
| New this step: the spoken-line subtitle over lit bone | 2.65:1 before its backdrop, **13.08:1** after |
| The chapter title behind an open dialog | previously measured at 1.68:1 — text nobody could read; now faded out, and the sweep skips text that is not visible |

Measuring text that is invisible is not a contrast audit. The sweep was corrected to skip text at effectively zero
alpha in the same change that faded the bar.

## 5. Announcements

One live region, `aria-live="polite"` with `aria-atomic="true"`, so each announcement replaces the last and nothing
accumulates.

| Event | Times announced |
|---|---|
| Shot change — chapter number, chapter title, shot description | once per shot |
| Entering an exploration — joint name and task | once, on entry |
| Task completed | once |
| Recall question, correction, reveal | once each |
| Play, pause, buffering, selection, end of lesson | once each |
| **The draft classification** | **never** |

The subtitle is `aria-hidden` deliberately: the caption and the stage's own `role="img"` description already carry
each shot, and a live region firing every few seconds as spoken sentences advance would talk over both.

## 6. Equivalence

The brief's requirement is that removing review noise must not remove information a non-visual learner needs. What was
removed was *reviewer* information, not *learner* information. What a learner needs is still there, in ordinary
readable text rather than a hidden span:

- The teaching-view status — that a movement is schematic — is visible text in normal reading flow, once per shot that
  shows indicators.
- An exploration's status is in the panel, as a badge plus one plain line, announced once on entry.
- The evidence layer is one control away, in Settings → For teachers → Sources & draft status, with each provenance
  class and its marker listed.

## 7. What is still not claimed

| | |
|---|---|
| NVDA | **NOT TESTED** |
| VoiceOver | **NOT TESTED** |
| TalkBack | **NOT TESTED** |
| Real phones and tablets | **NOT TESTED** — the responsive work is viewport emulation in one desktop browser |
| WCAG conformance statement | **not made** |

`qa/release/screen-reader-checklist.md` and `qa/release/device-certification.md` are unchanged and still say so. The
Step-12 mobile misses are preserved as historical evidence and were not edited.
