import React from 'react';
import { Bot, Shield, AlertTriangle, Radio } from 'lucide-react';

interface Props {
  transcript: Array<{ agent: string; assessment: string }>;
  commandPlan: string;
}

export const AgentActivityFeed: React.FC<Props> = ({ transcript, commandPlan }) => {
  const getBadgeColor = (agent: string) => {
    switch (agent) {
      case "MedicalAgent": return "bg-red-950 text-red-400 border-red-800";
      case "FireAgent": return "bg-orange-950 text-orange-400 border-orange-800";
      case "PoliceAgent": return "bg-blue-950 text-blue-400 border-blue-800";
      case "LogisticsAgent": return "bg-amber-950 text-amber-400 border-amber-800";
      default: return "bg-purple-950 text-purple-400 border-purple-800";
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg flex flex-col h-[520px]">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="text-blue-400" size={18} />
          <span className="font-bold text-sm text-gray-200">Autonomous Agent Deliberation Loop</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">Gemini 2.5 Flash Swarm</span>
      </div>

      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {transcript.length === 0 ? (
          <div className="text-center text-gray-600 text-sm mt-20">
            Awaiting emergency trigger. Initiate simulation tick to watch autonomous agents negotiate resources.
          </div>
        ) : (
          transcript.map((item, idx) => (
            <div key={idx} className="bg-gray-950/70 border border-gray-800 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded font-mono border ${getBadgeColor(item.agent)}`}>
                  {item.agent}
                </span>
                <span className="text-[10px] text-gray-500 uppercase">Analysis Phase</span>
              </div>
              <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed font-sans">
                {item.assessment}
              </p>
            </div>
          ))
        )}

        {commandPlan && (
          <div className="bg-purple-950/30 border border-purple-800/80 rounded p-3 mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="text-purple-400" size={16} />
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                Final Incident Action Plan (Command Order)
              </span>
            </div>
            <p className="text-xs text-purple-200 whitespace-pre-line font-sans leading-relaxed">
              {commandPlan}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};