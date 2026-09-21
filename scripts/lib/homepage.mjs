// Renders the homepage and 404 page from site/index.html + modules.config.mjs, and the back-link snippet for modules.
// Cards are generated at build time, so the homepage is plain HTML: fast, crawlable and usable without JavaScript.
import { moduleUrl } from "./config.mjs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeColor = (c) => (/^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl|oklch)a?\([\d\s.,%/-]+\))$/i.test(c ?? "") ? c : "#8a3b2a");

export function renderHomepage(template, modules, images, base) {
  const available = modules.filter((m) => (m.status ?? "available") === "available");
  const cards = modules.map((m, i) => card(m, images[m.id], i)).join("\n");
  return fill(template, base, {
    TITLE: "Interactive Human Biology",
    MAIN: `
      <div class="home">
        <section class="intro" aria-labelledby="hero-title">
          <p class="intro-kicker">A 3D atlas for Class 10 science</p>
          <h1 id="hero-title">Interactive Human Biology</h1>
          <p class="lede">Explore the human body through interactive 3D learning experiences.</p>
          <p class="intro-body">Each lesson pairs a narrated film with a model you can pause, turn and examine for yourself, so every structure is seen from every side as it is named.</p>
        </section>

        <section class="modules" aria-labelledby="modules-title">
          <h2 id="modules-title" class="modules-title">Lessons <span class="count">${available.length} available</span></h2>
          <ul class="grid" role="list">
${cards}
          </ul>
          <p class="upcoming"><em>In preparation</em> — the digestive, nervous and circulatory systems.</p>
        </section>
      </div>`,
  });
}

export function renderNotFound(template, modules, base) {
  const links = modules
    .filter((m) => (m.status ?? "available") === "available")
    .map((m) => `<li><a href="${esc(moduleUrl(m))}">${esc(m.title)}</a></li>`)
    .join("");
  return fill(template, base, {
    TITLE: "Page not found · Interactive Human Biology",
    MAIN: `
      <section class="not-found" aria-labelledby="nf-title">
        <p class="intro-kicker">Error 404</p>
        <h1 id="nf-title">This page isn’t part of the body.</h1>
        <p class="lede">The address may be mistyped, or the lesson may have moved.</p>
        <p class="nf-home"><a href="${esc(base)}">Return to the homepage <span aria-hidden="true">→</span></a></p>
        <ul class="nf-links" role="list">${links}</ul>
      </section>`,
  });
}

const ROMAN = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const roman = (n) => ROMAN.reduce((out, [v, s]) => { while (n >= v) { out += s; n -= v; } return out; }, "");
const nbsp = (s) => esc(s).replace(/ /g, "&nbsp;");

function card(m, image, index) {
  const soon = (m.status ?? "available") === "coming-soon";
  const c = m.card ?? {};
  const href = moduleUrl(m);
  const titleId = `card-${esc(m.id)}`;
  const media = image
    ? `<img src="${esc(image)}" alt="${esc(c.imageAlt ?? "")}" width="960" height="600" ${index > 2 ? 'loading="lazy" ' : ""}decoding="async">`
    : `<div class="card-placeholder" aria-hidden="true">${esc(m.title.slice(0, 1))}</div>`;
  // A fact never breaks inside itself, and a separator stays at the end of a line, never at the start of the next.
  const facts = (c.facts ?? []).map(nbsp).join("&nbsp;· ");
  const title = soon ? esc(m.title) : `<a class="card-link" href="${esc(href)}">${esc(m.title)}</a>`;
  const action = soon
    ? `<span class="card-cta card-cta--soon">In preparation</span>`
    : `<span class="card-cta" aria-hidden="true">Open the lesson <span class="arrow">→</span></span>`;
  return `            <li class="card${soon ? " card--soon" : ""}" style="--accent:${safeColor(c.accent)}" data-module="${esc(m.id)}">
              <article aria-labelledby="${titleId}">
                <div class="card-media">${media}</div>
                <p class="card-kicker"><span class="plate">Plate ${roman(index + 1)}</span>${c.eyebrow ? `<span class="card-eyebrow">${esc(c.eyebrow)}</span>` : ""}</p>
                <h3 id="${titleId}">${title}</h3>
                <p class="card-desc">${esc(m.description)}</p>
                ${facts ? `<p class="facts">${facts}</p>` : ""}
                ${action}
              </article>
            </li>`;
}

function fill(template, base, values) {
  return template.replaceAll("{{BASE}}", esc(base)).replace(/\{\{(\w+)\}\}/g, (all, k) => (k in values ? values[k] : all));
}

/** The fixed "← Interactive Human Biology" pill injected into each module's HTML. Fully self-contained and namespaced. */
export function backLinkSnippet(m, base) {
  const pos = m.backLink?.position ?? "left-center";
  const theme = m.backLink?.theme ?? "dark";
  return `<!-- Interactive Human Biology: platform navigation, added by scripts/build.mjs (not part of the module's source) -->
<a id="hb-back" href="${esc(base)}" data-pos="${esc(pos)}" data-theme="${esc(theme)}" aria-label="Back to Interactive Human Biology home"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="hb-full">Interactive Human Biology</span><span class="hb-short">Home</span></a>
<style>
#hb-back{all:initial;box-sizing:border-box;position:fixed;z-index:2147483000;display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px 0 10px;border-radius:999px;font:600 12.5px/1 "Manrope","Inter","Segoe UI",system-ui,-apple-system,sans-serif;letter-spacing:.01em;text-decoration:none;cursor:pointer;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:.78;transition:opacity .18s ease,transform .18s ease,background-color .18s ease}
#hb-back svg{display:block;flex:none}
#hb-back[data-theme=dark]{color:#eef3f8;background:rgba(10,18,30,.66);border:1px solid rgba(255,255,255,.16)}
#hb-back[data-theme=light]{color:#1d2430;background:rgba(255,255,255,.88);border:1px solid rgba(29,36,48,.14);box-shadow:0 2px 10px rgba(20,24,32,.08)}
#hb-back:hover,#hb-back:focus-visible{opacity:1;transform:translateY(-1px)}
#hb-back:focus-visible{outline:2px solid #ffc940;outline-offset:2px}
#hb-back[data-pos^=top]{top:max(12px,env(safe-area-inset-top))}
#hb-back[data-pos^=bottom]{bottom:max(12px,env(safe-area-inset-bottom))}
#hb-back[data-pos$=left]{left:max(12px,env(safe-area-inset-left))}
#hb-back[data-pos$=right]{right:max(12px,env(safe-area-inset-right))}
#hb-back[data-pos=left-center]{left:0;top:50%;transform:translateY(-50%);height:36px;padding:0 13px 0 9px;border-left:0;border-radius:0 999px 999px 0}
#hb-back[data-pos=left-center]:hover,#hb-back[data-pos=left-center]:focus-visible{transform:translateY(-50%) translateX(2px)}
#hb-back .hb-full{display:none}#hb-back .hb-short{display:inline}
#hb-back:hover .hb-full,#hb-back:focus-visible .hb-full{display:inline}#hb-back:hover .hb-short,#hb-back:focus-visible .hb-short{display:none}
@media (prefers-reduced-motion:reduce){#hb-back{transition:none}#hb-back:hover{transform:none}}
@media print{#hb-back{display:none}}
</style>`;
}
