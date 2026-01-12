import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SegmentMapProps {
    polyline?: string;
    className?: string;
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

const SegmentMap: React.FC<SegmentMapProps> = ({ polyline, className = '' }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const polylineLayerRef = useRef<L.Polyline | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // 初始化地圖（以台中 136 為中心）
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapContainerRef.current, {
                zoomControl: true,
                scrollWheelZoom: false,
            }).setView([24.15, 120.7], 12);

            // 使用 CartoDB 暗色地圖樣式
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                subdomains: 'abcd',
                maxZoom: 19,
            }).addTo(mapInstanceRef.current);
        }

        // 清除舊的 polyline
        if (polylineLayerRef.current) {
            polylineLayerRef.current.remove();
            polylineLayerRef.current = null;
        }

        // 繪製新的 polyline
        if (polyline && mapInstanceRef.current) {
            const latlngs = decodePolyline(polyline);

            if (latlngs.length > 0) {
                polylineLayerRef.current = L.polyline(latlngs, {
                    color: '#FC5200', // Strava 橘色
                    weight: 4,
                    opacity: 0.9,
                }).addTo(mapInstanceRef.current);

                // 自動縮放到路線範圍
                mapInstanceRef.current.fitBounds(polylineLayerRef.current.getBounds(), {
                    padding: [20, 20],
                });

                // 添加起點和終點標記
                const startIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="width:12px;height:12px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                });

                const endIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                });

                L.marker(latlngs[0], { icon: startIcon }).addTo(mapInstanceRef.current);
                L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(mapInstanceRef.current);
            }
        }

        return () => {
            // 清理（但保留地圖實例以避免重複初始化）
        };
    }, [polyline]);

    // 組件卸載時清理地圖
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={mapContainerRef}
            className={`w-full h-full min-h-[300px] rounded-xl overflow-hidden ${className}`}
            style={{ background: '#1a1a2e' }}
        />
    );
};

export default SegmentMap;
