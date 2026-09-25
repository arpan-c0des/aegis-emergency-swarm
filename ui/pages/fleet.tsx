import React, { useState } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { Truck, Navigation, AlertTriangle, ShieldCheck, Fuel, ArrowRight } from 'lucide-react';

export default function FleetPage() {
  const [selectedUnit, setSelectedUnit] = useState("AMB-07");
  const [destination, setDestination] = useState("H1_Central");
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const requestRoute = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/fleet/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_id: selectedUnit, destination: destination })
      });
      const data = await res.json();
      setRouteData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#140b06] p-4 text-slate-800 font-mono">
      <Head><title>AEGIS Fleet — Tactical Emergency Navigation</title></Head>
      <Navbar />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Navigation Selector Panel */}
        <div className="lg:col-span-4 frame-wood p-4 rounded text-gray-200">
          <div className="text-xs font-black text-[#d4af72] border-b border-[#442211] pb-2 mb-4 flex items-center justify-between">
            <span>DRIVER TACTICAL DISPATCH UNIT</span>
            <Truck size={16} className="text-amber-400" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400">Select Vehicle Unit</label>
              <select 
                value={selectedUnit} 
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-[#0d141e] border border-[#2b3a4e] p-2 rounded text-xs text-cyan-300 font-bold mt-1"
              >
                <option value="AMB-07">AMB-07 (Paramedic Ambulance)</option>
                <option value="AMB-12">AMB-12 (Critical Trauma Transport)</option>
                <option value="FIRE-03">FIRE-03 (Pumper Engine)</option>
                <option value="POL-02">POL-02 (Rapid Interceptor)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400">Target Emergency Destination</label>
              <select 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-[#0d141e] border border-[#2b3a4e] p-2 rounded text-xs text-amber-300 font-bold mt-1"
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
              className="w-full plate-metal p-3 rounded font-black text-xs uppercase flex items-center justify-center space-x-2 text-[#1e293b] hover:bg-[#cbd5e1] transition"
            >
              <Navigation size={14} />
              <span>{loading ? "Calculating Safest Route..." : "Compute Dynamic Route"}</span>
            </button>
          </div>

          {/* Unit Telemetry Box */}
          <div className="bezel-recessed p-3 rounded mt-5 border border-gray-700">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Fuel Reserves:</span>
              <span className="text-[#38ef7d] font-bold flex items-center space-x-1">
                <Fuel size={12} />
                <span>{routeData?.fuel_remaining_minutes ?? 76} mins left</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs mt-2">
              <span className="text-gray-400">Hazard Avoidance:</span>
              <span className="text-amber-400 font-bold">AUTOMATIC REROUTE ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Dynamic Route Waypoints & Hazard Guidance */}
        <div className="lg:col-span-8 frame-wood p-4 rounded text-gray-200">
          <div className="text-xs font-black text-[#d4af72] border-b border-[#442211] pb-2 mb-3 flex items-center justify-between">
            <span>TURN-BY-TURN TACTICAL FLIGHT RECORDER</span>
            <span className="text-[10px] text-emerald-400 font-bold">GPS LOCK: NYC SECTOR 5</span>
          </div>

          {routeData ? (
            <div className="space-y-4">
              {/* ETA Banner */}
              <div className="sub-panel-metal p-3 rounded flex items-center justify-between text-[#1e293b]">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-600">Estimated Travel Time</div>
                  <div className="text-2xl font-black text-blue-900">{routeData.routing.eta_minutes} MINUTES</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-gray-600">Corridor Status</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white">
                    CLEARED FOR EMERGENCY VEHICLE
                  </span>
                </div>
              </div>

              {/* Waypoints Journey */}
              <div className="bezel-recessed p-4 rounded">
                <div className="text-[10px] uppercase text-gray-400 mb-3 font-bold">Safe Route Waypoint Corridor</div>
                <div className="flex flex-wrap items-center gap-2">
                  {routeData.routing.waypoints.map((point: string, idx: number) => (
                    <React.Fragment key={idx}>
                      <span className="px-3 py-1.5 rounded bg-[#1e2a3b] border border-cyan-500/50 text-cyan-300 font-bold text-xs">
                        {point}
                      </span>
                      {idx < routeData.routing.waypoints.length - 1 && (
                        <ArrowRight size={14} className="text-amber-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Hazards Bypassed */}
              <div className="bg-[#2a130a] border border-red-800 p-3 rounded">
                <div className="text-xs font-bold text-red-400 flex items-center space-x-1.5 mb-1">
                  <AlertTriangle size={14} />
                  <span>Bypassed Roadblocks & Structural Fire Lines</span>
                </div>
                <div className="text-[11px] text-gray-300">
                  Rerouted away from: <span className="font-bold text-amber-300">Road_B2, Sector 5C</span> (Debris / Active Fire Suppression).
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-xs">
              <Navigation size={32} className="text-gray-600 mb-2 animate-pulse" />
              <span>Select vehicle and target destination to compute route avoiding active hazards.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}