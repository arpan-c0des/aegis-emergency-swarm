import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Hospital, Bed, Activity, CheckCircle, RefreshCw, 
  Shield, Clock, Sparkles, AlertCircle, Plus, Minus, ArrowUpRight
} from 'lucide-react';

export default function HospitalsPage() {
  const router = useRouter();
  const [h1Beds, setH1Beds] = useState(28);
  const [h2Beds, setH2Beds] = useState(12);
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState("");

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://aegis-backend-5fx3.onrender.com").replace(/\/$/, "");

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-GB"));
    }, 1000);
    setClock(new Date().toLocaleTimeString("en-GB"));
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hospitals) {
          if (data.hospitals.H1) setH1Beds(data.hospitals.H1.available_beds);
          if (data.hospitals.H2) setH2Beds(data.hospitals.H2.available_beds);
        }
      })
      .catch((err) => console.error("Could not fetch hospital telemetry", err));
  }, []);

  const updateHospital = async (id: string, beds: number) => {
    setLoading(true);
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
      const data = await res.json();
      setStatusMsg(`Updated ${id} available capacity to ${beds} beds. Synchronized with Gemini swarm.`);
    } catch (e) {
      console.error(e);
      setStatusMsg(`Capacity local updated to ${beds} beds for ${id}.`);
    } finally {
      setLoading(false);
    }
  };

  const h1Total = 37;
  const h2Total = 29;
  const h1Pct = Math.round((h1Beds / h1Total) * 100);
  const h2Pct = Math.round((h2Beds / h2Total) * 100);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between selection:bg-[#10B981]/30">
      <Head>
        <title>AEGIS — Hospital Bed & Admissions Management</title>
        <meta name="description" content="AEGIS Hospital Bed Admissions and Emergency Ward Telemetry" />
      </Head>

      {/* Top Header */}
      <header className="relative h-14 shrink-0 border-b border-[#27272A] bg-[#0D0D10]/95 flex items-center justify-between px-3 sm:px-5 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#10B981] text-black shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Hospital size={18} strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <div className="font-bold tracking-[0.18em] text-[16px] sm:text-[17px]">AEGIS MED</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 whitespace-nowrap">Bed Intake • Triage Admissions</div>
          </div>
        </div>

        {/* Route Navigation Tabs */}
        <div className="flex items-center gap-1.5 font-mono">
          <Link 
            href="/"
            className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
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
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#10B981] text-black shadow-sm"
          >
            [03] Bed Intake
          </Link>
        </div>

        {/* Clock & Status */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-right leading-none pr-1">
            <div className="mono text-[13px] font-semibold">{clock || "14:35:12"}</div>
            <div className="text-[9px] text-[#71717A] mt-0.5">LOCAL • SYNCED</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-1 text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] live-dot" />
            TRIAGE MESH ONLINE
          </span>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-5xl mx-auto w-full">
        <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-5 sm:p-6 shadow-sm space-y-6">
          
          {/* Header Title Section */}
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#27272A] gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">
                MEDICAL RECEPTION WARD — BED DISPATCH & ADMISSIONS
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-white mt-1">
                Emergency Capacity & Triage Bed Allocation
              </h1>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Real-time capacity reporting synchronized directly with Gemini multi-agent swarm decisions.
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
            
            {/* Hospital 1: Central Trauma (H1) */}
            <div className="rounded-2xl border border-[#27272A] bg-[#17171B] p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    CENTRAL TRAUMA (H1)
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] mt-1">
                    Dedicated surgical units for critical explosion and burn casualties. Priority destination for trauma ambulances.
                  </p>
                </div>
                <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold px-2 py-0.5 rounded-full shrink-0">
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
                    <label className="text-[9px] uppercase font-bold text-[#71717A] block">Available Beds</label>
                    <input 
                      type="number"
                      value={h1Beds}
                      onChange={(e) => setH1Beds(parseInt(e.target.value) || 0)}
                      className="mono font-bold text-lg text-white bg-transparent outline-none w-20"
                    />
                  </div>
                </div>

                {/* Quick Increment/Decrement */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setH1Beds((prev) => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                  >
                    <Minus size={13} />
                  </button>
                  <button 
                    onClick={() => setH1Beds((prev) => Math.min(h1Total, prev + 1))}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => updateHospital("H1", h1Beds)}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-[#10B981] text-black hover:bg-[#059669] transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  <span>Update Central Trauma</span>
                </button>
                <button 
                  onClick={() => { setH1Beds(28); updateHospital("H1", 28); }}
                  className="px-3 py-2.5 rounded-xl border border-[#27272A] bg-[#131316] text-[11px] font-bold text-[#A1A1AA] hover:text-white hover:border-[#3F3F46] transition"
                  title="Reset to 28"
                >
                  Reset (28)
                </button>
              </div>
            </div>

            {/* Hospital 2: St. Luke's Community Clinic (H2) */}
            <div className="rounded-2xl border border-[#27272A] bg-[#17171B] p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                    ST. LUKE'S COMMUNITY (H2)
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] mt-1">
                    Specialized burn and stabilization triage center. Secondary reception destination for stable casualties.
                  </p>
                </div>
                <span className="text-[10px] bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 font-bold px-2 py-0.5 rounded-full shrink-0">
                  TRAUMA LEVEL 2
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
                    <label className="text-[9px] uppercase font-bold text-[#71717A] block">Available Beds</label>
                    <input 
                      type="number" 
                      value={h2Beds}
                      onChange={(e) => setH2Beds(parseInt(e.target.value) || 0)}
                      className="mono font-bold text-lg text-white bg-transparent outline-none w-20"
                    />
                  </div>
                </div>

                {/* Quick Increment/Decrement */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setH2Beds((prev) => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                  >
                    <Minus size={13} />
                  </button>
                  <button 
                    onClick={() => setH2Beds((prev) => Math.min(h2Total, prev + 1))}
                    className="w-7 h-7 rounded-lg border border-[#27272A] bg-[#17171B] hover:border-[#3F3F46] flex items-center justify-center text-white transition"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={() => updateHospital("H2", h2Beds)}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-[#3B82F6] text-white hover:bg-[#2563EB] transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  <span>Update St. Luke's</span>
                </button>
                <button 
                  onClick={() => { setH2Beds(12); updateHospital("H2", 12); }}
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
