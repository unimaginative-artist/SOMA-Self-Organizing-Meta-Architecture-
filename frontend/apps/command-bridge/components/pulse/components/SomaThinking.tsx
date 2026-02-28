import React from 'react';
import { Brain, Sparkles, Zap } from 'lucide-react';

interface SomaThinkingProps {
  message?: string;
  subtext?: string;
}

const SomaThinking: React.FC<SomaThinkingProps> = ({ 
  message = "SOMA Reasoning...",
  subtext = "Multi-arbiter intelligence active"
}) => {
  return (
    <div className="flex items-start space-x-4 p-4">
      {/* Animated Pulse Circle */}
      <div className="relative flex-shrink-0">
        {/* Outer pulse rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
          <div className="w-14 h-14 rounded-full bg-purple-400/30 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '1s' }}>
          <div className="w-12 h-12 rounded-full bg-purple-300/40 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        
        {/* Center orb with gradient */}
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-pulse">
          {/* Inner glow */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-purple-400/50 to-transparent blur-sm" />
          
          {/* Icon */}
          <Brain className="w-6 h-6 text-white relative z-10" />
          
          {/* Sparkle effects */}
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-3 h-3 text-purple-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
          <div className="absolute -bottom-1 -left-1">
            <Zap className="w-3 h-3 text-fuchsia-300 animate-pulse" style={{ animationDelay: '0.7s' }} />
          </div>
        </div>

        {/* Orbital particles */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
          <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 -translate-x-1/2 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
          <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 rounded-full bg-fuchsia-400 -translate-x-1/2 shadow-[0_0_10px_rgba(232,121,249,0.8)]" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '5s' }}>
          <div className="absolute top-1/2 left-0 w-1.5 h-1.5 rounded-full bg-violet-400 -translate-y-1/2 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
        </div>
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="text-sm font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            {message}
          </h3>
          
          {/* Animated dots */}
          <div className="flex space-x-1">
            <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
        
        <p className="text-[10px] text-purple-300/60 font-mono tracking-wide">
          {subtext}
        </p>

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-zinc-900/50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 animate-shimmer" 
               style={{ 
                 width: '100%',
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 2s infinite'
               }} 
          />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default SomaThinking;
