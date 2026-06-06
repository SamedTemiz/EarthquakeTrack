// Called both from DOMContentLoaded (direct page visit) and from router (SPA inject)
function initBlog(root = document) {
    const tabBtns = root.querySelectorAll('.blog-tab-btn');
    const tabContents = root.querySelectorAll('.tab-content');
    const newsContainer = root.querySelector('#news-container');

    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetTab = root.querySelector('#' + targetId);
            if (targetTab) targetTab.classList.add('active');

            if (targetId === 'tab-news' && newsContainer && newsContainer.innerHTML.includes('news-loading')) {
                fetchNews(newsContainer);
            }
        });
    });
}

const CACHE_KEY = 'eq_news_cache';
const CACHE_TIME_MS = 60 * 60 * 1000;

async function fetchNews(newsContainer) {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.timestamp < CACHE_TIME_MS) {
            renderNews(newsContainer, parsed.articles);
            return;
        }
    }

    try {
        const apiKey = 'YOUR_API_KEY';

        if (apiKey === 'YOUR_API_KEY') {
            setTimeout(() => {
                renderNews(newsContainer, getMockNews());
                console.log('UYARI: Lütfen news.js içindeki apiKey değişkenini doldurun.');
            }, 800);
            return;
        }

        const response = await fetch(`https://newsdata.io/api/1/news?apikey=${apiKey}&q=earthquake%20OR%20deprem&language=tr,en`);
        const data = await response.json();

        if (data.status === 'success' && data.results) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), articles: data.results }));
            renderNews(newsContainer, data.results);
        } else {
            showError(newsContainer, 'Haberler alınırken bir sorun oluştu.');
        }
    } catch (error) {
        console.error('News fetch error:', error);
        showError(newsContainer, 'Bağlantı hatası: Haberler yüklenemedi.');
    }
}

function renderNews(newsContainer, articles) {
    if (!articles || articles.length === 0) {
        newsContainer.innerHTML = '<div class="news-loading">Şu an için yeni deprem haberi bulunmuyor.</div>';
        return;
    }

    newsContainer.innerHTML = '';
    articles.slice(0, 10).forEach(article => {
        const card = document.createElement('a');
        card.href = article.link;
        card.target = '_blank';
        card.className = 'news-card';

        const imageHtml = article.image_url
            ? `<div class="news-image" style="background-image: url('${article.image_url}')"></div>`
            : `<div class="news-image"><div class="news-placeholder">Görsel Yok</div></div>`;

        let dateStr = article.pubDate;
        try {
            dateStr = new Date(article.pubDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        } catch (e) {}

        card.innerHTML = `
            ${imageHtml}
            <div class="news-content">
                <div class="news-source">${article.source_id || 'Haber Kaynağı'}</div>
                <h3 class="news-title">${article.title}</h3>
                <div class="news-meta">
                    <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    ${dateStr}
                </div>
            </div>
        `;
        newsContainer.appendChild(card);
    });
}

function showError(newsContainer, msg) {
    newsContainer.innerHTML = `<div class="news-loading" style="color:#ff6b6b">${msg}</div>`;
}

function getMockNews() {
    return [
        { title: "AFAD'dan Son Dakika Deprem Açıklaması: Ege Denizi'nde Korkutan Sarsıntı", link: '#', image_url: 'https://images.unsplash.com/photo-1527018263309-8d19760a927a?w=500&auto=format&fit=crop&q=60', source_id: 'Haber Ajansı', pubDate: new Date().toISOString() },
        { title: "Uzmanlardan Uyarı: Beklenen İstanbul Depremi İçin Hazırlıklar Hızlandırılmalı", link: '#', image_url: 'https://images.unsplash.com/photo-1506544777-64cfbea112ea?w=500&auto=format&fit=crop&q=60', source_id: 'Bilim & Teknik', pubDate: new Date(Date.now() - 3600000).toISOString() },
        { title: "Dünya Genelinde Sismik Hareketlilik Artıyor: Pasifik Ateş Çemberi Aktif", link: '#', image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=60', source_id: 'Global News', pubDate: new Date(Date.now() - 7200000).toISOString() },
        { title: "Yeni Nesil Deprem İzolatörleri Türkiye'deki Binalarda Yaygınlaşıyor", link: '#', image_url: 'https://images.unsplash.com/photo-1541888078519-216a69fb20b8?w=500&auto=format&fit=crop&q=60', source_id: 'İnşaat Dünyası', pubDate: new Date(Date.now() - 86400000).toISOString() }
    ];
}

// Direct page visit (blog.html açıldığında)
document.addEventListener('DOMContentLoaded', () => initBlog(document));
