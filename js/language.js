export const translations = {
    tr: {
        title: "EarthquakeTrack",
        activeIssues: "Son Depremler",
        dashboard: "Panel",
        locations: "Konumlar",
        recentActivity: "Son Hareketler",
        live: "Canlı",
        loading: "Yükleniyor...",
        error: "Hata oluştu!",
        depth: "Derinlik",
        mag: "Büyüklük",
        source: "Kaynak",
        time: "Zaman"
    },
    en: {
        title: "EarthquakeTrack",
        activeIssues: "Recent Earthquakes",
        dashboard: "Dashboard",
        locations: "Locations",
        recentActivity: "Recent Activity",
        live: "Live",
        loading: "Loading...",
        error: "Error occurred!",
        depth: "Depth",
        mag: "Mag",
        source: "Source",
        time: "Time"
    }
};

let currentLang = 'tr'; // Default to Turkish
let onLanguageChangeCallback = null;

export function initLanguage(callback) {
    onLanguageChangeCallback = callback;
    updateStaticText();
}

export function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    updateStaticText();
    if (onLanguageChangeCallback) onLanguageChangeCallback();
    return currentLang;
}

export function t(key) {
    return translations[currentLang][key] || key;
}

export function getCurrentLang() {
    return currentLang;
}

function updateStaticText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });

    // Update toggle button text
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.innerText = currentLang === 'tr' ? 'EN' : 'TR';
    }
}
