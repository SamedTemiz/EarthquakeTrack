// API Endpoints
const USGS_API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const KANDILLI_API_URL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';
const EMSC_API_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=100&minlat=35&maxlat=43&minlon=25&maxlon=45';

// Turkey Bounding Box
const TURKEY_BOUNDS = {
    minLat: 35.0, maxLat: 43.0,
    minLon: 25.0, maxLon: 45.0
};

function isInsideTurkey(lat, lon) {
    return lat >= TURKEY_BOUNDS.minLat && lat <= TURKEY_BOUNDS.maxLat &&
        lon >= TURKEY_BOUNDS.minLon && lon <= TURKEY_BOUNDS.maxLon;
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

    // Helper to parse Kandilli date format: "2025.02.07 15:10:45" -> timestamp
    // Assuming TR time? Kandilli usually gives local time (UTC+3) but format is YYYY.MM.DD HH:mm:ss
    const parseKandilliDate = (dateStr) => {
        if (!dateStr) return Date.now();
        // Replace . with - to make it ISO-like "2025-02-07 15:10:45"
        // Then parse. Note: If string has no timezone, browsers assume local. 
        // Kandilli is in TR time (UTC+3). 
        // To be safe, let's parse manual parts.
        const parts = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})\s(\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
            // new Date(year, monthIndex, day, hour, minute, second) is local time
            return new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]).getTime();
        }
        return new Date(dateStr.replace(/\./g, '-')).getTime(); // Fallback
    };

    // 1. Try Kandilli
    if (kandilliData.status === 'fulfilled' && kandilliData.value.status === true) {
        localDataPoints = kandilliData.value.result.map(q => ({
            id: q._id || `kan-${q.date}`,
            source: 'Kandilli',
            mag: parseFloat(q.mag),
            place: q.title,
            time: parseKandilliDate(q.date),
            lat: parseFloat(q.geojson.coordinates[1]),
            lon: parseFloat(q.geojson.coordinates[0]),
            depth: parseFloat(q.depth)
        }));
        turkeySourceUsed = 'Kandilli';
    }
    // 2. Fallback to EMSC
    else if (emscData.status === 'fulfilled' && emscData.value.features) {
        console.warn("Kandilli failed. Using EMSC.");
        localDataPoints = emscData.value.features.map(f => ({
            id: f.id,
            source: 'EMSC',
            mag: f.properties.mag,
            place: f.properties.unid || `Region ${f.geometry.coordinates[1].toFixed(2)},${f.geometry.coordinates[0].toFixed(2)}`,
            time: new Date(f.properties.time).getTime(),
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            depth: f.geometry.coordinates[2]
        }));
        turkeySourceUsed = 'EMSC';
    } else {
        turkeySourceUsed = 'USGS Only';
    }

    finalEarthquakes = [...localDataPoints];

    // 3. Process USGS
    if (usgsData.status === 'fulfilled') {
        const usgsNormalized = usgsData.value.features.map(f => ({
            id: f.id,
            source: 'USGS',
            mag: f.properties.mag,
            place: f.properties.place,
            time: f.properties.time,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            depth: f.geometry.coordinates[2]
        }));

        if (localDataPoints.length > 0) {
            const outside = usgsNormalized.filter(q => !isInsideTurkey(q.lat, q.lon));
            finalEarthquakes = [...finalEarthquakes, ...outside];
        } else {
            finalEarthquakes = [...finalEarthquakes, ...usgsNormalized];
        }
    }

    // console.log(`Merged: ${finalEarthquakes.length}, Source: ${turkeySourceUsed}`);
    return finalEarthquakes;
}
