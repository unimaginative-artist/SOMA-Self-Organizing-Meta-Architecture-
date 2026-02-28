
import React, { useState } from 'react';
import { BackendService } from '../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Activity, Terminal, Cpu, HardDrive, ChevronDown, ChevronUp, Play, Square, RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  services: BackendService[];
  onAction?: (id: string, action: 'start' | 'stop' | 'restart') => void;
}

const StatsOverlay: React.FC<Props> = ({ services, onAction }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const onlineServices = services.filter(s => s.status === 'online' || s.status === 'starting');

  return (
    <div className={`border-t border-zinc-800/50 bg-zinc-950/30 flex flex-col transition-all duration-300 ${isExpanded ? 'min-h-[200px]' : 'h-12 overflow-hidden'}`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-12 px-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors group shrink-0"
      >
        <div className="flex items-center space-x-2">
          <Activity className={`w-3.5 h-3.5 ${onlineServices.length > 0 ? 'text-emerald-500' : 'text-zinc-600'}`} />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fleet Operations</span>
        </div>
        {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronUp className="w-3 h-3 text-zinc-600" />}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-8 animate-in fade-in duration-300">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-600 space-y-2">
              <Activity className="w-8 h-8 opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-tighter">Fleet Empty</p>
            </div>
          ) : (
            services.map(service => (
              <div key={service.id} className="space-y-3 p-3 bg-zinc-900/20 rounded-xl border border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-semibold transition-colors ${service.status === 'offline' ? 'text-zinc-600' : 'text-zinc-200'}`}>
                      {service.name}
                    </span>
                    {service.status === 'starting' && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
                  </div>
                  
                  {/* Interactive Controls */}
                  <div className="flex items-center space-x-1">
                    {service.status === 'offline' ? (
                      <button 
                        onClick={() => onAction?.(service.id, 'start')}
                        className="p-1.5 hover:bg-emerald-500/20 text-emerald-500 rounded-md transition-all"
                        title="Start Service"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => onAction?.(service.id, 'stop')}
                          className={`p-1.5 hover:bg-rose-500/20 text-rose-500 rounded-md transition-all ${service.status === 'starting' ? 'opacity-30 pointer-events-none' : ''}`}
                          title="Stop Service"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onAction?.(service.id, 'restart')}
                          className={`p-1.5 hover:bg-blue-500/20 text-blue-500 rounded-md transition-all ${service.status === 'starting' ? 'opacity-30 pointer-events-none' : ''}`}
                          title="Restart Service"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {service.status !== 'offline' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-lg">
                        <div className="flex items-center space-x-1.5 text-[10px] text-zinc-500 mb-1 font-bold uppercase">
                          <Cpu className="w-3 h-3 text-blue-500" />
                          <span>CPU</span>
                        </div>
                        <div className={`text-lg font-mono leading-none ${service.status === 'starting' ? 'text-zinc-700 animate-pulse' : 'text-white'}`}>
                          {service.status === 'starting' ? '...' : `${service.metrics.cpu[service.metrics.cpu.length - 1]}%`}
                        </div>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-lg">
                        <div className="flex items-center space-x-1.5 text-[10px] text-zinc-500 mb-1 font-bold uppercase">
                          <HardDrive className="w-3 h-3 text-emerald-500" />
                          <span>RAM</span>
                        </div>
                        <div className={`text-lg font-mono leading-none ${service.status === 'starting' ? 'text-zinc-700 animate-pulse' : 'text-white'}`}>
                          {service.status === 'starting' ? '...' : `${service.metrics.memory[service.metrics.memory.length - 1]}MB`}
                        </div>
                      </div>
                    </div>

                    <div className="h-12 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={service.metrics.cpu.map((val, i) => ({ val, i }))}>
                          <Area 
                            type="monotone" 
                            dataKey="val" 
                            stroke={service.status === 'starting' ? '#71717a' : '#3b82f6'} 
                            strokeWidth={1.5}
                            fill={service.status === 'starting' ? 'transparent' : '#3b82f633'} 
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                <div className="bg-black/40 rounded-lg p-2 font-mono text-[9px] text-zinc-500 border border-zinc-800">
                   <div className="flex items-center space-x-2 text-[8px] font-bold text-zinc-600 mb-1 uppercase tracking-widest border-b border-zinc-800 pb-1">
                     <Terminal className="w-2.5 h-2.5" />
                     <span>Streaming Logs</span>
                   </div>
                   <div className="max-h-20 overflow-y-auto space-y-1 custom-scrollbar">
                      {service.logs.map((log, i) => (
                        <div key={i} className="flex space-x-2">
                          <span className="text-zinc-800 shrink-0">[{i}]</span>
                          <span className="truncate">{log}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StatsOverlay;
