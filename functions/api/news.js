/**
 * Cloudflare Pages Function — /api/news
 * Proxies Google News RSS for earthquake queries, returns normalized JSON.
 * Runs server-side, so no CORS issue and no API key needed.
 */

const QUERIES = [
  { q: 'deprem', hl: 'tr', gl: 'TR', ceid: 'TR:tr' },
  { q: 'earthquake', hl: 'en', gl: 'US', ceid: 'US:en' },
];

const CACHE_SECONDS = 300; // 5 minutes via Cloudflare edge cache

export async function onRequestGet(context) {
  try {
    const articles = [];

    for (const params of QUERIES) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(params.q)}&hl=${params.hl}&gl=${params.gl}&ceid=${params.ceid}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EarthquakeTrack/1.0)' },
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const parsed = parseRSS(xml);
      articles.push(...parsed);
    }

    // Deduplicate by title
    const seen = new Set();
    const unique = articles.filter(a => {
      const key = a.title.slice(0, 60).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date descending
    unique.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

    return new Response(JSON.stringify({ ok: true, articles: unique.slice(0, 20) }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// ── Simple RSS parser ──────────────────────────────────────────────────

function parseRSS(xml) {
  const items = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m;

  while ((m = itemRx.exec(xml)) !== null) {
    const raw = m[1];
    const title = cd(tag(raw, 'title'));
    const link  = cd(tag(raw, 'link')) || attrVal(raw, 'guid', 'isPermaLink') && cd(tag(raw, 'guid'));
    const pubDate = tag(raw, 'pubDate');
    const sourceName = cd(tag(raw, 'source')) || attrVal(raw, 'source', 'url') || 'Google Haberler';
    const description = cd(tag(raw, 'description'));

    if (!title) continue;

    items.push({ title, link: link || '#', pubDate, source_id: sourceName, description, image_url: null });
  }

  return items;
}

function tag(xml, name) {
  const rx = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const m = xml.match(rx);
  return m ? m[1] : '';
}

function attrVal(xml, tagName, attr) {
  const rx = new RegExp(`<${tagName}[^>]*\\s${attr}="([^"]*)"[^>]*>`, 'i');
  const m = xml.match(rx);
  return m ? m[1] : '';
}

function cd(str) {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}
