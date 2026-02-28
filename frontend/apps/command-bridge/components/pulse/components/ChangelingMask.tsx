import React, { useState } from 'react';
import { Smile, ChevronDown, Check } from 'lucide-react';

interface Mask {
  id: string;
  name: string;
  description: string;
  personality: string;
  color: string;
  icon?: string;
}

const AVAILABLE_MASKS: Mask[] = [
  {
    id: 'cranky',
    name: 'Cranky Senior Architect',
    description: 'The original Steve - sarcastic, experienced, gets things done',
    personality: 'Sarcastic, impatient with incompetence, but deeply knowledgeable',
    color: 'cyan',
    icon: '😤'
  },
  {
    id: 'mentor',
    name: 'Patient Mentor',
    description: 'Supportive and educational, explains everything thoroughly',
    personality: 'Patient, encouraging, loves teaching',
    color: 'emerald',
    icon: '🧑‍🏫'
  },
  {
    id: 'hacker',
    name: 'Speed Hacker',
    description: 'Fast, efficient, minimal explanations, maximum action',
    personality: 'Lightning fast, no BS, just results',
    color: 'purple',
    icon: '⚡'
  },
  {
    id: 'researcher',
    name: 'Research Scientist',
    description: 'Methodical, analytical, explores all options',
    personality: 'Thorough, evidence-based, loves documentation',
    color: 'blue',
    icon: '🔬'
  },
  {
    id: 'creative',
    name: 'Creative Designer',
    description: 'Innovative solutions, thinks outside the box',
    personality: 'Imaginative, experimental, embraces unconventional approaches',
    color: 'pink',
    icon: '🎨'
  }
];

interface ChangelingMaskProps {
  currentMask?: string;
  onMaskChange?: (maskId: string) => void;
}

const ChangelingMask: React.FC<ChangelingMaskProps> = ({ 
  currentMask = 'cranky', 
  onMaskChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMask, setSelectedMask] = useState(currentMask);

  const handleMaskSelect = (maskId: string) => {
    setSelectedMask(maskId);
    setIsOpen(false);
    if (onMaskChange) {
      onMaskChange(maskId);
    }
  };

  const currentMaskData = AVAILABLE_MASKS.find(m => m.id === selectedMask) || AVAILABLE_MASKS[0];

  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-500/10 border-cyan-500/30 text-cyan-300',
    emerald: 'from-emerald-500/20 to-emerald-500/10 border-emerald-500/30 text-emerald-300',
    purple: 'from-purple-500/20 to-purple-500/10 border-purple-500/30 text-purple-300',
    blue: 'from-blue-500/20 to-blue-500/10 border-blue-500/30 text-blue-300',
    pink: 'from-pink-500/20 to-pink-500/10 border-pink-500/30 text-pink-300'
  };

  const hoverColorClasses: Record<string, string> = {
    cyan: 'hover:from-cyan-500/30 hover:to-cyan-500/20',
    emerald: 'hover:from-emerald-500/30 hover:to-emerald-500/20',
    purple: 'hover:from-purple-500/30 hover:to-purple-500/20',
    blue: 'hover:from-blue-500/30 hover:to-blue-500/20',
    pink: 'hover:from-pink-500/30 hover:to-pink-500/20'
  };

  return (
    <div className="relative">
      {/* Current Mask Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1.5 px-2 py-1 bg-gradient-to-r ${colorClasses[currentMaskData.color]} border rounded-lg transition-all ${hoverColorClasses[currentMaskData.color]}`}
        title={currentMaskData.name}
      >
        <Smile className="w-3 h-3" />
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="fixed top-auto bottom-auto right-4 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden" style={{ top: 'calc(100% + 8px)' }}>
            {/* Header */}
            <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700">
              <div className="flex items-center space-x-2">
                <Smile className="w-3 h-3 text-zinc-400" />
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">Changeling Masks</span>
              </div>
              <p className="text-[8px] text-zinc-500 mt-1">Switch Steve's personality and approach</p>
            </div>

            {/* Mask List */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {AVAILABLE_MASKS.map((mask) => {
                const isSelected = mask.id === selectedMask;
                return (
                  <button
                    key={mask.id}
                    onClick={() => handleMaskSelect(mask.id)}
                    className={`w-full text-left p-3 border-b border-zinc-800/50 transition-colors ${
                      isSelected
                        ? 'bg-zinc-800/50'
                        : 'hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-bold text-zinc-200">{mask.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                        </div>
                        <p className="text-[9px] text-zinc-400 mb-1">{mask.description}</p>
                        <p className="text-[8px] text-zinc-500 italic mt-1">{mask.personality}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-zinc-800/30 border-t border-zinc-700">
              <p className="text-[8px] text-zinc-600 leading-relaxed">
                Masks change how Steve thinks, responds, and approaches problems. His core capabilities remain the same.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChangelingMask;
