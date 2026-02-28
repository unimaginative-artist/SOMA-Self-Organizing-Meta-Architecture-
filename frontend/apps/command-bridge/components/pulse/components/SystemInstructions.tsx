import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Sparkles, Wand2 } from 'lucide-react';

interface Props {
  instructions: string;
  setInstructions: (val: string) => void;
}

const SystemInstructions: React.FC<Props> = ({ instructions, setInstructions }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mx-6 mt-6 mb-2">
      <div className={`bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'shadow-lg shadow-black/20' : 'shadow-none'}`}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <h3 className="text-[10px] font-black text-zinc-100 uppercase tracking-widest leading-none">System Instructions</h3>
              {(!isExpanded && instructions) && (
                <p className="text-[9px] text-zinc-500 font-medium truncate max-w-md mt-1 italic">
                  "{instructions.substring(0, 60)}..."
                </p>
              )}
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
        </button>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4">
            <textarea
              className="w-full h-32 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 placeholder-zinc-700 outline-none focus:border-blue-500/30 focus:bg-zinc-950 transition-all resize-none custom-scrollbar font-mono leading-relaxed"
              placeholder="e.g. 'You are an expert full-stack engineer. Always use TypeScript and Tailwind. Prefer functional components...'"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2 text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                <Sparkles className="w-3 h-3 text-blue-500/50" />
                <span>Permanent Context Active</span>
              </div>
              <button 
                onClick={() => setInstructions('')}
                className="text-[9px] font-bold text-zinc-700 hover:text-zinc-400 uppercase tracking-widest transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemInstructions;
