# Accessibility review — Step 16C

This step changed input ownership and audio ownership. Neither adds a learner-facing surface, so the work here was to
prove nothing regressed and that the two ownership changes do not create a confusing assistive-technology state.

---

## 1. What the two changes mean for assistive technology

### The orbit lock
- No DOM change, no new control, no focus change. It is a property of the camera, not of the page.
- **The keyboard path into an exploration is unchanged and is still the complete one**: arrow keys move the joint,
  `R` resets, `Escape` returns. A learner who never touches a pointer is unaffected by a pointer-ownership fix.
- The lock is held for the session and released when it closes, so nothing about it can outlive the panel.

### The narration owner
- The live region is untouched. Announcements are made by `FilmShell` through the existing `aria-live="polite"` region
  and are independent of which audio element is speaking.
- The ownership change makes announcements *less* confusing, not more: previously the film's clip and an exploration
  cue could speak over each other while the live region announced only one of them. Now the spoken line and the
  announced line are the same thing.
- **One behaviour deliberately changed**: the recall completion line is no longer stopped in the same call stack that
  starts it. A screen-reader user hears the whole confirmation rather than a fragment.

## 2. One test changed, and why

`step12-a11y` → *"live announcements: selection in Explore is announced"*.

The test opened the **hinge chapter's joint exploration** and clicked a bone, expecting the selection announcement. A
joint exploration sets `picking: false` on purpose — the learner is there to move the joint, not to select bones — so
selection cannot happen inside one. The test had been passing on a race: `openExplore()` is async, and the click was
landing before the policy change did.

It now uses **free-look Explore**, which is the mode the announcement belongs to and the mode Step 12 wrote it for, and
asserts `picking === true` before clicking so it cannot silently drift back into a race. The assertion it makes about
the live region is unchanged.

This is a test correction, not a behaviour change: selection inside a joint exploration was never intended to work and
does not work before or after Step 16C.

## 3. Full accessibility programme, re-run

| Check | Result |
|---|---|
| axe — lesson, dialog and interactive states at 1280×800 and 390×844 | **0 violations** |
| axe — explore, task and recall panel states at both widths | **0 violations** |
| Measured contrast over the rendered frame — lesson text | **0 below threshold** |
| Measured contrast — explore, task and recall panels | **0 below threshold** |
| Keyboard-only journey: all nine chapters, the four exploration tasks, the guided check, the completion card | pass |
| Dialogs: focus moves in, Tab stays inside, Escape closes, focus returns to the opener | pass |
| Reduced motion across all 52 shots | pass |
| Target size ≥ 44 px, reflow at 320 px | pass |
| Responsive layout checks at 390, 412, 768, 1280, 1440 | pass |
| Live announcements | pass |
| Quiz prompt: exactly one semantic prompt at every width | pass |

## 4. Per-exploration accessibility, checked explicitly

For each of fixed, pivot, ball-and-socket and hinge:

| | |
|---|---|
| The task instruction is announced on entry | `announce(\`${title}. ${task prompt}\`)` — asserted in `step16b-teaching` §3 |
| The task confirmation is announced when the goal is met | asserted in `step16b-teaching` §3, and the task element carries `data-done` |
| **Reset** is a labelled button, reachable by Tab and by `R` | `step14-a11y`, `step14-explore` |
| **Return to the lesson** is a labelled button, reachable by Tab and by `Escape` | `step14-explore`, `step16c-invariants` A1 |
| The whole task is completable from the keyboard alone | `step16b-teaching` §3 does exactly that |

## 5. What is unchanged and still open

| Item | Status |
|---|---|
| The `sr-only` draft disclaimer is announced once per caption | **open**, raised by the Step-16A audit, not addressed here |
| Real NVDA / VoiceOver testing | **NOT TESTED**, unchanged since Step 12 |
| Real Android device / real iPad | **NOT TESTED**, unchanged since Step 12 |
| Step 12 emulated phone ×4 misses | unchanged and still open |

No accessibility certification is claimed, and none of the above changed in this step.
