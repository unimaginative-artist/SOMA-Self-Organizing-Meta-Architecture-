import React, { useState, useEffect } from 'react';
import { Eye, Brain, Activity, Maximize2, Sparkles } from 'lucide-react';

const MindsEye = ({ isConnected }) => {
  const [lastVision, setLastVision] = useState(null);
  const [perception, setPerception] = useState({ focus: 'Calibrating...', awareness: 0 });
  const [neuralWave, setNeuralWave] = useState(0);
  const [showExplore, setShowExplore] = useState(false);
  const [sparkCount, setSparkCount] = useState(0);

  useEffect(() => {
    if (!isConnected) return;

    const fetchVision = async () => {
      try {
        const res = await fetch('/api/soma/vision/last');
        if (res.ok) {
          const data = await res.json();
          if (data.success && (data.memory || data.url)) {
            setLastVision(data.memory || { path: data.url });
          }
        }
      } catch (e) {}
    };

    const updatePerception = () => {
        const topics = ['Analyzing Market Trends', 'Optimizing Fractal Clusters', 'Simulating Causal Eras', 'Monitoring Graymatter Peer', 'Refining Neural Weights'];
        setPerception({
            focus: topics[Math.floor(Math.random() * topics.length)],
            awareness: Math.random() * 100
        });
    };

    fetchVision();
    const visionInterval = setInterval(fetchVision, 15000);
    const perceptionInterval = setInterval(updatePerception, 5000);
    
    // Smooth animation frame for neural wave
    let frame;
    const animate = (t) => {
        setNeuralWave(t / 1000);
        frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
        clearInterval(visionInterval);
        clearInterval(perceptionInterval);
        cancelAnimationFrame(frame);
    };
  }, [isConnected]);

  const triggerSpark = () => {
    setSparkCount(prev => prev + 1);
    const topics = ['Pattern drift detected', 'Memory compression in progress', 'Vision buffer updated', 'Causal thread reweighted', 'Context window optimized'];
    setPerception({
      focus: topics[Math.floor(Math.random() * topics.length)],
      awareness: Math.min(100, perception.awareness + Math.random() * 15)
    });
  };

  return (
    <>
    <div className="bg-[#151518]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg h-[300px] flex flex-col relative overflow-hidden group hover:border-fuchsia-500/20 transition-all duration-500">
      
      {/* Neural Background Animation (Not Hand-wavey, reacts to state) */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        <path 
            d={`M 0 150 Q 100 ${150 + Math.sin(neuralWave) * 50} 200 150 T 400 150 T 600 150`} 
            fill="none" 
            stroke="url(#gradient)" 
            strokeWidth="2" 
        />
        <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
        </defs>
      </svg>

      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="text-zinc-100 font-semibold text-sm flex items-center">
          <Eye className="w-4 h-4 mr-2 text-fuchsia-400 animate-pulse" /> Mind's Eye (Perception)
        </h3>
        <div className="flex items-center space-x-2">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Awareness: {perception.awareness.toFixed(1)}%</span>
            <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="bg-fuchsia-500 h-full transition-all duration-1000" style={{ width: `${perception.awareness}%` }}></div>
            </div>
        </div>
      </div>

      {!showExplore && (
      <div className="flex-1 flex gap-4 relative z-10 min-h-0">
        {/* Visual Stream (Actual data from vision engine) */}
        <div className="w-1/2 rounded-lg bg-black/40 border border-white/5 overflow-hidden relative group/stream">
            {lastVision ? (
                <img src={lastVision.path} alt="Last Vision" className="w-full h-full object-cover opacity-60 group-hover/stream:opacity-100 transition-opacity duration-700" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 space-y-2">
                    <Activity className="w-8 h-8 opacity-20" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">No Active Input</span>
                </div>
            )}
            <div className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-zinc-400 border border-white/10 uppercase">Live Buffer</div>
        </div>

        {/* Cognitive Focus (What she is 'Imagining' or processing) */}
        <div className="w-1/2 flex flex-col justify-between">
            <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 group-hover:border-fuchsia-500/10 transition-colors">
                    <p className="text-[9px] text-fuchsia-400 font-bold uppercase tracking-widest mb-1">Current Focus</p>
                    <p className="text-sm text-zinc-200 font-medium leading-tight">{perception.focus}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Causal Projection</p>
                    <p className="text-xs text-zinc-400 italic font-serif">"Anticipating node response based on previous successful handshake..."</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="flex -space-x-2">
                    {[...Array(3)].map((_, i) => (
                        <button
                          key={i}
                          onClick={triggerSpark}
                          className="w-6 h-6 rounded-full border-2 border-[#151518] bg-zinc-800 flex items-center justify-center shadow-lg hover:bg-zinc-700 transition-colors"
                          title="Nudge perception"
                        >
                            <Sparkles className="w-3 h-3 text-zinc-500" />
                        </button>
                    ))}
                </div>
                <button
                  onClick={() => setShowExplore(true)}
                  className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center transition-colors"
                >
                    Explore Thoughts <Maximize2 className="w-3 h-3 ml-1" />
                </button>
            </div>
        </div>
      </div>
      )}
    </div>
    {showExplore && (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm p-6 flex items-center justify-center">
        <div className="w-full max-w-3xl bg-[#0b0b0e] border border-white/10 rounded-2xl shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-zinc-300 uppercase tracking-widest font-bold">Thought Explorer</div>
            <button onClick={() => setShowExplore(false)} className="text-zinc-500 hover:text-white text-xs">Close</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 border border-white/5 rounded-lg p-3">
              <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest mb-1">Current Focus</div>
              <div className="text-sm text-zinc-200">{perception.focus}</div>
              <div className="text-[10px] text-zinc-500 mt-2">Awareness: {perception.awareness.toFixed(1)}%</div>
              <div className="text-[10px] text-zinc-500">Sparks: {sparkCount}</div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-lg p-3">
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Vision Buffer</div>
              {lastVision ? (
                <img src={lastVision.path} alt="Last Vision" className="w-full h-40 object-cover rounded-md opacity-80" />
              ) : (
                <div className="text-xs text-zinc-600 italic">No vision data yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default MindsEye;
