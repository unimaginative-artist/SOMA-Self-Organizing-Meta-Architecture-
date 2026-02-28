
import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, X } from 'lucide-react';

interface Props {
  isActive: boolean;
  onClose: () => void;
  userTranscription: string;
  aiTranscription: string;
  isListening: boolean;
}

const LiveAssistant: React.FC<Props> = ({ isActive, onClose, userTranscription, aiTranscription, isListening }) => {
  if (!isActive) return null;

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900/90 backdrop-blur-2xl border border-blue-500/30 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.2)] p-6 overflow-hidden relative">
        {/* Background Pulse */}
        <div className={`absolute inset-0 bg-blue-500/5 transition-opacity duration-1000 ${isListening ? 'opacity-100' : 'opacity-0'}`} />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nova Live Session</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 relative z-10">
          {/* User Side */}
          <div className="flex flex-col items-end">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl rounded-tr-none p-3 max-w-[80%]">
              <p className="text-sm text-blue-100 min-h-[1.25rem]">
                {userTranscription || "Waiting for your command..."}
              </p>
            </div>
            <span className="text-[9px] text-zinc-600 mt-1 uppercase font-bold tracking-tighter">You</span>
          </div>

          {/* AI Side */}
          <div className="flex flex-col items-start">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl rounded-tl-none p-4 max-w-[90%] flex items-start space-x-3">
              <div className="mt-1 bg-blue-500/20 p-1.5 rounded-lg shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed italic">
                {aiTranscription || "I'm listening to your request."}
              </p>
            </div>
            <span className="text-[9px] text-zinc-600 mt-1 uppercase font-bold tracking-tighter ml-1">Nova Assistant</span>
          </div>
        </div>

        {/* Dynamic Visualizer Overlay */}
        {isListening && (
          <div className="mt-6 flex justify-center items-center space-x-1 h-8">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="w-1 bg-blue-500/40 rounded-full animate-bounce" 
                style={{ 
                  height: `${Math.random() * 100}%`,
                  animationDuration: `${0.5 + Math.random()}s`,
                  animationDelay: `${i * 0.1}s`
                }} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAssistant;
