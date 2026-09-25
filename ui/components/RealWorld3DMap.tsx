import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

// Public demo token for dark 3D vector tiles (or swap with your own Mapbox key)
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZGV2LW1hcGJveC1wdWJsaWMiLCJhIjoiY2x6cTlyZnE1MDJuZzJqb3d3djB1cnR0ZSJ9.n_Y2wQ8-j-r4o2vUfLp7vQ';

interface Props {
  worldState: any;
}

export const RealWorld3DMap: React.FC<Props> = ({ worldState }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on urban financial/metro district with dense 3D skyscrapers
    const centerCoords: [number, number] = [-74.006, 40.7128]; // Lower Manhattan NYC

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: centerCoords,
      zoom: 15.6,
      pitch: 62, // 3D Tilt perspective
      bearing: -22,
      antialias: true
    });

    mapRef.current = map;

    map.on('style.load', () => {
      // 1. Add 3D Extruded Building Layer
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.addLayer(
        {
          id: 'add-3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#1a2333',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.85
          }
        },
        labelLayerId
      );

      // 2. Add Tactical Evacuation Perimeter Polygon
      map.addSource('evac-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-74.009, 40.711],
              [-74.003, 40.710],
              [-74.002, 40.715],
              [-74.008, 40.716],
              [-74.009, 40.711]
            ]]
          },
          properties: {}
        }
      });

      map.addLayer({
        id: 'evac-zone-fill',
        type: 'fill',
        source: 'evac-zone',
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.22
        }
      });

      map.addLayer({
        id: 'evac-zone-line',
        type: 'line',
        source: 'evac-zone',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2.5,
          'line-dasharray': [3, 2]
        }
      });

      // 3. Add Custom Tactical HTML Markers
      // Fire Hazard 1
      const fireEl = document.createElement('div');
      fireEl.className = 'custom-marker';
      fireEl.innerHTML = `
        <div style="background: rgba(220, 38, 38, 0.9); border: 1.5px solid #ff4444; border-radius: 4px; padding: 2px 6px; box-shadow: 0 0 14px rgba(239,68,68,0.8); display: flex; align-items: center; gap: 4px; color: white; font-size: 10px; font-weight: 900; font-family: monospace;">
          <span style="font-size: 13px;">🔥</span> BURNING Sector 5C
        </div>
      `;
      new mapboxgl.Marker(fireEl).setLngLat([-74.004, 40.715]).addTo(map);

      // Fire Truck FIRE-03
      const fireTruckEl = document.createElement('div');
      fireTruckEl.innerHTML = `
        <div style="background: #991b1b; color: white; border: 1px solid #fca5a5; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: bold; font-family: monospace; box-shadow: 0 2px 5px rgba(0,0,0,0.8);">
          🚒 FIRE-03
        </div>
      `;
      new mapboxgl.Marker(fireTruckEl).setLngLat([-74.0035, 40.713]).addTo(map);

      // Police POL-02
      const policeEl = document.createElement('div');
      policeEl.innerHTML = `
        <div style="background: #1e3a8a; color: #93c5fd; border: 1px solid #60a5fa; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: bold; font-family: monospace; box-shadow: 0 2px 5px rgba(0,0,0,0.8);">
          🚓 POL-02
        </div>
      `;
      new mapboxgl.Marker(policeEl).setLngLat([-74.005, 40.7145]).addTo(map);

      // Ambulance AMB-07
      const ambEl = document.createElement('div');
      ambEl.innerHTML = `
        <div style="background: #0f172a; color: #38bdf8; border: 1.5px solid #0284c7; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: bold; font-family: monospace; box-shadow: 0 2px 5px rgba(0,0,0,0.8);">
          🚑 AMB-07
        </div>
      `;
      new mapboxgl.Marker(ambEl).setLngLat([-74.007, 40.712]).addTo(map);

      // Road Blocked Warning
      const roadBlockEl = document.createElement('div');
      roadBlockEl.innerHTML = `
        <div style="background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; padding: 1px 4px; border-radius: 2px; font-size: 8px; font-weight: 900; font-family: monospace;">
          ⊗ ROAD BLOCKED
        </div>
      `;
      new mapboxgl.Marker(roadBlockEl).setLngLat([-74.008, 40.714]).addTo(map);
    });

    return () => map.remove();
  }, []);

  return (
    <div className="relative w-full h-[480px] rounded border-4 border-[#2b170c] overflow-hidden shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};