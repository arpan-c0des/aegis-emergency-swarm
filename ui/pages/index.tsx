import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { RealWorld3DMap } from '../components/RealWorld3DMap';
import { 
  Flame, Stethoscope, AlertTriangle, Radio, 
  MapPin, Volume2, Shield, Activity, Power, RefreshCw, X, Send, Sparkles, Clock, Check, ExternalLink, Copy
} from 'lucide-react';

export default function ClaymorphicCommandConsole() {
  const [worldState, setWorldState] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [commandPlan, setCommandPlan] = useState<string>("");
  const [solanaAudit, setSolanaAudit] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [clock, setClock] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

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

  // Live ticking UTC clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toISOString().replace('T', ' ').substring(0, 19) + " UTC");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "INITIAL_STATE" || msg.type === "SIMULATION_UPDATE" || msg.type === "RESET_STATE") {
          const payload = msg.data.updated_world_state || msg.data;
          setWorldState(payload);
          if (msg.data.transcript) setTranscript(msg.data.transcript);
          if (msg.data.command_plan) setCommandPlan(msg.data.command_plan);
          if (msg.data.solana_audit) setSolanaAudit(msg.data.solana_audit);
        }
      };
    } catch (_) {}

    return () => {
      if (ws) ws.close();
    };
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
      if (data.solana_audit) setSolanaAudit(data.solana_audit);
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
      setSolanaAudit(null);
    } catch (e) {
      console.error(e);
    }
  };

  const fallbackSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let textToSpeak = "Attention all units. Incident Commander broadcast: Tactical orders in effect.";
      if (commandPlan) {
        if (commandPlan.includes("Radio Broadcast:")) {
          textToSpeak = commandPlan.split("Radio Broadcast:")[1].trim();
        } else {
          textToSpeak = commandPlan.slice(0, 160);
        }
      }
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const playVoiceBroadcast = () => {
    setIsPlayingAudio(true);
    const audio = new Audio(`${BACKEND_URL}/api/audio/latest?t=${Date.now()}`);
    audio.play()
      .then(() => {
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => fallbackSpeech();
      })
      .catch(() => fallbackSpeech());
  };

  const copySolanaHash = () => {
    if (solanaAudit?.decision_sha256) {
      navigator.clipboard.writeText(solanaAudit.decision_sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
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

  const activeIncidentsList = Object.values(worldState?.incidents || {}).filter((i: any) => i.active && i.severity !== "extinguished");
  const unitsList = Object.values(worldState?.units || {});

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
              <span className="text-sm font-[800] text-[#7B6E96] bg-[#F3EFFC] px-2.5 py-0.5 rounded-full border border-white">
                TICK {worldState?.time_step ?? 0}
              </span>
            </div>
            <div className="text-[11px] font-[700] text-[#8E819E] tracking-wide uppercase">
              Autonomous Multi-Agent Emergency Response
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
            <span className={`w-2 h-2 rounded-full border border-white ${activeIncidentsList.length > 0 ? "bg-[#FFE6A5] animate-ping" : "bg-[#C3FFB5]"}`}></span>
            <span className="text-[11px] font-[700] text-[#3E3650]">
              THREAT: <b className={activeIncidentsList.length > 0 ? "text-[#874b0c]" : "text-[#2E5A2A]"}>
                {activeIncidentsList.length > 0 ? `${activeIncidentsList.length} HAZARDS` : "SECURED"}
              </b>
            </span>
          </div>

          <div className="clay-inset px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B5DEFF] border border-white"></span>
            <span className="text-[11px] font-[700] text-[#3E3650]">SOLANA DEVNET: <b className="text-[#244974]">VERIFIED</b></span>
          </div>
        </div>

        {/* Clock & Action Clay Buttons */}
        <div className="flex items-center gap-3">
          <div className="clay-inset px-3.5 py-2 rounded-[14px] text-center">
            <div className="text-[11px] font-[800] text-[#7B6E96] font-mono">{clock || "2026-11-16 02:17:34 UTC"}</div>
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
            className="clay-button px-5 py-2 rounded-full font-[800] text-[12px] bg-[#B5DEFF] text-[#1b446f] flex items-center gap-1.5 transition active:scale-95"
          >
            <Activity size={14} className={isSimulating ? "animate-spin" : ""} />
            <span>{isSimulating ? "SIMULATING..." : "SIMULATE TICK"}</span>
          </button>

          <button
            onClick={playVoiceBroadcast}
            disabled={isPlayingAudio}
            className={`clay-button px-5 py-2 rounded-full font-[800] text-[12px] flex items-center gap-1.5 transition active:scale-95 ${
              isPlayingAudio ? "bg-[#FFB5E8] text-[#7a2a62] animate-pulse" : "bg-[#FFE6A5] text-[#874b0c]"
            }`}
          >
            <Radio size={14} />
            <span>{isPlayingAudio ? "TRANSMITTING" : "VOICE DISPATCH"}</span>
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN CLAY WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        
        {/* [01] SHARED WORLD STATE */}
        <div className="lg:col-span-3 clay-card p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-3">
              <span className="font-[800] text-[13px] text-[#5A4E75] tracking-[0.08em]">[ 01 ] TELEMETRY & RESOURCES</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#C3FFB5] border-2 border-white animate-pulse"></div>
            </div>

            {/* Infrastructure */}
            <div className="mb-4">
              <span className="text-[10px] font-[800] uppercase tracking-wider text-[#9A8EB0]">Road Infrastructure</span>
              <div className="clay-inset p-3 rounded-[20px] mt-1.5 flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-[14px] bg-[#B5DEFF] border-[2px] border-white flex items-center justify-center shrink-0"
                  style={{ boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.9), 2px 2px 6px rgba(0,0,0,0.06)' }}
                >
                  <Activity size={18} className="text-[#244974]" />
                </div>
                <div className="text-xs">
                  <div className="font-[700] text-[#3E3650]">
                    Roads: {Object.keys(worldState?.roads || {}).length} Sectors | <span className="text-[#dc2626] font-[800]">{Object.values(worldState?.roads || {}).filter(r => r === "blocked").length} Blocked</span>
                  </div>
                  <div className="text-[11px] font-[800] text-[#2E5A2A] mt-0.5">
                    Weather: {worldState?.weather?.replace('_', ' ') || "Moderate"}
                  </div>
                </div>
              </div>
            </div>

            {/* Hospitals */}
            <div className="space-y-3 mb-4">
              <span className="text-[10px] font-[800] uppercase tracking-wider text-[#9A8EB0]">Trauma & Reception Beds</span>

              {/* General Hospital */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex justify-between items-center text-xs font-[800] text-[#3E3650] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} className="text-[#244974]" />
                    <span>CENTRAL TRAUMA (H1)</span>
                  </div>
                  <span className="text-[#244974]">
                    {Math.round(((worldState?.hospitals?.H1?.available_beds ?? 28) / (worldState?.hospitals?.H1?.total_beds ?? 37)) * 100)}% Free
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#E6DFF5] overflow-hidden border border-white mb-2">
                  <div 
                    className="h-full rounded-full bg-[#B5DEFF] transition-all" 
                    style={{ width: `${Math.round(((worldState?.hospitals?.H1?.available_beds ?? 28) / 37) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-[700] text-[#8E819E]">
                  <span>Status: <b className="text-[#2E5A2A]">TRAUMA READY</b></span>
                  <span>Beds: {worldState?.hospitals?.H1?.available_beds ?? 28}/37</span>
                </div>
              </div>

              {/* St. Luke's */}
              <div className="clay-card p-3 rounded-[20px] bg-white">
                <div className="flex justify-between items-center text-xs font-[800] text-[#3E3650] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} className="text-[#874b0c]" />
                    <span>ST. LUKE'S CLINIC (H2)</span>
                  </div>
                  <span className="text-[#874b0c]">
                    {Math.round(((worldState?.hospitals?.H2?.available_beds ?? 12) / (worldState?.hospitals?.H2?.total_beds ?? 29)) * 100)}% Free
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#E6DFF5] overflow-hidden border border-white mb-2">
                  <div 
                    className="h-full rounded-full bg-[#FFE6A5] transition-all" 
                    style={{ width: `${Math.round(((worldState?.hospitals?.H2?.available_beds ?? 12) / 29) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-[700] text-[#8E819E]">
                  <span>Generator: <b className="text-[#874b0c]">NOMINAL</b></span>
                  <span>Beds: {worldState?.hospitals?.H2?.available_beds ?? 12}/29</span>
                </div>
              </div>
            </div>

            {/* Fleet Status */}
            <div>
              <span className="text-[10px] font-[800] uppercase tracking-wider text-[#9A8EB0]">Active Fleet Status</span>
              <div className="clay-inset p-3 rounded-[20px] mt-1.5 space-y-2 text-xs font-[700]">
                {unitsList.length > 0 ? (
                  unitsList.map((u: any, idx) => (
                    <div key={idx} className="flex justify-between items-center pb-1 border-b border-[#EEE8F8] last:border-b-0">
                      <span>{u.callsign || u.id} | <b className="text-[#244974]">{u.fuel_remaining_minutes}m</b></span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-[800] border border-white uppercase ${
                        u.status === "available" ? "bg-[#C3FFB5] text-[#2E5A2A]" :
                        u.status === "dispatched" ? "bg-[#B5DEFF] text-[#1b446f]" :
                        u.status === "on_scene" ? "bg-[#FFE6A5] text-[#874b0c]" :
                        "bg-[#FFB5E8] text-[#7a2a62]"
                      }`}>
                        {u.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs">Fleet loading...</div>
                )}
              </div>
            </div>
          </div>

          {/* Cryptographic Solana Status Card */}
          {solanaAudit && (
            <div className="clay-card p-3 rounded-[20px] bg-gradient-to-br from-white to-[#F0E8FF] border-2 border-white">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-[800] text-[#7B6E96] uppercase flex items-center gap-1">
                  <Shield size={12} className="text-[#874b0c]" /> Solana Devnet Proof
                </span>
                <span className="text-[9px] bg-[#C3FFB5] text-[#2E5A2A] font-[800] px-2 py-0.5 rounded-full">
                  VERIFIED
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#3E3650] break-all bg-white p-1.5 rounded-[12px] border border-[#EEE8F8] mb-2 flex items-center justify-between">
                <span>{solanaAudit.decision_sha256?.substring(0, 20)}...</span>
                <button onClick={copySolanaHash} title="Copy SHA-256 State Hash" className="text-[#7B6E96] hover:text-[#2F2940]">
                  {copiedHash ? <Check size={12} className="text-[#2E5A2A]" /> : <Copy size={12} />}
                </button>
              </div>
              <a
                href={solanaAudit.explorer_url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-[800] text-[#244974] hover:underline flex items-center gap-1"
              >
                <span>View On Solana Devnet Explorer</span>
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>

        {/* [02] 3D TACTICAL CITY PERSPECTIVE */}
        <div className="lg:col-span-6 clay-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-3">
            <span className="font-[800] text-[13px] text-[#5A4E75] tracking-[0.08em]">
              [ 02 ] 3D TACTICAL CITY PERSPECTIVE — LIVE INCIDENT MESH
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE6A5] border-2 border-white text-[10px] font-[800] text-[#874b0c]">
              <span className="w-2 h-2 rounded-full bg-[#874b0c] animate-pulse"></span>
              <span>SENSOR LINK ACTIVE</span>
            </div>
          </div>

          {/* Embedded 3D Map Component with dynamic worldState */}
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
              <span>FIRE ENGINE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D6C2FF] border border-white"></span>
              <span>POLICE CRUISER</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#dc2626] font-[800]">⊗</span>
              <span>ROAD BARRICADE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#FFB5E8] border border-white"></span>
              <span>ACTIVE HAZARD</span>
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
                [ 03 ] LIVE SWARM ACTIVITY FEED
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C3FFB5] border-2 border-white text-[10px] font-[800] text-[#2E5A2A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E5A2A] animate-pulse"></span>
                <span>GEMINI 2.5 FLASH</span>
              </div>
            </div>

            {/* Scrollable Soft Activity Stream */}
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {/* Command Action Plan Header */}
              {commandPlan && (
                <div className="clay-card p-3 rounded-[20px] bg-gradient-to-r from-white to-[#F5EFFF] border-2 border-white shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-[800] text-[#874b0c] uppercase">COMMAND DIRECTIVE</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FFE6A5] text-[#874b0c] text-[10px] font-[800] border border-white">
                      AUTHORITATIVE
                    </span>
                  </div>
                  <div className="text-[12px] font-[600] text-[#3E3650] leading-snug whitespace-pre-line">
                    {commandPlan}
                  </div>
                </div>
              )}

              {/* Dynamic Transcript Items from Swarm Deliberation */}
              {transcript.length > 0 ? (
                transcript.map((item, idx) => {
                  const color = getAgentColor(item.agent);
                  return (
                    <div key={idx} className="clay-card p-3 rounded-[20px] bg-white">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-[700] text-[#9A8EB0]">TACTICAL ASSESSMENT</span>
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
                })
              ) : (
                <div className="clay-card p-4 rounded-[20px] bg-white text-center text-[#8E819E] text-xs font-[700]">
                  Click <b>SIMULATE TICK</b> above to initiate Gemini multi-agent tactical deliberation loop.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#EEE8F8] flex justify-between text-[10px] font-[800] text-[#8E819E]">
            <span>COMM: GEMINI 2.5 FLASH</span>
            <span>SOLANA: VERIFIED DEVNET</span>
          </div>
        </div>

      </div>

      {/* BOTTOM CLAY TELEMETRY DOCK */}
      <footer className="clay-card p-4 mt-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
        {/* Metric 1 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">AVG RESPONSE</div>
          <div className="text-xl font-[800] text-[#244974] mt-0.5">3.8min</div>
          <div className="text-[10px] font-[800] text-[#2E5A2A]">▼ OPTIMAL</div>
        </div>

        {/* Metric 2 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">FLEET READINESS</div>
          <div className="text-xl font-[800] text-[#874b0c] mt-0.5">
            {unitsList.filter((u: any) => u.status === "available").length}/{unitsList.length}
          </div>
          <div className="text-[10px] font-[700] text-[#8E819E]">Available Units</div>
        </div>

        {/* Metric 3 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">ACTIVE CASUALTIES</div>
          <div className="text-xl font-[800] text-[#2F2940] mt-0.5">
            {Object.values(worldState?.patients || {}).filter((p: any) => p.status !== "admitted").length}
          </div>
          <div className="text-[10px] font-[700] text-[#8E819E]">In Triage Queue</div>
        </div>

        {/* Metric 4 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">TRAUMA CAPACITY</div>
          <div className="text-xl font-[800] text-[#2E5A2A] mt-0.5">
            {worldState?.hospitals?.H1?.available_beds ?? 28}
          </div>
          <div className="text-[10px] font-[800] text-[#2E5A2A]">H1 ICU Free</div>
        </div>

        {/* Metric 5 */}
        <div className="clay-inset p-3 rounded-[20px] text-center">
          <div className="text-[10px] font-[800] uppercase text-[#9A8EB0]">ACTIVE INCIDENTS</div>
          <div className="text-xl font-[800] text-[#dc2626] mt-0.5">
            {activeIncidentsList.length} ACTIVE
          </div>
          <div className="text-[10px] font-[700] text-[#8E819E]">
            {activeIncidentsList.length > 0 ? (activeIncidentsList[0] as any)?.incident_type : "None"}
          </div>
        </div>

        {/* Interactive Clay Auto/Manual Toggle Switch Unit */}
        <div className="clay-inset p-3 rounded-[20px] flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <div className="text-[10px] font-[800] text-[#7B6E96]">DRILL MODE</div>
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
              Auto-mode disabled. Inject custom disaster hazards and casualties to train the multi-agent swarm in real time.
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
                    <option value="explosion">Gas Line Explosion</option>
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
