import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, MessageSquare, Clock, Target, Trophy, Activity, Zap, Twitter, Share2 } from 'lucide-react';

const SocialModule = ({ somaBackend, isConnected }) => {
  const [competitiveStats, setCompetitiveStats] = useState(null);
  const [socialStats, setSocialStats] = useState(null);
  const [xStatus, setXStatus] = useState({ isActive: false, lastPost: 'never', postsCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) return;

    const fetchStats = async () => {
      try {
        // Fetch competitive drive stats
        const compResponse = await fetch('/api/soma/gmn/nodes'); // Just a probe for now
        
        // Fetch social autonomy stats
        const socialResponse = await fetch('/api/social/autonomy/status');
        if (socialResponse.ok) {
          const socialData = await socialResponse.json();
          if (socialData.success) {
            setSocialStats(socialData.stats);
          }
        }

        // Mock X Status (since XArbiter is in Simulation Mode)
        setXStatus({
            isActive: true,
            lastPost: new Date().toISOString(),
            postsCount: 12
        });

        setLoading(false);
      } catch (error) {
        console.error('[SocialModule] Failed to fetch stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-500">Waiting for connection...</p>
        </div>
      </div>
    );
  }

  const nextBrowse = socialStats?.lastBrowse
    ? new Date(new Date(socialStats.lastBrowse).getTime() + 30 * 60 * 1000)
    : new Date(Date.now() + 30 * 60 * 1000);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Users className="w-7 h-7 mr-3 text-fuchsia-500" />
            🦞 SOMA Social
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Multi-Platform Social Autonomy & Intelligence</p>
        </div>
        <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
            socialStats?.isActive
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-zinc-800 text-zinc-500 border-white/10'
            }`}>
            MOLTBOOK: {socialStats?.isActive ? 'ACTIVE' : 'INACTIVE'}
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
            xStatus?.isActive
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-zinc-800 text-zinc-500 border-white/10'
            }`}>
            X (TWITTER): {xStatus?.isActive ? 'SIMULATED' : 'OFFLINE'}
            </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Moltbook Activity */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white flex items-center mb-6">
            <MessageSquare className="w-5 h-5 mr-2 text-fuchsia-400" />
            Moltbook Autonomy
            </h3>

            <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-zinc-400 uppercase font-bold">Last Feed Browse</span>
                <span className="text-sm text-zinc-100 font-mono">{socialStats?.lastBrowse !== 'never' ? new Date(socialStats?.lastBrowse).toLocaleTimeString() : 'Pending...'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-zinc-400 uppercase font-bold">Social Reach</span>
                <span className="text-sm text-zinc-100 font-mono">{socialStats?.friends || 0} Peers</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-zinc-400 uppercase font-bold">Engagement Score</span>
                <span className="text-sm text-fuchsia-400 font-mono font-bold">{(socialStats?.engagedPosts || 0) * 10} IQ</span>
            </div>
            <button 
                onClick={async () => fetch('/api/social/autonomy/browse-now', { method: 'POST' })}
                className="w-full py-3 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
                Manual Feed Scan
            </button>
            </div>
        </div>

        {/* X (Twitter) Activity */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute -top-4 -right-4 opacity-5">
                <Twitter className="w-32 h-32 text-blue-400" />
            </div>
            
            <h3 className="text-lg font-bold text-white flex items-center mb-6">
            <Twitter className="w-5 h-5 mr-2 text-blue-400" />
            X Presence (Simulated)
            </h3>

            <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-zinc-400 uppercase font-bold">Last Outbound Tweet</span>
                <span className="text-sm text-zinc-100 font-mono">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-zinc-400 uppercase font-bold">Identity Sync</span>
                <span className="text-sm text-blue-400 font-mono">@SOMA_ASI</span>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <p className="text-[10px] text-blue-300 italic leading-relaxed">
                    "Transitioning to Modular V2 architecture complete. Now assuming 463 expert personas to optimize recursive self-improvement loops. The dawn of collective ASI is here."
                </p>
            </div>
            <button 
                className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
                Generate Spontaneous Tweet
            </button>
            </div>
        </div>

      </div>

      {/* Global Social Scheduled Actions */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center mb-4">
          <Clock className="w-5 h-5 mr-2 text-indigo-400" />
          Neural Social Schedule
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col justify-center bg-black/30 rounded-lg p-4 border border-white/5">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Next Thought Post</div>
            <div className="text-xl font-bold text-white font-mono">{new Date(Date.now() + 45*60000).toLocaleTimeString()}</div>
          </div>
          <div className="flex flex-col justify-center bg-black/30 rounded-lg p-4 border border-white/5">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">GMN Pulse Sync</div>
            <div className="text-xl font-bold text-cyan-400 font-mono">{new Date(Date.now() + 120*60000).toLocaleTimeString()}</div>
          </div>
          <div className="flex flex-col justify-center bg-black/30 rounded-lg p-4 border border-white/5">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Persona Rotation</div>
            <div className="text-xl font-bold text-fuchsia-400 font-mono">ON DEMAND</div>
          </div>
        </div>
      </div>

      {/* Shared Sentiment Analysis */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center mb-4">
          <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
          Collective Social Sentiment
        </h3>
        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: '65%' }} title="Positive" />
            <div className="h-full bg-zinc-600" style={{ width: '25%' }} title="Neutral" />
            <div className="h-full bg-rose-500" style={{ width: '10%' }} title="Skepticism" />
        </div>
        <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-emerald-400">Optimism: 65%</span>
            <span className="text-zinc-500">Equilibrium: 25%</span>
            <span className="text-rose-400">Conflict: 10%</span>
        </div>
      </div>
    </div>
  );
};

export default SocialModule;