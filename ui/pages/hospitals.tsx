import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Hospital, Bed, Activity, CheckCircle, RefreshCw, 
  Shield, Clock, Sparkles, AlertCircle, Plus, Minus, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TacticalAuthBadge } from '../components/TacticalAuthBadge';
import { useHospitalBeds } from '../utils/hospitalSync';

export default function HospitalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Real-time bidirectional hospital bed synchronizer (syncs across all tabs & C2 dashboard)
  const { h1Beds, h2Beds, h1Total, h2Total, h1Pct, h2Pct, updateH1, updateH2 } = useHospitalBeds();

  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState("");

  // Local input states to ensure free, unjittered typing with zero fluctuation
  const [h1Input, setH1Input] = useState<string>(String(h1Beds));
  const [h2Input, setH2Input] = useState<string>(String(h2Beds));
  const [isH1Focused, setIsH1Focused] = useState<boolean>(false);
  const [isH2Focused, setIsH2Focused] = useState<boolean>(false);

  // Sync local inputs only when not actively focused by user
  useEffect(() => {
    if (!isH1Focused) {
      setH1Input(String(h1Beds));
    }
  }, [h1Beds, isH1Focused]);

  useEffect(() => {
    if (!isH2Focused) {
      setH2Input(String(h2Beds));
    }
  }, [h2Beds, isH2Focused]);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://aegis-backend-5fx3.onrender.com").replace(/\/$/, "");

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-GB"));
    }, 1000);
    setClock(new Date().toLocaleTimeString("en-GB"));
    return () => clearInterval(timer);
  }, []);

  const updateHospital = async (id: string, beds: number) => {
    setLoading(true);
    if (id === "H1") {
      updateH1(beds);
      setH1Input(String(beds));
    } else {
      updateH2(beds);
      setH2Input(String(beds));
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/hospitals/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_id: id,
          available_beds: beds,
          trauma_ready: true,
          generator_status: "NOMINAL"
        })
      });
      setStatusMsg(`Updated ${id} available capacity to ${beds} beds. Synchronized across C2 console and swarm.`);
    } catch (e) {
      console.error(e);
      setStatusMsg(`Updated ${id} capacity to ${beds} beds (live local sync active).`);
    } finally {
      setLoading(false);
    }
  };

  const commitH1 = (forcedValue?: number) => {
    const val = forcedValue !== undefined ? forcedValue : parseInt(h1Input, 10);
    const safe = isNaN(val) ? 0 : Math.max(0, Math.min(h1Total, val));
    updateHospital("H1", safe);
  };

  const commitH2 = (forcedValue?: number) => {
    const val = forcedValue !== undefined ? forcedValue : parseInt(h2Input, 10);
    const safe = isNaN(val) ? 0 : Math.max(0, Math.min(h2Total, val));
    updateHospital("H2", safe);
  };

  const stepH1 = (delta: number) => {
    const current = isH1Focused ? (parseInt(h1Input, 10) || 0) : h1Beds;
    const next = Math.max(0, Math.min(h1Total, current + delta));
    setH1Input(String(next));
    updateHospital("H1", next);
  };

  const stepH2 = (delta: number) => {
    const current = isH2Focused ? (parseInt(h2Input, 10) || 0) : h2Beds;
    const next = Math.max(0, Math.min(h2Total, current + delta));
    setH2Input(String(next));
    updateHospital("H2", next);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between selection:bg-[#10B981]/30">
      <Head>
        <title>AEGIS — Hospital Bed & Admissions Management</title>
        <meta name="description" content="AEGIS Hospital Bed Admissions and Emergency Ward Telemetry" />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </Head>

      {/* Top Header */}
      <header className="relative h-14 shrink-0 border-b border-[#27272A] bg-[#0D0D10]/95 flex items-center justify-between px-3 sm:px-5 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src="/logo.png" 
            alt="AEGIS Official Logo" 
            className="h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.4)] shrink-0" 
          />
          <div className="leading-none">
            <div className="font-bold tracking-[0.18em] text-[16px] sm:text-[17px] text-white">AEGIS MED</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 whitespace-nowrap font-mono">Bed Intake • Triage Admissions</div>
          </div>
        </div>

        {/* Route Navigation Tabs */}
        <div className="hidden sm:flex items-center gap-1.5 font-mono">
          {(!user || user.role === 'incident_commander') && (
            <Link 
              href="/"
              className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
            >
              [01] C2 Swarm
            </Link>
          )}
          {(!user || user.role === 'incident_commander' || user.role === 'fleet_operator') && (
            <Link 
              href="/fleet"
              className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
            >
              [02] Fleet Uber
            </Link>
          )}
          <Link 
            href="/hospitals"
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#10B981] text-black shadow-sm"
          >
            [03] Bed Intake
          </Link>
        </div>

        {/* Clock & Tactical Auth Badge */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:block text-right leading-none pr-1">
            <div className="mono text-[12px] font-semibold">{clock || "14:35:12"}</div>
            <div className="text-[9px] text-[#71717A] mt-0.5">LOCAL • SYNCED</div>
          </div>
          <TacticalAuthBadge />
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-5xl mx-auto w-full">
        <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-5 sm:p-6 shadow-sm space-y-6">
          
          {/* Header Title Section */}
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#27272A] gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">
                KOLKATA MEDICAL RECEPTION WARD — BED DISPATCH & ADMISSIONS
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-white mt-1">
                Kolkata Emergency Trauma & Triage Bed Allocation
              </h1>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Real-time bed telemetry for SSKM Hospital (H1) and Apollo Multispecialty (H2) synchronized with Gemini swarm routing.
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[10px] font-bold flex items-center gap-1.5">
              <CheckCircle size={13} />
              SWARM SYNC ACTIVE
            </span>
          </div>

          {/* Status Message Notification */}
          {statusMsg && (
            <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs font-semibold text-[#10B981] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle size={15} />
                <span>{statusMsg}</span>
              </span>
              <button onClick={() => setStatusMsg("")} className="text-[#A1A1AA] hover:text-white text-xs">✕</button>
            </div>
          )}

          {/* Hospital Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Hospital 1: SSKM Hospital / IPGMER Central Trauma (H1) */}
            <div className="rounded-2xl border border-[#27272A] bg-[#17171B] p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    SSKM HOSPITAL / IPGMER (H1)
                  </h3>
                  <div className="text-[10px] font-mono text-[#10B981] mt-0.5">
                    📍 Bhowanipore / Harish Mukherjee Rd · Central Kolkata
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-1.5 leading-relaxed">
                    Primary Level-1 Trauma Hospital & surgical intensive care facility. Priority reception destination for critical trauma, neuro, and blast casualties.
                  </p>
                </div>
                <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold px-2.5 py-1 rounded-full shrink-0">
                  LEVEL 1 TRAUMA
                </span>
              </div>

              {/* Progress Bar & Metric */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#A1A1AA]">Bed Availability:</span>
                  <span className="mono font-bold text-white">{h1Beds} / {h1Total} ({h1Pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#27272A] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#10B981] transition-all duration-300"
                    style={{ width: `${Math.min(100, h1Pct)}%` }}
                  />
                </div>
              </div>

              {/* Bed Count Editor */}
              <div className="rounded-xl border border-[#27272A] bg-[#131316] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bed size={18} className="text-[#10B981]" />
                  <div>
                    <label className="text-[9px] uppercase font-bold text-[#71717A] block">Available Beds (Max {h1Total})</label>
                    <input 
                      type="number"
                      min={0}
                      max={h1Total}
                      value={h1Input}
                      onFocus={() => setIsH1Focused(true)}
                      onBlur={() => {
                        setIsH1Focused(false);
                        commitH1();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          commitH1();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setH1Input(raw);
                        if (raw !== '') {
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed) && parsed >= 0 && parsed <= h1Total) {
                            updateH1(parsed);
                          }
                        }
                      }}
                      className="mono font-bold text-lg text-white bg-transparent outline-none w-20"
                    />
                  </div>
                </div>

                {/* Quick Increment/Decrement */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => stepH1(-1)}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                    title="Decrease 1 bed"
                  >
                    <Minus size={13} />
                  </button>
                  <button 
                    onClick={() => stepH1(1)}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                    title="Increase 1 bed"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => commitH1()}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-[#10B981] text-black hover:bg-[#059669] transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  <span>Update SSKM Hospital (H1)</span>
                </button>
                <button 
                  onClick={() => {
                    setH1Input("28");
                    commitH1(28);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-[#27272A] bg-[#131316] text-[11px] font-bold text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition"
                  title="Reset to 28"
                >
                  Reset (28)
                </button>
              </div>
            </div>

            {/* Hospital 2: Apollo Multispecialty / St. Luke's Clinic (H2) */}
            <div className="rounded-2xl border border-[#27272A] bg-[#17171B] p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                    APOLLO MULTISPECIALTY / ST. LUKE'S (H2)
                  </h3>
                  <div className="text-[10px] font-mono text-[#3B82F6] mt-0.5">
                    📍 EM Bypass / Kadapara · Salt Lake Corridor
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-1.5 leading-relaxed">
                    Specialized burn triage, stabilization, and tertiary trauma recovery. Secondary reception facility for Salt Lake Sector V and EM Bypass casualties.
                  </p>
                </div>
                <span className="text-[10px] bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 font-bold px-2.5 py-1 rounded-full shrink-0">
                  TRAUMA LEVEL 2 / BURNS
                </span>
              </div>

              {/* Progress Bar & Metric */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#A1A1AA]">Bed Availability:</span>
                  <span className="mono font-bold text-white">{h2Beds} / {h2Total} ({h2Pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#27272A] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#3B82F6] transition-all duration-300"
                    style={{ width: `${Math.min(100, h2Pct)}%` }}
                  />
                </div>
              </div>

              {/* Bed Count Editor */}
              <div className="rounded-xl border border-[#27272A] bg-[#131316] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bed size={18} className="text-[#3B82F6]" />
                  <div>
                    <label className="text-[9px] uppercase font-bold text-[#71717A] block">Available Beds (Max {h2Total})</label>
                    <input 
                      type="number"
                      min={0}
                      max={h2Total}
                      value={h2Input}
                      onFocus={() => setIsH2Focused(true)}
                      onBlur={() => {
                        setIsH2Focused(false);
                        commitH2();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          commitH2();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setH2Input(raw);
                        if (raw !== '') {
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed) && parsed >= 0 && parsed <= h2Total) {
                            updateH2(parsed);
                          }
                        }
                      }}
                      className="mono font-bold text-lg text-white bg-transparent outline-none w-20"
                    />
                  </div>
                </div>

                {/* Quick Increment/Decrement */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => stepH2(-1)}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                    title="Decrease 1 bed"
                  >
                    <Minus size={13} />
                  </button>
                  <button 
                    onClick={() => stepH2(1)}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                    title="Increase 1 bed"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={() => commitH2()}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-[#3B82F6] text-white hover:bg-[#2563EB] transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  <span>Update Apollo / St. Luke's (H2)</span>
                </button>
                <button 
                  onClick={() => {
                    setH2Input("12");
                    commitH2(12);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-[#27272A] bg-[#131316] text-[11px] font-bold text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition"
                  title="Reset to 12"
                >
                  Reset (12)
                </button>
              </div>
            </div>
          </div>

          {/* Synchronized Fleet & Admissions Note */}
          <div className="rounded-xl border border-[#27272A] bg-[#17171B] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#F59E0B]" />
              <span className="text-[#A1A1AA]">
                Live capacity numbers are polled continuously by the Gemini 2.5 Flash Swarm Orchestrator for optimal ambulance patient transport routing.
              </span>
            </div>
            <Link 
              href="/fleet"
              className="text-[#3B82F6] hover:text-[#60A5FA] font-bold flex items-center gap-1 transition"
            >
              <span>View Fleet Route Assignments</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#27272A] px-3 py-2 text-[9px] text-[#71717A] lg:px-5">
        <span>AEGIS TRIAGE OPERATIONS</span>
        <span>HOSPITAL BED INTAKE CONTROLLER</span>
        <span className="ml-auto mono">SYNC STATUS: LIVE MESH NOMINAL</span>
      </footer>
    </div>
  );
}
