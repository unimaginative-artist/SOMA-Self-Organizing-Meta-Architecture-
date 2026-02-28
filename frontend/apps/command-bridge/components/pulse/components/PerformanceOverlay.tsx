/**
 * Performance Overlay
 * 
 * Shows real-time performance metrics over the preview iframe.
 * Displays FPS, memory, bundle size, and performance issues.
 */

import React, { useState, useEffect } from 'react';
import { performanceProfiler, PerformanceMetrics, PerformanceIssue } from '../services/performanceProfiler';
import { Activity, AlertTriangle, Zap } from 'lucide-react';

interface PerformanceOverlayProps {
  visible: boolean;
  onToggle: () => void;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({ visible, onToggle }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = performanceProfiler.onMetrics(setMetrics);
    return unsubscribe;
  }, []);

  if (!visible || !metrics) {
    return null;
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (percent: number) => {
    if (percent < 60) return 'text-green-400';
    if (percent < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const criticalIssues = metrics.issues.filter(i => i.severity === 'critical');
  const hasIssues = metrics.issues.length > 0;

  return (
    <div className="absolute top-2 right-2 z-50">
      {/* Compact View */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md 
            ${hasIssues ? 'bg-red-500/20 border border-red-500/50' : 'bg-gray-900/80 border border-gray-700'}
            hover:scale-105 transition-transform
          `}
        >
          <Activity className="w-4 h-4 text-blue-400" />
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={getFPSColor(metrics.fps)}>
              {metrics.fps.toFixed(0)} FPS
            </span>
            {metrics.memoryUsed > 0 && (
              <span className={getMemoryColor(metrics.memoryPercent)}>
                {(metrics.memoryUsed / 1024 / 1024).toFixed(0)}MB
              </span>
            )}
            {criticalIssues.length > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {criticalIssues.length}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Expanded View */}
      {expanded && (
        <div className="w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl">
          {/* Header */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                title="Hide Performance Monitor"
              >
                ✕
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                title="Minimize"
              >
                −
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="p-3 space-y-3">
            {/* FPS */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">FPS</span>
              <span className={`text-sm font-mono font-medium ${getFPSColor(metrics.fps)}`}>
                {metrics.fps.toFixed(1)}
              </span>
            </div>

            {/* Memory */}
            {metrics.memoryUsed > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Memory</span>
                  <span className={`text-sm font-mono font-medium ${getMemoryColor(metrics.memoryPercent)}`}>
                    {(metrics.memoryUsed / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      metrics.memoryPercent > 80 ? 'bg-red-500' :
                      metrics.memoryPercent > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${metrics.memoryPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Render Stats */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Avg Render</span>
              <span className="text-sm font-mono text-gray-300">
                {metrics.averageRenderTime.toFixed(1)}ms
              </span>
            </div>

            {/* Slow Renders */}
            {metrics.slowRenders > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Slow Renders</span>
                <span className="text-sm font-mono text-yellow-400">
                  {metrics.slowRenders}
                </span>
              </div>
            )}

            {/* Bundle Size */}
            {metrics.bundleSize > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Bundle Size</span>
                <span className="text-sm font-mono text-gray-300">
                  {(metrics.bundleSize / 1024).toFixed(0)}KB
                </span>
              </div>
            )}

            {/* Load Time */}
            {metrics.loadTime > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Load Time</span>
                <span className="text-sm font-mono text-gray-300">
                  {(metrics.loadTime / 1000).toFixed(2)}s
                </span>
              </div>
            )}
          </div>

          {/* Issues */}
          {hasIssues && (
            <div className="border-t border-gray-700">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  Issues ({metrics.issues.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {metrics.issues.map(issue => (
                    <IssueItem key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Issues */}
          {!hasIssues && (
            <div className="border-t border-gray-700 p-3">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <Zap className="w-3 h-3" />
                No performance issues detected
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface IssueItemProps {
  issue: PerformanceIssue;
}

const IssueItem: React.FC<IssueItemProps> = ({ issue }) => {
  const [expanded, setExpanded] = useState(false);

  const getSeverityColor = () => {
    switch (issue.severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getSeverityIcon = () => {
    switch (issue.severity) {
      case 'critical': return '🚫';
      case 'warning': return '⚠️';
      case 'info': return '💡';
    }
  };

  return (
    <div className={`rounded border ${getSeverityColor()}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="text-xs">{getSeverityIcon()}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-300">{issue.message}</div>
          </div>
          <span className="text-xs text-gray-500">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-2 pb-2 border-t border-white/5 pt-2">
          <div className="text-xs text-gray-400">
            <span className="font-medium">Suggestion:</span> {issue.suggestion}
          </div>
        </div>
      )}
    </div>
  );
};
