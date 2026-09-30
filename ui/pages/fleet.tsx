import React, { useState } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { Truck, Navigation, AlertTriangle, Fuel, ArrowRight } from 'lucide-react';

export default function FleetPage() {
  const [selectedUnit, setSelectedUnit] = useState("AMB-07");
  const [destination, setDestination] = useState("H1_Central");
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
    } finally {
      setLoading(false);
    }
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

        {/* Dynamic Route Waypoints & Guidance */}
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