import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  ShieldAlert, Activity, Radio, Volume2, Pause, RotateCcw, 
  MapPin, Flame, AlertTriangle, Truck, Stethoscope, Shield, 
  Wifi, Zap, Server, ChevronDown, CheckCircle
} from 'lucide-react';

export default function TacticalC2Dashboard() {
  const [worldState, setWorldState] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [commandPlan, setCommandPlan] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioAvailable, setAudioAvailable] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("2026-09-25 02:17:34 UTC");

  useEffect(() => {
    // Sync with backend API
    fetch("http://127.0.0.1:8000/api/state")
      .then((res) => res.json())
      .then((data) => setWorldState(data))
      .catch((err) => console.error("API unreachable", err));

    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "INITIAL_STATE") {
        setWorldState(msg.data);
      } else if (msg.type === "SIMULATION_UPDATE" || msg.type === "RESET_STATE") {
        setWorldState(msg.data.updated_world_state);
        setTranscript(msg.data.transcript || []);
        setCommandPlan(msg.data.command_plan || "");
        setAudioAvailable(msg.data.audio_available || false);
      }
    };
    return () => ws.close();
  }, []);

  const triggerTick = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/simulate/tick", { method: "POST" });
      const data = await res.json();
      setWorldState(data.updated_world_state);
      setTranscript(data.transcript || []);
      setCommandPlan(data.command_plan || "");
      setAudioAvailable(data.audio_available || false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const playVoiceBroadcast = () => {
    setIsPlayingAudio(true);
    const audio = new Audio(`http://127.0.0.1:8000/api/audio/latest?t=${Date.now()}`);
    audio.play().catch(() => setIsPlayingAudio(false));
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  const getAgentBadge = (agent: string) => {
    switch (agent) {
      case "MedicalAgent":
      case "MEDICAL":
        return "bg-cyan-950 text-cyan-300 border-cyan-700";
      case "FireAgent":
      case "FIRE":
        return "bg-amber-950 text-amber-300 border-amber-700";
      case "PoliceAgent":
      case "POLICE":
        return "bg-blue-950 text-blue-300 border-blue-700";
      case "LogisticsAgent":
      case "LOGISTICS":
        return "bg-indigo-950 text-indigo-300 border-indigo-700";
      default:
        return "bg-orange-950 text-orange-300 border-orange-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#040910] text-[#cbd5e1] p-4 font-mono select-none flex flex-col justify-between">
      <Head>
        <title>AEGIS — Agentic Emergency Response System</title>
      </Head>

      {/* TOP HEADER BAR */}
      <header className="flex flex-wrap items-center justify-between border-b border-[#132742] pb-3 mb-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 border border-cyan-500/60 flex items-center justify-center bg-cyan-950/30 relative">
            <div className="w-5 h-5 border border-cyan-400 rotate-45"></div>
            <div className="w-2 h-2 bg-cyan-400 absolute"></div>
          </div>
          <div>
            <div className="text-2xl font-black tracking-widest text-cyan-400 flex items-center space-x-2">
              <span>AEGIS</span>
              <span className="text-gray-500 font-normal">—</span>
            </div>
            <div className="text-[10px] tracking-widest text-gray-400 uppercase">
              Agentic Emergency Response System
            </div>
          </div>
        </div>

        {/* Telemetry pill */}
        <div className="hidden lg:flex items-center space-x-6 text-[11px] bg-[#071322] border border-[#132742] px-4 py-1.5 rounded">
          <span className="text-gray-400">STATUS: <span className="text-emerald-400 font-bold">ACTIVE</span></span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-400">THREAT LEVEL: <span className="text-amber-400 font-bold">ELEVATED</span></span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-400">CLASSIFICATION: <span className="text-cyan-400 font-bold">RESTRICTED</span></span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-gray-400 mr-3">{currentTime}</span>

          <button 
            onClick={() => fetch("http://127.0.0.1:8000/api/reset", { method: "POST" })}
            className="px-3 py-1.5 text-xs bg-[#0b1b30] hover:bg-[#122b4d] border border-[#1a3d69] text-gray-300 rounded uppercase font-bold transition flex items-center space-x-1"
          >
            <RotateCcw size={12} />
            <span>PAUSE</span>
          </button>

          <button
            onClick={triggerTick}
            disabled={isSimulating}
            className={`px-4 py-1.5 text-xs border uppercase font-bold rounded transition ${
              isSimulating
                ? "bg-[#14263f] text-gray-400 border-gray-700 cursor-not-allowed"
                : "bg-[#0c2444] hover:bg-[#113564] text-cyan-300 border-cyan-500/60 shadow-cyan-glow"
            }`}
          >
            {isSimulating ? "REPLANNING..." : "REPLAN"}
          </button>

          <button
            onClick={playVoiceBroadcast}
            disabled={isPlayingAudio}
            className={`px-4 py-1.5 text-xs border font-bold uppercase rounded flex items-center space-x-1.5 transition ${
              isPlayingAudio
                ? "bg-orange-600 text-white border-orange-400 shadow-amber-glow animate-pulse"
                : "bg-[#7c3a0e] hover:bg-[#9a4710] text-amber-200 border-amber-600 shadow-amber-glow"
            }`}
          >
            <Radio size={12} />
            <span>{isPlayingAudio ? "TRANSMITTING" : "BROADCAST"}</span>
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* [01] SHARED WORLD STATE */}
        <div className="lg:col-span-3 tactical-box p-4 rounded flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-bold tracking-wider text-cyan-400 flex items-center justify-between border-b border-[#142842] pb-2 mb-3">
              <span>[ 01 ] SHARED WORLD STATE</span>
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></div>
            </div>

            {/* Infrastructure */}
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-bold">Infrastructure</div>
              <div className="bg-[#05101d] border border-[#132742] p-2 rounded flex items-center space-x-3">
                <div className="w-12 h-10 border border-cyan-900/60 bg-[#071526] flex items-center justify-center">
                  <Activity size={18} className="text-cyan-500" />
                </div>
                <div className="text-xs flex-1">
                  <div className="text-gray-300">Roads: <span className="font-bold text-white">42 segments</span> | <span className="text-amber-400 font-bold">3 degraded</span></div>
                  <div className="text-[11px] text-cyan-400 font-semibold mt-0.5">Status: 92% Operational</div>
                </div>
              </div>
            </div>

            {/* Hospitals */}
            <div className="space-y-3 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Hospitals</div>
              
              {/* General Hospital */}
              <div className="bg-[#05101d] border border-[#132742] p-2.5 rounded">
                <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Stethoscope size={13} className="text-cyan-400" />
                    <span>GENERAL HOSPITAL</span>
                  </div>
                  <span className="text-cyan-300">76%</span>
                </div>
                <div className="w-full bg-[#0a1b2e] h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-cyan-500 h-full" style={{ width: '76%' }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Power: <span className="text-emerald-400">NOMINAL</span></span>
                  <span>Beds: {worldState?.hospitals?.H1?.available_beds ?? 28}/37</span>
                </div>
              </div>

              {/* St. Luke's */}
              <div className="bg-[#05101d] border border-[#132742] p-2.5 rounded">
                <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Stethoscope size={13} className="text-cyan-400" />
                    <span>ST. LUKE'S MED</span>
                  </div>
                  <span className="text-amber-400">41%</span>
                </div>
                <div className="w-full bg-[#0a1b2e] h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-amber-500 h-full" style={{ width: '41%' }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Generator: <span className="text-amber-400">ACTIVE</span></span>
                  <span>Beds: {worldState?.hospitals?.H2?.available_beds ?? 12}/29</span>
                </div>
              </div>
            </div>

            {/* Fleet Fuel Status */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Fleet Fuel Status</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-[#0e2137] pb-1">
                  <span className="text-gray-300">AMB-07 | <span className="text-cyan-400">FUEL 84%</span></span>
                  <span className="text-[10px] text-emerald-400 font-bold">READY • Bay 3</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#0e2137] pb-1">
                  <span className="text-gray-300">ENG-12 | <span className="text-orange-400">FUEL 22%</span></span>
                  <span className="text-[10px] text-orange-400 font-bold">LOW • ENROUTE REFUE</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#0e2137] pb-1">
                  <span className="text-gray-300">FIRE-03 | <span className="text-amber-300">FUEL 68%</span></span>
                  <span className="text-[10px] text-cyan-400 font-bold">DEPLOYED • Sector 5</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#132742] pt-2 text-[10px] text-gray-400 flex justify-between">
            <span>TOTAL UNITS: 14</span>
            <span>OFFLINE: 1</span>
            <span>RECHARGING: 2</span>
          </div>
        </div>

        {/* [02] 2D CITY GRID MAP — SECTOR 5 & 6 */}
        <div className="lg:col-span-6 tactical-box p-4 rounded flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-[#142842] pb-2 mb-2">
            <span className="text-xs font-bold tracking-wider text-cyan-400">[ 02 ] 2D CITY GRID MAP — SECTOR 5 & 6</span>
            <div className="flex items-center space-x-1 text-[10px] text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>GRID LOCK ON</span>
            </div>
          </div>

          {/* Tactical Vector Map Canvas */}
          <div className="relative w-full h-[470px] bg-[#03070d] border border-[#0d1e34] rounded overflow-hidden">
            {/* Grid Pattern Background */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)',
                backgroundSize: '36px 36px'
              }}
            ></div>

            {/* Evacuation Safe Sector (Orange Vector Polygon Overlay) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon 
                points="180,420 320,150 480,260 380,450" 
                fill="rgba(245, 158, 11, 0.08)" 
                stroke="#f59e0b" 
                strokeWidth="1.5" 
                strokeDasharray="4 3" 
              />
              <line x1="160" y1="420" x2="380" y2="420" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>

            {/* Sector Evacuation Zone Label */}
            <div className="absolute top-[280px] left-[200px] border border-amber-600/70 bg-amber-950/60 px-2 py-1 text-center pointer-events-none">
              <div className="text-[10px] font-black text-amber-400 tracking-wider">EVACUATION ZONE</div>
              <div className="text-[9px] text-amber-200">Sector 5</div>
            </div>

            {/* Hazard 1: Burning Sector 5C */}
            <div className="absolute top-[80px] right-[130px] border border-red-600 bg-red-950/80 px-2.5 py-1 text-center shadow-red-glow">
              <div className="text-[10px] font-black text-red-400 flex items-center space-x-1">
                <Flame size={12} className="animate-bounce" />
                <span>BURNING — Sector 5C</span>
              </div>
            </div>

            {/* Hazard 2: Burning Sector 6B */}
            <div className="absolute top-[210px] right-[140px] border border-red-600 bg-red-950/80 px-2.5 py-1 text-center shadow-red-glow">
              <div className="text-[10px] font-black text-red-400 flex items-center space-x-1">
                <Flame size={12} className="animate-bounce" />
                <span>BURNING — Sector 6B</span>
              </div>
            </div>

            {/* Units Placed on Map */}
            {/* Police POL-02 */}
            <div className="absolute top-[140px] right-[170px] flex items-center space-x-1">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border border-white"></div>
              <span className="text-[9px] bg-blue-950/90 text-blue-300 px-1 border border-blue-600">POL-02</span>
            </div>

            {/* Fire Trucks FIRE-03 & FIRE-02 */}
            <div className="absolute top-[270px] right-[120px] space-y-1">
              <div className="flex items-center space-x-1">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full border border-white"></div>
                <span className="text-[9px] bg-amber-950/90 text-amber-300 px-1 border border-amber-600">FIRE-03</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-[8px] bg-amber-950/90 text-amber-400 px-1 border border-amber-800">FIRE-02</span>
              </div>
            </div>

            {/* Ambulances AMB-07 & AMB-12 */}
            <div className="absolute bottom-[90px] left-[210px] space-y-1.5">
              <div className="flex items-center space-x-1">
                <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full border border-white"></div>
                <span className="text-[9px] bg-cyan-950/90 text-cyan-300 px-1 border border-cyan-600">AMB-07</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span className="text-[8px] bg-cyan-950/90 text-cyan-400 px-1 border border-cyan-800">AMB-12</span>
              </div>
            </div>

            {/* Road Blocked Pill */}
            <div className="absolute top-[130px] left-[230px] bg-red-950 text-red-400 border border-red-700 px-1.5 py-0.5 text-[8px] font-bold">
              ROAD BLOCKED
            </div>

            {/* Evac Route Trail indicator */}
            <div className="absolute bottom-[75px] left-[280px] text-[9px] text-cyan-400 font-bold tracking-wider">
              -- EVAC ROUTE →
            </div>
          </div>

          {/* Map Legend */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-[#142842] mt-2">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>AMBULANCE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>FIRE TRUCK</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>POLICE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="text-red-500 font-bold">⊗</span>
              <span>ROAD BLOCKED</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-red-600"></span>
              <span>BURNING STRUCTURE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 border border-amber-500 bg-amber-950"></span>
              <span>EVAC ZONE</span>
            </span>
          </div>
        </div>

        {/* [03] LIVE AGENT ACTIVITY FEED */}
        <div className="lg:col-span-3 tactical-box p-4 rounded flex flex-col justify-between h-full">
          <div>
            <div className="flex justify-between items-center border-b border-[#142842] pb-2 mb-3">
              <span className="text-xs font-bold tracking-wider text-cyan-400">[ 03 ] LIVE AGENT ACTIVITY FEED</span>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
              </div>
            </div>

            {/* Scrollable Agent Feed items */}
            <div className="space-y-3 overflow-y-auto max-h-[480px] pr-1">
              {/* Command Action */}
              <div className="bg-[#05111f] border border-[#132945] p-2 rounded text-xs">
                <div className="flex items-center justify-between mb-1 text-[10px]">
                  <span className="text-gray-500">02:17:31</span>
                  <span className="px-1.5 py-0.5 rounded font-bold border bg-orange-950 text-orange-300 border-orange-700">
                    COMMAND
                  </span>
                </div>
                <div className="text-gray-200 text-[11px] leading-snug">
                  {commandPlan ? commandPlan.substring(0, 120) + "..." : "Replan initiated: Route recalculated for AMB-07 to General Hospital."}
                </div>
              </div>

              {/* Medical Feed */}
              <div className="bg-[#05111f] border border-[#132945] p-2 rounded text-xs">
                <div className="flex items-center justify-between mb-1 text-[10px]">
                  <span className="text-gray-500">02:17:26</span>
                  <span className="px-1.5 py-0.5 rounded font-bold border bg-cyan-950 text-cyan-300 border-cyan-700">
                    MEDICAL
                  </span>
                </div>
                <div className="text-gray-200 text-[11px] leading-snug">
                  AMB-12 enroute to ST. LUKE'S — ETA 3.1min. Priority: HIGH
                </div>
              </div>

              {/* Fire Feed */}
              <div className="bg-[#05111f] border border-[#132945] p-2 rounded text-xs">
                <div className="flex items-center justify-between mb-1 text-[10px]">
                  <span className="text-gray-500">02:17:19</span>
                  <span className="px-1.5 py-0.5 rounded font-bold border bg-amber-950 text-amber-300 border-amber-700">
                    FIRE
                  </span>
                </div>
                <div className="text-gray-200 text-[11px] leading-snug">
                  FIRE-03 engaged at Sector 5C. Water supply connected.
                </div>
              </div>

              {/* Police Feed */}
              <div className="bg-[#05111f] border border-[#132945] p-2 rounded text-xs">
                <div className="flex items-center justify-between mb-1 text-[10px]">
                  <span className="text-gray-500">02:17:12</span>
                  <span className="px-1.5 py-0.5 rounded font-bold border bg-blue-950 text-blue-300 border-blue-700">
                    POLICE
                  </span>
                </div>
                <div className="text-gray-200 text-[11px] leading-snug">
                  POL-02 secured perimeter Sector 6. Roadblock established at 5th & Main.
                </div>
              </div>

              {/* Logistics Feed */}
              <div className="bg-[#05111f] border border-[#132945] p-2 rounded text-xs">
                <div className="flex items-center justify-between mb-1 text-[10px]">
                  <span className="text-gray-500">02:17:04</span>
                  <span className="px-1.5 py-0.5 rounded font-bold border bg-indigo-950 text-indigo-300 border-indigo-700">
                    LOGISTICS
                  </span>
                </div>
                <div className="text-gray-200 text-[11px] leading-snug">
                  Fuel convoy dispatched to ENG-12. ETA 6min.
                </div>
              </div>

              {/* Dynamic Transcript Additions */}
              {transcript.map((item, idx) => (
                <div key={idx} className="bg-[#05111f] border border-[#132945] p-2 rounded text-xs">
                  <div className="flex items-center justify-between mb-1 text-[10px]">
                    <span className="text-gray-500">LIVE SWARM</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold border ${getAgentBadge(item.agent)}`}>
                      {item.agent.toUpperCase().replace("AGENT", "")}
                    </span>
                  </div>
                  <div className="text-gray-200 text-[11px] leading-snug font-sans">
                    {item.assessment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#132742] pt-2 text-[10px] text-gray-500 flex justify-between">
            <span>COMM PROTOCOL: GEMINI-SWARM</span>
            <span>VERIFIED SHA256</span>
          </div>
        </div>

      </div>

      {/* BOTTOM TELEMETRY DOCK */}
      <footer className="tactical-box p-3 rounded mt-4 grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
        {/* Metric 1 */}
        <div className="border-r border-[#132742] pr-2">
          <div className="text-[10px] uppercase text-gray-500">AVG RESPONSE</div>
          <div className="text-xl font-bold text-cyan-400">4.2min</div>
          <div className="text-[10px] text-emerald-400">▼ +0.8min</div>
        </div>

        {/* Metric 2 */}
        <div className="border-r border-[#132742] pr-2">
          <div className="text-[10px] uppercase text-gray-500">UTILIZATION</div>
          <div className="text-xl font-bold text-amber-400">87%</div>
          <div className="w-16 bg-[#0c233c] h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-amber-400 h-full w-[87%]"></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="border-r border-[#132742] pr-2">
          <div className="text-[10px] uppercase text-gray-500">ACTIVE AGENTS</div>
          <div className="text-xl font-bold text-white">22/24</div>
          <div className="text-[10px] text-gray-400">2 Standby</div>
        </div>

        {/* Metric 4 */}
        <div className="border-r border-[#132742] pr-2">
          <div className="text-[10px] uppercase text-gray-500">POWER GRID</div>
          <div className="text-xl font-bold text-emerald-400">92%</div>
          <div className="text-[10px] text-emerald-400">STABLE</div>
        </div>

        {/* Metric 5 */}
        <div className="border-r border-[#132742] pr-2">
          <div className="text-[10px] uppercase text-gray-500">INCIDENTS</div>
          <div className="text-xl font-bold text-red-500">7 ACTIVE</div>
          <div className="text-[10px] text-gray-400">2 HIGH • 3 MED • 2 LOW</div>
        </div>

        {/* Dock Telemetry Pill */}
        <div className="flex items-center justify-between pl-2 col-span-2 md:col-span-1">
          <div>
            <div className="text-[10px] text-gray-400">COMPUTE LOAD 64% • 12ms</div>
            <div className="text-[10px] text-cyan-400 font-bold">MODEL: AEGIS-GEMINI-v1.5</div>
          </div>
          <span className="px-2 py-1 bg-amber-950 text-amber-300 border border-amber-600 rounded text-[9px] font-bold">
            AUTO-MODE: ON
          </span>
        </div>
      </footer>
    </div>
  );
}