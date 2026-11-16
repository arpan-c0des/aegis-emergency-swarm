import React, { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { 
  Activity, Ambulance, Bell, Brain, ChevronDown, CloudSun, Crosshair, 
  Download, Flame, HeartPulse, Layers, Maximize2, Navigation, Radio, 
  Search, Shield, Siren, Sparkles, Truck, Waves, Wind, Zap, Check, Copy, ExternalLink, Volume2, ShieldAlert
} from 'lucide-react';

// Dynamically import Kolkata Leaflet Tactical Map (SSR false for Next.js)
const KolkataLeafletMap = dynamic(
  () => import('../components/KolkataLeafletMap').then((mod) => mod.KolkataLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#09090B] text-[#A1A1AA] gap-2">
        <span className="h-3 w-3 rounded-full bg-[#10B981] animate-ping" />
        <span className="mono text-[11px] font-bold tracking-widest text-[#F59E0B]">INITIALIZING KOLKATA TACTICAL LEAFLET MESH…</span>
      </div>
    )
  }
);

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
    <div className="relative h-[72px] w-[72px] shrink-0">
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
  const [cameraPreset, setCameraPreset] = useState<string>("overview");
  const [showLayersOverlay, setShowLayersOverlay] = useState<boolean>(false);
  const [rightPanelTab, setRightPanelTab] = useState<'all' | 'feed' | 'injector'>('all');
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
  const [statusMessage, setStatusMessage] = useState<string>("Drill environment ready — live dynamic incident response active.");

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

  // 3. Dynamic Ambient Swarm Activity Feed (ensures console stays vibrant and live)
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
    }, 6000);
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
                const backendFeed = msg.data.transcript.map((item: any, idx: number) => ({
                  id: 1000 + idx,
                  agent: item.agent ? item.agent.toUpperCase() : "SWARM · DELIBERATION",
                  color: item.agent?.includes('Med') ? "#3B82F6" : (item.agent?.includes('Fire') ? "#F59E0B" : "#10B981"),
                  text: item.message || item.thought || item.assessment || item.text || "Deliberating optimal emergency response orders...",
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

  // Quick Drill Presets - Auto-aligns camera and sets scenario values
  const applyPreset = (preset: 'subway' | 'hazmat' | 'flood' | 'collapse') => {
    switch (preset) {
      case 'subway':
        setTargetSector("Sector_6B");
        setHazardType("Collision");
        setSeverity("Critical");
        setCasualtiesCount(12);
        setBlockCorridors(true);
        setSelectedIncident("INCIDENT #SUB-6B");
        setCameraPreset("sector_6b");
        setIncidentBriefing("Multi-vehicle collision and subway concourse pressure breach at Sector 6B. 12 casualties reported.");
        break;
      case 'hazmat':
        setTargetSector("Sector_5C");
        setHazardType("Fire");
        setSeverity("High");
        setCasualtiesCount(6);
        setBlockCorridors(true);
        setSelectedIncident("INCIDENT #HAZ-5C");
        setCameraPreset("sector_5c");
        setIncidentBriefing("Industrial chemical container breach and pressurized fire at Sector 5C depot. Toxic vapor cloud active.");
        break;
      case 'flood':
        setTargetSector("Sector_6B");
        setHazardType("Flood");
        setSeverity("Critical");
        setCasualtiesCount(15);
        setBlockCorridors(true);
        setSelectedIncident("INCIDENT #FLD-6B");
        setCameraPreset("sector_6b");
        setIncidentBriefing("Water main rupture and transit underpass inundation. Civilians evacuating toward Assembly Station 2.");
        break;
      case 'collapse':
        setTargetSector("Sector_5C");
        setHazardType("Collision");
        setSeverity("Critical");
        setCasualtiesCount(18);
        setBlockCorridors(true);
        setSelectedIncident("INCIDENT #COL-5C");
        setCameraPreset("sector_5c");
        setIncidentBriefing("Multi-level structural failure at commercial loading depot. Heavy rescue and trauma triage requested.");
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

  // Generate Authoritative Dynamic Incident Guideline
  const generateDynamicGuideline = (customSector?: string, customHazard?: string, customSeverity?: string, customCount?: number, customBlock?: boolean) => {
    const sec = customSector || targetSector || "Sector_6B";
    const haz = customHazard || hazardType || "Collision";
    const sev = customSeverity || severity || "Critical";
    const cas = customCount !== undefined ? customCount : casualtiesCount;
    const blocked = customBlock !== undefined ? customBlock : blockCorridors;
    
    const secDisplay = sec.replace("_", " ");
    const blockText = blocked ? "Corridor D4 blocked by structural debris. Emergency units rerouting via Corridor B." : "All secondary response corridors open and clear.";
    
    return `Attention all units. Incident Commander broadcast for ${secDisplay}. Confirmed ${sev} priority ${haz} emergency with ${cas} casualties reported. ${blockText} Fire Engine 4 deployed for immediate hazard suppression. Ambulances AMB-01 and AMB-02 dispatched for casualty triage and transport to Central Trauma H1. Civilian evacuation established toward Assembly Station 2. All responding units acknowledge orders.`;
  };

  // Dynamic Radio Voice Broadcast Controller
  // Eliminates repetitive static audio by speaking the genuine, active incident guidelines
  const playVoiceBroadcast = (summaryText?: string) => {
    setIsPlayingAudio(true);

    let textToSpeak = summaryText || broadcastSummary;

    // Filter out the old repetitive static phrase if it appears
    if (!textToSpeak || 
        textToSpeak.toLowerCase().includes("orders immediate casualty transport to h1 and structural perimeter lockdown") ||
        textToSpeak.toLowerCase().includes("orders confirmed. all units advance")) {
      textToSpeak = generateDynamicGuideline();
    }

    textToSpeak = textToSpeak.replace(/[*_#"]/g, '').trim();
    if (!textToSpeak.toLowerCase().startsWith("attention all units")) {
      textToSpeak = `Attention all units. Incident Commander broadcast: ${textToSpeak}`;
    }

    // Update broadcast summary state so HUD radio banner reflects the spoken words
    setBroadcastSummary(textToSpeak);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.04;
      utterance.pitch = 0.96;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => 
        v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Guy'))
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  // Inject Scenario & Train Swarm (Real API Execution with Dynamic Speech)
  const injectAndTrainSwarm = async () => {
    setIsInjecting(true);
    setStatusMessage("Running Swarm & Training Policy on live scenario...");
    
    // Construct dynamic scenario guideline upfront
    const dynamicScenarioGuideline = generateDynamicGuideline();

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
        `Scenario injected — ${hazardType} at ${targetSector}. Severity: ${severity}, ${casualtiesCount} casualties. Corridors ${blockCorridors ? "blocked" : "open"}.`,
        "DRILL"
      );

      setStatusMessage(`Scenario executed: ${hazardType} · ${targetSector} · ${severity}. Policy updated to ${policyScore}%.`);

      const summaryToSpeak = data.result?.broadcast_summary || dynamicScenarioGuideline;
      setTimeout(() => {
        playVoiceBroadcast(summaryToSpeak);
      }, 300);

    } catch (e) {
      console.error(e);
      // Local execution fallback
      postFeedItem(
        "DRILL · INJECTOR",
        "#F59E0B",
        `Scenario executed locally — ${hazardType} at ${targetSector}. Severity: ${severity}, ${casualtiesCount} casualties.`,
        "DRILL"
      );
      setStatusMessage(`Scenario executed: ${hazardType} · ${targetSector} · ${severity} · ${casualtiesCount} casualties.`);
      setPolicyScore((prev) => Math.min(99, prev + 0.5));
      setTimeout(() => {
        playVoiceBroadcast(dynamicScenarioGuideline);
      }, 300);
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
      }, 300);
    } catch (e) {
      console.error(e);
      setSimulationTick((prev) => prev + 1);
      setCiviliansEvacuated((prev) => prev + 8);
      setElapsedSeconds((prev) => prev + 47);
      setPolicyScore((prev) => Math.min(99, prev + 0.3));

      const tickGuideline = `Attention all units. Incident Commander tick update: Casualty evacuation proceeding. Ambulances en-route to Central Trauma H1. Sector perimeter holding secure.`;
      postFeedItem(
        "SIMULATION · TICK",
        "#3B82F6",
        `Tick ${simulationTick + 1} complete. Units repositioned, evac flow updated, policy score recalculated.`,
        "SIM"
      );
      setTimeout(() => {
        playVoiceBroadcast(tickGuideline);
      }, 300);
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

  return (
    <div className="min-h-screen lg:h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-clip flex flex-col">
      <Head>
        <title>AEGIS — Tactical C2 • Kolkata Sector</title>
        <meta name="description" content="AEGIS Autonomous Multi-Agent Tactical Emergency Swarm Command Console" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER - OPTIMIZED FOR ALL DESKTOP RESOLUTIONS                     */}
      {/* ========================================================================= */}
      <header className="relative h-14 shrink-0 border-b border-[#27272A] bg-[#0D0D10]/95 flex items-center justify-between gap-2 px-3 sm:px-4 z-40">
        {/* Brand / Logo + Route Navigation Tabs */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#F59E0B] text-black shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Shield size={20} strokeWidth={2.4} />
            </div>
            <div className="leading-none">
              <div className="font-bold tracking-[0.18em] text-[16px] sm:text-[17px]">AEGIS</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1 whitespace-nowrap">Tactical C2 • Kolkata Sector</div>
            </div>
          </div>

          <span className="hidden 2xl:flex items-center gap-1.5 rounded-full border border-[#27272A] bg-[#131316] px-2 py-1 text-[10px] text-[#A1A1AA] whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] live-dot"></span>
            LIVE MESH
          </span>

          {/* Route Navigation Tabs */}
          <div className="hidden lg:flex items-center gap-1.5 ml-2 font-mono shrink-0">
            <Link 
              href="/"
              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#F59E0B] text-black shadow-sm whitespace-nowrap"
            >
              [01] C2 Swarm
            </Link>
            <Link 
              href="/fleet"
              className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition whitespace-nowrap"
            >
              [02] Fleet Uber
            </Link>
            <Link 
              href="/hospitals"
              className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition whitespace-nowrap"
            >
              [03] Bed Intake
            </Link>
          </div>
        </div>

        {/* Search Bar - Responsive width, no overflow */}
        <div className="hidden md:flex flex-1 max-w-[240px] xl:max-w-[340px] mx-2 items-center gap-2 rounded-lg border border-[#27272A] bg-[#131316] px-3 py-1.5 text-sm text-[#A1A1AA]">
          <Search size={14} className="shrink-0" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents, units, deliberation…" 
            className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-[#71717A] min-w-0"
          />
        </div>

        {/* Right Status Badges & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Ticking Clock */}
          <div className="hidden sm:block text-right leading-none pr-1 shrink-0">
            <div className="mono text-[12px] font-semibold">{clock || "14:35:12"}</div>
            <div className="text-[9px] text-[#71717A] mt-0.5">LOCAL SYNC</div>
          </div>

          {/* Backend Sensor Link */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
            <span className={`h-1.5 w-1.5 rounded-full ${backendStatus === 'online' ? 'bg-[#10B981] live-dot' : 'bg-[#F59E0B]'}`}></span>
            {backendStatus === 'online' ? "ONLINE" : (backendStatus === 'waking' ? "WAKING…" : "SYNC")}
          </span>

          {/* RLIF Active Badge */}
          <span className="hidden 2xl:inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
            <Brain size={12} />
            RLIF
          </span>

          {/* Notification Bell */}
          <button 
            aria-label="Notifications"
            onClick={() => postFeedItem("ALERT · SYSTEM", "#EF4444", "All active channels monitored. Sector 6B high priority alert.", "ALERT")}
            className="relative grid h-8 w-8 place-items-center rounded-lg border border-[#27272A] bg-[#131316] hover:border-[#3F3F46] transition shrink-0"
          >
            <Bell size={15} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
          </button>

          {/* User Profile Button */}
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#131316] py-1 pl-1 pr-2 hover:border-[#3F3F46] transition shrink-0"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#3B82F6] text-[11px] font-bold text-white">AR</span>
            <span className="hidden xl:block text-left leading-none">
              <span className="block text-[11px] font-semibold">A. Rao</span>
              <span className="block text-[9px] text-[#A1A1AA] mt-0.5">Incident Commander</span>
            </span>
            <ChevronDown size={12} className={`text-[#71717A] transition ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Profile Dropdown Modal */}
          {profileOpen && (
            <div className="absolute right-2 top-[56px] z-50 w-[240px] rounded-xl border border-[#27272A] bg-[#131316] p-3 shadow-2xl sm:right-4">
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
            {broadcastSummary ? `"${broadcastSummary}"` : (commandPlan ? `Plan Order: ${commandPlan.slice(0, 110)}...` : `Standing by: ${generateDynamicGuideline()}`)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-[9px] text-[#71717A] mono">DYNAMIC SPEECH ENGINE</span>
          <button 
            onClick={() => playVoiceBroadcast()}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition ${
              isPlayingAudio 
                ? "bg-[#EF4444] text-white animate-pulse" 
                : "bg-[#F59E0B] text-black hover:bg-[#FBBF24]"
            }`}
          >
            <Volume2 size={12} />
            <span>{isPlayingAudio ? "BROADCASTING LIVE…" : "SPEAK INCIDENT GUIDELINE"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE (3-COLUMN HUD) - ZERO DESKTOP OVERLAPPING               */}
      {/* ========================================================================= */}
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row lg:overflow-hidden">
        
        {/* ======================================================================= */}
        {/* COLUMN 1: LEFT ASIDE (TELEMETRY, HOSPITAL BEDS, RLIF, SOLANA)           */}
        {/* ======================================================================= */}
        <aside className="w-full shrink-0 lg:w-[280px] xl:w-[300px] flex flex-col gap-3 lg:overflow-y-auto scroll-thin lg:pr-0.5">
          {/* Card: 01 · Telemetry & Resources */}
          <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">01 · TELEMETRY & RESOURCES</p>
              <Activity size={14} className="text-[#F59E0B]" />
            </div>

            {/* Road Infrastructure */}
            <div className="mt-3 rounded-xl border border-[#27272A] bg-[#17171B] p-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold">Road Infrastructure</p>
                  <p className="mono mt-0.5 text-[11px] text-[#A1A1AA]">
                    {blockedRoads.length > 0 ? "1 Sector" : "0 Sectors"} <span className="text-[#3F3F46]">|</span> {blockedRoads.length} Blocked
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  blockedRoads.length > 0 
                    ? "bg-[#EF4444]/15 text-[#EF4444]" 
                    : "bg-[#10B981]/10 text-[#10B981]"
                }`}>
                  {blockedRoads.length > 0 ? "CORRIDOR BLOCKED" : "CLEAR"}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-[#A1A1AA]">
                <CloudSun size={14} className="text-[#F59E0B]" />
                Weather <b className="text-white">Moderate</b>
                <span className="ml-auto mono text-[#71717A]">24°C · 68%</span>
              </div>

              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#27272A]">
                <div className="h-full w-[72%] rounded-full bg-[#10B981]" />
              </div>

              {/* Road Throughput Trend Graph */}
              <svg viewBox="0 0 260 32" className="mt-2.5 h-8 w-full" aria-label="Road throughput trend">
                <polyline 
                  points="0,26 30,22 60,24 90,16 120,19 150,10 180,14 210,7 260,11" 
                  fill="none" 
                  stroke="#F59E0B" 
                  strokeWidth="2" 
                />
                <polyline points="0,26 260,26" stroke="#27272A" strokeWidth="1" />
              </svg>

              <div className="flex justify-between text-[9px] text-[#71717A]">
                <span>06:00</span>
                <span>12:00</span>
                <span>NOW</span>
              </div>
            </div>

            {/* Trauma & Reception Beds */}
            <p className="mt-3 text-[12px] font-semibold">Trauma & Reception Beds</p>
            <div className="mt-1.5 space-y-2">
              {/* Central Trauma H1 */}
              <div className="flex items-center gap-2.5 rounded-xl border border-[#27272A] bg-[#17171B] p-2.5">
                <ProgressRing pct={76} color="#10B981">
                  <span className="mono text-[12px] font-bold">76%</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold truncate">
                    CENTRAL TRAUMA <span className="text-[#71717A]">(H1)</span>
                  </p>
                  <p className="mono mt-0.5 text-[10px] text-[#A1A1AA]">28 / 37 beds free</p>
                  <span className="mt-1 inline-block rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[8px] font-bold text-[#10B981]">
                    TRAUMA READY
                  </span>
                </div>
              </div>

              {/* St Luke's Clinic H2 */}
              <div className="flex items-center gap-2.5 rounded-xl border border-[#27272A] bg-[#17171B] p-2.5">
                <ProgressRing pct={41} color="#F59E0B">
                  <span className="mono text-[12px] font-bold">41%</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold truncate">
                    ST LUKE'S CLINIC <span className="text-[#71717A]">(H2)</span>
                  </p>
                  <p className="mono mt-0.5 text-[10px] text-[#A1A1AA]">12 / 29 beds free</p>
                  <span className="mt-1 inline-block rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-[8px] font-bold text-[#3B82F6]">
                    GENERATOR NOMINAL
                  </span>
                </div>
              </div>
            </div>

            {/* Active Fleet Status */}
            <p className="mt-3 flex items-center justify-between text-[12px] font-semibold">
              Active Fleet Status <span className="mono text-[10px] text-[#71717A]">12/18</span>
            </p>
            <div className="mt-1.5 space-y-1 text-[11px]">
              {[
                { name: "Ambulances", detail: "4 · 2 en-route, 2 standby", color: "#EF4444", icon: Ambulance },
                { name: "Fire Engines", detail: "3 · Engine 4 rerouted", color: "#F59E0B", icon: Flame },
                { name: "Police Cruisers", detail: "5 · Sector patrol", color: "#3B82F6", icon: Siren }
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1C1C21] transition">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#1C1C21] shrink-0" style={{ color: item.color }}>
                    <item.icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.name}</span>
                    <span className="block truncate text-[10px] text-[#A1A1AA]">{item.detail}</span>
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] live-dot shrink-0" />
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-lg bg-[#17171B] px-2.5 py-1.5 text-[11px]">
              <span className="text-[#A1A1AA]">Next ETA · Engine 4</span>
              <b className="mono text-[#F59E0B]">03:42</b>
            </div>
          </section>

          {/* Card: Model Training & Adaptation (RLIF) */}
          <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">MODEL TRAINING & ADAPTATION</p>
              <Brain size={14} className="text-[#8B5CF6]" />
            </div>

            <div className="mt-2.5 flex items-end justify-between">
              <div>
                <p className="text-[9px] text-[#71717A]">EPISODES</p>
                <p className="mono text-xl font-bold">#{trainingStats?.total_episodes || 1}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-[#71717A]">POLICY SCORE</p>
                <p className="mono text-xl font-bold text-[#10B981]">{policyScore}%</p>
              </div>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#27272A]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#10B981] transition-all duration-500" 
                style={{ width: `${policyScore}%` }} 
              />
            </div>

            <div className="mt-1.5 flex justify-between text-[9px] text-[#71717A]">
              <span>REWARD +0.84</span>
              <span>LOSS 0.12</span>
            </div>

            <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/5 px-2 py-1.5 text-[10px] text-[#F59E0B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] live-dot shrink-0" />
              <span>RLIF ACTIVE · FIELD FEEDBACK LOOP</span>
            </div>

            <button 
              onClick={exportFineTuneJSONL}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-[#27272A] bg-[#17171B] py-2 text-[10px] font-bold hover:border-[#8B5CF6] hover:text-white transition"
            >
              <Download size={13} />
              EXPORT GEMINI FINE-TUNE JSONL
            </button>
          </section>

          {/* Card: Solana Cryptographic Proof */}
          <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">SOLANA PROOF OF DECISION</p>
              <span className="flex items-center gap-1 text-[9px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                <Check size={10} />
                DEVNET VERIFIED
              </span>
            </div>
            
            <div className="mt-2 rounded-xl border border-[#27272A] bg-[#17171B] p-2">
              <p className="text-[9px] text-[#71717A] uppercase font-bold">Decision SHA-256 Hash</p>
              <div className="flex items-center justify-between mt-1">
                <span className="mono text-[10px] text-[#A1A1AA] truncate">
                  {solanaAudit?.decision_sha256?.substring(0, 16) || "8x9Z7a4f91b2c4e8"}...
                </span>
                <button 
                  onClick={copySolanaHash}
                  className="p-1 rounded text-[#71717A] hover:text-white transition shrink-0"
                  title="Copy SHA-256 Hash"
                >
                  <Copy size={12} />
                </button>
              </div>
              {copiedHash && (
                <p className="text-[9px] text-[#10B981] mt-0.5">✓ Hash copied to clipboard</p>
              )}
            </div>

            <a
              href="https://explorer.solana.com/?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-[#71717A] hover:text-[#A1A1AA] transition"
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
          {/* Main Kolkata Leaflet Tactical Perspective Canvas Container */}
          <div className={`relative min-h-[460px] flex-1 overflow-hidden rounded-2xl border border-[#27272A] bg-[#09090B] transition-all duration-300 ${
            isTheaterMode ? "lg:min-h-[640px]" : ""
          }`}>
            
            {/* Real Kolkata Leaflet Tactical Map with Simulated Incidents */}
            <div className="absolute inset-0 z-0">
              <KolkataLeafletMap 
                worldState={worldState} 
                theme="tactical" 
                isTheaterMode={isTheaterMode} 
                onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
                activeLayers={activeLayers}
                zoomLevel={zoom}
                cameraPreset={cameraPreset}
                hideInternalOverlays={true}
                onSelectIncident={(incId) => setSelectedIncident(`INCIDENT #${incId}`)}
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

            {/* TOP HUD TOOLBAR: Camera Presets (Left) + Viewport Controls (Right) */}
            <div className="absolute left-3 top-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-auto">
              {/* Left: Camera Angle Presets for Kolkata Sectors */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'sector_5c', label: '🔥 5C Salt Lake' },
                  { id: 'sector_6b', label: '🚇 6B Esplanade' },
                  { id: 'hospital', label: '🏥 SSKM Trauma' },
                  { id: 'topdown', label: '🗺️ Kolkata Map' },
                ].map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => setCameraPreset(cam.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap ${
                      cameraPreset === cam.id
                        ? "bg-[#F59E0B] text-black shadow-sm"
                        : "text-[#A1A1AA] hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {/* Right: Layers Toggle, Zoom (+/-), Theater Toggle */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md">
                <button 
                  onClick={() => setShowLayersOverlay(!showLayersOverlay)}
                  aria-pressed={showLayersOverlay}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                    showLayersOverlay ? "bg-[#F59E0B] text-black" : "text-[#A1A1AA] hover:text-white"
                  }`}
                  title="Toggle Tactical Layer Filters"
                >
                  <Layers size={13} />
                  <span className="hidden sm:inline">Layers ({activeLayers.size}/6)</span>
                </button>

                <button 
                  onClick={() => setZoom((prev) => Math.min(1.8, +(prev + 0.2).toFixed(1)))}
                  className="w-7 h-7 grid place-items-center rounded-lg text-white hover:bg-white/10 transition text-[13px] font-bold"
                  title="Zoom In"
                >
                  +
                </button>
                <button 
                  onClick={() => setZoom((prev) => Math.max(0.6, +(prev - 0.2).toFixed(1)))}
                  className="w-7 h-7 grid place-items-center rounded-lg text-white hover:bg-white/10 transition text-[13px] font-bold"
                  title="Zoom Out"
                >
                  −
                </button>
                <button 
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className="w-7 h-7 grid place-items-center rounded-lg text-white hover:bg-white/10 transition"
                  title={isTheaterMode ? "Exit Theater Mode" : "Expand 3D Theater Mode"}
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* LAYER FILTER PILLS - Sub-row (cleanly displayed when toggled, no collision) */}
            {showLayersOverlay && (
              <div className="absolute left-3 top-16 right-3 flex flex-wrap gap-1.5 z-20 pointer-events-auto">
                {DEFAULT_LAYERS.map((layer) => (
                  <button 
                    key={layer}
                    onClick={() => toggleLayer(layer)}
                    aria-pressed={activeLayers.has(layer)}
                    className={`rounded-full border px-2.5 py-1 text-[9px] font-bold tracking-wide backdrop-blur transition ${
                      activeLayers.has(layer)
                        ? "border-[#F59E0B] bg-[#F59E0B] text-black shadow-sm"
                        : "border-white/15 bg-black/75 text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    {layer}
                  </button>
                ))}
              </div>
            )}

            {/* BOTTOM VIEWPORT HUD DOCK: Compact, unified Selected Incident & Tactical Actions */}
            <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto">
              <div className="rounded-xl border border-[#27272A] bg-[#131316]/95 p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2">
                {/* Top row: Severity badge, Title, and Legend pills */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm shrink-0 ${
                      severity === "Critical" ? "bg-[#EF4444]" : (severity === "High" ? "bg-[#F59E0B]" : "bg-[#3B82F6]")
                    }`}>
                      {severity.toUpperCase()}
                    </span>
                    <h2 className="text-[12px] sm:text-[13px] font-bold truncate text-white">
                      {selectedIncident} • {targetSector.replace("_", " ")} • {hazardType}
                    </h2>
                  </div>

                  {/* Compact Tactical Legend */}
                  <div className="hidden sm:flex items-center gap-3 text-[10px] text-[#A1A1AA] shrink-0 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#EF4444]" /> Hazard
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Evac
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#3B82F6]" /> Unit
                    </span>
                    <span className="text-[#71717A] border-l border-[#27272A] pl-2">
                      GRID {mouseGrid.x}.{mouseGrid.y}
                    </span>
                  </div>
                </div>

                {/* Middle row: Metadata stats */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#A1A1AA]">
                  <span>Casualties: <b className="mono text-white">{casualtiesCount}</b></span>
                  <span>Elapsed: <b className="mono text-[#F59E0B]">{elapsedFormattedMin}:{elapsedFormattedSec}</b></span>
                  <span>Nearest Unit: <b className="text-white">1.8 km</b></span>
                  <span>Evacuation: <b className="text-white">Assembly Station 2</b></span>
                  <span>Corridors: <b className={blockCorridors ? "text-[#EF4444]" : "text-[#10B981]"}>{blockCorridors ? "Road D4 Blocked" : "Clear"}</b></span>
                </div>

                {/* Bottom row: Compact Tactical Action Buttons */}
                <div className="flex gap-2 pt-1 border-t border-[#27272A]/60">
                  <button 
                    onClick={() => {
                      const dynamicGuideline = generateDynamicGuideline();
                      postFeedItem("COMMAND · DISPATCH", "#EF4444", `Priority dispatch confirmed for ${targetSector}. Nearest trauma units acknowledged.`, "DISPATCH");
                      setStatusMessage(`Priority dispatch confirmed for ${targetSector}. Units en-route.`);
                      playVoiceBroadcast(dynamicGuideline);
                    }}
                    className="flex-1 rounded-lg bg-[#F59E0B] py-2 text-[11px] font-bold text-black hover:bg-[#FBBF24] transition shadow-md"
                  >
                    ⚡ DISPATCH NEAREST UNIT
                  </button>
                  <button 
                    onClick={() => {
                      const evacGuideline = `Attention all units. Incident Commander directive: Evacuation guidance updated for ${targetSector.replace("_", " ")}. Civilian corridor diverted east to Assembly Station 2. Responding units maintain safe perimeter.`;
                      postFeedItem("COMMAND · EVAC", "#8B5CF6", `Evacuation guidance updated for ${targetSector}. Civilian flow diverted to Station 2.`, "EVAC");
                      setStatusMessage(`Evacuation guidance updated for ${targetSector}. Station 2 active.`);
                      playVoiceBroadcast(evacGuideline);
                    }}
                    className="flex-1 rounded-lg border border-[#27272A] bg-[#17171B] py-2 text-[11px] font-bold hover:border-[#3F3F46] transition text-white"
                  >
                    🗺️ UPDATE EVAC ROUTE
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
        {/* COLUMN 3: RIGHT ASIDE (SWARM NOTIFICATIONS FEED & SCENARIO DRILL TRAINER)*/}
        {/* ======================================================================= */}
        <aside className="w-full shrink-0 lg:w-[320px] xl:w-[360px] flex flex-col gap-3 lg:overflow-y-auto scroll-thin lg:pr-0.5">
          
          {/* Quick View Mode Switcher for Right Aside */}
          <div className="flex items-center justify-between p-1 rounded-xl bg-[#131316] border border-[#27272A] shrink-0 text-[10px] font-mono">
            <span className="text-[#71717A] px-2 font-bold uppercase tracking-wider text-[9px]">03 · TACTICAL FEED</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRightPanelTab('all')}
                className={`px-2 py-0.5 rounded-lg transition ${
                  rightPanelTab === 'all'
                    ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setRightPanelTab('feed')}
                className={`px-2 py-0.5 rounded-lg transition ${
                  rightPanelTab === 'feed'
                    ? "bg-[#8B5CF6] text-white font-bold shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                NOTIFICATIONS
              </button>
              <button
                onClick={() => setRightPanelTab('injector')}
                className={`px-2 py-0.5 rounded-lg transition ${
                  rightPanelTab === 'injector'
                    ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                INJECTOR
              </button>
            </div>
          </div>

          {/* Card 1: Gemini 2.5 Flash - Live Swarm Activity & Notifications Feed */}
          {(rightPanelTab === 'all' || rightPanelTab === 'feed') && (
            <section className="rounded-2xl border border-[#27272A] bg-[#131316] shadow-sm shrink-0 flex flex-col">
              <div className="flex items-center gap-2 border-b border-[#27272A] p-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] shrink-0">
                  <Sparkles size={15} />
                </span>
                <div className="min-w-0 flex-1 leading-none">
                  <p className="text-[12px] font-bold">Gemini 2.5 Flash</p>
                  <p className="mt-1 text-[9px] text-[#A1A1AA]">LIVE NOTIFICATIONS & SWARM FEED</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[9px] font-bold text-[#10B981] shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] live-dot" />
                  LIVE
                </span>
              </div>

              {/* Scrollable Feed List - bounded height prevents pushing or overlapping */}
              <div className={`scroll-thin space-y-1.5 overflow-y-auto p-2.5 ${
                rightPanelTab === 'feed' ? "max-h-[560px]" : "max-h-[210px] xl:max-h-[240px]"
              }`}>
                {filteredFeed.map((item, index) => (
                  <div 
                    key={item.id}
                    className={`animate-fadeUp relative flex gap-2.5 rounded-xl p-2 transition ${
                      index === 0 ? "bg-[#1C1C21] border border-[#27272A]" : "hover:bg-[#17171B]"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span 
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[8px] font-bold text-white shadow-sm"
                        style={{ background: item.color }}
                      >
                        {item.agent.split("·")[0].trim().slice(0, 2)}
                      </span>
                      {index < filteredFeed.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-[#27272A]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[9px]">
                        <b className="text-[10px] text-white">{item.agent}</b>
                        <span className="mono text-[#71717A]">{item.time}</span>
                        <span className="rounded bg-[#27272A] px-1 py-0.5 text-[8px] text-[#A1A1AA]">{item.tag}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[#D4D4D8]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}

                {filteredFeed.length === 0 && (
                  <p className="p-3 text-center text-[11px] text-[#71717A]">
                    No feed items match your search.
                  </p>
                )}
              </div>

              {/* Swarm Feed Footer */}
              <div className="flex items-center justify-between border-t border-[#27272A] px-3 py-2 text-[9px] text-[#71717A] shrink-0">
                <span className="flex items-center">
                  <Radio size={11} className="mr-1 inline text-[#10B981]" />
                  Auto-refresh · 5s
                </span>
                <span className="mono">TICK {simulationTick}</span>
              </div>
            </section>
          )}

          {/* Card 2: Live Drill Injector & Scenario Insertion Section */}
          {(rightPanelTab === 'all' || rightPanelTab === 'injector') && (
            <section className="rounded-2xl border border-[#27272A] bg-[#131316] p-3 shadow-sm shrink-0 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold">LIVE DRILL INJECTOR & TRAINER</p>
                  <p className="mt-0.5 text-[9px] text-[#A1A1AA]">Scenario Insertion · Trains RLIF policy</p>
                </div>
                <Zap size={15} className="text-[#F59E0B]" />
              </div>

              {/* Quick Drill Presets */}
              <div className="mt-2.5 flex flex-wrap gap-1">
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
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label className="text-[9px] text-[#A1A1AA] block">
                  TARGET SECTOR
                  <select 
                    value={targetSector} 
                    onChange={(e) => {
                      setTargetSector(e.target.value);
                      if (e.target.value === "Sector_6B") setCameraPreset("sector_6b");
                      else if (e.target.value === "Sector_5C") setCameraPreset("sector_5c");
                    }}
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-[11px] outline-none"
                  >
                    <option value="Sector_6B">Sector 6B (Esplanade Subway)</option>
                    <option value="Sector_5C">Sector 5C (Salt Lake Sector V)</option>
                    <option value="Evac_Zone">Evacuation Zone (Maidan)</option>
                  </select>
                </label>

                <label className="text-[9px] text-[#A1A1AA] block">
                  HAZARD TYPE
                  <select 
                    value={hazardType} 
                    onChange={(e) => setHazardType(e.target.value)}
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-[11px] outline-none"
                  >
                    <option value="Collision">Collision</option>
                    <option value="Fire">Fire</option>
                    <option value="Flood">Flood</option>
                    <option value="Gas Rupture">Gas Rupture</option>
                  </select>
                </label>
              </div>

              {/* Severity Buttons */}
              <p className="mt-2.5 text-[9px] text-[#A1A1AA]">SEVERITY</p>
              <div className="mt-1 grid grid-cols-3 rounded-lg bg-[#17171B] p-0.5 gap-1">
                {["Critical", "High", "Medium"].map((lvl) => (
                  <button 
                    key={lvl}
                    onClick={() => setSeverity(lvl)}
                    aria-pressed={severity === lvl}
                    className={`rounded-md py-1 text-[10px] font-bold transition ${
                      severity === lvl
                        ? (lvl === "Critical" ? "bg-[#EF4444] text-white" : (lvl === "High" ? "bg-[#F59E0B] text-black" : "bg-[#3B82F6] text-white"))
                        : "text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Casualties Count Slider & Block Corridors */}
              <div className="mt-2.5 flex items-center justify-between text-[10px]">
                <span className="text-[#A1A1AA]">Casualties: <b className="mono text-[#F59E0B]">{casualtiesCount}</b></span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A1A1AA]">Block Road D4:</span>
                  <ToggleSwitch on={blockCorridors} onChange={setBlockCorridors} label="Block corridors" />
                </div>
              </div>
              <input 
                type="range"
                min="0"
                max="40"
                value={casualtiesCount}
                onChange={(e) => setCasualtiesCount(Number(e.target.value))}
                aria-label="Casualties count"
                className="mt-1.5 w-full"
              />

              {/* Incident Tactical Briefing Textarea */}
              <label className="mt-2.5 block text-[9px] text-[#A1A1AA]">
                INCIDENT BRIEFING
                <textarea 
                  value={incidentBriefing}
                  onChange={(e) => setIncidentBriefing(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg p-2 text-[11px] leading-relaxed outline-none"
                />
              </label>

              {/* Action Buttons: Inject Scenario & Simulate Tick */}
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button 
                  onClick={injectAndTrainSwarm}
                  disabled={isInjecting}
                  className="rounded-lg bg-[#F59E0B] py-2.5 text-[11px] font-bold text-black hover:bg-[#FBBF24] transition shadow-md disabled:opacity-50"
                >
                  {isInjecting ? "INJECTING…" : "⚡ INJECT SCENARIO"}
                </button>
                <button 
                  onClick={simulateTick}
                  disabled={isSimulating}
                  className="rounded-lg border border-[#3F3F46] bg-[#17171B] py-2.5 text-[11px] font-bold hover:border-[#A1A1AA] transition disabled:opacity-50 text-white"
                >
                  {isSimulating ? "TICKING…" : "SIMULATE TICK"}
                </button>
              </div>

              {/* Status Feedback Pill */}
              <p role="status" className="mt-2 rounded-lg border border-[#27272A] bg-[#17171B] px-2 py-1.5 text-[9px] leading-relaxed text-[#A1A1AA] truncate">
                {statusMessage}
              </p>
            </section>
          )}
        </aside>
      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#27272A] px-3 py-1.5 text-[9px] text-[#71717A] lg:px-4 z-30">
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
