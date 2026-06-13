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
        data_label: "Veri",
        about: "Hakkında",
        faq: "SSS",
        contact: "İletişim",
        privacy: "Gizlilik Politikası",
        terms: "Kullanım Koşulları",
        preparedness: "Deprem Önlemleri",
        education: "Deprem Bilgisi",
        country: "Ülke",
        city: "Şehir",
        allCountries: "Tüm ülkeler",
        allCities: "Tüm şehirler",
        myLocation: "Konumum",
        location_error_denied: "Konum izni verilmedi. Tarayıcı veya site ayarlarından konum erişimine izin verebilirsiniz.",
        location_error_unavailable: "Konum şu an alınamıyor. Bağlantı veya cihaz ayarlarınızı kontrol edin.",
        location_error_timeout: "Konum isteği zaman aşımına uğradı. Lütfen tekrar deneyin.",
        navMap: "Deprem Haritası",
        navBlog: "Blog & Haberler",
        navInfoSection: "BİLGİ MERKEZİ",
        blogTitle: "Deprem Blogu & Haberler",
        blogLead: "Sismoloji, deprem hazırlıkları, fay hattı analizleri ve güvende kalmanız için ihtiyaç duyduğunuz tüm güncel ve detaylı makaleler.",
        blogTabArticles: "Makaleler",
        blogTabNews: "Son Dakika Haberleri",
        newsLoading: "Güncel deprem haberleri yükleniyor...",
        ok: "Tamam"
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
        contact: "Contact",
        privacy: "Privacy Policy",
        terms: "Terms of Use",
        preparedness: "Preparedness",
        education: "Earthquake Info",
        country: "Country",
        city: "City",
        allCountries: "All countries",
        allCities: "All cities",
        myLocation: "My location",
        location_error_denied: "Location permission denied. You can enable location access in your browser or site settings.",
        location_error_unavailable: "Location is currently unavailable. Check your connection or device settings.",
        location_error_timeout: "Location request timed out. Please try again.",
        navMap: "Earthquake Map",
        navBlog: "Blog & News",
        navInfoSection: "INFO CENTER",
        blogTitle: "Earthquake Blog & News",
        blogLead: "Seismology, earthquake preparedness, fault line analyses, and all the in-depth articles you need to stay safe.",
        blogTabArticles: "Articles",
        blogTabNews: "Breaking News",
        newsLoading: "Loading latest earthquake news...",
        ok: "OK"
    }
};

let currentLang = 'tr'; // Default to Turkish
const languageChangeCallbacks = [];

export function initLanguage(callback) {
    if (typeof callback === 'function') languageChangeCallbacks.push(callback);

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
    languageChangeCallbacks.forEach(fn => { try { fn(); } catch (_) {} });
    return currentLang;
}

export function t(key) {
    return translations[currentLang][key] || key;
}

export function localizeLocation(place) {
    if (currentLang === 'en' || !place) return place;

    let localized = place;
    // Common geographical terms mapping (EN -> TR)
    const terms = {
        'Near the coast of': 'Açıkları',
        'Coast of': 'Açıkları',
        'Near': 'Yakınları',
        'Western': 'Batı',
        'Eastern': 'Doğu',
        'Northern': 'Kuzey',
        'Southern': 'Güney',
        'Central': 'Merkez',
        'Region': 'Bölgesi',
        'Sea': 'Denizi',
        'Turkey': 'Türkiye',
        'Greece': 'Yunanistan',
        'Italy': 'İtalya',
        'France': 'Fransa',
        'Spain': 'İspanya',
        'Border': 'Sınırı',
        'and': 've',
        'the': '',
        'of': ''
    };

    // Apply translations
    Object.keys(terms).forEach(en => {
        // Use word boundary to avoid partial replacements
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        localized = localized.replace(regex, terms[en]);
    });

    // Clean up extra spaces
    return localized.replace(/\s+/g, ' ').trim().toUpperCase();
}

export function getCurrentLang() {
    return currentLang;
}

/** Canonical English country name -> Turkish label for location selector. */
const countryNamesTr = {
    Turkey: 'Türkiye',
    Greece: 'Yunanistan',
    Italy: 'İtalya',
    France: 'Fransa',
    Spain: 'İspanya',
    Germany: 'Almanya',
    Russia: 'Rusya',
    'United Kingdom': 'Birleşik Krallık',
    'United States': 'Amerika Birleşik Devletleri',
    Iran: 'İran',
    Syria: 'Suriye',
    Iraq: 'Irak',
    Armenia: 'Ermenistan',
    Georgia: 'Gürcistan',
    Azerbaijan: 'Azerbaycan',
    Albania: 'Arnavutluk',
    Romania: 'Romanya',
    Bulgaria: 'Bulgaristan',
    Switzerland: 'İsviçre',
    Austria: 'Avusturya',
    Morocco: 'Fas',
    Poland: 'Polonya',
    Portugal: 'Portekiz',
    Other: 'Diğer'
};

/**
 * Returns display name for country based on language. TR uses countryNamesTr, else canonical key.
 */
export function getCountryDisplayName(canonicalKey, lang) {
    if (!canonicalKey) return '';
    if (lang === 'tr' && countryNamesTr[canonicalKey]) return countryNamesTr[canonicalKey];
    return canonicalKey;
}

function updateStaticText() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
        const key = el.getAttribute('data-i18n-tooltip');
        if (translations[currentLang][key]) {
            el.setAttribute('data-tooltip', translations[currentLang][key]);
        }
    });

    // Update toggle button text
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.innerText = currentLang === 'tr' ? 'EN' : 'TR';
    }

    // Keep location selector placeholders synced with current language.
    const countrySelect = document.getElementById('country-select');
    if (countrySelect && countrySelect.options.length > 0) {
        countrySelect.options[0].textContent = t('allCountries');
    }
    const citySelect = document.getElementById('city-select');
    if (citySelect && citySelect.options.length > 0) {
        citySelect.options[0].textContent = t('allCities');
    }
}
