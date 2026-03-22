import { t, localizeLocation, getCountryDisplayName, getCurrentLang } from './language.js';

let currentQuakes = []; // Store data internally to avoid stale closures
let currentCountryFilter = '';
let currentCityFilter = '';

function getFilteredQuakes(quakes) {
    if (!currentCountryFilter) return quakes;
    const byCountry = quakes.filter(q => (q.countryName || '').trim() === currentCountryFilter);
    if (currentCountryFilter === 'Turkey' && currentCityFilter) {
        return byCountry.filter(q => (q.cityName || '').trim() === currentCityFilter);
    }
    return byCountry;
}

function buildLocationOptions(quakes) {
    const byCountry = {};
    (quakes || []).forEach((q) => {
        const country = (q.countryName || '').trim() || 'Other';
        if (!byCountry[country]) byCountry[country] = [];
        byCountry[country].push(q);
    });
    const countries = Object.keys(byCountry).sort().map((name) => {
        const group = byCountry[name];
        return {
            value: name,
            label: getCountryDisplayName(name, getCurrentLang()),
            lat: group.reduce((sum, q) => sum + q.lat, 0) / group.length,
            lon: group.reduce((sum, q) => sum + q.lon, 0) / group.length
        };
    });

    const turkeyQuakes = byCountry.Turkey || [];
    const byCity = {};
    turkeyQuakes.forEach((q) => {
        const city = (q.cityName || '').trim();
        if (!city) return;
        if (!byCity[city]) byCity[city] = [];
        byCity[city].push(q);
    });
    const cities = Object.keys(byCity).sort().map((name) => {
        const group = byCity[name];
        return {
            value: name,
            label: name,
            lat: group.reduce((sum, q) => sum + q.lat, 0) / group.length,
            lon: group.reduce((sum, q) => sum + q.lon, 0) / group.length
        };
    });
    return { countries, cities };
}

function focusMapToSelection(countryValue, cityValue, options, mapInstance) {
    if (!mapInstance) return;
    if (countryValue === 'Turkey' && cityValue) {
        const city = options.cities.find((c) => c.value === cityValue);
        if (city) {
            mapInstance.flyTo([city.lat, city.lon], 8, { animate: true, duration: 1.2 });
            return;
        }
    }
    if (countryValue) {
        const country = options.countries.find((c) => c.value === countryValue);
        if (country) {
            mapInstance.flyTo([country.lat, country.lon], 6, { animate: true, duration: 1.2 });
        }
    }
}

export function initLocationSelector(earthquakes, mapInstance) {
    const countrySelect = document.getElementById('country-select');
    const citySelect = document.getElementById('city-select');
    if (!countrySelect || !citySelect) return;

    const options = buildLocationOptions(earthquakes || currentQuakes);
    const selectedCountry = countrySelect.value;
    const selectedCity = citySelect.value;

    countrySelect.innerHTML = `<option value="">${t('allCountries')}</option>`;
    options.countries.forEach((country) => {
        const opt = document.createElement('option');
        opt.value = country.value;
        opt.textContent = country.label;
        countrySelect.appendChild(opt);
    });
    countrySelect.value = options.countries.some((c) => c.value === selectedCountry) ? selectedCountry : '';
    currentCountryFilter = countrySelect.value;

    const refreshCities = () => {
        citySelect.innerHTML = `<option value="">${t('allCities')}</option>`;
        if (countrySelect.value !== 'Turkey') {
            citySelect.disabled = true;
            currentCityFilter = '';
            return;
        }
        citySelect.disabled = false;
        options.cities.forEach((city) => {
            const opt = document.createElement('option');
            opt.value = city.value;
            opt.textContent = city.label;
            citySelect.appendChild(opt);
        });
        citySelect.value = options.cities.some((c) => c.value === selectedCity) ? selectedCity : '';
        currentCityFilter = citySelect.value;
    };
    refreshCities();

    const countryClone = countrySelect.cloneNode(true);
    const cityClone = citySelect.cloneNode(true);
    countrySelect.replaceWith(countryClone);
    citySelect.replaceWith(cityClone);

    countryClone.addEventListener('change', (e) => {
        currentCountryFilter = countryClone.value;
        currentCityFilter = '';
        const fresh = buildLocationOptions(currentQuakes);
        cityClone.innerHTML = `<option value="">${t('allCities')}</option>`;
        if (countryClone.value === 'Turkey') {
            cityClone.disabled = false;
            fresh.cities.forEach((city) => {
                const opt = document.createElement('option');
                opt.value = city.value;
                opt.textContent = city.label;
                cityClone.appendChild(opt);
            });
        } else {
            cityClone.disabled = true;
        }
        updateSidebar(currentQuakes, mapInstance);
        // Programmatic changes (e.g. sync from geolocation in app.js) must not override map focus —
        // the map may have just flown to the user's position at zoom 12.
        const shouldFocusMap = typeof e.isTrusted !== 'boolean' || e.isTrusted;
        if (shouldFocusMap) {
            focusMapToSelection(countryClone.value, cityClone.value, fresh, mapInstance);
        }
    });

    cityClone.addEventListener('change', (e) => {
        currentCityFilter = cityClone.value;
        updateSidebar(currentQuakes, mapInstance);
        const fresh = buildLocationOptions(currentQuakes);
        const shouldFocusMap = typeof e.isTrusted !== 'boolean' || e.isTrusted;
        if (shouldFocusMap) {
            focusMapToSelection(countryClone.value, cityClone.value, fresh, mapInstance);
        }
    });
}

/** Default map view — keep in sync with `setView` in `map.js` `initMap`. */
const DEFAULT_MAP_CENTER = [39.0, 35.0];
const DEFAULT_MAP_ZOOM = 6;

/**
 * Clears country/city filters and recenters the map to the default overview.
 * Invoked on manual "Son Hareketler" refresh only (not silent polling).
 */
export function resetLocationFiltersAndMap(mapInstance) {
    currentCountryFilter = '';
    currentCityFilter = '';
    const countrySelect = document.getElementById('country-select');
    if (countrySelect) {
        countrySelect.value = '';
        countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (mapInstance) {
        mapInstance.flyTo(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, { animate: true, duration: 1.2 });
    }
}

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

    const filteredQuakes = getFilteredQuakes(earthquakes);

    // Sort Data
    const sortedQuakes = [...filteredQuakes]; // Clone to avoid mutating original order if needed elsewhere

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
            <div class="card-location">📍 ${localizeLocation(quake.place)}</div>
            <div class="card-stats">
                <span>🕒 ${timeStr}</span>
                <span>${t('depth')}: ${Math.max(0, quake.depth)}km</span>
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
    /** True only when mousedown/touchstart began on #sidebar-resizer (avoids stray toggle on touchend). */
    let pointerDownOnResizer = false;

    /**
     * Mobile collapse/expand must follow the real `.minimized` class — not a separate flag.
     * `handleMove` used to set `isExpanded` from drag math without updating `.minimized`, so the next
     * toggle could run the wrong branch and leave `.minimized` stuck (footer stays `display:none`).
     */
    const toggleSidebar = () => {
        if (window.innerWidth > 768) return; // Only for mobile

        const isCollapsed = sidebar.classList.contains('minimized');

        if (!isCollapsed) {
            // Minimize: only logo-area + handle visible, fixed at viewport bottom (safe-area aware).
            // Apply .minimized before measuring padding — expanded state uses padding-bottom fallback (e.g. 20px)
            // which must not be baked into the collapsed bar height or content sits high with empty space below.
            sidebar.classList.add('minimized');
            sidebar.style.position = 'fixed';
            sidebar.style.bottom = '0';
            sidebar.style.left = '0';
            sidebar.style.right = '0';
            sidebar.style.width = '100%';
            sidebar.style.height = 'auto';
            sidebar.style.flex = 'none';
            sidebar.style.overflow = 'hidden';

            mainContent.style.height = 'auto';
            mainContent.style.flex = '1';

            const applyCollapsedHeight = () => {
                const logoArea = document.querySelector('.logo-area');
                const logoHeight = logoArea ? logoArea.getBoundingClientRect().height : 0;
                const resizerHeight = resizer.offsetHeight;
                const sidebarStyles = window.getComputedStyle(sidebar);
                const paddingBottom = parseFloat(sidebarStyles.paddingBottom) || 0;
                const paddingTop = parseFloat(sidebarStyles.paddingTop) || 0;
                const totalHeight = paddingTop + logoHeight + resizerHeight + paddingBottom;
                sidebar.style.height = `${totalHeight}px`;
                mainContent.style.paddingBottom = `${totalHeight}px`;
            };

            requestAnimationFrame(() => {
                requestAnimationFrame(applyCollapsedHeight);
            });
        } else {
            // Maximize (default open): clear .minimized first so footer display:none rules drop immediately.
            sidebar.classList.remove('minimized');
            sidebar.style.position = '';
            sidebar.style.bottom = '';
            sidebar.style.left = '';
            sidebar.style.right = '';
            sidebar.style.width = '';
            sidebar.style.height = '75vh';
            sidebar.style.flex = 'none';
            sidebar.style.overflow = '';

            mainContent.style.height = '25vh';
            mainContent.style.flex = 'none';
            mainContent.style.paddingBottom = '';
        }
        setTimeout(() => mapInstance.invalidateSize(), 320); // After height transition (~240ms) + buffer
    };

    // Mouse Events (Desktop)
    resizer.addEventListener('mousedown', (e) => {
        pointerDownOnResizer = true;
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
        pointerDownOnResizer = true;
        isResizing = true;
        startY = e.touches[0].clientY;
        resizer.classList.add('resizing');
        document.body.style.userSelect = 'none';
        e.preventDefault(); // Prevent scrolling while resizing
    }, { passive: false });


    const handleMove = (clientX, clientY) => {
        if (!isResizing) return;

        if (window.innerWidth <= 768) {
            // Mobile: Vertical Resize — only when the sheet is expanded (not `.minimized`).
            // Dragging while collapsed would fight toggleSidebar() and desync footer visibility.
            if (sidebar.classList.contains('minimized')) {
                return;
            }

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
            // Tap-to-toggle only when the gesture started on the resizer strip (not a stray document touchend).
            const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
            if (
                pointerDownOnResizer &&
                Math.abs(clientY - startY) < 5 &&
                window.innerWidth <= 768
            ) {
                toggleSidebar();
            }

            pointerDownOnResizer = false;
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

    // Rail mode: tablet band only. On phone (<=768) always strip rail-mode so global
    // .sidebar.rail-mode .sidebar-footer { display:none } cannot hide the footer after resize from tablet.
    const checkResponsiveSidebar = () => {
        const w = window.innerWidth;
        if (w <= 768) {
            sidebar.classList.remove('rail-mode');
        } else if (w >= 769 && w <= 1200) {
            sidebar.classList.add('rail-mode');
        } else if (w > 1200) {
            sidebar.classList.remove('rail-mode');
        }
        setTimeout(() => mapInstance.invalidateSize(), 300);
    };

    // Initial check
    checkResponsiveSidebar();

    let railResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(railResizeTimer);
        railResizeTimer = setTimeout(() => checkResponsiveSidebar(), 150);
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
            <div class="text-truncate" style="color:var(--text-primary); font-weight:500;">${localizeLocation(maxQuake.place)}</div>
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
        // Localize first to group properly if multiple sources use different EN naming for same place? 
        // Actually best to extract region then localize it.
        let region = q.place;
        if (region.includes(' of ')) {
            region = region.split(' of ')[1];
        } else if (region.includes(' at ')) {
            region = region.split(' at ')[1];
        }

        region = localizeLocation(region.trim());

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


