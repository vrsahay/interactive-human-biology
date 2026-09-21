# ADR — Step 13 release readiness (Milestone 1)

Date: 2026-09-18. Status: **accepted as a record of state.** This is not a release approval and not a certification.

The product is **FROZEN** for expert sign-off. Build identity and hashes: `qa/expert/frozen-build.json`.

## Decision

**Milestone 1 is READY FOR HUMAN EXPERT SIGN-OFF. Public release is NOT READY.**

The implementation is finished and internally verified to an unusual depth: the one rigged joint agrees with its Blender
source to below a thousandth of a millimetre, every shipped asset is content-addressed and verified, and the automated
accessibility, reduced-motion, responsive, delivery and regression suites all pass with zero console errors. What is
missing is not code. It is **external authority** — a subject-matter reviewer, a licence, two physical devices and a
screen reader. None of those can be replaced by more testing, and this project does not pretend otherwise.

Deliberately not written anywhere in this repository: "production certified", "public release ready", "mobile certified",
"mobile target passed", or any claim that the anatomy is openly licensed.

## What is proven

Evidence exists in the repository and needs no human judgement to stand.

1. **The elbow moves exactly as its Blender rig does.** Runtime versus Blender at 0°, 45°, 90° and 145°: worst anchor
   deviation 0.0002 mm across 17 anchors and 49 structures (`qa/reports/elbow_r.gate3.step12.json`).
2. **The layers agree.** 12 of 12 cross-layer checks match across Blender → GLB → manifest → Three.js, including the
   Z-up/Y-up pivot conversion and the fitted flexion axis to 0.0012° (`qa/expert/step13_cross_layer.json`).
3. **One input path.** Drag, slider, keyboard and API all reach `JointController.setDof`; the controller is limited to
   0–145° both in Blender and in the manifest.
4. **Asset integrity.** The master `.blend` is unchanged and matches its pin (`f7313dab…`); the working file, v001–v004,
   the three elbow GLBs and the elbow manifest are byte-identical to the Step-11 baseline; promoted body assets verify
   against their manifests (v2 6/6, v3 8/8); Gate 2 19 checks 0 failures; body delivery 61 checks 0 failures.
5. **Provenance discipline.** 114 visible strings classified with none unclassified: exactly **one** source-backed
   sentence, 17 figure-reference names, 18 draft-enrichment strings (every one DRAFT-badged), 73 interface strings and 5
   system honesty notes. A unit test rejects invented citations (`qa/expert/content_provenance.json`).
6. **Nothing measured is presented as more than it is.** The fitted axis says it is fitted to this model; both ligament
   bands render as "Schematic ligament band" and no string describes band length as strain or biomechanics; every
   captioned shot with a schematic indicator says so, enforced by a unit test.
7. **Automated accessibility.** axe 0 violations across 12 scopes; 201 measured contrast rows over the rendered scene with
   0 failures (tightest 3.50:1 against 3:1); keyboard-only completion with working dialog traps; 44 px targets; 320 px
   reflow; reduced motion across every shot; exactly one semantic quiz prompt at four widths.
8. **Tests.** 90 unit tests, 48 Playwright tests, typecheck clean, 0 console errors — including across the six
   performance-lab profiles.
9. **Performance on real hardware.** Integrated-GPU laptop: first meaningful 3D 592 ms p50 on broadband and 1426 ms on an
   emulated Fast 4G link; drag and Explore vsync-locked at 60 fps with p95 17 ms.
10. **Four defects found in review were fixed before the freeze**, each with a regression test: the deferred-attach leak
    that showed the fitted elbow axis during the schematic ball-and-socket and pivot chapters; three shots showing
    schematic indicators without a disclaimer; a requested band label silently dropped by the layout; and a
    caption-contrast regression introduced by the added note (2.80:1 → 3.50:1).

## What is expert-pending

Coherent and evidenced, but requiring a qualified human decision. None of these may be converted to GREEN by automated
evidence.

| Item | Status | Artifact |
|---|---|---|
| Structure naming, movement direction, movement plane, hinge-axis simplification | PENDING_EXPERT | `qa/expert/reviewer-checklist.md` A1, A4, A5, A6 |
| Elbow teaching range 0–145° (reviewer must decide PASS or REQUEST_FIX) | PENDING_EXPERT | checklist B3 |
| Curriculum wording of 18 draft-enrichment strings | PENDING_EXPERT | `qa/expert/curriculum-review.md` |
| "Hip as ball-and-socket" | PENDING EXPERT CONFIRMATION — no reachable NCERT source states it; corroborated only by a non-NCERT source; **retained, not removed** | checklist B2 |
| Retaining exactly four categories (Fixed, Pivot, Ball-and-socket, Hinge) | PENDING_EXPERT — official NCERT material also contains gliding and partially movable; **none added by design** | checklist B1 |
| Formal Gate 3 landmarks (8 candidates, tolerances 2–4 mm) | PENDING EXPERT LANDMARK APPROVAL — draft deliberately **not** renamed to `qa/elbow_r.poses.json` | `qa/elbow_r.poses.draft.json` |
| Whether the six unshown elbow landmarks should be named | PENDING_EXPERT | checklist A18 |
| Whether the validated-versus-schematic distinction is clear to a learner | PENDING_EXPERT | checklist A19 |
| Mobile caption prominence on a 390 px screen | PENDING | `qa/visual/step12/regression/390x844/` |

## What is not tested

Evidence that cannot be produced in this environment. It is absent, not inferred.

| Item | Status |
|---|---|
| Mid-range Android phone, real hardware | **NOT AVAILABLE** — no such device was ever available; every phone number in this project is emulation on a development laptop |
| iPad, real hardware | **NOT AVAILABLE** |
| NVDA + Chrome / Edge | **NOT TESTED** — no screen-reader certification is claimed |
| VoiceOver + Safari (macOS / iPadOS) | **NOT TESTED** |
| Canonical NCERT Class 6 chapter "Body Movements" | **NOT AVAILABLE** — no longer published on ncert.nic.in (404); the repository still contains no NCERT files |
| Formal Gate 3 landmark comparison | **INACTIVE** until landmarks are approved |
| Thermal and battery behaviour on a phone | **NOT TESTED** — emulation never throttles thermally |

**Step 12 remains FAIL.** Step 13 does not relabel it. Its five unresolved items are unchanged: emulated phone ×4 first
meaningful 3D 2742 ms p50 against a 2500 ms target; emulated phone ×4 drag 45.1 ms p95 against a 22 ms target; no real
Android; no real iPad; no real screen-reader test. The two performance figures are **emulation, not certification**, and
Step 12R established that the ×4 frame loss does not respond to removing application work — so the next step there is
measurement on real hardware, not further optimisation.

## What blocks public release

1. **Source anatomy licence — RELEASE BLOCKER.** No licence text, author, copyright metadata, vendor or acquisition record
   exists for `Human_Body_Master.blend`, and the web build ships derivative geometry and textures. Until the licence is
   identified and derivative-work plus redistribution rights are confirmed, the product must not be published or
   distributed, and the anatomy must not be described as open-source or public domain
   (`qa/expert/asset-provenance-review.md`).
2. **Expert sign-off.** The anatomical and curriculum reviews are unstarted; the hip claim and the 0–145° range both need
   an explicit decision.
3. **Formal Gate 3.** Landmarks must be approved and saved as `qa/elbow_r.poses.json` before formal validation can run.
4. **Device certification.** One mid-range Android phone and one iPad, five fresh cold runs each, against
   `qa/release/device-certification.md`; the two open ×4 performance items resolved with real-device numbers.
5. **Screen-reader testing.** The manual NVDA and VoiceOver checklist must be completed
   (`qa/expert/screen-reader-checklist.md`).

## Consequences

- The product may be demonstrated internally and sent for expert review. It may not be published, distributed, or
  described as mobile-optimised, production-certified or release-ready.
- The frozen core stays frozen: master, working file, checkpoints, elbow GLBs and manifest, and the promoted body assets.
  The one knowingly stale field — the manifest's `rangeStatus`, still reading "approximate, pending cited reference"
  although an external reference now exists — is left alone deliberately, because editing it would mean re-promoting a
  SHA-pinned asset for a wording change. The learner-facing caption and the Sources dialog already carry the citation.
- No rigs exist for the skull, C1/C2, shoulder, hip or knee, and none were built. The lesson states that only the elbow is
  animated from a validated rig, and that remains true until such a rig is actually validated.
- If any frozen hash changes without a documented, reviewed reason, work stops until it is explained.
