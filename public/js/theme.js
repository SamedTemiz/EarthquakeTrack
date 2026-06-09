// Theme Management
import { setMapTheme } from './map.js';

export function initTheme(mapInstance, onThemeChange) {
    // Check localStorage or System Preference
    const savedTheme = localStorage.getItem('theme');
    const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemPref;

    applyTheme(theme, mapInstance, onThemeChange);

    // Checkbox toggle (map/index.html)
    const toggleCheckbox = document.getElementById('theme-toggle');
    if (toggleCheckbox && toggleCheckbox.type === 'checkbox') {
        toggleCheckbox.checked = (theme === 'dark');
        toggleCheckbox.addEventListener('change', () => {
            applyTheme(toggleCheckbox.checked ? 'dark' : 'light', mapInstance, onThemeChange);
        });
    }

    // Icon button toggle (Astro content pages)
    const toggleIconBtn = document.getElementById('theme-toggle-btn');
    if (toggleIconBtn) {
        toggleIconBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            applyTheme(current === 'dark' ? 'light' : 'dark', mapInstance, onThemeChange);
        });
    }
}

function applyTheme(theme, mapInstance, onThemeChange) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update Map
    if (mapInstance) {
        setMapTheme(mapInstance, theme);
    }

    // Trigger callback if provided
    if (onThemeChange && typeof onThemeChange === 'function') {
        onThemeChange(theme);
    }
}
