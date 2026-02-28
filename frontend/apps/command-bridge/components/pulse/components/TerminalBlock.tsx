
import React, { useState } from 'react';
import { TerminalBlock, SearchStep, BlueprintFile } from '../types';
import { 
  Check, 
  AlertCircle, 
  Play, 
  Copy, 
  Rocket, 
  Zap, 
  Loader2, 
  ChevronRight, 
  ShieldCheck,
  Search,
  Activity,
  Crown,
  Cpu,
  Eye,
  Square,
  Layers,
  File,
  Folder,
  FileSearch,
  Code,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  block: TerminalBlock;
  onExecute: (cmd: string) => void;
  onDeploy?: () => void;
  onStopSoma?: () => void;
  onSyncBlueprint?: (files: BlueprintFile[]) => void;
}

const CodeSurface: React.FC<{ file: BlueprintFile }> = ({ file }) => {
  const lines = file.content.split('\n');
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono px-2 py-1 bg-zinc-950/40 rounded-t-lg border-b border-zinc-800/50">
        <span className="flex items-center space-x-2">
          <File className="w-3 h-3 text-blue-400" />
          <span className="text-zinc-300 font-bold">{file.path}</span>
        </span>
        <div className="flex items-center space-x-3">
           <span className="text-[9px] opacity-40">{file.language}</span>
           <button 
             onClick={() => navigator.clipboard.writeText(file.content)}
             className="hover:text-blue-400 transition-colors"
           >
             <Copy className="w-3 h-3" />
           </button>
        </div>
      </div>
      <div className="relative group bg-black/60 border border-zinc-800/50 rounded-b-lg overflow-hidden">
        <div className="flex font-mono text-[10px] leading-relaxed py-3">
          {/* Line Numbers */}
          <div className="w-10 select-none text-right pr-3 text-zinc-700 border-r border-zinc-900 bg-zinc-950/20 shrink-0">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code Content */}
          <pre className="flex-1 px-4 overflow-x-auto custom-scrollbar text-zinc-400 selection:bg-blue-500/30">
            <code>
              {lines.map((line, i) => (
                <div key={i} className="whitespace-pre hover:bg-zinc-800/30 transition-colors px-1 -mx-1">{line || ' '}</div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

const TerminalBlockView: React.FC<Props> = ({ block, onExecute, onDeploy, onStopSoma, onSyncBlueprint }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderContent = () => {
    switch (block.type) {
      case 'command':
        return (
          <div className="flex items-start space-x-4 px-2 group/cmd animate-in slide-in-from-left-2 duration-300">
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">You</span>
                <span className="text-[9px] text-zinc-700 font-mono">{new Date(block.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-zinc-200 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {block.content}
              </div>
            </div>
          </div>
        );

      case 'code-gen':
      case 'output':
      case 'soma-task':
        const isCodeGen = block.type === 'code-gen';
        const isTask = block.type === 'soma-task';
        const blueprint = block.metadata?.blueprint || [];
        const task = block.metadata?.soma;

        return (
          <div className="flex items-start space-x-4 px-2 animate-in fade-in duration-500">
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0 pt-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em]">SOMA Architect</span>
              </div>
              
              <div className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
                block.type === 'error' ? 'bg-rose-500/5 border-rose-500/20' : 
                isTask ? 'bg-blue-500/5 border-blue-500/20' :
                'bg-zinc-900/50 border-zinc-800 shadow-xl shadow-black/40'
              }`}>
                {/* Header for special types */}
                {isCodeGen && (
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Code className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Blueprint Synthesized ({blueprint.length} files)</span>
                    </div>
                    <button 
                      onClick={() => onSyncBlueprint?.(blueprint)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold uppercase rounded-lg transition-all"
                    >
                      Sync Surface
                    </button>
                  </div>
                )}

                {isTask && task && (
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/30">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest flex items-center space-x-2">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                      <span>{task.name} / {task.stepLabel}</span>
                    </span>
                    <div className="text-[10px] font-mono text-blue-400 font-bold">{Math.round((task.currentStep / task.totalSteps) * 100)}%</div>
                  </div>
                )}

                <div className="p-5 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/20">
                  {block.content}
                </div>

                {isCodeGen && (
                  <div className="p-4 bg-black/20 border-t border-zinc-800/50 space-y-4">
                    {blueprint.map((file, i) => (
                      <CodeSurface key={i} file={file} />
                    ))}
                  </div>
                )}

                {isTask && task && (
                  <div className="px-5 pb-5">
                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-700" 
                        style={{ width: `${(task.currentStep / task.totalSteps) * 100}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-start space-x-4 px-2 animate-in shake duration-500">
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="flex-1 bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest block mb-2">System Error</span>
              <p className="text-sm text-rose-200/70 font-mono">{block.content}</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="px-12 text-zinc-500 text-xs italic py-2 opacity-50">
            {block.content}
          </div>
        );
    }
  };

  return <div className="group mb-8">{renderContent()}</div>;
};

export default TerminalBlockView;
