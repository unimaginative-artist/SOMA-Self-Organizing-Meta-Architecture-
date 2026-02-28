import React from 'react';
import { Activity, TrendingUp, Shield, Zap, Target } from 'lucide-react';

/**
 * MissionControl - Pulse Terminal Mission Control
 * Real-time trading mission control interface for SOMA Pulse
 */
const MissionControl: React.FC = () => {
  return (
    <div className="w-full h-full bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-lg font-bold text-cyan-400 uppercase tracking-wider">
            Mission Control
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400 font-mono">ACTIVE</span>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-900/50 border border-cyan-500/20 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400 uppercase">System Status</span>
          </div>
          <div className="text-lg font-bold text-cyan-400 font-mono">ONLINE</div>
        </div>

        <div className="bg-gray-900/50 border border-green-500/20 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400 uppercase">Trading Mode</span>
          </div>
          <div className="text-lg font-bold text-green-400 font-mono">PAPER</div>
        </div>

        <div className="bg-gray-900/50 border border-blue-500/20 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400 uppercase">Risk Level</span>
          </div>
          <div className="text-lg font-bold text-blue-400 font-mono">LOW</div>
        </div>

        <div className="bg-gray-900/50 border border-purple-500/20 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400 uppercase">Arbiters</span>
          </div>
          <div className="text-lg font-bold text-purple-400 font-mono">12</div>
        </div>
      </div>

      {/* Mission Objectives */}
      <div className="bg-gray-900/50 border border-cyan-500/20 rounded p-3 mb-3">
        <h3 className="text-sm text-cyan-400 font-bold mb-2 uppercase tracking-wide">
          Active Missions
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Market Analysis</span>
            <span className="text-green-400 font-mono">RUNNING</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Risk Monitoring</span>
            <span className="text-green-400 font-mono">ACTIVE</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Strategy Optimization</span>
            <span className="text-yellow-400 font-mono">STANDBY</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-900/50 border border-cyan-500/20 rounded p-3">
        <h3 className="text-sm text-cyan-400 font-bold mb-2 uppercase tracking-wide">
          Performance
        </h3>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-gray-400">Today's P/L:</span>
            <span className="text-green-400">+$0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Win Rate:</span>
            <span className="text-cyan-400">0.0%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Positions:</span>
            <span className="text-gray-300">0</span>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
        <p className="text-cyan-400 text-xs text-center font-mono">
          💡 Mission Control synced with SOMA autonomous trading systems
        </p>
      </div>
    </div>
  );
};

export default MissionControl;
