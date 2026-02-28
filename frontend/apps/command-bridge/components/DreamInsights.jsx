import React, { useState, useEffect } from 'react';
import { Moon, Sparkles, BookOpen, Brain, Lightbulb, Shield, TrendingUp } from 'lucide-react';

const DreamInsights = ({ isConnected }) => {
  const [insights, setInsights] = useState(null);
  const [narrative, setNarrative] = useState('');
  const [sparks, setSparks] = useState([]);
  const [recentInsights, setRecentInsights] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    const fetchDreams = async () => {
      try {
        const [dreamRes, sparkRes] = await Promise.all([
            fetch('/api/dream/insights'),
            fetch('/api/muse/sparks')
        ]);

        if (dreamRes.ok) {
          const data = await dreamRes.json();
          const normalizedInsights = Array.isArray(data.insights)
            ? { recentInsights: data.insights }
            : data.insights;
          setInsights(normalizedInsights);
          if (data.narrative) setNarrative(data.narrative);
          if (normalizedInsights?.recentInsights) setRecentInsights(normalizedInsights.recentInsights);
        }

        if (sparkRes.ok) {
            const data = await sparkRes.json();
            setSparks(data.sparks || []);
        }
      } catch (e) {}
    };

    fetchDreams();
    const interval = setInterval(fetchDreams, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const getInsightIcon = (type) => {
    switch (type) {
      case 'strategic': case 'dream': return <Brain className="w-3 h-3 mr-1 text-violet-400" />;
      case 'recommendation': return <Lightbulb className="w-3 h-3 mr-1 text-amber-400" />;
      case 'security': return <Shield className="w-3 h-3 mr-1 text-rose-400" />;
      case 'pattern': case 'learning': return <TrendingUp className="w-3 h-3 mr-1 text-emerald-400" />;
      default: return <Sparkles className="w-3 h-3 mr-1 text-violet-400" />;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'strategic': case 'dream': return 'border-violet-500/20 bg-violet-500/5';
      case 'recommendation': return 'border-amber-500/20 bg-amber-500/5';
      case 'security': return 'border-rose-500/20 bg-rose-500/5';
      case 'pattern': case 'learning': return 'border-emerald-500/20 bg-emerald-500/5';
      default: return 'border-white/5 bg-black/20';
    }
  };

  return (
    <div className="bg-[#151518]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg h-[250px] flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <h3 className="text-zinc-100 font-semibold text-sm mb-3 flex items-center relative z-10">
        <Moon className="w-4 h-4 mr-2 text-violet-400" /> Dream Journal
      </h3>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 relative z-10">
        {/* Narrative Section */}
        {narrative && (
            <div className="p-3 bg-violet-500/5 border-l-2 border-violet-500/30 rounded-r-lg mb-4">
                <div className="flex items-center text-[10px] text-violet-300 font-bold mb-1 uppercase tracking-wider">
                    <BookOpen className="w-3 h-3 mr-1.5" /> Latest Entry
                </div>
                <p className="text-xs text-zinc-300 italic leading-relaxed font-serif">"{narrative}"</p>
            </div>
        )}
        
        {/* Creative Sparks Section (New) */}
        {sparks.length > 0 && (
            <div className="mb-4 space-y-2">
                {sparks.slice(0, 1).map((spark, i) => (
                    <div key={i} className="p-2.5 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg animate-pulse">
                        <div className="flex items-center text-[10px] text-fuchsia-300 font-bold mb-1 uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 mr-1.5" /> Creative Spark
                        </div>
                        <p className="text-xs text-zinc-200 font-medium leading-tight">{spark.creative_spark}</p>
                        <p className="text-[9px] text-zinc-500 mt-1 italic">Inspired by: "{spark.principle.slice(0, 30)}..."</p>
                    </div>
                ))}
            </div>
        )}

        {/* Recent Insights from Nighttime Learning */}
        {recentInsights.length > 0 && (
          <div className="space-y-2">
            {recentInsights.slice(0, 4).map((insight, i) => (
              <div key={insight.id || i} className={`border p-2.5 rounded-lg hover:border-white/20 transition-colors ${getInsightColor(insight.type)}`}>
                <div className="flex items-center text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider">
                  {getInsightIcon(insight.type)}
                  <span>{insight.type || 'Insight'}</span>
                  <span className="ml-auto text-zinc-600 font-normal">{insight.source}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">{insight.content}</p>
                {insight.confidence && (
                  <div className="text-[10px] text-zinc-600 mt-1 text-right font-mono">
                    Confidence: {(insight.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Legacy predictions */}
        {insights?.predictions?.slice(0, 2).map((p, i) => (
          <div key={i} className="bg-[#09090b]/40 border border-white/5 p-2.5 rounded-lg hover:border-violet-500/20 transition-colors">
            <div className="flex items-center text-xs text-zinc-400 font-bold mb-1">
              <Sparkles className="w-3 h-3 mr-1 text-yellow-400" /> Future Prediction
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{p.prediction}</p>
            <div className="text-[10px] text-zinc-600 mt-1 text-right font-mono">Confidence: {(p.confidence * 100).toFixed(0)}%</div>
          </div>
        ))}

        {(!insights || (!insights.predictions?.length && !recentInsights.length && !narrative && !sparks.length)) && (
            <div className="text-center text-zinc-600 text-xs italic py-8">
                No dreams recorded. System sleeping...
            </div>
        )}
      </div>
    </div>
  );
};

export default DreamInsights;
