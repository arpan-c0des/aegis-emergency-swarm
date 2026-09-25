import React from 'react';
import { Activity, ShieldAlert, Truck, Fuel, Bed } from 'lucide-react';

interface Props {
  state: any;
  solanaAudit: any;
}

export const ResourceDashboard: React.FC<Props> = ({ state, solanaAudit }) => {
  if (!state) return <div className="text-gray-500 text-sm">Telemetry loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {/* Active Incidents */}
      <div className="bg-gray-900 border border-red-900/50 p-3 rounded-lg">
        <div className="flex justify-between items-center text-xs text-red-400 font-bold uppercase mb-1">
          <span>Active Hazards</span>
          <ShieldAlert size={16} />
        </div>
        <div className="text-xl font-bold text-white">
          {Object.keys(state.incidents || {}).length} Active
        </div>
        <div className="text-xs text-gray-400 mt-1 truncate">
          {(Object.values(state.incidents || {})[0] as any)?.details || "No active threats"}
        </div>
      </div>

      {/* Hospital Bed Availability */}
      <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg">
        <div className="flex justify-between items-center text-xs text-blue-400 font-bold uppercase mb-1">
          <span>Trauma Capacity</span>
          <Bed size={16} />
        </div>
        <div className="text-xl font-bold text-white">
          {state.hospitals?.H1?.available_beds ?? 0} <span className="text-xs font-normal text-gray-400">/ {state.hospitals?.H1?.total_beds ?? 0} H1 Beds</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          H2 Clinic: {state.hospitals?.H2?.available_beds ?? 0} non-trauma beds
        </div>
      </div>

      {/* Emergency Fleet */}
      <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg">
        <div className="flex justify-between items-center text-xs text-amber-400 font-bold uppercase mb-1">
          <span>Fleet Readiness</span>
          <Truck size={16} />
        </div>
        <div className="text-xl font-bold text-white">
          {Object.values(state.units || {}).filter((u: any) => u.status === "available").length} <span className="text-xs font-normal text-gray-400">Available</span>
        </div>
        <div className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
          <Fuel size={12} className="text-red-400" />
          <span>AMB_01: {state.units?.AMB_01?.fuel_remaining_minutes}m fuel (CRITICAL)</span>
        </div>
      </div>

      {/* Solana Cryptographic Ledger Status */}
      <div className="bg-gray-900 border border-purple-900/50 p-3 rounded-lg">
        <div className="flex justify-between items-center text-xs text-purple-400 font-bold uppercase mb-1">
          <span>Solana Audit Ledger</span>
          <Activity size={16} />
        </div>
        <div className="text-sm font-bold text-purple-200 truncate">
          {solanaAudit ? `${solanaAudit.decision_sha256?.substring(0, 16)}...` : "Genesis State Verified"}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {solanaAudit ? (
            <a 
              href={solanaAudit.explorer_url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-purple-400 underline hover:text-purple-300"
            >
              Verify On-Chain Devnet ↗
            </a>
          ) : (
            "Cluster: devnet (ready)"
          )}
        </div>
      </div>
    </div>
  );
};