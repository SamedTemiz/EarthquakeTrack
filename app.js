import { getEarthquakeData, getCountryFromCoords } from './js/api.js';
import { initMap, updateMapMarkers } from './js/map.js';
import { updateSidebar, initSidebarResize, initSidebarToggle, initTabs, setEarthquakeData, toggleSidebarLoading, initSort, showSidebarError, renderDashboard, renderLocations, initLocationSelector, resetLocationFiltersAndMap } from './js/ui.js';
import { initLanguage, toggleLanguage } from './js/language.js';
import { initTheme } from './js/theme.js';
import { initModal } from './js/modal.js';

let globalEarthquakes = [];
let globalMap = null;

async function initApp() {
    try {
        // Initialize Language
        initLanguage(() => {
            initModal();
            // Re-render on language change
            if (globalEarthquakes.length > 0 && globalMap) {
                updateSidebar(globalEarthquakes, globalMap);
                renderDashboard(globalEarthquakes, globalMap);
                renderLocations(globalEarthquakes, globalMap);
                updateMapMarkers(globalMap, globalEarthquakes);
                initLocationSelector(globalEarthquakes, globalMap);
            }
        });

        document.getElementById('lang-toggle').addEventListener('click', () => {
            toggleLanguage();
        });

        // 1. Initialize Map
        const map = initMap();

        globalMap = map;

        // Country selector sync from geolocation (listener before any await — avoids missing fast location events)
        const setCountryFromCoords = async (lat, lng) => {
            const countryKey = await getCountryFromCoords(lat, lng);
            if (!countryKey) return;
            const countrySelect = document.getElementById('country-select');
            if (!countrySelect) return;
            const hasOption = Array.from(countrySelect.options).some(o => o.value === countryKey);
            if (!hasOption) return;
            countrySelect.value = countryKey;
            countrySelect.dispatchEvent(new Event('change'));
        };

        window.addEventListener('userLocationFound', (e) => {
            const { lat, lng } = e.detail || {};
            if (typeof lat === 'number' && typeof lng === 'number') setCountryFromCoords(lat, lng);
        });

        // Initialize Modal
        initModal();

        // Initialize Theme
        initTheme(map, () => {
            // Re-draw markers when theme changes
            if (globalEarthquakes.length > 0) {
                updateMapMarkers(map, globalEarthquakes);
            }
        });

        // 2. Initialize UI Interactions
        initSidebarResize(map);
        initSidebarToggle(map);
        initSort(null, map); // Init sort listeners

        // Refresh Data Function
        const refreshData = async (silent = false) => {
            const btn = document.getElementById('refresh-btn');

            // UI Feedback
            if (!silent) {
                if (btn) btn.style.animation = 'rotation 1s linear infinite';
                toggleSidebarLoading(true);
            }

            try {
                const earthquakes = await getEarthquakeData();
                globalEarthquakes = earthquakes;

                // Update UI Store
                setEarthquakeData(earthquakes);

                updateMapMarkers(map, earthquakes);
                updateSidebar(earthquakes, map);
                initLocationSelector(earthquakes, map);

                // Re-init tabs to ensure they have fresh data reference
                // Note: Repeatedly calling initTabs might stack listeners if not handled carefully, 
                // but for v1 implementation where tabs just switch views, it's acceptable.
                // A better approach would be to have a `updateTabsData` function.
                // For now, updateSidebar handles the main list, which is the dynamic part.
                // The 'Dashboard' and 'Locations' tabs might need a specific update function if they don't re-render on click.
                // But let's stick to the core requirement: Sidebar List Auto-Refresh.

            } catch (err) {
                console.error("Refresh failed", err);
                if (!silent) {
                    showSidebarError("Veri erişim sorunu.");
                }
            } finally {
                if (btn) btn.style.animation = '';
                if (!silent) toggleSidebarLoading(false);
            }
        };

        // 3. Initial Fetch
        await refreshData();

        // 4. Init Tabs (Initial)
        initTabs(globalEarthquakes, map);

        // On load: if we have saved location, set country selector from it (after options exist — same for mobile and web)
        try {
            const saved = localStorage.getItem('userLocation');
            if (saved) {
                const { lat, lng } = JSON.parse(saved);
                if (typeof lat === 'number' && typeof lng === 'number') setCountryFromCoords(lat, lng);
            }
        } catch (_) {}

        // 5. Auto-Refresh (Every 60 Seconds)
        setInterval(() => {
            refreshData(true); // Silent refresh
        }, 60000);

        // Manual Refresh: 15s cooldown to avoid excessive API calls
        const REFRESH_COOLDOWN_MS = 15000;
        let lastManualRefreshAt = 0;
        let refreshCooldownIntervalId = null;

        const manualRefresh = () => {
            const now = Date.now();
            if (now - lastManualRefreshAt < REFRESH_COOLDOWN_MS) return;
            lastManualRefreshAt = now;

            const btn = document.getElementById('refresh-btn');
            if (btn) {
                btn.disabled = true;
                let remaining = Math.ceil(REFRESH_COOLDOWN_MS / 1000);
                const updateTitle = () => {
                    if (remaining > 0) {
                        btn.title = `Yenile (${remaining} s)`;
                        remaining--;
                    } else {
                        clearInterval(refreshCooldownIntervalId);
                        refreshCooldownIntervalId = null;
                        btn.disabled = false;
                        btn.title = 'Yenile';
                    }
                };
                updateTitle();
                refreshCooldownIntervalId = setInterval(updateTitle, 1000);
            }
            // Manual refresh: clear country/city filters and reset map focus, then fetch fresh data.
            resetLocationFiltersAndMap(map);
            refreshData(false);
        };
        document.getElementById('refresh-btn')?.addEventListener('click', manualRefresh);

    } catch (error) {
        console.error("Critical Error initializing app:", error);
    }
}

// Start app
initApp();
