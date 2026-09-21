# ADR — Step 17: `step16g-narration-repetition-fixed` is the final expert review baseline

**Status:** accepted
**Date:** 2026-09-21
**Supersedes (for review purposes only):** the Step-16E package in `qa/expert/step16e/`, and through it every earlier
package (`qa/expert/step15b/`, `qa/expert/step15/`, `qa/expert/`)

## Decision

**This is the exact candidate build submitted for human review.**

The expert is reviewing:

> **`step16g-narration-repetition-fixed`**, commit **`11560e3c3678954cb10c3c27dda3567aaf53f591`**

and **not** any earlier Step-13, 14, 15 or 16 build.

The final review package is `qa/expert/step17/`. Its `review-manifest.json` hashes the candidate: the lesson, the
locale, the narration clips and manifest, every production asset, the master Blender file, the web build and the 151
review captures. It also records a git diff proving that no product file changed between the candidate tag and the
commit that added the package.

## Context

The last package, `qa/expert/step16e/`, described `step16e-mobile-finalization-complete`. Two learner-facing steps
followed it:

- **Step 16F** (`4570371`, `step16f-text-hierarchy-complete`) moved the current-topic heading from a large lower-left
  card to a medium heading at the top left, under the chapter line.
- **Step 16G** (`11560e3`, `step16g-narration-repetition-fixed`) fixed a real narration playback bug.
  - **The fault:** a clip could start about 350 ms before its lead-in ended. The sync code then pulled it back 0.3 s, so
    a learner heard the end of a word and then the word again: "… joints … joints".
  - **The fix:** narration respects its lead-in. Audio is never rewound because it is ahead: it waits silently for the
    lesson. When slightly behind it catches up at up to 1.15× without a pitch change, and it seeks forward only after a
    stall of more than 1.5 s. Pausing during the lead-in cannot start it.
  - **Measured, full lesson:** mid-sentence replays went from 3 to **0**; clips starting before their lead-in went from
    35 of 35 to **0 of 52**; **0** words skipped.

A reviewer signing the Step-16E package would therefore be signing a build with a heading layout that no longer exists
and a narration fault that a learner could hear. Hence a new package, for the build that exists now.

## Consequences

- **Every expert decision starts PENDING** in `qa/expert/step17/expert-review-status.json`:
  - expert review overall;
  - anatomy, curriculum, teaching methodology, narration, camera, Explore;
  - landmarks, the 0–145° range;
  - human accessibility, human mobile;
  - hip classification, asset licence, taxonomy, the draft-enrichment strings.

  Only the named reviewer may change them, and no automated result may.
- **Automated evidence on this candidate** (recorded in `qa/expert/step17/automated-evidence.json`): typecheck clean,
  104 / 104 unit tests, 118 / 118 end-to-end tests, 0 console errors. It is evidence, not approval.
- **Historical status is preserved unchanged:**

  | Item | Status |
  |---|---|
  | Step 12 | FAIL |
  | NVDA / VoiceOver / TalkBack | NOT TESTED |
  | Real Android / iPad | NOT TESTED |
  | Asset licence | RELEASE BLOCKER |
  | Formal Gate 3 | PENDING EXPERT LANDMARK APPROVAL (`qa/elbow_r.poses.draft.json` stays a draft) |
  | Hip classification | PENDING EXPERT CONFIRMATION |

- **The product was not modified to produce this package.** The package commit adds only QA tooling and documents.
- **If the expert requests a change,** the change produces a new candidate, and that candidate needs a new package.
  This package would then be the record of what was reviewed, as its predecessors are.

The product is **not public-release ready**. The asset licence alone blocks release.
