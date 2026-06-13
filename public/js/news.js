/**
 * Multi-provider news fetcher with automatic fallback.
 *
 * Provider priority (highest → lowest):
 *   1. /api/news       — our Cloudflare Pages Function (Google News RSS, no key, no limit)
 *   2. GNews API       — 100 req/day free, enable by setting GNEWS_KEY
 *   3. NewsData.io     — 200 req/day free (12 h delay), enable by setting NEWSDATA_KEY
 *
 * When a provider fails (network error, rate-limit, bad response) it is marked
 * in localStorage and skipped for FAILURE_TTL_MS. After that window it is retried.
 *
 * Successful responses are cached in localStorage for CACHE_TTL_MS.
 */

import { getCurrentLang } from './language.js';

// ── Config ────────────────────────────────────────────────────────────
const CACHE_TTL_MS       = 30 * 60 * 1000;
const FAILURE_TTL_MS     = 60 * 60 * 1000;
const LOCATION_CACHE_MS  = 24 * 60 * 60 * 1000;
const CACHE_KEY          = 'eq_news_cache';
const FAILURES_KEY       = 'eq_news_failures';
const IP_CACHE_KEY       = 'eq_ip_loc'; // shared with map.js — stores { at, code: ISO-3166-1-alpha-2 }

// Add API keys here when available:
const GNEWS_KEY    = 'b65afdaf6d3c22ccb5665448278a826e';   // https://gnews.io  — free: 100 req/day
const NEWSDATA_KEY = 'pub_357035f2d9a34c33a57a3b501a7e83c1';   // https://newsdata.io — free: 200 req/day

// ── Location detection ────────────────────────────────────────────────

// Reads the shared IP cache that map.js also writes to; falls back to a fresh fetch.
// Returns ISO 3166-1 alpha-2 country code (e.g. 'TR') to avoid locale-dependent country names.
async function getUserCountryCode() {
  // 1. Shared cache check (map.js writes country_code here)
  try {
    const cached = JSON.parse(localStorage.getItem(IP_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < LOCATION_CACHE_MS && cached.code) return cached.code;
  } catch {}

  // 2. IP geolocation — no user permission needed
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const code = data.country_code;
    if (code) {
      try { localStorage.setItem(IP_CACHE_KEY, JSON.stringify({ at: Date.now(), code })); } catch {}
      return code;
    }
  } catch {}

  // 3. Sidebar country filter as last resort
  const select = document.getElementById('country-select');
  if (select?.value) {
    const SIDEBAR_TO_CODE = { Turkey: 'TR', Greece: 'GR', Italy: 'IT', Japan: 'JP' };
    return SIDEBAR_TO_CODE[select.value] || null;
  }

  return null;
}

const COUNTRY_NAMES = {
  TR: 'Turkey', GR: 'Greece', IT: 'Italy', JP: 'Japan',
  US: 'United States', CN: 'China', MX: 'Mexico', IR: 'Iran',
  ID: 'Indonesia', PH: 'Philippines', FR: 'France', DE: 'Germany',
  ES: 'Spain', PT: 'Portugal', RO: 'Romania', BG: 'Bulgaria',
  RU: 'Russia', UA: 'Ukraine', IN: 'India', AU: 'Australia',
  AR: 'Argentina', BR: 'Brazil', CA: 'Canada', GB: 'United Kingdom',
  PK: 'Pakistan', NZ: 'New Zealand', CL: 'Chile', PE: 'Peru',
};

function buildQuery(code) {
  if (!code) return { gnews: 'earthquake', newsdata: 'earthquake', label: 'Dünya geneli' };
  const name = COUNTRY_NAMES[code] || code;
  return {
    gnews:    `earthquake ${name}`,
    newsdata: code === 'TR' ? 'deprem' : `earthquake ${name}`,
    label:    name,
  };
}

// ── Provider definitions ──────────────────────────────────────────────

class RateLimitError extends Error {}

const PROVIDERS = [
  {
    id: 'cloudflare-rss',
    name: 'Google Haberler (RSS)',
    enabled: true,
    async fetch(query) {
      const q = encodeURIComponent(query.gnews);
      const res = await fetch(`/api/news?q=${q}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'RSS proxy error');
      return data.articles;
    },
  },
  {
    id: 'gnews',
    name: 'GNews',
    get enabled() { return !!GNEWS_KEY; },
    async fetch(query) {
      const q = encodeURIComponent(query.gnews);
      const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&max=12&apikey=${GNEWS_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.status === 429) throw new RateLimitError('GNews rate limit');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.articles?.length) throw new Error('No articles returned');
      return data.articles.map(a => ({
        title:     a.title || '',
        link:      a.url || '#',
        pubDate:   a.publishedAt || null,
        source_id: a.source?.name || 'GNews',
        image_url: a.image || null,
        description: a.description || '',
      }));
    },
  },
  {
    id: 'newsdata',
    name: 'NewsData.io',
    get enabled() { return !!NEWSDATA_KEY; },
    async fetch(query) {
      const q = encodeURIComponent(query.newsdata);
      const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=${q}&language=tr,en`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.status === 429) throw new RateLimitError('NewsData rate limit');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.results?.length) throw new Error('No results returned');
      return data.results.map(a => ({
        title:     a.title || '',
        link:      a.link || '#',
        pubDate:   a.pubDate || null,
        source_id: a.source_id || 'NewsData',
        image_url: a.image_url || null,
        description: a.description || '',
      }));
    },
  },
];

// ── Failure tracking ──────────────────────────────────────────────────

function getFailures() {
  try { return JSON.parse(localStorage.getItem(FAILURES_KEY) || '{}'); } catch { return {}; }
}

function markFailed(id, reason) {
  const f = getFailures();
  f[id] = { at: Date.now(), reason };
  try { localStorage.setItem(FAILURES_KEY, JSON.stringify(f)); } catch {}
  console.warn(`[news] Provider "${id}" marked failed: ${reason}`);
}

function isAvailable(provider) {
  if (!provider.enabled) return false;
  const f = getFailures()[provider.id];
  if (!f) return true;
  return Date.now() - f.at > FAILURE_TTL_MS;
}

// ── Cache ─────────────────────────────────────────────────────────────

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.at < CACHE_TTL_MS) return c;
  } catch {}
  return null;
}

function writeCache(articles, source, label) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), articles, source, label })); } catch {}
}

// ── Main fetch orchestrator ───────────────────────────────────────────

async function fetchNews() {
  const cached = readCache();
  if (cached) {
    console.log(`[news] Cache hit (source: ${cached.source}, location: ${cached.label})`);
    return cached;
  }

  const code  = await getUserCountryCode();
  const query = buildQuery(code);
  console.log(`[news] Query for "${query.label}":`, query);

  for (const provider of PROVIDERS) {
    if (!isAvailable(provider)) {
      console.log(`[news] Skipping "${provider.name}"`);
      continue;
    }
    try {
      console.log(`[news] Trying "${provider.name}"...`);
      const articles = await provider.fetch(query);
      writeCache(articles, provider.name, query.label);
      console.log(`[news] ✓ "${provider.name}" → ${articles.length} articles`);
      return { articles, source: provider.name, label: query.label };
    } catch (err) {
      markFailed(provider.id, err.message);
    }
  }

  console.warn('[news] All providers failed, using mock data.');
  return { articles: getMockArticles(), source: 'Demo', label: query.label };
}

// ── Rendering ─────────────────────────────────────────────────────────

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#1a1a2e,#16213e)',
  'linear-gradient(135deg,#2d1b0e,#4a2c0a)',
  'linear-gradient(135deg,#0d2137,#1a3a5c)',
  'linear-gradient(135deg,#2a0d1a,#4a1a2e)',
  'linear-gradient(135deg,#0d1a0d,#1a3a1a)',
  'linear-gradient(135deg,#1a1a0d,#3a3a1a)',
  'linear-gradient(135deg,#0d0d2d,#1a1a4a)',
];

function timeAgo(dateStr, lang) {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (lang === 'en') {
      if (m < 2) return 'Just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      if (d === 1) return 'Yesterday';
      if (d < 7) return `${d}d ago`;
      return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
    }
    if (m < 2) return 'Az önce';
    if (m < 60) return `${m} dk önce`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} sa önce`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'Dün';
    if (d < 7) return `${d} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  } catch { return ''; }
}

const EXT_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

// Article titles/sources come from external news providers (Google News RSS, GNews, NewsData)
// and are injected via innerHTML — escape them to prevent XSS from a malicious headline.
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Only allow plain http(s) image URLs; reject anything that could break out of the CSS url('…') context.
function safeImageUrl(u) {
  if (typeof u !== 'string' || !/^https?:\/\//i.test(u)) return null;
  if (/["'()\\\s]/.test(u)) return null;
  return u;
}

function renderNews(container, articles, source, label) {
  const lang = getCurrentLang();
  if (!articles?.length) {
    container.innerHTML = `<div class="news-loading">${lang === 'en' ? 'No current news available.' : 'Şu an için güncel haber bulunmuyor.'}</div>`;
    return;
  }

  container.innerHTML = '';

  // Location badge
  if (label) {
    const badge = document.createElement('div');
    badge.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:.75rem;color:var(--text-tertiary);margin-bottom:14px;';
    const isGlobal = label === 'Dünya geneli' || label === 'Worldwide';
    const displayLabel = isGlobal ? (lang === 'en' ? 'Worldwide' : 'Dünya geneli') : esc(label);
    const icon = isGlobal
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    badge.innerHTML = `${icon} ${displayLabel} ${lang === 'en' ? 'earthquake news' : 'deprem haberleri'}`;
    container.appendChild(badge);
  }

  // Deduplicate by normalized title (same story from multiple sources)
  const seenTitles = new Set();
  const unique = articles.filter(a => {
    const key = String(a.title || '').slice(0, 60).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });
  const list = unique.slice(0, 13);

  const heroItem = list[0];
  const heroImgUrl = safeImageUrl(heroItem?.image_url);
  // Track used image URLs to avoid showing the same image in multiple slots
  const usedImgs = new Set(heroImgUrl ? [heroImgUrl] : []);

  // ── Top section: hero + side stack ──
  const wrap = document.createElement('div');
  wrap.className = 'news-wrap';

  // Hero card
  const heroEl = document.createElement('a');
  heroEl.href = heroItem.link || '#';
  heroEl.target = '_blank';
  heroEl.rel = 'noopener noreferrer';
  heroEl.className = 'news-hero';
  const heroBg = heroImgUrl
    ? `background-image:url('${heroImgUrl}')`
    : `background:${CARD_GRADIENTS[0]}`;
  heroEl.innerHTML = `
    <div class="news-hero-bg" style="${heroBg}"></div>
    <div class="news-hero-overlay"></div>
    <div class="news-hero-body">
      <div class="news-hero-source">${esc(heroItem.source_id || source)}</div>
      <h2 class="news-hero-title">${esc(heroItem.title)}</h2>
      <div class="news-hero-time">${timeAgo(heroItem.pubDate, lang)}</div>
    </div>
    <div class="news-hero-ext">${EXT_ICON}</div>
  `;
  wrap.appendChild(heroEl);

  // Side stack (articles 1-3)
  const side = document.createElement('div');
  side.className = 'news-side';
  list.slice(1, 4).forEach((a, i) => {
    const card = document.createElement('a');
    card.href = a.link || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'news-side-card';
    const imgUrl = safeImageUrl(a.image_url);
    const useImg = imgUrl && !usedImgs.has(imgUrl);
    const imgStyle = useImg
      ? `background-image:url('${imgUrl}')`
      : `background:${CARD_GRADIENTS[(i + 1) % CARD_GRADIENTS.length]}`;
    if (useImg) usedImgs.add(imgUrl);
    card.innerHTML = `
      <div class="news-side-img" style="${imgStyle}"></div>
      <div class="news-side-body">
        <div class="news-side-source">${esc(a.source_id || source)}</div>
        <div class="news-side-title">${esc(a.title)}</div>
        <div class="news-side-time">${timeAgo(a.pubDate, lang)}</div>
      </div>
    `;
    side.appendChild(card);
  });
  wrap.appendChild(side);
  container.appendChild(wrap);

  // ── Mid grid: 4 equal columns (articles 4-7) ──
  const midItems = list.slice(4, 8);
  if (midItems.length) {
    const mid = document.createElement('div');
    mid.className = 'news-mid';
    midItems.forEach((a, i) => {
      const card = document.createElement('a');
      card.href = a.link || '#';
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'news-mid-card';
      const imgUrl = safeImageUrl(a.image_url);
      const useImg = imgUrl && !usedImgs.has(imgUrl);
      const imgStyle = useImg
        ? `background-image:url('${imgUrl}')`
        : `background:${CARD_GRADIENTS[(i + 4) % CARD_GRADIENTS.length]}`;
      if (useImg) usedImgs.add(imgUrl);
      card.innerHTML = `
        <div class="news-mid-img" style="${imgStyle}"></div>
        <div class="news-mid-body">
          <div class="news-mid-source">${esc(a.source_id || source)}</div>
          <h3 class="news-mid-title">${esc(a.title)}</h3>
          <div class="news-mid-time">${timeAgo(a.pubDate, lang)}</div>
        </div>
      `;
      mid.appendChild(card);
    });
    container.appendChild(mid);
  }

  // ── Compact list (articles 8-12) ──
  const listItems = list.slice(8);
  if (listItems.length) {
    const listEl = document.createElement('div');
    listEl.className = 'news-list';
    listItems.forEach(a => {
      const item = document.createElement('a');
      item.href = a.link || '#';
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
      item.className = 'news-list-item';
      item.innerHTML = `
        <div class="news-list-dot"></div>
        <div class="news-list-body">
          <div class="news-list-source">${esc(a.source_id || source)}</div>
          <div class="news-list-title">${esc(a.title)}</div>
        </div>
        <div class="news-list-time">${timeAgo(a.pubDate, lang)}</div>
      `;
      listEl.appendChild(item);
    });
    container.appendChild(listEl);
  }
}

function showLoading(container) {
  const lang = getCurrentLang();
  container.innerHTML = `<div class="news-loading">${lang === 'en' ? 'Loading latest earthquake news…' : 'Güncel deprem haberleri yükleniyor…'}</div>`;
}

function showError(container, msg) {
  container.innerHTML = `<div class="news-loading" style="color:#ff6b6b">⚠️ ${msg}</div>`;
}

// ── Tab & init logic ──────────────────────────────────────────────────

export function initBlog() {
  const tabBtns     = document.querySelectorAll('.blog-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const container   = document.getElementById('news-container');

  if (!tabBtns.length || !container) return;

  // Guard against double-binding — keyed on the container, not on a specific button,
  // so button order changes or re-creation don't break the guard.
  if (container.dataset.bound) return;
  container.dataset.bound = '1';

  let newsLoaded = false;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.target);
      if (panel) panel.classList.add('active');

      if (btn.dataset.target === 'tab-news' && container && !newsLoaded) {
        newsLoaded = true;
        showLoading(container);
        fetchNews()
          .then(({ articles, source, label }) => renderNews(container, articles, source, label))
          .catch(err => showError(container, err.message));
      }
    });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────
// Handles both first load and ClientRouter (astro:page-load) navigations.

function tryInit() {
  if (document.querySelector('.blog-tab-btn')) initBlog();
}

document.addEventListener('astro:page-load', tryInit);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInit);
} else {
  tryInit();
}

// ── Mock data (fallback when all providers fail) ───────────────────────

function getMockArticles() {
  const now = Date.now();
  return [
    { title: "AFAD: Ege Denizi'nde 4.2 büyüklüğünde deprem", link: '#', pubDate: new Date(now - 3600000).toISOString(), source_id: 'AFAD', image_url: null },
    { title: "Uzmanlar İstanbul deprem riskini değerlendirdi", link: '#', pubDate: new Date(now - 7200000).toISOString(), source_id: 'Bilim & Teknik', image_url: null },
    { title: "Depreme dayanıklı bina yönetmeliği güncellendi", link: '#', pubDate: new Date(now - 86400000).toISOString(), source_id: 'İnşaat Dünyası', image_url: null },
  ];
}
