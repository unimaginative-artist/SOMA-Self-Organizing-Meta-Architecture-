
import React from 'react';
import { CompletionSuggestion } from '../types';
import { Hash, Terminal, Folder, Zap } from 'lucide-react';

interface Props {
  suggestions: CompletionSuggestion[];
  activeIndex: number;
  onSelect: (suggestion: CompletionSuggestion) => void;
}

const Autocomplete: React.FC<Props> = ({ suggestions, activeIndex, onSelect }) => {
  if (!suggestions.length) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="p-2 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Suggestions</span>
        <Zap className="w-3 h-3 text-blue-500" />
      </div>
      <div className="max-h-60 overflow-y-auto">
        {suggestions.map((s, idx) => (
          <div
            key={idx}
            onClick={() => onSelect(s)}
            className={`flex items-start space-x-3 p-2 cursor-pointer transition-colors ${idx === activeIndex ? 'bg-blue-600/20 text-white' : 'hover:bg-zinc-800/50 text-zinc-400'}`}
          >
            <div className={`mt-0.5 p-1 rounded ${idx === activeIndex ? 'bg-blue-500/20' : 'bg-zinc-800'}`}>
              {s.type === 'cmd' && <Terminal className="w-3 h-3" />}
              {s.type === 'flag' && <Hash className="w-3 h-3" />}
              {s.type === 'path' && <Folder className="w-3 h-3" />}
              {s.type === 'ai' && <Zap className="w-3 h-3 text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono font-bold truncate">{s.text}</div>
              <div className="text-[10px] text-zinc-500 truncate">{s.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Autocomplete;
