import { initLanguage, toggleLanguage, getCurrentLang } from './language.js';
import { initTheme } from './theme.js';
import { initSidebarResize, initSidebarToggle } from './ui.js';

function syncContentLanguage() {
    const lang = getCurrentLang();
    const trEl = document.getElementById('content-tr');
    const enEl = document.getElementById('content-en');
    if (trEl) trEl.style.display = lang === 'tr' ? '' : 'none';
    if (enEl) enEl.style.display = lang === 'en' ? '' : 'none';
}

function initLayout() {
    initLanguage(syncContentLanguage);

    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => toggleLanguage());
    }

    initTheme(null);
    initSidebarResize(null);
    initSidebarToggle(null);

    // Re-sync content language on every ClientRouter page swap
    document.addEventListener('astro:page-load', syncContentLanguage);
    syncContentLanguage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
} else {
    initLayout();
}
