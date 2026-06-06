import { t } from './language.js';

/** Wired once: themed alert dialog in index.html (replaces native alert for geolocation). */
let locationAlertDialogInitialized = false;

function ensureLocationAlertDialog() {
    if (locationAlertDialogInitialized) return;
    const dialog = document.getElementById('alert-dialog');
    const okBtn = document.getElementById('alert-dialog-ok');
    if (!dialog || !okBtn) return;

    const close = () => {
        dialog.style.display = 'none';
        document.body.style.overflow = '';
    };

    okBtn.addEventListener('click', close);
    dialog.addEventListener('click', (ev) => {
        if (ev.target === dialog) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dialog.style.display === 'flex') close();
    });

    locationAlertDialogInitialized = true;
}

/**
 * @param {'location_error_denied'|'location_error_unavailable'|'location_error_timeout'} key
 */
function showLocationErrorByKey(key) {
    ensureLocationAlertDialog();
    const dialog = document.getElementById('alert-dialog');
    const msgEl = document.getElementById('alert-dialog-message');
    const okBtn = document.getElementById('alert-dialog-ok');
    if (!dialog || !msgEl || !okBtn) return;
    msgEl.textContent = t(key);
    okBtn.textContent = t('ok');
    dialog.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Maps GeolocationPositionError codes to i18n strings (language.js).
 * @param {GeolocationPositionError & { message?: string }} e
 */
function showLocationErrorDialog(e) {
    ensureLocationAlertDialog();
    const dialog = document.getElementById('alert-dialog');
    const msgEl = document.getElementById('alert-dialog-message');
    const okBtn = document.getElementById('alert-dialog-ok');
    if (!dialog || !msgEl || !okBtn) {
        window.alert(e.message || 'Geolocation error');
        return;
    }

    const code = typeof e.code === 'number' ? e.code : null;

    /**
     * Browsers may report PERMISSION_DENIED (1) even when site permission is "granted"
     * (VPN, private mode, or stale callbacks). If Permissions API says granted, show
     * "unavailable" instead of "denied" to avoid confusing the user.
     */
    if (code === 1 && navigator.permissions?.query) {
        navigator.permissions
            .query({ name: 'geolocation' })
            .then((result) => {
                if (result.state === 'granted') {
                    showLocationErrorByKey('location_error_unavailable');
                } else {
                    showLocationErrorByKey('location_error_denied');
                }
            })
            .catch(() => {
                let key = 'location_error_unavailable';
                if (code === 1) key = 'location_error_denied';
                else if (code === 2) key = 'location_error_unavailable';
                else if (code === 3) key = 'location_error_timeout';
                showLocationErrorByKey(key);
            });
        return;
    }

    let key = 'location_error_unavailable';
    if (code === 1) key = 'location_error_denied';
    else if (code === 2) key = 'location_error_unavailable';
    else if (code === 3) key = 'location_error_timeout';

    msgEl.textContent = t(key);
    okBtn.textContent = t('ok');
    dialog.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/** Distinguishes automatic page-load locate from the manual control (error dialog only for control). */
const LOCATION_SOURCE_INITIAL = 'initial';
const LOCATION_SOURCE_CONTROL = 'control';

/** City-scale zoom when focusing on the user's position (aligned with `focusMapToSelection` city level in ui.js). */
const LOCATION_FOCUS_ZOOM = 8;

/**
 * Uses the Geolocation API directly (not map.locate) so each request has a monotonic id.
 * Leaflet's map.locate uses getCurrentPosition without cancelling prior calls; overlapping
 * requests can fire locationerror for an old attempt while map._locationRequestSource was
 * overwritten (e.g. initial + "My location" click), wrongly showing the permission dialog.
 *
 * After TIMEOUT (3) or POSITION_UNAVAILABLE (2), performs one automatic fallback with
 * enableHighAccuracy: false and a longer timeout so Wi‑Fi / coarse / cached fixes succeed
 * indoors or with VPN (high‑accuracy GPS often times out at 10s).
 *
 * @param {L.Map} map
 * @param {typeof LOCATION_SOURCE_INITIAL | typeof LOCATION_SOURCE_CONTROL} source
 */
function runGeolocationRequest(map, source) {
    if (!navigator.geolocation) {
        map._locationRequestSource = source;
        map.fire('locationerror', { code: 0, message: 'Geolocation not supported' });
        return;
    }

    if (typeof map._geolocationRequestId !== 'number' || Number.isNaN(map._geolocationRequestId)) {
        map._geolocationRequestId = 0;
    }
    const requestId = ++map._geolocationRequestId;
    map._locationRequestSource = source;

    /** First attempt: GPS‑class fix. Fallback: network / cache (faster, works more often). */
    let didWeakFallback = false;

    const optionsPrimary = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
    };

    const optionsFallback = {
        enableHighAccuracy: false,
        timeout: 45000,
        maximumAge: 300000
    };

    function onSuccess(pos) {
        if (requestId !== map._geolocationRequestId) return;
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        map.fire('locationfound', { latlng, timestamp: pos.timestamp });
    }

    function onError(err) {
        if (requestId !== map._geolocationRequestId) return;
        const code = typeof err.code === 'number' ? err.code : 0;
        // Do not retry permission denied — user must change site settings.
        if ((code === 3 || code === 2) && !didWeakFallback) {
            didWeakFallback = true;
            navigator.geolocation.getCurrentPosition(onSuccess, onError, optionsFallback);
            return;
        }
        map.fire('locationerror', { code: err.code, message: err.message });
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, optionsPrimary);
}

/**
 * Requests user location once on load when permission is not already denied.
 * Skips calling locate if Permissions API reports "denied" (avoids pointless errors each visit).
 */
function scheduleInitialLocate(map) {
    (async () => {
        try {
            if (navigator.permissions?.query) {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                if (result.state === 'denied') return;
            }
        } catch (_) {
            // Permissions API unsupported or "geolocation" not queryable — proceed with locate.
        }
        runGeolocationRequest(map, LOCATION_SOURCE_INITIAL);
    })();
}

export function initMap() {
    const map = L.map('map', {
        zoomControl: false, // Disable default top-left
        attributionControl: false, // Disable attribution text
        preferCanvas: true // Use Canvas rendering for better performance
    }).setView([39.0, 35.0], 6); // Turkey centered view

    // Add Zoom Control to Bottom Right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Custom Location Control
    const LocationControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('a', 'leaflet-control-location', container);
            button.href = '#';
            button.role = 'button';
            button.title = t('myLocation') || 'Konumum';
            // Use current-location.svg content with fill="currentColor"
            button.innerHTML = `<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4"/><path d="M13 4.069V2h-2v2.069A8.01 8.01 0 0 0 4.069 11H2v2h2.069A8.008 8.008 0 0 0 11 19.931V22h2v-2.069A8.007 8.007 0 0 0 19.931 13H22v-2h-2.069A8.008 8.008 0 0 0 13 4.069zM12 18c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"/></svg>`;

            L.DomEvent.disableClickPropagation(button);
            L.DomEvent.on(button, 'click', function (e) {
                L.DomEvent.stop(e);
                runGeolocationRequest(map, LOCATION_SOURCE_CONTROL);
                button.classList.add('loading');
            });

            return container;
        }
    });

    map.addControl(new LocationControl());

    // Helper to show user location
    function showUserLocation(latlng) {
        if (map._locationLayer) {
            map.removeLayer(map._locationLayer);
        }

        const locationGroup = L.layerGroup();

        L.circleMarker(latlng, {
            radius: 8,
            fillColor: '#3498DB',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).addTo(locationGroup);

        locationGroup.addTo(map);
        map._locationLayer = locationGroup;
    }

    // Check for saved location on init
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
        try {
            const latlng = JSON.parse(savedLocation);
            showUserLocation(latlng);
        } catch (e) {
            console.error('Error parsing saved location', e);
        }
    }

    // Location Events
    map.on('locationfound', (e) => {
        const locationBtn = document.querySelector('.leaflet-control-location');
        if (locationBtn) locationBtn.classList.remove('loading');

        showUserLocation(e.latlng);

        // Save to localStorage
        localStorage.setItem('userLocation', JSON.stringify(e.latlng));

        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        window.dispatchEvent(
            new CustomEvent('userLocationFound', {
                detail: { lat, lng }
            })
        );

        // City-level overview (not street-level)
        map.flyTo(e.latlng, LOCATION_FOCUS_ZOOM, {
            animate: true,
            duration: 1.5
        });

        delete map._locationRequestSource;
    });

    map.on('locationerror', (e) => {
        const locationBtn = document.querySelector('.leaflet-control-location');
        if (locationBtn) locationBtn.classList.remove('loading');
        const source = map._locationRequestSource;
        delete map._locationRequestSource;
        if (source === LOCATION_SOURCE_CONTROL) {
            showLocationErrorDialog(e);
        }
    });

    // Dark Map Tiles (CartoDB Dark Matter)
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Save reference for theming
    map.tileLayer = tileLayer;

    scheduleInitialLocate(map);

    return map;
}

export function setMapTheme(map, theme) {
    if (!map || !map.tileLayer) return;

    const urls = {
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    };

    map.tileLayer.setUrl(urls[theme]);
    map._currentTheme = theme;
}

function getMarkerColor(mag, theme) {
    if (mag >= 6.0) return '#9d4edd'; // Purple (Severe)
    if (mag >= 5.0) return '#ff4d4d'; // Red (High)
    if (mag >= 4.0) return '#ffd700'; // Yellow (Moderate)

    // Theme-specific Green
    if (theme === 'light') {
        return '#00b894'; // Darker Mint/Green for Light Mode
    }
    return '#4dff88'; // Bright Green for Dark Mode
}

export function updateMapMarkers(map, earthquakes) {
    // Initialize LayerGroup if not exists
    if (!map._markerLayer) {
        map._markerLayer = L.layerGroup().addTo(map);
    } else {
        map._markerLayer.clearLayers();
    }

    const currentTheme = map._currentTheme || 'dark';

    earthquakes.forEach(quake => {
        const color = getMarkerColor(quake.mag, currentTheme);

        const marker = L.circleMarker([quake.lat, quake.lon], {
            radius: Math.max(quake.mag * 2.5, 4),
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
        });
        marker.addTo(map._markerLayer);
        
        // Save reference to the quake object so we can open it from UI clicks
        quake.marker = marker;

        marker.bindPopup(`
            <div style="font-size: 14px;">
                <b>${quake.place}</b><br>
                <div style="margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${t('mag')} <b>${quake.mag.toFixed(1)}</b></span>
                    <span class="popup-source-badge">${quake.source}</span>
                </div>
                <div class="popup-meta">
                    ${new Date(quake.time).toLocaleDateString()} ${new Date(quake.time).toLocaleTimeString()} • ${quake.depth}km
                </div>
            </div>
        `);
    });
}
