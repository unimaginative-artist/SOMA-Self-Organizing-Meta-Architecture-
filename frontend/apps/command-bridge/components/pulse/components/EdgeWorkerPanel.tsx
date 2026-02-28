import React, { useState, useEffect } from 'react';
import { Globe, Camera, Search, AlertCircle, CheckCircle, Clock, ExternalLink, Download, Play, Loader } from 'lucide-react';

interface EdgeTask {
  id: string;
  type: 'scrape' | 'screenshot' | 'research';
  url: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  createdAt: number;
  completedAt?: number;
}

interface EdgeWorkerPanelProps {
  isVisible: boolean;
}

const EdgeWorkerPanel: React.FC<EdgeWorkerPanelProps> = ({ isVisible }) => {
  const [tasks, setTasks] = useState<EdgeTask[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [selectedType, setSelectedType] = useState<'scrape' | 'screenshot' | 'research'>('scrape');
  const [isProcessing, setIsProcessing] = useState(false);

  // Poll for task updates
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/edge/tasks');
        const data = await res.json();
        if (data.success) setTasks(data.tasks || []);
      } catch (err) {
        console.error('Failed to fetch edge tasks', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleStartTask = async () => {
    if (!urlInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/edge/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          url: urlInput.trim()
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [...prev, data.task]);
        setUrlInput('');
      }
    } catch (err) {
      console.error('Failed to start edge task', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = async (taskId: string) => {
    try {
      const res = await fetch(`/api/edge/download/${taskId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edge-result-${taskId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download result', err);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-30 flex flex-col overflow-hidden border-l border-emerald-500/20">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-emerald-950/50 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Edge Orchestrator</h2>
              <p className="text-[10px] text-zinc-500">Web scraping, screenshots & research</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[9px] font-bold text-emerald-400">
              {tasks.filter(t => t.status === 'running').length} ACTIVE
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => setSelectedType('scrape')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
              selectedType === 'scrape'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-emerald-400'
            }`}
          >
            <Search className="w-3 h-3" />
            <span>SCRAPE</span>
          </button>
          <button
            onClick={() => setSelectedType('screenshot')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
              selectedType === 'screenshot'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-emerald-400'
            }`}
          >
            <Camera className="w-3 h-3" />
            <span>SCREENSHOT</span>
          </button>
          <button
            onClick={() => setSelectedType('research')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
              selectedType === 'research'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-emerald-400'
            }`}
          >
            <ExternalLink className="w-3 h-3" />
            <span>RESEARCH</span>
          </button>
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartTask()}
            placeholder="https://example.com"
            className="flex-1 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            disabled={isProcessing}
          />
          <button
            onClick={handleStartTask}
            disabled={isProcessing || !urlInput.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            {isProcessing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>START</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-16 h-16 bg-zinc-900/50 border border-zinc-800 rounded-full flex items-center justify-center">
              <Globe className="w-8 h-8 text-zinc-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">No active tasks</p>
              <p className="text-xs text-zinc-600 mt-1">Enter a URL above to start</p>
            </div>
          </div>
        ) : (
          tasks.slice().reverse().map((task) => (
            <div
              key={task.id}
              className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1 min-w-0">
                  <div className={`mt-0.5 w-2 h-2 rounded-full ${
                    task.status === 'running' ? 'bg-emerald-400 animate-pulse' :
                    task.status === 'completed' ? 'bg-emerald-500' :
                    task.status === 'failed' ? 'bg-red-500' :
                    'bg-zinc-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        task.type === 'scrape' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                        task.type === 'screenshot' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {task.type}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(task.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 truncate">{task.url}</p>
                    {task.status === 'completed' && task.completedAt && (
                      <p className="text-[10px] text-emerald-500 mt-1">
                        ✓ Completed in {((task.completedAt - task.createdAt) / 1000).toFixed(1)}s
                      </p>
                    )}
                    {task.status === 'failed' && (
                      <p className="text-[10px] text-red-500 mt-1">✗ Task failed</p>
                    )}
                  </div>
                </div>
                {task.status === 'completed' && (
                  <button
                    onClick={() => handleDownloadResult(task.id)}
                    className="ml-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-400 hover:text-white transition-all"
                    title="Download result"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EdgeWorkerPanel;
