// ─────────────────────────────────────────────────────────────────────────────
//  Interactive Human Biology — module registry
//
//  This is the ONLY file you edit to add, remove, reorder or re-describe a
//  learning module. The build reads it to:
//    • build each project and place its output under its route  (dist/<route>)
//    • generate the homepage cards, in this order
//    • inject the "← Interactive Human Biology" link into each module
//
//  See README.md → "Adding a new module" for a worked example.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import("./scripts/lib/types.js").Module} Module */

/** @type {Module[]} */
export default [
  {
    id: "respiratory",
    title: "Respiratory System",
    description:
      "Follow one breath of air from the nostrils to the alveoli in a narrated 3D lesson, then explore every part of the airway yourself.",
    route: "/respiratory/",
    source: "projects/respiratory",

    // A plain HTML + GLB lesson: no bundler. `prepare` writes config.js (narration key) before the files are copied.
    build: {
      type: "static",
      prepare: "node scripts/build-config.js",
      entry: "respiratory_system.html", // published as index.html (and under its own name, for old links)
      files: ["respiratory_system.html", "respiratory_system.glb", "config.js"],
    },

    card: {
      eyebrow: "Class 10 · Biology",
      facts: ["13 narrated scenes", "About 3 minutes", "Explore mode"],
      image: "site/images/respiratory.webp",
      imageAlt: "3D model of the lungs, with the trachea branching into the bronchial tree",
      accent: "#a4402b",
    },

    // Integration-level link back to the homepage. `false` turns it off.
    backLink: { position: "left-center", theme: "dark" },
  },

  {
    id: "joints",
    title: "Types of Joints",
    description:
      "Watch a real skeleton move, then take each joint yourself: fixed, pivot, ball-and-socket and hinge, with a recall challenge at the end.",
    route: "/joints/",
    source: "projects/joints",

    // A Vite app. The build passes BASE_PATH=<route> so every URL it emits lives under /joints/.
    build: {
      type: "npm",
      install: "npm ci",
      command: "npm run build",
      output: "dist",
    },

    card: {
      eyebrow: "Class 10 · Science",
      facts: ["9 chapters", "About 6½ minutes", "Hands-on joints"],
      image: "site/images/joints.webp",
      imageAlt: "3D shoulder joint: the rounded head of the upper-arm bone in its socket, labelled ball-and-socket joint",
      accent: "#8a5a12",
    },

    backLink: { position: "left-center", theme: "dark" },
  },
];
