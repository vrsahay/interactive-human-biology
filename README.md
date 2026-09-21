# Interactive Human Biology

**Live:** https://interactive-human-biology.vercel.app · **Source:** https://github.com/vrsahay/interactive-human-biology

One platform for interactive 3D human-biology lessons. **One repository, one build, one deployment, one domain.**
Each lesson is a separate project inside this repository, and each is published at its own route:

```
my-website.com/
├── /                 → homepage (generated from modules.config.mjs)
├── /respiratory/     → Respiratory System   (projects/respiratory)
├── /joints/          → Types of Joints      (projects/joints)
└── /<next>/          → add a folder + one config entry, then redeploy
```

Adding a lesson never needs a new deployment: add it to `projects/`, add one entry to `modules.config.mjs`, run
`npm run build`, deploy. The homepage card, the route, the back link and the 404 page's link list all follow from the
config entry.

---

## Quick start

Requires **Node.js 24+** (the Joints project needs it).

```bash
npm install          # platform tooling (Playwright for the smoke tests)
npm run build        # secret scan, then every module + the homepage → dist/
npm run preview      # serve dist/ like a static host → http://localhost:8080
```

| Command | What it does |
|---|---|
| `npm run build` | Scans for secrets, then builds every module and the homepage into `dist/` (clean build). |
| `npm run build -- joints` | Rebuilds only the listed module(s); the rest of `dist/` is kept. |
| `npm run build:home` | Regenerates only the homepage (instant). |
| `npm run dev` | Builds whatever is missing, serves `dist/` on :8080, and regenerates the homepage when `site/` or `modules.config.mjs` changes. |
| `npm run preview` / `npm start` | Serves `dist/` (folder `index.html`, `/joints` → `/joints/` redirect, 404 page). |
| `npm test` | Platform smoke tests against `dist/` (uses your installed Google Chrome). |
| `npm run check:secrets` | Secret scan of committable files, plus a report of what the built site exposes to browsers. |

For narration in the Respiratory lesson, put your Google Cloud Text-to-Speech key in `projects/respiratory/.env`
(copy `.env.example`) or set `GOOGLE_TTS_API_KEY` in the environment before building. Without it the lesson uses
the browser's built-in voice.

---

## Architecture

The two lessons use different technology, so neither was rewritten to match the other:

| | Respiratory System | Types of Joints |
|---|---|---|
| Technology | One HTML file, Three.js 0.160 from jsDelivr (import map), Google Fonts | Vite 8 + Preact + TypeScript, Three.js 0.186 bundled |
| Build | none (a script writes `config.js` with the narration key) | `vite build` |
| Assets | `respiratory_system.glb` (63 MB), relative path `./` | `public/assets/**`: GLBs, manifests, baked environment, 76 MP3s |
| Paths | all relative → work under any folder unchanged | root-absolute `/assets/...` → needed a base path |

The platform is a **static multi-app build**: a small Node script (`scripts/build.mjs`, no dependencies) builds each
project with its own tooling and places its output in `dist/<route>/`, then generates the homepage from
`modules.config.mjs`. The result is plain static files, so any static host can serve it.

```
modules.config.mjs ──► scripts/build.mjs ──┬─► projects/respiratory  (static: copy files, entry → index.html) ─► dist/respiratory/
                                           ├─► projects/joints       (npm: npm ci; BASE_PATH=/joints/ npm run build) ─► dist/joints/
                                           ├─► back link injected into each module's HTML
                                           └─► site/index.html + cards ─► dist/index.html, dist/404.html, dist/modules.json
```

Why not one framework (Next.js etc.)? It would mean rewriting both lessons, or wrapping them in iframes. Separate
builds under one output keep each lesson exactly as it was, still runnable on its own, while sharing one deployment.

### Folder structure

```
human-biology/
├── modules.config.mjs        ← the module registry: the only file you edit to add a lesson
├── package.json              ← platform commands
├── vercel.json               ← deployment config (build command, output dir, caching, trailing slashes)
├── playwright.config.mjs
├── scripts/
│   ├── build.mjs             ← builds modules + homepage into dist/
│   ├── dev.mjs               ← build + serve + watch the homepage
│   ├── serve.mjs             ← static server with host-like behaviour
│   ├── check-secrets.mjs     ← secret scanner (runs before every build)
│   └── lib/
│       ├── config.mjs        ← loads and validates modules.config.mjs
│       ├── homepage.mjs      ← renders cards, homepage, 404 and the back link
│       └── types.js          ← JSDoc types for the config (editor autocompletion)
├── site/                     ← homepage source
│   ├── index.html            ← page template ({{MAIN}} is filled with the generated content)
│   ├── favicon.ico
│   ├── images/               ← module card images (one per module)
│   └── static/               ← styles.css, favicon.svg → published at /static/
├── projects/
│   ├── respiratory/          ← the Respiratory System lesson (its own README, scripts, deploy files)
│   └── joints/               ← the Types of Joints app (its own README, tests, pipeline, package.json)
├── tests/platform.spec.mjs   ← platform smoke tests
└── dist/                     ← build output (not committed)
    ├── index.html  404.html  modules.json  favicon.ico  static/
    ├── respiratory/          ← index.html, respiratory_system.html, respiratory_system.glb, config.js
    └── joints/               ← index.html, app/ (hashed JS/CSS), assets/ (GLB, JSON, audio, environment)
```

### How routing works

Every route is a real folder with an `index.html`, so `/respiratory/` and `/joints/` are served directly by any
static host. There is no client-side router to configure and nothing to rewrite:

- **Direct navigation and refresh** work, because the file exists (`dist/joints/index.html`).
- **`/joints` without a slash** redirects to `/joints/` (Vercel: `"trailingSlash": true`; the local server does the same;
  GitHub Pages, Netlify and nginx do it by default for folders). The trailing slash matters: it keeps each lesson's
  relative URLs (`./respiratory_system.glb`) resolving inside its own folder.
- **Unknown paths** get `dist/404.html` with HTTP 404 (Vercel, Netlify, GitHub Pages and Cloudflare Pages pick up a
  root `404.html` automatically).
- **Query-string modes** inside a lesson keep working: `/respiratory/?debug=true`, `/joints/?mode=sandbox`.

Neither lesson uses client-side routing (both are single screens), so no history-API fallback is needed. If a future
module is a single-page app with its own client routes, see [SPA modules](#if-a-future-module-is-a-single-page-app-with-its-own-routes).

### How the homepage discovers modules

`modules.config.mjs` exports an array. At build time `scripts/lib/homepage.mjs` renders one card per entry, in array
order, into `site/index.html`. Cards are static HTML: no JavaScript is needed to see or use the homepage. The same
data is written to `dist/modules.json` for anything else that wants it.

The homepage is laid out like an anatomy atlas: a serif title, hairline rules, and each lesson presented as a
numbered plate (Plate I, Plate II, …) with a caption. The background is a neutral charcoal (`#111316`) between the two
lessons' own backgrounds, so moving between the homepage and a lesson feels continuous. Fonts: Newsreader and IBM Plex Sans.
On desktops and laptops the homepage is a single screen (tested from 1280×720 to 1920×1080): the intro sits on
the left and the module cards on the right, up to three per row. A fourth module wraps onto a second row, at which
point the page scrolls; tablets and phones stack everything and scroll as usual.

Each entry drives:

| Field | Used for |
|---|---|
| `id`, `title`, `description` | the card text (and the page `id`) |
| `route` | where the module is published and what the card links to |
| `source`, `build` | how the build produces the module |
| `card` | caption label, facts line, preview image, accent colour (plate number and link) |
| `backLink` | position/theme of the "← Interactive Human Biology" link, or `false` |
| `status` | `"coming-soon"` shows a non-clickable card and skips the build |

The config is validated before anything is built: missing fields, a malformed or duplicate route, a missing source
folder or card image all stop the build with a clear message.

### Navigation back to the homepage

The build appends one self-contained element to each module's HTML: a small "Home" tab on the left edge (it expands to
"Interactive Human Biology" on hover/focus). It is added to the **built** HTML only; the projects' source files do not
contain it. The left-middle edge was chosen because both lessons use every corner (titles top-left, options/legend
top-right, playback controls bottom-left and bottom-right). Change it per module with `backLink.position`
(`left-center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`) and `backLink.theme` (`dark`, `light`), or
turn it off with `backLink: false`.

---

## Adding a new module

Worked example: a **Digestive System** lesson.

### 1. Put the project in `projects/`

```
projects/
├── respiratory/
├── joints/
└── digestive/        ← your project, unchanged, with its own README/package.json
```

### 2. Add one entry to `modules.config.mjs`

**A plain HTML/JS project** (like Respiratory):

```js
{
  id: "digestive",
  title: "Digestive System",
  description: "Follow a meal from the mouth to the intestines and see how each organ breaks food down.",
  route: "/digestive/",
  source: "projects/digestive",
  build: {
    type: "static",
    entry: "digestive.html",                 // published as /digestive/index.html
    files: ["digestive.html", "models", "audio"],   // omit to publish the whole folder
    // prepare: "node scripts/build-config.js", // optional command run first
  },
  card: {
    eyebrow: "Class 10 · Biology",
    facts: ["10 scenes", "About 4 minutes"],
    image: "site/images/digestive.webp",     // 16:10, ~960×600
    imageAlt: "3D model of the stomach and intestines",
    accent: "#7fc98f",                       // light enough to read on the dark background
  },
  backLink: { position: "left-center", theme: "dark" },
},
```

**A project with a bundler** (like Joints: Vite, webpack, Astro, SvelteKit static, …):

```js
build: { type: "npm", install: "npm ci", command: "npm run build", output: "dist" },
```

The build runs the command with **`BASE_PATH=/digestive/`** in the environment. Make the project's bundler use it:

```js
// vite.config.ts
export default defineConfig({ base: process.env.BASE_PATH ?? "/" });
```

### 3. Add a card image

Save a 16:10 screenshot (about 960×600, WebP) as `site/images/digestive.webp`. Crop to the 3D content rather than
the lesson's UI.

### 4. Build, check, deploy

```bash
npm run build -- digestive     # or: npm run build
npm run preview                # open http://localhost:8080 and http://localhost:8080/digestive/
npm test                       # the smoke tests pick up the new module automatically
git add projects/digestive modules.config.mjs site/images/digestive.webp
git commit -m "Add Digestive System module"
git push                       # the existing deployment rebuilds; no new project needed
```

The card appears on the homepage in the position of its config entry. The route, the redirect from `/digestive`, the
back link, the 404 page's module list, `modules.json` and the smoke tests all pick it up from the entry.

### Asset paths: the one thing to check

A module is served from `/digestive/`, not `/`. Before adding a project, search it for root-absolute URLs:

```bash
grep -rnE "[\"'\`(]/(assets|models|audio|images|static|src)/" projects/digestive --include=*.{html,js,ts,tsx,css,json}
```

- **Relative URLs** (`./model.glb`, `models/heart.glb`) work unchanged. Plain HTML projects should use these.
- **Bundler-processed URLs** (`import url from "./model.glb?url"`, CSS `url()`, `index.html` script tags) are
  rewritten by the bundler once `base` is set.
- **Root-absolute strings in code** (`fetch("/assets/x.json")`, files in `public/`) are *not* rewritten. Prefix them:
  `` `${import.meta.env.BASE_URL}assets/x.json` `` (Vite; `BASE_URL` is `/` when the project runs on its own).
- Anything cached per origin (localStorage, IndexedDB, service workers) is now shared with the other modules on the
  same domain: use a project-specific key or database name.

### If a future module is a single-page app with its own routes

Static folders cover single-screen lessons. A module with client-side routes (`/digestive/stomach`) also needs its
deep links to fall back to its `index.html`. Add a rewrite to `vercel.json`:

```json
"rewrites": [{ "source": "/digestive/:path((?!.*\\.).*)", "destination": "/digestive/index.html" }]
```

(Netlify: a `[[redirects]]` rule in `netlify.toml` from `/digestive/*` to `/digestive/index.html` with `status = 200`;
nginx: `location /digestive/ { try_files $uri $uri/ /digestive/index.html; }`.)

---

## Working on a module

Each project still works on its own, with its own tools:

```bash
# Types of Joints: Vite dev server with hot reload at http://localhost:5173/
cd projects/joints && npm ci && npm run dev
npm run test:e2e        # its own Playwright suite (in projects/joints)

# Respiratory System: its own tiny server at http://localhost:8000/respiratory_system.html
cd projects/respiratory && node scripts/build-config.js && node scripts/serve.js
```

Then `npm run build -- joints` (from the repository root) to update the platform build.

---

## Deployment

### Vercel (recommended; both lessons were already configured for it)

1. Push this repository to GitHub and import it in Vercel as **one** project. Leave the framework as "Other";
   `vercel.json` sets the install command, build command (`npm run build`) and output directory (`dist`).
2. **Settings → Environment Variables:** add `GOOGLE_TTS_API_KEY` (Respiratory narration).
3. **Settings → General → Node.js Version:** 24.x.
4. Deploy. Every push to the main branch rebuilds the whole platform; adding a module is just another push.

Vercel sets `CI=1`, so the build runs `npm ci` inside each npm-type module. The largest single file is the
63 MB Respiratory model, which is within static hosting limits and was already deployed this way.

### Other static hosts

`dist/` is plain static files. Any host that serves a folder's `index.html` works:

| Host | Build command | Output | Notes |
|---|---|---|---|
| Netlify / Cloudflare Pages | `npm run build` | `dist` | Set Node 24 and `GOOGLE_TTS_API_KEY`. |
| GitHub Pages (user/org site or custom domain) | `npm run build` in an Actions workflow | `dist` | Do not use Git LFS for served files. |
| GitHub Pages project site (`user.github.io/repo/`) | `SITE_BASE=/repo/ npm run build` | `dist` | `SITE_BASE` prefixes every route, link and module base path. |
| nginx / any server | `npm run build`, copy `dist/` | | `try_files $uri $uri/ =404; error_page 404 /404.html;` |

---

## Security

- **No secrets are committed.** `.gitignore` excludes `.env*` (except `.env.example`), generated `config.js`, keys,
  certificates and service-account files. `npm run build` runs `scripts/check-secrets.mjs` first and **fails** if a
  committable file contains an API key, token, private key or service-account JSON, or if a secrets file is not ignored.
- **One key is visible to site visitors, by design.** The Respiratory lesson calls Google Cloud Text-to-Speech from the
  browser, so the build writes the key into `dist/respiratory/config.js` and every visitor can read it
  (`npm run check:secrets` lists it). Restrict it in **Google Cloud Console → APIs & Services → Credentials**:
  API restriction *Cloud Text-to-Speech API only*, and application restriction *HTTP referrers* limited to your
  domain (e.g. `https://my-website.com/respiratory/*`) plus `http://localhost:8080/*` for local previews.
  The alternative is pre-rendering the narration to MP3s at build time so no key ships at all; see
  [Known issues](#known-issues-and-compromises).
- The Joints narration is pre-rendered MP3s; its key is only ever used by its offline pipeline and is not in this repo.

---

## Testing

`npm test` runs the platform smoke tests (`tests/platform.spec.mjs`) against `dist/` in your installed Chrome:
homepage cards match the registry, each card opens its route, refresh and browser Back work, `/joints` redirects,
unknown routes return the 404 page, every asset request stays inside its module's route and succeeds, the Respiratory
model and Google narration load and the lesson plays, Explore mode opens, the Joints manifests/models/environment/
narration load, there are no console errors, and the homepage fits a 390 px phone.

To test the deployed site instead of the local build:

```bash
BASE_URL=https://interactive-human-biology.vercel.app npm test
```

Each project keeps its own tests (`projects/joints`: `npm run typecheck`, `npm test`, `npm run test:e2e`).

---

## What was changed in the imported projects

Both projects were imported from their git `HEAD`s (first commit of this repository), so every later change is a
reviewable diff: `git diff <first commit> -- projects/`.

**Types of Joints** (5 files, only so its URLs follow the base path; standalone behaviour is identical because
`BASE_PATH` defaults to `/`):

| File | Change |
|---|---|
| `vite.config.ts` | `base: process.env.BASE_PATH ?? "/"`; the build-time preload list and the manifest-pinning keys use that base |
| `src/content/joints/elbow_r.ts` | `"/assets/joints/…"` → `` `${import.meta.env.BASE_URL}assets/joints/…` `` |
| `src/content/lessons/index.ts` | same, for the body delivery manifest |
| `src/engine/core/App.ts` | same, for the baked environment manifest |
| `src/ui/video/FilmShell.tsx` | same, for the narration manifest |

**Respiratory System**: no source changes. The platform publishes the committed `respiratory_system.html` as
`/respiratory/index.html` (and keeps `/respiratory/respiratory_system.html` for old links), with the GLB and the
generated `config.js`. Its own deploy files (`vercel.json`, `.github/workflows/deploy.yml`, start scripts) are kept
but are inert inside `projects/`.

**Not changed:** 3D models, textures, environment maps, narration audio, lesson content, animations, interactions,
UI, styling, fonts, the Joints asset pipeline, Blender files, tests and QA evidence.

---

## Known issues and compromises

- **Respiratory narration key is public** (see [Security](#security)). The newer, uncommitted Respiratory working copy
  on the Desktop switched to pre-rendered MP3s in `./narration/`, but the script that makes them
  (`scripts/build-narration.js`) and the clips do not exist yet, so that version cannot load its narration. The
  platform uses the committed version. When the script and clips exist, replace `projects/respiratory/respiratory_system.html`,
  add `"narration"` to `build.files` and drop `config.js`.
- **Two Three.js copies**: Respiratory loads Three.js 0.160 from jsDelivr, Joints bundles 0.186. They are separate
  pages, so they never conflict; Respiratory (and its Google Fonts) still needs internet access, as before.
- **Large first load**: the Respiratory model is 63 MB (unchanged). The homepage itself is about 90 kB (HTML, CSS, both card images) plus fonts.
- **Joints licence**: its README states the anatomy source's licence is unknown and blocks public release, and that
  the lesson awaits expert review. Integration does not change that status.
- **Pre-existing copy issue left as-is**: the Joints start card reads "How the shape of a join decides the movement"
  (missing "t"). It is lesson content under expert review, so it was not edited during integration.
- **Origin-shared storage**: both lessons now share one origin. Their stored data does not collide (Respiratory uses
  the IndexedDB database `respiratory-lesson-tts`; Joints uses `joints.*` localStorage keys), but future modules
  should namespace theirs too.
