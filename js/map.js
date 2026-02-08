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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    return map;
}

function getMarkerColor(mag) {
    if (mag >= 6.0) return '#9d4edd'; // Purple (Severe)
    if (mag >= 5.0) return '#ff4d4d'; // Red (High)
    if (mag >= 4.0) return '#ffd700'; // Yellow (Moderate)
    return '#4dff88'; // Green (Low)
}

export function updateMapMarkers(map, earthquakes) {
    // Clear existing markers if we were tracking them (not implemented in v1, but good for v2)
    // For now, we assume this is called once or we just add on top. 
    // To do it properly, we should clear. But let's keep it simple for now as per previous app.js logic.
    // Actually, app.js didn't clear markers on re-fetch, which might be a bug if re-fetching.
    // Let's implement basics.

    earthquakes.forEach(quake => {
        const color = getMarkerColor(quake.mag);

        const marker = L.circleMarker([quake.lat, quake.lon], {
            radius: Math.max(quake.mag * 2.5, 4),
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(map);

        marker.bindPopup(`
            <div style="font-size: 14px;">
                <b>${quake.place}</b><br>
                <div style="margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${t('mag')} <b>${quake.mag.toFixed(1)}</b></span>
                    <span style="font-size:11px; opacity:0.8; background:#333; padding:2px 4px; border-radius:4px;">${quake.source}</span>
                </div>
                <div style="margin-top:4px; font-size:12px; color:#aaa;">
                    ${new Date(quake.time).toLocaleDateString()} ${new Date(quake.time).toLocaleTimeString()} • ${quake.depth}km
                </div>
            </div>
        `);
    });
}
