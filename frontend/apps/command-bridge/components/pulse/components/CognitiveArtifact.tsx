
import React, { useState } from 'react';
import { FileCode, Copy, Check, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { BlueprintFile } from '../types';

interface Props {
  file: BlueprintFile;
  onApply?: () => void;
}

const CognitiveArtifact: React.FC<Props> = ({ file, onApply }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 border border-zinc-800 rounded-xl overflow-hidden bg-[#0d0d0e] shadow-lg animate-in zoom-in-95 duration-300">
      {/* Artifact Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-blue-500/10 rounded">
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-bold text-zinc-300 font-mono">{file.path}</span>
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950">
            {file.language}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={handleCopy}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onApply && (
            <button 
              onClick={onApply}
              className="flex items-center space-x-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              <Zap className="w-3 h-3" />
              <span>Apply</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Content */}
      <div className="relative group">
        <pre className="p-4 text-xs font-mono text-zinc-400 overflow-x-auto custom-scrollbar bg-[#09090b] leading-relaxed">
          <code>{file.content}</code>
        </pre>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <span className="text-[9px] text-zinc-600 font-mono">S.T.E.V.E. Generated</span>
        </div>
      </div>
    </div>
  );
};

export default CognitiveArtifact;
