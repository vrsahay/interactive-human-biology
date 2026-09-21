// JSDoc types for modules.config.mjs (editor hints only; nothing is exported at runtime).

/**
 * @typedef {object} StaticBuild   A plain HTML/JS project: files are copied as they are.
 * @property {"static"} type
 * @property {string} [prepare]    Shell command run in the project folder before copying (e.g. generate a config file).
 * @property {string} [entry]      HTML file published as the route's index.html (also kept under its own name).
 * @property {string[]} [files]    Files/folders to publish, relative to the project. Omit to publish the whole folder
 *                                 (dotfiles, node_modules, .env and *.md are always skipped).
 */

/**
 * @typedef {object} NpmBuild      A project with its own build tool (Vite, webpack, Astro, …).
 * @property {"npm"} type
 * @property {string} [install]    Install command, run when node_modules is missing or in CI (default "npm ci").
 * @property {string} [command]    Build command (default "npm run build"). Receives BASE_PATH=<site base + route>.
 * @property {string} [output]     Build output folder, relative to the project (default "dist").
 */

/**
 * @typedef {object} Card
 * @property {string} [eyebrow]    Small label above the title (e.g. "Class 10 · Biology").
 * @property {string[]} [facts]    Short facts shown as chips.
 * @property {string} [image]      Preview image, relative to the repository root (webp/png/jpg/svg).
 * @property {string} [imageAlt]
 * @property {string} [accent]     Card accent colour (CSS colour).
 */

/**
 * @typedef {object} BackLink
 * @property {"left-center"|"top-left"|"top-right"|"bottom-left"|"bottom-right"} [position]   Default "left-center": a small tab on the left edge, clear of typical corner controls.
 * @property {"dark"|"light"} [theme]
 */

/**
 * @typedef {object} Module
 * @property {string} id           Unique, lowercase, e.g. "digestive".
 * @property {string} title
 * @property {string} description
 * @property {string} route        URL path with leading and trailing slash, e.g. "/digestive/".
 * @property {string} source       Project folder, relative to the repository root.
 * @property {StaticBuild|NpmBuild} build
 * @property {Card} [card]
 * @property {BackLink|false} [backLink]
 * @property {"available"|"coming-soon"} [status]   "coming-soon" shows a card without a link and skips the build.
 */

export {};
