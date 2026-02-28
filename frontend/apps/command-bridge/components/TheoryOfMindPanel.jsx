import React, { useState, useEffect } from 'react';
import { User, MessageSquare } from 'lucide-react';

const TheoryOfMindPanel = ({ isConnected }) => {
  const [mindData, setMindData] = useState(null);

  useEffect(() => {
    if (!isConnected) return;

    const fetchToM = async () => {
      try {
        const res = await fetch('/api/theory-of-mind/insights?userId=default_user');
        if (res.ok) {
          const data = await res.json();
          setMindData(data.insights);
        }
      } catch (e) {}
    };

    fetchToM();
    const interval = setInterval(fetchToM, 10000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="bg-[#151518]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg h-[300px]">
      <h3 className="text-zinc-100 font-semibold text-sm mb-4 flex items-center">
        <User className="w-4 h-4 mr-2 text-sky-400" /> User Model (Theory of Mind)
      </h3>

      <div className="space-y-4">
        <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Predicted Intent</span>
                <span className="text-sky-400 font-mono">{(mindData?.intent?.confidence * 100)?.toFixed(0)}%</span>
            </div>
            <div className="p-2 bg-[#09090b]/40 rounded border border-white/5 text-sm text-zinc-200">
                {mindData?.intent?.current || "Awaiting interaction..."}
            </div>
        </div>

        <div>
            <div className="text-xs text-zinc-400 mb-2">Recent Context</div>
            <div className="flex flex-wrap gap-2">
                {(mindData?.contextTags || []).slice(0, 5).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-sky-500/10 text-sky-300 rounded text-[10px] border border-sky-500/20">
                        {tag}
                    </span>
                ))}
                {(!mindData?.contextTags || mindData.contextTags.length === 0) && (
                    <span className="text-zinc-600 text-xs italic">No context tags</span>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TheoryOfMindPanel;
