import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, Clock, Target, Brain, BarChart3, Activity } from 'lucide-react';

interface ModelMetrics {
  modelId: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic';
  avgLatency: number;
  successRate: number;
  totalRequests: number;
  cost: number;
  qualityScore: number;
}

interface RoutingDecision {
  id: string;
  query: string;
  selectedModel: string;
  reason: string;
  timestamp: number;
  latency: number;
  success: boolean;
}

interface AdaptiveRouterPanelProps {
  isVisible: boolean;
}

const AdaptiveRouterPanel: React.FC<AdaptiveRouterPanelProps> = ({ isVisible }) => {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [decisions, setDecisions] = useState<RoutingDecision[]>([]);
  const [learnedPatterns, setLearnedPatterns] = useState<string[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/router/metrics');
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics || []);
          setDecisions(data.recentDecisions || []);
          setLearnedPatterns(data.patterns || []);
        }
      } catch (err) {
        console.error('Failed to fetch router metrics', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
  const avgQuality = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length 
    : 0;

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-30 flex flex-col overflow-hidden border-l border-blue-500/20">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-blue-950/50 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Adaptive Router</h2>
              <p className="text-[10px] text-zinc-500">Intelligent model selection & optimization</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] font-bold text-blue-400">
              {totalRequests} ROUTED
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Avg Quality</p>
            <p className="text-lg font-bold text-emerald-400">{avgQuality.toFixed(1)}/10</p>
          </div>
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Total Requests</p>
            <p className="text-lg font-bold text-blue-400">{totalRequests}</p>
          </div>
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Patterns</p>
            <p className="text-lg font-bold text-purple-400">{learnedPatterns.length}</p>
          </div>
        </div>
      </div>

      {/* Model Performance */}
      <div className="p-4 border-b border-zinc-800 overflow-x-auto custom-scrollbar">
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Model Performance</h3>
        </div>
        <div className="space-y-2">
          {metrics.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-4">No metrics available</p>
          ) : (
            metrics.map((model) => (
              <div
                key={model.modelId}
                className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      model.provider === 'gemini' ? 'bg-blue-400' :
                      model.provider === 'openai' ? 'bg-emerald-400' :
                      'bg-purple-400'
                    }`} />
                    <span className="text-sm font-medium text-white">{model.name}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      model.provider === 'gemini' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                      model.provider === 'openai' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    }`}>
                      {model.provider}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">Quality</p>
                      <p className="text-xs font-bold text-emerald-400">{model.qualityScore}/10</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">Success</p>
                      <p className="text-xs font-bold text-blue-400">{model.successRate}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <p className="text-zinc-500">Latency</p>
                    <p className="text-white font-medium">{model.avgLatency}ms</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Requests</p>
                    <p className="text-white font-medium">{model.totalRequests}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Cost</p>
                    <p className="text-white font-medium">${model.cost.toFixed(3)}</p>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                    style={{ width: `${model.qualityScore * 10}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Routing Decisions */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        <div className="flex items-center space-x-2 mb-3">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Decisions</h3>
        </div>
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center space-y-3">
            <Activity className="w-8 h-8 text-zinc-700" />
            <p className="text-xs text-zinc-600">No routing decisions yet</p>
          </div>
        ) : (
          decisions.slice(0, 10).map((decision) => (
            <div
              key={decision.id}
              className={`p-3 rounded-lg border ${
                decision.success 
                  ? 'bg-emerald-950/30 border-emerald-500/30' 
                  : 'bg-red-950/30 border-red-500/30'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{decision.query}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">{decision.reason}</p>
                </div>
                <div className={`ml-2 w-2 h-2 rounded-full ${
                  decision.success ? 'bg-emerald-400' : 'bg-red-400'
                }`} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span className="flex items-center space-x-1">
                  <Brain className="w-3 h-3" />
                  <span>{decision.selectedModel}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{decision.latency}ms</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Learned Patterns */}
      {learnedPatterns.length > 0 && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Learned Patterns</h4>
          </div>
          <div className="space-y-1">
            {learnedPatterns.slice(0, 3).map((pattern, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-2 text-[10px] text-zinc-400"
              >
                <div className="w-1 h-1 rounded-full bg-purple-500" />
                <span>{pattern}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveRouterPanel;
