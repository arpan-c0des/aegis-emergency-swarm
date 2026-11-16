import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { RealWorld3DMap } from '../components/RealWorld3DMap';
import { 
  Flame, Stethoscope, AlertTriangle, Radio, 
  MapPin, Volume2, Shield, Activity, Power, RefreshCw, X, Send, Sparkles, Clock, Check, 
  ExternalLink, Copy, BrainCircuit, Download, GraduationCap, TrendingUp, Zap, Truck, ShieldAlert, Maximize2
} from 'lucide-react';

export default function ClaymorphicCommandConsole() {
  const [theme, setTheme] = useState<'tactical' | 'clay'>('tactical');
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
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

  const getAgentIcon = (agent: string) => {
    const a = (agent || '').toLowerCase();
    if (a.includes('med')) return <Stethoscope size={13} className="text-blue-400" />;
    if (a.includes('fire')) return <Flame size={13} className="text-amber-400" />;
    if (a.includes('police')) return <ShieldAlert size={13} className="text-purple-400" />;
    if (a.includes('logist')) return <Truck size={13} className="text-pink-400" />;
    return <Radio size={13} className="text-emerald-400" />;
  };

  const activeIncidentsList = Object.values(worldState?.incidents || {}).filter((i: any) => i.active && i.severity !== "extinguished");
  const unitsList = Object.values(worldState?.units || {});

  return (
    <div className={`min-h-screen p-3 md:p-5 flex flex-col justify-between relative selection:bg-[#FFB5E8]/40 transition-colors duration-300 ${
      theme === 'tactical' ? 'bg-[#030712] text-slate-100 tactical-grid-bg' : 'text-[#2F2940]'
    }`}>
      <Head>
        <title>AEGIS — {theme === 'tactical' ? 'Tactical C2 Command Center' : 'Claymorphic Swarm Console'}</title>
      </Head>

      {/* Floating Ambient Atmosphere / Gradient Background Orbs */}
      {theme === 'tactical' ? (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div 
            className="absolute -top-[140px] -left-[140px] w-[600px] h-[600px] rounded-full blur-[100px] opacity-[0.25]" 
            style={{ background: 'radial-gradient(circle, #0284c7 0%, #0369a1 40%, transparent 70%)' }}
          />
          <div 
            className="absolute top-[15%] right-[-100px] w-[500px] h-[500px] rounded-full blur-[90px] opacity-[0.2]" 
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, #0f172a 60%, transparent 75%)' }}
          />
          <div 
            className="absolute bottom-[-100px] left-[25%] w-[650px] h-[650px] rounded-full blur-[110px] opacity-[0.2]" 
            style={{ background: 'radial-gradient(circle, #6366f1 0%, #1e1b4b 60%, transparent 75%)' }}
          />
        </div>
      ) : (
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
      )}

      {/* NAVBAR */}
      <Navbar theme={theme} />

      {/* TOP HEADER SLAB */}
      <header className={`${
        theme === 'tactical' 
          ? 'tactical-panel border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
          : 'clay-card'
      } p-4 mb-4 flex flex-wrap items-center justify-between gap-4 transition-all duration-300`}>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div 
            className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 ${
              theme === 'tactical'
                ? 'bg-cyan-950/80 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-gradient-to-br from-[#FFB5E8] to-[#D6C2FF] border-[3px] border-white'
            }`}
            style={theme === 'clay' ? { boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.9), 3px 5px 12px rgba(120,110,150,0.18)' } : {}}
          >
            <Sparkles className={theme === 'tactical' ? "text-cyan-400" : "text-white"} size={22} strokeWidth={2.6} />
          </div>
          <div>
            <div className={`text-2xl font-[800] tracking-[-0.03em] flex items-center gap-2 ${
              theme === 'tactical' ? 'text-cyan-200' : 'text-[#2F2940]'
            }`}>
              <span>AEGIS</span>
              <span className={theme === 'tactical' ? 'text-slate-600' : 'text-[#A99DC0]'}>—</span>
              <span className={`text-sm font-[800] px-2.5 py-0.5 rounded-full border ${
                theme === 'tactical'
                  ? 'bg-slate-900 border-slate-700 text-cyan-300 font-mono shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                  : 'text-[#7B6E96] bg-[#F3EFFC] border-white'
              }`}>
                TICK {worldState?.time_step ?? 0}
              </span>
            </div>
            <div className={`text-[11px] font-[700] tracking-wide uppercase ${
              theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#8E819E]'
            }`}>
              Autonomous Swarm • Live Scenario Training Mode
            </div>
          </div>
        </div>

        {/* Telemetry Status Pills */}
        <div className="hidden lg:flex items-center gap-2">
          <div className={`${theme === 'tactical' ? 'tactical-inset border border-slate-800' : 'clay-inset'} px-3 py-1.5 rounded-full flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full border ${theme === 'tactical' ? 'bg-emerald-400 border-emerald-500' : 'bg-[#C3FFB5] border-white'} animate-pulse`}></span>
            <span className={`text-[11px] font-[700] ${theme === 'tactical' ? 'text-slate-300 font-mono' : 'text-[#3E3650]'}`}>
              TRAINING: <b className={theme === 'tactical' ? 'text-emerald-400' : 'text-[#2E5A2A]'}>EPISODE #{trainingStats?.total_episodes ?? 1}</b>
            </span>
          </div>

          <div className={`${theme === 'tactical' ? 'tactical-inset border border-slate-800' : 'clay-inset'} px-3 py-1.5 rounded-full flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full border ${
              activeIncidentsList.length > 0 
                ? (theme === 'tactical' ? "bg-amber-400 border-amber-500 animate-ping" : "bg-[#FFE6A5] border-white animate-ping") 
                : (theme === 'tactical' ? "bg-emerald-400 border-emerald-500" : "bg-[#C3FFB5] border-white")
            }`}></span>
            <span className={`text-[11px] font-[700] ${theme === 'tactical' ? 'text-slate-300 font-mono' : 'text-[#3E3650]'}`}>
              THREAT: <b className={
                activeIncidentsList.length > 0 
                  ? (theme === 'tactical' ? "text-amber-400" : "text-[#874b0c]") 
                  : (theme === 'tactical' ? "text-emerald-400" : "text-[#2E5A2A]")
              }>
                {activeIncidentsList.length > 0 ? `${activeIncidentsList.length} HAZARDS` : "SECURED"}
              </b>
            </span>
          </div>

          <div className={`${theme === 'tactical' ? 'tactical-inset border border-slate-800' : 'clay-inset'} px-3 py-1.5 rounded-full flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full border ${theme === 'tactical' ? 'bg-cyan-400 border-cyan-500' : 'bg-[#B5DEFF] border-white'}`}></span>
            <span className={`text-[11px] font-[700] ${theme === 'tactical' ? 'text-slate-300 font-mono' : 'text-[#3E3650]'}`}>
              FITNESS: <b className={theme === 'tactical' ? 'text-cyan-400' : 'text-[#244974]'}>{trainingStats?.average_fitness_score ?? 96}%</b>
            </span>
          </div>

          {/* Cloud Backend Auto-Wake Pill */}
          <div className={`${theme === 'tactical' ? 'tactical-inset border border-slate-800' : 'clay-inset'} px-3 py-1.5 rounded-full flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full border ${
              backendStatus === 'online' 
                ? (theme === 'tactical' ? "bg-emerald-400 border-emerald-500 animate-pulse" : "bg-[#C3FFB5] border-white animate-pulse")
                : backendStatus === 'waking'
                ? (theme === 'tactical' ? "bg-amber-400 border-amber-500 animate-ping" : "bg-[#FFE6A5] border-white animate-ping")
                : (theme === 'tactical' ? "bg-cyan-400 border-cyan-500" : "bg-[#B5DEFF] border-white")
            }`}></span>
            <span className={`text-[11px] font-[700] ${theme === 'tactical' ? 'text-slate-300 font-mono' : 'text-[#3E3650]'}`}>
              CLOUD ENGINE: <b className={
                backendStatus === 'online' 
                  ? (theme === 'tactical' ? "text-emerald-400" : "text-[#2E5A2A]")
                  : backendStatus === 'waking'
                  ? (theme === 'tactical' ? "text-amber-400" : "text-[#874b0c]")
                  : (theme === 'tactical' ? "text-cyan-400" : "text-[#5A4E75]")
              }>
                {backendStatus === 'online' ? "ONLINE (RENDER)" : backendStatus === 'waking' ? "WAKING UP (~30s)..." : "CONNECTING..."}
              </b>
            </span>
          </div>
        </div>

        {/* Clock, Theme Switcher & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={`${theme === 'tactical' ? 'tactical-inset border border-slate-800/80' : 'clay-inset'} px-3.5 py-2 rounded-[14px] text-center`}>
            <div className={`text-[11px] font-[800] font-mono ${theme === 'tactical' ? 'text-cyan-400' : 'text-[#7B6E96]'}`}>
              {clock || "2026-11-16 02:17:34 UTC"}
            </div>
          </div>

          {/* Dual Visual Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'tactical' ? 'clay' : 'tactical')}
            title="Toggle between Tactical C2 Dark HUD and Clay Day Mode"
            className={`px-3.5 py-2 rounded-full font-[800] text-[11px] flex items-center gap-1.5 transition active:scale-95 ${
              theme === 'tactical'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'clay-button bg-white text-[#5A4E75] hover:bg-[#F3EFFC]'
            }`}
          >
            <span>{theme === 'tactical' ? '🌙 TACTICAL C2' : '☀️ CLAY DAY'}</span>
          </button>

          <button
            onClick={() => setAutoMode(false)}
            className={`px-4 py-2 rounded-full font-[800] text-[12px] flex items-center gap-1.5 transition active:scale-95 ${
              theme === 'tactical'
                ? 'tactical-btn bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'clay-button bg-[#FFE6A5] text-[#874b0c] hover:bg-[#FDF0C8]'
            }`}
          >
            <Zap size={14} className={theme === 'tactical' ? "text-amber-400" : "text-[#dc2626]"} />
            <span>INJECT SCENARIO</span>
          </button>

          <button
            onClick={triggerReset}
            className={`px-4 py-2 rounded-full font-[800] text-[12px] flex items-center gap-1.5 transition active:scale-95 ${
              theme === 'tactical'
                ? 'tactical-btn bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700 hover:text-white'
                : 'clay-button bg-white text-[#5A4E75] hover:bg-[#F3EFFC]'
            }`}
          >
            <RefreshCw size={13} />
            <span>RESET</span>
          </button>

          <button
            onClick={triggerReplan}
            disabled={isSimulating}
            className={`px-5 py-2 rounded-full font-[800] text-[12px] flex items-center gap-1.5 transition active:scale-95 ${
              theme === 'tactical'
                ? 'tactical-btn bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                : 'clay-button bg-[#B5DEFF] text-[#1b446f]'
            }`}
          >
            <Activity size={14} className={isSimulating ? "animate-spin" : ""} />
            <span>{isSimulating ? "DELIBERATING..." : "SIMULATE TICK"}</span>
          </button>

          <button
            onClick={() => playVoiceBroadcast(broadcastSummary)}
            disabled={isPlayingAudio}
            className={`px-5 py-2 rounded-full font-[800] text-[12px] flex items-center gap-1.5 transition active:scale-95 ${
              isPlayingAudio 
                ? (theme === 'tactical' ? "bg-pink-900/60 text-pink-300 border border-pink-500/50 animate-pulse shadow-[0_0_15px_rgba(244,114,182,0.4)]" : "clay-button bg-[#FFB5E8] text-[#7a2a62] animate-pulse")
                : (theme === 'tactical' ? "tactical-btn bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white" : "clay-button bg-white text-[#5A4E75]")
            }`}
          >
            <Radio size={14} />
            <span>{isPlayingAudio ? "TRANSMITTING" : "VOICE RADIO"}</span>
          </button>
        </div>
      </header>

      {/* CLOUD ENGINE AUTO-WAKE NOTIFICATION */}
      {backendStatus === 'waking' && (
        <div className={`p-3 rounded-[20px] flex items-center justify-between shadow-sm animate-pulse mb-1 border ${
          theme === 'tactical'
            ? 'tactical-panel bg-amber-950/40 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            : 'clay-card bg-gradient-to-r from-[#FFF9E6] to-white border-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center font-bold text-xs shrink-0 ${
              theme === 'tactical' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-[#FFE6A5] text-[#874b0c]'
            }`}>
              ⚡
            </div>
            <div className="text-xs">
              <span className={`font-[800] ${theme === 'tactical' ? 'text-amber-300 font-mono' : 'text-[#874b0c]'}`}>CLOUD SWARM ENGINE ACTIVATING</span>
              <span className={`ml-2 font-[600] ${theme === 'tactical' ? 'text-slate-300' : 'text-[#6D5D88]'}`}>
                Render Free Tier spins down after inactivity. Waking up instance now (~30 seconds) — live telemetry & WebSockets will connect automatically!
              </span>
            </div>
          </div>
          <div className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0 ${
            theme === 'tactical' ? 'border-amber-400' : 'border-[#874b0c]'
          }`}></div>
        </div>
      )}

      {/* TACTICAL LIVE VOICE RADIO DISPATCH BANNER */}
      {broadcastSummary && (
        <div className={`p-3.5 rounded-[22px] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm mb-1 border transition-all ${
          theme === 'tactical'
            ? 'tactical-panel bg-slate-900/90 border-pink-500/30 shadow-[0_0_25px_rgba(244,114,182,0.15)]'
            : 'clay-card bg-gradient-to-r from-[#FFF0F5] via-white to-[#F5EFFF] border-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${
              theme === 'tactical'
                ? 'bg-pink-950/80 border border-pink-500/40 shadow-[0_0_12px_rgba(244,114,182,0.3)]'
                : 'bg-[#FFB5E8] border-2 border-white shadow-inner'
            }`}>
              <Radio size={20} className={`${theme === 'tactical' ? 'text-pink-400' : 'text-[#7a2a62]'} ${isPlayingAudio ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-[800] uppercase tracking-wider ${theme === 'tactical' ? 'text-pink-400 font-mono' : 'text-[#7a2a62]'}`}>
                  TACTICAL VOICE DISPATCH (ELEVENLABS + SPEECH SYNTH)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-[800] border ${
                  isPlayingAudio 
                    ? (theme === 'tactical' ? "bg-pink-900/60 text-pink-300 border-pink-500/50 animate-pulse" : "bg-[#FFB5E8] text-[#7a2a62] border-white animate-pulse")
                    : (theme === 'tactical' ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40 font-mono" : "bg-[#C3FFB5] text-[#2E5A2A] border-white")
                }`}>
                  {isPlayingAudio ? "ON AIR / BROADCASTING" : "LIVE FREQUENCY ACTIVE"}
                </span>

                {/* Animated Dynamic Equalizer Waveform */}
                {isPlayingAudio && (
                  <div className="flex items-center gap-[3px] h-5 px-2 py-0.5 rounded-full bg-slate-950/70 border border-pink-500/30">
                    <span className="wave-bar wave-bar-1 bg-pink-400"></span>
                    <span className="wave-bar wave-bar-2 bg-pink-400"></span>
                    <span className="wave-bar wave-bar-3 bg-pink-400"></span>
                    <span className="wave-bar wave-bar-4 bg-pink-400"></span>
                    <span className="wave-bar wave-bar-5 bg-pink-400"></span>
                    <span className="wave-bar wave-bar-6 bg-pink-400"></span>
                    <span className="wave-bar wave-bar-7 bg-pink-400"></span>
                  </div>
                )}
              </div>
              <div className={`text-[13px] font-[700] mt-0.5 leading-snug ${theme === 'tactical' ? 'text-slate-100 font-sans' : 'text-[#3E3650]'}`}>
                "{broadcastSummary}"
              </div>
            </div>
          </div>
          <button
            onClick={() => playVoiceBroadcast(broadcastSummary)}
            disabled={isPlayingAudio}
            className={`px-4 py-2 rounded-full font-[800] text-[11px] flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow-sm ${
              theme === 'tactical'
                ? 'tactical-btn bg-pink-950/60 text-pink-300 border border-pink-500/40 hover:bg-pink-900/60 shadow-[0_0_12px_rgba(244,114,182,0.2)]'
                : 'clay-button bg-white text-[#7a2a62] border border-[#FFDDF4] hover:bg-[#FFF5F8]'
            }`}
          >
            <Radio size={13} className={isPlayingAudio ? "animate-spin" : ""} />
            <span>{isPlayingAudio ? "PLAYING AUDIO..." : "REPLAY RADIO DISPATCH"}</span>
          </button>
        </div>
      )}

      {/* MAIN 3-COLUMN CLAY WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        
        {/* [01] SHARED WORLD STATE & MODEL TRAINING MEMORY */}
        <div className={`transition-all duration-300 ${isTheaterMode ? 'lg:col-span-6 order-2' : 'lg:col-span-3 order-1'} ${
          theme === 'tactical' 
            ? 'tactical-panel border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
            : 'clay-card'
        } p-4 flex flex-col justify-between space-y-4`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b-2 mb-3 ${
              theme === 'tactical' ? 'border-slate-800' : 'border-[#EEE8F8]'
            }`}>
              <span className={`font-[800] text-[13px] tracking-[0.08em] ${
                theme === 'tactical' ? 'text-cyan-300 font-mono' : 'text-[#5A4E75]'
              }`}>
                [ 01 ] TELEMETRY & RESOURCES
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] border border-white animate-pulse"></div>
            </div>

            {/* Infrastructure */}
            <div className="mb-4">
              <span className={`text-[10px] font-[800] uppercase tracking-wider ${
                theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'
              }`}>Road Infrastructure</span>
              <div className={`${
                theme === 'tactical' ? 'tactical-inset border border-slate-800 bg-slate-950/60' : 'clay-inset'
              } p-3 rounded-[20px] mt-1.5 flex items-center gap-3`}>
                <div 
                  className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${
                    theme === 'tactical' 
                      ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-400' 
                      : 'bg-[#B5DEFF] border-[2px] border-white text-[#244974]'
                  }`}
                  style={theme === 'clay' ? { boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.9), 2px 2px 6px rgba(0,0,0,0.06)' } : {}}
                >
                  <Activity size={18} />
                </div>
                <div className="text-xs">
                  <div className={`font-[700] ${theme === 'tactical' ? 'text-slate-200 font-mono' : 'text-[#3E3650]'}`}>
                    Roads: {Object.keys(worldState?.roads || {}).length} Sectors | <span className="text-[#ef4444] font-[800]">{Object.values(worldState?.roads || {}).filter(r => r === "blocked").length} Blocked</span>
                  </div>
                  <div className={`text-[11px] font-[800] mt-0.5 ${theme === 'tactical' ? 'text-emerald-400 font-mono' : 'text-[#2E5A2A]'}`}>
                    Weather: {worldState?.weather?.replace('_', ' ') || "Moderate"}
                  </div>
                </div>
              </div>
            </div>

            {/* Hospitals */}
            <div className="space-y-3 mb-4">
              <span className={`text-[10px] font-[800] uppercase tracking-wider ${
                theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'
              }`}>Trauma & Reception Beds</span>

              {/* General Hospital */}
              <div className={`p-3 rounded-[20px] ${
                theme === 'tactical' ? 'bg-slate-900/90 border border-slate-800 text-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.3)]' : 'clay-card bg-white'
              }`}>
                <div className="flex justify-between items-center text-xs font-[800] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} className={theme === 'tactical' ? "text-cyan-400" : "text-[#244974]"} />
                    <span className={theme === 'tactical' ? "text-cyan-200 font-mono" : "text-[#3E3650]"}>CENTRAL TRAUMA (H1)</span>
                  </div>
                  <span className={theme === 'tactical' ? "text-cyan-400 font-mono" : "text-[#244974]"}>
                    {Math.round(((worldState?.hospitals?.H1?.available_beds ?? 28) / (worldState?.hospitals?.H1?.total_beds ?? 37)) * 100)}% Free
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden mb-2 ${theme === 'tactical' ? 'bg-slate-800 border border-slate-700' : 'bg-[#E6DFF5] border border-white'}`}>
                  <div 
                    className={`h-full rounded-full transition-all ${theme === 'tactical' ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-[#B5DEFF]'}`} 
                    style={{ width: `${Math.round(((worldState?.hospitals?.H1?.available_beds ?? 28) / 37) * 100)}%` }}
                  ></div>
                </div>
                <div className={`flex justify-between text-[10px] font-[700] ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#8E819E]'}`}>
                  <span>Status: <b className="text-[#10b981]">TRAUMA READY</b></span>
                  <span>Beds: {worldState?.hospitals?.H1?.available_beds ?? 28}/37</span>
                </div>
              </div>

              {/* St. Luke's */}
              <div className={`p-3 rounded-[20px] ${
                theme === 'tactical' ? 'bg-slate-900/90 border border-slate-800 text-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.3)]' : 'clay-card bg-white'
              }`}>
                <div className="flex justify-between items-center text-xs font-[800] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} className={theme === 'tactical' ? "text-amber-400" : "text-[#874b0c]"} />
                    <span className={theme === 'tactical' ? "text-amber-200 font-mono" : "text-[#3E3650]"}>ST. LUKE'S CLINIC (H2)</span>
                  </div>
                  <span className={theme === 'tactical' ? "text-amber-400 font-mono" : "text-[#874b0c]"}>
                    {Math.round(((worldState?.hospitals?.H2?.available_beds ?? 12) / (worldState?.hospitals?.H2?.total_beds ?? 29)) * 100)}% Free
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden mb-2 ${theme === 'tactical' ? 'bg-slate-800 border border-slate-700' : 'bg-[#E6DFF5] border border-white'}`}>
                  <div 
                    className={`h-full rounded-full transition-all ${theme === 'tactical' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-[#FFE6A5]'}`} 
                    style={{ width: `${Math.round(((worldState?.hospitals?.H2?.available_beds ?? 12) / 29) * 100)}%` }}
                  ></div>
                </div>
                <div className={`flex justify-between text-[10px] font-[700] ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#8E819E]'}`}>
                  <span>Generator: <b className="text-amber-400">NOMINAL</b></span>
                  <span>Beds: {worldState?.hospitals?.H2?.available_beds ?? 12}/29</span>
                </div>
              </div>
            </div>

            {/* Fleet Status */}
            <div>
              <span className={`text-[10px] font-[800] uppercase tracking-wider ${
                theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'
              }`}>Active Fleet Status</span>
              <div className={`${
                theme === 'tactical' ? 'tactical-inset border border-slate-800 bg-slate-950/60' : 'clay-inset'
              } p-3 rounded-[20px] mt-1.5 space-y-2 text-xs font-[700]`}>
                {unitsList.length > 0 ? (
                  unitsList.map((u: any, idx) => (
                    <div key={idx} className={`flex justify-between items-center pb-1 border-b last:border-b-0 ${
                      theme === 'tactical' ? 'border-slate-800 font-mono' : 'border-[#EEE8F8]'
                    }`}>
                      <span className={theme === 'tactical' ? 'text-slate-300' : ''}>
                        {u.callsign || u.id} | <b className={theme === 'tactical' ? 'text-cyan-400' : 'text-[#244974]'}>{u.fuel_remaining_minutes}m</b>
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-[800] border uppercase ${
                        theme === 'tactical'
                          ? (u.status === "available" ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" :
                             u.status === "dispatched" ? "bg-blue-950/80 text-blue-300 border-blue-500/40" :
                             u.status === "on_scene" ? "bg-amber-950/80 text-amber-300 border-amber-500/40" :
                             "bg-pink-950/80 text-pink-300 border-pink-500/40")
                          : (u.status === "available" ? "bg-[#C3FFB5] text-[#2E5A2A] border-white" :
                             u.status === "dispatched" ? "bg-[#B5DEFF] text-[#1b446f] border-white" :
                             u.status === "on_scene" ? "bg-[#FFE6A5] text-[#874b0c] border-white" :
                             "bg-[#FFB5E8] text-[#7a2a62] border-white")
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
          <div className={`p-3 rounded-[20px] border ${
            theme === 'tactical'
              ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
              : 'clay-card bg-gradient-to-br from-[#F5EFFF] to-white border-2 border-white'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-[800] flex items-center gap-1.5 ${
                theme === 'tactical' ? 'text-purple-300 font-mono' : 'text-[#4a2d82]'
              }`}>
                <BrainCircuit size={15} className={theme === 'tactical' ? "text-purple-400" : "text-[#7a2a62]"} /> MODEL TRAINING & ADAPTATION
              </span>
              <span className={`text-[9px] font-[800] px-2 py-0.5 rounded-full border ${
                theme === 'tactical'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 font-mono'
                  : 'bg-[#C3FFB5] text-[#2E5A2A] border-white'
              }`}>
                RLIF ACTIVE
              </span>
            </div>

            <div className={`text-[11px] font-[700] mb-2 ${theme === 'tactical' ? 'text-slate-300 font-mono' : 'text-[#3E3650]'}`}>
              <div>Episodes Trained: <b className={theme === 'tactical' ? 'text-cyan-400' : 'text-[#244974]'}>#{trainingStats?.total_episodes ?? 1}</b></div>
              <div>Policy Score: <b className={theme === 'tactical' ? 'text-emerald-400' : 'text-[#2E5A2A]'}>{trainingStats?.average_fitness_score ?? 96}%</b></div>
            </div>

            {/* Active Learned Lessons */}
            <div className={`text-[10px] font-[600] p-2 rounded-[14px] border mb-2 max-h-[75px] overflow-y-auto ${
              theme === 'tactical'
                ? 'bg-slate-950/70 text-slate-300 border-slate-800/80 font-mono'
                : 'text-[#7B6E96] bg-white border-[#EEE8F8]'
            }`}>
              {trainingStats?.recent_lessons?.[0] || "Model training memory ready for live scenario inputs."}
            </div>

            <a
              href={`${BACKEND_URL}/api/training/export`}
              target="_blank"
              rel="noreferrer"
              className={`w-full py-2 rounded-full font-[800] text-[10px] flex items-center justify-center gap-1.5 transition ${
                theme === 'tactical'
                  ? 'tactical-btn bg-slate-800 text-cyan-300 border border-slate-700 hover:bg-slate-700 shadow-sm font-mono'
                  : 'clay-button bg-white hover:bg-[#F3EFFC] text-[#244974]'
              }`}
            >
              <Download size={12} />
              <span>Export Gemini Fine-Tune JSONL</span>
            </a>
          </div>

          {/* Cryptographic Solana Status Card */}
          {solanaAudit && (
            <div className={`p-3 rounded-[20px] border ${
              theme === 'tactical'
                ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                : 'clay-card bg-gradient-to-br from-white to-[#F0E8FF] border-2 border-white'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-[800] uppercase flex items-center gap-1 ${
                  theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#7B6E96]'
                }`}>
                  <Shield size={12} className={theme === 'tactical' ? "text-purple-400" : "text-[#874b0c]"} /> Solana Devnet Proof
                </span>
                <span className={`text-[9px] font-[800] px-2 py-0.5 rounded-full border ${
                  theme === 'tactical'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 font-mono'
                    : 'bg-[#C3FFB5] text-[#2E5A2A] border-white'
                }`}>
                  CONFIRMED
                </span>
              </div>
              <div className={`text-[11px] font-mono break-all p-1.5 rounded-[12px] border mb-2 flex items-center justify-between ${
                theme === 'tactical'
                  ? 'bg-slate-950/80 text-cyan-300 border-slate-800'
                  : 'text-[#3E3650] bg-white border-[#EEE8F8]'
              }`}>
                <span>{solanaAudit.decision_sha256?.substring(0, 18)}...</span>
                <button onClick={copySolanaHash} title="Copy SHA-256 State Hash" className={theme === 'tactical' ? 'text-slate-400 hover:text-white' : 'text-[#7B6E96] hover:text-[#2F2940]'}>
                  {copiedHash ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
                </button>
              </div>
              <a
                href={solanaAudit.explorer_url}
                target="_blank"
                rel="noreferrer"
                className={`text-[10px] font-[800] hover:underline flex items-center gap-1 ${
                  theme === 'tactical' ? 'text-cyan-400 font-mono' : 'text-[#244974]'
                }`}
              >
                <span>View On Solana Explorer</span>
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>

        {/* [02] 3D TACTICAL CITY PERSPECTIVE */}
        <div className={`transition-all duration-300 ${isTheaterMode ? 'lg:col-span-12 order-1' : 'lg:col-span-6 order-2'} ${
          theme === 'tactical' 
            ? 'tactical-panel border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
            : 'clay-card'
        } p-4 flex flex-col justify-between`}>
          <div className={`flex items-center justify-between pb-3 border-b-2 mb-3 ${
            theme === 'tactical' ? 'border-slate-800' : 'border-[#EEE8F8]'
          }`}>
            <span className={`font-[800] text-[13px] tracking-[0.08em] ${
              theme === 'tactical' ? 'text-cyan-300 font-mono' : 'text-[#5A4E75]'
            }`}>
              [ 02 ] 3D TACTICAL CITY PERSPECTIVE — LIVE INCIDENT MESH
            </span>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-[800] ${
                theme === 'tactical'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 font-mono'
                  : 'bg-[#FFE6A5] border-2 border-white text-[#874b0c]'
              }`}>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>SENSOR LINK ACTIVE</span>
              </div>
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                title={isTheaterMode ? "Exit Theater Mode" : "Expand 3D Theater Mode"}
                className={`px-3 py-1 rounded-full text-[10px] font-[800] border flex items-center gap-1.5 transition ${
                  theme === 'tactical'
                    ? (isTheaterMode ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-mono shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700 font-mono')
                    : (isTheaterMode ? 'bg-[#2F2940] text-white border-white' : 'clay-button bg-white text-[#5A4E75] hover:bg-[#F3EFFC] border-white')
                }`}
              >
                <Maximize2 size={12} />
                <span>{isTheaterMode ? "COLLAPSE" : "THEATER"}</span>
              </button>
            </div>
          </div>

          {/* Embedded 3D Map Component with dynamic worldState and theme */}
          <div className={`${
            theme === 'tactical' 
              ? 'rounded-[26px] p-1 border border-cyan-500/20 bg-slate-950/80 shadow-[0_0_25px_rgba(6,182,212,0.1)]' 
              : 'clay-device p-2'
          } overflow-hidden mb-3`}>
            <RealWorld3DMap 
              worldState={worldState} 
              theme={theme}
              isTheaterMode={isTheaterMode}
              onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
            />
          </div>

          {/* Legend */}
          <div className={`${
            theme === 'tactical'
              ? 'tactical-inset border border-slate-800/80 bg-slate-950/70 text-slate-300 font-mono'
              : 'clay-inset text-[#5A4E75]'
          } p-2.5 rounded-[18px] flex flex-wrap items-center justify-between text-[10px] font-[800]`}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] border border-white"></span>
              <span>AMBULANCE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-white"></span>
              <span>FIRE ENGINE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7] border border-white"></span>
              <span>POLICE CRUISER</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#ef4444] font-[800]">⊗</span>
              <span>ROAD BARRICADE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#ec4899] border border-white"></span>
              <span>ACTIVE HAZARD</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981] border border-white"></span>
              <span>EVAC ZONE</span>
            </span>
          </div>
        </div>

        {/* [03] LIVE SWARM DELIBERATION STREAM */}
        <div className={`transition-all duration-300 ${isTheaterMode ? 'lg:col-span-6 order-3' : 'lg:col-span-3 order-3'} ${
          theme === 'tactical' 
            ? 'tactical-panel border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
            : 'clay-card'
        } p-4 flex flex-col justify-between h-full`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b-2 mb-3 ${
              theme === 'tactical' ? 'border-slate-800' : 'border-[#EEE8F8]'
            }`}>
              <span className={`font-[800] text-[13px] tracking-[0.08em] ${
                theme === 'tactical' ? 'text-cyan-300 font-mono' : 'text-[#5A4E75]'
              }`}>
                [ 03 ] LIVE SWARM ACTIVITY FEED
              </span>
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-[800] ${
                theme === 'tactical' 
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 font-mono' 
                  : 'bg-[#C3FFB5] border-2 border-white text-[#2E5A2A]'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>GEMINI 2.5 FLASH</span>
              </div>
            </div>

            {/* Scrollable Activity Stream */}
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {/* Command Action Plan Header */}
              {commandPlan && (
                <div className={`p-3 rounded-[20px] shadow-sm border ${
                  theme === 'tactical'
                    ? 'bg-amber-950/20 border-amber-500/30 text-slate-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'clay-card bg-gradient-to-r from-white to-[#F5EFFF] border-2 border-white'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-[800] uppercase ${theme === 'tactical' ? 'text-amber-400 font-mono' : 'text-[#874b0c]'}`}>
                      COMMAND DIRECTIVE
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-[800] border ${
                      theme === 'tactical'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono'
                        : 'bg-[#FFE6A5] text-[#874b0c] border-white'
                    }`}>
                      AUTHORITATIVE
                    </span>
                  </div>
                  <div className={`text-[12px] font-[600] leading-snug whitespace-pre-line ${theme === 'tactical' ? 'text-slate-200 font-mono' : 'text-[#3E3650]'}`}>
                    {commandPlan}
                  </div>
                </div>
              )}

              {/* Dynamic Voice Radio Broadcast Highlight */}
              {broadcastSummary && (
                <div className={`p-3 rounded-[20px] shadow-sm border ${
                  theme === 'tactical'
                    ? 'bg-pink-950/20 border-pink-500/30 text-slate-100 shadow-[0_0_15px_rgba(244,114,182,0.1)]'
                    : 'clay-card bg-gradient-to-r from-[#FFF5F8] to-white border-2 border-white'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Radio size={12} className={theme === 'tactical' ? "text-pink-400" : "text-[#7a2a62]"} />
                      <span className={`text-[10px] font-[800] uppercase ${theme === 'tactical' ? 'text-pink-400 font-mono' : 'text-[#7a2a62]'}`}>
                        LIVE RADIO BROADCAST
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-[800] border ${
                      theme === 'tactical'
                        ? 'bg-pink-900/40 text-pink-300 border-pink-500/40 font-mono'
                        : 'bg-[#FFDDF4] text-[#7a2a62] border-white'
                    }`}>
                      ELEVENLABS TTS
                    </span>
                  </div>
                  <div className={`text-[12px] font-[700] leading-snug italic ${theme === 'tactical' ? 'text-slate-200' : 'text-[#3E3650]'}`}>
                    "{broadcastSummary}"
                  </div>
                </div>
              )}

              {/* Dynamic Transcript Items from Swarm Deliberation */}
              {transcript.length > 0 ? (
                transcript.map((item, idx) => {
                  const color = getAgentColor(item.agent);
                  return (
                    <div key={idx} className={`p-3 rounded-[20px] transition-all border ${
                      theme === 'tactical'
                        ? 'bg-slate-900/90 border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.3)] hover:border-slate-700'
                        : 'clay-card bg-white border-white'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {getAgentIcon(item.agent)}
                          <span className={`text-[10px] font-[700] ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'}`}>
                            TACTICAL ASSESSMENT
                          </span>
                        </div>
                        <span 
                          className={`px-2 py-0.5 rounded-full text-[10px] font-[800] border ${
                            theme === 'tactical' ? 'border-slate-700 font-mono' : 'border-white'
                          }`}
                          style={theme === 'tactical' ? { backgroundColor: `${color.bg}22`, color: color.bg } : { backgroundColor: color.bg, color: color.text }}
                        >
                          {item.agent.toUpperCase().replace("AGENT", "")}
                        </span>
                      </div>
                      <div className={`text-[12px] font-[600] leading-snug ${theme === 'tactical' ? 'text-slate-200' : 'text-[#3E3650]'}`}>
                        {item.assessment}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={`p-4 rounded-[20px] text-center text-xs font-[700] border ${
                  theme === 'tactical'
                    ? 'bg-slate-900/50 border-slate-800 text-slate-400 font-mono'
                    : 'clay-card bg-white text-[#8E819E]'
                }`}>
                  Click <b>INJECT SCENARIO</b> or <b>SIMULATE TICK</b> to watch autonomous agents negotiate resources and train tactical policies.
                </div>
              )}
            </div>
          </div>

          <div className={`pt-3 border-t-2 flex justify-between text-[10px] font-[800] ${
            theme === 'tactical' ? 'border-slate-800 text-slate-400 font-mono' : 'border-[#EEE8F8] text-[#8E819E]'
          }`}>
            <span>COMM: GEMINI 2.5 FLASH</span>
            <span>TRAINED: #{trainingStats?.total_episodes ?? 1}</span>
          </div>
        </div>

      </div>

      {/* BOTTOM TELEMETRY DOCK */}
      <footer className={`${
        theme === 'tactical' 
          ? 'tactical-panel border border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
          : 'clay-card'
      } p-4 mt-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-center transition-all`}>
        {/* Metric 1 */}
        <div className={`${
          theme === 'tactical' ? 'tactical-inset border border-slate-800/80 bg-slate-950/60 font-mono' : 'clay-inset'
        } p-3 rounded-[20px] text-center`}>
          <div className={`text-[10px] font-[800] uppercase ${theme === 'tactical' ? 'text-slate-400' : 'text-[#9A8EB0]'}`}>AVG RESPONSE</div>
          <div className={`text-xl font-[800] mt-0.5 ${theme === 'tactical' ? 'text-cyan-300' : 'text-[#244974]'}`}>3.8min</div>
          <div className={`text-[10px] font-[800] ${theme === 'tactical' ? 'text-emerald-400' : 'text-[#2E5A2A]'}`}>▼ OPTIMAL</div>
        </div>

        {/* Metric 2 */}
        <div className={`${
          theme === 'tactical' ? 'tactical-inset border border-slate-800/80 bg-slate-950/60 font-mono' : 'clay-inset'
        } p-3 rounded-[20px] text-center`}>
          <div className={`text-[10px] font-[800] uppercase ${theme === 'tactical' ? 'text-slate-400' : 'text-[#9A8EB0]'}`}>FLEET READINESS</div>
          <div className={`text-xl font-[800] mt-0.5 ${theme === 'tactical' ? 'text-amber-300' : 'text-[#874b0c]'}`}>
            {unitsList.filter((u: any) => u.status === "available").length}/{unitsList.length}
          </div>
          <div className={`text-[10px] font-[700] ${theme === 'tactical' ? 'text-slate-400' : 'text-[#8E819E]'}`}>Available Units</div>
        </div>

        {/* Metric 3 */}
        <div className={`${
          theme === 'tactical' ? 'tactical-inset border border-slate-800/80 bg-slate-950/60 font-mono' : 'clay-inset'
        } p-3 rounded-[20px] text-center`}>
          <div className={`text-[10px] font-[800] uppercase ${theme === 'tactical' ? 'text-slate-400' : 'text-[#9A8EB0]'}`}>ACTIVE CASUALTIES</div>
          <div className={`text-xl font-[800] mt-0.5 ${theme === 'tactical' ? 'text-slate-100' : 'text-[#2F2940]'}`}>
            {Object.values(worldState?.patients || {}).filter((p: any) => p.status !== "admitted").length}
          </div>
          <div className={`text-[10px] font-[700] ${theme === 'tactical' ? 'text-slate-400' : 'text-[#8E819E]'}`}>In Triage Queue</div>
        </div>

        {/* Metric 4 */}
        <div className={`${
          theme === 'tactical' ? 'tactical-inset border border-slate-800/80 bg-slate-950/60 font-mono' : 'clay-inset'
        } p-3 rounded-[20px] text-center`}>
          <div className={`text-[10px] font-[800] uppercase ${theme === 'tactical' ? 'text-slate-400' : 'text-[#9A8EB0]'}`}>TRAUMA CAPACITY</div>
          <div className={`text-xl font-[800] mt-0.5 ${theme === 'tactical' ? 'text-emerald-400' : 'text-[#2E5A2A]'}`}>
            {worldState?.hospitals?.H1?.available_beds ?? 28}
          </div>
          <div className={`text-[10px] font-[800] ${theme === 'tactical' ? 'text-emerald-400' : 'text-[#2E5A2A]'}`}>H1 ICU Free</div>
        </div>

        {/* Metric 5 */}
        <div className={`${
          theme === 'tactical' ? 'tactical-inset border border-slate-800/80 bg-slate-950/60 font-mono' : 'clay-inset'
        } p-3 rounded-[20px] text-center`}>
          <div className={`text-[10px] font-[800] uppercase ${theme === 'tactical' ? 'text-slate-400' : 'text-[#9A8EB0]'}`}>ACTIVE INCIDENTS</div>
          <div className={`text-xl font-[800] mt-0.5 ${theme === 'tactical' ? 'text-red-400' : 'text-[#dc2626]'}`}>
            {activeIncidentsList.length} ACTIVE
          </div>
          <div className={`text-[10px] font-[700] ${theme === 'tactical' ? 'text-slate-400 truncate' : 'text-[#8E819E]'}`}>
            {activeIncidentsList.length > 0 ? (activeIncidentsList[0] as any)?.incident_type : "None"}
          </div>
        </div>

        {/* Interactive Auto/Manual Toggle Switch Unit */}
        <div className={`${
          theme === 'tactical' ? 'tactical-inset border border-slate-800/80 bg-slate-950/60' : 'clay-inset'
        } p-3 rounded-[20px] flex items-center justify-between col-span-2 md:col-span-1`}>
          <div>
            <div className={`text-[10px] font-[800] ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#7B6E96]'}`}>DRILL TRAIN</div>
            <div className={`text-[11px] font-[800] uppercase mt-0.5 ${
              autoMode 
                ? (theme === 'tactical' ? "text-emerald-400 font-mono" : "text-[#2E5A2A]")
                : (theme === 'tactical' ? "text-amber-400 font-mono" : "text-[#874b0c]")
            }`}>
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

      {/* MANUAL SCENARIO INJECTOR & LIVE MODEL TRAINER MODAL */}
      {!autoMode && (
        <div className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
          theme === 'tactical' ? 'bg-slate-950/80' : 'bg-[#2F2940]/45'
        }`}>
          <div className={`${
            theme === 'tactical'
              ? 'tactical-panel border border-slate-700/80 shadow-[0_10px_50px_rgba(0,0,0,0.8)] text-slate-100'
              : 'clay-device'
          } max-w-xl w-full p-6 relative max-h-[92vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between pb-3 border-b-2 mb-4 ${
              theme === 'tactical' ? 'border-slate-800' : 'border-[#EEE8F8]'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                  theme === 'tactical' 
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]' 
                    : 'bg-[#FFE6A5] border-white text-[#874b0c]'
                }`}>
                  <Zap size={18} />
                </div>
                <div>
                  <span className={`font-[800] text-[15px] block ${
                    theme === 'tactical' ? 'text-cyan-200 font-mono' : 'text-[#2F2940]'
                  }`}>
                    LIVE DRILL INJECTOR & MODEL TRAINER
                  </span>
                  <span className={`text-[10px] font-[700] ${
                    theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#7B6E96]'
                  }`}>
                    Inputs live hazards and casualties to train Gemini swarm policies in real time
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAutoMode(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${
                  theme === 'tactical'
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    : 'bg-white text-[#8E819E] hover:text-[#2F2940] border-white'
                }`}
                style={theme === 'clay' ? { boxShadow: '2px 2px 6px rgba(0,0,0,0.08)' } : {}}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Drill Presets */}
            <div className="mb-4">
              <span className={`text-[10px] uppercase font-[800] block mb-1.5 ${
                theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'
              }`}>
                Quick Drill Scenario Templates:
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyDrillPreset('subway')}
                  className={`p-2 rounded-[14px] text-[10px] font-[800] text-left border transition ${
                    theme === 'tactical'
                      ? 'bg-slate-900/90 text-cyan-300 border-slate-700 hover:bg-slate-800 hover:border-cyan-500/50'
                      : 'clay-button bg-white text-[#244974] hover:bg-[#F3EFFC]'
                  }`}
                >
                  💥 Subway Gas Leak
                </button>
                <button
                  type="button"
                  onClick={() => applyDrillPreset('hazmat')}
                  className={`p-2 rounded-[14px] text-[10px] font-[800] text-left border transition ${
                    theme === 'tactical'
                      ? 'bg-slate-900/90 text-amber-300 border-slate-700 hover:bg-slate-800 hover:border-amber-500/50'
                      : 'clay-button bg-white text-[#874b0c] hover:bg-[#F3EFFC]'
                  }`}
                >
                  ☣️ Chemical Spill
                </button>
                <button
                  type="button"
                  onClick={() => applyDrillPreset('flood')}
                  className={`p-2 rounded-[14px] text-[10px] font-[800] text-left border transition ${
                    theme === 'tactical'
                      ? 'bg-slate-900/90 text-blue-300 border-slate-700 hover:bg-slate-800 hover:border-blue-500/50'
                      : 'clay-button bg-white text-[#0284c7] hover:bg-[#F3EFFC]'
                  }`}
                >
                  🌊 Flash Flood
                </button>
                <button
                  type="button"
                  onClick={() => applyDrillPreset('collapse')}
                  className={`p-2 rounded-[14px] text-[10px] font-[800] text-left border transition ${
                    theme === 'tactical'
                      ? 'bg-slate-900/90 text-red-300 border-slate-700 hover:bg-slate-800 hover:border-red-500/50'
                      : 'clay-button bg-white text-[#dc2626] hover:bg-[#F3EFFC]'
                  }`}
                >
                  🏢 Building Collapse
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 font-[700] text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] uppercase font-[800] block mb-1 ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'}`}>Incident Hazard Type</label>
                  <select 
                    value={customIncident.incident_type} 
                    onChange={(e) => setCustomIncident({ ...customIncident, incident_type: e.target.value })}
                    className={`w-full p-2.5 rounded-[16px] text-xs font-[700] outline-none border ${
                      theme === 'tactical'
                        ? 'bg-slate-900 text-slate-100 border-slate-700'
                        : 'clay-inset text-[#3E3650]'
                    }`}
                  >
                    <option value="subway_gas_rupture">Subway Gas Line Rupture</option>
                    <option value="structural_collapse">Structural Building Collapse</option>
                    <option value="explosion">Industrial Explosion</option>
                    <option value="hazardous_spill">Hazmat / Toxic Release</option>
                    <option value="flash_flood">Flash Flood Inundation</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] uppercase font-[800] block mb-1 ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'}`}>Target Sector Location</label>
                  <select 
                    value={customIncident.location} 
                    onChange={(e) => setCustomIncident({ ...customIncident, location: e.target.value })}
                    className={`w-full p-2.5 rounded-[16px] text-xs font-[700] outline-none border ${
                      theme === 'tactical'
                        ? 'bg-slate-900 text-slate-100 border-slate-700'
                        : 'clay-inset text-[#3E3650]'
                    }`}
                  >
                    <option value="Sector_6B">Sector 6B (Subway & Towers)</option>
                    <option value="Sector_5C">Sector 5C (Industrial Factory)</option>
                    <option value="Evac_Zone">Evacuation Holding Perimeter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-[10px] uppercase font-[800] block mb-1 ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'}`}>Severity</label>
                  <select 
                    value={customIncident.severity} 
                    onChange={(e) => setCustomIncident({ ...customIncident, severity: e.target.value })}
                    className={`w-full p-2.5 rounded-[16px] text-xs font-[800] outline-none border ${
                      theme === 'tactical'
                        ? 'bg-slate-900 text-rose-400 border-slate-700'
                        : 'clay-inset text-[#dc2626] border-transparent'
                    }`}
                  >
                    <option value="critical">Critical (ICU/Trauma)</option>
                    <option value="high">High (Urgent)</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] uppercase font-[800] block mb-1 ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'}`}>Block Corridors</label>
                  <select 
                    value={customIncident.block_road} 
                    onChange={(e) => setCustomIncident({ ...customIncident, block_road: e.target.value })}
                    className={`w-full p-2.5 rounded-[16px] text-xs font-[700] outline-none border ${
                      theme === 'tactical'
                        ? 'bg-slate-900 text-slate-100 border-slate-700'
                        : 'clay-inset text-[#3E3650] border-transparent'
                    }`}
                  >
                    <option value="Road_D4">Road D4 (Sector 6B - H1)</option>
                    <option value="Road_C3">Road C3 (Sector 5C - 6B)</option>
                    <option value="Road_B2">Road B2 (Sector 5C - H1)</option>
                    <option value="Road_A1">Road A1 (Station N - 5C)</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] uppercase font-[800] block mb-1 ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'}`}>Casualties Count</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={12}
                    value={customIncident.patient_count}
                    onChange={(e) => setCustomIncident({ ...customIncident, patient_count: parseInt(e.target.value) || 1 })}
                    className={`w-full p-2.5 rounded-[16px] text-xs font-[800] outline-none border ${
                      theme === 'tactical'
                        ? 'bg-slate-900 text-cyan-300 border-slate-700 font-mono'
                        : 'clay-inset text-[#2F2940] border-transparent'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[10px] uppercase font-[800] block mb-1 ${theme === 'tactical' ? 'text-slate-400 font-mono' : 'text-[#9A8EB0]'}`}>Incident Tactical Briefing</label>
                <textarea 
                  rows={2}
                  value={customIncident.details}
                  onChange={(e) => setCustomIncident({ ...customIncident, details: e.target.value })}
                  className={`w-full p-2.5 rounded-[16px] text-xs font-[600] outline-none border ${
                    theme === 'tactical'
                      ? 'bg-slate-900 text-slate-200 border-slate-700 font-mono'
                      : 'clay-inset text-[#3E3650] border-transparent'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button 
                  onClick={injectAndTrainSwarm}
                  disabled={isInjecting}
                  className={`flex-1 py-3.5 rounded-full font-[800] text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                    theme === 'tactical'
                      ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-cyan-900/30 font-mono'
                      : 'clay-button bg-gradient-to-r from-[#B5DEFF] to-[#D6C2FF] text-[#1b446f]'
                  }`}
                >
                  <Zap size={15} className={theme === 'tactical' ? 'text-cyan-200' : 'text-[#874b0c]'} />
                  <span>{isInjecting ? "Running Swarm & Training Policy..." : "⚡ RUN SCENARIO & TRAIN SWARM"}</span>
                </button>

                <button 
                  onClick={() => setAutoMode(true)}
                  className={`px-5 py-3.5 rounded-full font-[800] text-xs transition ${
                    theme === 'tactical'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 font-mono'
                      : 'clay-button bg-white text-[#7B6E96]'
                  }`}
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
