# Camera review — travel that teaches, framings that show what the sentence describes

## 1. The shoulder framing

**The problem, from the audit.** `ball.shoulder` framed the joint from `frontRight` at scale 2.9 with the model composed
right. The humerus ran out of the bottom of the frame, the scapula was nearly edge-on, and the hollow the sentence was
about — *"…sits in a hollow of the shoulder bone"* — was not visible at all. The learner was told about a socket they
could not see.

**How the new framing was chosen: by looking, not by reasoning.** Fourteen candidates were rendered against the running
build through the QA camera hook and compared side by side (`qa/step16b/try_ball_framings.mjs`,
`qa/step16b/try_ball_movement_framings.mjs`; captures in `qa/visual/step16b/ball_trials/`).

| Trial | Result |
|---|---|
| `frontRight`, elevation 0.10, scale 2.9 (the old framing) | The humerus leaves the bottom of the frame; the scapula is edge-on; the hollow is invisible. |
| `right` / `backRight`, elevation 0.25 | The scapula blade reads well, but the humeral head hides the joint line. |
| `frontLeft`, elevation 0.20 | The ribcage crosses the joint. |
| `frontRight`, elevation 0.45, scale 2.0 | Better: the head is clear, but the acromion cuts across it. |
| `front`, elevation 0.20, scale 2.4 | The rounded head is unmistakable and the joint line is visible. |
| **`front`, elevation 0.40, scale 2.0** | **Chosen.** The rounded head of the upper-arm bone fills a large part of the frame and the dark band of the hollow it sits against is clearly visible beside it. |

**What shipped:**

| Beat | Camera | Why |
|---|---|---|
| `ball.bones` (look) | site `ball_socket.shoulder_right`, `front`, elevation 0.40, scale **2.0 → 1.85** | Both structures the sentence names are readable at once. |
| `ball.move` (movement) | `front`, elevation 0.30, scale **3.9 → 3.6** | Wide enough that the arm and the sweeping indicator both stay in frame. |
| `ball.why` (reason) | `front`, elevation 0.40, scale **2.2 → 2.0** | Back to the join while the reason is given. |
| `ball.name` | `front`, elevation 0.30, scale 3.2 → 3.0 | |
| `ball.task` | `frontRight`, elevation 0.20, scale 3.9 → 3.7 | Room for the learner to move the arm. |

**The delivery manifest is frozen, so the framings came to it.** A site framing's radius is `SITE_SCALE_M (0.05) ×
scale`, and the manifest's close-up sphere caps it: 4.5 at the skull, 4.25 at the top of the neck, **4.0 at the
shoulder**, 5.6 at the elbow. Every framing in this step fits. No sphere, GLB or manifest was touched.

**Proof.** `step16b-teaching` §7 asserts, against the running build, that the shoulder site is in frame and that both the
humerus and the scapula each span more than 15 % of the viewport width at the `ball.bones` beat.

## 2. Travel that teaches

The audit measured five travel shots costing 30 s (11 % of the lesson) and carrying a title and no teaching. They are
now the connective tissue of the lesson:

| Beat | Was | Is |
|---|---|---|
| `fixed.travel` | title card "Fixed joint", silent | "Several bones, one skull" + *"Go up to the top of the head. The skull looks like a single piece, but it is several separate bones meeting along wavy lines."* |
| `pivot.travel` | title card "Pivot joint", silent | "The top of the neck" + *"Now down to the top of the neck, just under the skull, where the head meets the backbone."* |
| `ball.travel` | title card, silent | "Where the arm meets the body" + *"Back up to the shoulder, where the arm meets the body."* |
| `hinge.travel` | title card, silent | "The elbow" + *"Down the same arm now, to the elbow."* |
| `compare.pullback` | "Four joints. Four different ways of moving." | same headline + *"Four joints, in one body, with four different ways of moving. Look at each one again."* |

The camera move is unchanged — the orientation value the audit credited it with is kept — but **no beat in the lesson is
silent any more**, and the sentence that carries the learner from one category to the next now exists.

## 3. The comparison chapter

**The problem.** `compare.together` supported the thesis of the lesson with four schematic indicators on a full body at
scale 1.12 — 10 to 30 px each at 1280×800. The four beats before it were at site framings of 3.6 to 5.4, which is
wide for a skull suture or two neck vertebrae.

**What shipped.** Four readable moments, then a summary:

| Beat | Camera before | Camera after |
|---|---|---|
| `compare.fixed` | site `fixed.skull`, right, scale 3.6 | **2.7 → 2.5**, elevation 0.30 |
| `compare.pivot` | site `pivot.upper_neck`, frontRight, 4.2 | **backRight, 2.4 → 2.2**, elevation 0.05 (the framing the pivot chapter already proved readable) |
| `compare.ball` | site shoulder, frontRight, 3.9 | **front, 2.6 → 2.4**, elevation 0.35 |
| `compare.hinge` | site elbow, right, 5.4 | **3.2 → 3.0**, elevation 0.10 |
| `compare.together` | body 1.12, **four indicators** | body 1.12, **no indicators, four short labels** |

Each of the four keeps exactly one indicator. The closing beat is a summary: it marks all four with the same short
labels the body map uses (*Fixed*, *Pivot*, *Ball and socket*, *Hinge*), which is the one multi-mark frame the audit
found already worked.

**Proof.** `step16b-teaching` §8 asserts each comparison beat has exactly one indicator, is framed on its site at scale
≤ 4.5, and that the structures it compares span more than 25 % of the frame in the running build — and that the summary
carries no indicators and at least four labels.

## 4. The body map

`map.all` carried six indicators at scale 1.08. It now carries its six labels and no indicators: the brief asks for it
to stay a memory anchor, not become a second teaching screen, and six marks that small were not readable. Everything
else about the chapter is unchanged.

## 5. What was not changed

- Every camera framing in the hinge chapter, including `hinge.axis`, `hinge.flexion`, `hinge.extension`, `hinge.try`
  and `hinge.check`.
- Every `closeUp` / `focus` / `movement` preset framing on the validated joint asset.
- The close-up spheres, the delivery manifest, the GLBs and the body manifest.
- `compose: "right"` on the shots that had it — the audit noted it leaves the frame lopsided, but changing composition
  across the lesson is a visual-design pass, not the teaching-depth work this step was asked for.
