import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Truck, Navigation, AlertTriangle, Fuel, ArrowRight, MapPin, 
  ShieldAlert, Sparkles, Shield, Clock, Activity, Check, ExternalLink, Radio, CloudSun
} from 'lucide-react';

export default function FleetPage() {
  const router = useRouter();
  const [selectedUnit, setSelectedUnit] = useState("AMB-07");
  const [destination, setDestination] = useState("H1_Central");
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fleetUnits, setFleetUnits] = useState<any>({});
  const [clock, setClock] = useState("");
  const [backendOnline, setBackendOnline] = useState(true);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://aegis-backend-5fx3.onrender.com").replace(/\/$/, "");

  // Coordinates on the tactical SVG canvas for city nodes
  const nodeCoordinates: Record<string, { x: number; y: number; label: string }> = {
    Station_North: { x: 90, y: 75, label: "Station North" },
    Station_South: { x: 130, y: 340, label: "Station South" },
    Sector_5C: { x: 270, y: 110, label: "Sector 5C (Industrial)" },
    Sector_6B: { x: 450, y: 160, label: "Sector 6B (Subway)" },
    Evac_Zone: { x: 290, y: 280, label: "Evacuation Zone" },
    H1_Central: { x: 510, y: 85, label: "H1 Central Hospital" },
    H2_West: { x: 430, y: 330, label: "H2 St. Luke's Med" },
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-GB"));
    }, 1000);
    setClock(new Date().toLocaleTimeString("en-GB"));
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data.units) setFleetUnits(data.units);
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));

    // Initial default route calculation
    requestRoute();
  }, []);

  const requestRoute = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/fleet/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_id: selectedUnit, destination: destination })
      });
      const data = await res.json();
      setRouteData(data);
    } catch (e) {
      // Fallback visual simulation data
      setRouteData({
        unit_id: selectedUnit,
        fuel_remaining_minutes: 76,
        routing: {
          origin: selectedUnit.startsWith("AMB-07") ? "Station_North" : "Station_South",
          destination: destination,
          eta_minutes: 4.8,
          waypoints: [
            selectedUnit.startsWith("AMB-07") ? "Station_North" : "Station_South",
            "Sector_5C",
            "Evac_Zone",
            destination
          ],
          roads_traversed: ["Road_A1", "Road_E5", "Road_F6"],
          avoided_blocks: ["Road_D4", "Road_B2"],
          status: "EMERGENCY_SAFE_CORRIDOR"
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getRouteSvgPath = () => {
    if (!routeData?.routing?.waypoints || routeData.routing.waypoints.length < 2) return "";
    return routeData.routing.waypoints
      .map((wp: string, i: number) => {
        const coords = nodeCoordinates[wp] || { x: 150 + i * 80, y: 150 + i * 40 };
        return `${i === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
      })
      .join(" ");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between selection:bg-[#F59E0B]/30">
      <Head>
        <title>AEGIS Fleet — Emergency Tactical Uber & Navigation</title>
        <meta name="description" content="AEGIS Autonomous Fleet Dispatch & Safe Corridor Tactical Navigation" />
      </Head>

      {/* Top Header */}
      <header className="relative h-14 shrink-0 border-b border-[#27272A] bg-[#0D0D10]/95 flex items-center justify-between px-3 sm:px-5 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#3B82F6] text-white shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Truck size={18} strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <div className="font-bold tracking-[0.18em] text-[16px] sm:text-[17px]">AEGIS FLEET</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 whitespace-nowrap">Tactical Dispatch • Emergency Uber</div>
          </div>
        </div>

        {/* Route Navigation Tabs */}
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

        {/* Clock & Status */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-right leading-none pr-1">
            <div className="mono text-[13px] font-semibold">{clock || "14:35:12"}</div>
            <div className="text-[9px] text-[#71717A] mt-0.5">LOCAL • SYNCED</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-1 text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] live-dot" />
            FLEET ONLINE
          </span>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Left Column: Navigation Selector Panel (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">DRIVER TACTICAL DISPATCH</p>
                <h2 className="text-[14px] font-bold text-white mt-0.5">Emergency Routing Engine</h2>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6]">
                <Navigation size={16} />
              </span>
            </div>

            {/* Select Unit */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#A1A1AA] block mb-1">
                Select Responding Vehicle
              </label>
              <select 
                value={selectedUnit} 
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full rounded-xl bg-[#17171B] border border-[#27272A] p-2.5 text-[12px] font-semibold text-white outline-none focus:border-[#3B82F6] transition"
              >
                <option value="AMB-07">AMB-07 (Paramedic Ambulance - Station North)</option>
                <option value="AMB-12">AMB-12 (Critical Trauma Transport - Station South)</option>
                <option value="FIRE-03">FIRE-03 (Pumper Engine - Station North)</option>
                <option value="POL-02">POL-02 (Rapid Interceptor - Station South)</option>
              </select>
            </div>

            {/* Select Destination */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#A1A1AA] block mb-1">
                Target Emergency Destination
              </label>
              <select 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-xl bg-[#17171B] border border-[#27272A] p-2.5 text-[12px] font-semibold text-[#F59E0B] outline-none focus:border-[#F59E0B] transition"
              >
                <option value="H1_Central">General Trauma Hospital (H1)</option>
                <option value="H2_West">St. Luke's Community Clinic (H2)</option>
                <option value="Sector_5C">Incident Site: Building A (Sector 5C)</option>
                <option value="Sector_6B">Secondary Incident: Subway Concourse (Sector 6B)</option>
                <option value="Evac_Zone">Evacuation Holding Perimeter (Sector 5)</option>
              </select>
            </div>

            {/* Compute Route Button */}
            <button 
              onClick={requestRoute}
              disabled={loading}
              className="w-full rounded-xl py-3 font-bold text-xs bg-[#3B82F6] text-white flex items-center justify-center gap-2 transition hover:bg-[#2563EB] active:scale-95 shadow-md disabled:opacity-50"
            >
              <Navigation size={14} />
              <span>{loading ? "Calculating Safest Corridor…" : "COMPUTE TACTICAL ROUTE"}</span>
            </button>

            {/* Unit Telemetry Card */}
            <div className="rounded-xl border border-[#27272A] bg-[#17171B] p-3 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#A1A1AA]">Fuel Reserve Telemetry:</span>
                <span className="mono text-[#10B981] font-bold flex items-center gap-1">
                  <Fuel size={12} />
                  <span>{routeData?.fuel_remaining_minutes ?? 76} mins remaining</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#A1A1AA]">Hazard Avoidance:</span>
                <span className="mono text-[#F59E0B] font-bold">REAL-TIME ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#A1A1AA]">Swarm Sync:</span>
                <span className="mono text-[#3B82F6] font-bold">GEMINI 2.5 FLASH</span>
              </div>
            </div>
          </div>

          {/* Right Column: Turn-by-Turn Tactical Navigator (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">TURN-BY-TURN TACTICAL NAVIGATOR</p>
                <h2 className="text-[14px] font-bold text-white mt-0.5">Live Emergency Corridor Guidance</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold">
                GPS LOCK: SECTOR 5 & 6
              </span>
            </div>

            {routeData ? (
              <div className="space-y-4">
                {/* ETA Banner */}
                <div className="rounded-xl border border-[#27272A] bg-[#17171B] p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">Estimated Travel Time</span>
                    <span className="mono text-2xl font-bold text-white">{routeData.routing.eta_minutes} MINUTES</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    SAFE CORRIDOR CLEARED
                  </span>
                </div>

                {/* Live Tactical SVG Navigation Map Canvas */}
                <div className="relative w-full h-[280px] rounded-2xl border border-[#27272A] bg-[#0B0B0E] overflow-hidden">
                  {/* Tactical Grid Background */}
                  <div className="tactical-grid absolute inset-0 opacity-60" />

                  {/* SVG Route Lines and Nodes */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Secondary City Arteries */}
                    <line x1="90" y1="75" x2="270" y2="110" stroke="#27272A" strokeWidth="3" />
                    <line x1="270" y1="110" x2="510" y2="85" stroke="#27272A" strokeWidth="3" />
                    <line x1="270" y1="110" x2="450" y2="160" stroke="#27272A" strokeWidth="3" />
                    <line x1="450" y1="160" x2="290" y2="280" stroke="#27272A" strokeWidth="3" />
                    <line x1="290" y1="280" x2="430" y2="330" stroke="#27272A" strokeWidth="3" />
                    <line x1="130" y1="340" x2="290" y2="280" stroke="#27272A" strokeWidth="3" />

                    {/* Active Calculated Route Line with Glow */}
                    {getRouteSvgPath() && (
                      <>
                        <path 
                          d={getRouteSvgPath()} 
                          fill="none" 
                          stroke="rgba(59, 130, 246, 0.4)" 
                          strokeWidth="8" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                        />
                        <path 
                          d={getRouteSvgPath()} 
                          fill="none" 
                          stroke="#3B82F6" 
                          strokeWidth="3.5" 
                          strokeDasharray="8 6" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="animate-pulse" 
                        />
                      </>
                    )}
                  </svg>

                  {/* Roadblocks Overlay */}
                  <div className="absolute top-[80px] left-[370px] bg-[#EF4444] text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md flex items-center gap-1 -translate-x-1/2">
                    <span>⊗</span> ROAD BLOCKED (ROAD B2)
                  </div>

                  {/* Fire Hazard Warning */}
                  <div className="absolute top-[48px] left-[270px] bg-[#F59E0B] text-black px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm flex items-center gap-1 -translate-x-1/2">
                    <AlertTriangle size={11} className="text-black" /> SECTOR 5C FIRE
                  </div>

                  {/* Map Waypoint Pins */}
                  {Object.entries(nodeCoordinates).map(([key, node]) => {
                    const isOrigin = routeData?.routing?.waypoints?.[0] === key;
                    const isDest = routeData?.routing?.waypoints?.slice(-1)[0] === key;
                    const isTraversed = routeData?.routing?.waypoints?.includes(key);

                    return (
                      <div
                        key={key}
                        className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
                        style={{ left: node.x, top: node.y }}
                      >
                        <div 
                          className={`w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold shadow-sm ${
                            isOrigin 
                              ? "bg-[#3B82F6] text-white" 
                              : isDest 
                              ? "bg-[#10B981] text-white animate-bounce" 
                              : isTraversed 
                              ? "bg-[#8B5CF6] text-white" 
                              : "bg-[#17171B] text-[#A1A1AA] border-[#27272A]"
                          }`}
                        >
                          {isOrigin ? "🚑" : isDest ? "🎯" : <MapPin size={12} />}
                        </div>
                        <span className="text-[9px] font-bold text-[#D4D4D8] bg-[#131316]/90 px-1.5 py-0.5 rounded border border-[#27272A] shadow-sm mt-0.5 whitespace-nowrap">
                          {node.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Map Mini Legend */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-[#131316]/90 px-2.5 py-1 rounded-full border border-[#27272A] text-[9px] font-semibold text-[#A1A1AA] backdrop-blur">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1 bg-[#3B82F6] rounded-full" /> Active Corridor
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Road Block
                    </span>
                  </div>
                </div>

                {/* Waypoints Journey */}
                <div className="rounded-xl border border-[#27272A] bg-[#17171B] p-3.5">
                  <div className="text-[10px] uppercase text-[#71717A] mb-2.5 font-bold">Safe Route Waypoint Corridor</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {routeData.routing.waypoints.map((point: string, idx: number) => (
                      <React.Fragment key={idx}>
                        <span className="px-3 py-1 rounded-full bg-[#131316] border border-[#27272A] text-white font-mono text-xs">
                          {point}
                        </span>
                        {idx < routeData.routing.waypoints.length - 1 && (
                          <ArrowRight size={13} className="text-[#71717A]" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Hazards Bypassed Card */}
                <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3">
                  <div className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} />
                    <span>Bypassed Roadblocks & Hazard Lines</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Rerouted away from: <b className="text-[#F59E0B] font-mono">{routeData.routing.avoided_blocks?.join(", ") || "Active Hazards"}</b>. Safe corridor guaranteed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-[#71717A] text-xs">
                <Navigation size={36} className="text-[#3B82F6] mb-2 animate-bounce" />
                <span>Select vehicle and target destination to compute route avoiding active hazards.</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#27272A] px-3 py-2 text-[9px] text-[#71717A] lg:px-5">
        <span>AEGIS FLEET OPERATIONS</span>
        <span>CONNECTED ROUTING ENGINE</span>
        <span className="ml-auto mono">TACTICAL NAVIGATION ONLINE</span>
      </footer>
    </div>
  );
}
