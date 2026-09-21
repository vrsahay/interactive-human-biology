# Mobile review — `step16g-narration-repetition-fixed`

> **Everything below is EMULATED**: desktop Chrome with a narrow viewport. **It is not a device test.**
>
> **Android = NOT TESTED · iPad = NOT TESTED · iPhone = NOT TESTED**
>
> No mobile certification is claimed.

Every item is **PENDING**. Record decisions in `expert-review-status.json → mobileHuman`.

---

## 1. Emulated evidence on this candidate

Viewports tested: **320×844, 360×800, 390×844, 412×844, 430×932, 768×1024**. Desktop widths 1024×768, 1280×800 and
1440×900 were tested for comparison.

| Check | Result (emulated) |
|---|---|
| During an exploration, the target anatomy is not under the task card | 0 % covered in 36 of 36 width × exploration cases, and in all four states at 390 and 412 |
| A pointer on the target reaches the 3D view | every case |
| The target is at least 0.8× as prominent as in the reviewed desktop framing | lowest 0.81 |
| The topic heading sits at the top left, never over the anatomy's joint site, never over a site label | 0 problems in 117 checks |
| Controls ≥ 44 px; no horizontal scroll; reflow at 320 px | pass |
| Site labels never hidden behind a panel | pass |
| Contrast over the scene on a phone | pass |

## 2. What a phone learner experiences, by design

- The lesson starts from a **Start lesson** card; nothing plays until tapped.
- The topic heading is at the top left, the anatomy fills the middle, and the spoken sentence runs at the bottom above
  the player.
- In an exploration the paused film's player steps aside. The task card sits at the bottom, and the joint is framed in
  the space above it.
- The chapter strip wraps to two rows of ≥ 44 px targets.

Captures:

- `w390_*`, `w412_*`: nine shots each, the four explorations in four states, and the recall question.
- `w768_*`: nine shots and the recall question.

## 3. What emulation cannot tell you

A throttled desktop browser has a desktop GPU, memory bandwidth, thermals and driver. It says nothing about:

- how the lesson performs on a real phone;
- touch accuracy;
- how the audio behaves on a real phone speaker;
- sunlight readability;
- whether the text is comfortably legible at arm's length.

See also Step 12's emulated performance misses in [performance-review.md](performance-review.md).

## 4. The questions

- [ ] **M1** On a real phone, the anatomy is readable and the learner knows what to look at. — **PENDING**
- [ ] **M2** Touch interaction in each exploration is comfortable and accurate. — **PENDING**
- [ ] **M3** Text size and contrast are comfortable on a real screen. — **PENDING**
- [ ] **M4** Narration is clear on a phone speaker. — **PENDING**
- [ ] **M5** Which real devices must be tested before release (Android phone, iPad, iPhone, low-end Android)? — **PENDING**

## 5. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Devices, OS and browser versions used | |
| Findings | |
| Decision | |
