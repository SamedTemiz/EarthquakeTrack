import { t } from './language.js';

let currentQuakes = []; // Store data internally to avoid stale closures

export function setEarthquakeData(data) {
    currentQuakes = data;
}

export function toggleSidebarLoading(show) {
    const list = document.getElementById('earthquake-list');
    if (!list) return;

    if (show) {
        list.innerHTML = '<div class="loader-container"><span class="loader"></span></div>';
    } else {
        // Clearing is done by render functions usually, but we can leave it empty
        // or let the next render call handle it.
    }
}

export function updateSidebar(earthquakes, mapInstance) {
    const listContainer = document.getElementById('earthquake-list');
    listContainer.innerHTML = ''; // Clear existing

    // Sort by recent time
    const sortedQuakes = earthquakes.sort((a, b) => b.time - a.time); // Newest first

    sortedQuakes.forEach(quake => {
        const mag = quake.mag.toFixed(1);
        const date = new Date(quake.time);
        const timeStr = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        let magClass = 'mag-low';
        if (quake.mag >= 6.0) magClass = 'mag-severe';
        else if (quake.mag >= 5.0) magClass = 'mag-high';
        else if (quake.mag >= 4.0) magClass = 'mag-mid';

        const card = document.createElement('div');
        card.className = 'quake-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="source-badge">${quake.source}</span>
                <span class="mag-badge ${magClass}">M ${mag}</span>
            </div>
            <div class="card-location">📍 ${quake.place}</div>
            <div class="card-stats">
                <span>🕒 ${timeStr}</span>
                <span>${quake.depth}km</span>
            </div>
        `;

        card.addEventListener('click', () => {
            mapInstance.flyTo([quake.lat, quake.lon], 10, {
                animate: true,
                duration: 1.5
            });
        });

        listContainer.appendChild(card);
    });
}

export function initSidebarResize(mapInstance) {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebar-resizer');

    if (!resizer) return;

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        // Calculate new width
        // Only consider the horizontal component
        let newWidth = e.clientX;

        // Let CSS min-width and max-width handle constraints visually? 
        // JS often needs to enforce to update inline style correctly.
        // CSS Constraints: 350px min, 50vw max.

        const minWidth = 350;
        const maxWidth = window.innerWidth * 0.5;

        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        sidebar.style.width = `${newWidth}px`;

        // Update map immediately for smooth feel (can be throttled if laggy)
        mapInstance.invalidateSize();
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            mapInstance.invalidateSize(); // Final update
        }
    });
}

export function initSidebarToggle(mapInstance) {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('rail-mode');
            setTimeout(() => {
                mapInstance.invalidateSize();
            }, 300);
        });
    }
}


// Tab Switching Logic
export function initTabs(earthquakes, mapInstance) {
    const navItems = document.querySelectorAll('.main-nav li');
    const views = {
        0: 'view-active-issues',
        1: 'view-dashboard',
        2: 'view-locations'
    };

    navItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Hide all views
            Object.values(views).forEach(id => {
                document.getElementById(id).style.display = 'none';
            });

            // Show selected view
            const viewId = views[index];
            const viewEl = document.getElementById(viewId);
            if (viewEl) viewEl.style.display = 'flex';

            // Trigger Specific Renders
            if (viewId === 'view-dashboard') renderDashboard(currentQuakes);
            if (viewId === 'view-locations') renderLocations(currentQuakes, mapInstance);
            if (viewId === 'view-active-issues') updateSidebar(currentQuakes, mapInstance); // Refresh list
        });
    });
}

function renderDashboard(earthquakes) {
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    container.innerHTML = '';

    const total = earthquakes.length;

    // Find Max Mag
    const maxQuake = earthquakes.reduce((prev, current) => (prev.mag > current.mag) ? prev : current, earthquakes[0]);

    // Average Mag
    const avgMag = (earthquakes.reduce((sum, q) => sum + q.mag, 0) / total).toFixed(1);

    // Simple Stats Cards
    const stats = [
        { label: t('activeIssues'), value: total, color: 'var(--accent-gold)' },
        { label: 'Max ' + t('mag'), value: maxQuake ? maxQuake.mag.toFixed(1) : '0', color: 'var(--accent-red)' },
        { label: 'Avg ' + t('mag'), value: avgMag, color: 'var(--accent-purple)' }
    ];

    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'quake-card';
        card.style.cursor = 'default';
        card.innerHTML = `
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:5px;">${stat.label}</div>
            <div style="font-size:24px; font-weight:700; color:${stat.color};">${stat.value}</div>
        `;
        container.appendChild(card);
    });

    if (maxQuake) {
        const maxCard = document.createElement('div');
        maxCard.className = 'quake-card';
        maxCard.innerHTML = `
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:5px;">En Büyük Deprem</div>
            <div style="color:#fff; font-weight:500;">${maxQuake.place}</div>
            <div style="margin-top:5px; font-size:12px; color:#777;">${new Date(maxQuake.time).toLocaleDateString()} ${new Date(maxQuake.time).toLocaleTimeString()}</div>
        `;
        container.appendChild(maxCard);
    }
}

function renderLocations(earthquakes, mapInstance) {
    const container = document.getElementById('locations-list');
    if (!container) return;
    container.innerHTML = '';

    // Group by Place
    const placeCounts = {};
    earthquakes.forEach(q => {
        // Extract city/region (Simple heuristic: text after " of " or last word)
        let region = q.place;
        if (region.includes(' of ')) {
            region = region.split(' of ')[1];
        } else if (region.includes(' at ')) {
            region = region.split(' at ')[1];
        }

        // Clean up
        region = region.trim();

        if (!placeCounts[region]) {
            placeCounts[region] = { count: 0, lat: q.lat, lon: q.lon }; // Keep one coordinate for jumping
        }
        placeCounts[region].count++;
    });

    // Sort by count
    const sortedPlaces = Object.entries(placeCounts).sort((a, b) => b[1].count - a[1].count);

    sortedPlaces.forEach(([region, data]) => {
        const item = document.createElement('div');
        item.className = 'quake-card';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '12px';

        item.innerHTML = `
            <span style="font-weight:500; color:#eee;">${region}</span>
            <span class="badge">${data.count}</span>
        `;

        item.addEventListener('click', () => {
            mapInstance.flyTo([data.lat, data.lon], 9, { animate: true });
        });

        container.appendChild(item);
    });
}


