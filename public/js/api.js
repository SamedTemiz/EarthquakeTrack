// API Endpoints
const USGS_API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const KANDILLI_API_URL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';

// EMSC: Expanded to cover Europe + Turkey
// Lat: 30 (North Africa) to 72 (Nordics)
// Lon: -25 (Atlantic/Iceland) to 50 (Eastern Turkey/Caucasus)
// Limit increased to 200 to accommodate more data
const EMSC_API_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=250&minlat=30&maxlat=72&minlon=-25&maxlon=50';

// Turkey Bounding Box (Used for prioritizing sources, not filtering out anymore)
const TURKEY_BOUNDS = {
    minLat: 35.0, maxLat: 43.0,
    minLon: 25.0, maxLon: 45.0
};

function isInsideTurkey(lat, lon) {
    return lat >= TURKEY_BOUNDS.minLat && lat <= TURKEY_BOUNDS.maxLat &&
        lon >= TURKEY_BOUNDS.minLon && lon <= TURKEY_BOUNDS.maxLon;
}

const COUNTRY_CODE_MAP = {
    tr: 'Turkey',
    us: 'United States',
    gb: 'United Kingdom',
    de: 'Germany',
    fr: 'France',
    it: 'Italy',
    es: 'Spain',
    gr: 'Greece',
    ir: 'Iran',
    ru: 'Russia',
    jp: 'Japan',
    pt: 'Portugal',
    pl: 'Poland'
};

/**
 * Reverse geocodes coordinates to country key used by country selector.
 * Returns null on failure.
 */
export async function getCountryFromCoords(lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        const code = (data?.address?.country_code || '').toLowerCase();
        if (COUNTRY_CODE_MAP[code]) return COUNTRY_CODE_MAP[code];
        const rawCountry = (data?.address?.country || '').trim();
        return rawCountry || null;
    } catch {
        return null;
    }
}

export async function getEarthquakeData() {


    const [usgsData, kandilliData, emscData] = await Promise.allSettled([
        fetch(USGS_API_URL).then(res => res.json()),
        fetch(KANDILLI_API_URL).then(res => res.json()),
        fetch(EMSC_API_URL).then(res => res.json())
    ]);

    let finalEarthquakes = [];
    let turkeySourceUsed = 'None';
    let localDataPoints = [];

    // Helper to parse Kandilli date format: "2025.02.07 15:10:45" or "2025-02-07 15:10:45" -> timestamp
    // Kandilli timestamps are always Turkey local time (UTC+3, no DST), so they must be
    // parsed as UTC+3 rather than the visitor's own timezone, or times skew for non-TR viewers.
    const parseKandilliDate = (dateStr) => {
        if (!dateStr) return Date.now();
        // Handle both . and - as separators
        const parts = dateStr.match(/(\d{4})[.-](\d{2})[.-](\d{2})\s(\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
            const utcMs = Date.UTC(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]);
            return utcMs - 3 * 60 * 60 * 1000;
        }
        return new Date(dateStr.replace(/\./g, '-')).getTime(); // Fallback
    };

    // 1. Process Kandilli (Turkey Primary)
    if (kandilliData.status === 'fulfilled' && kandilliData.value.status === true) {
        localDataPoints = kandilliData.value.result.map(q => ({
            id: q.earthquake_id || q._id || `kan-${q.date_time || q.date}`,
            source: 'Kandilli',
            mag: parseFloat(q.mag),
            place: q.title,
            time: parseKandilliDate(q.date_time || q.date),
            lat: parseFloat(q.geojson.coordinates[1]),
            lon: parseFloat(q.geojson.coordinates[0]),
            depth: parseFloat(q.depth),
            countryName: 'Turkey',
            cityName: q.location_properties?.epiCenter?.name || q.location_properties?.closestCity?.name || undefined
        }));
        turkeySourceUsed = 'Kandilli';
    }

    // 2. Process EMSC (Europe/Regional) - ALWAYS process now
    let emscPoints = [];
    if (emscData.status === 'fulfilled' && emscData.value.features) {
        emscPoints = emscData.value.features.map(f => ({
            id: f.id,
            source: 'EMSC',
            mag: f.properties.mag,
            place: f.properties.flynn_region || `Region ${f.geometry.coordinates[1].toFixed(2)},${f.geometry.coordinates[0].toFixed(2)}`,
            time: new Date(f.properties.time).getTime(),
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            depth: f.geometry.coordinates[2],
            countryName: isInsideTurkey(f.geometry.coordinates[1], f.geometry.coordinates[0]) ? 'Turkey' : undefined
        }));
    }

    // Merge Logic:
    // If Kandilli exists, use Kandilli for Turkey. Use EMSC for everything else.
    // If Kandilli failed, use EMSC for everything.

    if (localDataPoints.length > 0) {
        // Filter EMSC points that are INSIDE Turkey if we have Kandilli data
        // This prevents double dots for Istanbul/Aegean etc.
        const emscOutside = emscPoints.filter(q => !isInsideTurkey(q.lat, q.lon));
        finalEarthquakes = [...localDataPoints, ...emscOutside];
    } else {
        // Fallback: Use all EMSC
        finalEarthquakes = [...emscPoints];
        if (finalEarthquakes.length > 0) turkeySourceUsed = 'EMSC (Fallback)';
    }

    // 3. Process USGS (Global > 2.5)
    if (usgsData.status === 'fulfilled') {
        const usgsNormalized = usgsData.value.features.map(f => ({
            id: f.id,
            source: 'USGS',
            mag: f.properties.mag,
            place: f.properties.place,
            time: f.properties.time,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            depth: f.geometry.coordinates[2],
            countryName: (f.properties.place || '').includes(',') ? (f.properties.place.split(',').pop() || '').trim() : undefined
        }));

        // Filter USGS points that are inside our "Local/Regional" coverage to avoid triplets?
        // Our EMSC covers Europe+Turkey. Kandilli covers Turkey.
        // USGS covers world.
        // Let's exclude USGS if it falls inside the EMSC bounding box we defined? 
        // Or just exclude if inside Turkey (covered by Kandilli) and keep duplicates for Europe?
        // For simplicity: Exclude USGS if inside Turkey (Kandilli is better).
        // For Europe, usually EMSC is better than USGS (more low mag). 
        // Let's filter USGS if inside the EMSC query bounds we defined?
        // EMSC bounds: 30-72 Lat, -25-50 Lon.

        const isInsideEMSCRegion = (lat, lon) => {
            return lat >= 30 && lat <= 72 && lon >= -25 && lon <= 50;
        };

        // Only drop USGS points inside the EMSC region if EMSC actually returned data for it.
        // Otherwise (EMSC request failed/empty) we'd silently blank out Turkey + Europe
        // even though USGS still has coverage there.
        const emscHasData = emscData.status === 'fulfilled' && emscPoints.length > 0;
        const outside = emscHasData ? usgsNormalized.filter(q => !isInsideEMSCRegion(q.lat, q.lon)) : usgsNormalized;
        finalEarthquakes = [...finalEarthquakes, ...outside];
    }

    return finalEarthquakes;
}
