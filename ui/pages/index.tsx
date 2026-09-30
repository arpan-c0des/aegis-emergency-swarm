import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { RealWorld3DMap } from '../components/RealWorld3DMap';
import { 
  Flame, Stethoscope, AlertTriangle, Radio, 
  MapPin, Volume2, Shield, Activity, Power, RefreshCw, X, Send, Sparkles, Clock, Check
} from 'lucide-react';

export default function ClaymorphicCommandConsole() {
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

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws";

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/state`)
      .then((res) => res.json())
      .then((data) => setWorldState(data))
      .catch((err) => console.error("API unreachable", err));

    fetch(`${BACKEND_URL}/api/config`)
      .then((res) => res.json())
      .then((cfg) => {
        if (typeof cfg.auto_mode === "boolean") setAutoMode(cfg.auto_mode);
      })
      .catch(() => {});

    const ws = new WebSocket(WS_URL);
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
      const res = await fetch(`${BACKEND_URL}/api/config/toggle-auto`, { method: "POST" });
      const data = await res.json();
      setAutoMode(data.auto_mode);
    } catch (e) {
      console.error(e);
      setAutoMode(!autoMode);
    }
  };

  const injectScenarioData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/inject-data`, {
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
      const res = await fetch(`${BACKEND_URL}/api/simulate/tick`, { method: "POST" });
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
      const res = await fetch(`${BACKEND_URL}/api/reset`, { method: "POST" });
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
    const audio = new Audio(`${BACKEND_URL}/api/audio/latest?t=${Date.now()}`);
    audio.play().catch(() => setIsPlayingAudio(false));
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case "MedicalAgent":
      case "MEDICAL":
        return { bg: "#B5DEFF", text: "#1b446f" };
      case "FireAgent":
      case "FIRE":
        return { bg: "#FFE6A5", text: "#874b0c" };
      case "PoliceAgent":
      case "POLICE":
        return { bg: "#D6C2FF", text: "#4a2d82" };
      case "LogisticsAgent":
      case "LOGISTICS":
        return { bg: "#FFB5E8", text: "#7a2a62" };
      default:
        return { bg: "#C3FFB5", text: "#2e5a2a" };
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-5 flex flex-col justify-between relative selection:bg-[#FFB5E8]/40">
      <Head>
        <title>AEGIS — Claymorphic C2 Swarm Console</title>
      </Head>

      {/* Floating Pastel Gradient Background Orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute -top-[120px] -left-[120px] w-[520px] h-[520px] rounded-full blur-[24px] opacity-[0.55]" 
          style={{ background: 'radial-gradient(circle at 30% 30%, #FFB5E8 0%, #D6C2FF 60%, transparent 75%)' }}
        />
        <div 
          className="absolute top-[10%] right-[-80px] w-[440px] h-[440px] rounded-full blur-[26px] opacity-[0.45]" 
          style={{ background: 'radial-gradient(circle at 40% 40%, #B5DEFF 0%, #E8E9FF 70%)' }}
        />
        <div 
          className="absolute bottom-[-120px] left-[20%] w-[620px] h-[620px] rounded-full blur-[30px] opacity-[0.5]" 
          style={{ background: 'radial-gradient(circle at 30% 30%, #FFE6A5 0%, #FFB5E8 50%, transparent 75%)' }}
        />
      </div>

      {/* NAVBAR */}
      <Navbar />

      {/* TOP CLAY HEADER SLAB */}
      <header className="clay-card p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-[#FFB5E8] to-[#D6C2FF] border-[3px] border-white flex items-center justify-center shrink-0"
            style={{ boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.9), 3px 5px 12px rgba(120,110,150,0.18)' }}
          >
            <Sparkles className="text-white" size={22} strokeWidth={2.6} />
          </div>
          <div>
            <div className="text-2xl font-[800] tracking-[-0.03em] text-[#2F2940] flex items-center gap-1.5">
              <span>AEGIS</span>
              <span className="text-[#A99DC0] font-[500]">—</span>
            </div>
            <div className="text-[11px] font-[700] text-[#8E819E] tracking-wide uppercase">
              Agentic Emergency Response System
            </div>
          </div>
        </div>

        {/* Telemetry Status Pills */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="clay-inset px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C3FFB5] border border-white animate-pulse"></span>
            <span className="text-[11px] font-[700] text-[#3E3650]">STATUS: <b className="text-[#2E5A2A]">ACTIVE</b></span>
          </div>

          <div className="clay-inset px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFE6A5] border border-white"></span>
            <span className="text-[11px] font-[700] text-[#3E3650]">THREAT: <b className="text-[#874b0c]">ELEVATED</b></span>
          </div>

          <div className="clay-inset px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B5DEFF] border border-white"></span>
            <span className="text-[11px] font-[700] text-[#3E3650]">SECURITY: <b className="text-[#244974]">RESTRICTED</b></span>
          </div>
        </div>

        {/* Clock & Action Clay Buttons */}
        <div className="flex items-center gap-3">
          <div className="clay-inset px-3 py-1.5 rounded-[14px] text-center">
            <div className="text-[10px] font-[800] text-[#7B6E96]">{clock}</div>
          </div>

          <button
            onClick={triggerReset}
            className="clay-button px-4 py-2 rounded-full font-[800] text-[12px] bg-white text-[#5A4E75] hover:bg-[#F3EFFC] flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>RESET</span>
          </button>

          <button
            onClick={triggerReplan}
            disabled={isSimulating}
            className="clay-button px-5 py-2 rounded-full font-[800] text-[12px] bg-[#B5DEFF] text-[#1b446f] flex items-center gap-1.5"
          >
            <Activity size={14} className={isSimulating ? "animate-spin" : ""} />
            <span>{isSimulating ? "REPLANNING..." : "REPLAN"}</span>
          </button>

          <button
            onClick={playVoiceBroadcast}
            disabled={isPlayingAudio}
            className={`clay-button px-5 py-2 rounded-full font-[800] text-[12px] flex items-center gap-1.5 ${
              isPlayingAudio ? "bg-[#FFB5E8] text-[#7a2a62] animate-pulse" : "bg-[#FFE6A5] text-[#874b0c]"
            }`}
          >
            <Radio size={14} />
            <span>{isPlayingAudio ? "TRANSMITTING" : "BROADCAST"}</span>
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN CLAY WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        
        {/* [01] SHARED WORLD STATE */}
        <div className="lg:col-span-3 clay-card p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-3">
              <span className="font-[800] text-[13px] text-[#5A4E75] tracking-[0.08em]">[ 01 ] SHARED WORLD STATE</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#C3FFB5] border-2 border-white animate-pulse"></div>
            </div>

            {/* Infrastructure */}
            <div className="mb-4">
              <span className="text-[10px] font-[800] uppercase tracking-wider text-[#9A8EB0]">Infrastructure</span>
              <div className="clay-inset p-3 rounded-[20px] mt-1.5 flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-[14px] bg-[#B5DEFF] border-[2px] border-white flex items-center justify-center shrink-0"
                  style={{ boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.9), 2px 2px 6px rgba(0,0,0,0.06)' }}
                >
                  <Activity size={18} className="text-[#244974]" />
                </div>
                <div className="text-xs">
                  <div className="font-[700] text-[#3E3650]">
                    Roads: 42 segments | <span className="text-[#dc2626]">3 degraded</span>
                  </div>
                  <div className="text-[11px] font-[800] text-[#2E5A2A] mt-0.5">Status: 92% Operational</div>
                </div>
              </div>
            </div>

            {/* Hospitals */}
            <div className="space-y-3 mb-4">
              <span className="text-[10px] font-[800] uppercase tracking-wider text-[#9A8EB0]">Hospitals</span>

              {/* General Hospital */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex justify-between items-center text-xs font-[800] text-[#3E3650] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} className="text-[#244974]" />
                    <span>GENERAL HOSPITAL</span>
                  </div>
                  <span className="text-[#244974]">76%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E6DFF5] overflow-hidden border border-white mb-2">
                  <div className="h-full rounded-full bg-[#B5DEFF] transition-all" style={{ width: '76%' }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-[700] text-[#8E819E]">
                  <span>Power: <b className="text-[#2E5A2A]">NOMINAL</b></span>
                  <span>Beds: {worldState?.hospitals?.H1?.available_beds ?? 28}/37</span>
                </div>
              </div>

              {/* St. Luke's */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex justify-between items-center text-xs font-[800] text-[#3E3650] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} className="text-[#874b0c]" />
                    <span>ST. LUKE'S MED</span>
                  </div>
                  <span className="text-[#874b0c]">41%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E6DFF5] overflow-hidden border border-white mb-2">
                  <div className="h-full rounded-full bg-[#FFE6A5] transition-all" style={{ width: '41%' }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-[700] text-[#8E819E]">
                  <span>Generator: <b className="text-[#874b0c]">ACTIVE</b></span>
                  <span>Beds: {worldState?.hospitals?.H2?.available_beds ?? 12}/29</span>
                </div>
              </div>
            </div>

            {/* Fleet Fuel Status */}
            <div>
              <span className="text-[10px] font-[800] uppercase tracking-wider text-[#9A8EB0]">Fleet Fuel Status</span>
              <div className="clay-inset p-3 rounded-[20px] mt-1.5 space-y-2 text-xs font-[700]">
                <div className="flex justify-between items-center pb-1 border-b border-[#EEE8F8]">
                  <span>AMB-07 | <b className="text-[#244974]">84%</b></span>
                  <span className="text-[10px] bg-[#C3FFB5] text-[#2E5A2A] px-2 py-0.5 rounded-full font-[800]">READY</span>
                </div>
                <div className="flex justify-between items-center pb-1 border-b border-[#EEE8F8]">
                  <span>ENG-12 | <b className="text-[#dc2626]">22%</b></span>
                  <span className="text-[10px] bg-[#FFB5E8] text-[#7a2a62] px-2 py-0.5 rounded-full font-[800]">LOW FUEL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>FIRE-03 | <b className="text-[#874b0c]">68%</b></span>
                  <span className="text-[10px] bg-[#FFE6A5] text-[#874b0c] px-2 py-0.5 rounded-full font-[800]">DEPLOYED</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#EEE8F8] flex justify-between text-[10px] font-[800] text-[#8E819E]">
            <span>TOTAL: 14 UNITS</span>
            <span>OFFLINE: 1</span>
            <span>CHARGING: 2</span>
          </div>
        </div>

        {/* [02] 3D TACTICAL CITY PERSPECTIVE */}
        <div className="lg:col-span-6 clay-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-3">
            <span className="font-[800] text-[13px] text-[#5A4E75] tracking-[0.08em]">
              [ 02 ] 3D TACTICAL CITY PERSPECTIVE — SECTOR 5 & 6
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE6A5] border-2 border-white text-[10px] font-[800] text-[#874b0c]">
              <span className="w-2 h-2 rounded-full bg-[#874b0c] animate-pulse"></span>
              <span>SENSOR LINK ACTIVE</span>
            </div>
          </div>

          {/* Embedded 3D Map Component */}
          <div className="clay-device p-2 overflow-hidden mb-3">
            <RealWorld3DMap worldState={worldState} />
          </div>

          {/* Clay Legend */}
          <div className="clay-inset p-2.5 rounded-[18px] flex flex-wrap items-center justify-between text-[10px] font-[800] text-[#5A4E75]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B5DEFF] border border-white"></span>
              <span>AMBULANCE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFE6A5] border border-white"></span>
              <span>FIRE TRUCK</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D6C2FF] border border-white"></span>
              <span>POLICE</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#dc2626] font-[800]">⊗</span>
              <span>ROAD BLOCKED</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#FFB5E8] border border-white"></span>
              <span>BURNING</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#C3FFB5] border border-white"></span>
              <span>EVAC ZONE</span>
            </span>
          </div>
        </div>

        {/* [03] LIVE AGENT ACTIVITY FEED */}
        <div className="lg:col-span-3 clay-card p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-3">
              <span className="font-[800] text-[13px] text-[#5A4E75] tracking-[0.08em]">
                [ 03 ] LIVE AGENT ACTIVITY FEED
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C3FFB5] border-2 border-white text-[10px] font-[800] text-[#2E5A2A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E5A2A] animate-pulse"></span>
                <span>LIVE</span>
              </div>
            </div>

            {/* Scrollable Soft Activity Stream */}
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {/* Command Action */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-[700] text-[#9A8EB0]">02:17:31</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFE6A5] text-[#874b0c] text-[10px] font-[800] border border-white">
                    COMMAND
                  </span>
                </div>
                <div className="text-[12px] font-[600] text-[#3E3650] leading-snug">
                  {commandPlan ? commandPlan.substring(0, 110) + "..." : "Replan initiated: Route recalculated for AMB-07 to General Hospital."}
                </div>
              </div>

              {/* Medical Feed */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-[700] text-[#9A8EB0]">02:17:26</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#B5DEFF] text-[#1b446f] text-[10px] font-[800] border border-white">
                    MEDICAL
                  </span>
                </div>
                <div className="text-[12px] font-[600] text-[#3E3650] leading-snug">
                  AMB-12 enroute to ST. LUKE'S — ETA 3.1min Priority: HIGH
                </div>
              </div>

              {/* Fire Feed */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-[700] text-[#9A8EB0]">02:17:19</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFB5E8] text-[#7a2a62] text-[10px] font-[800] border border-white">
                    FIRE
                  </span>
                </div>
                <div className="text-[12px] font-[600] text-[#3E3650] leading-snug">
                  FIRE-03 engaged at Sector 5C. Water supply connected.
                </div>
              </div>

              {/* Police Feed */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-[700] text-[#9A8EB0]">02:17:12</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#D6C2FF] text-[#4a2d82] text-[10px] font-[800] border border-white">
                    POLICE
                  </span>
                </div>
                <div className="text-[12px] font-[600] text-[#3E3650] leading-snug">
                  POL-02 secured perimeter Sector 6. Roadblock established at 5th & Main.
                </div>
              </div>

              {/* Dynamic Transcript Items from Swarm Deliberation */}
              {transcript.map((item, idx) => {
                const color = getAgentColor(item.agent);
                return (
                  <div key={idx} className="clay-card p-3 rounded-[20px] bg-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-[700] text-[#9A8EB0]">SWARM EVENT</span>
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-[800] border border-white"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {item.agent.toUpperCase().replace("AGENT", "")}
                      </span>
                    </div>
                    <div className="text-[12px] font-[600] text-[#3E3650] leading-snug">
                      {item.assessment}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#EEE8F8] flex justify-between text-[10px] font-[800] text-[#8E819E]">
            <span>COMM: GEMINI-SWARM</span>
            <span>SOLANA: VERIFIED</span>
          </div>
        </div>

      </div>

      {/* BOTTOM CLAY TELEMETRY DOCK */}
      <footer className="clay-card p-4 mt-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
        {/* Metric 1 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">AVG RESPONSE</div>
          <div className="text-xl font-[800] text-[#244974] mt-0.5">4.2min</div>
          <div className="text-[10px] font-[800] text-[#2E5A2A]">▼ +0.8min</div>
        </div>

        {/* Metric 2 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">UTILIZATION</div>
          <div className="text-xl font-[800] text-[#874b0c] mt-0.5">87%</div>
          <div className="h-1.5 rounded-full bg-[#E6DFF5] overflow-hidden border border-white mt-1">
            <div className="h-full rounded-full bg-[#FFE6A5]" style={{ width: '87%' }}></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">ACTIVE AGENTS</div>
          <div className="text-xl font-[800] text-[#2F2940] mt-0.5">22/24</div>
          <div className="text-[10px] font-[700] text-[#8E819E]">2 Standby</div>
        </div>

        {/* Metric 4 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">POWER GRID</div>
          <div className="text-xl font-[800] text-[#2E5A2A] mt-0.5">92%</div>
          <div className="text-[10px] font-[800] text-[#2E5A2A]">STABLE</div>
        </div>

        {/* Metric 5 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">INCIDENTS</div>
          <div className="text-xl font-[800] text-[#dc2626] mt-0.5">7 ACTIVE</div>
          <div className="text-[10px] font-[700] text-[#8E819E]">2 HIGH • 3 MED</div>
        </div>

        {/* Interactive Clay Auto/Manual Toggle Switch Unit */}
        <div className="clay-inset p-3 rounded-[20px] flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <div className="text-[10px] font-[800] text-[#7B6E96]">LOAD 64% • 12ms</div>
            <div className={`text-[11px] font-[800] uppercase mt-0.5 ${autoMode ? "text-[#2E5A2A]" : "text-[#874b0c]"}`}>
              {autoMode ? "AUTO: ON" : "DRILL: ON"}
            </div>
          </div>

          <button
            onClick={toggleAuto}
            title="Click to toggle between Auto and Manual Drill Data Injection"
            className="relative w-[62px] h-[36px] rounded-full border-[3px] border-white transition-all duration-300 shrink-0"
            style={{
              background: autoMode ? "#C3FFB5" : "#FFE6A5",
              boxShadow: "inset 3px 3px 8px rgba(0,0,0,0.08), 8px 10px 20px rgba(120,110,150,0.18)"
            }}
          >
            <div 
              className="absolute top-[2px] w-[26px] h-[26px] rounded-full border-[2.5px] border-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center"
              style={{
                left: autoMode ? "28px" : "2px",
                background: "#FFFFFF",
                boxShadow: "inset 2px 2px 4px rgba(255,255,255,1), 2px 3px 8px rgba(0,0,0,0.12)",
                transform: autoMode ? "scale(1.05)" : "scale(1)"
              }}
            >
              <div 
                className="w-[6px] h-[6px] rounded-full" 
                style={{ background: autoMode ? "#3A5A2E" : "#874b0c" }} 
              />
            </div>
          </button>
        </div>
      </footer>

      {/* CLAY MANUAL SCENARIO DRILL INJECTOR (ACTIVE WHEN AUTO-MODE IS OFF) */}
      {!autoMode && (
        <div className="fixed inset-0 bg-[#2F2940]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="clay-device max-w-lg w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFE6A5] border-2 border-white flex items-center justify-center">
                  <AlertTriangle size={16} className="text-[#874b0c]" />
                </div>
                <span className="font-[800] text-[14px] text-[#2F2940]">
                  MANUAL DRILL SCENARIO INJECTOR
                </span>
              </div>
              <button 
                onClick={() => setAutoMode(true)}
                className="w-8 h-8 rounded-full bg-white border-2 border-white flex items-center justify-center text-[#8E819E] hover:text-[#2F2940]"
                style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.08)' }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[12px] font-[600] text-[#7B6E96] mb-4 leading-relaxed">
              Auto-mode disabled. Inject custom disaster hazards and casualities to train the multi-agent swarm in real time.
            </p>

            <div className="space-y-3 font-[700] text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Incident Type</label>
                  <select 
                    value={customIncident.incident_type} 
                    onChange={(e) => setCustomIncident({ ...customIncident, incident_type: e.target.value })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[700] text-[#3E3650] outline-none"
                  >
                    <option value="structural_collapse">Structural Collapse</option>
                    <option value="gas_leak_explosion">Gas Line Explosion</option>
                    <option value="flash_flood">Flash Flood Surge</option>
                    <option value="hazardous_spill">Hazmat / Chemical Spill</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Target Location</label>
                  <select 
                    value={customIncident.location} 
                    onChange={(e) => setCustomIncident({ ...customIncident, location: e.target.value })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[700] text-[#3E3650] outline-none"
                  >
                    <option value="Sector_5C">Sector 5C (Building A)</option>
                    <option value="Sector_6B">Sector 6B (Subway Concourse)</option>
                    <option value="Building_C">Building C (Industrial Park)</option>
                    <option value="Evac_Zone">Evacuation Zone Perimeter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Severity</label>
                  <select 
                    value={customIncident.severity} 
                    onChange={(e) => setCustomIncident({ ...customIncident, severity: e.target.value })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[800] text-[#dc2626] outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Block Road</label>
                  <select 
                    value={customIncident.block_road} 
                    onChange={(e) => setCustomIncident({ ...customIncident, block_road: e.target.value })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[700] text-[#3E3650] outline-none"
                  >
                    <option value="Road_D4">Road D4</option>
                    <option value="Road_C3">Road C3</option>
                    <option value="Road_B2">Road B2</option>
                    <option value="Road_A1">Road A1</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Casualties</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={15}
                    value={customIncident.patient_count}
                    onChange={(e) => setCustomIncident({ ...customIncident, patient_count: parseInt(e.target.value) || 1 })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[800] text-[#2F2940] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Incident Telemetry Details</label>
                <textarea 
                  rows={2}
                  value={customIncident.details}
                  onChange={(e) => setCustomIncident({ ...customIncident, details: e.target.value })}
                  className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[600] text-[#3E3650] outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={injectScenarioData}
                  className="flex-1 clay-button py-3 rounded-full font-[800] text-xs bg-[#B5DEFF] text-[#1b446f] flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>Transmit Scenario Data to Swarm</span>
                </button>

                <button 
                  onClick={() => setAutoMode(true)}
                  className="clay-button px-5 py-3 rounded-full font-[800] text-xs bg-white text-[#7B6E96]"
                >
                  Back to Auto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}