import React, { useState } from 'react';
import { Cpu, Activity, Brain } from 'lucide-react';

const SomaMinimal = () => {
  const [activeModule, setActiveModule] = useState('core');

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">SOMA</h1>
          <p className="text-gray-400 text-sm">Command Bridge</p>
        </div>
        <nav className="p-2">
          <button
            onClick={() => setActiveModule('core')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded mb-1 ${
              activeModule === 'core' ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span>Core System</span>
          </button>
          <button
            onClick={() => setActiveModule('command')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded mb-1 ${
              activeModule === 'command' ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>Command Center</span>
          </button>
          <button
            onClick={() => setActiveModule('knowledge')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded mb-1 ${
              activeModule === 'knowledge' ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
          >
            <Brain className="w-5 h-5" />
            <span>Knowledge</span>
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeModule === 'core' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Core System</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">CPU</div>
                <div className="text-2xl font-bold text-white">45%</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">GPU</div>
                <div className="text-2xl font-bold text-white">38%</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">RAM</div>
                <div className="text-2xl font-bold text-white">62%</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Network</div>
                <div className="text-2xl font-bold text-white">23%</div>
              </div>
            </div>
          </div>
        )}
        {activeModule === 'command' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Command Center</h2>
            <p className="text-gray-400">Task queues and commands...</p>
          </div>
        )}
        {activeModule === 'knowledge' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Knowledge Graph</h2>
            <p className="text-gray-400">Knowledge visualization...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SomaMinimal;
