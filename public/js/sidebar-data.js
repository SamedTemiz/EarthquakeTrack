import { getEarthquakeData } from './api.js';

const CACHE_MS = 60 * 1000;
const SESSION_KEY = 'eq_sidebar_cache';

function readSessionCache() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (cached && Array.isArray(cached.data) && Date.now() - cached.ts < CACHE_MS) {
            return cached.data;
        }
    } catch {}
    return null;
}

function writeSessionCache(data) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
}

function clearSessionCache() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

async function loadQuakes() {
    const cached = readSessionCache();
    if (cached) return cached;
    try {
        const data = await getEarthquakeData();
        writeSessionCache(data);
        return data;
    } catch {
        return [];
    }
}

function magClass(mag) {
    if (mag >= 6.0) return 'mag-severe';
    if (mag >= 5.0) return 'mag-high';
    if (mag >= 4.0) return 'mag-mid';
    return 'mag-low';
}

function timeStr(ms) {
    try {
        const d = new Date(ms);
        return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } catch { return ''; }
}

function buildCard(quake) {
    const mag = (quake.mag || 0).toFixed(1);
    const card = document.createElement('div');
    card.className = 'quake-card';
    card.innerHTML = `
        <span class="mag-badge ${magClass(quake.mag)}">M ${mag}</span>
        <span class="card-location">${quake.place || 'Bilinmeyen'}</span>
        <div class="card-stats">
            <span>${timeStr(quake.time)}</span>
            <span>${Math.max(0, quake.depth || 0)}km</span>
        </div>
    `;
    card.addEventListener('click', () => {
        sessionStorage.setItem('eq_focus', JSON.stringify({
            lat: quake.lat, lon: quake.lon, place: quake.place, mag: quake.mag
        }));
        window.location.href = '/index.html';
    });
    return card;
}

function renderList(quakes, listEl) {
    listEl.innerHTML = '';
    const sorted = [...quakes].sort((a, b) => b.time - a.time);
    sorted.slice(0, 60).forEach(q => listEl.appendChild(buildCard(q)));
}

function buildFilters(quakes, listEl, countrySelect, citySelect) {
    const countries = [...new Set(quakes.map(q => q.countryName).filter(Boolean))].sort();
    countries.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        countrySelect.appendChild(opt);
    });

    function applyFilter() {
        const country = countrySelect.value;
        const city = citySelect ? citySelect.value : '';
        let filtered = quakes;
        if (country) filtered = filtered.filter(q => q.countryName === country);
        if (city) filtered = filtered.filter(q => q.cityName === city);
        renderList(filtered, listEl);
    }

    countrySelect.addEventListener('change', () => {
        if (citySelect) {
            citySelect.innerHTML = '<option value="">Tüm şehirler</option>';
            if (countrySelect.value === 'Turkey') {
                const cities = [...new Set(quakes.filter(q => q.countryName === 'Turkey').map(q => q.cityName).filter(Boolean))].sort();
                cities.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c; opt.textContent = c;
                    citySelect.appendChild(opt);
                });
                citySelect.disabled = false;
            } else {
                citySelect.disabled = true;
            }
        }
        applyFilter();
    });

    if (citySelect) citySelect.addEventListener('change', applyFilter);
}

async function init() {
    const listEl = document.getElementById('earthquake-list');
    if (!listEl) return;

    // Only show spinner on first load (no sessionStorage cache)
    if (!readSessionCache()) {
        listEl.innerHTML = '<div class="loader-container"><span class="loader"></span></div>';
    }

    const quakes = await loadQuakes();

    if (!quakes.length) {
        listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary)">Veri alınamadı.</div>';
        return;
    }

    renderList(quakes, listEl);

    const countrySelect = document.getElementById('country-select');
    const citySelect = document.getElementById('city-select');
    if (countrySelect) buildFilters(quakes, listEl, countrySelect, citySelect);

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            clearSessionCache();
            refreshBtn.style.animation = 'rotation 1s linear infinite';
            listEl.innerHTML = '<div class="loader-container"><span class="loader"></span></div>';
            const fresh = await loadQuakes();
            renderList(fresh, listEl);
            if (countrySelect) buildFilters(fresh, listEl, countrySelect, citySelect);
            refreshBtn.style.animation = '';
        });
    }

    // Auto-refresh every 60 seconds (silent)
    setInterval(async () => {
        clearSessionCache();
        const fresh = await loadQuakes();
        if (!fresh.length) return;
        const countryEl = document.getElementById('country-select');
        if (!countryEl || !countryEl.value) {
            renderList(fresh, listEl);
        }
    }, 60000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
