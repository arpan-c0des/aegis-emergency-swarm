import React from 'react';
import { Shield, Key, LogOut, Lock, User, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_CONFIGS } from '../utils/auth';

interface Props {
  className?: string;
  showDriverLauncher?: boolean;
}

export const TacticalAuthBadge: React.FC<Props> = ({ className = '', showDriverLauncher = false }) => {
  const { user, logout, openSecurityModal } = useAuth();

  if (!user) return null;

  const roleConfig = ROLE_CONFIGS[user.role];

  const handleLaunchDriverWindow = (driverType: 'police' | 'fire' | 'ambulance') => {
    if (typeof window !== 'undefined') {
      window.open(`/fleet?driver=${driverType}`, '_blank', 'width=1280,height=820,menubar=no,toolbar=no');
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Driver Cockpit Launcher (Visible for Commander or Fleet Operator) */}
      {showDriverLauncher && (user.role === 'incident_commander' || user.role === 'fleet_operator') && (
        <div className="hidden xl:flex items-center gap-1 bg-[#18181D] border border-[#27272A] rounded-xl p-1 text-[10px]">
          <span className="text-[#71717A] font-bold px-1.5 uppercase font-mono">FIELD DRIVERS:</span>
          <button
            type="button"
            onClick={() => handleLaunchDriverWindow('police')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#6366F1]/15 text-[#818CF8] hover:bg-[#6366F1]/30 transition font-bold"
            title="Open Police Interceptor Driver Display in New Window"
          >
            <span>🚓 POL</span>
            <ExternalLink size={10} />
          </button>
          <button
            type="button"
            onClick={() => handleLaunchDriverWindow('fire')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EF4444]/15 text-[#F87171] hover:bg-[#EF4444]/30 transition font-bold"
            title="Open Fire Engine Driver Display in New Window"
          >
            <span>🚒 FIRE</span>
            <ExternalLink size={10} />
          </button>
          <button
            type="button"
            onClick={() => handleLaunchDriverWindow('ambulance')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EC4899]/15 text-[#F472B6] hover:bg-[#EC4899]/30 transition font-bold"
            title="Open Paramedic Ambulance Driver Display in New Window"
          >
            <span>🚑 AMB</span>
            <ExternalLink size={10} />
          </button>
        </div>
      )}

      {/* Role Badge */}
      <div 
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition"
        style={{
          backgroundColor: roleConfig.bgLight,
          borderColor: roleConfig.borderColor,
        }}
      >
        <span className="text-sm">{roleConfig.icon}</span>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold text-white leading-tight">
            {roleConfig.shortTitle}
          </span>
          <span 
            className="text-[9px] font-mono font-bold uppercase tracking-wider"
            style={{ color: roleConfig.color }}
          >
            {roleConfig.category === 'command' ? 'EOC GOLD' : roleConfig.category === 'operations' ? 'OPERATOR' : 'FIELD UNIT'}
          </span>
        </div>
      </div>

      {/* Incident Commander Master Vault Button */}
      {user.role === 'incident_commander' && (
        <button
          type="button"
          onClick={openSecurityModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/25 transition text-[11px] font-bold"
          title="Open Master Security Vault to re-key passwords"
        >
          <Key size={13} />
          <span className="hidden sm:inline">PASSWORDS</span>
        </button>
      )}

      {/* Normal Exit (Logout Button) */}
      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#27272A]/80 border border-[#3F3F46] text-[#A1A1AA] hover:text-white hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition text-[11px] font-bold"
        title="Sign out of Aegis on this device (Normal Exit - preserves system passwords)"
      >
        <LogOut size={13} />
        <span className="hidden md:inline">EXIT</span>
      </button>
    </div>
  );
};
