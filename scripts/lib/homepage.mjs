// Renders the homepage and 404 page from site/index.html + modules.config.mjs, and the back-link snippet for modules.
// Cards are generated at build time, so the homepage is plain HTML: fast, crawlable and usable without JavaScript.
import { moduleUrl } from "./config.mjs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeColor = (c) => (/^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl|oklch)a?\([\d\s.,%/-]+\))$/i.test(c ?? "") ? c : "#7fb4ff");

export function renderHomepage(template, modules, images, base) {
  const available = modules.filter((m) => (m.status ?? "available") === "available");
  const cards = modules.map((m, i) => card(m, images[m.id], i)).join("\n") + "\n" + upcomingCard();
  return fill(template, base, {
    TITLE: "Interactive Human Biology",
    MAIN: `
      <section class="hero" aria-labelledby="hero-title">
        <p class="eyebrow"><span class="pulse" aria-hidden="true"></span>Interactive 3D learning</p>
        <h1 id="hero-title">Interactive Human Biology</h1>
        <p class="lede">Explore the human body through interactive 3D learning experiences.</p>
        <div class="hero-actions">
          <a class="btn btn--primary" href="#modules">Browse modules <span aria-hidden="true">↓</span></a>
          <p class="hero-note">${available.length} ${available.length === 1 ? "module" : "modules"} · narrated lessons · free exploration in 3D</p>
        </div>
      </section>

      <section id="modules" class="modules" aria-labelledby="modules-title">
        <div class="section-head">
          <h2 id="modules-title">Learning modules</h2>
          <p>Each module is a complete lesson: watch it, then take the model into your own hands.</p>
        </div>
        <ul class="grid" role="list">
${cards}
        </ul>
      </section>

      <section class="how" aria-labelledby="how-title">
        <h2 id="how-title" class="visually-hidden">How the lessons work</h2>
        <ol class="steps" role="list">
          <li><span class="step-n" aria-hidden="true">01</span><h3>Watch</h3><p>A narrated 3D film walks through the anatomy, with every part labelled as it is named.</p></li>
          <li><span class="step-n" aria-hidden="true">02</span><h3>Explore</h3><p>Pause at any moment. Rotate, zoom and pick parts of the model to study them up close.</p></li>
          <li><span class="step-n" aria-hidden="true">03</span><h3>Understand</h3><p>See why structures are shaped the way they are, and how that shape decides what they do.</p></li>
        </ol>
      </section>`,
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
      <section class="hero hero--compact" aria-labelledby="nf-title">
        <p class="eyebrow">404</p>
        <h1 id="nf-title">This page isn’t part of the body</h1>
        <p class="lede">The address may be mistyped, or the module may have moved.</p>
        <div class="hero-actions"><a class="btn btn--primary" href="${esc(base)}">Go to the homepage</a></div>
        <ul class="nf-links" role="list">${links}</ul>
      </section>`,
  });
}

function card(m, image, index) {
  const soon = (m.status ?? "available") === "coming-soon";
  const c = m.card ?? {};
  const href = moduleUrl(m);
  const titleId = `card-${esc(m.id)}`;
  const media = image
    ? `<img src="${esc(image)}" alt="${esc(c.imageAlt ?? "")}" width="1280" height="800" ${index > 1 ? 'loading="lazy" ' : ""}decoding="async">`
    : `<div class="card-placeholder" aria-hidden="true">${esc(m.title.slice(0, 1))}</div>`;
  const facts = (c.facts ?? []).map((f) => `<li>${esc(f)}</li>`).join("");
  const title = soon ? esc(m.title) : `<a class="card-link" href="${esc(href)}">${esc(m.title)}</a>`;
  const action = soon
    ? `<span class="card-cta card-cta--soon">Coming soon</span>`
    : `<span class="card-cta" aria-hidden="true">Explore <span class="arrow">→</span></span>`;
  return `          <li class="card${soon ? " card--soon" : ""}" style="--accent:${safeColor(c.accent)}" data-module="${esc(m.id)}">
            <article aria-labelledby="${titleId}">
              <div class="card-media">${media}</div>
              <div class="card-body">
                ${c.eyebrow ? `<p class="card-eyebrow">${esc(c.eyebrow)}</p>` : ""}
                <h3 id="${titleId}">${title}</h3>
                <p class="card-desc">${esc(m.description)}</p>
                ${facts ? `<ul class="facts" role="list">${facts}</ul>` : ""}
                ${action}
              </div>
            </article>
          </li>`;
}

function upcomingCard() {
  return `          <li class="card card--upcoming" aria-label="More modules are in development">
            <div class="upcoming">
              <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 4"/><path d="M24 15v18M15 24h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              <h3>More systems on the way</h3>
              <p>Digestive, nervous, circulatory and more will join the platform as they are built.</p>
            </div>
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
