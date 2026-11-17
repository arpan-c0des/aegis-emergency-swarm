import React, { useState } from 'react';
import { 
  Shield, Key, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, Sparkles, RefreshCw 
} from 'lucide-react';
import { UserRole, ROLE_CONFIGS } from '../utils/auth';
import { useAuth } from '../contexts/AuthContext';

export const VaultSetupModal: React.FC = () => {
  const { isInitialized, initializeSystem } = useAuth();
  
  const [commanderPass, setCommanderPass] = useState('');
  const [commanderConfirm, setCommanderConfirm] = useState('');
  const [fleetPass, setFleetPass] = useState('');
  const [hospitalPass, setHospitalPass] = useState('');
  const [policePass, setPolicePass] = useState('');
  const [firePass, setFirePass] = useState('');
  const [ambPass, setAmbPass] = useState('');

  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already initialized, do not show setup modal
  if (isInitialized) return null;

  const handlePreFillTacticalPasscodes = () => {
    setCommanderPass('AegisCommander2026!');
    setCommanderConfirm('AegisCommander2026!');
    setFleetPass('FleetUberDispatch77#');
    setHospitalPass('TraumaBedIntake99#');
    setPolicePass('PoliceIntercept02#');
    setFirePass('FireEngineAlpha03#');
    setAmbPass('ParamedicAmbulance07#');
    setErrorMessage('');
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!commanderPass) {
      setErrorMessage('Incident Commander master password is required.');
      return;
    }
    if (commanderPass !== commanderConfirm) {
      setErrorMessage('Incident Commander passwords do not match.');
      return;
    }
    if (commanderPass.length < 6) {
      setErrorMessage('Incident Commander master password must be at least 6 characters.');
      return;
    }

    if (!fleetPass || !hospitalPass || !policePass || !firePass || !ambPass) {
      setErrorMessage('Please provision passwords for all operational roles before activation.');
      return;
    }

    setLoading(true);
    try {
      const passwords: Record<UserRole, string> = {
        incident_commander: commanderPass,
        fleet_operator: fleetPass,
        hospital_staff: hospitalPass,
        driver_police: policePass,
        driver_fire: firePass,
        driver_ambulance: ambPass,
      };

      await initializeSystem(passwords);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize security vault.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#F59E0B]/40 bg-[#0F0F12] p-6 shadow-2xl shadow-[#F59E0B]/10 my-8">
        
        {/* Header Ribbon */}
        <div className="flex items-start justify-between border-b border-[#27272A] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B]">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">
                  SYSTEM SECURITY INITIALIZATION
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-ping" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                First-Time Cryptographic Credential Vault Activation
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePreFillTacticalPasscodes}
            className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition"
            title="Auto-fill default strong tactical passcodes"
          >
            <Sparkles size={13} />
            <span>Pre-Fill Tactical Passwords</span>
          </button>
        </div>

        <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
          Welcome to the <b>AEGIS Emergency Governance & Swarm Response System</b>. 
          As the <b>Incident Commander</b>, you must set your master password and provision initial credentials for all dispatch roles. 
          Each role’s password is stored with a unique 32-character cryptographic salt (SHA-256). You can update these credentials at any time in the security vault.
        </p>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertTriangle size={16} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleInitialize} className="space-y-5">
          {/* SECTION 1: Incident Commander Master Password */}
          <div className="rounded-xl border border-[#F59E0B]/30 bg-[#16161A] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🛡️</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Incident Commander Master Credentials (Full Authority)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#A1A1AA] block mb-1">
                  Master Password <span className="text-[#F59E0B]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={commanderPass}
                    onChange={(e) => setCommanderPass(e.target.value)}
                    placeholder="Enter Master Password"
                    className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#F59E0B] outline-none transition font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#A1A1AA] block mb-1">
                  Confirm Master Password <span className="text-[#F59E0B]">*</span>
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={commanderConfirm}
                  onChange={(e) => setCommanderConfirm(e.target.value)}
                  placeholder="Re-enter Master Password"
                  className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#F59E0B] outline-none transition font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Operations Passwords (Fleet & Hospital) */}
          <div className="rounded-xl border border-[#27272A] bg-[#16161A] p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              2. Operations & Intake Specialists Passwords
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fleet Operator */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">🗺️</span>
                  <label className="text-[11px] font-bold text-[#3B82F6]">
                    Fleet Uber Dispatch Operator
                  </label>
                </div>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={fleetPass}
                  onChange={(e) => setFleetPass(e.target.value)}
                  placeholder="Set Fleet Operator Password"
                  className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#3B82F6] outline-none transition font-mono"
                  required
                />
                <span className="text-[10px] text-[#71717A] mt-0.5 block">Access: Fleet Uber (/fleet)</span>
              </div>

              {/* Hospital Staff */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">🏥</span>
                  <label className="text-[11px] font-bold text-[#10B981]">
                    Hospital Bed Intake Specialist
                  </label>
                </div>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={hospitalPass}
                  onChange={(e) => setHospitalPass(e.target.value)}
                  placeholder="Set Bed Intake Password"
                  className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#10B981] outline-none transition font-mono"
                  required
                />
                <span className="text-[10px] text-[#71717A] mt-0.5 block">Access: Bed Intake (/hospitals)</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Field Driver Units Passwords */}
          <div className="rounded-xl border border-[#27272A] bg-[#16161A] p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              3. Field Driver Cockpits Passwords (Vehicle Locked)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Police */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">🚓</span>
                  <label className="text-[11px] font-bold text-[#6366F1]">
                    Police Driver (POL-02)
                  </label>
                </div>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={policePass}
                  onChange={(e) => setPolicePass(e.target.value)}
                  placeholder="Police Password"
                  className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#6366F1] outline-none transition font-mono"
                  required
                />
                <span className="text-[10px] text-[#71717A] mt-0.5 block">Fixed to POL-02 Interceptor</span>
              </div>

              {/* Fire */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">🚒</span>
                  <label className="text-[11px] font-bold text-[#EF4444]">
                    Fire Driver (FIRE-03)
                  </label>
                </div>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={firePass}
                  onChange={(e) => setFirePass(e.target.value)}
                  placeholder="Fire Password"
                  className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#EF4444] outline-none transition font-mono"
                  required
                />
                <span className="text-[10px] text-[#71717A] mt-0.5 block">Fixed to FIRE-03 Pumper</span>
              </div>

              {/* Ambulance */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">🚑</span>
                  <label className="text-[11px] font-bold text-[#EC4899]">
                    Ambulance Driver (AMB-07)
                  </label>
                </div>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={ambPass}
                  onChange={(e) => setAmbPass(e.target.value)}
                  placeholder="Ambulance Password"
                  className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#EC4899] outline-none transition font-mono"
                  required
                />
                <span className="text-[10px] text-[#71717A] mt-0.5 block">Fixed to AMB-07 Paramedic</span>
              </div>
            </div>
          </div>

          {/* Visibility toggle & Submit button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition"
            >
              {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showPasswords ? "Hide Plaintext Passwords" : "Show Plaintext Passwords"}</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#D97706] active:scale-95 transition disabled:opacity-50 shadow-lg shadow-[#F59E0B]/20"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Activating Cryptographic Vault…</span>
                </>
              ) : (
                <>
                  <Lock size={14} />
                  <span>SAVE & ACTIVATE SYSTEM SECURITY</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
