import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Maximize2, Minimize2, Volume2, VolumeX, Brain, Code, MessageCircle } from 'lucide-react';
import Orb from './Orb';
import orbVoiceService from './OrbVoiceService';
import ReasoningTree from './ReasoningTree';
import EmotionIndicator from './EmotionIndicator';
import '../../styles/orb.css';

/**
 * FloatingOrbWidget - Beautiful floating orb widget with voice interaction
 * Features:
 * - Draggable positioning with localStorage persistence
 * - Expandable/collapsible states
 * - Voice recognition and TTS
 * - Real-time volume visualization
 * - Beautiful animations and effects
 */
const FloatingOrbWidget = ({ isConnected, isTalking, isListening, volume, onOrbClick, onVoiceClick, onChatClick }) => {
  // Position and layout state
  const [orbExpanded, setOrbExpanded] = useState(false);
  const [orbPosition, setOrbPosition] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('orbPosition');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      x: window.innerWidth - 250,
      y: window.innerHeight - 250
    };
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Refs
  const widgetRef = useRef(null);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('orbPosition', JSON.stringify(orbPosition));
  }, [orbPosition]);

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.orb-controls')) return; // Don't drag when clicking controls
    if (orbExpanded) return; // Don't drag when expanded

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - orbPosition.x,
      y: e.clientY - orbPosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep within bounds
    const maxX = window.innerWidth - (orbExpanded ? 400 : 200);
    const maxY = window.innerHeight - (orbExpanded ? 600 : 200);

    setOrbPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Toggle expanded state
  const toggleExpanded = () => {
    if (!orbExpanded && !isDragging) {
      setOrbExpanded(true);
    }
  };

  const collapse = () => {
    setOrbExpanded(false);
  };

  return (
    <div
      ref={widgetRef}
      className={`orb-widget ${orbExpanded ? 'expanded' : ''}`}
      style={{
        left: orbPosition.x,
        top: orbPosition.y,
        width: orbExpanded ? '300px' : '150px',
        height: orbExpanded ? '400px' : '150px',
        cursor: isDragging ? 'grabbing' : orbExpanded ? 'default' : 'grab',
        position: 'fixed',
        zIndex: 1000
      }}
      onMouseDown={handleMouseDown}
      onClick={!isDragging ? toggleExpanded : undefined}
    >
      {/* Main Orb Visualization */}
      <div className="relative flex items-center justify-center h-full pointer-events-none">
        <div onClick={onOrbClick} className="pointer-events-auto cursor-pointer">
            <Orb
            volume={volume}
            isActive={isConnected}
            isTalking={isTalking}
            isListening={isListening}
            isThinking={false}
            />
        </div>

        {/* Status Indicator */}
        {!orbExpanded && (
          <div className={`orb-indicator ${isConnected ? 'active' : 'idle'}`}>
            {isConnected ? (isListening ? 'Listening...' : isTalking ? 'Speaking...' : 'Online') : 'Offline'}
          </div>
        )}
      </div>

      {/* Expanded Controls View */}
      {orbExpanded && (
        <div className="absolute inset-0 flex flex-col pointer-events-auto bg-[#0a0a0f]/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-zinc-200 font-bold uppercase tracking-wider text-xs">Orb Controls</h3>
                <button onClick={(e) => { e.stopPropagation(); collapse(); }} className="text-zinc-500 hover:text-white">
                    <Minimize2 className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex flex-col space-y-3">
                <button 
                    onClick={onVoiceClick}
                    className={`w-full py-3 rounded-lg font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center space-x-2 ${
                        isListening ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    }`}
                >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListening ? 'Stop Voice' : 'Start Voice'}</span>
                </button>
                
                <button 
                    onClick={onChatClick}
                    className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 rounded-lg font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center space-x-2"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span>Open Chat</span>
                </button>
            </div>
            
            <div className="mt-auto pt-4 border-t border-white/10">
                <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>Status:</span>
                    <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default FloatingOrbWidget;