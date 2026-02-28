
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Brain, CheckCircle, Clock, Circle } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  duration?: number;
}

interface Props {
  steps: Step[];
  isThinking: boolean;
}

const ReasoningBlock: React.FC<Props> = ({ steps, isThinking }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="my-2 border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden font-sans">
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-zinc-900 hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Brain className={`w-4 h-4 ${isThinking ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            {isThinking ? 'S.T.E.V.E. Reasoning...' : 'Cognitive Trace'}
          </span>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-600" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
      </button>

      {/* Tree Content */}
      {isExpanded && (
        <div className="p-2 space-y-1 bg-[#0c0c0e]">
          {steps.map((step, idx) => (
            <div key={step.id} className="relative pl-4">
              {/* Connector Line */}
              {idx !== steps.length - 1 && (
                <div className="absolute left-[19px] top-5 bottom-[-10px] w-px bg-zinc-800" />
              )}
              
              <div className="flex items-start space-x-3 group">
                <div className={`mt-0.5 relative z-10 bg-[#0c0c0e] rounded-full p-0.5 border ${
                  step.status === 'completed' ? 'border-emerald-500/30' : 
                  step.status === 'running' ? 'border-emerald-500' : 'border-zinc-800'
                }`}>
                  {step.status === 'completed' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> :
                   step.status === 'running' ? <Clock className="w-3 h-3 text-emerald-400 animate-spin" /> :
                   <Circle className="w-3 h-3 text-zinc-700" />}
                </div>
                
                <div className="flex-1 pb-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${step.status === 'running' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {step.label}
                    </span>
                    {step.duration && (
                      <span className="text-[9px] text-zinc-600 font-mono">{step.duration}ms</span>
                    )}
                  </div>
                  {step.details && (
                    <div className="mt-1 text-[10px] text-zinc-500 font-mono bg-zinc-900/80 p-1.5 rounded border border-zinc-800/50">
                      {step.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReasoningBlock;
