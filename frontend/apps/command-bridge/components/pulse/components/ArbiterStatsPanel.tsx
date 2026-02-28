import React, { useState } from 'react';
import {
  Brain, Zap, Clock, TrendingUp, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Activity, BarChart3, Settings
} from 'lucide-react';

interface ArbiterStat {
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  requestCount: number;
  avgResponseTime: number;
  lastUsed?: number;
  capabilities: string[];
  load: number; // 0-100
}

interface ArbiterStatsPanelProps {
  arbiters: ArbiterStat[];
  onSelectArbiter?: (name: string) => void;
  onRefresh?: () => void;
}

const ArbiterStatsPanel: React.FC<ArbiterStatsPanelProps> = ({
  arbiters = [],
  onSelectArbiter,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'responseTime'>('usage');

  const activeArbiters = arbiters.filter(a => a.status === 'active' || a.status === 'busy');
  const totalRequests = arbiters.reduce((sum, a) => sum + a.requestCount, 0);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          icon: CheckCircle
        };
      case 'busy':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          icon: Activity
        };
      case 'idle':
        return {
          color: 'text-zinc-600',
          bg: 'bg-zinc-800/50',
          border: 'border-zinc-800',
          icon: CheckCircle
        };
      case 'error':
        return {
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          icon: AlertCircle
        };
      default:
        return {
          color: 'text-zinc-500',
          bg: 'bg-zinc-800/50',
          border: 'border-zinc-800',
          icon: Activity
        };
    }
  };

  const sortedArbiters = [...arbiters].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'usage':
        return b.requestCount - a.requestCount;
      case 'responseTime':
        return a.avgResponseTime - b.avgResponseTime;
      default:
        return 0;
    }
  });

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatLastUsed = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className={`border-t border-zinc-800/50 bg-zinc-950/30 flex flex-col transition-all duration-300 ${isExpanded ? 'min-h-[300px]' : 'h-12 overflow-hidden'}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-12 px-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors group shrink-0"
      >
        <div className="flex items-center gap-3">
          <Brain className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Arbiter Intelligence
          </span>
          <div className="flex items-center gap-2 text-[9px]">
            <div className={`w-1.5 h-1.5 rounded-full ${activeArbiters.length > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-700'}`} />
            <span className="text-zinc-600">{activeArbiters.length}/{arbiters.length} active</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              className="p-1 hover:bg-blue-500/20 text-blue-500 rounded transition-all"
              title="Refresh Stats"
            >
              <Settings className="w-3 h-3" />
            </button>
          )}
          {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronUp className="w-3 h-3 text-zinc-600" />}
        </div>
      </button>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar animate-in fade-in duration-300">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-1 font-bold uppercase">
                <BarChart3 className="w-3 h-3 text-blue-500" />
                Total Requests
              </div>
              <div className="text-lg font-mono text-zinc-100">{totalRequests}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-1 font-bold uppercase">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Active Now
              </div>
              <div className="text-lg font-mono text-zinc-100">{activeArbiters.length}</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-1 font-bold uppercase">
                <Clock className="w-3 h-3 text-yellow-500" />
                Avg Response
              </div>
              <div className="text-lg font-mono text-zinc-100">
                {arbiters.length > 0 
                  ? formatTime(Math.round(arbiters.reduce((sum, a) => sum + a.avgResponseTime, 0) / arbiters.length))
                  : '0ms'}
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase font-bold">Sort:</span>
            {[
              { id: 'usage', label: 'Usage' },
              { id: 'name', label: 'Name' },
              { id: 'responseTime', label: 'Speed' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id as any)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                  sortBy === option.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Arbiter List */}
          <div className="space-y-2">
            {sortedArbiters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600 space-y-2">
                <Brain className="w-12 h-12 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-wider">No Arbiters Connected</p>
              </div>
            ) : (
              sortedArbiters.map((arbiter) => {
                const statusConfig = getStatusConfig(arbiter.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={arbiter.name}
                    onClick={() => onSelectArbiter?.(arbiter.name)}
                    className={`p-3 rounded-lg border ${statusConfig.border} ${statusConfig.bg} hover:bg-opacity-20 transition-all cursor-pointer group`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color} shrink-0`} />
                        <span className="font-mono text-sm text-zinc-100 truncate">
                          {arbiter.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {formatLastUsed(arbiter.lastUsed)}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1">Requests</div>
                        <div className="text-sm font-mono text-zinc-300">{arbiter.requestCount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1">Response</div>
                        <div className="text-sm font-mono text-zinc-300">{formatTime(arbiter.avgResponseTime)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1">Load</div>
                        <div className="text-sm font-mono text-zinc-300">{arbiter.load}%</div>
                      </div>
                    </div>

                    {/* Load Bar */}
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          arbiter.load > 80 ? 'bg-red-500' :
                          arbiter.load > 50 ? 'bg-yellow-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${arbiter.load}%` }}
                      />
                    </div>

                    {/* Capabilities */}
                    {arbiter.capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {arbiter.capabilities.slice(0, 3).map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700 rounded text-[9px] text-zinc-500 font-mono"
                          >
                            {cap}
                          </span>
                        ))}
                        {arbiter.capabilities.length > 3 && (
                          <span className="px-2 py-0.5 text-[9px] text-zinc-600 font-mono">
                            +{arbiter.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArbiterStatsPanel;
