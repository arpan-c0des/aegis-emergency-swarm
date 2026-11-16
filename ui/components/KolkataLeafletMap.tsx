import React, { useEffect, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';

interface Props {
  worldState?: any;
  theme?: 'tactical' | 'clay';
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
  activeLayers?: Set<string>;
  zoomLevel?: number;
  cameraPreset?: string;
  hideInternalOverlays?: boolean;
  onSelectIncident?: (incidentId: string) => void;
}

// Precise Kolkata Landmark Coordinates (WGS84 Lat/Lng)
export const KOLKATA_COORDS: Record<string, [number, number]> = {
  // Sector 6B - Central / Esplanade Subway concourse & Transit Hub
  Sector_6B: [22.5658, 88.3512],
  Building_C: [22.5658, 88.3512],

  // Sector 5C - Salt Lake Sector V Industrial & Electronics Tech Hub
  Sector_5C: [22.5797, 88.4312],
  Building_A: [22.5797, 88.4312],

  // Hospitals
  H1_Central: [22.5411, 88.3426], // SSKM Hospital / IPGMER Central Trauma
  H1: [22.5411, 88.3426],
  H2_West: [22.5714, 88.4068],    // St. Luke's Clinic / Apollo Gleneagles
  H2: [22.5714, 88.4068],

  // Emergency Depots & Assembly
  Station_North: [22.5992, 88.3685], // Shyambazar Emergency Depot
  Station_South: [22.5298, 88.3431], // Alipore Emergency Depot
  Evac_Zone: [22.5535, 88.3485],     // Maidan Brigade Parade Grounds / Red Road
};

// Kolkata Road Corridors (Waypoints)
const KOLKATA_ROADS: Record<string, [number, number][]> = {
  Road_D4: [
    [22.5820, 88.3610],
    [22.5730, 88.3565],
    [22.5658, 88.3512],
  ], // Central Avenue corridor to Esplanade
  Road_A1: [
    [22.5850, 88.4200],
    [22.5797, 88.4312],
    [22.5590, 88.4010],
  ], // EM Bypass Salt Lake corridor
  Road_B2: [
    [22.5411, 88.3426],
    [22.5450, 88.3620],
    [22.5520, 88.3750],
  ], // AJC Bose Road Flyover
  Road_C3: [
    [22.5850, 88.3480],
    [22.5720, 88.3440],
    [22.5580, 88.3410],
  ], // Strand Road / Hooghly Riverbank corridor
  Road_E5: [
    [22.5520, 88.3750],
    [22.5480, 88.3980],
    [22.5550, 88.4120],
  ], // Maa Flyover / Park Circus connector
};

export const KolkataLeafletMap: React.FC<Props> = ({
  worldState,
  theme = 'tactical',
  isTheaterMode = false,
  onToggleTheater,
  activeLayers,
  zoomLevel = 1.0,
  cameraPreset = 'overview',
  hideInternalOverlays = true,
  onSelectIncident
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const LRef = useRef<typeof LeafletType | null>(null);

  // Layer groups
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const routesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const roadsLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const hazardsLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [activeTile, setActiveTile] = useState<'dark' | 'street'>('dark');
  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);

  // 1. Initialize Leaflet Map Centered on Kolkata
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import('leaflet');
      if (!isMounted || !mapContainerRef.current) return;
      LRef.current = L;

      // Base coordinates: Central Kolkata
      const center: [number, number] = [22.5680, 88.3680];
      const initialZoom = 13;

      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Dark Tactical Tile Layer (CartoDB Dark Matter)
      const darkTiles = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }
      ).addTo(map);

      tileLayerRef.current = darkTiles;

      // Dedicated overlay layer groups
      roadsLayerRef.current = L.layerGroup().addTo(map);
      hazardsLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      // Force resize calculation after DOM paint
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 250);
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Camera Preset Controller
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const map = mapInstanceRef.current;

    switch (cameraPreset) {
      case 'overview':
        map.flyTo([22.5680, 88.3750], 13, { duration: 1.2 });
        break;
      case 'sector_5c':
        map.flyTo([22.5797, 88.4312], 15, { duration: 1.2 });
        break;
      case 'sector_6b':
        map.flyTo([22.5658, 88.3512], 15, { duration: 1.2 });
        break;
      case 'hospital':
        map.flyTo([22.5411, 88.3426], 15, { duration: 1.2 });
        break;
      case 'topdown':
        map.flyTo([22.5650, 88.3650], 12, { duration: 1.2 });
        break;
    }
  }, [cameraPreset, mapReady]);

  // 3. Zoom Level Controller
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const map = mapInstanceRef.current;
    if (zoomLevel && zoomLevel !== 1.0) {
      const baseZoom = 13;
      const targetZoom = Math.round(baseZoom + (zoomLevel - 1.0) * 3);
      map.setZoom(Math.max(10, Math.min(18, targetZoom)));
    }
  }, [zoomLevel, mapReady]);

  // 4. Render Simulated Incidents, Fleets, Hospitals, and Corridors on Kolkata Map
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    // Clear previous dynamic layers
    hazardsLayerRef.current?.clearLayers();
    markersLayerRef.current?.clearLayers();
    routesLayerRef.current?.clearLayers();
    roadsLayerRef.current?.clearLayers();

    const shouldShow = (layerName: string) => !activeLayers || activeLayers.has(layerName);

    // =========================================================================
    // A. ROAD CORRIDORS & BARRICADES
    // =========================================================================
    const roadsState = worldState?.roads || { Road_D4: "blocked" };
    Object.entries(KOLKATA_ROADS).forEach(([roadId, latLngs]) => {
      const isBlocked = roadsState[roadId] === 'blocked';
      
      if (isBlocked && shouldShow('ROAD BARRICADE')) {
        // Red glowing barrier for blocked corridor
        const polyline = L.polyline(latLngs, {
          color: '#EF4444',
          weight: 6,
          dashArray: '8, 8',
          opacity: 0.9,
          className: 'animate-pulse'
        });

        polyline.bindTooltip(
          `<div class="font-mono text-[10px] font-bold text-red-400">⛔ ${roadId.replace('_', ' ')}: BLOCKED (DEBRIS)</div>`,
          { sticky: true, className: 'tactical-leaflet-tooltip' }
        );

        roadsLayerRef.current?.addLayer(polyline);

        // Midpoint barricade marker
        const midIdx = Math.floor(latLngs.length / 2);
        const midPoint = latLngs[midIdx];
        const barIcon = L.divIcon({
          className: 'tactical-div-icon',
          html: `<div class="flex items-center justify-center w-7 h-7 rounded-lg bg-red-600/90 border border-red-400 text-white font-bold text-[11px] shadow-[0_0_12px_rgba(239,68,68,0.6)]">⛔</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        const barMarker = L.marker(midPoint, { icon: barIcon });
        roadsLayerRef.current?.addLayer(barMarker);

      } else {
        // Clear emergency transit corridor
        const polyline = L.polyline(latLngs, {
          color: '#10B981',
          weight: 3.5,
          opacity: 0.45,
          dashArray: '4, 4'
        });
        polyline.bindTooltip(
          `<div class="font-mono text-[9px] text-emerald-400">✓ ${roadId.replace('_', ' ')}: CLEAR</div>`,
          { sticky: true, className: 'tactical-leaflet-tooltip' }
        );
        roadsLayerRef.current?.addLayer(polyline);
      }
    });

    // =========================================================================
    // B. SIMULATED INCIDENTS & HAZARDS
    // =========================================================================
    if (shouldShow('ACTIVE HAZARD')) {
      const incidents = worldState?.incidents || {
        INC_01: {
          id: "INC_01",
          incident_type: "collision",
          location: "Sector_6B",
          severity: "critical",
          active: true,
          details: "Multi-vehicle collision & subway concourse pressure breach."
        }
      };

      Object.entries(incidents).forEach(([incId, inc]: [string, any]) => {
        if (!inc.active || inc.severity === 'extinguished') return;

        const coords = KOLKATA_COORDS[inc.location] || KOLKATA_COORDS['Sector_6B'];
        const isCritical = inc.severity?.toLowerCase() === 'critical';
        const color = isCritical ? '#EF4444' : '#F59E0B';

        // Outer Pulsing Hazard Ring
        const circle = L.circle(coords, {
          radius: isCritical ? 340 : 220,
          color: color,
          fillColor: color,
          fillOpacity: 0.18,
          weight: 2,
          className: 'hazard-pulse-ring'
        });
        hazardsLayerRef.current?.addLayer(circle);

        // Core Incident Icon Marker
        const iconHtml = `
          <div class="relative flex items-center justify-center w-10 h-10">
            <span class="absolute inline-flex h-full w-full rounded-full ${isCritical ? 'bg-red-500/30' : 'bg-amber-500/30'} animate-ping"></span>
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${isCritical ? 'bg-red-600 border-2 border-red-300' : 'bg-amber-600 border-2 border-amber-300'} text-white shadow-xl shadow-red-900/60 font-bold text-sm">
              ${inc.incident_type?.toLowerCase().includes('fire') ? '🔥' : (inc.incident_type?.toLowerCase().includes('flood') ? '🌊' : '⚠️')}
            </div>
          </div>
        `;

        const incIcon = L.divIcon({
          className: 'tactical-div-icon',
          html: iconHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const incMarker = L.marker(coords, { icon: incIcon });
        incMarker.bindPopup(`
          <div class="p-2 min-w-[210px] font-sans">
            <div class="flex items-center justify-between pb-1 border-b border-zinc-700">
              <span class="text-[10px] font-mono font-bold text-red-400 uppercase">${inc.id} • ${inc.severity}</span>
              <span class="text-[9px] bg-red-950/80 border border-red-500/40 text-red-300 px-1.5 py-0.5 rounded font-bold">KOLKATA SECTOR</span>
            </div>
            <p class="text-xs font-bold text-white mt-1.5">${inc.incident_type?.toUpperCase()} @ ${inc.location?.replace('_', ' ')}</p>
            <p class="text-[11px] text-zinc-300 mt-1 leading-snug">${inc.details || "Casualty stabilization in progress. Responding units en-route."}</p>
            <div class="mt-2 pt-1 border-t border-zinc-800 flex items-center justify-between text-[9px] text-zinc-400 font-mono">
              <span>PRIORITY TRIAGE</span>
              <span class="text-amber-400">ACTIVE DISPATCH</span>
            </div>
          </div>
        `, { className: 'tactical-leaflet-popup' });

        incMarker.on('click', () => {
          if (onSelectIncident) onSelectIncident(inc.id);
        });

        hazardsLayerRef.current?.addLayer(incMarker);
      });
    }

    // =========================================================================
    // C. EVACUATION ZONE (MAIDAN BRIGADE GROUNDS)
    // =========================================================================
    if (shouldShow('EVAC ZONE')) {
      const evacCenter = KOLKATA_COORDS['Evac_Zone'];
      const evacCircle = L.circle(evacCenter, {
        radius: 380,
        color: '#8B5CF6',
        fillColor: '#8B5CF6',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5'
      });
      hazardsLayerRef.current?.addLayer(evacCircle);

      const evacIcon = L.divIcon({
        className: 'tactical-div-icon',
        html: `
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/90 border border-purple-400 text-purple-300 text-[10px] font-bold shadow-lg shadow-purple-950/50 whitespace-nowrap">
            <span>🛡️</span>
            <span>EVAC STATION 2</span>
          </div>
        `,
        iconSize: [120, 24],
        iconAnchor: [60, 12]
      });
      const evacMarker = L.marker(evacCenter, { icon: evacIcon });
      evacMarker.bindTooltip(
        `<div class="font-mono text-[10px] text-purple-300">CIVILIAN SAFE ASSEMBLY ZONE (MAIDAN)</div>`,
        { sticky: true, className: 'tactical-leaflet-tooltip' }
      );
      hazardsLayerRef.current?.addLayer(evacMarker);
    }

    // =========================================================================
    // D. HOSPITALS (SSKM H1 & ST LUKE'S H2)
    // =========================================================================
    const hospitalsState = worldState?.hospitals || {
      H1: { name: "Central Trauma (SSKM)", available_beds: 28 },
      H2: { name: "St. Luke's Clinic", available_beds: 12 }
    };

    // H1 Central Trauma (SSKM Hospital)
    const h1Coords = KOLKATA_COORDS['H1_Central'];
    const h1Beds = hospitalsState.H1?.available_beds ?? 28;
    const h1Icon = L.divIcon({
      className: 'tactical-div-icon',
      html: `
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/95 border border-emerald-400/80 text-white shadow-xl shadow-emerald-950/60 font-mono text-[10px] whitespace-nowrap font-bold">
          <span class="text-emerald-400">🏥</span>
          <span>SSKM H1</span>
          <span class="text-emerald-300 bg-emerald-900/60 px-1 py-0.2 rounded">${h1Beds}/37</span>
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [55, 13]
    });
    const h1Marker = L.marker(h1Coords, { icon: h1Icon });
    h1Marker.bindPopup(`
      <div class="p-2 font-sans">
        <p class="text-xs font-bold text-white">CENTRAL TRAUMA HOSPITAL (SSKM / IPGMER)</p>
        <p class="text-[11px] text-emerald-400 font-mono mt-1 font-semibold">${h1Beds} ICU / Trauma Beds Available</p>
        <p class="text-[10px] text-zinc-400 mt-0.5">Primary Tier-1 Emergency Receiving Facility • Generator Nominal</p>
      </div>
    `, { className: 'tactical-leaflet-popup' });
    markersLayerRef.current?.addLayer(h1Marker);

    // H2 St. Luke's Clinic (EM Bypass)
    const h2Coords = KOLKATA_COORDS['H2_West'];
    const h2Beds = hospitalsState.H2?.available_beds ?? 12;
    const h2Icon = L.divIcon({
      className: 'tactical-div-icon',
      html: `
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/95 border border-blue-400/80 text-white shadow-xl shadow-blue-950/60 font-mono text-[10px] whitespace-nowrap font-bold">
          <span class="text-blue-400">🏥</span>
          <span>CLINIC H2</span>
          <span class="text-blue-300 bg-blue-900/60 px-1 py-0.2 rounded">${h2Beds}/29</span>
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [55, 13]
    });
    const h2Marker = L.marker(h2Coords, { icon: h2Icon });
    h2Marker.bindPopup(`
      <div class="p-2 font-sans">
        <p class="text-xs font-bold text-white">ST. LUKE'S CLINIC (EM BYPASS)</p>
        <p class="text-[11px] text-blue-400 font-mono mt-1 font-semibold">${h2Beds} Stabilization Beds Free</p>
        <p class="text-[10px] text-zinc-400 mt-0.5">Secondary Triage & Non-Critical Stabilization Hub</p>
      </div>
    `, { className: 'tactical-leaflet-popup' });
    markersLayerRef.current?.addLayer(h2Marker);

    // =========================================================================
    // E. EMERGENCY FLEET UNITS & TACTICAL ROUTING LINES
    // =========================================================================
    const units = worldState?.units || {
      "AMB-07": { callsign: "AMB-07", unit_type: "ambulance", location: "Sector_6B", assigned_target: "H1_Central", fuel_remaining_minutes: 74 },
      "AMB-12": { callsign: "AMB-12", unit_type: "ambulance", location: "Station_North", assigned_target: "Sector_6B", fuel_remaining_minutes: 82 },
      "FIRE-03": { callsign: "FIRE-03", unit_type: "fire_truck", location: "Station_North", assigned_target: "Sector_5C", fuel_remaining_minutes: 68 },
      "POL-02": { callsign: "POL-02", unit_type: "police_cruiser", location: "Station_South", assigned_target: "Sector_6B", fuel_remaining_minutes: 90 }
    };

    Object.entries(units).forEach(([unitId, u]: [string, any]) => {
      const isAmb = u.unit_type === 'ambulance';
      const isFire = u.unit_type === 'fire_truck';
      const isPol = u.unit_type === 'police_cruiser';

      if (isAmb && !shouldShow('AMBULANCE')) return;
      if (isFire && !shouldShow('FIRE ENGINE')) return;
      if (isPol && !shouldShow('POLICE CRUISER')) return;

      const locCoords = KOLKATA_COORDS[u.location] || KOLKATA_COORDS['Station_North'];
      const targetCoords = KOLKATA_COORDS[u.assigned_target] || locCoords;

      const badgeColor = isAmb ? 'bg-red-600' : (isFire ? 'bg-amber-600' : 'bg-blue-600');
      const badgeBorder = isAmb ? 'border-red-400' : (isFire ? 'border-amber-400' : 'border-blue-400');
      const emoji = isAmb ? '🚑' : (isFire ? '🚒' : '🚓');

      // Live Unit Marker
      const unitIcon = L.divIcon({
        className: 'tactical-div-icon',
        html: `
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-full ${badgeColor} border ${badgeBorder} text-white font-mono text-[9px] font-bold shadow-lg shadow-black/80 whitespace-nowrap">
            <span>${emoji}</span>
            <span>${u.callsign || unitId}</span>
          </div>
        `,
        iconSize: [85, 22],
        iconAnchor: [42, 11]
      });

      const unitMarker = L.marker(locCoords, { icon: unitIcon });
      unitMarker.bindTooltip(
        `<div class="font-mono text-[9px] text-white">
          <b>${u.callsign || unitId}</b> (${u.unit_type})<br/>
          Fuel: ${u.fuel_remaining_minutes || 75}m • Target: ${u.assigned_target?.replace('_', ' ') || 'Standby'}
        </div>`,
        { sticky: true, className: 'tactical-leaflet-tooltip' }
      );
      markersLayerRef.current?.addLayer(unitMarker);

      // Unit Tactical Route Vector to Target
      if (locCoords[0] !== targetCoords[0] || locCoords[1] !== targetCoords[1]) {
        const routeLine = L.polyline([locCoords, targetCoords], {
          color: isAmb ? '#EF4444' : (isFire ? '#F59E0B' : '#3B82F6'),
          weight: 2.5,
          opacity: 0.7,
          dashArray: '6, 6'
        });
        routesLayerRef.current?.addLayer(routeLine);
      }
    });

  }, [worldState, activeLayers, mapReady]);

  // 5. Toggle Tile Theme (Tactical Dark vs Street)
  const toggleTileTheme = () => {
    if (!mapInstanceRef.current || !tileLayerRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    map.removeLayer(tileLayerRef.current);

    if (activeTile === 'dark') {
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      tileLayerRef.current = streetLayer;
      setActiveTile('street');
    } else {
      const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);
      tileLayerRef.current = darkLayer;
      setActiveTile('dark');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[460px] overflow-hidden rounded-2xl bg-[#09090B]">
      {/* Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Tactical HUD Info Overlay on Top Left */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="font-mono text-[10px] font-bold text-white tracking-wider">
            KOLKATA SECTOR C2 // LEAFLET TACTICAL MESH
          </span>
          <span className="text-[9px] text-[#A1A1AA] border-l border-white/10 pl-2">
            22.5726° N, 88.3639° E
          </span>
        </div>

        {/* Map Tile Mode Switcher */}
        <button
          onClick={toggleTileTheme}
          className="px-2.5 py-1.5 rounded-xl bg-black/80 border border-white/10 text-[10px] font-bold text-[#A1A1AA] hover:text-white backdrop-blur-md transition shadow-lg pointer-events-auto"
          title="Toggle Tile Style"
        >
          {activeTile === 'dark' ? '🗺️ SATELLITE / STREET' : '🕶️ TACTICAL DARK'}
        </button>
      </div>

      {/* Map Scale & Grid Status (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-[400] pointer-events-none hidden sm:block">
        <div className="px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-[9px] font-mono text-[#71717A] backdrop-blur-md">
          ZOOM {zoomLevel.toFixed(1)}× • CARTO/OSM KOLKATA
        </div>
      </div>
    </div>
  );
};
