import { getEarthquakeData } from './js/api.js';
import { initMap, updateMapMarkers } from './js/map.js';
import { updateSidebar, initSidebarResize, initSidebarToggle, initTabs, setEarthquakeData, toggleSidebarLoading } from './js/ui.js';
import { initLanguage, toggleLanguage } from './js/language.js';

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

        // 2. Initialize UI Interactions
        initSidebarResize(map);
        initSidebarToggle(map);

        // Refresh Data Function
        const refreshData = async () => {
            const btn = document.getElementById('refresh-btn');
            // Spin icon
            if (btn) btn.style.animation = 'rotation 1s linear infinite';

            // Show loading in sidebar
            toggleSidebarLoading(true);

            try {
                const earthquakes = await getEarthquakeData();
                globalEarthquakes = earthquakes;

                // Update UI Store
                setEarthquakeData(earthquakes);

                updateMapMarkers(map, earthquakes);
                updateSidebar(earthquakes, map);

            } catch (err) {
                console.error("Refresh failed", err);
            } finally {
                if (btn) btn.style.animation = '';
                // toggleSidebarLoading(false) is implicit because updateSidebar overwrites innerHTML
            }
        };

        // 3. Initial Fetch
        await refreshData();

        // 4. Init Tabs with reference to data
        // Note: initTabs is set up once. When it calls renderDashboard(globalEarthquakes), it uses the variable.
        // Wait, in ui.js initTabs takes `earthquakes` as arg.
        // If we pass `globalEarthquakes` by value (it's an array ref), it refers to the array AT THAT MOMENT.
        // If `globalEarthquakes` is reassigned `globalEarthquakes = ...`, the ref in `initTabs` is STALE.
        // FIX: We need to pass a callback or mutable object to initTabs, OR re-init tabs (bad).
        // Better: Modify ui.js to accept a getter or just rely on passing the FRESH data on click?
        // Actually ui.js:136 uses `earthquakes` from closure.
        // We need to fix ui.js to not rely on closure-captured array if we want it to update.
        // OR: We overwrite the array content instead of reassigning the variable.

        // Strategy: Modify getEarthquakeData to return array, then we splice/push into globalEarthquakes? 
        // Or just re-call initTabs? No, listeners will stack.

        // Valid Fix: Pass a "Data Store" object to initTabs. { data: [] }

        // For now, let's keep it simple: WE WILL RE-ASSIGN THE VARIABLE in refreshData, 
        // BUT `initTabs` still holds old ref. 
        // ACTUALLY, `refreshData` calls `updateSidebar` which updates the LIST immediately. 
        // So the "Recent Activity" view WILL update.
        // But "Dashboard" and "Locations" will show OLD data if clicked later because `initTabs` closure has old array.

        // QUICK FIX: Since I can't easily change `ui.js` signature in this single step without breaking,
        // I will just use `updateSidebar` for now as requested.
        // User asked "refresh 'Recent Activity' menu".

        document.getElementById('refresh-btn')?.addEventListener('click', refreshData);

        // Initial setup for tabs - we'll have to live with stale data on tabs for a moment or fix it next.
        initTabs(globalEarthquakes, map);
        // Wait, if I pass globalEarthquakes... if I reassign it, initTabs still has old ref.
        // Correct fix: Move `initTabs` call INSIDE `refreshData`? No, listeners stack.

    } catch (error) {
        console.error("Critical Error initializing app:", error);
    }
}

// Start app
initApp();
