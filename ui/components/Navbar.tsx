import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Shield, Navigation, Hospital, ShieldAlert } from 'lucide-react';

export const Navbar = () => {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <nav className="plate-metal p-2 mb-3 flex items-center justify-between rounded border-2 border-[#4b5563]">
      <div className="flex items-center space-x-2 pl-2">
        <Shield className="text-[#38ef7d]" size={18} />
        <span className="font-black tracking-widest text-[#1e293b] text-sm">AEGIS DEFENSE MESH</span>
      </div>

      <div className="flex space-x-2">
        <Link href="/" className={`px-3 py-1 rounded text-xs font-black uppercase transition border ${
          currentPath === "/" 
            ? "bg-[#1e293b] text-cyan-400 border-cyan-500 shadow-inner" 
            : "bg-[#cfd6e0] text-gray-800 border-gray-400 hover:bg-[#b0bccb]"
        }`}>
          [01] Admin C2 Swarm
        </Link>

        <Link href="/fleet" className={`px-3 py-1 rounded text-xs font-black uppercase transition border ${
          currentPath === "/fleet" 
            ? "bg-[#1e293b] text-amber-400 border-amber-500 shadow-inner" 
            : "bg-[#cfd6e0] text-gray-800 border-gray-400 hover:bg-[#b0bccb]"
        }`}>
          [02] Emergency Fleet Uber
        </Link>

        <Link href="/hospitals" className={`px-3 py-1 rounded text-xs font-black uppercase transition border ${
          currentPath === "/hospitals" 
            ? "bg-[#1e293b] text-emerald-400 border-emerald-500 shadow-inner" 
            : "bg-[#cfd6e0] text-gray-800 border-gray-400 hover:bg-[#b0bccb]"
        }`}>
          [03] Hospital Bed Management
        </Link>
      </div>
    </nav>
  );
};