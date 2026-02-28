import React, { useState, useEffect } from 'react';
import { Play, Loader2, CheckCircle, AlertCircle, Wrench } from 'lucide-react';
import { PulseClient } from '../services/PulseClient';

const pulseClient = new PulseClient();

interface Tool {
  name: string;
  description: string;
  parameters?: {
    [key: string]: {
      type: string;
      description?: string;
      required?: boolean;
      default?: any;
    };
  };
}

interface ToolExecutorProps {
  toolName: string;
  onClose?: () => void;
  onExecutionComplete?: (result: any) => void;
}

const ToolExecutor: React.FC<ToolExecutorProps> = ({ toolName, onClose, onExecutionComplete }) => {
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  useEffect(() => {
    loadTool();
  }, [toolName]);

  const loadTool = async () => {
    try {
      setLoading(true);
      const response = await pulseClient.listSteveTools();
      if (response.success && response.tools) {
        const foundTool = response.tools.find((t: Tool) => t.name === toolName);
        if (foundTool) {
          setTool(foundTool);
          // Initialize parameter values with defaults
          if (foundTool.parameters) {
            const defaults: Record<string, any> = {};
            Object.entries(foundTool.parameters).forEach(([key, param]) => {
              if (param.default !== undefined) {
                defaults[key] = param.default;
              }
            });
            setParamValues(defaults);
          }
        }
      }
    } catch (error) {
      console.error('[ToolExecutor] Failed to load tool:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!tool) return;

    try {
      setExecuting(true);
      setResult(null);

      const response = await pulseClient.executeTool(toolName, paramValues);

      if (response.success) {
        setResult({
          success: true,
          message: 'Tool executed successfully!',
          data: response.result
        });
        if (onExecutionComplete) {
          onExecutionComplete(response.result);
        }
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to execute tool'
        });
      }
    } catch (error) {
      console.error('[ToolExecutor] Execution error:', error);
      setResult({
        success: false,
        message: 'An error occurred while executing the tool'
      });
    } finally {
      setExecuting(false);
    }
  };

  const renderParameterInput = (paramName: string, param: any) => {
    const value = paramValues[paramName] || '';

    switch (param.type) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setParamValues(prev => ({ ...prev, [paramName]: e.target.checked }))}
              className="w-3 h-3 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/20"
            />
            <span className="text-[9px] text-zinc-400">Enable</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setParamValues(prev => ({ ...prev, [paramName]: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
        );

      case 'array':
        return (
          <textarea
            value={Array.isArray(value) ? value.join('\n') : value}
            onChange={(e) => setParamValues(prev => ({ ...prev, [paramName]: e.target.value.split('\n').filter(l => l.trim()) }))}
            placeholder="One item per line"
            className="w-full h-20 bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
        );

      case 'object':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setParamValues(prev => ({ ...prev, [paramName]: parsed }));
              } catch {
                setParamValues(prev => ({ ...prev, [paramName]: e.target.value }));
              }
            }}
            placeholder='{"key": "value"}'
            className="w-full h-24 bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 font-mono resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
        );

      default: // string
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setParamValues(prev => ({ ...prev, [paramName]: e.target.value }))}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2 text-zinc-500 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading tool...</span>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-4">
        <div className="text-xs text-red-400">Tool not found: {toolName}</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-zinc-200">Execute Tool</h3>
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
        {/* Tool Info */}
        <div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Tool</div>
          <div className="text-[10px] font-mono text-cyan-400 mt-1">{tool.name}</div>
          {tool.description && (
            <div className="text-[9px] text-zinc-400 mt-1">{tool.description}</div>
          )}
        </div>

        {/* Parameters */}
        {tool.parameters && Object.keys(tool.parameters).length > 0 && (
          <div className="space-y-3">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Parameters</div>
            {Object.entries(tool.parameters).map(([paramName, param]) => (
              <div key={paramName} className="space-y-1">
                <label className="text-[9px] text-zinc-300 font-mono flex items-center space-x-1">
                  <span>{paramName}</span>
                  {param.required && <span className="text-red-400">*</span>}
                  <span className="text-zinc-600">({param.type})</span>
                </label>
                {param.description && (
                  <div className="text-[8px] text-zinc-500">{param.description}</div>
                )}
                {renderParameterInput(paramName, param)}
              </div>
            ))}
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={executing}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/30 rounded text-xs font-bold text-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {executing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Execute Tool</span>
            </>
          )}
        </button>

        {/* Result */}
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
                {result.data && (
                  <div className="mt-2 p-2 bg-zinc-950/50 rounded border border-zinc-800">
                    <div className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Result</div>
                    <pre className="text-[9px] text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto">
                      {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolExecutor;
