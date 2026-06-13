import { getCurrentLang } from './language.js';

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CONTENT_ROUTES = [
    'blog.html', 'preparedness.html', 'education.html',
    'about.html', 'faq.html', 'contact.html', 'privacy.html', 'terms.html'
];

function getPanel() { return document.getElementById('content-panel'); }
function getMapC()  { return document.getElementById('map-container'); }

function showPanel() {
    const p = getPanel(), m = getMapC();
    if (p) { p.style.display = 'block'; p.removeAttribute('hidden'); }
    if (m) { m.style.display = 'none'; }
    document.querySelectorAll('.main-nav ul.icon-nav li').forEach(li => li.classList.remove('active'));
}

export function showMap() {
    const p = getPanel(), m = getMapC();
    if (p) { p.style.display = 'none'; }
    if (m) { m.style.display = ''; }
    document.querySelectorAll('.nav-link-item, .sidebar-footer a').forEach(a => a.classList.remove('active'));
}

export function initRouter() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('//') ||
            href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto')) return;

        const norm = href.replace(/^\.\//, '');
        const isContent = CONTENT_ROUTES.some(r => norm === r || norm.endsWith('/' + r) || norm.startsWith('blog/'));
        if (!isContent) return;

        e.preventDefault();
        navigate(norm);
    });

    window.addEventListener('popstate', (e) => {
        if (e.state?.contentUrl) {
            loadContent(e.state.contentUrl);
            setActiveLink(e.state.contentUrl);
        } else {
            showMap();
        }
    });
}

async function navigate(url) {
    setActiveLink(url);
    await loadContent(url);
    history.pushState({ contentUrl: url }, '', url);
}

async function loadContent(url) {
    const panel = getPanel();
    if (!panel) return;

    showPanel();
    panel.innerHTML = '<div class="content-panel-loading"><div class="content-panel-spinner"></div></div>';

    const base = window._routerBase || (location.origin + '/');
    const fetchUrl = new URL(url, base).href;

    try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();

        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Inject page-specific inline styles
        document.querySelectorAll('style[data-rp]').forEach(s => s.remove());
        doc.querySelectorAll('head style').forEach(s => {
            const tag = document.createElement('style');
            tag.dataset.rp = url;
            tag.textContent = s.textContent;
            document.head.appendChild(tag);
        });

        // Astro extracts page styles into external /_astro/*.css files — bring those in too.
        // Keep previously added ones (they're content-hashed, so caching them is harmless).
        const cssLoads = [];
        doc.querySelectorAll('head link[rel="stylesheet"]').forEach(l => {
            const href = l.getAttribute('href');
            if (!href || !href.includes('/_astro/')) return;
            if (document.querySelector(`link[href="${href}"]`)) return;
            const tag = document.createElement('link');
            tag.rel = 'stylesheet';
            tag.href = href;
            cssLoads.push(new Promise(r => { tag.onload = tag.onerror = r; }));
            document.head.appendChild(tag);
        });
        if (cssLoads.length) await Promise.all(cssLoads);

        const main = doc.querySelector('main.main-content')
                  || doc.querySelector('main')
                  || doc.querySelector('.main-content');

        if (!main) throw new Error('main bulunamadı: ' + url);

        panel.innerHTML = main.innerHTML;

        // Blog: real tab + news logic lives in news.js (shared with the standalone page)
        if (url.includes('blog')) {
            try {
                const mod = await import('/js/news.js');
                mod.initBlog();
            } catch (err) {
                console.error('[router] news init failed:', err);
            }
        }

        // Sync content language for dual-language pages (TR/EN)
        const lang = getCurrentLang();
        const trEl = panel.querySelector('#content-tr');
        const enEl = panel.querySelector('#content-en');
        if (trEl) trEl.style.display = lang === 'tr' ? '' : 'none';
        if (enEl) enEl.style.display = lang === 'en' ? '' : 'none';

        // Intercept links inside loaded content
        panel.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return;
            const norm = href.replace(/^\.\.\//, '').replace(/^\.\//, '');
            const isContent = CONTENT_ROUTES.some(r => norm === r || norm.endsWith('/' + r) || norm.startsWith('blog/'));
            if (!isContent) return;
            a.addEventListener('click', (ev) => { ev.preventDefault(); navigate(norm); });
        });

    } catch (err) {
        console.error('[router] failed:', err);
        panel.innerHTML = `<p style="padding:32px;color:var(--text-secondary)">Hata: ${esc(err.message)}</p>`;
    } finally {
        const loader = document.getElementById('page-transition-loader');
        if (loader) loader.classList.add('is-hidden');
    }
}

function setActiveLink(url) {
    document.querySelectorAll('.nav-link-item, .sidebar-footer a').forEach(a => {
        const href = (a.getAttribute('href')||'').replace(/^\.\//, '');
        a.classList.toggle('active', href === url || url.endsWith(href));
    });
}
