// Step 15B: bring the reviewer sheets carried over from the Step-15A package up to date with what actually changed.
// Every substitution is exact and must match once, so a stale sentence cannot survive quietly.
import { readFileSync, writeFileSync } from "node:fs";

const D = "qa/expert/step15b/";
const edit = (file, subs) => {
  let s = readFileSync(D + file, "utf8");
  for (const [a, b] of subs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 match, got ${n}: ${a.slice(0, 70)}`);
    s = s.replace(a, b);
  }
  writeFileSync(D + file, s);
  console.log("patched", file);
};

const SUPERSEDES_OLD = `This package **supersedes** the Step-13 package in \`qa/expert/\` for review purposes. That package is not wrong; it
describes a build that is no longer the candidate. Steps 14 and 14B changed the learner experience: 6 chapters became 9,
a universal Explore system was added for all four categories, the recap became a retrieval challenge in its own chapter,
and all of it gained narration. The Step-13 package is retained unchanged as the record of what was frozen then.`;

const SUPERSEDES_NEW = `This package **supersedes** the Step-15A package in \`qa/expert/step15/\`, which itself superseded the Step-13 package in
\`qa/expert/\`. Both are retained unchanged: each is the honest record of the build it described.

**What changed since the Step-15A package.** The Step-14B build was watched end to end as a beginner, and Step 15B fixed
the six things that got in the way. None of it changed the lesson architecture, the Explore system, the four categories
or the validated elbow. In summary, detailed in \`qa/step15b/learner-clarity-review.md\`:

1. The repeated technical disclaimer — the same reviewer-language sentence under 19 of 38 captions — moved out of the
   teaching flow. It is now a compact persistent status on the stage while the movement marks are visible, one plain line
   on entering a teaching-simulation exploration, and the full technical wording in the Sources dialog. **No metadata was
   removed**, and the invariant is now checked for uncaptioned shots too.
2. "At the elbow, the humerus meets the radius and the ulna" became "The elbow is where the upper-arm bone meets two
   bones in the forearm"; the three names stay on the labels already on the model.
3. "Axis" is introduced once, in the shot that shows the blue line, explained before it is named.
4. The pivot chapter gained a beat that looks at the two neck bones with nothing moving, from a framing in which they are
   actually visible. Same teaching simulation, no new rig, no claim about C1/C2 mechanics.
5. Flexion and extension are tied to the action and reused in the elbow exploration.
6. The one silent transition now says what it is doing; no shot in the lesson is silent.

The on-screen status words changed with it: a teaching simulation is badged **"Teaching simulation"**, and the validated
elbow is badged **"3D joint model"** rather than "Validated 3D rig" — it no longer tells the learner about its own
validation. The underlying \`status\` values, the \`data-status\` attribute and the build-time refusal to let a group-driven
exploration claim to be a validated rig are all unchanged.`;

edit("reviewer-checklist.md", [
  [SUPERSEDES_OLD, SUPERSEDES_NEW],
  [
    "| **Right elbow (hinge)** | **VALIDATED PROCEDURAL RIG** — single degree of freedom `flexion`, fitted axis, 0–145° approximate teaching range, driven by the joint controller |",
    '| **Right elbow (hinge)** | **VALIDATED PROCEDURAL RIG** — single degree of freedom `flexion`, fitted axis, 0–145° approximate teaching range, driven by the joint controller. On screen the learner sees only the neutral badge **"3D joint model"**. |',
  ],
  [
    "- [ ] **0.1** I have understood which content is validated and which is a teaching simulation. — **Status: PENDING**",
    "- [ ] **0.1** I have understood which content is validated and which is a teaching simulation. — **Status: PENDING**\n- [ ] **0.1b** Step 15B moved this statement out of the captions and into a persistent status plus the Sources dialog.\n      Confirm that is the right balance: honest enough for a teacher, quiet enough for a learner. — **Status: PENDING**",
  ],
  [
    '- [ ] **0.2** The on-screen wording of that distinction ("Interactive teaching simulation" / "Validated 3D rig", and the\n      schematic notes) is honest and will not mislead a Class 10 learner or their teacher. — **Status: PENDING**',
    '- [ ] **0.2** The on-screen wording of that distinction — the badge **"Teaching simulation"**, the badge **"3D joint\n      model"**, the persistent stage status *"Teaching view: the moving marks show the kind of movement."*, and the full\n      technical wording in the Sources dialog — is honest and will not mislead a Class 10 learner or their teacher. — **Status: PENDING**',
  ],
  [
    "| 03–06 | Fixed, Pivot, Ball-and-socket, Hinge | Where → what it does → watch it → name it → why → explore |",
    "| 03–06 | Fixed, Pivot, Ball-and-socket, Hinge | Where → what it does → watch it → name it → why → explore. The pivot chapter now looks at the two neck bones before turning them. |",
  ],
  [
    "Counts in the candidate build: **1** source-backed sentence, **13** figure-reference labels, **60** draft-enrichment\nteaching lines, **10** interface-only strings.",
    "Counts in the candidate build: **1** source-backed sentence, **13** figure-reference labels, **61** draft-enrichment\nteaching lines, **8** interface-only strings. Fourteen of the draft lines were changed or added by Step 15B and have\nnever been reviewed by anyone.",
  ],
  [
    "| Fixed | Skull, frontal + right parietal | drag or arrows; it resists | ±0.5°, springs back | Interactive teaching simulation |\n| Pivot | Head on C1/C2 | drag left/right, ←/→ | −60° … +60° about the vertical | Interactive teaching simulation |\n| Ball-and-socket | Right shoulder | drag any direction, arrows | −95°…+15° × −40°…+85° | Interactive teaching simulation |\n| Hinge | Right elbow | drag the forearm, slider, ←/→ | 0–145°, the validated DOF | **Validated 3D rig** |",
    "| Fixed | Skull, frontal + right parietal | drag or arrows; it resists | ±0.5°, springs back | Teaching simulation |\n| Pivot | Head on C1/C2 | drag left/right, ←/→ | −60° … +60° about the vertical | Teaching simulation |\n| Ball-and-socket | Right shoulder | drag any direction, arrows | −95°…+15° × −40°…+85° | Teaching simulation |\n| Hinge | Right elbow | drag the forearm, slider, ←/→ | 0–145°, the validated DOF | **3D joint model** (declared `validated-rig`) |",
  ],
  [
    "Mechanically verified in this build: **38 of 39 shots speak**; the one silent shot (`hinge.return`) is a wordless\ntransition with no caption; **16 learner-paced cue clips** cover the Explore instructions and every recall question,\ncorrection and reveal; **0 clips overrun their shot**; every spoken key is a string that is also on screen; no narration\nsentence was authored — all spoken text is assembled from strings already displayed.",
    "Mechanically verified in this build: **40 of 40 shots speak** — Step 15B closed the last silent beat; **16 learner-paced\ncue clips** cover the Explore instructions and every recall question, correction and reveal; **0 clips overrun their\nshot**; every spoken key is a string that is also on screen; no narration sentence was authored — all spoken text is\nassembled from strings already displayed.",
  ],
  [
    "- [ ] **8.5** The silent transition is acceptable. — **Status: PENDING**",
    '- [ ] **8.5** The re-voiced transition ("The elbow settles back to rest.") is an improvement on the silence it\n      replaced. — **Status: PENDING**',
  ],
]);

edit("anatomy-review.md", [
  [
    "### 5.2 Pivot — head on C1/C2\n\nThe skull and teeth render groups rotate about the vertical axis through the neck anchor; the atlas and axis do not move.",
    '### 5.2 Pivot — head on C1/C2\n\nThree beats since Step 15B: the camera arrives at the neck, then looks at the two bones on their own with nothing moving\n(from behind and level, because from the front the mandible hides them), then the skull and teeth render groups rotate\nabout the vertical axis through the neck anchor while the atlas and axis stay still.\n\nThe words are deliberately minimal: *"At the top of the neck, one small bone sits on top of another."* and *"The upper\nbone turns around the one below it. Your head turns with it."* Nothing is said about the dens, the ring, the transverse\nligament or the atlanto-axial articulation.',
  ],
  [
    "- [ ] **A5.4** Rotating the whole skull rather than modelling the dens/atlas relationship is an acceptable\n      simplification. — **PENDING**",
    '- [ ] **A5.4** Rotating the whole skull rather than modelling the dens/atlas relationship is an acceptable\n      simplification. — **PENDING**\n- [ ] **A5.4b** Saying only "one small bone sits on top of another" and "the upper bone turns around the one below it" is\n      accurate as far as it goes, and omitting the dens is acceptable at this level. — **PENDING**',
  ],
]);

edit("performance-review.md", [
  [
    "## 5. What a reviewer must decide",
    "## 4b. Step 15B: did the clarity pass cost anything?\n\nSame method again, against the `step14b-complete` build rebuilt from its tag, alternating on the reference profile.\n\n| Pass | Build | CPU bench (ms) | First 3D (ms) | Intro (ms) | Bytes before first 3D | Elbow drag |\n|---|---|---|---|---|---|---|\n| 1 | Step 14B | 358 | 2000 | 2942 | 567 KB | 59.8 fps / p95 18.3 ms |\n| 1 | Step 15B | 125 | 712 | 1255 | 568 KB | 60.0 fps / p95 18.2 ms |\n| 2 | Step 14B | **81** | 532 | 967 | 548 KB | 60.0 fps / p95 17.1 ms |\n| 2 | Step 15B | **81** | 522 | 972 | 548 KB | 60.0 fps / p95 17.1 ms |\n\nPass 2 is the comparable one, both at a CPU benchmark of 81 ms: **no measurable difference.** Step 15B added no asset;\nthe lesson gained one shot (6.0 s) and trimmed another (0.9 s), and narration is 761 KB across 56 clips.\n\n## 5. What a reviewer must decide",
  ],
]);

edit("screen-reader-checklist.md", [
  [
    "- [ ] **S1.11** The DRAFT badge and the schematic notes are announced — a screen-reader user must learn that content is\n      draft and that an indicator is schematic, exactly as a sighted user does. — **PENDING**",
    '- [ ] **S1.11** The DRAFT badge is announced, and so is the persistent teaching status *"Teaching view: the moving marks\n      show the kind of movement."* — a screen-reader user must learn that content is draft and that an indicator is a\n      demonstration, exactly as a sighted user does. **This changed in Step 15B**: the statement moved from a note under\n      each caption to one persistent element, so please check specifically that it is reachable, and that it is not\n      announced so often that it becomes noise. — **PENDING**',
  ],
  [
    "| Measured text contrast — the Explore and recall panels | 98 text runs, **0 below threshold**, lowest **5.52:1** against a required 4.5:1 | `qa/reports/step14.accessibility.json` |",
    "| Measured text contrast — the Explore and recall panels | 104 text runs, **0 below threshold**, lowest **5.52:1** against a required 4.5:1 | `qa/reports/step14.accessibility.json` |\n| Measured contrast — the persistent teaching status added in Step 15B | 4 runs, lowest **7.42:1** | `qa/reports/step12.accessibility.json` |\n| Measured contrast — the plain teaching note added in Step 15B | 6 runs, lowest **9.28:1** | `qa/reports/step14.accessibility.json` |",
  ],
]);

edit("curriculum-review.md", [
  [
    "| **B** | **Draft enrichment** | **60** | **Written for this lesson.** Not NCERT wording. Carries a DRAFT badge on screen. This is the bulk of the teaching text and the main thing you are being asked to check. |",
    "| **B** | **Draft enrichment** | **61** | **Written for this lesson.** Not NCERT wording. Carries a DRAFT badge on screen. This is the bulk of the teaching text and the main thing you are being asked to check. **Fourteen of these were changed or added by the Step-15B clarity pass** — see `qa/step15b/terminology-review.md` for the before/after table. |",
  ],
  [
    "| **C** | **Interface-only** | **10** | Button labels, status words, prompts. No educational claim. |",
    "| **C** | **Interface-only** | **8** | Button labels, status words, prompts. No educational claim. |",
  ],
  [
    '| "At the elbow, the humerus meets the radius and the ulna." | 06 |',
    '| "The elbow is where the upper-arm bone meets two bones in the forearm." (the names stay on the labels) | 06 |',
  ],
  [
    '| "The forearm turns around one line: the hinge axis." | 06 |',
    '| "This blue line shows the direction the elbow bends around. We call that line the axis." | 06 |',
  ],
  [
    '| "Bending the elbow is called flexion." / "Straightening it again is called extension." | 06 |',
    '| "When the elbow bends, that is called flexion." / "When it straightens again, that is called extension." — reused in the elbow exploration | 06 |',
  ],
  [
    '| "Where the skull meets the backbone, a pivot joint lets the head turn around an axis." | 04 |',
    '| "At the top of the neck, one small bone sits on top of another." / "The upper bone turns around the one below it. Your head turns with it." | 04 |',
  ],
]);
