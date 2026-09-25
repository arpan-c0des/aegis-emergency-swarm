import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Flame, Stethoscope, AlertTriangle, Radio, 
  MapPin, Volume2, Shield, Activity, Power, RefreshCw
} from 'lucide-react';

export default function SkeuomorphicCommandConsole() {
  const [worldState, setWorldState] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [commandPlan, setCommandPlan] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [clock, setClock] = useState<string>("2026-09-25 02:17:34 UTC");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/state")
      .then((res) => res.json())
      .then((data) => setWorldState(data))
      .catch((err) => console.error("API unreachable", err));

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
    <div className="min-h-screen bg-[#140b06] p-3 text-slate-800 select-none flex flex-col justify-between">
      <Head>
        <title>AEGIS — Tactical Skeuomorphic C2 Console</title>
      </Head>

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

        {/* [ 02 ] 2D CITY GRID MAP — PAPER MAP & THUMBTACKS */}
        <div className="lg:col-span-6 frame-wood rounded-md p-3 flex flex-col justify-between relative shadow-2xl">
          <div className="rivet absolute top-2 left-2"></div>
          <div className="rivet absolute top-2 right-2"></div>

          {/* Brass Title Plate */}
          <div className="bg-gradient-to-r from-[#ca9e5a] via-[#e5c583] to-[#b38843] border border-[#6b4e1b] py-1 px-3 rounded-sm shadow-sm flex items-center justify-between text-xs font-black tracking-wider text-[#2d1e07] mb-2">
            <span>[ 02 ] 2D CITY GRID MAP — SECTOR 5 & 6</span>
            <div className="flex items-center space-x-1 text-[10px] font-black">
              <span className="w-2 h-2 rounded-full led-bulb-amber"></span>
              <span>GRID ACTIVE</span>
            </div>
          </div>

          {/* Parchment Street Paper Map with Drop Shadows */}
          <div className="relative w-full h-[480px] bg-[#eae5d4] border-4 border-[#2b170c] rounded shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Grid Coordinates Drawn on Paper */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'linear-gradient(to right, #475569 1px, transparent 1px), linear-gradient(to bottom, #475569 1px, transparent 1px)',
                backgroundSize: '28px 28px'
              }}
            ></div>

            {/* Evacuation Zone Shading (Yellow Highlighter Pen Effect) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon 
                points="170,410 320,160 480,260 380,440" 
                fill="rgba(245, 158, 11, 0.22)" 
                stroke="#b45309" 
                strokeWidth="2" 
                strokeDasharray="5 4" 
              />
              <line x1="160" y1="410" x2="380" y2="410" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 3" />
            </svg>

            {/* Pushpin Label: Evacuation Zone Sector 5 */}
            <div className="absolute top-[290px] left-[200px] border border-[#78350f] bg-[#fef3c7] px-2 py-0.5 text-center shadow-md">
              <div className="text-[10px] font-black text-[#92400e]">EVACUATION ZONE</div>
              <div className="text-[8px] font-bold text-[#78350f]">Sector 5</div>
            </div>

            {/* Pushpins: Burning Flags */}
            <div className="absolute top-[70px] right-[130px] flex items-center space-x-1 bg-[#ef4444] text-white font-black text-[9px] px-2 py-1 shadow-md border border-[#991b1b]">
              <Flame size={12} className="animate-bounce" />
              <span>BURNING Sector 5C</span>
            </div>

            <div className="absolute top-[200px] right-[140px] flex items-center space-x-1 bg-[#ef4444] text-white font-black text-[9px] px-2 py-1 shadow-md border border-[#991b1b]">
              <Flame size={12} className="animate-bounce" />
              <span>BURNING Sector 6B</span>
            </div>

            {/* 3D Toy Emergency Vehicle Models on Grid */}
            {/* Police POL-02 */}
            <div className="absolute top-[135px] right-[170px] flex items-center space-x-1 shadow-lg">
              <div className="w-5 h-3 bg-blue-700 border border-black rounded-sm shadow-md"></div>
              <span className="text-[8px] font-black bg-blue-900 text-white px-1 border border-black">POL-02</span>
            </div>

            {/* Fire Truck FIRE-03 & FIRE-02 */}
            <div className="absolute top-[260px] right-[120px] space-y-1">
              <div className="flex items-center space-x-1 shadow-lg">
                <div className="w-7 h-4 bg-red-700 border border-black rounded-sm shadow-md"></div>
                <span className="text-[8px] font-black bg-red-900 text-white px-1 border border-black">FIRE-03</span>
              </div>
              <div className="text-[7px] font-bold text-red-900 pl-1">FIRE-02</div>
            </div>

            {/* Ambulances AMB-07 & AMB-12 */}
            <div className="absolute bottom-[80px] left-[200px] space-y-1">
              <div className="flex items-center space-x-1 shadow-lg">
                <div className="w-6 h-3.5 bg-white border-2 border-red-600 rounded-sm shadow-md"></div>
                <span className="text-[8px] font-black bg-gray-900 text-white px-1 border border-black">AMB-07</span>
              </div>
              <div className="text-[8px] font-black text-gray-800 pl-2">AMB-12</div>
            </div>

            {/* Red Pushpins scattered */}
            <div className="absolute top-[120px] left-[150px] w-3 h-3 rounded-full bg-red-600 shadow-md border border-white"></div>
            <div className="absolute top-[180px] left-[120px] w-3 h-3 rounded-full bg-red-600 shadow-md border border-white"></div>
            <div className="absolute top-[100px] left-[250px] w-3 h-3 rounded-full bg-red-600 shadow-md border border-white"></div>
            <div className="absolute top-[140px] left-[220px] bg-red-800 text-white px-1 text-[7px] font-black">ROAD BLOCKED</div>
          </div>

          {/* Analog Indicator Lights & Pushpin Legend */}
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

        {/* Physical Industrial Toggle Switch Unit */}
        <div className="bezel-recessed p-2.5 rounded flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <div className="text-[9px] font-bold text-gray-300">COMPUTE: 64%</div>
            <div className="text-[9px] font-bold text-gray-400">12ms • AEGIS-OPS</div>
            <span className="text-[8px] font-black uppercase text-[#22c55e]">AUTO-MODE: ON</span>
          </div>

          {/* Heavy Duty Metal Toggle Lever */}
          <div className="w-10 h-14 bg-[#1e2430] border-2 border-[#4b5563] rounded flex flex-col items-center justify-between p-1 shadow-inner">
            <div className="w-2 h-2 rounded-full led-bulb-green"></div>
            <div className="w-3 h-6 bg-gradient-to-b from-[#f3f4f6] via-[#9ca3af] to-[#4b5563] rounded-full shadow-md border border-gray-600"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}