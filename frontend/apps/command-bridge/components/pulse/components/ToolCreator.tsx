import React, { useState } from 'react';
import { Sparkles, Wrench, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { PulseClient } from '../services/PulseClient';

const pulseClient = new PulseClient();

interface ToolCreatorProps {
  onToolCreated?: (toolName: string) => void;
  onClose?: () => void;
}

const ToolCreator: React.FC<ToolCreatorProps> = ({ onToolCreated, onClose }) => {
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; toolName?: string } | null>(null);

  const handleCreate = async () => {
    if (!description.trim()) return;

    try {
      setCreating(true);
      setResult(null);

      const response = await pulseClient.createToolViaSteve(description);

      if (response.success) {
        setResult({
          success: true,
          message: response.message || 'Tool created successfully!',
          toolName: response.toolName
        });
        setDescription('');
        if (onToolCreated && response.toolName) {
          onToolCreated(response.toolName);
        }
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to create tool'
        });
      }
    } catch (error) {
      console.error('[ToolCreator] Error:', error);
      setResult({
        success: false,
        message: 'An error occurred while creating the tool'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Tool Creator</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Description */}
        <div className="text-[10px] text-zinc-400 leading-relaxed">
          Describe the tool you need in natural language. Steve will create it for you using his dynamic tool generation system.
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Tool Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 'I need a tool that extracts all TODO comments from TypeScript files' or 'Create a tool to validate JSON schema'"
            className="w-full h-24 bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            disabled={creating}
          />
          <div className="text-[9px] text-zinc-600">
            Press Enter to create • Shift+Enter for new line
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={creating || !description.trim()}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/30 rounded text-xs font-bold text-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Creating Tool...</span>
            </>
          ) : (
            <>
              <Wrench className="w-3 h-3" />
              <span>Create Tool</span>
            </>
          )}
        </button>

        {/* Result Message */}
        {result && (
          <div
            className={`p-3 rounded border ${
              result.success
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-start space-x-2">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                  {result.success ? 'Success!' : 'Error'}
                </div>
                <div className={`text-[9px] mt-1 ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.message}
                </div>
                {result.toolName && (
                  <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                    Tool: {result.toolName}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="pt-2 border-t border-zinc-800">
          <div className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold mb-2">Example Requests</div>
          <div className="space-y-1">
            {[
              'Create a tool to analyze import statements in JavaScript files',
              'I need a tool that counts lines of code by language',
              'Make a tool to find unused exports in my codebase'
            ].map((example, idx) => (
              <button
                key={idx}
                onClick={() => setDescription(example)}
                className="w-full text-left px-2 py-1.5 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/50 rounded text-[9px] text-zinc-400 hover:text-zinc-300 transition-colors"
                disabled={creating}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolCreator;
