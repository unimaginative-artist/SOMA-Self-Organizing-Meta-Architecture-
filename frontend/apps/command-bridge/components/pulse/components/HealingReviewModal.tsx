import React, { useState } from 'react';
import {
  Shield, Code, Brain, CheckCircle, X, Edit3, 
  AlertTriangle, Sparkles, ArrowRight, Copy
} from 'lucide-react';

interface HealingReviewModalProps {
  attempt: {
    errorSignature: {
      type: string;
      message: string;
      file?: string;
      line?: number;
    };
    proposedFix: {
      files: Array<{ path: string; content: string; explanation: string }>;
      confidence: number;
      reasoning: string;
      arbitersUsed: string[];
    };
  };
  onApply: (editedFiles?: any[]) => void;
  onReject: () => void;
}

const HealingReviewModal: React.FC<HealingReviewModalProps> = ({
  attempt,
  onApply,
  onReject
}) => {
  const [editedFiles, setEditedFiles] = useState(attempt.proposedFix.files);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  const confidence = attempt.proposedFix.confidence;
  const getConfidenceColor = () => {
    if (confidence >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (confidence >= 60) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
  };

  const colors = getConfidenceColor();

  const handleFileEdit = (index: number, newContent: string) => {
    const updated = [...editedFiles];
    updated[index] = { ...updated[index], content: newContent };
    setEditedFiles(updated);
  };

  const selectedFile = editedFiles[selectedFileIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} ${colors.bg} backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                <Shield className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Self-Healing Proposed Fix</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Review before applying
                </p>
              </div>
            </div>
            
            {/* Confidence Badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors.bg} border ${colors.border}`}>
              <Brain className={`w-4 h-4 ${colors.text}`} />
              <div className="text-right">
                <div className={`text-xs font-bold ${colors.text}`}>{confidence}%</div>
                <div className="text-[9px] text-zinc-600 uppercase">Confident</div>
              </div>
            </div>
          </div>

          {/* Error Info */}
          <div className="flex items-start gap-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-red-400 mb-1">{attempt.errorSignature.type}</div>
              <div className="text-xs text-zinc-400 break-words">{attempt.errorSignature.message}</div>
              {attempt.errorSignature.file && (
                <div className="text-[10px] text-zinc-600 mt-1">
                  {attempt.errorSignature.file}:{attempt.errorSignature.line}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tabs */}
          {editedFiles.length > 1 && (
            <div className="w-56 border-r border-zinc-800 bg-zinc-950/50 p-3 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
                Files to Modify ({editedFiles.length})
              </div>
              <div className="space-y-1">
                {editedFiles.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                      selectedFileIndex === idx
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    {file.path.split('/').pop()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Code Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* File Header */}
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono text-zinc-100">{selectedFile.path}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isEditing
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  {isEditing ? 'Editing' : 'Edit Code'}
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(selectedFile.content)}
                  className="p-1.5 hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 rounded transition-all"
                  title="Copy Code"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Explanation */}
            <div className="px-4 py-2 bg-blue-500/5 border-b border-zinc-800 flex items-start gap-2">
              <Sparkles className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-400 leading-relaxed">{selectedFile.explanation}</p>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-zinc-950">
              {isEditing ? (
                <textarea
                  value={selectedFile.content}
                  onChange={(e) => handleFileEdit(selectedFileIndex, e.target.value)}
                  className="w-full h-full p-4 bg-transparent border-none outline-none text-sm font-mono text-zinc-100 resize-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="p-4 text-sm font-mono text-zinc-300 leading-relaxed">
                  {selectedFile.content}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          {/* Arbiter Chain */}
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <Brain className="w-3 h-3" />
            {attempt.proposedFix.arbitersUsed.map((arbiter, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ArrowRight className="w-2.5 h-2.5" />}
                <span className="font-mono">{arbiter}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onReject}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            >
              Reject
            </button>
            <button
              onClick={() => onApply(isEditing ? editedFiles : undefined)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${colors.bg} ${colors.border} border ${colors.text} hover:scale-105 active:scale-95 shadow-lg`}
            >
              <CheckCircle className="w-4 h-4" />
              Apply Fix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealingReviewModal;
