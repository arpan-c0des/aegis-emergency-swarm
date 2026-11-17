import React, { useState } from 'react';
import { 
  Shield, Key, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, X, RefreshCw, Clock, History 
} from 'lucide-react';
import { UserRole, ROLE_CONFIGS } from '../utils/auth';
import { useAuth } from '../contexts/AuthContext';

export const SecurityVaultModal: React.FC = () => {
  const { user, vault, showSecurityModal, closeSecurityModal, updateRolePassword } = useAuth();
  
  const [selectedRoleToEdit, setSelectedRoleToEdit] = useState<UserRole>('incident_commander');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Accessible only by Incident Commander
  if (!showSecurityModal || !user || user.role !== 'incident_commander') return null;

  const rolesList: UserRole[] = [
    'incident_commander',
    'fleet_operator',
    'hospital_staff',
    'driver_police',
    'driver_fire',
    'driver_ambulance',
  ];

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!newPassword) {
      setStatusMessage({ type: 'error', text: 'Password cannot be blank.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      await updateRolePassword(selectedRoleToEdit, newPassword);
      setStatusMessage({
        type: 'success',
        text: `Successfully re-keyed credentials for ${ROLE_CONFIGS[selectedRoleToEdit].title}. New cryptographic salt applied.`
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update credentials.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#F59E0B]/50 bg-[#101014] p-6 shadow-2xl shadow-[#F59E0B]/10 my-8">
        
        {/* Header Ribbon */}
        <div className="flex items-start justify-between border-b border-[#27272A] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B]">
              <Key size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">
                  INCIDENT COMMANDER CONSOLE
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Cryptographic Access & Role Credential Vault
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSecurityModal}
            className="rounded-lg p-1.5 text-[#71717A] hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div 
            className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-xs ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/40 bg-red-500/10 text-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Left Column: Role Selector (5 cols) */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] block mb-1">
              Select Role to Re-Key
            </label>
            <div className="space-y-1.5">
              {rolesList.map((rId) => {
                const config = ROLE_CONFIGS[rId];
                const isSelected = selectedRoleToEdit === rId;
                const cred = vault?.credentials[rId];
                return (
                  <button
                    key={rId}
                    type="button"
                    onClick={() => {
                      setSelectedRoleToEdit(rId);
                      setStatusMessage(null);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-[#F59E0B] bg-[#F59E0B]/10'
                        : 'border-[#27272A] bg-[#16161A] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{config.icon}</span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{config.shortTitle}</div>
                        <div className="text-[9px] text-[#71717A] truncate font-mono">
                          {cred ? `Salt: ${cred.salt.slice(0, 8)}…` : 'Active'}
                        </div>
                      </div>
                    </div>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Update Password Form (7 cols) */}
          <div className="md:col-span-7 bg-[#16161A] border border-[#27272A] rounded-xl p-4">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#27272A]">
              <span className="text-lg">{ROLE_CONFIGS[selectedRoleToEdit].icon}</span>
              <div>
                <h3 className="text-xs font-bold text-white">
                  Update Credentials: {ROLE_CONFIGS[selectedRoleToEdit].title}
                </h3>
                <span className="text-[10px] text-[#71717A]">
                  Category: {ROLE_CONFIGS[selectedRoleToEdit].category}
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#A1A1AA] block mb-1">
                  New Password for {ROLE_CONFIGS[selectedRoleToEdit].shortTitle}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#F59E0B] outline-none transition font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-[#71717A] hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#A1A1AA] block mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-lg bg-[#0F0F12] border border-[#27272A] px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#F59E0B] outline-none transition font-mono"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-2.5 text-xs font-bold bg-[#F59E0B] text-black flex items-center justify-center gap-2 hover:bg-[#D97706] active:scale-95 transition disabled:opacity-50"
                >
                  {loading ? (
                    <span>Re-Hashing and Storing…</span>
                  ) : (
                    <>
                      <Lock size={13} />
                      <span>APPLY NEW PASSWORD & RE-SALT</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Audit info */}
            <div className="mt-4 pt-3 border-t border-[#27272A] text-[10px] text-[#71717A] flex items-center justify-between">
              <span>Updated: {vault?.credentials[selectedRoleToEdit]?.updatedAt ? new Date(vault.credentials[selectedRoleToEdit].updatedAt).toLocaleTimeString() : 'Initial'}</span>
              <span className="text-[#F59E0B] font-mono">SHA-256 SALT ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11px] text-[#71717A]">
          <span>Security Protocol: Aegis Salted Vault v1.0</span>
          <button
            type="button"
            onClick={closeSecurityModal}
            className="text-white hover:underline text-xs"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
