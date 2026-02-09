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
