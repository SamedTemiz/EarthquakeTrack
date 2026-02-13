import { t } from './language.js';

export function initMap() {
    const map = L.map('map', {
        zoomControl: false, // Disable default top-left
        attributionControl: false // Disable attribution text
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
                // Request high accuracy for better results
                // Disable setView to handle it manually with flyTo
                map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true });
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

        // Animate to location (Same style as list click)
        map.flyTo(e.latlng, 12, { // Orbiting slightly higher than max zoom for context
            animate: true,
            duration: 1.5
        });
    });

    map.on('locationerror', (e) => {
        const locationBtn = document.querySelector('.leaflet-control-location');
        if (locationBtn) locationBtn.classList.remove('loading');
        alert(e.message); // Simple alert for now
    });

    // Dark Map Tiles (CartoDB Dark Matter)
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Save reference for theming
    map.tileLayer = tileLayer;

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
        }); // Do not addTo(map) directly

        marker.addTo(map._markerLayer);

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
