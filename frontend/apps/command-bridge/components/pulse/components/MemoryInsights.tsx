import React, { useState, useEffect } from 'react';
import { Database, History, TrendingUp, Code, RefreshCw, Clock, FileCode } from 'lucide-react';
import { MnemonicClient, ProjectSnapshot, MemoryStats } from '../services/MnemonicClient';

const mnemonicClient = new MnemonicClient();

interface Props {
  projectName: string;
  onRestoreSnapshot?: (snapshot: ProjectSnapshot) => void;
}

const MemoryInsights: React.FC<Props> = ({ projectName, onRestoreSnapshot }) => {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [history, setHistory] = useState<ProjectSnapshot[]>([]);
  const [patterns, setPatterns] = useState<Array<{ pattern: string; frequency: number; context: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, historyData, patternsData] = await Promise.all([
        mnemonicClient.getStats(),
        mnemonicClient.getProjectHistory(projectName, 10),
        mnemonicClient.getLearnedPatterns(projectName)
      ]);
      
      setStats(statsData);
      setHistory(historyData);
      setPatterns(patternsData);
    } catch (error) {
      console.error('Failed to load memory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-l border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Memory Insights</h3>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Project History & Patterns</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Memory Stats */}
      {stats && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Memory Distribution</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-zinc-950 rounded-lg border border-red-500/20">
              <p className="text-[8px] text-zinc-600 uppercase mb-1">Hot</p>
              <p className="text-xs font-bold text-red-400">{stats.hot.count}</p>
              <p className="text-[8px] text-zinc-700">{formatBytes(stats.hot.sizeBytes)}</p>
            </div>
            <div className="p-2 bg-zinc-950 rounded-lg border border-yellow-500/20">
              <p className="text-[8px] text-zinc-600 uppercase mb-1">Warm</p>
              <p className="text-xs font-bold text-yellow-400">{stats.warm.count}</p>
              <p className="text-[8px] text-zinc-700">{formatBytes(stats.warm.sizeBytes)}</p>
            </div>
            <div className="p-2 bg-zinc-950 rounded-lg border border-blue-500/20">
              <p className="text-[8px] text-zinc-600 uppercase mb-1">Cold</p>
              <p className="text-xs font-bold text-blue-400">{stats.cold.count}</p>
              <p className="text-[8px] text-zinc-700">{formatBytes(stats.cold.sizeBytes)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Project History */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2 mb-3">
            <History className="w-3.5 h-3.5 text-zinc-500" />
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Project History</p>
          </div>
          
          {history.length === 0 ? (
            <div className="text-center py-6">
              <History className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
              <p className="text-[10px] text-zinc-600">No saved snapshots yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((snapshot, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-blue-500/30 transition-all cursor-pointer group"
                  onClick={() => onRestoreSnapshot?.(snapshot)}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <FileCode className="w-3 h-3 text-blue-400" />
                      <p className="text-[10px] font-bold text-white">{snapshot.projectName}</p>
                    </div>
                    <div className="flex items-center space-x-1 text-[9px] text-zinc-600">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatDate(snapshot.timestamp)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-[9px] text-zinc-500">
                    <span>{snapshot.metadata.filesCount} files</span>
                    <span className="text-zinc-700">•</span>
                    <span>{snapshot.metadata.linesOfCode.toLocaleString()} lines</span>
                  </div>

                  {snapshot.metadata.description && (
                    <p className="text-[9px] text-zinc-600 mt-1.5 line-clamp-1">{snapshot.metadata.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learned Patterns */}
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Learned Patterns</p>
          </div>

          {patterns.length === 0 ? (
            <div className="text-center py-6">
              <Code className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
              <p className="text-[10px] text-zinc-600">No patterns detected yet</p>
              <p className="text-[9px] text-zinc-700 mt-1">Keep building to discover insights</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patterns.slice(0, 5).map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-[10px] font-mono text-emerald-400">{pattern.pattern}</p>
                    <span className="text-[9px] text-zinc-600 px-1.5 py-0.5 bg-zinc-950 rounded">
                      ×{pattern.frequency}
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-600">{pattern.context}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
        <p className="text-[8px] text-zinc-700 text-center">
          Auto-saves every 60 seconds • Powered by SOMA Memory
        </p>
      </div>
    </div>
  );
};

export default MemoryInsights;
