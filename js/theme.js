// Theme Management
import { setMapTheme } from './map.js';

export function initTheme(mapInstance) {
    // Check localStorage or System Preference
    const savedTheme = localStorage.getItem('theme');
    const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemPref;

    applyTheme(theme, mapInstance);

    // Toggle Button Listener
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        // Set initial state
        toggleBtn.checked = (theme === 'dark');

        toggleBtn.addEventListener('change', () => {
            const newTheme = toggleBtn.checked ? 'dark' : 'light';
            applyTheme(newTheme, mapInstance);
        });
    }
}

function applyTheme(theme, mapInstance) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update Map
    if (mapInstance) {
        setMapTheme(mapInstance, theme);
    }
}
