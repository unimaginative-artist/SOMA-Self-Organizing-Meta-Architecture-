import React, { useState } from 'react';
import { Brain, ChevronDown, Zap } from 'lucide-react';

interface ActiveArbiter {
  name: string;
  action: string;
  status: 'thinking' | 'complete' | 'error';
}

interface ArbiterIndicatorProps {
  arbiters: ActiveArbiter[];
  compact?: boolean;
}

const ArbiterIndicator: React.FC<ArbiterIndicatorProps> = ({ 
  arbiters = [],
  compact = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (arbiters.length === 0) return null;

  const thinking = arbiters.filter(a => a.status === 'thinking');
  const hasActivity = thinking.length > 0;

  // Compact mode - just a subtle pill
  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all text-xs"
      >
        <Brain className={`w-3 h-3 text-purple-400 ${hasActivity ? 'animate-pulse' : ''}`} />
        <span className="text-purple-400 font-medium">{arbiters.length}</span>
        {isExpanded && <ChevronDown className="w-3 h-3 text-purple-400" />}
      </button>
    );
  }

  // Full mode - clean inline display
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
      <Brain className={`w-3.5 h-3.5 text-purple-400 ${hasActivity ? 'animate-pulse' : ''}`} />
      
      <div className="flex items-center gap-2">
        {arbiters.slice(0, 3).map((arb, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-zinc-700">→</span>}
            <span className="text-xs text-zinc-400 font-mono">{arb.name}</span>
            {arb.status === 'thinking' && (
              <Zap className="w-2.5 h-2.5 text-yellow-500 animate-pulse" />
            )}
          </div>
        ))}
        {arbiters.length > 3 && (
          <span className="text-xs text-zinc-600 font-mono">+{arbiters.length - 3}</span>
        )}
      </div>
    </div>
  );
};

export default ArbiterIndicator;
