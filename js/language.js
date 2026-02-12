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
        time: "Zaman",
        sort_date_desc: "Tarih (Yeni > Eski)",
        sort_mag_desc: "Büyüklük (Büyük > Küçük)",
        last_24_hours: "Son 24 Saat",
        last_x_days: "Son {days} Gün",
        largest_earthquake: "En Büyük Deprem",
        error_data_access: "Veri erişim sorunu.",
        error_check_connection: "İnternet bağlantınızı kontrol edip tekrar deneyin.",
        about: "Hakkında",
        faq: "SSS",
        privacy: "Gizlilik Politikası",
        terms: "Kullanım Koşulları"
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
        time: "Time",
        sort_date_desc: "Date (New > Old)",
        sort_mag_desc: "Magnitude (High > Low)",
        last_24_hours: "Last 24 Hours",
        last_x_days: "Last {days} Days",
        largest_earthquake: "Largest Earthquake",
        error_data_access: "Data access issue.",
        error_check_connection: "Check your internet connection and try again.",
        data_label: "Data",
        about: "About Us",
        faq: "FAQ",
        privacy: "Privacy Policy",
        terms: "Terms of Use"
    },
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
        time: "Zaman",
        sort_date_desc: "Tarih (Yeni > Eski)",
        sort_mag_desc: "Büyüklük (Büyük > Küçük)",
        last_24_hours: "Son 24 Saat",
        last_x_days: "Son {days} Gün",
        largest_earthquake: "En Büyük Deprem",
        error_data_access: "Veri erişim sorunu.",
        error_check_connection: "İnternet bağlantınızı kontrol edip tekrar deneyin.",
        data_label: "Veri"
    }
};

let currentLang = 'tr'; // Default to Turkish
let onLanguageChangeCallback = null;

export function initLanguage(callback) {
    onLanguageChangeCallback = callback;

    // Load preference
    const savedLang = localStorage.getItem('language');
    if (savedLang && (savedLang === 'tr' || savedLang === 'en')) {
        currentLang = savedLang;
    } else {
        // Optional: Auto-detect browser language
        currentLang = 'tr';
    }

    updateStaticText();
}

export function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    localStorage.setItem('language', currentLang); // Save preference
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
