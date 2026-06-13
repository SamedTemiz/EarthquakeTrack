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
const USER_LOCATION_KEY = 'userLocation';

/** City-scale zoom when focusing on the user's position (aligned with `focusMapToSelection` city level in ui.js). */
const LOCATION_FOCUS_ZOOM = 8;

// ── IP geolocation fallback (when GPS is unavailable or denied) ────────────
const IP_LOCATION_CACHE_KEY = 'eq_ip_loc';
const IP_LOCATION_CACHE_MS  = 24 * 60 * 60 * 1000;
const IP_FALLBACK_ZOOM = 5;

const COUNTRY_CENTERS = {
    TR: [39.0, 35.0], GR: [39.0, 22.0], IT: [42.5, 12.5], DE: [51.2, 10.5],
    FR: [46.2,  2.2], ES: [40.0, -4.0], PT: [39.5, -8.0], GB: [54.0, -2.0],
    US: [39.5,-98.5], CA: [56.0,-96.0], MX: [23.0,-102.0],BR: [-15.0,-53.0],
    AR: [-34.0,-64.0],RU: [55.0, 37.0], UA: [49.0, 32.0], PL: [52.0, 20.0],
    NL: [52.4,  5.3], BE: [50.8,  4.5], CH: [46.8,  8.2], AT: [47.5, 14.5],
    SE: [62.0, 15.0], NO: [64.0, 11.0], DK: [56.0, 10.0], FI: [64.0, 26.0],
    JP: [36.5,138.0], CN: [35.0,105.0], IN: [20.0, 78.0], AU: [-25.0,133.0],
    NZ: [-40.0,175.0],SA: [24.0, 45.0], AE: [24.0, 54.0], IL: [31.5, 35.0],
    IR: [32.0, 53.0], SY: [35.0, 38.0], IQ: [33.0, 44.0], EG: [26.0, 30.0],
    MA: [32.0, -6.0], ZA: [-29.0,25.0], ID: [-5.0,120.0],  PH: [12.0,123.0],
    KR: [36.5,127.5], TW: [23.5,121.0], PK: [30.0, 70.0],  AZ: [40.5, 47.5],
    GE: [42.0, 44.0], AM: [40.0, 45.0], RO: [45.9, 24.9],  BG: [42.7, 25.5],
    RS: [44.0, 21.0], HR: [45.1, 15.2], AL: [41.0, 20.0],  CY: [35.0, 33.0],
    LB: [33.8, 35.9], JO: [31.0, 36.5], KZ: [48.0, 68.0],  UZ: [41.0, 64.0],
    SG: [ 1.3,103.8], TH: [15.0,101.0], MY: [ 4.0,109.0],  VN: [16.0,107.5],
};

async function ipFallbackFocus(map) {
    try {
        let code;
        try {
            const cached = JSON.parse(localStorage.getItem(IP_LOCATION_CACHE_KEY) || 'null');
            if (cached && Date.now() - cached.at < IP_LOCATION_CACHE_MS) code = cached.code;
        } catch (_) {}

        if (!code) {
            const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
            if (!res.ok) return;
            const data = await res.json();
            code = data.country_code;
            try { localStorage.setItem(IP_LOCATION_CACHE_KEY, JSON.stringify({ at: Date.now(), code })); } catch (_) {}
        }

        const center = COUNTRY_CENTERS[code];
        if (!center) return;
        map.flyTo(center, IP_FALLBACK_ZOOM, { animate: true, duration: 1.5 });
    } catch (_) { /* silently fail — default map view stays */ }
}

function flyToSavedOrIp(map) {
    const saved = localStorage.getItem(USER_LOCATION_KEY);
    if (saved) {
        try {
            map.flyTo(JSON.parse(saved), LOCATION_FOCUS_ZOOM, { animate: true, duration: 1.5 });
            return;
        } catch (_) {}
    }
    ipFallbackFocus(map);
}

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
                if (result.state === 'denied') {
                    flyToSavedOrIp(map);
                    return;
                }
            }
        } catch (_) {
            // Permissions API unsupported or "geolocation" not queryable — proceed with locate.
        }
        runGeolocationRequest(map, LOCATION_SOURCE_INITIAL);
    })();
}

export function initMap() {
    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        minZoom: 3,
        maxBounds: [[-85, -Infinity], [85, Infinity]],
        maxBoundsViscosity: 0.8,
    }).setView([39.0, 35.0], 6);

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
    const savedLocation = localStorage.getItem(USER_LOCATION_KEY);
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
        localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(e.latlng));

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
        } else if (source === LOCATION_SOURCE_INITIAL) {
            flyToSavedOrIp(map);
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
