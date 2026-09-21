# Human Respiratory System — 3D Lesson

An interactive, narrated 3D lesson (Class 10 Biology) that follows one breath of air from the nostrils to the alveoli. Built with Three.js; narration by Google Cloud Text-to-Speech.

## Contents

| File | What it is |
| --- | --- |
| `respiratory_system.html` | The lesson (Three.js, narration, labels, Explore mode) |
| `respiratory_system.glb` | The 3D model — must stay next to the HTML (~63 MB) |
| `scripts/build-config.js` | Writes `config.js` with the narration API key |
| `scripts/serve.js` | Tiny local web server (Node.js) |
| `.github/workflows/deploy.yml` | Deploys the lesson to GitHub Pages |
| `Start (Windows).bat` / `Start (Mac).command` | Double-click to run locally |

## Narration API key

The Google Cloud Text-to-Speech key is **not** stored in the HTML or the repository.

- **Locally:** copy `.env.example` to `.env` and set `GOOGLE_TTS_API_KEY`. The start scripts run `node scripts/build-config.js`, which writes `config.js` (git-ignored).
- **On GitHub:** add the key as a repository secret named `GOOGLE_TTS_API_KEY`. The deploy workflow generates `config.js` from it.

If no key is found, the lesson uses the browser's built-in voice instead.

> **Important:** the page calls the Google API from the visitor's browser, so the deployed site still sends the key to everyone who opens it. In Google Cloud Console → APIs & Services → Credentials, restrict the key to the **Cloud Text-to-Speech API** and to your site's HTTP referrers (e.g. `https://<username>.github.io/*` and `http://localhost:8000/*`).

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository on the `main` branch. Use `git` or GitHub Desktop — the website's drag-and-drop upload rejects files over 25 MB, and the model is 63 MB. Do **not** use Git LFS for the model: GitHub Pages does not serve LFS files.
2. **Settings → Secrets and variables → Actions → New repository secret:** name `GOOGLE_TTS_API_KEY`, value = your key.
3. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
4. Push again (or run the workflow from the **Actions** tab). The site is published at `https://<username>.github.io/<repository>/`.

## Run locally

Browsers do not let a page opened straight from disk (`file://`) load the 3D model, so the lesson is served from a local web server.

- **Windows:** double-click `Start (Windows).bat`.
- **Mac:** double-click `Start (Mac).command` (if macOS blocks it: right-click → Open → Open, first time only).
- **Any OS:** in this folder run

  ```bash
  node scripts/build-config.js
  ```

  ```bash
  node scripts/serve.js
  ```

  then visit <http://localhost:8000/respiratory_system.html>.

Requires [Node.js](https://nodejs.org). Without Node, `python3 -m http.server 8000` also works (narration then needs an existing `config.js`, or falls back to the browser voice). Without either, open `respiratory_system.html` directly in Chrome/Edge and choose or drop `respiratory_system.glb` when asked.

## Requirements

- A recent Chrome, Edge, Safari or Firefox with WebGL (desktop/laptop recommended — the model is ~63 MB and about 2.6 million triangles).
- An internet connection: Three.js, fonts and the Google Cloud voice are loaded online. Narration clips are cached in the browser after the first run.

## Using it

| Control | Action |
| --- | --- |
| Start lesson | Plays the narrated lesson (13 scenes, about 3 minutes) |
| Space | Play / pause |
| ← → | Seek 5 s |
| M | Mute |
| R | Replay scene |
| F | Fullscreen |
| E | Explore mode — pick any part from the list or click it in the model; it is highlighted and labelled while everything else fades. Drag to rotate, scroll to zoom, Esc to go back. |

Add `?debug=true` to the address for the anatomy inspector.

## Credits

Anatomy derived from:

- **BodyParts3D**, © The Database Center for Life Science — CC BY-SA 2.1 Japan (lungs, bronchial tree, diaphragm, ribs, sternum, vertebrae, nasal conchae)
- **NIH 3D**, Visible Human Project respiratory model (3DPX-013408) — CC BY (larynx, trachea)

Nasal cavity, pharynx and pulmonary acini (alveoli) were modelled in Blender; acini are enlarged for visibility, with their internal proportions based on published measurements (Weibel; Haefeli-Bleuer & Weibel).
