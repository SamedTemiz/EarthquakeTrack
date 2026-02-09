import { getEarthquakeData } from './js/api.js';
import { initMap, updateMapMarkers } from './js/map.js';
import { updateSidebar, initSidebarResize, initSidebarToggle, initTabs, setEarthquakeData, toggleSidebarLoading, initSort, showSidebarError } from './js/ui.js';
import { initLanguage, toggleLanguage } from './js/language.js';
import { initTheme } from './js/theme.js';

let globalEarthquakes = [];
let globalMap = null;

async function initApp() {
    try {
        // Initialize Language
        initLanguage(() => {
            // Re-render on language change
            if (globalEarthquakes.length > 0 && globalMap) {
                updateSidebar(globalEarthquakes, globalMap);
                // Ideally update map popups too, but that requires re-creating markers or updating their content.
                // For V1, we focused on Sidebar.
                updateMapMarkers(globalMap, globalEarthquakes);
            }
        });

        document.getElementById('lang-toggle').addEventListener('click', () => {
            toggleLanguage();
        });

        // 1. Initialize Map
        const map = initMap();
        globalMap = map;

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

        // 5. Auto-Refresh (Every 60 Seconds)
        setInterval(() => {
            refreshData(true); // Silent refresh
        }, 60000);

        // Manual Refresh Listener
        const manualRefresh = () => refreshData(false);
        document.getElementById('refresh-btn')?.addEventListener('click', manualRefresh);

    } catch (error) {
        console.error("Critical Error initializing app:", error);
    }
}

// Start app
initApp();
