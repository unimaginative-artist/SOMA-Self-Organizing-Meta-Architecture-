import React from 'react';
import { Sliders, Cpu, Zap, Shield, Info } from 'lucide-react';

interface Props {
  temperature: number;
  setTemperature: (val: number) => void;
  maxTokens: number;
  setMaxTokens: (val: number) => void;
  model: string;
  setModel: (val: string) => void;
}

const RunSettings: React.FC<Props> = ({ 
  temperature, setTemperature, 
  maxTokens, setMaxTokens, 
  model, setModel 
}) => {
  return (
    <aside className="w-72 bg-zinc-950 border-l border-zinc-900 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center space-x-2 text-zinc-100 pb-2 border-b border-zinc-900">
        <Sliders className="w-4 h-4 text-blue-400" />
        <h2 className="text-xs font-bold uppercase tracking-widest">Cognitive Parameters</h2>
      </div>

      {/* Temperature */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter flex items-center">
            <Zap className="w-3 h-3 mr-2 text-yellow-500" /> Temperature
          </label>
          <span className="text-[10px] font-mono text-blue-400 font-bold">{temperature.toFixed(1)}</span>
        </div>
        <input 
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[8px] text-zinc-700 font-bold uppercase">
          <span>Deterministic</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter flex items-center">
            <Shield className="w-3 h-3 mr-2 text-emerald-500" /> Response Limit
          </label>
          <span className="text-[10px] font-mono text-zinc-400 font-bold">{maxTokens}</span>
        </div>
        <input 
          type="range"
          min="256"
          max="8192"
          step="256"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>
    </aside>
  );
};

export default RunSettings;
