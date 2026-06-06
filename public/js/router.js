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

        const main = doc.querySelector('main.main-content')
                  || doc.querySelector('main')
                  || doc.querySelector('.main-content');

        if (!main) throw new Error('main bulunamadı: ' + url);

        panel.innerHTML = main.innerHTML;

        // Blog: init tabs/news manually (no import dependency)
        if (url.includes('blog')) initBlogInPanel(panel);

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
        panel.innerHTML = `<p style="padding:32px;color:var(--text-secondary)">Hata: ${err.message}</p>`;
    } finally {
        const loader = document.getElementById('page-transition-loader');
        if (loader) loader.classList.add('is-hidden');
    }
}

// Self-contained blog tab + news init (no import needed)
function initBlogInPanel(root) {
    const tabBtns = root.querySelectorAll('.blog-tab-btn');
    const newsContainer = root.querySelector('#news-container');
    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            root.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = root.querySelector('#' + btn.dataset.target);
            if (target) target.classList.add('active');
            if (btn.dataset.target === 'tab-news' && newsContainer?.innerHTML.includes('news-loading')) {
                fetchNewsInto(newsContainer);
            }
        });
    });
}

async function fetchNewsInto(container) {
    const CACHE_KEY = 'eq_news_cache';
    const CACHE_MS = 3600000;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const p = JSON.parse(cached);
        if (Date.now() - p.timestamp < CACHE_MS) { renderNews(container, p.articles); return; }
    }
    // Mock data (replace apiKey to use real API)
    setTimeout(() => renderNews(container, getMockNews()), 800);
}

function renderNews(container, articles) {
    container.innerHTML = '';
    articles.slice(0, 10).forEach(a => {
        const card = document.createElement('a');
        card.href = a.link; card.target = '_blank'; card.className = 'news-card';
        const img = a.image_url
            ? `<div class="news-image" style="background-image:url('${a.image_url}')"></div>`
            : `<div class="news-image"><div class="news-placeholder">Görsel Yok</div></div>`;
        let date = a.pubDate;
        try { date = new Date(a.pubDate).toLocaleDateString('tr-TR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' }); } catch(_){}
        card.innerHTML = `${img}<div class="news-content"><div class="news-source">${a.source_id||'Kaynak'}</div><h3 class="news-title">${a.title}</h3><div class="news-meta">${date}</div></div>`;
        container.appendChild(card);
    });
}

function getMockNews() {
    return [
        { title:"AFAD'dan Son Dakika: Ege'de Korkutan Sarsıntı", link:'#', image_url:'https://images.unsplash.com/photo-1527018263309-8d19760a927a?w=500&q=60', source_id:'Haber Ajansı', pubDate:new Date().toISOString() },
        { title:"Uzmanlar Uyardı: İstanbul Depremi İçin Hazırlıklar Hızlandırılmalı", link:'#', image_url:'https://images.unsplash.com/photo-1506544777-64cfbea112ea?w=500&q=60', source_id:'Bilim & Teknik', pubDate:new Date(Date.now()-3600000).toISOString() },
        { title:"Pasifik Ateş Çemberi'nde Sismik Hareketlilik Artıyor", link:'#', image_url:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&q=60', source_id:'Global News', pubDate:new Date(Date.now()-7200000).toISOString() },
        { title:"Yeni Deprem İzolatörleri Türkiye'de Yaygınlaşıyor", link:'#', image_url:'https://images.unsplash.com/photo-1541888078519-216a69fb20b8?w=500&q=60', source_id:'İnşaat Dünyası', pubDate:new Date(Date.now()-86400000).toISOString() }
    ];
}

function setActiveLink(url) {
    document.querySelectorAll('.nav-link-item, .sidebar-footer a').forEach(a => {
        const href = (a.getAttribute('href')||'').replace(/^\.\//, '');
        a.classList.toggle('active', href === url || url.endsWith(href));
    });
}
