import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  Shield, Lock, ArrowRight, AlertTriangle, Eye, EyeOff, Sparkles, Navigation, HeartPulse, Siren, Flame, Ambulance, LogOut
} from 'lucide-react';
import { UserRole, ROLE_CONFIGS } from '../utils/auth';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, isInitialized, login, logout, isLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('incident_commander');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'primary' | 'field_drivers'>('primary');

  const primaryRoles: UserRole[] = ['incident_commander', 'fleet_operator', 'hospital_staff'];
  const driverRoles: UserRole[] = ['driver_police', 'driver_fire', 'driver_ambulance'];

  const currentRoleConfig = ROLE_CONFIGS[selectedRole];

  useEffect(() => {
    // If user is already logged in and arrives at /login, we can redirect or show dashboard link
    if (user && !isLoading) {
      const defaultRoute = ROLE_CONFIGS[user.role]?.defaultRoute || '/';
      // keep on page with explicit option to proceed or switch
    }
  }, [user, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!password) {
      setErrorMessage('Please enter the password for the selected role.');
      return;
    }

    setSubmitting(true);
    const result = await login(selectedRole, password);
    setSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    } else {
      const defaultRoute = ROLE_CONFIGS[selectedRole].defaultRoute;
      router.push(defaultRoute);
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
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col justify-center items-center p-4 selection:bg-[#F59E0B]/30 relative overflow-hidden">
      <Head>
        <title>AEGIS — Tactical Access & Role Authentication</title>
        <meta name="description" content="AEGIS Cryptographic Access Control and Tactical Role Portal" />
      </Head>

      {/* Tactical Grid Background Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="w-full max-w-xl rounded-2xl border border-[#27272A] bg-[#111115] p-6 sm:p-8 shadow-2xl relative z-10 my-8">
        
        {/* Brand Header */}
        <div className="flex items-start justify-between border-b border-[#27272A] pb-5 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Shield size={24} strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">
                  AEGIS EMERGENCY DEFENSE GRID
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Cryptographic Access Portal
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={fillQuickTestCredentials}
            className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition"
            title="Auto-fill default setup password for selected role"
          >
            <Sparkles size={12} />
            <span>Fill Key</span>
          </button>
        </div>

        {/* If user is already authenticated */}
        {user ? (
          <div className="space-y-4">
            <div 
              className="rounded-xl border p-4"
              style={{
                backgroundColor: currentRoleConfig.bgLight,
                borderColor: currentRoleConfig.borderColor
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="text-lg">{currentRoleConfig.icon}</span>
                  <span>Currently Signed In: {currentRoleConfig.title}</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded border border-[#10B981]/30">
                  SESSION ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                {currentRoleConfig.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(currentRoleConfig.defaultRoute)}
                className="flex-1 py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#D97706] transition shadow-lg shadow-[#F59E0B]/20"
              >
                <span>ENTER {currentRoleConfig.shortTitle.toUpperCase()} WORKSPACE</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={logout}
                className="py-3 px-4 rounded-xl border border-[#3F3F46] bg-[#1A1A20] text-[#A1A1AA] hover:text-white hover:border-red-500/40 hover:text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <LogOut size={14} />
                <span>SIGN OUT</span>
              </button>
            </div>
          </div>
        ) : (
          /* Sign In Form */
          <>
            {/* Tabs for Primary Roles vs Field Drivers */}
            <div className="flex rounded-xl bg-[#18181E] p-1 border border-[#27272A] mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('primary');
                  if (!primaryRoles.includes(selectedRole)) setSelectedRole('incident_commander');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
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
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  activeTab === 'field_drivers' 
                    ? 'bg-[#27272A] text-white shadow-sm' 
                    : 'text-[#71717A] hover:text-[#A1A1AA]'
                }`}
              >
                Field Drivers & Units (3)
              </button>
            </div>

            {/* Role Cards Grid */}
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
                      {role.category === 'command' ? 'Unrestricted C2' : role.category === 'operations' ? 'Section Locked' : 'Cockpit Locked'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Privilege Summary */}
            <div 
              className="rounded-xl border p-3.5 mb-5 transition"
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

            {/* Error Message */}
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
                disabled={submitting}
                className="w-full rounded-xl py-3 font-bold text-xs bg-[#F59E0B] text-black flex items-center justify-center gap-2 transition hover:bg-[#D97706] active:scale-95 shadow-md shadow-[#F59E0B]/20 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Verifying Cryptographic Credentials…</span>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>AUTHENTICATE & ENTER {currentRoleConfig.shortTitle.toUpperCase()}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-5 pt-3 border-t border-[#27272A] text-center text-[10px] text-[#52525B] font-mono">
          Aegis Tactical Swarm · PBKDF2/SHA-256 Per-Role Cryptographic Salt Engine
        </div>
      </div>
    </div>
  );
}
