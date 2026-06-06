import { initLanguage, toggleLanguage } from './language.js';
import { initTheme } from './theme.js';
import { initSidebarResize, initSidebarToggle } from './ui.js';

function initLayout() {
    initLanguage();

    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => toggleLanguage());
    }

    initTheme(null);
    initSidebarResize(null);
    initSidebarToggle(null);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
} else {
    initLayout();
}
