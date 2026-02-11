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

let currentSort = 'date'; // 'date' or 'mag'

export function initSort(earthquakes, mapInstance) {
    const sortBtn = document.getElementById('sort-btn');
    const sortMenu = document.getElementById('sort-menu');
    const sortOptions = document.querySelectorAll('.sort-option');

    if (sortBtn && sortMenu) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortMenu.style.display = sortMenu.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            sortMenu.style.display = 'none';
        });

        sortOptions.forEach(option => {
            option.addEventListener('click', () => {
                currentSort = option.dataset.sort;

                // Update UI active state
                sortOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');

                // Re-render list
                updateSidebar(currentQuakes, mapInstance); // Uses internal store
            });
        });
    }
}

export function showSidebarError(message) {
    const listContainer = document.getElementById('earthquake-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="error-state" style="padding: 20px; text-align: center; color: var(--text-secondary);">
            <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
            <p>${message || t('error_data_access')}</p>
            <p style="font-size: 12px; margin-top: 5px;">${t('error_check_connection')}</p>
        </div>
    `;
}

export function updateSidebar(earthquakes, mapInstance) {
    const listContainer = document.getElementById('earthquake-list');
    listContainer.innerHTML = ''; // Clear existing

    // Save data reference if coming from external call (e.g. refresh)
    if (earthquakes) {
        setEarthquakeData(earthquakes);
    } else {
        earthquakes = currentQuakes; // Use internal if no arg passed (e.g. from sort click)
    }

    // Sort Data
    const sortedQuakes = [...earthquakes]; // Clone to avoid mutating original order if needed elsewhere

    if (currentSort === 'mag') {
        sortedQuakes.sort((a, b) => b.mag - a.mag); // Magnitude Desc
    } else {
        sortedQuakes.sort((a, b) => b.time - a.time); // Date Desc (Default)
    }

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

            // Auto-close sidebar on mobile
            if (window.innerWidth <= 768) {
                const toggleIcon = document.getElementById('mobile-toggle-icon');
                if (toggleIcon) toggleIcon.click();
            }
        });

        listContainer.appendChild(card);
    });
}

export function initSidebarResize(mapInstance) {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content'); // Need this to adjust map height
    const resizer = document.getElementById('sidebar-resizer');

    if (!resizer) return;

    let isResizing = false;
    let startY = 0;
    let isExpanded = true; // Default state (75% list)

    const toggleSidebar = () => {
        if (window.innerWidth > 768) return; // Only for mobile

        if (isExpanded) {
            // Minimize: only logo-area + handle visible, fixed at viewport bottom (safe-area aware)
            sidebar.classList.add('minimized');
            const logoArea = document.querySelector('.logo-area');
            const logoHeight = logoArea ? logoArea.getBoundingClientRect().height : 0;
            const resizerHeight = resizer.offsetHeight;
            const sidebarStyles = window.getComputedStyle(sidebar);
            const paddingBottom = parseFloat(sidebarStyles.paddingBottom) || 0;
            const paddingTop = parseFloat(sidebarStyles.paddingTop) || 0;
            const totalHeight = paddingTop + logoHeight + resizerHeight + paddingBottom;

            sidebar.style.position = 'fixed';
            sidebar.style.bottom = '0';
            sidebar.style.left = '0';
            sidebar.style.right = '0';
            sidebar.style.width = '100%';
            sidebar.style.height = `${totalHeight}px`;
            sidebar.style.flex = 'none';
            sidebar.style.overflow = 'hidden';
            sidebar.classList.add('minimized');

            mainContent.style.height = 'auto';
            mainContent.style.flex = '1';
            mainContent.style.paddingBottom = `${totalHeight}px`;
        } else {
            // Maximize (default open)
            sidebar.style.position = '';
            sidebar.style.bottom = '';
            sidebar.style.left = '';
            sidebar.style.right = '';
            sidebar.style.width = '';
            sidebar.style.height = '75vh';
            sidebar.style.flex = 'none';
            sidebar.style.overflow = '';
            sidebar.classList.remove('minimized');

            mainContent.style.height = '25vh';
            mainContent.style.flex = 'none';
            mainContent.style.paddingBottom = '';
        }
        isExpanded = !isExpanded;
        setTimeout(() => mapInstance.invalidateSize(), 300); // Wait for transition
    };

    // Mouse Events (Desktop)
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        resizer.classList.add('resizing');
        document.body.style.userSelect = 'none';

        if (window.innerWidth <= 768) {
            document.body.style.cursor = 'row-resize';
        } else {
            document.body.style.cursor = 'col-resize';
        }
    });

    // Touch Events (Mobile)
    resizer.addEventListener('touchstart', (e) => {
        isResizing = true;
        startY = e.touches[0].clientY;
        resizer.classList.add('resizing');
        document.body.style.userSelect = 'none';
        e.preventDefault(); // Prevent scrolling while resizing
    }, { passive: false });


    const handleMove = (clientX, clientY) => {
        if (!isResizing) return;

        if (window.innerWidth <= 768) {
            // Mobile: Vertical Resize
            // Calculate new height for map (top part) based on Y position
            const totalHeight = window.innerHeight;
            let newMapHeight = clientY;

            // Constraints
            const minMapHeight = 100; // Min map height
            const maxMapHeight = totalHeight - 100; // Min list height

            if (newMapHeight < minMapHeight) newMapHeight = minMapHeight;
            if (newMapHeight > maxMapHeight) newMapHeight = maxMapHeight;

            const newListHeight = totalHeight - newMapHeight;

            mainContent.style.height = `${newMapHeight}px`;
            sidebar.style.height = `${newListHeight}px`;

            // Should we update isExpanded state?
            // If dragging manually, we might leave it in explicit state.
            // Let's assume if > 50% list, it is expanded.
            isExpanded = (newListHeight / totalHeight) > 0.4;

        } else {
            // Desktop: Horizontal Resize
            let newWidth = clientX;
            const minWidth = 350;
            const maxWidth = window.innerWidth * 0.5;

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            sidebar.style.width = `${newWidth}px`;
        }

        mapInstance.invalidateSize();
    };

    const handleEnd = (e) => {
        if (isResizing) {
            // Check for Click (Minimal movement)
            const clientY = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
            if (Math.abs(clientY - startY) < 5 && window.innerWidth <= 768) {
                toggleSidebar();
            }

            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            mapInstance.invalidateSize();
        }
    };

    // Mouse Move/Up
    document.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', handleEnd);

    // Touch Move/End
    document.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    }, { passive: false });
    document.addEventListener('touchend', handleEnd);

    // Mobile Toggle Icon Click
    const mobileToggleIcon = document.getElementById('mobile-toggle-icon');
    if (mobileToggleIcon) {
        mobileToggleIcon.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    }
}

export function initSidebarToggle(mapInstance) {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');

    // Auto-Collapse Logic for Tablet (768px - 1200px)
    const checkResponsiveSidebar = () => {
        if (window.innerWidth >= 769 && window.innerWidth <= 1200) {
            sidebar.classList.add('rail-mode');
        } else {
            // Optional: Should we auto-expand on larger screens? 
            // Better to leave user preference or default state.
            // But if moving from tablet to desktop, maybe expand?
            // For now, let's just default rail on tablet load/resize match.
            if (window.innerWidth > 1200) sidebar.classList.remove('rail-mode');
        }
        setTimeout(() => mapInstance.invalidateSize(), 300);
    };

    // Initial check
    checkResponsiveSidebar();

    // Listener for resize (debounced slightly or just direct)
    window.addEventListener('resize', () => {
        // Only trigger if crossing breakpoints effectively
        // For simplicity, just check.
        // checkResponsiveSidebar(); // Disable auto-re-collapse on every resize to avoid annoying user
    });

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
            if (viewId === 'view-dashboard') renderDashboard(currentQuakes, mapInstance);
            if (viewId === 'view-locations') renderLocations(currentQuakes, mapInstance);
            if (viewId === 'view-active-issues') updateSidebar(currentQuakes, mapInstance); // Refresh list
        });
    });
}

export function renderDashboard(earthquakes, mapInstance) {
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    container.innerHTML = '';

    const total = earthquakes.length;

    // Date Range Calculation
    if (total > 0) {
        const times = earthquakes.map(q => q.time);
        const minTime = Math.min(...times);

        const now = Date.now();
        const diffHours = (now - minTime) / (1000 * 60 * 60);

        // ...
        let rangeText = "";
        if (diffHours <= 24) {
            rangeText = t('last_24_hours');
        } else {
            const days = Math.ceil(diffHours / 24);
            rangeText = t('last_x_days').replace('{days}', days);
        }

        const rangeDiv = document.createElement('div');
        rangeDiv.style.fontSize = '12px';
        rangeDiv.style.color = 'var(--text-tertiary)';
        rangeDiv.style.marginBottom = '10px';
        rangeDiv.innerHTML = `📅 ${t('data_label')}: <span style="color:var(--text-secondary); font-weight:500;">${rangeText}</span>`;
        container.appendChild(rangeDiv);
    }

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
        maxCard.style.cursor = 'pointer'; // Make it look clickable
        maxCard.title = 'Haritada Göster'; // Tooltip
        maxCard.innerHTML = `
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:5px;">${t('largest_earthquake')}</div>
            <div class="text-truncate" style="color:var(--text-primary); font-weight:500;">${maxQuake.place}</div>
            <div style="margin-top:5px; font-size:12px; color:var(--text-tertiary);">${new Date(maxQuake.time).toLocaleDateString()} ${new Date(maxQuake.time).toLocaleTimeString()}</div>
        `;

        // Add Click Interaction
        maxCard.addEventListener('click', () => {
            if (mapInstance) {
                mapInstance.flyTo([maxQuake.lat, maxQuake.lon], 10, {
                    animate: true,
                    duration: 1.5
                });
            }
        });

        container.appendChild(maxCard);
    }
}

export function renderLocations(earthquakes, mapInstance) {
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
            <span class="text-truncate" style="font-weight:500; color:var(--text-primary); flex:1; margin-right:10px;">${region}</span>
            <span class="badge">${data.count}</span>
        `;

        item.addEventListener('click', () => {
            mapInstance.flyTo([data.lat, data.lon], 9, { animate: true });
        });

        container.appendChild(item);
    });
}


