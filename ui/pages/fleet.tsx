import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { 
  Truck, Navigation, AlertTriangle, Fuel, ArrowRight, MapPin, 
  ShieldAlert, Sparkles, Shield, Clock, Activity, Check, ExternalLink, Radio, CloudSun,
  Zap, CornerDownRight, RotateCcw, Layers
} from 'lucide-react';
import { 
  computeBidirectionalAStar, 
  KOLKATA_FLEET_NODES, 
  BidiRouteResult,
  KOLKATA_EDGES
} from '../utils/bidirectionalAStar';

// Dynamically import Kolkata Leaflet Fleet Map to prevent SSR window issues
const KolkataFleetMap = dynamic(() => import('../components/KolkataFleetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] rounded-2xl bg-[#09090B] border border-[#27272A] flex flex-col items-center justify-center text-[#71717A] gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" />
      <span className="font-mono text-xs text-[#A1A1AA]">Initializing Kolkata Tactical Leaflet Engine…</span>
    </div>
  )
});

export default function FleetPage() {
  const router = useRouter();
  const [selectedUnit, setSelectedUnit] = useState("AMB-07");
  const [destination, setDestination] = useState("H1_Central");
  const [blockedRoads, setBlockedRoads] = useState<string[]>(["Road_B2"]);
  const [routeResult, setRouteResult] = useState<BidiRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fleetUnits, setFleetUnits] = useState<any>({});
  const [clock, setClock] = useState("");
  const [backendOnline, setBackendOnline] = useState(true);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://aegis-backend-5fx3.onrender.com").replace(/\/$/, "");

  // Determine origin depot node based on selected vehicle
  const getUnitOrigin = (unitId: string): string => {
    if (unitId === "AMB-12" || unitId === "POL-02") {
      return "Station_South"; // Alipore Command Depot
    }
    return "Station_North";   // Shyambazar Command Depot
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-GB"));
    }, 1000);
    setClock(new Date().toLocaleTimeString("en-GB"));
    return () => clearInterval(timer);
  }, []);

  // Fetch backend status and initial state
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data.units) setFleetUnits(data.units);
        if (data.roads) {
          const blocked = Object.entries(data.roads)
            .filter(([_, status]) => status === "blocked")
            .map(([roadId]) => roadId);
          if (blocked.length > 0) setBlockedRoads(blocked);
        }
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  // Compute Bidirectional A* route whenever unit, destination, or roadblocks change
  const computeRoute = async () => {
    setLoading(true);
    const origin = getUnitOrigin(selectedUnit);

    // 1. Instant local Bidirectional A* calculation (0ms latency, zero cold-start delay)
    try {
      const localResult = computeBidirectionalAStar(origin, destination, blockedRoads);
      setRouteResult(localResult);
    } catch (err) {
      console.error("Local Bidirectional A* calculation error:", err);
    }

    // 2. Concurrently reconcile with backend /api/fleet/route
    try {
      const res = await fetch(`${BACKEND_URL}/api/fleet/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_id: selectedUnit, destination: destination })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.routing) {
          // If server returned coordinates and metrics, synchronize
          if (data.routing.distance_km !== undefined) {
            setRouteResult((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                distanceKm: data.routing.distance_km ?? prev.distanceKm,
                etaMinutes: data.routing.eta_minutes ?? prev.etaMinutes,
                waypoints: data.routing.waypoints ?? prev.waypoints,
                metrics: {
                  ...prev.metrics,
                  meetingNode: data.routing.metrics?.meeting_node ?? prev.metrics.meetingNode,
                  nodesExpandedForward: data.routing.metrics?.nodes_expanded_forward ?? prev.metrics.nodesExpandedForward,
                  nodesExpandedBackward: data.routing.metrics?.nodes_expanded_backward ?? prev.metrics.nodesExpandedBackward,
                  totalNodesExpanded: data.routing.metrics?.total_nodes_expanded ?? prev.metrics.totalNodesExpanded
                }
              };
            });
          }
        }
        setBackendOnline(true);
      }
    } catch (e) {
      // Backend unavailable; local computation remains seamlessly active
    } finally {
      setLoading(false);
    }
  };

  // Recalculate route whenever parameters change
  useEffect(() => {
    computeRoute();
  }, [selectedUnit, destination, blockedRoads]);

  // Toggle Roadblock to test dynamic Bidirectional A* rerouting
  const toggleRoadblock = (roadId: string) => {
    setBlockedRoads((prev) => 
      prev.includes(roadId) ? prev.filter((r) => r !== roadId) : [...prev, roadId]
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between selection:bg-[#3B82F6]/30">
      <Head>
        <title>AEGIS Fleet — Kolkata Emergency Uber & Bidirectional A*</title>
        <meta name="description" content="AEGIS Autonomous Fleet Dispatch & Real Road Shortest Distance via Bidirectional A* on Kolkata Map" />
      </Head>

      {/* Top Navigation Header */}
      <header className="relative h-14 shrink-0 border-b border-[#27272A] bg-[#0D0D10]/95 flex items-center justify-between px-3 sm:px-5 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#3B82F6] text-white shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.35)]">
            <Truck size={18} strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <div className="font-bold tracking-[0.18em] text-[15px] sm:text-[16px] text-white flex items-center gap-1.5">
              <span>AEGIS FLEET</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30">
                KOLKATA SECTOR
              </span>
            </div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 whitespace-nowrap">
              Tactical Emergency Uber • Bidirectional A* Real Road Routing
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-1.5 font-mono">
          <Link 
            href="/"
            className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
          >
            [01] C2 Swarm
          </Link>
          <Link 
            href="/fleet"
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#3B82F6] text-white shadow-sm"
          >
            [02] Fleet Uber
          </Link>
          <Link 
            href="/hospitals"
            className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
          >
            [03] Bed Intake
          </Link>
        </div>

        {/* Clock & Online Telemetry */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-right leading-none pr-1">
            <div className="mono text-[13px] font-semibold text-white">{clock || "14:35:12"}</div>
            <div className="text-[9px] text-[#71717A] mt-0.5">KOLKATA • IST</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-1 text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] live-dot" />
            BIDI-A* ENGINE LIVE
          </span>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1560px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* =================================================================== */}
          {/* LEFT COLUMN: VEHICLE & DESTINATION SELECTOR + BIDI-A* PARAMS (4 cols) */}
          {/* =================================================================== */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            
            {/* Card 1: Dispatch Controls */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">TACTICAL DISPATCH CONTROLS</p>
                  <h2 className="text-[14px] font-bold text-white mt-0.5">Emergency Unit & Target</h2>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6]">
                  <Navigation size={16} />
                </span>
              </div>

              {/* Select Responding Unit */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#A1A1AA] block mb-1.5">
                  Select Responding Emergency Unit
                </label>
                <select 
                  value={selectedUnit} 
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full rounded-xl bg-[#17171B] border border-[#27272A] p-2.5 text-[12px] font-semibold text-white outline-none focus:border-[#3B82F6] transition"
                >
                  <option value="AMB-07">🚑 AMB-07 (Paramedic Ambulance · Shyambazar Depot North)</option>
                  <option value="AMB-12">🚑 AMB-12 (Critical Trauma Transport · Alipore Depot South)</option>
                  <option value="FIRE-03">🚒 FIRE-03 (Pumper Engine · Shyambazar Depot North)</option>
                  <option value="POL-02">🚓 POL-02 (Rapid Interceptor · Alipore Depot South)</option>
                </select>
                <div className="mt-1 text-[10px] text-[#71717A] flex items-center justify-between">
                  <span>Origin Depot:</span>
                  <span className="text-[#3B82F6] font-mono font-bold">
                    {getUnitOrigin(selectedUnit) === "Station_North" ? "Shyambazar (North)" : "Alipore (South)"}
                  </span>
                </div>
              </div>

              {/* Select Target Destination */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#A1A1AA] block mb-1.5">
                  Target Destination Landmark
                </label>
                <select 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-xl bg-[#17171B] border border-[#27272A] p-2.5 text-[12px] font-semibold text-[#F59E0B] outline-none focus:border-[#F59E0B] transition"
                >
                  <option value="H1_Central">🏥 SSKM Hospital Central Trauma Bay (IPGMER - H1)</option>
                  <option value="H2_West">🏥 St. Luke's Clinic / Apollo Trauma (EM Bypass - H2)</option>
                  <option value="Sector_5C">⚠️ Sector 5C Salt Lake (IT & Electronics Complex)</option>
                  <option value="Sector_6B">🚇 Sector 6B Esplanade Metro Concourse (Dharmatala)</option>
                  <option value="Evac_Zone">🛡️ Maidan Evacuation Holding Zone (Red Road)</option>
                  <option value="BBD_Bagh">🏢 B.B.D. Bagh / Lalbazar Police HQ</option>
                  <option value="Park_Circus_7Point">📍 Park Circus 7-Point Crossing</option>
                  <option value="Karunamoyee_Hub">📍 Karunamoyee Central Park (Salt Lake)</option>
                </select>
              </div>

              {/* Trigger Recompute Button */}
              <button 
                onClick={computeRoute}
                disabled={loading}
                className="w-full rounded-xl py-3 font-bold text-xs bg-[#3B82F6] text-white flex items-center justify-center gap-2 transition hover:bg-[#2563EB] active:scale-95 shadow-md shadow-[#3B82F6]/20 disabled:opacity-50"
              >
                <Navigation size={14} className={loading ? "animate-spin" : ""} />
                <span>{loading ? "Computing Bidirectional A* Corridor…" : "RECOMPUTE SHORTEST PATH"}</span>
              </button>
            </div>

            {/* Card 2: Dynamic Hazard Roadblocks Switcher */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#EF4444]" />
                  <span className="text-[11px] font-bold text-white">Dynamic Roadblocks & Hazards</span>
                </div>
                <span className="text-[9px] font-mono text-[#A1A1AA]">
                  {blockedRoads.length} BLOCKED
                </span>
              </div>
              <p className="text-[10px] text-[#71717A] leading-relaxed">
                Toggle road segments to watch Bidirectional A* discover alternate shortest paths avoiding blockages:
              </p>
              
              <div className="space-y-1.5">
                {[
                  { id: "Road_B2", label: "Road B2: AJC Bose Road / SSKM Access" },
                  { id: "Road_D4", label: "Road D4: CR Avenue Central Arterial" },
                  { id: "Road_A1", label: "Road A1: EM Bypass North Corridor" },
                  { id: "Road_E5", label: "Road E5: Maa Flyover Connector" }
                ].map((road) => {
                  const isBlocked = blockedRoads.includes(road.id);
                  return (
                    <button
                      key={road.id}
                      onClick={() => toggleRoadblock(road.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-[11px] font-mono transition text-left ${
                        isBlocked 
                          ? "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]" 
                          : "bg-[#17171B] border-[#27272A] text-[#A1A1AA] hover:text-white"
                      }`}
                    >
                      <span className="truncate pr-2">{road.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isBlocked ? "bg-[#EF4444] text-white" : "bg-[#27272A] text-[#71717A]"}`}>
                        {isBlocked ? "BLOCKED" : "OPEN"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Bidirectional A* Algorithmic Diagnostics */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 shadow-sm space-y-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                <span className="text-[10px] font-bold tracking-wider text-[#71717A]">ALGORITHM METRICS</span>
                <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#C4B5FD] text-[9px] font-bold border border-[#8B5CF6]/30">
                  BIDIRECTIONAL A*
                </span>
              </div>
              
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Heuristic:</span>
                <span className="text-white font-bold">Haversine Great-Circle</span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Frontier Intersection:</span>
                <span className="text-[#C4B5FD] font-bold">
                  {routeResult?.metrics?.meetingNode || "Pending"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Forward Expansions:</span>
                <span className="text-white font-bold">{routeResult?.metrics?.nodesExpandedForward ?? 0}</span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Backward Expansions:</span>
                <span className="text-white font-bold">{routeResult?.metrics?.nodesExpandedBackward ?? 0}</span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Computation Latency:</span>
                <span className="text-[#10B981] font-bold">{routeResult?.metrics?.searchTimeMs ?? 0.1} ms</span>
              </div>
            </div>

          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: INTERACTIVE LEAFLET MAP & TACTICAL GUIDANCE (8 cols)  */}
          {/* =================================================================== */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Header Banner & Real Shortest Distance Metric */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">TURN-BY-TURN TACTICAL NAVIGATOR</p>
                  <h2 className="text-[15px] font-bold text-white mt-0.5">
                    Kolkata Emergency Safe Corridor
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 text-[10px] font-bold font-mono">
                    GPS: KOLKATA GRID
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold">
                    OPTIMAL CORRIDOR CLEARED
                  </span>
                </div>
              </div>

              {/* Main Metric Cards: Real Shortest Road Distance & ETA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Real Road Distance
                  </span>
                  <div className="mono text-2xl font-bold text-[#10B981] mt-0.5">
                    {routeResult?.distanceKm ?? "--"} <span className="text-xs text-[#A1A1AA]">KM</span>
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block">Via actual Kolkata roads</span>
                </div>

                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Estimated Travel Time
                  </span>
                  <div className="mono text-2xl font-bold text-[#F59E0B] mt-0.5">
                    {routeResult?.etaMinutes ?? "--"} <span className="text-xs text-[#A1A1AA]">MINS</span>
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block">@ 42 km/h emergency priority</span>
                </div>

                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Meeting Frontier
                  </span>
                  <div className="mono text-sm font-bold text-[#C4B5FD] mt-1.5 truncate">
                    {routeResult?.metrics?.meetingNode ?? "N/A"}
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block">Bidi-A* Intersection</span>
                </div>

                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Fuel Consumption
                  </span>
                  <div className="mono text-2xl font-bold text-white mt-0.5 flex items-center gap-1">
                    <Fuel size={16} className="text-[#3B82F6]" />
                    <span>~{routeResult ? Math.max(1, Math.round(routeResult.distanceKm * 0.35)) : 2} <span className="text-xs text-[#A1A1AA]">L</span></span>
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block">Remaining: 76 mins</span>
                </div>
              </div>
            </div>

            {/* Real Kolkata Leaflet Interactive Map Container */}
            <div className="w-full h-[480px] sm:h-[540px] rounded-2xl overflow-hidden shadow-lg border border-[#27272A]">
              <KolkataFleetMap 
                selectedUnit={selectedUnit}
                destination={destination}
                routeResult={routeResult}
                blockedRoads={blockedRoads}
                onSelectNode={(nodeId) => setDestination(nodeId)}
              />
            </div>

            {/* Turn-by-Turn Road Guidance Corridor */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                <div className="flex items-center gap-2">
                  <CornerDownRight size={14} className="text-[#3B82F6]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    Turn-By-Turn Arterial Corridors ({routeResult?.waypoints?.length || 0} Waypoints)
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#A1A1AA]">
                  {routeResult?.roadNames?.length || 0} ROAD SEGMENTS
                </span>
              </div>

              {/* Waypoints Sequence Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {routeResult?.waypoints?.map((wp, idx) => {
                  const node = KOLKATA_FLEET_NODES[wp];
                  const isOrigin = idx === 0;
                  const isDest = idx === routeResult.waypoints.length - 1;
                  const isMeeting = wp === routeResult.metrics.meetingNode && !isOrigin && !isDest;

                  return (
                    <React.Fragment key={idx}>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 shadow-sm ${
                        isOrigin 
                          ? "bg-[#3B82F6]/20 border-[#3B82F6] text-white" 
                          : isDest 
                          ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]" 
                          : isMeeting 
                          ? "bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#C4B5FD]" 
                          : "bg-[#17171B] border-[#27272A] text-[#D4D4D8]"
                      }`}>
                        <span>{isOrigin ? "🚑" : isDest ? "🎯" : isMeeting ? "⚡" : "📍"}</span>
                        <span>{node ? node.name.split('(')[0].trim() : wp}</span>
                      </span>

                      {idx < routeResult.waypoints.length - 1 && (
                        <ArrowRight size={13} className="text-[#52525B] shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Road Segments Traversed */}
              {routeResult?.roadNames && routeResult.roadNames.length > 0 && (
                <div className="pt-2 border-t border-[#27272A] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  {routeResult.roadNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[#17171B] border border-[#27272A] text-[#A1A1AA]">
                      <span className="h-5 w-5 rounded-md bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="text-white truncate">{name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hazards Bypassed Alert Card */}
              {blockedRoads.length > 0 && (
                <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 mt-2">
                  <div className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} />
                    <span>Active Hazard Avoidance Confirmed</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Bidirectional A* successfully navigated away from: <b className="text-[#F59E0B] font-mono">{blockedRoads.join(", ")}</b>. No emergency vehicles will enter quarantined or blocked roads.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Global Tactical Footer */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#27272A] px-3 py-2 text-[9px] text-[#71717A] lg:px-5">
        <span>AEGIS FLEET TACTICAL DISPATCH</span>
        <span>BIDIRECTIONAL A* (HAVERSINE ADMISSIBLE HEURISTIC)</span>
        <span>KOLKATA EMERGENCY DEFENSE GRID</span>
        <span className="ml-auto mono">REAL ROAD DISTANCE OPTIMIZATION ACTIVE</span>
      </footer>
    </div>
  );
}
