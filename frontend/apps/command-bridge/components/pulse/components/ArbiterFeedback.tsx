import React, { useState } from 'react';
import { Network, ChevronDown, ChevronUp, Cpu, Zap, Brain } from 'lucide-react';

interface ArbiterStep {
  arbiter: string;
  action: string;
  timestamp?: number;
  duration?: number;
}

interface ArbiterFeedbackProps {
  arbiters: string[];
  workflow?: ArbiterStep[];
  isExpanded?: boolean;
}

const ArbiterFeedback: React.FC<ArbiterFeedbackProps> = ({ 
  arbiters, 
  workflow, 
  isExpanded: initialExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  if (!arbiters || arbiters.length === 0) {
    return null;
  }

  const arbiterIcons: Record<string, any> = {
    'ReasoningChamber': Brain,
    'CodeObservationArbiter': Cpu,
    'EngineeringSwarmArbiter': Network,
    'SteveArbiter': Zap,
    'VisionProcessingArbiter': Brain,
    'AdaptiveLearningRouter': Network
  };

  return (
    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-cyan-500/10 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Network className="w-3 h-3 text-cyan-400" />
          <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
            Multi-Arbiter Coordination
          </span>
          <span className="px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-[8px] font-bold text-cyan-300">
            {arbiters.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-cyan-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-cyan-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-cyan-500/20 p-2 space-y-2">
          {/* Arbiter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {arbiters.map((arbiter, idx) => {
              const Icon = arbiterIcons[arbiter] || Cpu;
              return (
                <div
                  key={idx}
                  className="flex items-center space-x-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded"
                >
                  <Icon className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="text-[8px] font-mono text-cyan-300">{arbiter}</span>
                </div>
              );
            })}
          </div>

          {/* Workflow Timeline */}
          {workflow && workflow.length > 0 && (
            <div className="pt-2 border-t border-cyan-500/10 space-y-2">
              <div className="text-[8px] text-cyan-400 uppercase tracking-wider font-bold">
                Execution Timeline
              </div>
              <div className="space-y-1">
                {workflow.map((step, idx) => {
                  const Icon = arbiterIcons[step.arbiter] || Cpu;
                  return (
                    <div
                      key={idx}
                      className="flex items-start space-x-2 text-[9px] text-cyan-200/70"
                    >
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <span className="text-cyan-600 font-mono">{idx + 1}.</span>
                        <Icon className="w-2.5 h-2.5 text-cyan-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-cyan-300">{step.arbiter}</div>
                        <div className="text-cyan-400/60">{step.action}</div>
                      </div>
                      {step.duration && (
                        <span className="text-[8px] text-cyan-600 font-mono">
                          {step.duration}ms
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-2 border-t border-cyan-500/10 text-[8px] text-cyan-500">
            This blueprint was generated through collaborative reasoning across multiple specialized arbiters.
          </div>
        </div>
      )}
    </div>
  );
};

export default ArbiterFeedback;
