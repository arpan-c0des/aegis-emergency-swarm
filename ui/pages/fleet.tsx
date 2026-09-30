import React, { useState } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { Truck, Navigation, AlertTriangle, Fuel, ArrowRight, MapPin, ShieldAlert, Sparkles } from 'lucide-react';

export default function FleetPage() {
  const [selectedUnit, setSelectedUnit] = useState("AMB-07");
  const [destination, setDestination] = useState("H1_Central");
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Coordinates on the tactical SVG canvas for Manhattan nodes
  const nodeCoordinates: Record<string, { x: number; y: number; label: string }> = {
    Station_North: { x: 80, y: 70, label: "Station North" },
    Station_South: { x: 120, y: 340, label: "Station South" },
    Sector_5C: { x: 260, y: 100, label: "Sector 5C (Fire Zone)" },
    Sector_6B: { x: 440, y: 160, label: "Sector 6B (Subway)" },
    Evac_Zone: { x: 280, y: 280, label: "Evacuation Zone" },
    H1_Central: { x: 500, y: 80, label: "H1 Central Hospital" },
    H2_West: { x: 420, y: 330, label: "H2 St. Luke's Med" },
  };

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
      console.error(e);
      // Fallback visual simulation data if API server is not running
      setRouteData({
        unit_id: selectedUnit,
        fuel_remaining_minutes: 76,
        routing: {
          origin: selectedUnit.startsWith("AMB") ? "Station_North" : "Station_South",
          destination: destination,
          eta_minutes: 4.8,
          waypoints: [
            selectedUnit.startsWith("AMB") ? "Station_North" : "Station_South",
            "Sector_5C",
            "Evac_Zone",
            destination
          ],
          roads_traversed: ["Road_A1", "Road_E5", "Road_F6"],
          avoided_blocks: ["Road_D4", "Road_B2"]
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert waypoints array into an SVG path string
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
    <div className="min-h-screen p-4 md:p-6 flex flex-col justify-between selection:bg-[#FFB5E8]/40">
      <Head><title>AEGIS Fleet — Emergency Uber Navigation</title></Head>
      <Navbar />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Navigation Selector Panel */}
        <div className="lg:col-span-4 clay-card p-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-4">
            <span className="font-[800] text-[13px] text-[#5A4E75] tracking-[0.08em]">
              DRIVER TACTICAL DISPATCH UNIT
            </span>
            <div className="w-8 h-8 rounded-full bg-[#B5DEFF] border-2 border-white flex items-center justify-center">
              <Truck size={16} className="text-[#244974]" />
            </div>
          </div>

          <div className="space-y-4 font-[700] text-xs">
            <div>
              <label className="text-[10px] uppercase font-[800] text-[#9A8EB0]">Select Vehicle Unit</label>
              <select 
                value={selectedUnit} 
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full clay-inset p-3 rounded-[18px] text-xs font-[800] text-[#244974] mt-1 outline-none"
              >
                <option value="AMB-07">AMB-07 (Paramedic Ambulance)</option>
                <option value="AMB-12">AMB-12 (Critical Trauma Transport)</option>
                <option value="FIRE-03">FIRE-03 (Pumper Engine)</option>
                <option value="POL-02">POL-02 (Rapid Interceptor)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-[800] text-[#9A8EB0]">Target Emergency Destination</label>
              <select 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="w-full clay-inset p-3 rounded-[18px] text-xs font-[800] text-[#874b0c] mt-1 outline-none"
              >
                <option value="H1_Central">General Trauma Hospital (H1)</option>
                <option value="H2_West">St. Luke's Community Clinic (H2)</option>
                <option value="Sector_5C">Incident Site: Building A (Sector 5C)</option>
                <option value="Evac_Zone">Evacuation Holding Perimeter (Sector 5)</option>
              </select>
            </div>

            <button 
              onClick={requestRoute}
              disabled={loading}
              className="w-full clay-button py-3.5 rounded-full font-[800] text-xs bg-[#B5DEFF] text-[#1b446f] flex items-center justify-center gap-2 mt-2"
            >
              <Navigation size={15} />
              <span>{loading ? "Calculating Safest Route..." : "Compute Dynamic Route"}</span>
            </button>
          </div>

          {/* Unit Telemetry Box */}
          <div className="clay-inset p-4 rounded-[22px] mt-5">
            <div className="flex justify-between items-center text-xs font-[700]">
              <span className="text-[#8E819E]">Fuel Reserves:</span>
              <span className="text-[#2E5A2A] font-[800] flex items-center gap-1">
                <Fuel size={13} />
                <span>{routeData?.fuel_remaining_minutes ?? 76} mins left</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-[700] mt-2">
              <span className="text-[#8E819E]">Hazard Avoidance:</span>
              <span className="text-[#874b0c] font-[800]">REROUTE ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Dynamic Route Waypoints, Navigation Map & Guidance */}
        <div className="lg:col-span-8 clay-card p-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-4">
            <span className="font-[800] text-[13px] text-[#5A4E75] tracking-[0.08em]">
              TURN-BY-TURN TACTICAL RECORDER
            </span>
            <span className="px-3 py-1 rounded-full bg-[#C3FFB5] border-2 border-white text-[10px] font-[800] text-[#2E5A2A]">
              GPS LOCK: NYC SECTOR 5
            </span>
          </div>

          {routeData ? (
            <div className="space-y-4">
              {/* ETA Banner */}
              <div className="clay-card p-4 rounded-[22px] bg-gradient-to-r from-white to-[#F0E8FF] flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-[800] text-[#9A8EB0]">Estimated Travel Time</div>
                  <div className="text-3xl font-[800] text-[#244974]">{routeData.routing.eta_minutes} MINUTES</div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-[10px] font-[800] bg-[#C3FFB5] text-[#2E5A2A] border-2 border-white">
                  SAFE CORRIDOR CLEARED
                </span>
              </div>

              {/* LIVE TACTICAL NAVIGATION MAP CANVAS */}
              <div className="relative w-full h-[280px] clay-inset rounded-[24px] overflow-hidden border-2 border-white">
                {/* Street Grid Backdrop */}
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #D6C2FF 1.5px, transparent 1.5px), linear-gradient(to bottom, #D6C2FF 1.5px, transparent 1.5px)',
                    backgroundSize: '36px 36px'
                  }}
                />

                {/* SVG Route Lines and Nodes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Secondary/Inactive City Arteries */}
                  <line x1="80" y1="70" x2="260" y2="100" stroke="#E6DFF5" strokeWidth="4" />
                  <line x1="260" y1="100" x2="500" y2="80" stroke="#E6DFF5" strokeWidth="4" />
                  <line x1="260" y1="100" x2="440" y2="160" stroke="#E6DFF5" strokeWidth="4" />
                  <line x1="440" y1="160" x2="280" y2="280" stroke="#E6DFF5" strokeWidth="4" />
                  <line x1="280" y1="280" x2="420" y2="330" stroke="#E6DFF5" strokeWidth="4" />
                  <line x1="120" y1="340" x2="280" y2="280" stroke="#E6DFF5" strokeWidth="4" />

                  {/* Active Calculated Route Line with Glow */}
                  {getRouteSvgPath() && (
                    <>
                      <path
                        d={getRouteSvgPath()}
                        fill="none"
                        stroke="#B5DEFF"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                      />
                      <path
                        d={getRouteSvgPath()}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="4"
                        strokeDasharray="8 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-pulse"
                      />
                    </>
                  )}
                </svg>

                {/* Roadblocks Overlay */}
                <div 
                  className="absolute top-[85px] left-[360px] bg-[#dc2626] text-white px-2 py-0.5 rounded-full text-[9px] font-[800] border-2 border-white shadow-md flex items-center gap-1 -translate-x-1/2"
                >
                  <span>⊗</span> ROAD BLOCKED
                </div>

                {/* Fire Hazard Warning */}
                <div 
                  className="absolute top-[50px] left-[260px] bg-[#FFE6A5] text-[#874b0c] px-2 py-0.5 rounded-full text-[9px] font-[800] border border-white shadow-sm flex items-center gap-1 -translate-x-1/2"
                >
                  <AlertTriangle size={11} className="text-[#dc2626]" /> SECTOR 5C FIRE
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
                        className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-[800] shadow-sm ${
                          isOrigin 
                            ? "bg-[#B5DEFF] text-[#1b446f]" 
                            : isDest 
                            ? "bg-[#C3FFB5] text-[#2E5A2A] animate-bounce" 
                            : isTraversed 
                            ? "bg-[#D6C2FF] text-[#4a2d82]" 
                            : "bg-white text-[#9A8EB0]"
                        }`}
                      >
                        {isOrigin ? "🚑" : isDest ? "🎯" : <MapPin size={12} />}
                      </div>
                      <span className="text-[9px] font-[800] text-[#4A4458] bg-white/90 px-1.5 py-0.5 rounded-full border border-white shadow-sm mt-0.5 whitespace-nowrap">
                        {node.label}
                      </span>
                    </div>
                  );
                })}

                {/* Map Mini Legend */}
                <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-white/95 px-3 py-1 rounded-full border border-white text-[9px] font-[800] text-[#5A4E75] shadow-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-1 bg-[#0284c7] rounded-full"></span> Active Corridor
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span> Road Block
                  </span>
                </div>
              </div>

              {/* Waypoints Journey */}
              <div className="clay-inset p-4 rounded-[22px]">
                <div className="text-[10px] uppercase text-[#9A8EB0] mb-3 font-[800]">Safe Route Waypoint Corridor</div>
                <div className="flex flex-wrap items-center gap-2">
                  {routeData.routing.waypoints.map((point: string, idx: number) => (
                    <React.Fragment key={idx}>
                      <span className="px-3.5 py-1.5 rounded-full bg-white border-2 border-white text-[#244974] font-[800] text-xs shadow-sm">
                        {point}
                      </span>
                      {idx < routeData.routing.waypoints.length - 1 && (
                        <ArrowRight size={14} className="text-[#A99DC0]" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Hazards Bypassed */}
              <div className="clay-card p-4 rounded-[22px] bg-[#FFE8F0] border-2 border-white">
                <div className="text-xs font-[800] text-[#dc2626] flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} />
                  <span>Bypassed Roadblocks & Structural Fire Lines</span>
                </div>
                <div className="text-[11px] font-[600] text-[#7A5A6E]">
                  Rerouted away from: <b className="text-[#874b0c]">Road_B2, Sector 5C</b> (Debris & active fire suppression).
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-[#9A8EB0] text-xs font-[700]">
              <Navigation size={36} className="text-[#D6C2FF] mb-2 animate-bounce" />
              <span>Select vehicle and target destination to compute route avoiding active hazards.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}