import { initLanguage, toggleLanguage } from './language.js';
import { initTheme } from './theme.js';
import { initSidebarResize, initSidebarToggle } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Language
    initLanguage();

    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            toggleLanguage();
        });
    }

    // Initialize Theme
    initTheme(null);

    // Initialize Sidebar Toggle & Resize for mobile
    initSidebarResize(null);
    initSidebarToggle(null);
});
