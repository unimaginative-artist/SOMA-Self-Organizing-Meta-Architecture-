
import React, { useState, useEffect } from 'react';
import { Search, Zap, Rocket, ShieldAlert, BookOpen, Trash2, Command, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAction: (cmd: string) => void;
}

const CommandPalette: React.FC<Props> = ({ isOpen, onClose, onAction }) => {
  const [query, setQuery] = useState('');

  const actions = [
    { id: 'plan', label: 'Start Project Roadmap', icon: <Rocket className="w-4 h-4" />, cmd: 'plan ' },
    { id: 'docgen', label: 'Synthesize Documentation', icon: <BookOpen className="w-4 h-4" />, cmd: 'docgen' },
    { id: 'audit', label: 'Run Security Audit', icon: <ShieldAlert className="w-4 h-4" />, cmd: 'audit' },
    { id: 'analyze', label: 'Analyze Service Performance', icon: <Zap className="w-4 h-4" />, cmd: 'analyze ' },
    { id: 'reset', label: 'Nuclear System Reset', icon: <Trash2 className="w-4 h-4" />, cmd: 'reset' },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
          <Search className="w-5 h-5 text-zinc-500 mr-3" />
          <input 
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-zinc-200 text-sm placeholder-zinc-600"
            placeholder="Search commands or project tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-2 py-1 bg-zinc-800 rounded text-[10px] font-bold text-zinc-500 uppercase">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-2 max-h-96 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.cmd)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/50 group transition-all"
              >
                <div className="flex items-center space-x-4">
                   <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                     {action.icon}
                   </div>
                   <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{action.label}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400">{action.cmd}</div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center space-y-2 opacity-50">
              <Search className="w-10 h-10 mx-auto text-zinc-700" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">No commands matched your query</p>
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-zinc-950/50 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
            <div className="flex items-center space-x-1"><div className="w-1.5 h-1.5 rounded bg-zinc-800"></div><span>Select</span></div>
            <div className="flex items-center space-x-1"><div className="w-1.5 h-1.5 rounded bg-zinc-800"></div><span>Search</span></div>
          </div>
          <span className="text-[10px] font-bold text-zinc-700">ESC to exit</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
