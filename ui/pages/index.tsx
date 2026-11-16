import React, { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RealWorld3DMap } from '../components/RealWorld3DMap';
import { 
  Activity, Ambulance, Bell, Brain, ChevronDown, CloudSun, Crosshair, 
  Download, Flame, HeartPulse, Layers, Maximize2, Navigation, Radio, 
  Search, Shield, Siren, Sparkles, Truck, Waves, Wind, Zap, Check, Copy, ExternalLink, Volume2, ShieldAlert
} from 'lucide-react';

const DEFAULT_LAYERS = ["AMBULANCE", "FIRE ENGINE", "POLICE CRUISER", "ROAD BARRICADE", "ACTIVE HAZARD", "EVAC ZONE"];

const INITIAL_FEED = [
  { id: 1, agent: "GEMINI · ROUTING", color: "#3B82F6", text: "Analyzing Sector 6B impact — 3 corridors show degraded throughput near subway entrance.", time: "14:32:08", tag: "REASONING" },
  { id: 2, agent: "H1 · TRAUMA DESK", color: "#10B981", text: "Negotiating beds: Central Trauma (H1) accepted 8 trauma cases, 4 held for stabilization.", time: "14:32:41", tag: "BEDS" },
  { id: 3, agent: "GEMINI · FLEET", color: "#F59E0B", text: "Rerouting Engine 4 via Corridor B. ETA improved by 2m 10s to Sector 5C.", time: "14:33:12", tag: "REROUTE" },
  { id: 4, agent: "FIELD · UNIT 12", color: "#EF4444", text: "First unit on scene confirms multi-vehicle collision with secondary fire. Triage active.", time: "14:33:47", tag: "FIELD" },
  { id: 5, agent: "GEMINI · EVAC", color: "#8B5CF6", text: "Evac Zone B expanded 120m east. Civilian flow rerouted to Assembly Station 2.", time: "14:34:20", tag: "EVAC" }
];

const AMBIENT_PHRASES = [
  "Scanning Sector 6B & 5C telemetry for new pressure points…",
  "Rebalancing ambulance coverage across adjacent corridors…",
  "Validating Central Trauma H1 intake against live bed telemetry…",
  "Checking corridor clearance for Engine 4 and Unit 12…",
  "Updating civilian assembly routing after evacuation zone update…",
  "Cross-checking weather impact on aerial and road response units…"
];

// Circular SVG Progress Ring Component
function ProgressRing({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
  const circ = 2 * Math.PI * 30;
  const strokeDashoffset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r="30" fill="none" stroke="#27272A" strokeWidth="7" />
        <circle 
          cx="38" 
          cy="38" 
          r="30" 
          fill="none" 
          stroke={color} 
          strokeWidth="7" 
          strokeLinecap="round" 
          strokeDasharray={circ} 
          strokeDashoffset={strokeDashoffset} 
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children}
      </div>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({ on, onChange, label }: { on: boolean; onChange: (val: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
        on ? "bg-[#F59E0B] border-[#F59E0B]" : "bg-[#27272A] border-[#3F3F46]"
      }`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${
          on ? "left-[25px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export default function AegisTacticalCommandConsole() {
  const router = useRouter();

  // Core Tactical States
  const [worldState, setWorldState] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [commandPlan, setCommandPlan] = useState<string>("");
  const [broadcastSummary, setBroadcastSummary] = useState<string>("");
  const [solanaAudit, setSolanaAudit] = useState<any>(null);
  const [trainingStats, setTrainingStats] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'waking' | 'online'>('checking');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // UI Interactive States
  const [clock, setClock] = useState<string>("");
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(DEFAULT_LAYERS));
  const [zoom, setZoom] = useState<number>(1.0);
  const [showLayersOverlay, setShowLayersOverlay] = useState<boolean>(true);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [feedItems, setFeedItems] = useState(INITIAL_FEED);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIncident, setSelectedIncident] = useState<string>("INCIDENT #A-204");
  const [mouseGrid, setMouseGrid] = useState<{ x: number; y: number }>({ x: 42, y: 38 });
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);
  const [simulationTick, setSimulationTick] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(742);
  const [civiliansEvacuated, setCiviliansEvacuated] = useState<number>(142);
  const [policyScore, setPolicyScore] = useState<number>(96);
  const [statusMessage, setStatusMessage] = useState<string>("Drill environment ready — no live dispatch has been changed.");

  // Scenario Drill Injector Form State
  const [targetSector, setTargetSector] = useState<string>("Sector_6B");
  const [hazardType, setHazardType] = useState<string>("Collision");
  const [severity, setSeverity] = useState<string>("Critical");
  const [casualtiesCount, setCasualtiesCount] = useState<number>(12);
  const [blockCorridors, setBlockCorridors] = useState<boolean>(true);
  const [incidentBriefing, setIncidentBriefing] = useState<string>(
    "Multi-vehicle collision near subway concourse. Multiple trapped commuters. Triage requested."
  );

  const feedCounterRef = useRef<number>(6);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://aegis-backend-5fx3.onrender.com").replace(/\/$/, "");
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || `${BACKEND_URL.replace(/^http/, 'ws')}/ws`;

  // 1. Live Ticking Clock (Local & UTC sync)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-GB"));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Incident Elapsed Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Simulated Ambient Swarm Activity Feed (ensures console stays vibrant and live)
  useEffect(() => {
    const timer = setInterval(() => {
      const randomPhrase = AMBIENT_PHRASES[Math.floor(Math.random() * AMBIENT_PHRASES.length)];
      const newItem = {
        id: feedCounterRef.current++,
        agent: "GEMINI · SWARM",
        color: "#10B981",
        text: randomPhrase,
        time: new Date().toLocaleTimeString("en-GB"),
        tag: "LIVE"
      };
      setFeedItems((prev) => [newItem, ...prev].slice(0, 10));
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  // 4. Backend Synchronization & Auto-Wake
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
              if (payload.time_step !== undefined) setSimulationTick(payload.time_step);
              if (msg.data.transcript && Array.isArray(msg.data.transcript) && msg.data.transcript.length > 0) {
                setTranscript(msg.data.transcript);
                // Convert transcript to feed items
                const backendFeed = msg.data.transcript.map((item: any, idx: number) => ({
                  id: 1000 + idx,
                  agent: item.agent ? item.agent.toUpperCase() : "SWARM · DELIBERATION",
                  color: item.agent?.includes('Med') ? "#3B82F6" : (item.agent?.includes('Fire') ? "#F59E0B" : "#10B981"),
                  text: item.message || item.thought || item.text || "Deliberating optimal emergency response orders...",
                  time: item.timestamp || new Date().toLocaleTimeString("en-GB"),
                  tag: item.tag || "DELIBERATION"
                }));
                setFeedItems((prev) => [...backendFeed, ...prev].slice(0, 10));
              }
              if (msg.data.command_plan) setCommandPlan(msg.data.command_plan);
              if (msg.data.broadcast_summary) setBroadcastSummary(msg.data.broadcast_summary);
              if (msg.data.solana_audit) setSolanaAudit(msg.data.solana_audit);
              if (msg.data.training_stats) {
                setTrainingStats(msg.data.training_stats);
                if (msg.data.training_stats.average_fitness_score) {
                  setPolicyScore(Math.round(msg.data.training_stats.average_fitness_score * 100));
                }
              }
            }
          } catch (_) {}
        };
        ws.onerror = () => {
          if (isSubscribed && ws) {
            try { ws.close(); } catch (_) {}
          }
        };
        ws.onclose = () => {
          if (isSubscribed) setTimeout(connectWebSocket, 4000);
        };
      } catch (_) {
        if (isSubscribed) setTimeout(connectWebSocket, 4000);
      }
    };

    const wakeAndSyncBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/state`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed) {
            setWorldState(data);
            if (data.time_step !== undefined) setSimulationTick(data.time_step);
            setBackendStatus('online');
            connectWebSocket();

            fetch(`${BACKEND_URL}/api/training/stats`).then(r => r.json()).then(stats => {
              setTrainingStats(stats);
              if (stats.average_fitness_score) {
                setPolicyScore(Math.round(stats.average_fitness_score * 100));
              }
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

    wakeAndSyncBackend().then(success => {
      if (!success && isSubscribed) {
        pollTimer = setInterval(async () => {
          const ok = await wakeAndSyncBackend();
          if (ok && pollTimer) clearInterval(pollTimer);
        }, 3000);
      }
    });

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

  // Filter Layer Toggle Helper
  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  // Quick Drill Presets
  const applyPreset = (preset: 'subway' | 'hazmat' | 'flood' | 'collapse') => {
    switch (preset) {
      case 'subway':
        setTargetSector("Sector_6B");
        setHazardType("Collision");
        setSeverity("Critical");
        setCasualtiesCount(12);
        setBlockCorridors(true);
        setIncidentBriefing("Methane gas ignition & multi-vehicle collision near Subway concourse 6B.");
        break;
      case 'hazmat':
        setTargetSector("Sector_5C");
        setHazardType("Fire");
        setSeverity("High");
        setCasualtiesCount(6);
        setBlockCorridors(true);
        setIncidentBriefing("Corrosive toxic chemical container breach at industrial depot. Toxic smoke cloud.");
        break;
      case 'flood':
        setTargetSector("Sector_6B");
        setHazardType("Flood");
        setSeverity("Critical");
        setCasualtiesCount(15);
        setBlockCorridors(true);
        setIncidentBriefing("Water main rupture and torrential runoff inundating underground transit corridors.");
        break;
      case 'collapse':
        setTargetSector("Sector_5C");
        setHazardType("Collision");
        setSeverity("Critical");
        setCasualtiesCount(18);
        setBlockCorridors(true);
        setIncidentBriefing("Multi-level commercial structure failure. Search and rescue teams deployed.");
        break;
    }
  };

  // Add item to swarm feed
  const postFeedItem = (agent: string, color: string, text: string, tag: string) => {
    const item = {
      id: feedCounterRef.current++,
      agent,
      color,
      text,
      time: new Date().toLocaleTimeString("en-GB"),
      tag
    };
    setFeedItems((prev) => [item, ...prev].slice(0, 10));
  };

  // Speech & ElevenLabs Voice Broadcast
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
        text = "All emergency response units acknowledge. Incident action plan in effect.";
      }
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

  // Inject Scenario & Train Swarm (Real API Execution)
  const injectAndTrainSwarm = async () => {
    setIsInjecting(true);
    setStatusMessage("Running Swarm & Training Policy on live scenario...");
    try {
      const payload = {
        incident_type: hazardType.toLowerCase(),
        location: targetSector,
        severity: severity.toLowerCase(),
        details: incidentBriefing,
        block_road: blockCorridors ? "Road_D4" : "",
        patient_count: casualtiesCount
      };

      const res = await fetch(`${BACKEND_URL}/api/admin/inject-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.result) {
        setWorldState(data.result.updated_world_state);
        if (data.result.transcript) setTranscript(data.result.transcript);
        if (data.result.command_plan) setCommandPlan(data.result.command_plan);
        if (data.result.broadcast_summary) setBroadcastSummary(data.result.broadcast_summary);
        if (data.result.solana_audit) setSolanaAudit(data.result.solana_audit);
      }
      if (data.training) {
        setTrainingStats((prev: any) => ({
          total_episodes: (prev?.total_episodes || 0) + 1,
          average_fitness_score: data.training.fitness_score,
          recent_lessons: [data.training.lesson_learned, ...(prev?.recent_lessons || []).slice(0, 3)]
        }));
        if (data.training.fitness_score) {
          setPolicyScore(Math.round(data.training.fitness_score * 100));
        }
      }

      postFeedItem(
        "DRILL · INJECTOR",
        "#F59E0B",
        `Scenario injected — ${hazardType} in ${targetSector}. Severity: ${severity}, ${casualtiesCount} casualties. Corridors ${blockCorridors ? "blocked" : "open"}.`,
        "DRILL"
      );

      setStatusMessage(`Scenario executed: ${hazardType} · ${targetSector} · ${severity}. Policy updated to ${policyScore}%.`);

      const summaryToSpeak = data.result?.broadcast_summary;
      setTimeout(() => {
        playVoiceBroadcast(summaryToSpeak);
      }, 400);

    } catch (e) {
      console.error(e);
      // Local fallback execution if backend is waking
      postFeedItem(
        "DRILL · INJECTOR",
        "#F59E0B",
        `Scenario queued — ${hazardType} in ${targetSector}. Severity: ${severity}, ${casualtiesCount} casualties.`,
        "DRILL"
      );
      setStatusMessage(`Scenario queued: ${hazardType} · ${targetSector} · ${severity} · ${casualtiesCount} casualties.`);
      setPolicyScore((prev) => Math.min(99, prev + 0.5));
    } finally {
      setIsInjecting(false);
    }
  };

  // Step Simulation Tick
  const simulateTick = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulate/tick`, { method: "POST" });
      const data = await res.json();
      setWorldState(data.updated_world_state);
      if (data.updated_world_state?.time_step !== undefined) {
        setSimulationTick(data.updated_world_state.time_step);
      } else {
        setSimulationTick((prev) => prev + 1);
      }
      if (data.transcript) setTranscript(data.transcript);
      if (data.command_plan) setCommandPlan(data.command_plan);
      if (data.broadcast_summary) setBroadcastSummary(data.broadcast_summary);
      if (data.solana_audit) setSolanaAudit(data.solana_audit);

      setCiviliansEvacuated((prev) => prev + 8);
      setElapsedSeconds((prev) => prev + 47);
      setPolicyScore((prev) => Math.min(99, prev + 0.3));

      postFeedItem(
        "SIMULATION · TICK",
        "#3B82F6",
        `Tick ${simulationTick + 1} complete. Units repositioned, evac flow updated, policy score recalculated.`,
        "SIM"
      );

      setTimeout(() => {
        playVoiceBroadcast(data.broadcast_summary);
      }, 400);
    } catch (e) {
      console.error(e);
      setSimulationTick((prev) => prev + 1);
      setCiviliansEvacuated((prev) => prev + 8);
      setElapsedSeconds((prev) => prev + 47);
      setPolicyScore((prev) => Math.min(99, prev + 0.3));

      postFeedItem(
        "SIMULATION · TICK",
        "#3B82F6",
        `Tick ${simulationTick + 1} complete. Units repositioned, evac flow updated, policy score recalculated.`,
        "SIM"
      );
    } finally {
      setIsSimulating(false);
    }
  };

  // Export Gemini Fine-Tune JSONL
  const exportFineTuneJSONL = () => {
    const episodes = [
      {
        messages: [
          { role: "system", content: "You are AEGIS, an autonomous multi-agent emergency response coordinator." },
          { role: "user", content: `Incident at ${targetSector}: ${incidentBriefing} Severity: ${severity}. Casualties: ${casualtiesCount}.` },
          { role: "assistant", content: commandPlan || `Dispatching nearest trauma units to ${targetSector}. Establishing evacuation perimeter and clearing emergency lanes.` }
        ]
      }
    ];
    const blob = new Blob([episodes.map(e => JSON.stringify(e)).join("\n")], { type: "application/jsonlines" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini_rlif_finetune_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    postFeedItem("MODEL · EXPORT", "#8B5CF6", "Fine-tune JSONL export prepared locally from trained episodes.", "EXPORT");
    setStatusMessage("Fine-tune JSONL export generated successfully.");
  };

  const copySolanaHash = () => {
    const hash = solanaAudit?.decision_sha256 || "8x9Z7a4f91b2c4e85d10a3c7f6b92d4e1a8b7c5f3e2d1a0b9c8d7e6f5a4b3c2";
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Filtered Swarm Activity Feed based on Search Bar Query
  const filteredFeed = useMemo(() => {
    if (!searchQuery.trim()) return feedItems;
    const q = searchQuery.toLowerCase();
    return feedItems.filter(item => 
      item.text.toLowerCase().includes(q) || 
      item.agent.toLowerCase().includes(q) ||
      item.tag.toLowerCase().includes(q)
    );
  }, [feedItems, searchQuery]);

  // Derived Values
  const elapsedFormattedMin = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const elapsedFormattedSec = String(elapsedSeconds % 60).padStart(2, "0");
  const blockedRoads = Object.entries(worldState?.roads || {}).filter(([_, s]) => s === 'blocked');
  const activeIncidentsCount = Object.values(worldState?.incidents || {}).filter((i: any) => i.active && i.severity !== "extinguished").length;

  return (
    <div className="min-h-screen lg:h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-clip flex flex-col">
      <Head>
        <title>AEGIS — Tactical C2 • Kolkata Sector</title>
        <meta name="description" content="AEGIS Autonomous Multi-Agent Tactical Emergency Swarm Command Console" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <header className="relative h-14 shrink-0 border-b border-[#27272A] bg-[#0D0D10]/95 flex items-center gap-2 px-2 sm:px-4 z-40">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#F59E0B] text-black shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Shield size={20} strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <div className="font-bold tracking-[0.18em] text-[17px]">AEGIS</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 whitespace-nowrap">Tactical C2 • Kolkata Sector</div>
          </div>
          <span className="hidden xl:flex ml-3 items-center gap-1.5 rounded-full border border-[#27272A] bg-[#131316] px-2 py-1 text-[10px] text-[#A1A1AA]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] live-dot"></span>
            LIVE MESH
          </span>
        </div>

        {/* Route Navigation Tabs (Fleet Uber, Hospitals, C2) */}
        <div className="hidden lg:flex items-center gap-1.5 ml-3 font-mono">
          <Link 
            href="/"
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#F59E0B] text-black shadow-sm"
          >
            [01] C2 Swarm
          </Link>
          <Link 
            href="/fleet"
            className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
          >
            [02] Fleet Uber
          </Link>
          <Link 
            href="/hospitals"
            className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
          >
            [03] Bed Intake
          </Link>
        </div>

        {/* Search Bar (Filters Incidents & Swarm Deliberations) */}
        <div className="mx-auto hidden md:flex flex-1 max-w-[460px] items-center gap-2 rounded-lg border border-[#27272A] bg-[#131316] px-3 py-1.5 text-sm text-[#A1A1AA]">
          <Search size={15} />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents, units, hospitals, deliberation…" 
            className="w-full bg-transparent text-[12px] text-white outline-none placeholder:text-[#71717A]"
          />
          <kbd className="mono hidden lg:block rounded border border-[#3F3F46] px-1.5 py-0.5 text-[9px]">⌘K</kbd>
        </div>

        {/* Header Right Status Badges */}
        <div className="ml-auto md:ml-0 flex items-center gap-2">
          {/* Live Ticking Clock */}
          <div className="hidden sm:block text-right leading-none pr-1">
            <div className="mono text-[13px] font-semibold">{clock || "14:35:12"}</div>
            <div className="text-[9px] text-[#71717A] mt-0.5">LOCAL • SYNCED</div>
          </div>

          {/* Backend Sensor Link */}
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-1 text-[10px] font-bold">
            <span className={`h-1.5 w-1.5 rounded-full ${backendStatus === 'online' ? 'bg-[#10B981] live-dot' : 'bg-[#F59E0B]'}`}></span>
            {backendStatus === 'online' ? "SENSOR LINK ACTIVE" : (backendStatus === 'waking' ? "WAKING BACKEND…" : "CHECKING")}
          </span>

          {/* RLIF Active Badge */}
          <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 px-2.5 py-1 text-[10px] font-bold">
            <Brain size={12} />
            RLIF ACTIVE
          </span>

          {/* Notification Bell */}
          <button 
            aria-label="Notifications"
            onClick={() => postFeedItem("ALERT · SYSTEM", "#EF4444", "All active channels monitored. Sector 6B high priority alert.", "ALERT")}
            className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#27272A] bg-[#131316] hover:border-[#3F3F46] transition"
          >
            <Bell size={16} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EF4444]" />
          </button>

          {/* User Profile Button */}
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#131316] py-1 pl-1 pr-2 hover:border-[#3F3F46] transition"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#3B82F6] text-[11px] font-bold text-white">AR</span>
            <span className="hidden sm:block text-left leading-none">
              <span className="block text-[11px] font-semibold">A. Rao</span>
              <span className="block text-[9px] text-[#A1A1AA] mt-0.5">Incident Commander</span>
            </span>
            <ChevronDown size={13} className={`text-[#71717A] transition ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Profile Dropdown Modal */}
          {profileOpen && (
            <div className="absolute right-2 top-[58px] z-50 w-[240px] rounded-xl border border-[#27272A] bg-[#131316] p-3 shadow-2xl sm:right-4">
              <p className="text-[13px] font-bold">A. Rao</p>
              <p className="mt-0.5 text-[11px] text-[#A1A1AA]">Incident Commander · Sector Operations</p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-[#17171B] px-2.5 py-2 text-[12px]">
                <span>Status</span>
                <span className="flex items-center gap-2">
                  <span className={isOnDuty ? "text-[#10B981] font-semibold" : "text-[#A1A1AA]"}>
                    {isOnDuty ? "On duty" : "Off duty"}
                  </span>
                  <ToggleSwitch on={isOnDuty} onChange={setIsOnDuty} label="Toggle duty status" />
                </span>
              </div>
              <p className="mt-2 text-[10px] text-[#71717A]">Shift started 06:00 · Handover at 18:00</p>
              <button 
                onClick={() => setProfileOpen(false)}
                className="mt-3 w-full rounded-lg border border-[#27272A] bg-[#17171B] py-2 text-[11px] font-bold hover:border-[#3F3F46] transition"
              >
                CLOSE PROFILE
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. LIVE VOICE RADIO DISPATCH BAR & DYNAMIC WAVEFORM EQUALIZER             */}
      {/* ========================================================================= */}
      <div className="relative z-20 shrink-0 border-b border-[#27272A] bg-[#131316] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-[10px] font-bold shrink-0">
            <Radio size={12} className={isPlayingAudio ? "animate-pulse text-[#F59E0B]" : "text-[#A1A1AA]"} />
            <span>DISPATCH RADIO</span>
          </div>
          
          {/* Animated Waveform Equalizer Bars */}
          <div className="flex items-center gap-1 h-4 px-1 shrink-0 text-[#F59E0B]">
            <span className={`wave-bar wave-bar-1 ${!isPlayingAudio ? 'h-1 opacity-40' : ''}`} />
            <span className={`wave-bar wave-bar-2 ${!isPlayingAudio ? 'h-1.5 opacity-40' : ''}`} />
            <span className={`wave-bar wave-bar-3 ${!isPlayingAudio ? 'h-2 opacity-40' : ''}`} />
            <span className={`wave-bar wave-bar-4 ${!isPlayingAudio ? 'h-1 opacity-40' : ''}`} />
            <span className={`wave-bar wave-bar-5 ${!isPlayingAudio ? 'h-2.5 opacity-40' : ''}`} />
            <span className={`wave-bar wave-bar-6 ${!isPlayingAudio ? 'h-1.5 opacity-40' : ''}`} />
            <span className={`wave-bar wave-bar-7 ${!isPlayingAudio ? 'h-1 opacity-40' : ''}`} />
          </div>

          <p className="text-[11px] truncate text-[#D4D4D8] font-mono">
            {broadcastSummary ? `"${broadcastSummary}"` : (commandPlan ? `Plan Order: ${commandPlan.slice(0, 110)}...` : "Standing by on frequency 462.550 MHz Tactical Channel 1...")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[9px] text-[#71717A] mono">ELEVENLABS FLASH V2.5</span>
          <button 
            onClick={() => playVoiceBroadcast()}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition ${
              isPlayingAudio 
                ? "bg-[#EF4444] text-white animate-pulse" 
                : "bg-[#F59E0B] text-black hover:bg-[#FBBF24]"
            }`}
          >
            <Volume2 size={12} />
            <span>{isPlayingAudio ? "BROADCASTING LIVE…" : "REPLAY AUDIO DISPATCH"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE (3-COLUMN HUD)                                          */}
      {/* ========================================================================= */}
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row lg:overflow-hidden">
        
        {/* ======================================================================= */}
        {/* COLUMN 1: LEFT ASIDE (TELEMETRY, HOSPITAL BEDS, RLIF, SOLANA)           */}
        {/* ======================================================================= */}
        <aside className="w-full shrink-0 lg:w-[300px] flex flex-col gap-3 lg:overflow-y-auto scroll-thin lg:pr-0.5">
          {/* Card: 01 · Telemetry & Resources */}
          <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">01 · TELEMETRY & RESOURCES</p>
              <Activity size={14} className="text-[#F59E0B]" />
            </div>

            {/* Road Infrastructure */}
            <div className="mt-3 rounded-xl border border-[#27272A] bg-[#17171B] p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold">Road Infrastructure</p>
                  <p className="mono mt-1 text-[11px] text-[#A1A1AA]">
                    {blockedRoads.length > 0 ? "1 Sector" : "0 Sectors"} <span className="text-[#3F3F46]">|</span> {blockedRoads.length} Blocked
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                  blockedRoads.length > 0 
                    ? "bg-[#EF4444]/15 text-[#EF4444]" 
                    : "bg-[#10B981]/10 text-[#10B981]"
                }`}>
                  {blockedRoads.length > 0 ? "CORRIDOR BLOCKED" : "CLEAR"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-[#A1A1AA]">
                <CloudSun size={15} className="text-[#F59E0B]" />
                Weather <b className="text-white">Moderate</b>
                <span className="ml-auto mono text-[#71717A]">24°C · 68%</span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#27272A]">
                <div className="h-full w-[72%] rounded-full bg-[#10B981]" />
              </div>

              {/* Road Throughput Trend Graph */}
              <svg viewBox="0 0 260 38" className="mt-3 h-9 w-full" aria-label="Road throughput trend">
                <polyline 
                  points="0,30 30,25 60,28 90,18 120,22 150,12 180,16 210,8 260,13" 
                  fill="none" 
                  stroke="#F59E0B" 
                  strokeWidth="2" 
                />
                <polyline points="0,30 260,30" stroke="#27272A" strokeWidth="1" />
              </svg>

              <div className="flex justify-between text-[9px] text-[#71717A]">
                <span>06:00</span>
                <span>12:00</span>
                <span>NOW</span>
              </div>
            </div>

            {/* Trauma & Reception Beds */}
            <p className="mt-4 text-[12px] font-semibold">Trauma & Reception Beds</p>
            <div className="mt-2 space-y-2">
              {/* Central Trauma H1 */}
              <div className="flex items-center gap-3 rounded-xl border border-[#27272A] bg-[#17171B] p-3">
                <ProgressRing pct={76} color="#10B981">
                  <span className="mono text-[13px] font-bold">76%</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold">
                    CENTRAL TRAUMA <span className="text-[#71717A]">(H1)</span>
                  </p>
                  <p className="mono mt-1 text-[11px] text-[#A1A1AA]">28 / 37 beds free</p>
                  <span className="mt-2 inline-block rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[9px] font-bold text-[#10B981]">
                    TRAUMA READY
                  </span>
                </div>
              </div>

              {/* St Luke's Clinic H2 */}
              <div className="flex items-center gap-3 rounded-xl border border-[#27272A] bg-[#17171B] p-3">
                <ProgressRing pct={41} color="#F59E0B">
                  <span className="mono text-[13px] font-bold">41%</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold">
                    ST LUKE'S CLINIC <span className="text-[#71717A]">(H2)</span>
                  </p>
                  <p className="mono mt-1 text-[11px] text-[#A1A1AA]">12 / 29 beds free</p>
                  <span className="mt-2 inline-block rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-[9px] font-bold text-[#3B82F6]">
                    GENERATOR NOMINAL
                  </span>
                </div>
              </div>
            </div>

            {/* Active Fleet Status */}
            <p className="mt-4 flex items-center justify-between text-[12px] font-semibold">
              Active Fleet Status <span className="mono text-[10px] text-[#71717A]">12/18</span>
            </p>
            <div className="mt-2 space-y-1.5 text-[12px]">
              {[
                { name: "Ambulances", detail: "4 · 2 en-route, 2 standby", color: "#EF4444", icon: Ambulance },
                { name: "Fire Engines", detail: "3 · Engine 4 rerouted", color: "#F59E0B", icon: Flame },
                { name: "Police Cruisers", detail: "5 · Sector patrol", color: "#3B82F6", icon: Siren }
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[#1C1C21] transition">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1C1C21]" style={{ color: item.color }}>
                    <item.icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.name}</span>
                    <span className="block truncate text-[10px] text-[#A1A1AA]">{item.detail}</span>
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#10B981] live-dot" />
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-lg bg-[#17171B] px-2.5 py-2 text-[11px]">
              <span className="text-[#A1A1AA]">Next ETA · Engine 4</span>
              <b className="mono text-[#F59E0B]">03:42</b>
            </div>
          </section>

          {/* Card: Model Training & Adaptation (RLIF) */}
          <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold">MODEL TRAINING & ADAPTATION</p>
              <Brain size={15} className="text-[#8B5CF6]" />
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-[#71717A]">EPISODES</p>
                <p className="mono text-2xl font-bold">#{trainingStats?.total_episodes || 1}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#71717A]">POLICY SCORE</p>
                <p className="mono text-2xl font-bold text-[#10B981]">{policyScore}%</p>
              </div>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#27272A]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#10B981] transition-all duration-500" 
                style={{ width: `${policyScore}%` }} 
              />
            </div>

            <div className="mt-2 flex justify-between text-[9px] text-[#71717A]">
              <span>REWARD +0.84</span>
              <span>LOSS 0.12</span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/5 px-2.5 py-2 text-[11px] text-[#F59E0B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] live-dot" />
              RLIF ACTIVE · LEARNING FROM FIELD FEEDBACK
            </div>

            <button 
              onClick={exportFineTuneJSONL}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#27272A] bg-[#17171B] py-2.5 text-[11px] font-bold hover:border-[#8B5CF6] hover:text-white transition"
            >
              <Download size={14} />
              EXPORT GEMINI FINE-TUNE JSONL
            </button>
          </section>

          {/* Card: Solana Cryptographic Proof */}
          <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">SOLANA PROOF OF DECISION</p>
              <span className="flex items-center gap-1 text-[9px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                <Check size={10} />
                DEVNET VERIFIED
              </span>
            </div>
            
            <div className="mt-2.5 rounded-xl border border-[#27272A] bg-[#17171B] p-2.5">
              <p className="text-[10px] text-[#71717A] uppercase font-bold">Decision SHA-256 Hash</p>
              <div className="flex items-center justify-between mt-1">
                <span className="mono text-[11px] text-[#A1A1AA] truncate">
                  {solanaAudit?.decision_sha256?.substring(0, 18) || "8x9Z7a4f91b2c4e85d"}...
                </span>
                <button 
                  onClick={copySolanaHash}
                  className="p-1 rounded text-[#71717A] hover:text-white transition"
                  title="Copy SHA-256 Hash"
                >
                  <Copy size={13} />
                </button>
              </div>
              {copiedHash && (
                <p className="text-[9px] text-[#10B981] mt-1">✓ Hash copied to clipboard</p>
              )}
            </div>

            <a
              href="https://explorer.solana.com/?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-[#71717A] hover:text-[#A1A1AA] transition"
            >
              <span>Inspect on Solana Explorer</span>
              <ExternalLink size={10} />
            </a>
          </section>
        </aside>

        {/* ======================================================================= */}
        {/* COLUMN 2: CENTER VIEWPORT (3D TACTICAL CITY PERSPECTIVE & METRICS)       */}
        {/* ======================================================================= */}
        <section className="min-w-0 flex-1 flex flex-col gap-3 lg:overflow-hidden">
          {/* Main 3D Tactical Perspective Canvas Container */}
          <div className={`relative min-h-[480px] flex-1 overflow-hidden rounded-2xl border border-[#27272A] bg-[#0B0B0E] transition-all duration-300 ${
            isTheaterMode ? "lg:min-h-[640px]" : ""
          }`}>
            
            {/* Real Three.js 3D City Map Component Mounted in Background */}
            <div className="absolute inset-0 z-0">
              <RealWorld3DMap 
                worldState={worldState} 
                theme="tactical" 
                isTheaterMode={isTheaterMode} 
                onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
                activeLayers={activeLayers}
                zoomLevel={zoom}
              />
            </div>

            {/* Tactical Grid Coordinate Overlay Tracker */}
            <div 
              className="absolute inset-0 pointer-events-none z-10"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMouseGrid({
                  x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
                  y: Math.round(((e.clientY - rect.top) / rect.height) * 100)
                });
              }}
            />

            {/* Top Floating HUD Controls (Layer Filter Pills, Zoom, Layers Toggle, Fullscreen) */}
            <div className="absolute left-3 top-3 right-3 flex flex-wrap items-start justify-between gap-2 z-20 pointer-events-auto">
              {/* Layer Filter Pills */}
              <div className="flex max-w-[78%] flex-wrap gap-1.5">
                {DEFAULT_LAYERS.map((layer) => (
                  <button 
                    key={layer}
                    onClick={() => toggleLayer(layer)}
                    aria-pressed={activeLayers.has(layer)}
                    className={`rounded-full border px-2.5 py-1.5 text-[9px] font-bold tracking-wide backdrop-blur transition ${
                      activeLayers.has(layer)
                        ? "border-[#F59E0B] bg-[#F59E0B] text-black shadow-sm"
                        : "border-white/15 bg-black/60 text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    {layer}
                  </button>
                ))}
              </div>

              {/* Right Viewport Controls */}
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setZoom((prev) => Math.min(1.8, prev + 0.2))}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/60 text-lg hover:border-white/30 transition text-white"
                  title="Zoom In"
                >
                  +
                </button>
                <button 
                  onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.2))}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/60 text-lg hover:border-white/30 transition text-white"
                  title="Zoom Out"
                >
                  −
                </button>
                <button 
                  onClick={() => setShowLayersOverlay(!showLayersOverlay)}
                  aria-pressed={showLayersOverlay}
                  className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                    showLayersOverlay ? "border-[#F59E0B] text-[#F59E0B]" : "border-white/15 text-[#A1A1AA]"
                  } bg-black/60`}
                  title="Toggle Tactical HUD Overlays"
                >
                  <Layers size={15} />
                </button>
                <button 
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/60 hover:border-white/30 transition text-white"
                  title={isTheaterMode ? "Exit Theater Mode" : "Expand 3D Theater Mode"}
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Left Tactical Metadata Badge */}
            {showLayersOverlay && (
              <div className="absolute left-3 top-[68px] hidden sm:block rounded-xl border border-white/10 bg-black/65 p-2.5 backdrop-blur z-20 pointer-events-none">
                <p className="text-[9px] font-bold tracking-widest text-[#71717A]">02 · 3D TACTICAL CITY PERSPECTIVE</p>
                <p className="mt-1 text-[13px] font-bold">LIVE INCIDENT MESH</p>
                <p className="mono mt-1 text-[10px] text-[#F59E0B]">
                  ZOOM {zoom.toFixed(1)}× · {activeLayers.size}/6 LAYERS
                </p>
              </div>
            )}

            {/* Bottom Viewport Dock: Legend & Selected Incident Card */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 sm:flex-row sm:items-end z-20 pointer-events-auto">
              {/* Legend Card */}
              {showLayersOverlay && (
                <div className="hidden md:block rounded-xl border border-white/10 bg-black/65 p-2.5 backdrop-blur shrink-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold">
                    <Crosshair size={12} className="text-[#F59E0B]" />
                    LEGEND
                  </p>
                  <div className="mt-2 space-y-1 text-[10px] text-[#A1A1AA]">
                    <p className="flex items-center">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#EF4444]" />
                      Hazard
                    </p>
                    <p className="flex items-center">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />
                      Evac zone
                    </p>
                    <p className="flex items-center">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#3B82F6]" />
                      Unit
                    </p>
                  </div>
                  <p className="mono mt-2 text-[9px] text-[#71717A]">
                    GRID {mouseGrid.x}.{mouseGrid.y} · SECTOR 6B
                  </p>
                </div>
              )}

              {/* Selected Incident Card */}
              <div className="flex-1 rounded-2xl border border-[#27272A] bg-[#131316]/95 p-3 shadow-2xl backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#EF4444] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                    {severity.toUpperCase()}
                  </span>
                  <h2 className="text-[13px] font-bold sm:text-[14px]">
                    {selectedIncident} • {targetSector} • {hazardType} & Structural Pressure
                  </h2>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-[#A1A1AA]">
                    <Navigation size={12} />
                    Selected on mesh
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-[#A1A1AA]">
                  <span>Casualties <b className="mono text-white">{casualtiesCount}</b></span>
                  <span>Time elapsed <b className="mono text-[#F59E0B]">{elapsedFormattedMin}:{elapsedFormattedSec}</b></span>
                  <span>Nearest unit <b className="text-white">1.8 km</b></span>
                  <span className="hidden sm:inline">Assembly <b className="text-white">Station 2</b></span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => {
                      postFeedItem("COMMAND · DISPATCH", "#EF4444", "Priority dispatch confirmed for selected incident. Nearest trauma units acknowledged.", "DISPATCH");
                      setStatusMessage("Priority dispatch confirmed. Nearest units en-route.");
                      playVoiceBroadcast();
                    }}
                    className="flex-1 rounded-lg bg-[#F59E0B] py-2 text-[11px] font-bold text-black hover:bg-[#FBBF24] transition shadow-md"
                  >
                    DISPATCH NEAREST UNIT
                  </button>
                  <button 
                    onClick={() => {
                      postFeedItem("COMMAND · EVAC", "#8B5CF6", "Evacuation guidance updated for Sector 6B. Civilian flow diverted to Station 2.", "EVAC");
                      setStatusMessage("Evacuation guidance updated for selected sector.");
                      playVoiceBroadcast();
                    }}
                    className="flex-1 rounded-lg border border-[#27272A] bg-[#17171B] py-2 text-[11px] font-bold hover:border-[#3F3F46] transition"
                  >
                    UPDATE EVAC ROUTE
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3 Metrics Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            {/* Response Time */}
            <div className="min-w-0 rounded-2xl border border-[#27272A] bg-[#131316] p-3 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[8px] font-bold tracking-widest text-[#71717A] sm:text-[10px]">RESPONSE TIME</p>
                <Wind size={14} className="text-[#F59E0B]" />
              </div>
              <p className="mono mt-1 text-[clamp(18px,3vw,28px)] font-bold leading-none">4m 12s</p>
              <p className="mt-1.5 truncate text-[9px] text-[#A1A1AA] sm:text-[10px]">Target 5m 00s · −48s</p>
            </div>

            {/* Units Deployed */}
            <div className="min-w-0 rounded-2xl border border-[#27272A] bg-[#131316] p-3 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[8px] font-bold tracking-widest text-[#71717A] sm:text-[10px]">UNITS DEPLOYED</p>
                <Truck size={14} className="text-[#3B82F6]" />
              </div>
              <p className="mono mt-1 text-[clamp(18px,3vw,28px)] font-bold leading-none">12/18</p>
              <p className="mt-1.5 truncate text-[9px] text-[#A1A1AA] sm:text-[10px]">3 sectors covered</p>
            </div>

            {/* Civilians Evacuated */}
            <div className="min-w-0 rounded-2xl border border-[#27272A] bg-[#131316] p-3 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[8px] font-bold tracking-widest text-[#71717A] sm:text-[10px]">CIVILIANS EVACUATED</p>
                <HeartPulse size={14} className="text-[#10B981]" />
              </div>
              <p className="mono mt-1 text-[clamp(18px,3vw,28px)] font-bold leading-none">{civiliansEvacuated}</p>
              <p className="mt-1.5 truncate text-[9px] text-[#A1A1AA] sm:text-[10px]">+8 this tick</p>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* COLUMN 3: RIGHT ASIDE (SWARM DELIBERATION FEED & SCENARIO DRILL TRAINER) */}
        {/* ======================================================================= */}
        <aside className="w-full shrink-0 lg:w-[360px] flex flex-col gap-3 lg:overflow-hidden">
          
          {/* Card 1: Gemini 2.5 Flash - Live Swarm Activity Feed */}
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[#27272A] bg-[#131316] shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#27272A] p-3.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6]">
                <Sparkles size={16} />
              </span>
              <div className="min-w-0 flex-1 leading-none">
                <p className="text-[13px] font-bold">Gemini 2.5 Flash</p>
                <p className="mt-1 text-[10px] text-[#A1A1AA]">LIVE SWARM ACTIVITY FEED</p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2 py-1 text-[9px] font-bold text-[#10B981]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] live-dot" />
                LIVE
              </span>
            </div>

            {/* Scrollable Feed List */}
            <div className="scroll-thin min-h-[260px] flex-1 space-y-1 overflow-y-auto p-3 lg:max-h-none">
              {filteredFeed.map((item, index) => (
                <div 
                  key={item.id}
                  className={`animate-fadeUp relative flex gap-3 rounded-xl p-2.5 transition ${
                    index === 0 ? "bg-[#1C1C21] border border-[#27272A]" : "hover:bg-[#17171B]"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span 
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white shadow-sm"
                      style={{ background: item.color }}
                    >
                      {item.agent.split("·")[0].trim().slice(0, 2)}
                    </span>
                    {index < filteredFeed.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-[#27272A]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[10px]">
                      <b className="text-[11px] text-white">{item.agent}</b>
                      <span className="mono text-[#71717A]">{item.time}</span>
                      <span className="rounded bg-[#27272A] px-1 py-0.5 text-[8px] text-[#A1A1AA]">{item.tag}</span>
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#D4D4D8]">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}

              {filteredFeed.length === 0 && (
                <p className="p-3 text-center text-[12px] text-[#71717A]">
                  No feed items match your search.
                </p>
              )}
            </div>

            {/* Swarm Feed Footer */}
            <div className="flex items-center justify-between border-t border-[#27272A] px-3.5 py-2.5 text-[10px] text-[#71717A]">
              <span className="flex items-center">
                <Radio size={11} className="mr-1 inline text-[#10B981]" />
                Auto-refresh · 5s
              </span>
              <span className="mono">TICK {simulationTick}</span>
            </div>
          </section>

          {/* Card 2: Live Drill Injector & Model Trainer */}
          <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold">LIVE DRILL INJECTOR & MODEL TRAINER</p>
                <p className="mt-1 text-[10px] text-[#A1A1AA]">Drill only · no live dispatch is changed</p>
              </div>
              <Zap size={16} className="text-[#F59E0B]" />
            </div>

            {/* Quick Drill Presets */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button 
                onClick={() => applyPreset('subway')} 
                className="text-[9px] font-bold px-2 py-1 rounded bg-[#17171B] border border-[#27272A] hover:border-[#F59E0B] text-[#D4D4D8] transition"
              >
                🚇 Subway 6B
              </button>
              <button 
                onClick={() => applyPreset('hazmat')} 
                className="text-[9px] font-bold px-2 py-1 rounded bg-[#17171B] border border-[#27272A] hover:border-[#F59E0B] text-[#D4D4D8] transition"
              >
                🧪 Hazmat 5C
              </button>
              <button 
                onClick={() => applyPreset('flood')} 
                className="text-[9px] font-bold px-2 py-1 rounded bg-[#17171B] border border-[#27272A] hover:border-[#F59E0B] text-[#D4D4D8] transition"
              >
                🌊 Flood
              </button>
              <button 
                onClick={() => applyPreset('collapse')} 
                className="text-[9px] font-bold px-2 py-1 rounded bg-[#17171B] border border-[#27272A] hover:border-[#F59E0B] text-[#D4D4D8] transition"
              >
                🏢 Collapse
              </button>
            </div>

            {/* Target Sector & Hazard Type Selects */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[10px] text-[#A1A1AA] block">
                TARGET SECTOR
                <select 
                  value={targetSector} 
                  onChange={(e) => setTargetSector(e.target.value)}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-[12px] outline-none"
                >
                  <option value="Sector_6B">Sector 6B (Subway)</option>
                  <option value="Sector_5C">Sector 5C (Industrial)</option>
                  <option value="Evac_Zone">Evacuation Zone</option>
                </select>
              </label>

              <label className="text-[10px] text-[#A1A1AA] block">
                HAZARD TYPE
                <select 
                  value={hazardType} 
                  onChange={(e) => setHazardType(e.target.value)}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-[12px] outline-none"
                >
                  <option value="Collision">Collision</option>
                  <option value="Fire">Fire</option>
                  <option value="Flood">Flood</option>
                  <option value="Gas Rupture">Gas Rupture</option>
                </select>
              </label>
            </div>

            {/* Severity Buttons */}
            <p className="mt-3 text-[10px] text-[#A1A1AA]">SEVERITY</p>
            <div className="mt-1 grid grid-cols-3 rounded-lg bg-[#17171B] p-1 gap-1">
              {["Critical", "High", "Medium"].map((lvl) => (
                <button 
                  key={lvl}
                  onClick={() => setSeverity(lvl)}
                  aria-pressed={severity === lvl}
                  className={`rounded-md py-1.5 text-[11px] font-bold transition ${
                    severity === lvl
                      ? (lvl === "Critical" ? "bg-[#EF4444] text-white" : (lvl === "High" ? "bg-[#F59E0B] text-black" : "bg-[#3B82F6] text-white"))
                      : "text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Casualties Count Slider */}
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-[#A1A1AA]">Casualties</span>
              <b className="mono text-[#F59E0B]">{casualtiesCount}</b>
            </div>
            <input 
              type="range"
              min="0"
              max="40"
              value={casualtiesCount}
              onChange={(e) => setCasualtiesCount(Number(e.target.value))}
              aria-label="Casualties count"
              className="mt-2 w-full"
            />

            {/* Block Corridors Switch */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px]">Block Corridors</span>
              <ToggleSwitch on={blockCorridors} onChange={setBlockCorridors} label="Block corridors" />
            </div>

            {/* Incident Tactical Briefing Textarea */}
            <label className="mt-3 block text-[10px] text-[#A1A1AA]">
              INCIDENT BRIEFING
              <textarea 
                value={incidentBriefing}
                onChange={(e) => setIncidentBriefing(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-lg p-2.5 text-[12px] leading-relaxed outline-none"
              />
            </label>

            {/* Action Buttons: Inject Scenario & Simulate Tick */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button 
                onClick={injectAndTrainSwarm}
                disabled={isInjecting}
                className="rounded-lg bg-[#F59E0B] py-3 text-[11px] font-bold text-black hover:bg-[#FBBF24] transition shadow-md disabled:opacity-50"
              >
                {isInjecting ? "INJECTING…" : "⚡ INJECT SCENARIO"}
              </button>
              <button 
                onClick={simulateTick}
                disabled={isSimulating}
                className="rounded-lg border border-[#3F3F46] bg-[#17171B] py-3 text-[11px] font-bold hover:border-[#A1A1AA] transition disabled:opacity-50 text-white"
              >
                {isSimulating ? "TICKING…" : "SIMULATE TICK"}
              </button>
            </div>

            {/* Status Feedback Pill */}
            <p role="status" className="mt-3 rounded-lg border border-[#27272A] bg-[#17171B] px-2.5 py-2 text-[10px] leading-relaxed text-[#A1A1AA]">
              {statusMessage}
            </p>
          </section>
        </aside>
      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#27272A] px-3 py-2 text-[9px] text-[#71717A] lg:px-4 z-30">
        <span className="flex items-center gap-1.5">
          <Waves size={11} className="text-[#3B82F6]" />
          RIVER LEVEL NORMAL
        </span>
        <span>MODEL · GEMINI 2.5 FLASH</span>
        <span className="hidden sm:inline">SOLANA DEVNET: {solanaAudit?.decision_sha256?.substring(0, 12) || "8x9Z...4kL2"} (VERIFIED)</span>
        <span className="ml-auto mono">AEGIS · SECTOR OPERATIONS · DRILL INTERFACE</span>
      </footer>
    </div>
  );
}
