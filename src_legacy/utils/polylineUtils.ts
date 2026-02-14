export const decodePolyline = (encoded: string): [number, number][] => {
    if (!encoded) return [];

    const points: [number, number][] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
        let b: number;
        let shift = 0;
        let result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;

        points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
};

export const generateSvgPath = (polyline: string, width: number = 100, height: number = 100, padding: number = 10): string => {
    if (!polyline) return '';

    const points = decodePolyline(polyline);
    if (points.length === 0) return '';

    // Calculate bounds
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    points.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    });

    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;

    if (latRange === 0 && lngRange === 0) return '';

    // We want to fit the shape within the box uniformly
    const availableWidth = width - 2 * padding;
    const availableHeight = height - 2 * padding;

    // Scale factor
    const scale = Math.min(
        availableWidth / lngRange,
        availableHeight / latRange
    );

    // Center offsets
    const pathWidth = lngRange * scale;
    const pathHeight = latRange * scale;

    const offsetX = padding + (availableWidth - pathWidth) / 2;
    const offsetY = padding + (availableHeight - pathHeight) / 2;

    return points.map(([lat, lng], i) => {
        const x = (lng - minLng) * scale + offsetX;
        // Invert Y for SVG
        const y = (maxLat - lat) * scale + offsetY;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
};
