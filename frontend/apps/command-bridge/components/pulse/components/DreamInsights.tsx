import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, TrendingUp, Clock, Play, Square, RefreshCw } from 'lucide-react';
import { MCPClient, DreamReport, DreamStatus } from '../services/MCPClient';

const mcpClient = new MCPClient();

interface Props {
  projectName: string;
}

const DreamInsights: React.FC<Props> = ({ projectName }) => {
  const [reports, setReports] = useState<DreamReport[]>([]);
  const [status, setStatus] = useState<DreamStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [reportsData, statusData] = await Promise.all([
        mcpClient.getDreamReports(5),
        mcpClient.getDreamStatus()
      ]);
      setReports(reportsData.reports);
      setStatus(statusData);
      setRunning(statusData.running);
      setError(null);
    } catch (err) {
      console.error('Failed to load dream data:', err);
      setError('Dream engine unavailable');
    }
  };

  const runDreamCycle = async () => {
    setLoading(true);
    try {
      const result = await mcpClient.runDreamCycle(24, true);
      if (result.success) {
        await loadData();
      } else {
        setError(result.error || 'Dream cycle failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run dream cycle');
    } finally {
      setLoading(false);
    }
  };

  const toggleBackgroundDreams = async () => {
    try {
      if (running) {
        await mcpClient.stopBackgroundDreams();
      } else {
        await mcpClient.startBackgroundDreams(24);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle background dreams');
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-l border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dream Insights</h3>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">AI Pattern Analysis</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center space-x-3">
              <span className="text-zinc-500">Status:</span>
              <span className={`px-2 py-0.5 rounded-full ${
                running ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {running ? 'Active' : 'Idle'}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">{status.dream_count} cycles</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">{status.metrics.success_rate} success</span>
            </div>
            <button
              onClick={toggleBackgroundDreams}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
              title={running ? 'Stop background dreams' : 'Start background dreams'}
            >
              {running ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {/* Run Dream Cycle Button */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <button
          onClick={runDreamCycle}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white disabled:text-zinc-600 px-4 py-2 rounded-xl shadow-lg shadow-purple-500/20 transition-all text-[10px] font-bold uppercase tracking-widest"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{loading ? 'Analyzing...' : 'Run Dream Cycle'}</span>
        </button>
        <p className="text-[9px] text-zinc-600 mt-2 text-center">
          Analyze last 24h for patterns & insights
        </p>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 mb-1">No dream reports yet</p>
            <p className="text-[10px] text-zinc-600">Run a cycle to generate insights</p>
          </div>
        ) : (
          reports.map((report, idx) => (
            <div
              key={idx}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer group"
            >
              {/* Report Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-purple-500/10 rounded-lg">
                    <Brain className="w-3 h-3 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white">Dream #{report.summary.id.slice(0, 8)}</p>
                    <div className="flex items-center space-x-1.5 text-[9px] text-zinc-600">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, Math.round(report.summary.dream_quality * 5)))].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-purple-500" />
                  ))}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="p-2 bg-zinc-950 rounded-lg">
                  <p className="text-[9px] text-zinc-600 uppercase mb-0.5">Analyzed</p>
                  <p className="text-sm font-bold text-white">{report.summary.fragments_count}</p>
                </div>
                <div className="p-2 bg-zinc-950 rounded-lg">
                  <p className="text-[9px] text-zinc-600 uppercase mb-0.5">Proposals</p>
                  <p className="text-sm font-bold text-purple-400">{report.summary.proposals_count}</p>
                </div>
              </div>

              {/* Actions */}
              {report.summary.proposals_count > 0 && (
                <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800">
                  <div className="flex items-center space-x-1 text-[9px] text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>{report.summary.applied_count} applied</span>
                  </div>
                  <span className="text-zinc-700">•</span>
                  <span className="text-[9px] text-zinc-600">{report.summary.queued_count} queued</span>
                </div>
              )}

              {/* Duration */}
              <p className="text-[9px] text-zinc-700 mt-2">
                Duration: {Math.round(report.summary.elapsed_seconds)}s
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DreamInsights;
