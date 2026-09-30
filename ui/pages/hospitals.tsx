import React, { useState } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { Hospital, Bed, Activity, CheckCircle } from 'lucide-react';

export default function HospitalsPage() {
  const [h1Beds, setH1Beds] = useState(28);
  const [h2Beds, setH2Beds] = useState(12);
  const [statusMsg, setStatusMsg] = useState("");

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const updateHospital = async (id: string, beds: number) => {
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
      setStatusMsg(`Updated ${id} available beds to ${beds}. Swarm AI will route incoming ambulances accordingly.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col justify-between selection:bg-[#FFB5E8]/40">
      <Head><title>AEGIS — Hospital Bed Management</title></Head>
      <Navbar />

      <div className="clay-card p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#EEE8F8] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-[#C3FFB5] border-2 border-white flex items-center justify-center">
              <Hospital size={20} className="text-[#2E5A2A]" />
            </div>
            <div>
              <h2 className="font-[800] text-[16px] text-[#2F2940]">
                MEDICAL RECEPTION WARD — BED DISPATCH & ADMISSIONS
              </h2>
              <p className="text-[11px] font-[600] text-[#9A8EB0]">
                Live capacity reporting synchronized directly with Gemini multi-agent swarm
              </p>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className="clay-card p-3 rounded-[18px] bg-[#C3FFB5]/50 border-2 border-white text-[#2E5A2A] text-xs font-[800] mb-4 flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Hospital 1: Central Trauma */}
          <div className="clay-card p-5 bg-white">
            <div className="flex justify-between items-center mb-2">
              <span className="font-[800] text-sm text-[#244974]">CENTRAL TRAUMA (H1)</span>
              <span className="text-[10px] bg-[#B5DEFF] text-[#1b446f] font-[800] px-2.5 py-0.5 rounded-full border border-white">
                LEVEL 1 TRAUMA
              </span>
            </div>
            <p className="text-xs font-[600] text-[#7B6E96] mb-4">
              Dedicated surgical units for critical explosion and burn casualties.
            </p>

            <div className="clay-inset p-3 rounded-[18px] flex items-center gap-3 mb-4">
              <Bed className="text-[#244974]" size={22} />
              <div className="flex-1">
                <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block">Available ICU / Trauma Beds</label>
                <input 
                  type="number" 
                  value={h1Beds}
                  onChange={(e) => setH1Beds(parseInt(e.target.value) || 0)}
                  className="w-full bg-transparent font-[800] text-lg text-[#244974] outline-none"
                />
              </div>
            </div>

            <button 
              onClick={() => updateHospital("H1", h1Beds)}
              className="w-full clay-button py-3 rounded-full font-[800] text-xs bg-[#B5DEFF] text-[#1b446f] uppercase"
            >
              Sync H1 Capacity with AI Swarm
            </button>
          </div>

          {/* Hospital 2: St. Luke's Med */}
          <div className="clay-card p-5 bg-white">
            <div className="flex justify-between items-center mb-2">
              <span className="font-[800] text-sm text-[#874b0c]">ST. LUKE'S CLINIC (H2)</span>
              <span className="text-[10px] bg-[#FFE6A5] text-[#874b0c] font-[800] px-2.5 py-0.5 rounded-full border border-white">
                GENERAL & MINOR
              </span>
            </div>
            <p className="text-xs font-[600] text-[#7B6E96] mb-4">
              Handles minor fractures, smoke inhalation, and non-critical triage admissions.
            </p>

            <div className="clay-inset p-3 rounded-[18px] flex items-center gap-3 mb-4">
              <Bed className="text-[#874b0c]" size={22} />
              <div className="flex-1">
                <label className="text-[10px] uppercase font-[800] text-[#9A8EB0] block">Available Clinic Beds</label>
                <input 
                  type="number" 
                  value={h2Beds}
                  onChange={(e) => setH2Beds(parseInt(e.target.value) || 0)}
                  className="w-full bg-transparent font-[800] text-lg text-[#874b0c] outline-none"
                />
              </div>
            </div>

            <button 
              onClick={() => updateHospital("H2", h2Beds)}
              className="w-full clay-button py-3 rounded-full font-[800] text-xs bg-[#FFE6A5] text-[#874b0c] uppercase"
            >
              Sync H2 Capacity with AI Swarm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}