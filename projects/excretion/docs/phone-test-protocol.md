# Physical-phone test protocol (V2.4 release candidate)

This must be run by a person on a **real phone**. Emulation does not count (the emulated result is in `final-release-review.md` § 2).

## Serve the frozen build to the phone (same Wi-Fi)

```bash
cd web
npx vite preview --outDir ../releases/v2.4/site --host --port 5190
```

Open the `Network:` address it prints (for example `http://192.168.x.x:5190/`) on the phone. Windows may ask to allow Node.js through the firewall on a private network. The build is static, so any static host (HTTPS preferred) works too.

## Steps (tick each; note anything odd with the time shown on the progress bar)

| # | Step | What to check | Result |
|---|---|---|---|
| 1 | LOAD | Time from tapping the link to the start card (count seconds) | |
| 2 | FIRST FRAME | The plant is visible behind the start card; nothing is blank or stretched | |
| 3 | GUIDED | Tap **Start lesson**, sound on. Narration is audible and in step with the captions | |
| 4 | Captions and headings | Readable without zooming; the heading never covers the subject | |
| 5 | Labels | On screen, not overlapping, pointing at the right thing (e.g. 4:55 "Water vapour", 3:01 "Oxygen / Water vapour") | |
| 6 | Camera framing | The subject is in view in portrait (stoma, leaf interior, root hairs, stem slice) | |
| 7 | TOUCH / ORBIT | In Explore: one-finger orbit and two-finger pinch/pan are smooth; the page does not scroll or zoom by accident | |
| 8 | CHAPTER TRANSITION | Tap a chapter number on the bar: the lesson jumps, the old voice stops, the new one starts | |
| 9 | TASK | "Your turn" slider (sunlight, guard cells) and buttons (store a waste, find the store) respond to touch; Continue works | |
| 10 | EXPLORE | Open Explore, pick 3 models, tap parts; close returns to the lesson | |
| 11 | RECALL | Answer all 8 questions (try one wrong); the open prompt, model answer and Finish all work | |
| 12 | AUDIO | No double voices; pause and resume work; locking the screen and coming back does not break it | |
| 13 | RESTART | Replay from the start works | |
| 14 | Performance | Motion stays smooth, especially in **Explore** (the emulated phone showed ~20 fps there); no reload or crash | |
| 15 | Orientation | Rotate to landscape and back: the layout adapts, nothing is lost | |

**Device:** ____________ **OS:** ____________ **Browser:** ____________ **Date:** ________

**Result:** PASS / BLOCKER. Issues: ___________________________________________
