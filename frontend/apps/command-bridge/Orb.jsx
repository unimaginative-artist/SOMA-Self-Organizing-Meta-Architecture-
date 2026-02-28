import React, { useState, useEffect, useRef } from 'react';

// Orb Component - Visual Interface for SOMA
const Orb = ({ volume, isActive, isTalking, isListening, isThinking }) => {
  // Animation frame time for smooth pulse effects
  const [animationTime, setAnimationTime] = useState(0);
  const animationFrameRef = useRef();
  
  // Smooth animation loop for listening/thinking pulse effects
  useEffect(() => {
    if (!isActive || isTalking) {
      // Don't run animation loop when inactive or talking (volume handles it)
      return;
    }
    
    const animate = (timestamp) => {
      setAnimationTime(timestamp);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isTalking]);
  
  // Natural conversation states with visual feedback
  const baseScale = 0.8;
  const pulseFactor = 3; 
  
  // State-based colors
  let primaryColor = 'bg-white'; // Core
  let secondaryColor = 'bg-purple-500'; // Inner glow
  let tertiaryColor = 'bg-fuchsia-600'; // Outer glow
  
  if (isListening) {
    // Listening = calm blue tones (attentive)
    primaryColor = 'bg-blue-200';
    secondaryColor = 'bg-blue-400';
    tertiaryColor = 'bg-cyan-500';
  } else if (isThinking) {
    // Thinking = amber/yellow tones (processing)
    primaryColor = 'bg-yellow-200';
    secondaryColor = 'bg-amber-400';
    tertiaryColor = 'bg-orange-500';
  } else if (isTalking) {
    // Talking = vibrant purple/fuchsia (active)
    primaryColor = 'bg-white';
    secondaryColor = 'bg-purple-500';
    tertiaryColor = 'bg-fuchsia-600';
  }
  
  // Scale based on volume when talking, gentle pulse when listening
  const activeScale = isActive ? (
    isTalking ? baseScale + (volume * pulseFactor) : 
    isListening ? baseScale + (Math.sin(animationTime / 500) * 0.1) : // Subtle pulse
    baseScale
  ) : 0;
  
  const activeOpacity = isActive ? (
    isTalking ? 0.3 + (volume * 0.7) : 
    isListening ? 0.4 + (Math.sin(animationTime / 800) * 0.2) : // Gentle breathing
    0.5
  ) : 0;
  
  const wrapperOpacity = isActive ? 1 : 0;

  return (
    <div 
      className="relative flex items-center justify-center transition-all duration-1000 ease-in-out h-96 w-96 mx-auto my-8"
      style={{
        opacity: wrapperOpacity,
        // CSS Variable for performance
        '--orb-scale': activeScale,
        '--orb-opacity': activeOpacity
      }}
    >
      
      {/* Container scales with volume - Fast snappy transition */}
      <div 
        className="relative flex items-center justify-center"
        style={{
          transform: `scale(max(0, var(--orb-scale)))`, 
          opacity: `var(--orb-opacity)`,
          // Fast transition (0.05s) to catch every syllable
          transition: isActive ? 'transform 0.05s cubic-bezier(0, 0, 0.2, 1), opacity 0.05s linear' : 'transform 1s ease-in-out, opacity 1s', 
        }}
      >
        {/* Layer 1: The Core Nucleus (State-based color) */}
        <div 
          className={`relative w-32 h-32 ${primaryColor} rounded-full blur-md z-30 transition-colors duration-500`}
          style={{ 
            boxShadow: `0 0 100px ${isListening ? 'rgba(96, 165, 250, 1)' : isThinking ? 'rgba(251, 191, 36, 1)' : 'rgba(216, 180, 254, 1)'}`,
          }}
        />

        {/* Layer 2: Inner Glow (State-based color) */}
        <div 
          className={`absolute w-64 h-64 ${secondaryColor} rounded-full blur-2xl z-20 mix-blend-screen transition-colors duration-500`}
        />

        {/* Layer 3: Outer Aura (State-based color) */}
        <div 
          className={`absolute w-[500px] h-[500px] ${tertiaryColor} rounded-full blur-[100px] z-10 opacity-70 mix-blend-screen transition-colors duration-500`}
        />
        
        {/* Layer 4: Deep Violet Atmosphere (Far Glow) */}
         <div 
          className="absolute w-[800px] h-[800px] bg-violet-900 rounded-full blur-[150px] -z-10 opacity-40 mix-blend-screen"
        />

      </div>
    </div>
  );
};

export default Orb;
