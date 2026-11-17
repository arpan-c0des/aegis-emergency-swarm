import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  Shield, Lock, ArrowRight, AlertTriangle, Eye, EyeOff, Check, Sparkles, Navigation, HeartPulse, Siren, Flame, Ambulance
} from 'lucide-react';
import { UserRole, ROLE_CONFIGS } from '../utils/auth';
import { useAuth } from '../contexts/AuthContext';

export const LoginModal: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized, showLoginModal, login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('incident_commander');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'primary' | 'field_drivers'>('primary');

  // If user is already on dedicated /login page, or already logged in and modal not requested, or vault not initialized
  if (!isInitialized || router.pathname === '/login' || (user && !showLoginModal)) return null;

  const currentRoleConfig = ROLE_CONFIGS[selectedRole];

  const primaryRoles: UserRole[] = ['incident_commander', 'fleet_operator', 'hospital_staff'];
  const driverRoles: UserRole[] = ['driver_police', 'driver_fire', 'driver_ambulance'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!password) {
      setErrorMessage('Please enter the password for the selected role.');
      return;
    }

    setLoading(true);
    const result = await login(selectedRole, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    } else {
      setPassword('');
    }
  };

  const fillQuickTestCredentials = () => {
    switch (selectedRole) {
      case 'incident_commander':
        setPassword('AegisCommander2026!');
        break;
      case 'fleet_operator':
        setPassword('FleetUberDispatch77#');
        break;
      case 'hospital_staff':
        setPassword('TraumaBedIntake99#');
        break;
      case 'driver_police':
        setPassword('PoliceIntercept02#');
        break;
      case 'driver_fire':
        setPassword('FireEngineAlpha03#');
        break;
      case 'driver_ambulance':
        setPassword('ParamedicAmbulance07#');
        break;
    }
    setErrorMessage('');
  };

  return (
    <div 
      className="fixed inset-0 z-[9990] flex flex-col justify-center items-center lg:items-end p-4 sm:p-6 lg:py-8 lg:px-12 xl:pr-24 overflow-y-auto overflow-x-hidden bg-cover bg-no-repeat bg-[#09090B]"
      style={{
        backgroundImage: "url('/auth-bg.jpg')",
        backgroundPosition: 'left center'
      }}
    >
      {/* Atmospheric overlay to preserve left-side AEGIS logo clarity while ensuring right-side form contrast */}
      <div 
        className="pointer-events-none fixed inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 lg:bg-gradient-to-r lg:from-transparent lg:via-black/20 lg:to-black/75" 
      />

      <div className="relative w-full max-w-xl rounded-2xl border border-[#27272A]/80 bg-[#111115]/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl z-10 my-8">
        
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="AEGIS Official Logo" 
              className="h-11 w-11 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">
                  AEGIS TACTICAL ACCESS PORTAL
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Role-Based Cryptographic Sign-In
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={fillQuickTestCredentials}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-[#A1A1AA] hover:text-white hover:bg-white/10 transition"
            title="Auto-fill default setup password for selected role"
          >
            <Sparkles size={11} className="text-[#F59E0B]" />
            <span>Fill Key</span>
          </button>
        </div>

        {/* Tab Switcher: Primary Roles vs Field Drivers */}
        <div className="flex rounded-xl bg-[#18181D] p-1 border border-[#27272A] mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('primary');
              if (!primaryRoles.includes(selectedRole)) setSelectedRole('incident_commander');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'primary' 
                ? 'bg-[#27272A] text-white shadow-sm' 
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            Primary Command & Operations (3)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('field_drivers');
              if (!driverRoles.includes(selectedRole)) setSelectedRole('driver_police');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'field_drivers' 
                ? 'bg-[#27272A] text-white shadow-sm' 
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            Field Drivers & Cockpits (3)
          </button>
        </div>

        {/* Role Cards Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
          {(activeTab === 'primary' ? primaryRoles : driverRoles).map((roleId) => {
            const role = ROLE_CONFIGS[roleId];
            const isSelected = selectedRole === roleId;
            return (
              <button
                key={roleId}
                type="button"
                onClick={() => {
                  setSelectedRole(roleId);
                  setErrorMessage('');
                }}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-white/40 bg-white/10 ring-1 ring-white/20'
                    : 'border-[#27272A] bg-[#16161A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{role.icon}</span>
                  {isSelected && (
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: role.color }} 
                    />
                  )}
                </div>
                <span className="text-xs font-bold text-white leading-tight mb-0.5">
                  {role.shortTitle}
                </span>
                <span className="text-[10px] text-[#71717A] line-clamp-2">
                  {role.category === 'command' ? 'All Systems' : role.category === 'operations' ? 'Section Locked' : 'Cockpit Locked'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Role Privilege Summary Banner */}
        <div 
          className="rounded-xl border p-3 mb-5 transition"
          style={{
            backgroundColor: currentRoleConfig.bgLight,
            borderColor: currentRoleConfig.borderColor
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{currentRoleConfig.icon}</span>
              <span>{currentRoleConfig.title}</span>
            </span>
            <span 
              className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border"
              style={{
                color: currentRoleConfig.color,
                borderColor: currentRoleConfig.borderColor,
                backgroundColor: 'rgba(0,0,0,0.4)'
              }}
            >
              {currentRoleConfig.category.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-[#D4D4D8] leading-relaxed">
            {currentRoleConfig.description}
          </p>
          {currentRoleConfig.assignedVehicleName && (
            <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] font-mono text-white flex items-center gap-1">
              <span>🔒 LOCKED UNIT:</span>
              <span className="text-white font-bold">{currentRoleConfig.assignedVehicleName}</span>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertTriangle size={15} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[#A1A1AA] block mb-1.5">
              Enter Password for {currentRoleConfig.shortTitle}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl bg-[#16161A] border border-[#27272A] px-3.5 py-2.5 text-xs text-white placeholder-[#52525B] focus:border-[#F59E0B] outline-none transition font-mono"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#71717A] hover:text-white transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 font-bold text-xs bg-[#F59E0B] text-black flex items-center justify-center gap-2 transition hover:bg-[#D97706] active:scale-95 shadow-md shadow-[#F59E0B]/20 disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying Cryptographic Salt & Hash…</span>
            ) : (
              <>
                <Lock size={14} />
                <span>SIGN IN TO {currentRoleConfig.shortTitle.toUpperCase()}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-[#27272A] text-center text-[10px] text-[#52525B]">
          Aegis Tactical Swarm · Zero-Knowledge Cryptographic Salt Authentication
        </div>
      </div>
    </div>
  );
};
