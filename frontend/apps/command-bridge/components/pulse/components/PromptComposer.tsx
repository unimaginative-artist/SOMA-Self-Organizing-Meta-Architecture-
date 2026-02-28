import React, { useRef, useEffect } from 'react';
import { Play, Zap, Paperclip, Globe, Command, Trash2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isProcessing: boolean;
  onClear?: () => void;
}

const PromptComposer: React.FC<Props> = ({ value, onChange, onSubmit, isProcessing, onClear }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="p-6 bg-[#0d0d0e]/80 backdrop-blur-md border-t border-zinc-900 absolute bottom-0 left-0 right-0 z-30">
      <div className="max-w-5xl mx-auto relative group">
        <div className={`bg-zinc-900 border transition-all duration-300 rounded-3xl p-4 shadow-2xl ${isProcessing ? 'border-blue-500/30 shadow-blue-500/5' : 'border-zinc-800 focus-within:border-zinc-700 focus-within:bg-zinc-900/80 shadow-black/40'}`}>
          <textarea
            ref={textareaRef}
            rows={1}
            autoFocus
            className="w-full bg-transparent border-none outline-none text-zinc-200 text-sm placeholder-zinc-600 resize-none custom-scrollbar font-sans leading-relaxed py-1 px-2"
            placeholder="Describe what you want to build or run..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />

          <div className="flex items-center justify-between mt-4 px-2 pt-3 border-t border-zinc-800/50">
            <div className="flex items-center space-x-4">
              <button className="text-zinc-600 hover:text-zinc-400 transition-colors" title="Attach Files">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="text-zinc-600 hover:text-blue-400 transition-colors" title="Enable Web Research">
                <Globe className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-zinc-800" />
              {onClear && (
                <button 
                  onClick={onClear}
                  className="text-zinc-600 hover:text-rose-400 transition-colors" 
                  title="Clear Conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-1 text-[9px] font-bold text-zinc-700 uppercase tracking-widest mr-2 select-none">
                <Command className="w-3 h-3" />
                <span>+ ENTER to run</span>
              </div>
              
              <button
                onClick={() => onSubmit()}
                disabled={isProcessing || !value.trim()}
                className={`flex items-center space-x-2 px-5 py-2 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${isProcessing || !value.trim() ? 'bg-zinc-800 text-zinc-600 opacity-50' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'}`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Running</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative shadow gradient */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none -z-10" />
      </div>
    </div>
  );
};

export default PromptComposer;
