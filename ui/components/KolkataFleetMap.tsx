import React, { useEffect, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';
import { 
  KOLKATA_FLEET_NODES, 
  KOLKATA_EDGES, 
  BidiRouteResult, 
  KolkataNode 
} from '../utils/bidirectionalAStar';

interface Props {
  selectedUnit: string;
  destination: string;
  routeResult: BidiRouteResult | null;
  blockedRoads?: string[];
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

export const KolkataFleetMap: React.FC<Props> = ({
  selectedUnit,
  destination,
  routeResult,
  blockedRoads = ['Road_B2'],
  onSelectNode,
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const LRef = useRef<typeof LeafletType | null>(null);

  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
  const roadsLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const routeLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const hazardsLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [activeTile, setActiveTile] = useState<'dark' | 'satellite' | 'street'>('dark');
  const [zoomLevel, setZoomLevel] = useState(13);

  // Determine vehicle emoji and type
  const getUnitIcon = (unitId: string) => {
    if (unitId.includes('AMB')) return '🚑';
    if (unitId.includes('FIRE')) return '🚒';
    if (unitId.includes('POL')) return '🚓';
    return '🚨';
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import('leaflet');
      if (!isMounted || !mapContainerRef.current) return;
      LRef.current = L;

      // Base coordinates: Central Kolkata
      const center: [number, number] = [22.5650, 88.3650];
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      // Free OpenStreetMap Tiles with Tactical Dark Filter (100% key-free)
      const darkTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        className: 'tactical-dark-tiles',
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      tileLayerRef.current = darkTiles;

      // Overlays
      roadsLayerRef.current = L.layerGroup().addTo(map);
      hazardsLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      // Multiple resize recalculations as layout settles
      [50, 150, 300, 600, 1200].forEach((delay) => {
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, delay);
      });

      // ResizeObserver
      if (typeof window !== 'undefined' && 'ResizeObserver' in window && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          if (map) map.invalidateSize();
        });
        ro.observe(mapContainerRef.current);
      }
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

  // 2. Render Road Network, Hazard Roadblocks, and Landmarks
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    // A. Render Base Road Network
    if (roadsLayerRef.current) {
      roadsLayerRef.current.clearLayers();

      KOLKATA_EDGES.forEach((edge) => {
        const isBlocked = blockedRoads.includes(edge.roadId);
        const nFrom = KOLKATA_FLEET_NODES[edge.from];
        const nTo = KOLKATA_FLEET_NODES[edge.to];
        if (!nFrom || !nTo) return;

        const coords: [number, number][] = edge.geometry || [
          [nFrom.lat, nFrom.lng],
          [nTo.lat, nTo.lng]
        ];

        // Background Arterial Line
        const roadLine = L.polyline(coords, {
          color: isBlocked ? '#EF4444' : '#27272A',
          weight: isBlocked ? 3.5 : 2.5,
          dashArray: isBlocked ? '5, 5' : undefined,
          opacity: isBlocked ? 0.8 : 0.65,
        });

        roadLine.bindTooltip(
          `<div class="text-[10px] font-mono font-bold ${isBlocked ? 'text-[#EF4444]' : 'text-[#A1A1AA]'}">
            ${isBlocked ? '⛔ BLOCKED: ' : '🛣️ '}${edge.roadName} (${edge.roadId})
          </div>`,
          { className: 'tactical-leaflet-tooltip', sticky: true }
        );

        roadLine.addTo(roadsLayerRef.current!);
      });
    }

    // B. Render Markers and Waypoints
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      const originNodeId = routeResult?.origin || (selectedUnit.includes('12') || selectedUnit.includes('POL') ? 'Station_South' : 'Station_North');
      const targetNodeId = routeResult?.destination || destination;
      const meetingNodeId = routeResult?.metrics?.meetingNode;

      Object.entries(KOLKATA_FLEET_NODES).forEach(([nodeId, node]) => {
        const isOrigin = nodeId === originNodeId;
        const isDestination = nodeId === targetNodeId;
        const isMeeting = nodeId === meetingNodeId && !isOrigin && !isDestination;
        const isTraversed = routeResult?.waypoints?.includes(nodeId);

        let iconHtml = '';
        let iconSize: [number, number] = [32, 32];
        let iconAnchor: [number, number] = [16, 16];

        if (isOrigin) {
          iconHtml = `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-2 rounded-full bg-[#3B82F6]/30 animate-ping"></div>
              <div class="h-9 w-9 rounded-full bg-[#3B82F6] border-2 border-white text-white flex items-center justify-center shadow-lg shadow-[#3B82F6]/50 text-sm font-bold">
                ${getUnitIcon(selectedUnit)}
              </div>
              <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-black/90 border border-[#3B82F6] text-[9px] font-mono font-bold text-white whitespace-nowrap shadow">
                ${selectedUnit} (ORIGIN)
              </div>
            </div>
          `;
          iconSize = [36, 36];
          iconAnchor = [18, 18];
        } else if (isDestination) {
          iconHtml = `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-2 rounded-full bg-[#10B981]/30 animate-ping"></div>
              <div class="h-9 w-9 rounded-full bg-[#10B981] border-2 border-white text-white flex items-center justify-center shadow-lg shadow-[#10B981]/50 text-sm font-bold animate-bounce">
                🎯
              </div>
              <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-black/90 border border-[#10B981] text-[9px] font-mono font-bold text-[#10B981] whitespace-nowrap shadow">
                TARGET: ${node.name.split('(')[0].trim()}
              </div>
            </div>
          `;
          iconSize = [36, 36];
          iconAnchor = [18, 18];
        } else if (isMeeting) {
          iconHtml = `
            <div class="relative flex items-center justify-center">
              <div class="h-8 w-8 rounded-lg rotate-45 bg-[#8B5CF6] border-2 border-white text-white flex items-center justify-center shadow-lg shadow-[#8B5CF6]/50 text-xs font-bold animate-pulse">
                <span class="-rotate-45">⚡</span>
              </div>
              <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-black/90 border border-[#8B5CF6] text-[8px] font-mono font-bold text-[#C4B5FD] whitespace-nowrap shadow">
                BIDI-A* INTERSECT
              </div>
            </div>
          `;
          iconSize = [32, 32];
          iconAnchor = [16, 16];
        } else if (isTraversed) {
          iconHtml = `
            <div class="h-6 w-6 rounded-full bg-[#3B82F6]/20 border-2 border-[#3B82F6] text-[#3B82F6] flex items-center justify-center text-[10px] font-bold shadow">
              ●
            </div>
          `;
          iconSize = [24, 24];
          iconAnchor = [12, 12];
        } else {
          // Subtle default landmark pin
          let badge = '📍';
          if (node.type === 'hospital') badge = '🏥';
          else if (node.type === 'incident') badge = '⚠️';
          else if (node.type === 'depot') badge = '🏢';
          else if (node.type === 'evac') badge = '🛡️';

          iconHtml = `
            <div class="group relative cursor-pointer flex flex-col items-center">
              <div class="h-6 w-6 rounded-full bg-[#18181B] border border-[#3F3F46] text-white/80 flex items-center justify-center text-[10px] transition-transform hover:scale-125 shadow">
                ${badge}
              </div>
            </div>
          `;
          iconSize = [24, 24];
          iconAnchor = [12, 12];
        }

        const customIcon = L.divIcon({
          className: 'tactical-div-icon',
          html: iconHtml,
          iconSize: iconSize,
          iconAnchor: iconAnchor,
        });

        const marker = L.marker([node.lat, node.lng], { icon: customIcon });

        // Popup details
        marker.bindPopup(`
          <div class="tactical-leaflet-popup p-1 font-mono text-[11px]">
            <div class="font-bold text-white mb-1 flex items-center gap-1.5">
              <span>${node.name}</span>
            </div>
            <div class="text-[#A1A1AA] text-[10px] mb-2 leading-relaxed">
              ${node.description || 'Kolkata Emergency Sector Node'}
            </div>
            <div class="text-[9px] text-[#71717A] border-t border-white/10 pt-1">
              LAT: ${node.lat.toFixed(4)} | LNG: ${node.lng.toFixed(4)}
            </div>
          </div>
        `, { className: 'tactical-leaflet-popup-wrapper' });

        if (onSelectNode) {
          marker.on('click', () => {
            onSelectNode(nodeId);
          });
        }

        marker.addTo(markersLayerRef.current!);
      });
    }

    // C. Render Calculated Route Polyline
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();

      if (routeResult && routeResult.coordinates && routeResult.coordinates.length > 1) {
        // Glowing Halo Outer Line
        const haloPolyline = L.polyline(routeResult.coordinates, {
          color: 'rgba(59, 130, 246, 0.4)',
          weight: 10,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerRef.current);

        // Core Active Tactical Corridor (Dashed Pulse)
        const corePolyline = L.polyline(routeResult.coordinates, {
          color: '#3B82F6',
          weight: 4,
          dashArray: '8, 6',
          lineCap: 'round',
          lineJoin: 'round',
          className: 'animate-pulse'
        }).addTo(routeLayerRef.current);

        // Automatically frame map view to route bounds
        try {
          const bounds = corePolyline.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
          }
        } catch (e) {
          // Ignore bound computation on hidden DOM
        }
      }
    }

  }, [mapReady, selectedUnit, destination, routeResult, blockedRoads]);

  // 3. Tile Theme Switcher
  const toggleTileTheme = () => {
    if (!mapInstanceRef.current || !tileLayerRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    map.removeLayer(tileLayerRef.current);

    if (activeTile === 'dark') {
      const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '&copy; Esri World Imagery'
      }).addTo(map);
      tileLayerRef.current = satLayer;
      setActiveTile('satellite');
    } else if (activeTile === 'satellite') {
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      tileLayerRef.current = streetLayer;
      setActiveTile('street');
    } else {
      const darkLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        className: 'tactical-dark-tiles',
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      tileLayerRef.current = darkLayer;
      setActiveTile('dark');
    }
  };

  // Center on Kolkata / Route
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !routeResult?.coordinates) return;
    if (routeResult.coordinates.length > 1 && LRef.current) {
      const bounds = LRef.current.latLngBounds(routeResult.coordinates);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      mapInstanceRef.current.setView([22.5650, 88.3650], 13);
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[460px] overflow-hidden rounded-2xl bg-[#09090B] border border-[#27272A] ${className}`}>
      {/* Map DOM Canvas */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full min-h-[460px]" 
        style={{ width: '100%', height: '100%', minHeight: '460px', position: 'relative' }} 
      />

      {/* Floating Tactical HUD Info Overlay (Top Left) */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 border border-[#3B82F6]/40 backdrop-blur-md shadow-lg pointer-events-auto">
            <span className="h-2 w-2 rounded-full bg-[#3B82F6] animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-wider text-white">
              KOLKATA FLEET TACTICAL GRID • BIDI-A* ACTIVE
            </span>
          </div>

          <button
            onClick={toggleTileTheme}
            className="px-2.5 py-1.5 rounded-xl bg-black/80 border border-white/10 text-[10px] font-bold text-[#A1A1AA] hover:text-white backdrop-blur-md transition shadow-lg pointer-events-auto"
            title="Toggle Tile Style"
          >
            {activeTile === 'dark' ? '🛰️ SATELLITE' : (activeTile === 'satellite' ? '🗺️ STREET' : '🕶️ TACTICAL DARK')}
          </button>

          <button
            onClick={handleRecenter}
            className="px-2.5 py-1.5 rounded-xl bg-black/80 border border-white/10 text-[10px] font-bold text-[#A1A1AA] hover:text-white backdrop-blur-md transition shadow-lg pointer-events-auto"
            title="Recenter Route"
          >
            🎯 CENTER
          </button>
        </div>

        {/* Real-time Bidirectional A* Live Algorithm Telemetry Card */}
        {routeResult && (
          <div className="bg-black/90 border border-white/15 rounded-xl p-2.5 backdrop-blur-md shadow-xl text-white font-mono max-w-[280px] pointer-events-auto space-y-1.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[9px] text-[#A1A1AA]">
              <span>ALGORITHM</span>
              <span className="text-[#3B82F6] font-bold">BIDIRECTIONAL A*</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-[8px] text-[#71717A] block">REAL ROAD DISTANCE</span>
                <span className="text-[#10B981] font-bold text-sm">{routeResult.distanceKm} KM</span>
              </div>
              <div>
                <span className="text-[8px] text-[#71717A] block">ESTIMATED TRAVEL</span>
                <span className="text-[#F59E0B] font-bold text-sm">{routeResult.etaMinutes} MINS</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-1 text-[9px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-[#71717A]">Meeting Node:</span>
                <span className="text-[#C4B5FD] font-bold truncate max-w-[130px]">
                  {routeResult.metrics?.meetingNode || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Nodes Expanded:</span>
                <span className="text-white">
                  F: {routeResult.metrics?.nodesExpandedForward ?? 0} | B: {routeResult.metrics?.nodesExpandedBackward ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Compute Time:</span>
                <span className="text-[#10B981]">
                  {routeResult.metrics?.searchTimeMs ?? 0.1} ms
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend & Zoom Indicator (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded-lg bg-black/85 border border-white/10 text-[9px] font-mono text-[#A1A1AA] backdrop-blur-md shadow flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-[#3B82F6] rounded-full" /> Bidi-A* Corridor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Hazard Block
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> Meeting Point
          </span>
          <span className="border-l border-white/15 pl-1.5 text-[#71717A]">
            ZOOM {zoomLevel}×
          </span>
        </div>
      </div>
    </div>
  );
};

export default KolkataFleetMap;
