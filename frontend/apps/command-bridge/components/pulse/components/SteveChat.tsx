import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Sparkles, X, Minimize2, Maximize2,
  BrainCircuit, Shield, Zap, Terminal, FileCode, AlertCircle,
  Play, Pause, Lock, Unlock, Network, Wrench, Brain, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolCreator from './ToolCreator';
import ToolRegistry from './ToolRegistry';
import ChangelingMask from './ChangelingMask';
import RAGResults from './RAGResults';

// Types for Steve 2.0
type AgentMode = 'PLAN' | 'ACT';

interface ContextItem {
  type: 'file' | 'terminal' | 'problems' | 'url';
  value: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{
    role: string;
    content: string;
    actions?: string[];
    updatedFiles?: any[];
    perspectives?: any[]; // QuadBrain
    features?: {
      rag?: boolean;
      toolCreation?: boolean;
      personalityEngine?: boolean;
      learningPipeline?: boolean;
    };
    ragResults?: any[];
    toolsUsed?: string[];
    arbitersConsulted?: string[];
  }>;
  onSendMessage: (msg: string, mode: AgentMode, context: ContextItem[]) => void;
  isProcessing: boolean;
  onActionExecute?: (cmd: string) => void;
  onApplyEdits?: (files: any[]) => void;
  buttonPosition?: { x: number, y: number };
}

const SteveChat: React.FC<Props> = ({
  isOpen, onClose, messages, onSendMessage,
  isProcessing, onActionExecute, onApplyEdits, buttonPosition
}) => {
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<AgentMode>('PLAN');
  const [mentions, setMentions] = useState<ContextItem[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showToolCreator, setShowToolCreator] = useState(false);
  const [showToolRegistry, setShowToolRegistry] = useState(false);
  const [currentMask, setCurrentMask] = useState('cranky');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mention Parser
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Simple detection for @ menu
    const lastWord = val.split(' ').pop();
    if (lastWord?.startsWith('@')) {
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
    }
  };

  const addMention = (type: ContextItem['type'], value: string) => {
    setMentions(prev => [...prev, { type, value }]);
    setInputValue(prev => {
      const parts = prev.split(' ');
      parts.pop(); 
      return parts.join(' ') + ' '; 
    });
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    onSendMessage(inputValue, mode, mentions);
    setInputValue('');
    setMentions([]);
  };

  if (!isOpen) return null;

  const posProps = buttonPosition ? {
    bottom: window.innerHeight - buttonPosition.y + 20,
    right: window.innerWidth - buttonPosition.x + 20
  } : { bottom: 96, right: 32 };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed z-50 flex flex-col"
        style={{ ...posProps, width: '24rem', height: '500px' }}
      >
        <div className={`flex flex-col h-full bg-zinc-950/90 backdrop-blur-3xl border border-emerald-500/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.1)] overflow-hidden transition-colors duration-300`}>

          {/* Header */}
          <div className="p-3 border-b border-zinc-800/50 flex items-center justify-between shrink-0 bg-emerald-500/5 overflow-visible">
            <div className="cursor-move draggable-handle flex-1">
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 overflow-hidden relative hover:bg-emerald-500/30 transition-colors flex-shrink-0"
                title="Close Chat"
              >
                <img
                  src="/steve_profile.gif"
                  alt="Steve"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <BrainCircuit className="w-4 h-4 text-emerald-400 absolute z-[-1]" />
              </button>
            </div>

            <div className="flex items-center space-x-1 overflow-visible">
              <ChangelingMask currentMask={currentMask} onMaskChange={setCurrentMask} />
              
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              
              <button
                onClick={() => setShowToolRegistry(!showToolRegistry)}
                className={`p-1.5 rounded transition-all ${
                  showToolRegistry
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-zinc-500 hover:text-cyan-400'
                }`}
                title="Tool Registry"
              >
                <Wrench className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => setShowToolCreator(!showToolCreator)}
                className={`p-1.5 rounded transition-all ${
                  showToolCreator
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-zinc-500 hover:text-purple-400'
                }`}
                title="Create Tool"
              >
                <Sparkles className="w-3 h-3" />
              </button>
              
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              
              <div
                className="px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center space-x-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 cursor-help"
                title="Connected to SOMA Neural Network"
              >
                <Network className="w-3 h-3" />
                <span>ONLINE</span>
              </div>
              
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              
              <button
                onClick={() => setMode(prev => prev === 'PLAN' ? 'ACT' : 'PLAN')}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center space-x-1 ${mode === 'PLAN'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
              >
                {mode === 'PLAN' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{mode}</span>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'flex-row-reverse items-end space-x-reverse' : 'flex-row items-end space-x-2'}`}>
                {msg.role !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 overflow-hidden relative flex-shrink-0 mb-1">
                    <img
                      src="/steve_profile.gif"
                      alt="Steve"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <BrainCircuit className="w-3 h-3 text-emerald-400 absolute z-[-1]" />
                  </div>
                )}
                
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`
                    max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm
                    ${msg.role === 'user'
                      ? 'bg-teal-600/10 border border-teal-500/30 text-teal-50 rounded-tr-none'
                      : 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-50 rounded-tl-none shadow-[0_0_20px_rgba(16,185,129,0.1)]'}
                  `}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.features && Object.keys(msg.features).some(k => (msg.features as any)[k]) && (
                    <div className="mt-3 pt-3 border-t border-zinc-700/50 flex flex-wrap gap-1.5">
                      {msg.features.rag && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-lime-500/10 border border-lime-500/30 rounded text-[8px] font-bold text-lime-300">
                          <Brain className="w-2.5 h-2.5" />
                          <span>RAG</span>
                        </span>
                      )}
                      {msg.features.toolCreation && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 rounded text-[8px] font-bold text-teal-300">
                          <Wrench className="w-2.5 h-2.5" />
                          <span>Tool Creation</span>
                        </span>
                      )}
                      {msg.features.personalityEngine && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[8px] font-bold text-emerald-300">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Personality</span>
                        </span>
                      )}
                      {msg.features.learningPipeline && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[8px] font-bold text-green-300">
                          <Layers className="w-2.5 h-2.5" />
                          <span>Learning</span>
                        </span>
                      )}
                    </div>
                  )}

                  {msg.ragResults && msg.ragResults.length > 0 && (
                    <div className="mt-3">
                      <RAGResults results={msg.ragResults} />
                    </div>
                  )}

                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="mt-3 p-2 bg-teal-500/5 border border-teal-500/20 rounded">
                      <div className="text-[8px] text-teal-400 uppercase tracking-wider font-bold mb-1">Tools Used</div>
                      <div className="flex flex-wrap gap-1">
                        {msg.toolsUsed.map((tool, i) => (
                          <span key={i} className="text-[8px] px-1.5 py-0.5 bg-teal-500/10 border border-teal-500/30 rounded text-teal-300 font-mono">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.arbitersConsulted && msg.arbitersConsulted.length > 0 && (
                    <div className="mt-2 text-[8px] text-emerald-600 font-mono">
                      <span>Arbiters: {msg.arbitersConsulted.join(' → ')}</span>
                    </div>
                  )}

                  {msg.perspectives && msg.perspectives.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-700/50 grid grid-cols-2 gap-2">
                      {msg.perspectives.map((p: any, i: number) => (
                        <div key={i} className="text-[10px] bg-zinc-900/50 p-1.5 rounded border border-zinc-800">
                          <span className={`font-bold ${p.hemisphere === 'THALAMUS' ? 'text-rose-400' : 'text-blue-400'}`}>{p.hemisphere}</span>
                          <p className="truncate text-zinc-500">{p.response}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.updatedFiles && msg.updatedFiles.length > 0 && (
                    <div className="mt-4 p-3 bg-zinc-950 rounded-xl border border-emerald-500/30 space-y-3">
                      <div className="flex items-center space-x-2 text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                        <Sparkles className="w-3 h-3" />
                        <span>Code Synthesis Ready</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-mono">
                        {msg.updatedFiles.map(f => f.path).join(', ')}
                      </div>
                      {onApplyEdits && (
                        <button
                          onClick={() => onApplyEdits(msg.updatedFiles!)}
                          className="w-full flex items-center justify-center space-x-2 bg-emerald-500 text-zinc-950 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Apply Changes to Disk</span>
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                  <span className="text-[8px] font-bold text-zinc-600 uppercase mt-1 tracking-tighter">
                    {msg.role === 'user' ? 'You' : 'S.T.E.V.E.'}
                  </span>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-start space-x-2 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 overflow-hidden relative flex-shrink-0">
                  <img
                    src="/steve_profile.gif"
                    alt="Steve"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <BrainCircuit className="w-3 h-3 text-emerald-400 absolute z-[-1]" />
                </div>
                <div className="flex items-center space-x-2 text-emerald-400 font-mono text-[10px]">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>Steve is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Context Pills */}
          {mentions.length > 0 && (
            <div className="px-4 py-2 border-t border-emerald-800/30 flex flex-wrap gap-2 bg-emerald-950/20">
              {mentions.map((m, i) => (
                <span key={i} className="text-[10px] flex items-center space-x-1 bg-emerald-900/30 border border-emerald-700/50 rounded px-1.5 py-0.5 text-emerald-400">
                  <span>{m.value}</span>
                  <button onClick={() => setMentions(p => p.filter((_, idx) => idx !== i))} className="hover:text-emerald-200 ml-1">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Mention Menu */}
          {showMentionMenu && (
            <div className="absolute bottom-20 left-4 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden w-64 z-50">
              <div className="p-1">
                <div className="text-[10px] font-bold text-zinc-500 px-2 py-1">CONTEXT MENU</div>
                <button onClick={() => addMention('terminal', 'Current Terminal Output')} className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 text-xs text-zinc-300 flex items-center space-x-2">
                  <Terminal className="w-3 h-3" /> <span>Terminal Output</span>
                </button>
              </div>
            </div>
          )}

          {/* Tool Creator Panel */}
          {showToolCreator && (
            <div className="border-t border-zinc-800 p-3 bg-zinc-950/50">
              <ToolCreator
                onToolCreated={(toolName) => {
                  console.log('Tool created:', toolName);
                  setShowToolCreator(false);
                }}
                onClose={() => setShowToolCreator(false)}
              />
            </div>
          )}

          {/* Tool Registry Panel */}
          {showToolRegistry && (
            <div className="border-t border-zinc-800 h-64 overflow-hidden">
              <ToolRegistry
                onExecuteTool={(toolName, params) => {
                  console.log('Execute tool:', toolName, params);
                  setInputValue(`Execute tool: ${toolName}`);
                  setShowToolRegistry(false);
                }}
              />
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-emerald-950/20 border-t border-emerald-800/30">
            <div className="relative group">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={mode === 'PLAN' ? "Ask Steve or mention (@) context..." : "Command Steve to Act..."}
                className={`
                   w-full bg-emerald-950/30 border rounded-xl py-3 pl-4 pr-12 text-xs text-emerald-100 placeholder-emerald-500/40 outline-none transition-all
                   ${isProcessing ? 'opacity-50 cursor-not-allowed border-emerald-800/30' : 'border-emerald-800/30 focus:border-emerald-500/50 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:border-emerald-700/50'}
                `}
                autoFocus
              />
              <button
                onClick={(e) => handleSubmit(e as any)}
                disabled={!inputValue.trim() || isProcessing}
                className="absolute right-2 top-2 p-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SteveChat;