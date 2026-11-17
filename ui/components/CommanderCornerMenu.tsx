import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Shield, Navigation, Hospital, Siren, Flame, Ambulance, Key, ChevronUp, ChevronDown, 
  ExternalLink, Layers, Check, ArrowRight, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const CommanderCornerMenu: React.FC = () => {
  const router = useRouter();
  const { user, openSecurityModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Render ONLY for Incident Commander
  if (!user || user.role !== 'incident_commander') return null;

  const currentPath = router.asPath;

  const navItems = [
    {
      title: 'C2 Swarm Console',
      short: '01 · C2 SWARM',
      href: '/',
      icon: '🛡️',
      color: '#F59E0B',
      desc: 'Main command console, dynamic multi-agent deliberation & RLIF'
    },
    {
      title: 'Fleet Uber Dispatch',
      short: '02 · FLEET UBER',
      href: '/fleet',
      icon: '🗺️',
      color: '#3B82F6',
      desc: 'All vehicles, Bidirectional A* shortest road routing, full fleet controls'
    },
    {
      title: 'Hospital Bed Intake',
      short: '03 · BED INTAKE',
      href: '/hospitals',
      icon: '🏥',
      color: '#10B981',
      desc: 'SSKM (H1) & Apollo (H2) trauma admissions and ward capacities'
    }
  ];

  const driverCockpits = [
    {
      title: 'Police Driver Cockpit',
      short: 'POL-02 INTERCEPTOR',
      href: '/fleet?driver=police',
      icon: '🚓',
      color: '#6366F1'
    },
    {
      title: 'Fire Engine Cockpit',
      short: 'FIRE-03 PUMPER',
      href: '/fleet?driver=fire',
      icon: '🚒',
      color: '#EF4444'
    },
    {
      title: 'Ambulance Cockpit',
      short: 'AMB-07 PARAMEDIC',
      href: '/fleet?driver=ambulance',
      icon: '🚑',
      color: '#EC4899'
    }
  ];

  return (
    <aside aria-label="Incident Commander Navigation" className="fixed bottom-4 right-4 z-[9990] flex flex-col items-end select-none font-sans">
      
      {/* Expanded Collapsible Drawer */}
      {isOpen && (
        <div className="mb-2 w-80 rounded-2xl border border-[#F59E0B]/40 bg-[#0F0F13]/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* Menu Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#27272A]">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-[#F59E0B]/20 text-xs">
                🛡️
              </span>
              <div>
                <span className="text-[11px] font-bold text-white tracking-wider block">
                  COMMANDER TELEPORT
                </span>
                <span className="text-[9px] text-[#A1A1AA] font-mono">
                  Full System Authority
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-[#71717A] hover:text-white hover:bg-white/10 transition"
              title="Close Commander Menu"
            >
              <X size={14} />
            </button>
          </div>

          {/* Primary System Portals */}
          <div className="space-y-1 mb-3">
            <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block px-1 mb-1 font-mono">
              Primary Command Sections
            </span>
            {navItems.map((item) => {
              const isActive = (item.href === '/' && currentPath === '/') || 
                               (item.href !== '/' && currentPath.startsWith(item.href) && !currentPath.includes('?driver='));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between p-2 rounded-xl text-left transition border ${
                    isActive
                      ? 'bg-white/10 border-white/30 text-white font-bold'
                      : 'bg-[#16161B] border-[#27272A] text-[#D4D4D8] hover:border-[#3F3F46] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <div className="truncate">
                      <div className="text-xs leading-tight truncate">{item.title}</div>
                      <div className="text-[9px] text-[#71717A] font-mono truncate">{item.short}</div>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="h-2 w-2 rounded-full bg-[#10B981] shrink-0" />
                  ) : (
                    <ArrowRight size={12} className="text-[#52525B] shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Field Cockpit Quick Inspects */}
          <div className="space-y-1 mb-3">
            <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block px-1 mb-1 font-mono">
              Field Driver Cockpits
            </span>
            <div className="grid grid-cols-3 gap-1">
              {driverCockpits.map((cockpit) => {
                const isCockpitActive = currentPath === cockpit.href;
                return (
                  <Link
                    key={cockpit.href}
                    href={cockpit.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                      isCockpitActive
                        ? 'border-white/40 bg-white/15'
                        : 'border-[#27272A] bg-[#16161B] hover:border-[#3F3F46]'
                    }`}
                    title={cockpit.title}
                  >
                    <span className="text-lg mb-0.5">{cockpit.icon}</span>
                    <span className="text-[9px] font-bold text-white truncate max-w-full">
                      {cockpit.short.split(' ')[0]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Security Vault Action */}
          <div className="pt-2 border-t border-[#27272A] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openSecurityModal();
              }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#F59E0B] hover:underline"
            >
              <Key size={11} />
              <span>Security Vault (Passwords)</span>
            </button>
            <span className="text-[9px] text-[#52525B] font-mono">EOC GOLD</span>
          </div>

        </div>
      )}

      {/* Main Collapsible Toggle Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-full border border-[#F59E0B]/60 bg-[#121217]/95 px-3.5 py-2 text-xs font-bold text-white shadow-xl shadow-black/60 backdrop-blur-md hover:bg-[#1A1A22] hover:border-[#F59E0B] transition active:scale-95"
      >
        <span className="flex h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
        <span className="text-[#F59E0B]">🛡️ COMMANDER NAV</span>
        {isOpen ? <ChevronDown size={14} className="text-[#A1A1AA]" /> : <ChevronUp size={14} className="text-[#A1A1AA]" />}
      </button>

    </aside>
  );
};
