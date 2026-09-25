import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { ResourceDashboard } from '../components/ResourceDashboard';
import { AgentActivityFeed } from '../components/AgentActivityFeed';
import { DispatchAudioPlayer } from '../components/DispatchAudioPlayer';
import { Shield, Play, Flame, Hospital, Car, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [worldState, setWorldState] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [commandPlan, setCommandPlan] = useState<string>("");
  const [solanaAudit, setSolanaAudit] = useState<any>(null);
  const [audioAvailable, setAudioAvailable] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [executedLogs, setExecutedLogs] = useState<any[]>([]);

  // Fetch initial world state
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/state")
      .then(res => res.json())
      .then(data => setWorldState(data))
      .catch(err => console.error("Could not reach AEGIS API", err));

    // Connect WebSocket for live events
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "INITIAL_STATE") {
        setWorldState(msg.data);
      } else if (msg.type === "SIMULATION_UPDATE" || msg.type === "RESET_STATE") {
        setWorldState(msg.data.updated_world_state);
        setTranscript(msg.data.transcript || []);
        setCommandPlan(msg.data.command_plan || "");
        setSolanaAudit(msg.data.solana_audit || null);
        setAudioAvailable(msg.data.audio_available || false);
        setExecutedLogs(msg.data.executed_actions || []);
      }
    };
    return () => ws.close();
  }, []);

  const triggerStep = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/simulate/tick", { method: "POST" });
      const data = await res.json();
      setWorldState(data.updated_world_state);
      setTranscript(data.transcript || []);
      setCommandPlan(data.command_plan || "");
      setSolanaAudit(data.solana_audit || null);
      setAudioAvailable(data.audio_available || false);
      setExecutedLogs(data.executed_actions || []);
    } catch (e) {
      console.error("Simulation tick failed:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = async () => {
    try {
      setIsSimulating(false);
      const res = await fetch("http://127.0.0.1:8000/api/reset", { method: "POST" });
      const data = await res.json();
      
      // Wipe UI components cleanly
      setWorldState(data.state);
      setTranscript([]);
      setCommandPlan("");
      setSolanaAudit(null);
      setAudioAvailable(false);
      setExecutedLogs([]);
    } catch (e) {
      console.error("Reset failed:", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col">
      <Head>
        <title>AEGIS — Autonomous Emergency Command Center</title>
      </Head>

      {/* Top Tactical Header */}
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded">
            <Shield className="text-blue-400" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white">AEGIS COMMAND CONSOLE</h1>
            <p className="text-[11px] text-gray-500 font-mono">
              Autonomous Emergency Governance & Intelligence System • Solana Devnet • Gemini 2.5
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={resetSimulation}
            className="px-3 py-2 rounded font-bold text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 uppercase tracking-wider transition border border-gray-700"
          >
            Reset Sim
          </button>

          <button
            onClick={triggerStep}
            disabled={isSimulating}
            className={`px-4 py-2 rounded font-bold text-xs flex items-center space-x-2 uppercase tracking-wider transition ${
              isSimulating
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30"
            }`}
          >
            <Play size={14} className={isSimulating ? "animate-spin" : ""} />
            <span>{isSimulating ? "Agents Deliberating..." : "Simulate Incident Tick"}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="p-6 flex-1 space-y-5 max-w-[1700px] w-full mx-auto">
        <ResourceDashboard state={worldState} solanaAudit={solanaAudit} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 2D City Grid Map */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Tactical City Grid (Zone Sector 01)
                </span>
                <span className="text-[11px] text-amber-400 font-mono">
                  Weather: {worldState?.weather || "Rain"}
                </span>
              </div>

              {/* Grid Canvas Representation */}
              <div className="h-[430px] bg-gray-950 rounded border border-gray-800 relative p-6 flex flex-col justify-between overflow-hidden">
                {/* Hospital A & B */}
                <div className="flex justify-between items-center z-10">
                  <div className="bg-blue-950/80 border border-blue-600/60 p-3 rounded flex items-center space-x-2">
                    <Hospital className="text-blue-400" size={20} />
                    <div>
                      <div className="text-xs font-bold text-white">Central Trauma (H1)</div>
                      <div className="text-[10px] text-blue-300">
                        {worldState?.hospitals?.H1?.available_beds} beds left
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-gray-700 p-3 rounded flex items-center space-x-2">
                    <Hospital className="text-gray-400" size={20} />
                    <div>
                      <div className="text-xs font-bold text-white">West Clinic (H2)</div>
                      <div className="text-[10px] text-gray-400">
                        {worldState?.hospitals?.H2?.available_beds} beds left
                      </div>
                    </div>
                  </div>
                </div>

                {/* Road Corridor Visual */}
                <div className="flex items-center justify-around py-4 z-10">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-mono text-gray-500">Road A1</span>
                    <div className="text-xs font-bold text-green-400">OPEN</div>
                  </div>
                  <div className="text-center bg-red-950/40 px-3 py-1 border border-red-800/40 rounded">
                    <span className="text-[10px] uppercase font-mono text-red-400">Road B2 (Fire Line)</span>
                    <div className="text-xs font-bold text-red-500 flex items-center justify-center space-x-1">
                      <AlertOctagon size={12} />
                      <span>{worldState?.roads?.Road_B2?.toUpperCase() || "BLOCKED"}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-mono text-gray-500">Road C3</span>
                    <div className="text-xs font-bold text-amber-400">CONGESTED</div>
                  </div>
                </div>

                {/* Hazard Site: Building A */}
                <div className="flex justify-between items-end z-10">
                  <div className="bg-red-950/90 border border-red-600 p-4 rounded-lg flex items-center space-x-3 shadow-lg shadow-red-950">
                    <Flame className="text-red-500 animate-bounce" size={28} />
                    <div>
                      <div className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>BUILDING A</span>
                        <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded text-white font-mono">CRITICAL</span>
                      </div>
                      <div className="text-xs text-red-300">Active Structural Fire • Casualties Trapped</div>
                    </div>
                  </div>

                  {/* Field Units */}
                  <div className="space-y-2">
                    {Object.values(worldState?.units || {}).map((u: any) => (
                      <div key={u.id} className="bg-gray-900/90 border border-gray-700 px-2 py-1 rounded flex items-center space-x-2 text-xs">
                        <Car size={14} className={u.status === "dispatched" ? "text-amber-400" : "text-gray-400"} />
                        <span className="font-bold text-gray-200">{u.id}</span>
                        <span className="text-[10px] text-gray-400">({u.status})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DispatchAudioPlayer audioAvailable={audioAvailable} />
          </div>

          {/* Right Panel: Live Agent Activity Deliberations */}
          <div className="lg:col-span-5 space-y-4">
            <AgentActivityFeed transcript={transcript} commandPlan={commandPlan} />

            {/* Deterministic Execution Audit Box */}
            {executedLogs.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-green-400 flex items-center space-x-2 mb-2">
                  <CheckCircle2 size={16} />
                  <span>Executed Deterministic Actions</span>
                </div>
                <div className="space-y-1">
                  {executedLogs.map((log, i) => (
                    <div key={i} className="text-xs text-gray-300 bg-gray-950 px-2.5 py-1.5 rounded font-mono">
                      ✔ {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}