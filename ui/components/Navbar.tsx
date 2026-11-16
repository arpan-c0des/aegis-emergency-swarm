import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Shield, Sparkles } from 'lucide-react';

interface NavbarProps {
  theme?: 'tactical' | 'clay';
}

export const Navbar: React.FC<NavbarProps> = ({ theme = 'clay' }) => {
  const router = useRouter();
  const currentPath = router.pathname;

  if (theme === 'tactical') {
    return (
      <nav className="tactical-panel p-3 mb-4 flex flex-wrap items-center justify-between gap-3 border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 pl-2">
          <div 
            className="w-10 h-10 rounded-[14px] bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <Shield size={20} className="text-cyan-400" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2 font-[800] text-[16px] text-cyan-200 tracking-[-0.02em]">
              <span>AEGIS DEFENSE MESH</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            </div>
            <div className="text-[11px] font-[600] text-slate-400 font-mono">
              TACTICAL C2 SWARM • REAL-TIME MESH
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          <Link 
            href="/" 
            className={`px-4 py-2 rounded-full font-[800] text-[12px] tracking-wide transition-all border ${
              currentPath === "/" 
                ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                : "bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white"
            }`}
          >
            [01] Admin C2 Swarm
          </Link>

          <Link 
            href="/fleet" 
            className={`px-4 py-2 rounded-full font-[800] text-[12px] tracking-wide transition-all border ${
              currentPath === "/fleet" 
                ? "bg-blue-500 text-slate-950 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]" 
                : "bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white"
            }`}
          >
            [02] Emergency Fleet Uber
          </Link>

          <Link 
            href="/hospitals" 
            className={`px-4 py-2 rounded-full font-[800] text-[12px] tracking-wide transition-all border ${
              currentPath === "/hospitals" 
                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                : "bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white"
            }`}
          >
            [03] Hospital Bed Management
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="clay-card p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 pl-2">
        <div 
          className="w-10 h-10 rounded-[14px] bg-[#FFB5E8] border-[2.5px] border-white flex items-center justify-center"
          style={{ boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.9), 2px 3px 8px rgba(0,0,0,0.08)' }}
        >
          <Shield size={20} className="text-white" strokeWidth={2.8} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-[800] text-[16px] text-[#2F2940] tracking-[-0.02em]">
            <span>AEGIS DEFENSE MESH</span>
            <Sparkles size={14} className="text-[#FFB5E8]" />
          </div>
          <div className="text-[11px] font-[600] text-[#9A8EB0]">
            Autonomous Swarm Response • Inflated C2
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link 
          href="/" 
          className={`px-4 py-2 rounded-full font-[800] text-[12px] tracking-wide transition-all border-[2.5px] border-white ${
            currentPath === "/" 
              ? "bg-[#2F2940] text-white" 
              : "bg-white text-[#5A4E75] hover:bg-[#F3EFFC]"
          }`}
          style={{
            boxShadow: currentPath === "/" 
              ? "inset 3px 3px 6px rgba(0,0,0,0.2), 3px 4px 10px rgba(0,0,0,0.08)"
              : "inset 2px 2px 4px rgba(255,255,255,1), 2px 3px 8px rgba(120,110,150,0.12)"
          }}
        >
          [01] Admin C2 Swarm
        </Link>

        <Link 
          href="/fleet" 
          className={`px-4 py-2 rounded-full font-[800] text-[12px] tracking-wide transition-all border-[2.5px] border-white ${
            currentPath === "/fleet" 
              ? "bg-[#B5DEFF] text-[#244974]" 
              : "bg-white text-[#5A4E75] hover:bg-[#F3EFFC]"
          }`}
          style={{
            boxShadow: currentPath === "/fleet" 
              ? "inset 3px 3px 6px rgba(0,0,0,0.1), 3px 4px 10px rgba(0,0,0,0.08)"
              : "inset 2px 2px 4px rgba(255,255,255,1), 2px 3px 8px rgba(120,110,150,0.12)"
          }}
        >
          [02] Emergency Fleet Uber
        </Link>

        <Link 
          href="/hospitals" 
          className={`px-4 py-2 rounded-full font-[800] text-[12px] tracking-wide transition-all border-[2.5px] border-white ${
            currentPath === "/hospitals" 
              ? "bg-[#C3FFB5] text-[#2E5A2A]" 
              : "bg-white text-[#5A4E75] hover:bg-[#F3EFFC]"
          }`}
          style={{
            boxShadow: currentPath === "/hospitals" 
              ? "inset 3px 3px 6px rgba(0,0,0,0.1), 3px 4px 10px rgba(0,0,0,0.08)"
              : "inset 2px 2px 4px rgba(255,255,255,1), 2px 3px 8px rgba(120,110,150,0.12)"
          }}
        >
          [03] Hospital Bed Management
        </Link>
      </div>
    </nav>
  );
};