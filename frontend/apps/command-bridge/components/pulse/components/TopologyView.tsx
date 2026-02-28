
import React, { useState, useEffect } from 'react';
import { BackendService } from '../types';
import { Crown, Cpu, Eye, Shield } from 'lucide-react';
import broker from '../core/MessageBroker';

interface Props {
  services: BackendService[];
}

interface Packet {
  id: number;
  fromX: string;
  fromY: string;
  toX: string;
  toY: string;
}

const TopologyView: React.FC<Props> = ({ services }) => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const prime = services.find(s => s.role === 'prime');
  const workers = services.filter(s => s.role !== 'prime');

  useEffect(() => {
    const unsub = broker.subscribe('traffic', (msg: any) => {
      const idx = workers.findIndex(w => w.id === msg.from);
      if (idx === -1) return;

      const newPacket: Packet = {
        id: Date.now(),
        fromX: `${20 + (idx * 30)}%`,
        fromY: '70%',
        toX: '50%',
        toY: '30%'
      };

      setPackets(prev => [...prev, newPacket]);
      setTimeout(() => setPackets(prev => prev.filter(p => p.id !== newPacket.id)), 1000);
    });
    // Fix: Ensure the cleanup function returns void to comply with EffectCallback requirements
    return () => { unsub(); };
  }, [workers]);

  const getIcon = (role: string) => {
    switch(role) {
      case 'prime': return <Crown className="w-5 h-5 text-amber-500" />;
      case 'execution': return <Cpu className="w-5 h-5 text-blue-400" />;
      case 'observer': return <Eye className="w-5 h-5 text-emerald-400" />;
      default: return <Shield className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative p-12">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {prime && workers.map((w, idx) => (
          <line 
            key={idx}
            x1="50%" y1="30%" 
            x2={`${20 + (idx * 30)}%`} y2="70%" 
            stroke="url(#lineGrad)" 
            strokeWidth="1" 
          />
        ))}

        {packets.map(p => (
          <circle key={p.id} r="3" fill="#3b82f6" filter="url(#glow)">
            <animate attributeName="cx" from={p.fromX} to={p.toX} dur="0.8s" fill="freeze" />
            <animate attributeName="cy" from={p.fromY} to={p.toY} dur="0.8s" fill="freeze" />
            <animate attributeName="opacity" values="0;1;0" dur="0.8s" fill="freeze" />
          </circle>
        ))}
      </svg>

      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <div className="w-24 h-24 bg-zinc-900 border-2 border-amber-500/50 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-in zoom-in">
           {prime && getIcon('prime')}
           <div className="absolute -inset-2 border border-amber-500/20 rounded-full animate-ping opacity-20" />
        </div>
        <span className="mt-3 text-[10px] font-bold text-white uppercase tracking-[0.2em]">{prime?.name || 'PRIME'}</span>
      </div>

      <div className="absolute bottom-[20%] left-0 w-full flex justify-around px-8">
        {workers.map((w, idx) => (
          <div key={w.id} className="flex flex-col items-center group">
            <div className={`
              w-16 h-16 bg-zinc-900 border-2 rounded-2xl flex items-center justify-center transition-all duration-500
              ${w.status === 'online' ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-100' : 'border-zinc-800 grayscale scale-95 opacity-50'}
              group-hover:scale-110 group-hover:border-blue-500/50 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]
            `}>
              {getIcon(w.role)}
              {w.status === 'online' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900 animate-pulse" />
              )}
            </div>
            <div className="mt-4 text-center">
              <span className="block text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{w.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopologyView;
