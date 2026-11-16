import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { RealWorld3DMap } from '../components/RealWorld3DMap';
import { 
  Flame, Stethoscope, AlertTriangle, Radio, 
  MapPin, Volume2, Shield, Activity, Power, RefreshCw, X, Send, Sparkles, Clock, Check, 
  ExternalLink, Copy, BrainCircuit, Download, GraduationCap, TrendingUp, Zap
} from 'lucide-react';

export default function ClaymorphicCommandConsole() {
  const [worldState, setWorldState] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [commandPlan, setCommandPlan] = useState<string>("");
  const [broadcastSummary, setBroadcastSummary] = useState<string>("");
  const [solanaAudit, setSolanaAudit] = useState<any>(null);
  const [trainingStats, setTrainingStats] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [clock, setClock] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'waking' | 'online'>('checking');

  // Auto-Mode vs Manual Drill Training Mode
  const [autoMode, setAutoMode] = useState<boolean>(false); // Default to Manual Drill Mode
  const [customIncident, setCustomIncident] = useState({
    incident_type: "subway_gas_rupture",
    location: "Sector_6B",
    severity: "critical",
    details: "Secondary underground methane line explosion near concourse entrance.",
    block_road: "Road_D4",
    patient_count: 3
  });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://aegis-backend-5fx3.onrender.com").replace(/\/$/, "");
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || `${BACKEND_URL.replace(/^http/, 'ws')}/ws`;

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

  // Automatic Cloud Swarm Engine Activation, Auto-Wake & Heartbeat
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isSubscribed = true;
    let pollTimer: any = null;
    let keepAliveTimer: any = null;

    const connectWebSocket = () => {
      if (!isSubscribed) return;
      try {
        ws = new WebSocket(WS_URL);
        ws.onopen = () => {
          if (isSubscribed) setBackendStatus('online');
        };
        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "INITIAL_STATE" || msg.type === "SIMULATION_UPDATE" || msg.type === "RESET_STATE") {
              const payload = msg.data.updated_world_state || msg.data;
              setWorldState(payload);
              if (msg.data.transcript) setTranscript(msg.data.transcript);
              if (msg.data.command_plan) setCommandPlan(msg.data.command_plan);
              if (msg.data.broadcast_summary) setBroadcastSummary(msg.data.broadcast_summary);
              if (msg.data.solana_audit) setSolanaAudit(msg.data.solana_audit);
              if (msg.data.training_stats) setTrainingStats(msg.data.training_stats);
            }
          } catch (_) {}
        };
        ws.onerror = () => {
          if (isSubscribed && ws) {
            try { ws.close(); } catch (_) {}
          }
        };
        ws.onclose = () => {
          if (isSubscribed) {
            setTimeout(connectWebSocket, 3500);
          }
        };
      } catch (_) {
        if (isSubscribed) setTimeout(connectWebSocket, 3500);
      }
    };

    const wakeAndSyncBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/state`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed) {
            setWorldState(data);
            setBackendStatus('online');
            connectWebSocket();

            fetch(`${BACKEND_URL}/api/config`).then(r => r.json()).then(cfg => {
              if (typeof cfg.auto_mode === "boolean") setAutoMode(cfg.auto_mode);
            }).catch(() => {});

            fetch(`${BACKEND_URL}/api/training/stats`).then(r => r.json()).then(stats => {
              setTrainingStats(stats);
            }).catch(() => {});
          }
          return true;
        } else {
          if (isSubscribed) setBackendStatus('waking');
          return false;
        }
      } catch (_) {
        if (isSubscribed) setBackendStatus('waking');
        return false;
      }
    };

    // 1. Initial wake-up attempt on mount
    wakeAndSyncBackend().then(success => {
      if (!success && isSubscribed) {
        // Poll every 3 seconds while Render wakes from sleep
        pollTimer = setInterval(async () => {
          const ok = await wakeAndSyncBackend();
          if (ok && pollTimer) clearInterval(pollTimer);
        }, 3000);
      }
    });

    // 2. Keep-alive heartbeat: ping backend every 4 minutes while browser tab is open
    keepAliveTimer = setInterval(() => {
      fetch(`${BACKEND_URL}/`, { cache: 'no-store' }).catch(() => {});
    }, 4 * 60 * 1000);

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
      if (pollTimer) clearInterval(pollTimer);
      if (keepAliveTimer) clearInterval(keepAliveTimer);
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

  const applyDrillPreset = (preset: 'subway' | 'hazmat' | 'flood' | 'collapse') => {
    switch (preset) {
      case 'subway':
        setCustomIncident({
          incident_type: "subway_gas_rupture",
          location: "Sector_6B",
          severity: "critical",
          details: "Methane gas ignition at subway concourse. Multiple trapped commuters.",
          block_road: "Road_D4",
          patient_count: 4
        });
        break;
      case 'hazmat':
        setCustomIncident({
          incident_type: "hazardous_spill",
          location: "Sector_5C",
          severity: "high",
          details: "Corrosive chemical container breach at industrial depot. Toxic smoke cloud.",
          block_road: "Road_B2",
          patient_count: 3
        });
        break;
      case 'flood':
        setCustomIncident({
          incident_type: "flash_flood",
          location: "Sector_6B",
          severity: "critical",
          details: "Water main rupture and torrential runoff inundating underground transit corridors.",
          block_road: "Road_C3",
          patient_count: 5
        });
        break;
      case 'collapse':
        setCustomIncident({
          incident_type: "structural_collapse",
          location: "Sector_5C",
          severity: "critical",
          details: "Multi-level commercial structure failure. Search and rescue teams deployed.",
          block_road: "Road_A1",
          patient_count: 6
        });
        break;
    }
  };

  const injectAndTrainSwarm = async () => {
    setIsInjecting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/inject-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customIncident)
      });
      const data = await res.json();
      
      if (data.result) {
        setWorldState(data.result.updated_world_state);
        setTranscript(data.result.transcript || []);
        setCommandPlan(data.result.command_plan || "");
        if (data.result.broadcast_summary) {
          setBroadcastSummary(data.result.broadcast_summary);
        }
        if (data.result.solana_audit) setSolanaAudit(data.result.solana_audit);
      }
      if (data.training) {
        setTrainingStats((prev: any) => ({
          total_episodes: (prev?.total_episodes || 0) + 1,
          average_fitness_score: data.training.fitness_score,
          recent_lessons: [data.training.lesson_learned, ...(prev?.recent_lessons || []).slice(0, 3)]
        }));
      }

      // Close modal and switch back to live view
      setAutoMode(true);

      // Play dynamic tactical audio dispatch immediately
      const summaryToSpeak = data.result?.broadcast_summary;
      setTimeout(() => {
        playVoiceBroadcast(summaryToSpeak);
      }, 400);

    } catch (e) {
      console.error(e);
      alert("Failed to inject scenario and execute swarm.");
    } finally {
      setIsInjecting(false);
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
      if (data.broadcast_summary) {
        setBroadcastSummary(data.broadcast_summary);
      }
      if (data.solana_audit) setSolanaAudit(data.solana_audit);

      // Play dynamic tactical audio dispatch
      const summaryToSpeak = data.broadcast_summary;
      setTimeout(() => {
        playVoiceBroadcast(summaryToSpeak);
      }, 400);
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
      setBroadcastSummary("");
      setSolanaAudit(null);
    } catch (e) {
      console.error(e);
    }
  };

  const fallbackSpeech = (explicitText?: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let text = explicitText || broadcastSummary;
      if (!text && commandPlan) {
        if (commandPlan.includes("Radio Broadcast:")) {
          text = commandPlan.split("Radio Broadcast:")[1].trim();
        } else {
          text = commandPlan.slice(0, 160);
        }
      }
      if (!text) {
        text = "All units acknowledge. Incident action plan orders in effect.";
      }
      // Clean any markdown formatting
      text = text.replace(/[*_#]/g, '').trim();
      if (!text.toLowerCase().startsWith("attention all units")) {
        text = `Attention all units. Incident Commander broadcast: ${text}`;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const playVoiceBroadcast = (summaryText?: string) => {
    setIsPlayingAudio(true);
    const textForSpeech = summaryText || broadcastSummary || commandPlan;
    const audio = new Audio(`${BACKEND_URL}/api/audio/latest?t=${Date.now()}`);
    audio.play()
      .then(() => {
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => fallbackSpeech(textForSpeech);
      })
      .catch((err) => {
        console.warn("ElevenLabs audio stream fallback to speech synthesis:", err);
        fallbackSpeech(textForSpeech);
      });
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
              Autonomous Swarm • Live Scenario Training Mode
            </div>
          </div>
        </div>

        {/* Telemetry Status Pills */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="clay-inset px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C3FFB5] border border-white animate-pulse"></span>
            <span className="text-[11px] font-[700] text-[#3E3650]">TRAINING: <b className="text-[#2E5A2A]">EPISODE #{trainingStats?.total_episodes ?? 1}</b></span>
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
            <span className="text-[11px] font-[700] text-[#3E3650]">FITNESS: <b className="text-[#244974]">{trainingStats?.average_fitness_score ?? 96}%</b></span>
          </div>

          {/* Cloud Backend Auto-Wake Pill */}
          <div className="clay-inset px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full border border-white ${
              backendStatus === 'online' 
                ? "bg-[#C3FFB5] animate-pulse" 
                : backendStatus === 'waking'
                ? "bg-[#FFE6A5] animate-ping"
                : "bg-[#B5DEFF]"
            }`}></span>
            <span className="text-[11px] font-[700] text-[#3E3650]">
              CLOUD ENGINE: <b className={
                backendStatus === 'online' 
                  ? "text-[#2E5A2A]" 
                  : backendStatus === 'waking'
                  ? "text-[#874b0c]" 
                  : "text-[#5A4E75]"
              }>
                {backendStatus === 'online' ? "ONLINE (RENDER)" : backendStatus === 'waking' ? "WAKING UP (~30s)..." : "CONNECTING..."}
              </b>
            </span>
          </div>
        </div>

        {/* Clock & Action Clay Buttons */}
        <div className="flex items-center gap-3">
          <div className="clay-inset px-3.5 py-2 rounded-[14px] text-center">
            <div className="text-[11px] font-[800] text-[#7B6E96] font-mono">{clock || "2026-11-16 02:17:34 UTC"}</div>
          </div>

          <button
            onClick={() => setAutoMode(false)}
            className="clay-button px-4 py-2 rounded-full font-[800] text-[12px] bg-[#FFE6A5] text-[#874b0c] hover:bg-[#FDF0C8] flex items-center gap-1.5 transition active:scale-95"
          >
            <Zap size={14} className="text-[#dc2626]" />
            <span>INJECT SCENARIO</span>
          </button>

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
            <span>{isSimulating ? "DELIBERATING..." : "SIMULATE TICK"}</span>
          </button>

          <button
            onClick={() => playVoiceBroadcast(broadcastSummary)}
            disabled={isPlayingAudio}
            className={`clay-button px-5 py-2 rounded-full font-[800] text-[12px] flex items-center gap-1.5 transition active:scale-95 ${
              isPlayingAudio ? "bg-[#FFB5E8] text-[#7a2a62] animate-pulse" : "bg-white text-[#5A4E75]"
            }`}
          >
            <Radio size={14} />
            <span>{isPlayingAudio ? "TRANSMITTING" : "VOICE RADIO"}</span>
          </button>
        </div>
      </header>

      {/* CLOUD ENGINE AUTO-WAKE NOTIFICATION */}
      {backendStatus === 'waking' && (
        <div className="clay-card p-3 rounded-[20px] bg-gradient-to-r from-[#FFF9E6] to-white border-2 border-white flex items-center justify-between shadow-sm animate-pulse mb-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[12px] bg-[#FFE6A5] flex items-center justify-center text-[#874b0c] font-bold text-xs shrink-0">
              ⚡
            </div>
            <div className="text-xs">
              <span className="font-[800] text-[#874b0c]">CLOUD SWARM ENGINE ACTIVATING</span>
              <span className="text-[#6D5D88] ml-2 font-[600]">
                Render Free Tier spins down after inactivity. Waking up instance now (~30 seconds) — live telemetry & WebSockets will connect automatically!
              </span>
            </div>
          </div>
          <div className="w-4 h-4 rounded-full border-2 border-[#874b0c] border-t-transparent animate-spin shrink-0"></div>
        </div>
      )}

      {/* TACTICAL LIVE VOICE RADIO DISPATCH BANNER */}
      {broadcastSummary && (
        <div className="clay-card p-3.5 rounded-[22px] bg-gradient-to-r from-[#FFF0F5] via-white to-[#F5EFFF] border-2 border-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#FFB5E8] border-2 border-white flex items-center justify-center shrink-0 shadow-inner">
              <Radio size={20} className={`text-[#7a2a62] ${isPlayingAudio ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-[800] uppercase tracking-wider text-[#7a2a62]">TACTICAL VOICE DISPATCH (ELEVENLABS + SPEECH SYNTH)</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-[800] border border-white ${isPlayingAudio ? "bg-[#FFB5E8] text-[#7a2a62] animate-pulse" : "bg-[#C3FFB5] text-[#2E5A2A]"}`}>
                  {isPlayingAudio ? "ON AIR / BROADCASTING" : "LIVE FREQUENCY ACTIVE"}
                </span>
              </div>
              <div className="text-[13px] font-[700] text-[#3E3650] mt-0.5 leading-snug">
                "{broadcastSummary}"
              </div>
            </div>
          </div>
          <button
            onClick={() => playVoiceBroadcast(broadcastSummary)}
            disabled={isPlayingAudio}
            className="clay-button px-4 py-2 rounded-full font-[800] text-[11px] bg-white text-[#7a2a62] border border-[#FFDDF4] flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow-sm hover:bg-[#FFF5F8]"
          >
            <Radio size={13} className={isPlayingAudio ? "animate-spin" : ""} />
            <span>{isPlayingAudio ? "PLAYING AUDIO..." : "REPLAY RADIO DISPATCH"}</span>
          </button>
        </div>
      )}

      {/* MAIN 3-COLUMN CLAY WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        
        {/* [01] SHARED WORLD STATE & MODEL TRAINING MEMORY */}
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

          {/* DYNAMIC MODEL TRAINING & ADAPTATION PANEL */}
          <div className="clay-card p-3 rounded-[20px] bg-gradient-to-br from-[#F5EFFF] to-white border-2 border-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-[800] text-[#4a2d82] flex items-center gap-1.5">
                <BrainCircuit size={15} className="text-[#7a2a62]" /> MODEL TRAINING & ADAPTATION
              </span>
              <span className="text-[9px] bg-[#C3FFB5] text-[#2E5A2A] font-[800] px-2 py-0.5 rounded-full">
                RLIF ACTIVE
              </span>
            </div>

            <div className="text-[11px] font-[700] text-[#3E3650] mb-2">
              <div>Episodes Trained: <b className="text-[#244974]">#{trainingStats?.total_episodes ?? 1}</b></div>
              <div>Policy Score: <b className="text-[#2E5A2A]">{trainingStats?.average_fitness_score ?? 96}%</b></div>
            </div>

            {/* Active Learned Lessons */}
            <div className="text-[10px] font-[600] text-[#7B6E96] bg-white p-2 rounded-[14px] border border-[#EEE8F8] mb-2 max-h-[75px] overflow-y-auto">
              {trainingStats?.recent_lessons?.[0] || "Model training memory ready for live scenario inputs."}
            </div>

            <a
              href={`${BACKEND_URL}/api/training/export`}
              target="_blank"
              rel="noreferrer"
              className="w-full clay-button py-2 rounded-full font-[800] text-[10px] bg-white hover:bg-[#F3EFFC] text-[#244974] flex items-center justify-center gap-1.5 transition"
            >
              <Download size={12} />
              <span>Export Gemini Fine-Tune JSONL</span>
            </a>
          </div>

          {/* Cryptographic Solana Status Card */}
          {solanaAudit && (
            <div className="clay-card p-3 rounded-[20px] bg-gradient-to-br from-white to-[#F0E8FF] border-2 border-white">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-[800] text-[#7B6E96] uppercase flex items-center gap-1">
                  <Shield size={12} className="text-[#874b0c]" /> Solana Devnet Proof
                </span>
                <span className="text-[9px] bg-[#C3FFB5] text-[#2E5A2A] font-[800] px-2 py-0.5 rounded-full">
                  CONFIRMED
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#3E3650] break-all bg-white p-1.5 rounded-[12px] border border-[#EEE8F8] mb-2 flex items-center justify-between">
                <span>{solanaAudit.decision_sha256?.substring(0, 18)}...</span>
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
                <span>View On Solana Explorer</span>
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

        {/* [03] LIVE SWARM DELIBERATION STREAM */}
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

              {/* Dynamic Voice Radio Broadcast Highlight */}
              {broadcastSummary && (
                <div className="clay-card p-3 rounded-[20px] bg-gradient-to-r from-[#FFF5F8] to-white border-2 border-white shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Radio size={12} className="text-[#7a2a62]" />
                      <span className="text-[10px] font-[800] text-[#7a2a62] uppercase">LIVE RADIO BROADCAST</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#FFDDF4] text-[#7a2a62] text-[9px] font-[800] border border-white">
                      ELEVENLABS TTS
                    </span>
                  </div>
                  <div className="text-[12px] font-[700] text-[#3E3650] leading-snug italic">
                    "{broadcastSummary}"
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
                  Click <b>INJECT SCENARIO</b> or <b>SIMULATE TICK</b> to watch autonomous agents negotiate resources and train tactical policies.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#EEE8F8] flex justify-between text-[10px] font-[800] text-[#8E819E]">
            <span>COMM: GEMINI 2.5 FLASH</span>
            <span>TRAINED: #{trainingStats?.total_episodes ?? 1}</span>
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
            <div className="text-[10px] font-[800] text-[#7B6E96]">DRILL TRAIN</div>
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

      {/* CLAY MANUAL SCENARIO INJECTOR & LIVE MODEL TRAINER MODAL */}
      {!autoMode && (
        <div className="fixed inset-0 bg-[#2F2940]/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="clay-device max-w-xl w-full p-6 relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#FFE6A5] border-2 border-white flex items-center justify-center">
                  <Zap size={18} className="text-[#874b0c]" />
                </div>
                <div>
                  <span className="font-[800] text-[15px] text-[#2F2940] block">
                    LIVE DRILL INJECTOR & MODEL TRAINER
                  </span>
                  <span className="text-[10px] font-[700] text-[#7B6E96]">
                    Inputs live hazards and casualties to train Gemini swarm policies in real time
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAutoMode(true)}
                className="w-8 h-8 rounded-full bg-white border-2 border-white flex items-center justify-center text-[#8E819E] hover:text-[#2F2940]"
                style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.08)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Drill Presets */}
            <div className="mb-4">
              <span className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1.5">
                Quick Drill Scenario Templates:
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyDrillPreset('subway')}
                  className="clay-button p-2 rounded-[14px] text-[10px] font-[800] bg-white text-[#244974] hover:bg-[#F3EFFC] text-left"
                >
                  💥 Subway Gas Leak
                </button>
                <button
                  type="button"
                  onClick={() => applyDrillPreset('hazmat')}
                  className="clay-button p-2 rounded-[14px] text-[10px] font-[800] bg-white text-[#874b0c] hover:bg-[#F3EFFC] text-left"
                >
                  ☣️ Chemical Spill
                </button>
                <button
                  type="button"
                  onClick={() => applyDrillPreset('flood')}
                  className="clay-button p-2 rounded-[14px] text-[10px] font-[800] bg-white text-[#0284c7] hover:bg-[#F3EFFC] text-left"
                >
                  🌊 Flash Flood
                </button>
                <button
                  type="button"
                  onClick={() => applyDrillPreset('collapse')}
                  className="clay-button p-2 rounded-[14px] text-[10px] font-[800] bg-white text-[#dc2626] hover:bg-[#F3EFFC] text-left"
                >
                  🏢 Building Collapse
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 font-[700] text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Incident Hazard Type</label>
                  <select 
                    value={customIncident.incident_type} 
                    onChange={(e) => setCustomIncident({ ...customIncident, incident_type: e.target.value })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[700] text-[#3E3650] outline-none"
                  >
                    <option value="subway_gas_rupture">Subway Gas Line Rupture</option>
                    <option value="structural_collapse">Structural Building Collapse</option>
                    <option value="explosion">Industrial Explosion</option>
                    <option value="hazardous_spill">Hazmat / Toxic Release</option>
                    <option value="flash_flood">Flash Flood Inundation</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Target Sector Location</label>
                  <select 
                    value={customIncident.location} 
                    onChange={(e) => setCustomIncident({ ...customIncident, location: e.target.value })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[700] text-[#3E3650] outline-none"
                  >
                    <option value="Sector_6B">Sector 6B (Subway & Towers)</option>
                    <option value="Sector_5C">Sector 5C (Industrial Factory)</option>
                    <option value="Evac_Zone">Evacuation Holding Perimeter</option>
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
                    <option value="critical">Critical (ICU/Trauma)</option>
                    <option value="high">High (Urgent)</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Block Corridors</label>
                  <select 
                    value={customIncident.block_road} 
                    onChange={(e) => setCustomIncident({ ...customIncident, block_road: e.target.value })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[700] text-[#3E3650] outline-none"
                  >
                    <option value="Road_D4">Road D4 (Sector 6B - H1)</option>
                    <option value="Road_C3">Road C3 (Sector 5C - 6B)</option>
                    <option value="Road_B2">Road B2 (Sector 5C - H1)</option>
                    <option value="Road_A1">Road A1 (Station N - 5C)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Casualties Count</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={12}
                    value={customIncident.patient_count}
                    onChange={(e) => setCustomIncident({ ...customIncident, patient_count: parseInt(e.target.value) || 1 })}
                    className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[800] text-[#2F2940] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block mb-1">Incident Tactical Briefing</label>
                <textarea 
                  rows={2}
                  value={customIncident.details}
                  onChange={(e) => setCustomIncident({ ...customIncident, details: e.target.value })}
                  className="w-full clay-inset p-2.5 rounded-[16px] text-xs font-[600] text-[#3E3650] outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button 
                  onClick={injectAndTrainSwarm}
                  disabled={isInjecting}
                  className="flex-1 clay-button py-3.5 rounded-full font-[800] text-xs bg-gradient-to-r from-[#B5DEFF] to-[#D6C2FF] text-[#1b446f] flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
                >
                  <Zap size={15} className="text-[#874b0c]" />
                  <span>{isInjecting ? "Running Swarm & Training Policy..." : "⚡ RUN SCENARIO & TRAIN SWARM"}</span>
                </button>

                <button 
                  onClick={() => setAutoMode(true)}
                  className="clay-button px-5 py-3.5 rounded-full font-[800] text-xs bg-white text-[#7B6E96]"
                >
                  Back to View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
