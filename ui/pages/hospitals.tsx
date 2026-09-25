import React, { useState } from 'react';
import Head from 'next/head';
import { Navbar } from '../components/Navbar';
import { Hospital, Bed, Activity, CheckCircle, Zap } from 'lucide-react';

export default function HospitalsPage() {
  const [h1Beds, setH1Beds] = useState(28);
  const [h2Beds, setH2Beds] = useState(12);
  const [statusMsg, setStatusMsg] = useState("");

  const updateHospital = async (id: string, beds: number) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/hospitals/update", {
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
    <div className="min-h-screen bg-[#140b06] p-4 text-slate-800 font-mono">
      <Head><title>AEGIS — Hospital Reception & Bed Control</title></Head>
      <Navbar />

      <div className="frame-wood p-4 rounded text-gray-200 max-w-4xl mx-auto">
        <div className="text-xs font-black text-[#d4af72] border-b border-[#442211] pb-2 mb-4 flex items-center justify-between">
          <span>MEDICAL RECEPTION WARD — BED DISPATCH & ADMISSIONS</span>
          <Hospital size={16} className="text-cyan-400" />
        </div>

        {statusMsg && (
          <div className="bg-[#0e2a1e] border border-emerald-500 text-emerald-300 p-2 rounded text-xs mb-4 flex items-center space-x-2">
            <CheckCircle size={14} />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hospital 1: Central Trauma */}
          <div className="sub-panel-metal p-4 rounded text-[#1e293b]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-sm text-blue-900">CENTRAL TRAUMA (H1)</span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">LEVEL 1 TRAUMA</span>
            </div>
            <p className="text-xs text-gray-700 mb-4">Dedicated surgical units for critical explosion and burn victims.</p>

            <div className="flex items-center space-x-3 mb-4">
              <Bed className="text-blue-900" size={24} />
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-600">Available ICU / Trauma Beds</label>
                <input 
                  type="number" 
                  value={h1Beds}
                  onChange={(e) => setH1Beds(parseInt(e.target.value) || 0)}
                  className="w-24 bg-white border border-gray-400 p-1.5 rounded font-black text-base text-blue-900 block mt-1"
                />
              </div>
            </div>

            <button 
              onClick={() => updateHospital("H1", h1Beds)}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black text-xs py-2 rounded uppercase"
            >
              Sync H1 Capacity with AI Swarm
            </button>
          </div>

          {/* Hospital 2: St. Luke's Med */}
          <div className="sub-panel-metal p-4 rounded text-[#1e293b]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-sm text-amber-900">ST. LUKE'S CLINIC (H2)</span>
              <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded">GENERAL & MINOR</span>
            </div>
            <p className="text-xs text-gray-700 mb-4">Handles minor fractures, smoke inhalation, and non-critical triage.</p>

            <div className="flex items-center space-x-3 mb-4">
              <Bed className="text-amber-900" size={24} />
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-600">Available Clinic Beds</label>
                <input 
                  type="number" 
                  value={h2Beds}
                  onChange={(e) => setH2Beds(parseInt(e.target.value) || 0)}
                  className="w-24 bg-white border border-gray-400 p-1.5 rounded font-black text-base text-amber-900 block mt-1"
                />
              </div>
            </div>

            <button 
              onClick={() => updateHospital("H2", h2Beds)}
              className="w-full bg-amber-900 hover:bg-amber-800 text-white font-black text-xs py-2 rounded uppercase"
            >
              Sync H2 Capacity with AI Swarm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}