# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EarthquakeTrack (earthquaketrack.com.tr) — live earthquake tracking dashboard for Turkey and the world, plus content pages (blog, preparedness, education, FAQ, etc.) added for Google AdSense content quality. Primary language is Turkish with a TR/EN i18n toggle. Deployed on Cloudflare Pages.

## Commands

```bash
npm run dev       # astro dev server (content pages + public/ assets)
npm run build     # astro build → dist/
npm run preview   # preview the built dist/
```

There are no tests or linters configured. To verify the Cloudflare Pages Function (`/api/news`) locally, `npx wrangler pages dev dist` is needed — `astro dev` does not serve `functions/`.

## Architecture

Hybrid Astro + vanilla JS "App Shell":

- **`public/index.html`** — the main interactive map app (homepage). It is a plain HTML file served verbatim, NOT an Astro page. `astro.config.mjs` redirects `/` → `/index.html`.
- **`src/pages/*.astro`** — all content pages (about, blog, blog posts, contact, education, faq, preparedness, privacy, terms), built with `src/layouts/PageLayout.astro`. Build uses `format: 'file'` so each page outputs as `page.html` (links between pages use `.html` URLs).
- **`PageLayout.astro`** uses Astro's `<ClientRouter />` (view transitions) and `transition:persist="sidebar"` so the sidebar (with live earthquake list) survives client-side navigations between content pages.
- **`public/js/*.js`** — ES modules powering both the map app and the sidebar on content pages: `api.js` (data fetching/merging), `map.js` (Leaflet), `ui.js`, `language.js` (TR/EN via `data-i18n` attributes), `theme.js` (dark default, `data-theme` on `<html>`, localStorage), `news.js`, `layout.js`, `sidebar-data.js`, `modal.js`, `router.js`.
- **`functions/api/news.js`** — Cloudflare Pages Function proxying Google News RSS (TR + EN earthquake queries) to JSON; 5-min edge cache. The `functions/` directory must stay at repo root for Cloudflare Pages to pick it up.
- **Leaflet is vendored** at `public/vendor/leaflet/` (no CDN, no npm dependency).

### Data sources (client-side, `public/js/api.js`)

- USGS GeoJSON feed (world, M2.5+ past day)
- Kandilli via `api.orhanaydogdu.com.tr` (Turkey)
- EMSC seismicportal.eu (Europe + Turkey bounding box)
- Nominatim reverse geocoding for the geolocation → country selector feature

### Legacy duplication — IMPORTANT

Root-level `index.html`, `*.html`, `js/`, `style.css`, `app.js`, `vendor/`, `blog/` are **stale pre-Astro copies** still tracked in git. The live sources are `public/` (assets, JS, index.html, style.css) and `src/` (content pages). Never edit the root copies; they are pending removal.

## Conventions

- `style.css` is shared by every page and referenced with a cache-busting query (`/style.css?v=NNNN` in `PageLayout.astro` and `public/index.html`). Bump the version in both places when changing CSS.
- i18n: UI strings carry `data-i18n` attributes resolved by `language.js`; default content in markup is Turkish.
- Theme: dark is the default; an inline script in `<head>` sets `data-theme` before paint to avoid flash.
- User-facing text and commit context are Turkish; code identifiers and comments are English.
- Security headers and cache policy live in `public/_headers` (Cloudflare Pages format).
- `wrangler.jsonc` points static assets at `./dist`.

## Deployment

Cloudflare Pages, production tracks the `main` branch. Build output is `dist/` (Astro build copies `public/` verbatim and emits `src/pages` as flat `.html` files). `public/ads.txt`, `robots.txt`, and `sitemap.xml` must end up at the site root — keep them in `public/`, and keep `sitemap.xml` updated when adding pages.
