import React from 'react';
import { 
  Terminal, AlertTriangle, CheckCircle, XCircle, Shield, 
  Info, Zap, ChevronRight
} from 'lucide-react';

interface CommandPreviewProps {
  preview: {
    command: string;
    explanation: string;
    safetyLevel: 'safe' | 'caution' | 'dangerous' | 'destructive';
    risks: string[];
    requiresConfirmation: boolean;
    suggestedAlternatives?: string[];
  };
  onConfirm: () => void;
  onCancel: () => void;
  onSelectAlternative?: (command: string) => void;
}

const CommandPreview: React.FC<CommandPreviewProps> = ({
  preview,
  onConfirm,
  onCancel,
  onSelectAlternative
}) => {
  const getSafetyConfig = () => {
    switch (preview.safetyLevel) {
      case 'safe':
        return {
          color: 'emerald',
          icon: CheckCircle,
          label: 'Safe',
          borderColor: 'border-emerald-500/30',
          bgColor: 'bg-emerald-500/10',
          textColor: 'text-emerald-400',
          glowColor: 'shadow-emerald-500/20'
        };
      case 'caution':
        return {
          color: 'yellow',
          icon: AlertTriangle,
          label: 'Caution',
          borderColor: 'border-yellow-500/30',
          bgColor: 'bg-yellow-500/10',
          textColor: 'text-yellow-400',
          glowColor: 'shadow-yellow-500/20'
        };
      case 'dangerous':
        return {
          color: 'orange',
          icon: AlertTriangle,
          label: 'Dangerous',
          borderColor: 'border-orange-500/30',
          bgColor: 'bg-orange-500/10',
          textColor: 'text-orange-400',
          glowColor: 'shadow-orange-500/20'
        };
      case 'destructive':
        return {
          color: 'red',
          icon: XCircle,
          label: 'Destructive',
          borderColor: 'border-red-500/30',
          bgColor: 'bg-red-500/10',
          textColor: 'text-red-400',
          glowColor: 'shadow-red-500/20'
        };
      default:
        return {
          color: 'zinc',
          icon: Info,
          label: 'Unknown',
          borderColor: 'border-zinc-500/30',
          bgColor: 'bg-zinc-500/10',
          textColor: 'text-zinc-400',
          glowColor: 'shadow-zinc-500/20'
        };
    }
  };

  const safetyConfig = getSafetyConfig();
  const SafetyIcon = safetyConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${safetyConfig.borderColor} ${safetyConfig.bgColor} backdrop-blur-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${safetyConfig.bgColor} border ${safetyConfig.borderColor}`}>
                <Shield className={`w-5 h-5 ${safetyConfig.textColor}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Command Preview</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Safety Check Required
                </p>
              </div>
            </div>
            
            {/* Safety Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${safetyConfig.bgColor} border ${safetyConfig.borderColor}`}>
              <SafetyIcon className={`w-4 h-4 ${safetyConfig.textColor}`} />
              <span className={`text-xs font-bold ${safetyConfig.textColor} uppercase tracking-wider`}>
                {safetyConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Command Display */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-start gap-3 mb-2">
            <Terminal className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Command
            </span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <code className="text-sm font-mono text-zinc-100 break-all">
              {preview.command}
            </code>
          </div>
        </div>

        {/* Explanation */}
        {preview.explanation && (
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-start gap-3 mb-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                What This Does
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {preview.explanation}
            </p>
          </div>
        )}

        {/* Risks */}
        {preview.risks && preview.risks.length > 0 && (
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className={`w-4 h-4 ${safetyConfig.textColor} mt-0.5 shrink-0`} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Potential Risks
              </span>
            </div>
            <ul className="space-y-2">
              {preview.risks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ChevronRight className={`w-3 h-3 ${safetyConfig.textColor} mt-1 shrink-0`} />
                  <span className="text-sm text-zinc-400">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Alternatives */}
        {preview.suggestedAlternatives && preview.suggestedAlternatives.length > 0 && (
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-start gap-3 mb-3">
              <Zap className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Safer Alternatives
              </span>
            </div>
            <div className="space-y-2">
              {preview.suggestedAlternatives.map((alt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectAlternative?.(alt)}
                  className="w-full text-left px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                >
                  <code className="text-xs font-mono text-zinc-300 group-hover:text-emerald-400 break-all">
                    {alt}
                  </code>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 bg-zinc-900/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
          
          {preview.requiresConfirmation ? (
            <button
              onClick={onConfirm}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${safetyConfig.bgColor} ${safetyConfig.borderColor} border ${safetyConfig.textColor} hover:scale-105 active:scale-95 shadow-lg ${safetyConfig.glowColor}`}
            >
              I Understand, Execute Anyway
            </button>
          ) : (
            <button
              onClick={onConfirm}
              className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Execute Command
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPreview;
