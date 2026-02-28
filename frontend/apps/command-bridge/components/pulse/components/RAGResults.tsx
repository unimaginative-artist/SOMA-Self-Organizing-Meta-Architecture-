import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Clock, Zap, Database } from 'lucide-react';

interface RAGResult {
  source: string;
  content: string;
  relevance?: number;
  timestamp?: number;
  metadata?: Record<string, any>;
}

interface RAGResultsProps {
  results: RAGResult[];
  searchQuery?: string;
  isLoading?: boolean;
}

const RAGResults: React.FC<RAGResultsProps> = ({ results, searchQuery, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <Brain className="w-3 h-3 text-purple-400 animate-pulse" />
          <span className="text-[10px] text-purple-300 font-bold">Searching memories...</span>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Brain className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
            RAG Memory Retrieval
          </span>
          <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-[8px] font-bold text-purple-300">
            {results.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-purple-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-purple-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-purple-500/20">
          {/* Search Query */}
          {searchQuery && (
            <div className="px-3 py-2 bg-purple-500/5 border-b border-purple-500/10">
              <div className="text-[8px] text-purple-400 uppercase tracking-wider font-bold mb-1">Query</div>
              <div className="text-[9px] text-purple-300 font-mono">{searchQuery}</div>
            </div>
          )}

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {results.map((result, idx) => {
              const isSelected = selectedResult === idx;
              const relevancePercent = result.relevance ? Math.round(result.relevance * 100) : null;

              return (
                <div
                  key={idx}
                  className={`border-b border-purple-500/10 last:border-b-0 transition-colors ${
                    isSelected ? 'bg-purple-500/10' : 'hover:bg-purple-500/5'
                  }`}
                >
                  {/* Result Header */}
                  <button
                    onClick={() => setSelectedResult(isSelected ? null : idx)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Database className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="text-[9px] font-mono text-purple-300">{result.source}</span>
                      </div>
                      {relevancePercent !== null && (
                        <div className="flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5 text-purple-400" />
                          <span className="text-[8px] font-bold text-purple-300">{relevancePercent}%</span>
                        </div>
                      )}
                    </div>

                    {/* Content Preview */}
                    <div className="text-[9px] text-purple-200/70 line-clamp-2 mt-1">
                      {result.content}
                    </div>

                    {/* Metadata */}
                    {result.timestamp && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Clock className="w-2.5 h-2.5 text-purple-500" />
                        <span className="text-[8px] text-purple-500">
                          {new Date(result.timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isSelected && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="bg-purple-950/30 border border-purple-500/20 rounded p-2">
                        <div className="text-[8px] text-purple-400 uppercase tracking-wider font-bold mb-2">
                          Full Content
                        </div>
                        <div className="text-[9px] text-purple-200/90 leading-relaxed whitespace-pre-wrap">
                          {result.content}
                        </div>

                        {/* Additional Metadata */}
                        {result.metadata && Object.keys(result.metadata).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-purple-500/20">
                            <div className="text-[8px] text-purple-400 uppercase tracking-wider font-bold mb-2">
                              Metadata
                            </div>
                            <div className="space-y-1">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                <div key={key} className="flex items-start space-x-2 text-[8px]">
                                  <span className="text-purple-500 font-mono">{key}:</span>
                                  <span className="text-purple-300 font-mono flex-1">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Stats */}
          <div className="px-3 py-2 bg-purple-500/5 border-t border-purple-500/10">
            <div className="flex items-center justify-between text-[8px]">
              <span className="text-purple-500">
                Steve retrieved {results.length} relevant {results.length === 1 ? 'memory' : 'memories'}
              </span>
              {results.some(r => r.relevance) && (
                <span className="text-purple-400 font-bold">
                  Avg: {Math.round((results.reduce((sum, r) => sum + (r.relevance || 0), 0) / results.length) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGResults;
