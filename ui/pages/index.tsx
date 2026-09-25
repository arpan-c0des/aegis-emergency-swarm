import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { RealWorld3DMap } from '../components/RealWorld3DMap';
import { 
  Flame, Stethoscope, AlertTriangle, Radio, 
  MapPin, Volume2, Shield, Activity, Power, RefreshCw, X, Send
} from 'lucide-react';

export default function SkeuomorphicCommandConsole() {
  const [worldState, setWorldState] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [commandPlan, setCommandPlan] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [clock, setClock] = useState<string>("2026-09-25 02:17:34 UTC");

  // Auto-Mode & Manual Scenario Injection State
  const [autoMode, setAutoMode] = useState<boolean>(true);
  const [customIncident, setCustomIncident] = useState({
    incident_type: "structural_collapse",
    location: "Sector_6B",
    severity: "critical",
    details: "Secondary gas line rupture detected near subway entrance.",
    block_road: "Road_D4",
    patient_count: 3
  });

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/state")
      .then((res) => res.json())
      .then((data) => setWorldState(data))
      .catch((err) => console.error("API unreachable", err));

    fetch("http://127.0.0.1:8000/api/config")
      .then((res) => res.json())
      .then((cfg) => {
        if (typeof cfg.auto_mode === "boolean") setAutoMode(cfg.auto_mode);
      })
      .catch(() => {});

    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "INITIAL_STATE" || msg.type === "SIMULATION_UPDATE" || msg.type === "RESET_STATE") {
        setWorldState(msg.data.updated_world_state || msg.data);
        setTranscript(msg.data.transcript || []);
        setCommandPlan(msg.data.command_plan || "");
      }
    };
    return () => ws.close();
  }, []);

  const toggleAuto = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/config/toggle-auto", { method: "POST" });
      const data = await res.json();
      setAutoMode(data.auto_mode);
    } catch (e) {
      console.error(e);
      setAutoMode(!autoMode);
    }
  };

  const injectScenarioData = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/inject-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customIncident)
      });
      const data = await res.json();
      if (data.world_state) {
        setWorldState(data.world_state);
      }
      alert(data.message || `Manual Drill Scenario ${data.incident_id || ""} successfully injected into swarm telemetry!`);
    } catch (e) {
      console.error(e);
      alert("Failed to inject manual scenario data.");
    }
  };

  const triggerReplan = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/simulate/tick", { method: "POST" });
      const data = await res.json();
      setWorldState(data.updated_world_state);
      setTranscript(data.transcript || []);
      setCommandPlan(data.command_plan || "");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const triggerReset = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/reset", { method: "POST" });
      const data = await res.json();
      setWorldState(data.state);
      setTranscript([]);
      setCommandPlan("");
    } catch (e) {
      console.error(e);
    }
  };

  const playVoiceBroadcast = () => {
    setIsPlayingAudio(true);
    const audio = new Audio(`http://127.0.0.1:8000/api/audio/latest?t=${Date.now()}`);
    audio.play().catch(() => setIsPlayingAudio(false));
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  return (
    <div className="min-h-screen bg-[#140b06] p-3 text-slate-800 select-none flex flex-col justify-between relative">
      <Head>
        <title>AEGIS — Tactical Skeuomorphic C2 Console</title>
      </Head>

      {/* PORTAL NAVIGATION BAR */}
      <Navbar />

      {/* TOP RIVETED ALUMINUM HEADER SLAB */}
      <header className="plate-metal rounded-md p-3.5 mb-3 flex flex-wrap items-center justify-between relative">
        {/* Corner Screws */}
        <div className="rivet absolute top-1.5 left-1.5"></div>
        <div className="rivet absolute top-1.5 right-1.5"></div>
        <div className="rivet absolute bottom-1.5 left-1.5"></div>
        <div className="rivet absolute bottom-1.5 right-1.5"></div>

        {/* 1. Brass Badge & Title */}
        <div className="flex items-center space-x-3.5 pl-3">
          <div className="w-12 h-12 bg-gradient-to-b from-[#e3bf7a] via-[#ba8d38] to-[#6a4c14] rounded border-2 border-[#543b0c] flex items-center justify-center shadow-md">
            <div className="w-7 h-7 border-2 border-[#45310c] rotate-45 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[#45310c]"></div>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black tracking-widest text-[#1e2736] flex items-center space-x-2 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              <span>AEGIS</span>
              <span className="text-gray-500 font-light">—</span>
            </div>
            <div className="text-[10px] tracking-wider uppercase font-bold text-[#4b5563] bg-[#d3d9e3] px-2 py-0.5 rounded border border-[#a2abb9]">
              Agentic Emergency Response System
            </div>
          </div>
        </div>

        {/* 2. Embedded Recessed Telemetry Plate */}
        <div className="hidden lg:flex items-center space-x-5 text-[11px] font-bold bg-[#14171d] text-[#c0cad8] border-2 border-[#38404d] px-5 py-2 rounded-sm shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)]">
          <span>STATUS: <span className="text-[#38ef7d]">ACTIVE</span></span>
          <span className="text-gray-600">•</span>
          <span>THREAT LEVEL: <span className="text-[#f59e0b]">ELEVATED</span></span>
          <span className="text-gray-600">•</span>
          <span>CLASSIFICATION: <span className="text-[#60a5fa]">RESTRICTED</span></span>
        </div>

        {/* 3. VFD Clock & Physical Push Buttons */}
        <div className="flex items-center space-x-4 pr-3">
          {/* Green VFD Terminal Display */}
          <div className="vfd-display px-3 py-1.5 rounded font-mono text-center text-xs font-bold tracking-widest">
            <div>2026-09-25</div>
            <div>02:17:34 UTC</div>
          </div>

          {/* PAUSE Push-Button with Red Bulb */}
          <div className="text-center">
            <button 
              onClick={triggerReset} 
              className="w-10 h-10 rounded-full analog-btn flex items-center justify-center mx-auto"
            >
              <div className="w-4 h-4 rounded-full led-bulb-red"></div>
            </button>
            <span className="text-[9px] font-black uppercase text-[#374151] mt-0.5 block tracking-wider">PAUSE</span>
          </div>

          {/* REPLAN Push-Button with Amber Bulb */}
          <div className="text-center">
            <button 
              onClick={triggerReplan}
              disabled={isSimulating}
              className="w-10 h-10 rounded-full analog-btn flex items-center justify-center mx-auto"
            >
              <div className={`w-4 h-4 rounded-full ${isSimulating ? 'led-bulb-amber animate-ping' : 'led-bulb-amber'}`}></div>
            </button>
            <span className="text-[9px] font-black uppercase text-[#374151] mt-0.5 block tracking-wider">REPLAN</span>
          </div>

          {/* BROADCAST Push-Button with Red/Orange Bulb */}
          <div className="text-center">
            <button 
              onClick={playVoiceBroadcast}
              className="w-10 h-10 rounded-full analog-btn flex items-center justify-center mx-auto"
            >
              <div className={`w-4 h-4 rounded-full ${isPlayingAudio ? 'led-bulb-red animate-pulse' : 'led-bulb-amber'}`}></div>
            </button>
            <span className="text-[9px] font-black uppercase text-[#374151] mt-0.5 block tracking-wider">BROADCAST</span>
          </div>
        </div>
      </header>

      {/* MAIN 3-PANEL WOOD CONSOLE DISPLAY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1">
        
        {/* [ 01 ] SHARED WORLD STATE (WOOD-FRAMED SUB-CONSOLE) */}
        <div className="lg:col-span-3 frame-wood rounded-md p-3 flex flex-col justify-between relative shadow-2xl">
          <div className="rivet absolute top-2 left-2"></div>
          <div className="rivet absolute top-2 right-2"></div>

          <div>
            {/* Brass Title Plate */}
            <div className="bg-gradient-to-r from-[#ca9e5a] via-[#e5c583] to-[#b38843] border border-[#6b4e1b] py-1 px-3 rounded-sm shadow-sm flex items-center justify-between text-xs font-black tracking-wider text-[#2d1e07] mb-3">
              <span>[ 01 ] SHARED WORLD STATE</span>
              <div className="w-2 h-2 rounded-full led-bulb-green"></div>
            </div>

            {/* Sub-Panel: Infrastructure */}
            <div className="sub-panel-metal p-2.5 rounded border border-[#626e7e] mb-3 relative">
              <div className="text-[9px] font-black uppercase tracking-wider text-[#1e293b] mb-1 bg-[#d5dde8] px-1.5 py-0.5 rounded inline-block border border-[#9ca3af]">
                INFRASTRUCTURE
              </div>
              <div className="flex items-center space-x-3 mt-1">
                <div className="text-xs text-[#1e293b] font-bold flex-1 leading-snug">
                  <div className="text-[10px] bg-[#22c55e] text-black px-1.5 py-0.5 rounded font-black inline-block mb-1 shadow-sm">
                    OPERATIONAL — 92%
                  </div>
                  <div>Roads: 42 segments | <span className="text-[#b91c1c]">3 degraded</span></div>
                </div>

                {/* Analog Infrastructure Meter */}
                <div className="w-14 h-14 rounded-full gauge-dial flex items-center justify-center relative shadow-inner">
                  <div className="absolute inset-1 rounded-full border border-dashed border-[#888]"></div>
                  <div className="w-1 h-6 bg-[#b91c1c] absolute bottom-6 origin-bottom transform rotate-45 shadow-sm"></div>
                  <div className="w-2 h-2 bg-[#222] rounded-full z-10"></div>
                  <span className="absolute bottom-1 text-[7px] font-black text-gray-700">92%</span>
                </div>
              </div>
            </div>

            {/* Sub-Panel: Hospitals Gauges */}
            <div className="sub-panel-metal p-2.5 rounded border border-[#626e7e] mb-3">
              <div className="text-[9px] font-black uppercase tracking-wider text-[#1e293b] mb-2 bg-[#d5dde8] px-1.5 py-0.5 rounded inline-block border border-[#9ca3af]">
                HOSPITALS
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Gauge 1: General Hospital */}
                <div className="bezel-recessed p-2 rounded text-center">
                  <div className="w-14 h-14 rounded-full gauge-dial mx-auto relative flex items-center justify-center mb-1">
                    <div className="w-0.5 h-6 bg-[#dc2626] absolute bottom-6 origin-bottom transform rotate-[35deg]"></div>
                    <div className="w-2 h-2 bg-[#111] rounded-full z-10"></div>
                    <span className="absolute bottom-1 text-[7px] font-bold text-gray-700">76%</span>
                  </div>
                  <div className="text-[9px] font-black text-[#e2e8f0]">GENERAL HOSPITAL</div>
                  <div className="text-[8px] text-[#38ef7d]">CAPACITY 76%</div>
                  <div className="text-[7px] text-gray-400 mt-0.5">Beds: {worldState?.hospitals?.H1?.available_beds ?? 28}/37</div>
                </div>

                {/* Gauge 2: St Luke's Med */}
                <div className="bezel-recessed p-2 rounded text-center">
                  <div className="w-14 h-14 rounded-full gauge-dial mx-auto relative flex items-center justify-center mb-1">
                    <div className="w-0.5 h-6 bg-[#dc2626] absolute bottom-6 origin-bottom transform -rotate-[20deg]"></div>
                    <div className="w-2 h-2 bg-[#111] rounded-full z-10"></div>
                    <span className="absolute bottom-1 text-[7px] font-bold text-gray-700">41%</span>
                  </div>
                  <div className="text-[9px] font-black text-[#e2e8f0]">ST. LUKE'S MED</div>
                  <div className="text-[8px] text-[#fbbf24]">CAPACITY 41%</div>
                  <div className="text-[7px] text-gray-400 mt-0.5">Beds: {worldState?.hospitals?.H2?.available_beds ?? 12}/29</div>
                </div>
              </div>
            </div>

            {/* Sub-Panel: Fleet Fuel Status Dial Gauges */}
            <div className="sub-panel-metal p-2.5 rounded border border-[#626e7e]">
              <div className="text-[9px] font-black uppercase tracking-wider text-[#1e293b] mb-2 bg-[#d5dde8] px-1.5 py-0.5 rounded inline-block border border-[#9ca3af]">
                FLEET FUEL STATUS
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                {/* Fuel 1 */}
                <div className="bezel-recessed p-1 rounded">
                  <div className="w-10 h-10 rounded-full gauge-dial mx-auto relative flex items-center justify-center">
                    <div className="w-0.5 h-4 bg-[#b91c1c] absolute bottom-4 origin-bottom transform rotate-[40deg]"></div>
                    <div className="w-1.5 h-1.5 bg-[#111] rounded-full"></div>
                  </div>
                  <div className="text-[8px] font-bold text-gray-200 mt-1">AMB-07</div>
                  <div className="text-[7px] text-[#22c55e]">FUEL 84%</div>
                </div>
                {/* Fuel 2 */}
                <div className="bezel-recessed p-1 rounded">
                  <div className="w-10 h-10 rounded-full gauge-dial mx-auto relative flex items-center justify-center">
                    <div className="w-0.5 h-4 bg-[#b91c1c] absolute bottom-4 origin-bottom transform -rotate-[50deg]"></div>
                    <div className="w-1.5 h-1.5 bg-[#111] rounded-full"></div>
                  </div>
                  <div className="text-[8px] font-bold text-gray-200 mt-1">ENG-12</div>
                  <div className="text-[7px] text-[#ef4444]">FUEL 22%</div>
                </div>
                {/* Fuel 3 */}
                <div className="bezel-recessed p-1 rounded">
                  <div className="w-10 h-10 rounded-full gauge-dial mx-auto relative flex items-center justify-center">
                    <div className="w-0.5 h-4 bg-[#b91c1c] absolute bottom-4 origin-bottom transform rotate-[15deg]"></div>
                    <div className="w-1.5 h-1.5 bg-[#111] rounded-full"></div>
                  </div>
                  <div className="text-[8px] font-bold text-gray-200 mt-1">FIRE-03</div>
                  <div className="text-[7px] text-[#fbbf24]">FUEL 68%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#331c0f] pt-2 text-[9px] font-bold text-[#d4af72] flex justify-between">
            <span>TOTAL: 14 UNITS</span>
            <span>OFFLINE: 1</span>
            <span>CHARGING: 2</span>
          </div>
        </div>

        {/* [ 02 ] 3D REAL-WORLD TACTICAL MAP */}
        <div className="lg:col-span-6 frame-wood rounded-md p-3 flex flex-col justify-between relative shadow-2xl">
          <div className="rivet absolute top-2 left-2"></div>
          <div className="rivet absolute top-2 right-2"></div>

          {/* Brass Header Plate */}
          <div className="bg-gradient-to-r from-[#ca9e5a] via-[#e5c583] to-[#b38843] border border-[#6b4e1b] py-1 px-3 rounded-sm shadow-sm flex items-center justify-between text-xs font-black tracking-wider text-[#2d1e07] mb-2">
            <span>[ 02 ] 3D TACTICAL CITY PERSPECTIVE — SECTOR 5 & 6</span>
            <div className="flex items-center space-x-1 text-[10px] font-black">
              <span className="w-2 h-2 rounded-full led-bulb-amber animate-pulse"></span>
              <span>3D SENSOR LINK ACTIVE</span>
            </div>
          </div>

          {/* Real-Life 3D Map Box */}
          <RealWorld3DMap worldState={worldState} />

          {/* Analog Indicator Legend */}
          <div className="sub-panel-metal p-1.5 rounded mt-2 flex flex-wrap items-center justify-between text-[9px] font-black text-[#1e293b]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full led-bulb-green"></span>
              <span>AMBULANCE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full led-bulb-red"></span>
              <span>FIRE TRUCK</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>POLICE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="text-red-700 font-black">⊗</span>
              <span>ROAD BLOCKED</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-red-600"></span>
              <span>BURNING</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-amber-400"></span>
              <span>EVAC ZONE</span>
            </span>
          </div>
        </div>

        {/* [ 03 ] LIVE AGENT ACTIVITY FEED (PAPER TELETYPE TICKER) */}
        <div className="lg:col-span-3 frame-wood rounded-md p-3 flex flex-col justify-between relative shadow-2xl">
          <div className="rivet absolute top-2 left-2"></div>
          <div className="rivet absolute top-2 right-2"></div>

          <div>
            {/* Brass Title Plate */}
            <div className="bg-gradient-to-r from-[#ca9e5a] via-[#e5c583] to-[#b38843] border border-[#6b4e1b] py-1 px-3 rounded-sm shadow-sm flex items-center justify-between text-xs font-black tracking-wider text-[#2d1e07] mb-2.5">
              <span>[ 03 ] LIVE AGENT ACTIVITY FEED</span>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full led-bulb-green"></span>
                <span className="text-[10px] text-green-950 font-bold">LIVE</span>
              </div>
            </div>

            {/* Recessed Paper Scroll Chute */}
            <div className="bezel-recessed p-2 rounded max-h-[500px] overflow-y-auto space-y-2.5">
              {/* Typewritten Paper Ribbon 1 */}
              <div className="paper-strip p-2 rounded-sm text-xs font-mono">
                <div className="flex justify-between items-center text-[9px] font-black border-b border-[#cca96a] pb-1 mb-1">
                  <span>02:17:31</span>
                  <span className="bg-[#b45309] text-white px-1.5 py-0.2 rounded text-[8px] uppercase">COMMAND</span>
                </div>
                <div className="leading-snug text-[10px] font-serif">
                  {commandPlan ? commandPlan.substring(0, 110) + "..." : "Replan initiated: Route recalculated for AMB-07 to GH."}
                </div>
              </div>

              {/* Typewritten Paper Ribbon 2 */}
              <div className="paper-strip p-2 rounded-sm text-xs font-mono">
                <div className="flex justify-between items-center text-[9px] font-black border-b border-[#cca96a] pb-1 mb-1">
                  <span>02:17:26</span>
                  <span className="bg-[#0284c7] text-white px-1.5 py-0.2 rounded text-[8px] uppercase">MEDICAL</span>
                </div>
                <div className="leading-snug text-[10px] font-serif">
                  AMB-12 enroute to ST. LUKE'S — ETA 3.1min Priority: HIGH
                </div>
              </div>

              {/* Typewritten Paper Ribbon 3 */}
              <div className="paper-strip p-2 rounded-sm text-xs font-mono">
                <div className="flex justify-between items-center text-[9px] font-black border-b border-[#cca96a] pb-1 mb-1">
                  <span>02:17:19</span>
                  <span className="bg-[#b91c1c] text-white px-1.5 py-0.2 rounded text-[8px] uppercase">FIRE</span>
                </div>
                <div className="leading-snug text-[10px] font-serif">
                  FIRE-03 engaged at Sector 5C. Water supply connected.
                </div>
              </div>

              {/* Typewritten Paper Ribbon 4 */}
              <div className="paper-strip p-2 rounded-sm text-xs font-mono">
                <div className="flex justify-between items-center text-[9px] font-black border-b border-[#cca96a] pb-1 mb-1">
                  <span>02:17:12</span>
                  <span className="bg-[#1e40af] text-white px-1.5 py-0.2 rounded text-[8px] uppercase">POLICE</span>
                </div>
                <div className="leading-snug text-[10px] font-serif">
                  POL-02 secured perimeter Sector 6. Roadblock established at 5th & Main.
                </div>
              </div>

              {/* Typewritten Paper Ribbon 5 */}
              <div className="paper-strip p-2 rounded-sm text-xs font-mono">
                <div className="flex justify-between items-center text-[9px] font-black border-b border-[#cca96a] pb-1 mb-1">
                  <span>02:17:04</span>
                  <span className="bg-[#4338ca] text-white px-1.5 py-0.2 rounded text-[8px] uppercase">LOGISTICS</span>
                </div>
                <div className="leading-snug text-[10px] font-serif">
                  Fuel convoy dispatched to ENG-12. ETA 6min.
                </div>
              </div>

              {/* Dynamic Transcript Ticker Items */}
              {transcript.map((item, idx) => (
                <div key={idx} className="paper-strip p-2 rounded-sm text-xs font-mono">
                  <div className="flex justify-between items-center text-[9px] font-black border-b border-[#cca96a] pb-1 mb-1">
                    <span>LIVE TICKER</span>
                    <span className="bg-[#475569] text-white px-1.5 py-0.2 rounded text-[8px] uppercase">
                      {item.agent.replace("Agent", "")}
                    </span>
                  </div>
                  <div className="leading-snug text-[10px] font-serif">
                    {item.assessment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#331c0f] pt-2 text-[9px] font-bold text-[#d4af72] flex justify-between">
            <span>COMM: TELETYPE-V4</span>
            <span>SOLANA: VERIFIED</span>
          </div>
        </div>

      </div>

      {/* BOTTOM RIVETED BRUSHED-STEEL TELEMETRY DOCK */}
      <footer className="plate-metal rounded-md p-3 mt-3 grid grid-cols-2 md:grid-cols-6 gap-3 items-center relative">
        <div className="rivet absolute top-1.5 left-1.5"></div>
        <div className="rivet absolute top-1.5 right-1.5"></div>
        <div className="rivet absolute bottom-1.5 left-1.5"></div>
        <div className="rivet absolute bottom-1.5 right-1.5"></div>

        {/* Gauge Meter 1: AVG RESPONSE */}
        <div className="bezel-recessed p-2 rounded text-center">
          <div className="text-[8px] uppercase font-bold text-gray-300">AVG RESPONSE</div>
          <div className="w-12 h-12 rounded-full gauge-dial mx-auto relative flex items-center justify-center my-1">
            <div className="w-0.5 h-5 bg-[#b91c1c] absolute bottom-5 origin-bottom transform rotate-[25deg]"></div>
            <div className="w-2 h-2 bg-[#111] rounded-full z-10"></div>
          </div>
          <div className="text-sm font-black text-white">4.2min</div>
          <div className="text-[8px] text-[#22c55e]">▼ +0.8min</div>
        </div>

        {/* Gauge Meter 2: UTILIZATION */}
        <div className="bezel-recessed p-2 rounded text-center">
          <div className="text-[8px] uppercase font-bold text-gray-300">UTILIZATION</div>
          <div className="w-12 h-12 rounded-full gauge-dial mx-auto relative flex items-center justify-center my-1">
            <div className="w-0.5 h-5 bg-[#b91c1c] absolute bottom-5 origin-bottom transform rotate-[55deg]"></div>
            <div className="w-2 h-2 bg-[#111] rounded-full z-10"></div>
          </div>
          <div className="text-sm font-black text-[#fbbf24]">87%</div>
          <div className="text-[8px] text-gray-400">87% 10</div>
        </div>

        {/* Gauge Meter 3: ACTIVE AGENTS */}
        <div className="bezel-recessed p-2 rounded text-center">
          <div className="text-[8px] uppercase font-bold text-gray-300">ACTIVE AGENTS</div>
          <div className="w-12 h-12 rounded-full gauge-dial mx-auto relative flex items-center justify-center my-1">
            <div className="w-0.5 h-5 bg-[#b91c1c] absolute bottom-5 origin-bottom transform rotate-[70deg]"></div>
            <div className="w-2 h-2 bg-[#111] rounded-full z-10"></div>
          </div>
          <div className="text-sm font-black text-white">22/24</div>
          <div className="text-[8px] text-gray-400">2 Standby</div>
        </div>

        {/* Gauge Meter 4: POWER GRID */}
        <div className="bezel-recessed p-2 rounded text-center">
          <div className="text-[8px] uppercase font-bold text-gray-300">POWER GRID</div>
          <div className="w-12 h-12 rounded-full gauge-dial mx-auto relative flex items-center justify-center my-1">
            <div className="w-0.5 h-5 bg-[#b91c1c] absolute bottom-5 origin-bottom transform rotate-[65deg]"></div>
            <div className="w-2 h-2 bg-[#111] rounded-full z-10"></div>
          </div>
          <div className="text-sm font-black text-[#22c55e]">92%</div>
          <div className="text-[8px] text-[#22c55e]">STABLE</div>
        </div>

        {/* Gauge Meter 5: INCIDENTS */}
        <div className="bezel-recessed p-2 rounded text-center">
          <div className="text-[8px] uppercase font-bold text-gray-300">INCIDENTS</div>
          <div className="w-12 h-12 rounded-full gauge-dial mx-auto relative flex items-center justify-center my-1">
            <div className="w-0.5 h-5 bg-[#b91c1c] absolute bottom-5 origin-bottom transform rotate-[30deg]"></div>
            <div className="w-2 h-2 bg-[#111] rounded-full z-10"></div>
          </div>
          <div className="text-sm font-black text-[#ef4444]">7 ACTIVE</div>
          <div className="text-[8px] text-gray-400">2 HIGH • 3 MED</div>
        </div>

        {/* Interactive Physical Industrial Toggle Switch Unit */}
        <div className="bezel-recessed p-2.5 rounded flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <div className="text-[9px] font-bold text-gray-300">COMPUTE: 64%</div>
            <div className="text-[9px] font-bold text-gray-400">12ms • AEGIS-OPS</div>
            <span className={`text-[8px] font-black uppercase ${autoMode ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
              {autoMode ? "AUTO-MODE: ON" : "MANUAL-TRAIN: ON"}
            </span>
          </div>

          <button 
            onClick={toggleAuto}
            title="Click to toggle between Auto and Manual Data Injection"
            className="w-10 h-14 bg-[#1e2430] border-2 border-[#4b5563] rounded flex flex-col items-center justify-between p-1 shadow-inner cursor-pointer"
          >
            <div className={`w-2 h-2 rounded-full ${autoMode ? "led-bulb-green" : "led-bulb-amber"}`}></div>
            <div className={`w-3 h-6 bg-gradient-to-b from-[#f3f4f6] via-[#9ca3af] to-[#4b5563] rounded-full shadow-md border border-gray-600 transform transition-transform ${autoMode ? "-translate-y-2" : "translate-y-2"}`}></div>
          </button>
        </div>
      </footer>

      {/* MANUAL SCENARIO DRILL INJECTOR (ACTIVE WHEN AUTO-MODE IS OFF) */}
      {!autoMode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="frame-wood max-w-lg w-full p-4 rounded-md shadow-2xl relative text-gray-200">
            <div className="rivet absolute top-2 left-2"></div>
            <div className="rivet absolute top-2 right-2"></div>
            <div className="rivet absolute bottom-2 left-2"></div>
            <div className="rivet absolute bottom-2 right-2"></div>

            {/* Header Plate */}
            <div className="bg-gradient-to-r from-[#ca9e5a] via-[#e5c583] to-[#b38843] border border-[#6b4e1b] py-1.5 px-3 rounded-sm shadow-sm flex items-center justify-between text-xs font-black tracking-wider text-[#2d1e07] mb-3">
              <span className="flex items-center space-x-1.5">
                <AlertTriangle size={14} className="text-[#991b1b]" />
                <span>MANUAL SCENARIO DRILL INJECTOR [TRAINING OVERRIDE]</span>
              </span>
              <button 
                onClick={() => setAutoMode(true)}
                className="text-gray-800 hover:text-red-900 font-black p-0.5"
                title="Close and Return to Auto Mode"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-gray-300 mb-3 leading-snug">
              Auto-mode disabled. Inject custom hazard telemetry, simulate secondary disaster collapses, or inject casualties to evaluate autonomous swarm coordination.
            </p>

            <div className="sub-panel-metal p-3 rounded text-[#1e293b] space-y-2.5 text-xs font-bold">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-700 block mb-0.5">Incident Type</label>
                  <select 
                    value={customIncident.incident_type} 
                    onChange={(e) => setCustomIncident({ ...customIncident, incident_type: e.target.value })}
                    className="w-full bg-white border border-gray-400 p-1.5 rounded text-xs font-bold text-gray-900"
                  >
                    <option value="structural_collapse">Structural Collapse</option>
                    <option value="gas_leak_explosion">Gas Line Explosion</option>
                    <option value="flash_flood">Flash Flood Surge</option>
                    <option value="hazardous_spill">Hazmat / Chemical Spill</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-gray-700 block mb-0.5">Target Location</label>
                  <select 
                    value={customIncident.location} 
                    onChange={(e) => setCustomIncident({ ...customIncident, location: e.target.value })}
                    className="w-full bg-white border border-gray-400 p-1.5 rounded text-xs font-bold text-gray-900"
                  >
                    <option value="Sector_5C">Sector 5C (Building A)</option>
                    <option value="Sector_6B">Sector 6B (Subway Concourse)</option>
                    <option value="Building_C">Building C (Industrial Park)</option>
                    <option value="Evac_Zone">Evacuation Zone Perimeter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-700 block mb-0.5">Severity</label>
                  <select 
                    value={customIncident.severity} 
                    onChange={(e) => setCustomIncident({ ...customIncident, severity: e.target.value })}
                    className="w-full bg-white border border-gray-400 p-1.5 rounded text-xs font-bold text-red-700"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-gray-700 block mb-0.5">Block Road</label>
                  <select 
                    value={customIncident.block_road} 
                    onChange={(e) => setCustomIncident({ ...customIncident, block_road: e.target.value })}
                    className="w-full bg-white border border-gray-400 p-1.5 rounded text-xs font-bold text-gray-900"
                  >
                    <option value="Road_D4">Road D4</option>
                    <option value="Road_C3">Road C3</option>
                    <option value="Road_B2">Road B2</option>
                    <option value="Road_A1">Road A1</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-gray-700 block mb-0.5">Casualties</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={15}
                    value={customIncident.patient_count}
                    onChange={(e) => setCustomIncident({ ...customIncident, patient_count: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white border border-gray-400 p-1.5 rounded text-xs font-black text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-gray-700 block mb-0.5">Incident Description / Telemetry Digest</label>
                <textarea 
                  rows={2}
                  value={customIncident.details}
                  onChange={(e) => setCustomIncident({ ...customIncident, details: e.target.value })}
                  className="w-full bg-white border border-gray-400 p-1.5 rounded text-xs font-mono text-gray-900"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button 
                  onClick={injectScenarioData}
                  className="flex-1 plate-metal py-2 rounded text-xs font-black uppercase text-[#1e293b] flex items-center justify-center space-x-1.5 hover:bg-[#cbd5e1] transition shadow-md"
                >
                  <Send size={13} />
                  <span>Transmit Scenario Data to Swarm</span>
                </button>

                <button 
                  onClick={() => setAutoMode(true)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold uppercase transition"
                >
                  Return to Auto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}