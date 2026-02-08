import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SegmentMapProps {
    polyline?: string;
    className?: string;
    minimal?: boolean;
}

// 解碼 Strava polyline
const decodePolyline = (encoded: string): [number, number][] => {
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

const SegmentMap: React.FC<SegmentMapProps> = ({ polyline, className = '', minimal = false }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const polylineLayerRef = useRef<L.Polyline | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // 初始化地圖（以台中 136 為中心）
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapContainerRef.current, {
                zoomControl: !minimal, // 極簡模式下關閉縮放控制
                attributionControl: !minimal, // 極簡模式下關閉版權宣告（版面太小）
                scrollWheelZoom: false,
                dragging: !minimal, // 極簡模式下禁止拖曳
                doubleClickZoom: !minimal,
                boxZoom: false,
                keyboard: false,
            }).setView([24.15, 120.7], 12);

            // 使用 CartoDB 暗色地圖樣式
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                subdomains: 'abcd',
                maxZoom: 19,
            }).addTo(mapInstanceRef.current);
        }

        // ... existing cleanup logic ...

        // 清除舊的標記
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // 繪製新的 polyline
        if (polyline && mapInstanceRef.current) {
            const latlngs = decodePolyline(polyline);

            if (latlngs.length > 0) {
                const map = mapInstanceRef.current;

                polylineLayerRef.current = L.polyline(latlngs, {
                    color: '#FF4D00', // More vibrant Strava orange
                    weight: minimal ? 5 : 6, // Increased weight for visibility
                    opacity: 1, // Full opacity for the route itself
                }).addTo(map);

                const polylineLayer = polylineLayerRef.current;

                // 立即嘗試一次 fitBounds
                map.invalidateSize();
                if (polylineLayer) {
                    map.fitBounds(polylineLayer.getBounds(), {
                        padding: minimal ? [20, 20] : [50, 50],
                        maxZoom: 17,
                    });
                }

                // 延遲再次調整
                timerRef.current = setTimeout(() => {
                    if (mapInstanceRef.current && polylineLayerRef.current) {
                        const m = mapInstanceRef.current;
                        const p = polylineLayerRef.current;
                        m.invalidateSize();
                        m.fitBounds(p.getBounds(), {
                            padding: minimal ? [20, 20] : [50, 50],
                            maxZoom: 17,
                        });
                    }
                }, 300);

                // 只在非極簡模式下顯示起終點標記，避免小圖過於雜亂
                if (!minimal) {
                    const startIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="width:14px;height:14px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
                        iconSize: [14, 14],
                        iconAnchor: [7, 7],
                    });

                    const endIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="width:14px;height:14px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
                        iconSize: [14, 14],
                        iconAnchor: [7, 7],
                    });

                    const startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
                    const endMarker = L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(map);

                    markersRef.current = [startMarker, endMarker];
                }
            }
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [polyline]);

    // 組件卸載時清理地圖
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={mapContainerRef}
            className={`w-full h-full rounded-xl overflow-hidden z-0 ${className}`}
            style={{ background: '#1a1a2e' }}
        >
            <style>{`
                .leaflet-control-zoom a {
                    background-color: rgba(255, 255, 255, 0.2) !important;
                    color: #fff !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                    backdrop-filter: blur(4px);
                }
                .leaflet-control-zoom a:hover {
                    background-color: rgba(255, 255, 255, 0.4) !important;
                }
                .leaflet-control-zoom a.leaflet-disabled {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                    color: rgba(255, 255, 255, 0.3) !important;
                }
            `}</style>
        </div>
    );
};

export default SegmentMap;
