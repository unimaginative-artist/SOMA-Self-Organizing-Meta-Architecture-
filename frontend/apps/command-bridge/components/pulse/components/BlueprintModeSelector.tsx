import React from 'react';
import { MessageSquare, Eye, Layers, Zap } from 'lucide-react';

export type BlueprintMode = 'text' | 'vision' | 'hybrid';

interface BlueprintModeSelectorProps {
  mode: BlueprintMode;
  onModeChange: (mode: BlueprintMode) => void;
}

const modes = [
  {
    id: 'text' as BlueprintMode,
    name: 'Text Intent',
    description: 'Describe what you want to build',
    icon: MessageSquare,
    color: 'cyan'
  },
  {
    id: 'vision' as BlueprintMode,
    name: 'Vision Upload',
    description: 'Upload a UI mockup or wireframe',
    icon: Eye,
    color: 'purple'
  },
  {
    id: 'hybrid' as BlueprintMode,
    name: 'Hybrid Mode',
    description: 'Combine text description with visual reference',
    icon: Layers,
    color: 'emerald'
  }
];

const BlueprintModeSelector: React.FC<BlueprintModeSelectorProps> = ({ mode, onModeChange }) => {
  const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      hover: 'hover:bg-cyan-500/20'
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      hover: 'hover:bg-purple-500/20'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      hover: 'hover:bg-emerald-500/20'
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1 text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
        <Zap className="w-3 h-3" />
        <span>Blueprint Mode:</span>
      </div>
      
      <div className="flex items-center space-x-1">
        {modes.map((modeOption) => {
          const Icon = modeOption.icon;
          const colors = colorClasses[modeOption.color];
          const isActive = mode === modeOption.id;

          return (
            <button
              key={modeOption.id}
              onClick={() => onModeChange(modeOption.id)}
              className={`
                flex items-center space-x-1.5 px-2 py-1 rounded border transition-all
                ${isActive
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : 'bg-zinc-900/30 border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700'
                }
                ${!isActive && colors.hover}
              `}
              title={modeOption.description}
            >
              <Icon className="w-3 h-3" />
              <span className="text-[9px] font-bold">{modeOption.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BlueprintModeSelector;
