import React, { useState, useEffect } from 'react';
import { History, Clock, CheckCircle, XCircle, Loader2, Target, TrendingUp } from 'lucide-react';
import { PulseClient } from '../services/PulseClient';

const pulseClient = new PulseClient();

interface HistoricalPlan {
  planId: string;
  goal: string;
  summary: string;
  steps: any[];
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  totalEstimate?: string;
  actualDuration?: string;
  arbitersUsed?: string[];
  results?: any;
}

interface PlanHistoryProps {
  onLoadPlan?: (plan: HistoricalPlan) => void;
  workspace?: string;
}

const PlanHistory: React.FC<PlanHistoryProps> = ({ onLoadPlan, workspace = 'default' }) => {
  const [plans, setPlans] = useState<HistoricalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [workspace]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await pulseClient.getPlanHistory(workspace, 20);
      if (response.success) {
        setPlans(response.plans || []);
      }
    } catch (error) {
      console.error('[PlanHistory] Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPlan = async (planId: string) => {
    try {
      const response = await pulseClient.loadPlan(planId);
      if (response.success && response.plan && onLoadPlan) {
        onLoadPlan(response.plan);
      }
    } catch (error) {
      console.error('[PlanHistory] Failed to load plan:', error);
    }
  };

  const statusConfig = {
    active: { color: 'blue', icon: Clock, label: 'In Progress' },
    completed: { color: 'emerald', icon: CheckCircle, label: 'Completed' },
    failed: { color: 'red', icon: XCircle, label: 'Failed' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2 text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading plan history...</span>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <History className="w-12 h-12 text-zinc-700" />
        <div className="text-center">
          <p className="text-sm text-zinc-400 font-bold">No Plans Yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            Create your first plan to start building execution history
          </p>
        </div>
      </div>
    );
  }

  const stats = {
    total: plans.length,
    completed: plans.filter(p => p.status === 'completed').length,
    active: plans.filter(p => p.status === 'active').length,
    avgAccuracy: plans
      .filter(p => p.results?.accuracyScore !== null)
      .reduce((sum, p) => sum + (p.results?.accuracyScore || 0), 0) / 
      plans.filter(p => p.results?.accuracyScore !== null).length || 0
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-zinc-200">Plan History</h2>
          </div>
          <button
            onClick={loadHistory}
            className="p-1.5 text-zinc-500 hover:text-purple-400 transition-colors"
            title="Refresh"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-zinc-900/50 rounded p-2 border border-zinc-800">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Total</div>
            <div className="text-sm font-bold text-zinc-200">{stats.total}</div>
          </div>
          <div className="bg-emerald-500/10 rounded p-2 border border-emerald-500/30">
            <div className="text-[9px] text-emerald-400 uppercase tracking-wider">Completed</div>
            <div className="text-sm font-bold text-emerald-300">{stats.completed}</div>
          </div>
          <div className="bg-blue-500/10 rounded p-2 border border-blue-500/30">
            <div className="text-[9px] text-blue-400 uppercase tracking-wider">Active</div>
            <div className="text-sm font-bold text-blue-300">{stats.active}</div>
          </div>
          <div className="bg-purple-500/10 rounded p-2 border border-purple-500/30">
            <div className="text-[9px] text-purple-400 uppercase tracking-wider flex items-center space-x-1">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>Accuracy</span>
            </div>
            <div className="text-sm font-bold text-purple-300">{Math.round(stats.avgAccuracy)}%</div>
          </div>
        </div>
      </div>

      {/* Plan List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {plans.map((plan) => {
          const config = statusConfig[plan.status];
          const StatusIcon = config.icon;
          const isSelected = selectedPlan === plan.planId;

          return (
            <button
              key={plan.planId}
              onClick={() => {
                setSelectedPlan(isSelected ? null : plan.planId);
                if (!isSelected) handleLoadPlan(plan.planId);
              }}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-purple-500/10 border-purple-500/30'
                  : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-zinc-200 line-clamp-1">{plan.goal}</span>
                </div>
                <div className={`flex items-center space-x-1 px-1.5 py-0.5 bg-${config.color}-500/10 border border-${config.color}-500/30 rounded`}>
                  <StatusIcon className={`w-2.5 h-2.5 text-${config.color}-400`} />
                  <span className={`text-[8px] font-bold text-${config.color}-300`}>{config.label}</span>
                </div>
              </div>

              {/* Summary */}
              {plan.summary && (
                <p className="text-[10px] text-zinc-500 line-clamp-2 mb-2">{plan.summary}</p>
              )}

              {/* Meta */}
              <div className="flex items-center space-x-3 text-[9px] text-zinc-600">
                <div className="flex items-center space-x-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                </div>
                <div>{plan.steps?.length || 0} steps</div>
                {plan.totalEstimate && <div>{plan.totalEstimate}</div>}
                {plan.results?.accuracyScore !== undefined && plan.results?.accuracyScore !== null && (
                  <div className="flex items-center space-x-1 text-purple-400 font-bold">
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span>{Math.round(plan.results.accuracyScore)}%</span>
                  </div>
                )}
              </div>

              {/* Arbiters */}
              {plan.arbitersUsed && plan.arbitersUsed.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {plan.arbitersUsed.slice(0, 3).map((arbiter, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[8px] font-mono text-cyan-300"
                    >
                      {arbiter}
                    </span>
                  ))}
                  {plan.arbitersUsed.length > 3 && (
                    <span className="px-1.5 py-0.5 text-[8px] text-zinc-600">
                      +{plan.arbitersUsed.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Learning Indicator */}
      <div className="p-3 border-t border-zinc-800 bg-purple-500/5">
        <div className="flex items-center space-x-2 text-[9px] text-purple-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>System learns from every completed plan to improve accuracy</span>
        </div>
      </div>
    </div>
  );
};

export default PlanHistory;
