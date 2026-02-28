import React, { useState, useEffect } from 'react';
import { Wrench, Play, TrendingUp, Clock, Layers, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { PulseClient } from '../services/PulseClient';
import ToolExecutor from './ToolExecutor';

const pulseClient = new PulseClient();

interface Tool {
  name: string;
  description: string;
  category: string;
  parameters?: any;
  metadata?: {
    createdBy?: string;
    createdAt?: number;
    usageCount?: number;
  };
}

interface ToolStats {
  totalTools: number;
  totalExecutions: number;
  categories: Record<string, number>;
}

interface ToolRegistryProps {
  onExecuteTool?: (toolName: string, params: any) => void;
}

const ToolRegistry: React.FC<ToolRegistryProps> = ({ onExecuteTool }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [stats, setStats] = useState<ToolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [executingTool, setExecutingTool] = useState<string | null>(null);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const result = await pulseClient.listSteveTools();
      if (result.success) {
        setTools(result.tools || []);
        setStats(result.stats || null);
      }
    } catch (error) {
      console.error('[ToolRegistry] Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedTools = tools.reduce((acc, tool) => {
    const category = tool.category || 'uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const categoryIcons: Record<string, any> = {
    utility: Wrench,
    network: Zap,
    filesystem: Layers,
    system: TrendingUp,
    analysis: Clock
  };

  const categoryColors: Record<string, string> = {
    utility: 'cyan',
    network: 'purple',
    filesystem: 'blue',
    system: 'emerald',
    analysis: 'amber'
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-zinc-500 text-xs">
          <Wrench className="w-3 h-3 animate-spin" />
          <span>Loading tools...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Steve's Tools</h3>
          </div>
          <button
            onClick={loadTools}
            className="p-1 text-zinc-500 hover:text-cyan-400 transition-colors"
            title="Refresh"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900/50 rounded px-2 py-1 border border-zinc-800">
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Tools</div>
              <div className="text-sm font-bold text-cyan-400">{stats.totalTools || 0}</div>
            </div>
            <div className="bg-zinc-900/50 rounded px-2 py-1 border border-zinc-800">
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Executions</div>
              <div className="text-sm font-bold text-emerald-400">{stats.totalExecutions || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {Object.keys(groupedTools).length === 0 ? (
          <div className="p-4 text-center">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs text-zinc-600">No tools registered yet</p>
            <p className="text-[10px] text-zinc-700 mt-1">Ask Steve to create tools!</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {Object.entries(groupedTools).map(([category, categoryTools]) => {
              const Icon = categoryIcons[category] || Wrench;
              const color = categoryColors[category] || 'zinc';
              const isExpanded = expandedCategory === category;

              return (
                <div key={category} className="border border-zinc-800/50 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    className="w-full flex items-center justify-between p-2 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />}
                      <Icon className={`w-3 h-3 text-${color}-400`} />
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{category}</span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-600">{categoryTools.length}</span>
                  </button>

                  {/* Tools in Category */}
                  {isExpanded && (
                    <div className="p-1 space-y-1">
                      {categoryTools.map((tool) => (
                        <button
                          key={tool.name}
                          onClick={() => setSelectedTool(selectedTool?.name === tool.name ? null : tool)}
                          className={`w-full text-left p-2 rounded transition-colors ${
                            selectedTool?.name === tool.name
                              ? 'bg-cyan-500/10 border border-cyan-500/20'
                              : 'bg-zinc-900/30 hover:bg-zinc-900/50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-mono text-zinc-200 truncate">{tool.name}</div>
                              <div className="text-[9px] text-zinc-500 mt-0.5 line-clamp-2">{tool.description}</div>
                            </div>
                            {tool.metadata?.usageCount !== undefined && tool.metadata.usageCount > 0 && (
                              <div className="ml-2 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400">
                                {tool.metadata.usageCount}
                              </div>
                            )}
                          </div>

                          {/* Expanded Tool Details */}
                          {selectedTool?.name === tool.name && (
                            <div className="mt-2 pt-2 border-t border-zinc-800 space-y-2">
                              {tool.metadata?.createdBy && (
                                <div className="text-[8px] text-zinc-600">
                                  Created by <span className="text-cyan-400 font-bold">{tool.metadata.createdBy}</span>
                                  {tool.metadata.createdAt && (
                                    <span> • {new Date(tool.metadata.createdAt).toLocaleDateString()}</span>
                                  )}
                                </div>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExecutingTool(tool.name);
                                }}
                                className="w-full flex items-center justify-center space-x-1 px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded text-[9px] font-bold text-cyan-400 transition-colors"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>Execute Tool</span>
                              </button>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tool Executor Modal */}
      {executingTool && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <ToolExecutor
              toolName={executingTool}
              onClose={() => setExecutingTool(null)}
              onExecutionComplete={(result) => {
                console.log('[ToolRegistry] Tool executed:', result);
                if (onExecuteTool) {
                  onExecuteTool(executingTool, result);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolRegistry;
