# ADR — Step 15A: `step14b-complete` is the expert review baseline

**Status:** accepted
**Date:** 2026-09-18
**Supersedes (for review purposes only):** the Step-13 review package in `qa/expert/`

## Context

Step 13 froze a build and prepared an expert sign-off package for it. That package was never signed: every item in it is
still `PENDING`. Meanwhile Steps 14 and 14B changed the thing an expert would be signing off:

- The lesson went from **6 chapters to 9**. A hook and a concept chapter were added in front of the four categories, a
  comparison chapter and a retrieval challenge behind them, and the labelled body map moved to the end as a summary.
- A **universal Explore system** was added, giving all four categories a learner-driven interaction rather than only the
  elbow.
- The recap became a **retrieval challenge** with five questions, in its own chapter.
- **Narration was extended to every instructional line**, including the learner-paced ones that were previously silent.
- The guided 90° check moved from the end of the lesson into the elbow chapter.

An expert asked to sign the Step-13 package would be signing a description of a product that no longer exists. The
options were to amend the Step-13 package in place, or to build a new one for the current candidate.

## Decision

**Build a new package at `qa/expert/step15/` for the `step14b-complete` candidate build, and leave the Step-13 package
untouched.**

- `step14b-complete` (commit `d6ec8d8e96b745bec53f648fa4b64e55d2678fd9`) is the review candidate.
- The Step-13 package stays exactly as it was frozen. It is the honest record of what was frozen then, and rewriting it
  would destroy that record. It is marked superseded *for review purposes* in the new manifest, not deleted or edited.
- The new package is **hash-backed**: `review-manifest.json` records a SHA-256 for every Blender file, production asset,
  lesson file, narration clip, web build file, review capture and QA report the expert is being asked to look at.
- The new package **proves** rather than asserts that Step 15A changed no product file: the manifest carries a
  `git diff` of `src/`, `content/`, `public/`, `blender/`, `index.html`, `vite.config.ts`, `package.json` and
  `package-lock.json` between the candidate tag and the package commit, and the working-tree status of the same paths.

## Consequences

**Every expert decision starts at PENDING and can only be moved by a named human.** `expert-review-status.json` contains
the seven top-level decisions (`expertReview`, `anatomy`, `curriculum`, `landmarks`, `145DegreeRange`,
`accessibilityHuman`, `assetLicence`), all `PENDING`. The generator writes that file **only if it does not already
exist**, so re-running it can never overwrite a reviewer's work.

**Automated evidence is carried forward but never promoted.** The package quotes what the test suite measured — 0 axe
violations across 24 states, 335 measured text runs above threshold, 75 e2e and 97 unit tests passing, the performance
A/B — and labels all of it evidence. No checklist item may be ticked because a test passed. This is stated at the top of
the checklist and repeated in each sheet.

**Three things stay explicitly unresolved, and the package is built to keep them that way:**

1. **Asset licence — RELEASE BLOCKER.** The licence of `Human_Body_Master.blend` is unknown; every derived asset the
   build ships is a derivative work. The sheet records what evidence exists (none) and refuses to infer a licence from a
   file name, a naming convention or an exporter string. The synthesized narration audio is recorded as a separate,
   also-unanswered question.
2. **Formal Gate 3 — PENDING EXPERT LANDMARK APPROVAL.** `qa/elbow_r.poses.draft.json` remains a draft with no
   `approvedBy` field and is deliberately **not** renamed to `qa/elbow_r.poses.json`. Step 15A did not touch it.
3. **Screen readers — NOT TESTED.** NVDA and VoiceOver have never been run against this product. The checklist gives a
   human reviewer the walkthrough to perform; no certification may be claimed until they do.

**The validated/schematic distinction is the spine of the review.** Section 0 of the checklist asks the reviewer to
confirm they have understood it before anything else, because several later items only make sense in its light: the right
elbow is a validated procedural rig; the skull, C1/C2 and shoulder interactions are teaching simulations; the hip and
knee are named and indicated but animated by nothing. The build enforces this — `checkExploreConfigs()` fails the build if
a group-driven exploration declares itself a validated rig — and the package states it in every sheet.

**The hip stays PENDING EXPERT CONFIRMATION.** No reachable NCERT source states that the hip is a ball-and-socket joint,
so the lesson names it but never asks a learner to answer it in the recall challenge. The curriculum sheet asks the
reviewer to confirm, correct, or require its removal.

**Step 12 stays FAIL.** The two emulated phone ×4 misses (2742 ms first meaningful 3D against 2500 ms; 45.1 ms drag p95
against 22 ms) are recorded unchanged, alongside the fact that no real Android device and no real iPad has ever been
measured. The performance sheet records and does not recommend.

**What this ADR does not say.** It does not say the product is good, correct, teachable, accessible or releasable. It
says only that this is the build an expert should look at, that this is exactly what it consists of, and that nothing has
been decided on their behalf.

## Status of the product after this step

**READY FOR HUMAN EXPERT SIGN-OFF. NOT PUBLIC RELEASE READY.**
