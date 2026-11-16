import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Shield, Sparkles, KeyRound, UserCheck, ArrowRight, AlertCircle, Radio } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [callsign, setCallsign] = useState('EOC-ALPHA');
  const [role, setRole] = useState('IncidentCommander');
  const [passkey, setPasskey] = useState('AEGIS-COMMAND-2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim() || !passkey.trim()) {
      setError('Please provide callsign and tactical access key.');
      return;
    }
    setLoading(true);
    setError('');

    // Store tactical session locally
    try {
      localStorage.setItem('aegis_user', JSON.stringify({
        sub: `callsign|${callsign.trim()}`,
        role: role,
        name: callsign.trim(),
        authenticated_at: new Date().toISOString()
      }));
    } catch (_) {}

    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 600);
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center relative selection:bg-[#FFB5E8]/40">
      <Head>
        <title>AEGIS — Tactical Commander Access</title>
      </Head>

      {/* Floating Pastel Gradient Background Orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute -top-[120px] -left-[120px] w-[520px] h-[520px] rounded-full blur-[26px] opacity-[0.55]" 
          style={{ background: 'radial-gradient(circle at 30% 30%, #FFB5E8 0%, #D6C2FF 60%, transparent 75%)' }}
        />
        <div 
          className="absolute top-[20%] right-[-80px] w-[460px] h-[460px] rounded-full blur-[28px] opacity-[0.45]" 
          style={{ background: 'radial-gradient(circle at 40% 40%, #B5DEFF 0%, #E8E9FF 70%)' }}
        />
        <div 
          className="absolute bottom-[-100px] left-[25%] w-[580px] h-[580px] rounded-full blur-[30px] opacity-[0.5]" 
          style={{ background: 'radial-gradient(circle at 30% 30%, #FFE6A5 0%, #FFB5E8 50%, transparent 75%)' }}
        />
      </div>

      <div className="clay-device max-w-md w-full p-8 relative">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div 
            className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-[#FFB5E8] to-[#D6C2FF] border-[3px] border-white flex items-center justify-center shrink-0"
            style={{ boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.9), 3px 5px 12px rgba(120,110,150,0.18)' }}
          >
            <Shield className="text-white" size={26} strokeWidth={2.6} />
          </div>
          <div>
            <div className="text-2xl font-[800] tracking-[-0.03em] text-[#2F2940] flex items-center gap-1.5">
              <span>AEGIS C2</span>
              <Sparkles size={16} className="text-[#FFB5E8]" />
            </div>
            <div className="text-[11px] font-[700] text-[#8E819E] tracking-wide uppercase">
              Emergency Operations Tactical Link
            </div>
          </div>
        </div>

        {error && (
          <div className="clay-card p-3 rounded-[18px] bg-[#FFE8F0] border-2 border-white text-[#dc2626] text-xs font-[800] mb-4 flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase font-[800] text-[#9A8EB0] block mb-1">
              Officer Callsign / ID
            </label>
            <input 
              type="text" 
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="w-full clay-inset p-3 rounded-[18px] text-xs font-[800] text-[#2F2940] outline-none"
              placeholder="e.g. COMMANDER-01"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase font-[800] text-[#9A8EB0] block mb-1">
              Command Authorization Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full clay-inset p-3 rounded-[18px] text-xs font-[800] text-[#3E3650] outline-none"
            >
              <option value="IncidentCommander">Incident Commander (EOC Lead)</option>
              <option value="MedicalDirector">Medical & Trauma Director (EMS)</option>
              <option value="FireMarshal">Fire Operations Chief</option>
              <option value="TrafficDirector">Police / Traffic Security Officer</option>
              <option value="LogisticsLead">Fleet Logistics Coordinator</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase font-[800] text-[#9A8EB0] block mb-1">
              Tactical Access Passkey
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                className="w-full clay-inset p-3 pr-10 rounded-[18px] text-xs font-[800] text-[#2F2940] outline-none font-mono"
                placeholder="••••••••••••"
              />
              <KeyRound size={16} className="absolute right-3.5 top-3.5 text-[#9A8EB0]" />
            </div>
          </div>

          <div className="clay-inset p-3 rounded-[18px] flex items-center justify-between text-[11px] font-[700] text-[#7B6E96]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C3FFB5] border border-white animate-pulse"></span>
              <span>DEVNET PROTOCOL: ON</span>
            </span>
            <span className="text-[#244974] font-[800]">MOCK/AUTH0 COMPLIANT</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full clay-button py-3.5 rounded-full font-[800] text-xs bg-[#B5DEFF] text-[#1b446f] flex items-center justify-center gap-2 transition active:scale-95"
          >
            {loading ? (
              <span>Authenticating Tactical Uplink...</span>
            ) : (
              <>
                <UserCheck size={16} />
                <span>Enter Command Console</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t-2 border-[#EEE8F8] flex items-center justify-between text-[10px] font-[800] text-[#8E819E]">
          <span>AEGIS CORE v1.0.0</span>
          <span>GEMINI SWARM READY</span>
        </div>
      </div>
    </div>
  );
}
