import { t, localizeLocation, getCountryDisplayName, getCurrentLang } from './language.js';

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function computeMinimizedHeight(sidebar) {
    const logoArea = document.querySelector('.logo-area');
    const logoHeight = logoArea ? logoArea.getBoundingClientRect().height : 0;
    const resizer = document.getElementById('sidebar-resizer');
    const resizerHeight = resizer ? resizer.offsetHeight : 0;
    const styles = window.getComputedStyle(sidebar);
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    return Math.max(paddingTop + logoHeight + resizerHeight + paddingBottom, 56);
}

let currentQuakes = [];
let currentCountryFilter = '';
let currentCityFilter = '';

// Filled by initSidebarResize; lets other callers close the sidebar without
// going through the fragile mobile-toggle-icon.click() chain.
let _doCloseSidebar = null;
let _sidebarMobileBreak = 768;

export function closeSidebarOnMobile() {
    if (window.innerWidth > _sidebarMobileBreak) return;
    _doCloseSidebar?.();
}

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
    countryClone.value = currentCountryFilter;
    const cityClone = citySelect.cloneNode(true);
    cityClone.value = currentCityFilter;
    countrySelect.replaceWith(countryClone);
    citySelect.replaceWith(cityClone);

    countryClone.addEventListener('change', (e) => {
        currentCountryFilter = countryClone.value;
        currentCityFilter = '';
        try { sessionStorage.setItem('eq_location_filter', JSON.stringify({ country: countryClone.value, city: '' })); } catch {}
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
        try { sessionStorage.setItem('eq_location_filter', JSON.stringify({ country: countryClone.value, city: cityClone.value })); } catch {}
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
    try { sessionStorage.removeItem('eq_location_filter'); } catch {}
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
            <p>${esc(message || t('error_data_access'))}</p>
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
            <span class="mag-badge ${magClass}">M ${mag}</span>
            <span class="card-location">${esc(localizeLocation(quake.place))}</span>
            <div class="card-stats">
                <span>${timeStr}</span>
                <span>${Math.max(0, quake.depth)}km</span>
            </div>
        `;

        card.addEventListener('click', () => {
            // If content panel is visible (SPA navigation on index.html), reveal the map first
            const contentPanel = document.getElementById('content-panel');
            if (contentPanel && contentPanel.style.display === 'block') {
                contentPanel.style.display = 'none';
                const mapCon = document.getElementById('map-container');
                if (mapCon) mapCon.style.display = '';
                document.querySelectorAll('.nav-link-item, .sidebar-footer a').forEach(a => a.classList.remove('active'));
            }

            mapInstance.flyTo([quake.lat, quake.lon], 10, {
                animate: true,
                duration: 1.5
            });

            // Odaklanma bitince popup'ı otomatik aç
            if (quake.marker) {
                mapInstance.once('moveend', () => {
                    quake.marker.openPopup();
                });
            }

            // Auto-close sidebar on mobile
            closeSidebarOnMobile();
        });

        listContainer.appendChild(card);
    });
}

export function initSidebarResize(mapInstance) {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebar-resizer');

    // On Astro ClientRouter navigations <main> is swapped (it isn't transition:persist —
    // only the sidebar is), so a cached reference goes stale after the first navigation.
    // Re-query it fresh on every use, same reasoning as ensureBackdrop() below.
    const getMainContent = () => document.querySelector('.main-content');

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
    const mobileBreak = mapInstance ? 768 : 600;
    _sidebarMobileBreak = mobileBreak;

    // Backdrop overlay. On Astro ClientRouter navigations the <body> is swapped and elements not
    // marked transition:persist are dropped — so a cached backdrop detaches while the persisted
    // sidebar (and this closure) live on. Recreate + rebind on demand instead of caching once.
    const ensureBackdrop = () => {
        let bd = document.querySelector('.sidebar-backdrop');
        if (!bd) {
            bd = document.createElement('div');
            bd.className = 'sidebar-backdrop';
            bd.addEventListener('click', () => {
                if (!sidebar.classList.contains('minimized')) toggleSidebar();
            });
            document.body.appendChild(bd);
        }
        return bd;
    };

    const toggleSidebar = () => {
        if (window.innerWidth > mobileBreak) return;

        const backdrop = ensureBackdrop();
        const mainContent = getMainContent();
        const isCollapsed = sidebar.classList.contains('minimized');

        if (!isCollapsed) {
            // Animasyon başlangıç yüksekliğini al
            const startHeight = sidebar.offsetHeight;

            sidebar.classList.add('minimized');
            sidebar.style.position = 'fixed';
            sidebar.style.bottom = '0';
            sidebar.style.left = '0';
            sidebar.style.right = '0';
            sidebar.style.width = '100%';
            sidebar.style.flex = 'none';
            sidebar.style.overflow = 'hidden';

            mainContent.style.height = '';
            mainContent.style.flex = '1';

            const targetHeight = computeMinimizedHeight(sidebar);

            // Yüksekliği sabit tut, sonra hesaplanan hedef yüksekliğe anime et
            sidebar.style.height = `${startHeight}px`;

            // Tarayıcıya layout'u tekrar hesaplat (Animasyonun tetiklenmesi için)
            sidebar.offsetHeight;

            sidebar.style.height = `${targetHeight}px`;
            // Reserve bottom clearance on the page's own shell div (see .main-content > * in
            // style.css) — a padding-bottom on .main-content itself is not honored once content
            // overflows through the shell's overflow:visible box.
            document.documentElement.style.setProperty('--mobile-bar-clearance', `${targetHeight}px`);
            // Ensure main content fills the space above minimized sidebar
            mainContent.style.minHeight = `calc(100dvh - ${targetHeight}px)`;

            // Hide backdrop
            backdrop.classList.remove('visible');
            setTimeout(() => { backdrop.style.display = 'none'; }, 260);

        } else {
            // Animasyon başlangıç yüksekliğini al
            const startHeight = sidebar.offsetHeight;

            sidebar.classList.remove('minimized');
            sidebar.style.position = '';
            sidebar.style.bottom = '';
            sidebar.style.left = '';
            sidebar.style.right = '';
            sidebar.style.width = '';
            sidebar.style.flex = 'none';
            sidebar.style.overflow = '';

            mainContent.style.minHeight = '0';
            mainContent.style.height = '25dvh';
            mainContent.style.flex = 'none';

            document.documentElement.style.setProperty('--mobile-bar-clearance', '0px');

            // Yüksekliği sabit tut, sonra 75vh'ye anime et
            sidebar.style.height = `${startHeight}px`;

            // Tarayıcıya layout'u tekrar hesaplat
            sidebar.offsetHeight;

            sidebar.style.height = '75dvh';

            // Show backdrop
            backdrop.style.display = 'block';
            requestAnimationFrame(() => backdrop.classList.add('visible'));
        }
        setTimeout(() => {
            if (mapInstance) mapInstance.invalidateSize();
        }, 320); // After height transition (~240ms) + buffer
    };

    // Expose close-only handle for closeSidebarOnMobile()
    _doCloseSidebar = () => {
        if (!sidebar.classList.contains('minimized')) toggleSidebar();
    };

    // Tap anywhere on minimized bar to expand (backdrop click closes — wired in ensureBackdrop).
    // Excludes #earthquake-list: a quake-card click already collapses the sidebar itself
    // (see closeSidebarOnMobile() in updateSidebar()) — by the time this bubbles up here the
    // `.minimized` class was just added, so without this guard we'd immediately re-expand it.
    sidebar.addEventListener('click', (e) => {
        if (!sidebar.classList.contains('minimized')) return;
        if (window.innerWidth > mobileBreak) return;
        if (e.target.closest('#sidebar-resizer, button, a, select, input, #earthquake-list')) return;
        toggleSidebar();
    });

    // Prevent resizer tap from double-triggering the sidebar click handler above
    resizer.addEventListener('click', (e) => e.stopPropagation());

    // Mouse Events (Desktop)
    resizer.addEventListener('mousedown', (e) => {
        pointerDownOnResizer = true;
        isResizing = true;
        startY = e.clientY;
        resizer.classList.add('resizing');
        document.body.style.userSelect = 'none';

        if (window.innerWidth <= mobileBreak) {
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

        if (window.innerWidth <= mobileBreak) {
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

            getMainContent().style.height = `${newMapHeight}px`;
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

        if (mapInstance) mapInstance.invalidateSize();
    };

    const handleEnd = (e) => {
        if (isResizing) {
            // Tap-to-toggle only when the gesture started on the resizer strip (not a stray document touchend).
            const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
            if (
                pointerDownOnResizer &&
                Math.abs(clientY - startY) < 5 &&
                window.innerWidth <= mobileBreak
            ) {
                toggleSidebar();
            }

            pointerDownOnResizer = false;
            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (mapInstance) mapInstance.invalidateSize();
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
        mobileToggleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= mobileBreak) {
                toggleSidebar();
            }
        });
    }
}

export function initSidebarToggle(mapInstance) {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const mobileBreak = mapInstance ? 768 : 600;

    const checkResponsiveSidebar = () => {
        const w = window.innerWidth;
        if (w <= mobileBreak) {
            sidebar.classList.remove('rail-mode');
            
            // Set initial mobile state: minimized by default
            if (!sidebar.dataset.initMobile) {
                sidebar.classList.add('minimized');

                const targetHeight = computeMinimizedHeight(sidebar);
                
                sidebar.style.position = 'fixed';
                sidebar.style.bottom = '0';
                sidebar.style.left = '0';
                sidebar.style.right = '0';
                sidebar.style.width = '100%';
                sidebar.style.height = `${targetHeight}px`;
                sidebar.style.flex = 'none';
                
                document.documentElement.style.setProperty('--mobile-bar-clearance', `${targetHeight}px`);
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.style.minHeight = `calc(100dvh - ${targetHeight}px)`;
                    mainContent.style.flex = '1';
                }
                
                sidebar.dataset.initMobile = 'true';
            }
        } else {
            // Desktop reset
            sidebar.style.position = '';
            sidebar.style.bottom = '';
            sidebar.style.left = '';
            sidebar.style.right = '';
            sidebar.style.width = '';
            sidebar.style.height = '';
            sidebar.style.flex = '';
            
            document.documentElement.style.setProperty('--mobile-bar-clearance', '0px');
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.minHeight = '';
                mainContent.style.height = '';
            }
            
            sidebar.classList.remove('minimized');
            if (sidebar.dataset.initMobile) {
                delete sidebar.dataset.initMobile;
            }

            if (w > mobileBreak && w <= 1200) {
                sidebar.classList.add('rail-mode');
            } else {
                sidebar.classList.remove('rail-mode');
            }
        }
        setTimeout(() => {
            if (mapInstance) mapInstance.invalidateSize();
        }, 300);
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
                if (mapInstance) mapInstance.invalidateSize();
            }, 300);
        });
    }

    // Click anywhere on collapsed sidebar to expand
    sidebar.addEventListener('click', (e) => {
        if (!sidebar.classList.contains('rail-mode')) return;
        if (e.target.closest('a') || e.target.closest('#sidebar-toggle-btn')) return;
        sidebar.classList.remove('rail-mode');
        setTimeout(() => {
            if (mapInstance) mapInstance.invalidateSize();
        }, 300);
    });

    // Close sidebar on mobile when a nav or footer link is clicked
    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link-item, .sidebar-footer a');
        if (!link) return;
        closeSidebarOnMobile();
    });

    // On Astro ClientRouter navigation the sidebar persists (transition:persist) but the page
    // content changes — reset the mobile init guard so checkResponsiveSidebar re-runs.
    document.addEventListener('astro:page-load', () => {
        delete sidebar.dataset.initMobile;
        checkResponsiveSidebar();
    });
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
            <div class="text-truncate" style="color:var(--text-primary); font-weight:500;">${esc(localizeLocation(maxQuake.place))}</div>
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
            <span class="text-truncate" style="font-weight:500; color:var(--text-primary); flex:1; margin-right:10px;">${esc(region)}</span>
            <span class="badge">${data.count}</span>
        `;

        item.addEventListener('click', () => {
            mapInstance.flyTo([data.lat, data.lon], 9, { animate: true });
        });

        container.appendChild(item);
    });
}


