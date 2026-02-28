import React, { useState, useCallback } from 'react';
import { Eye, Upload, Image as ImageIcon, FileText, Code, Sparkles, Loader, Download } from 'lucide-react';

interface VisionAnalysis {
  id: string;
  type: 'ui-to-code' | 'ocr' | 'visual-reasoning' | 'diagram-analysis';
  imageUrl: string;
  result: string;
  code?: string;
  timestamp: number;
  status: 'analyzing' | 'completed' | 'failed';
}

interface EnhancedVisionPanelProps {
  isVisible: boolean;
  onCodeGenerated?: (code: string, language: string) => void;
}

const EnhancedVisionPanel: React.FC<EnhancedVisionPanelProps> = ({ isVisible, onCodeGenerated }) => {
  const [analyses, setAnalyses] = useState<VisionAnalysis[]>([]);
  const [selectedType, setSelectedType] = useState<VisionAnalysis['type']>('ui-to-code');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      const newAnalysis: VisionAnalysis = {
        id: Date.now().toString(),
        type: selectedType,
        imageUrl: base64,
        result: '',
        status: 'analyzing',
        timestamp: Date.now()
      };
      
      setAnalyses(prev => [newAnalysis, ...prev]);
      setSelectedAnalysis(newAnalysis.id);

      try {
        const res = await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: selectedType,
            image: base64.split(',')[1]
          })
        });

        const data = await res.json();
        
        setAnalyses(prev => prev.map(a => 
          a.id === newAnalysis.id 
            ? { ...a, status: 'completed', result: data.result, code: data.code }
            : a
        ));

        if (data.code && onCodeGenerated) {
          onCodeGenerated(data.code, data.language || 'typescript');
        }
      } catch (err) {
        console.error('Vision analysis failed', err);
        setAnalyses(prev => prev.map(a => 
          a.id === newAnalysis.id 
            ? { ...a, status: 'failed', result: 'Analysis failed' }
            : a
        ));
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [selectedType]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  if (!isVisible) return null;

  const selected = analyses.find(a => a.id === selectedAnalysis);

  return (
    <div 
      className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-30 flex overflow-hidden border-l border-purple-500/20"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Left Side - Upload & History */}
      <div className="w-80 border-r border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-purple-950/50 to-transparent">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Vision Arbiter</h2>
              <p className="text-[10px] text-zinc-500">Advanced visual analysis</p>
            </div>
          </div>

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedType('ui-to-code')}
              className={`flex flex-col items-center p-2 rounded-lg text-[10px] font-bold transition-all ${
                selectedType === 'ui-to-code'
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                  : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-purple-400'
              }`}
            >
              <Code className="w-4 h-4 mb-1" />
              <span>UI → CODE</span>
            </button>
            <button
              onClick={() => setSelectedType('ocr')}
              className={`flex flex-col items-center p-2 rounded-lg text-[10px] font-bold transition-all ${
                selectedType === 'ocr'
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                  : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-purple-400'
              }`}
            >
              <FileText className="w-4 h-4 mb-1" />
              <span>OCR</span>
            </button>
            <button
              onClick={() => setSelectedType('visual-reasoning')}
              className={`flex flex-col items-center p-2 rounded-lg text-[10px] font-bold transition-all ${
                selectedType === 'visual-reasoning'
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                  : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-purple-400'
              }`}
            >
              <Sparkles className="w-4 h-4 mb-1" />
              <span>REASONING</span>
            </button>
            <button
              onClick={() => setSelectedType('diagram-analysis')}
              className={`flex flex-col items-center p-2 rounded-lg text-[10px] font-bold transition-all ${
                selectedType === 'diagram-analysis'
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                  : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-purple-400'
              }`}
            >
              <ImageIcon className="w-4 h-4 mb-1" />
              <span>DIAGRAM</span>
            </button>
          </div>
        </div>

        {/* Drop Zone */}
        <div className="p-4 border-b border-zinc-800">
          <label
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-zinc-700 bg-zinc-900/30 hover:border-purple-500/50 hover:bg-purple-500/5'
            }`}
          >
            <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-purple-400' : 'text-zinc-600'}`} />
            <p className="text-xs font-medium text-zinc-400 text-center">
              {isDragging ? 'Drop image here' : 'Click or drag image'}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">PNG, JPG, WebP</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Recent Analyses</p>
          {analyses.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-8">No analyses yet</p>
          ) : (
            analyses.map(analysis => (
              <button
                key={analysis.id}
                onClick={() => setSelectedAnalysis(analysis.id)}
                className={`w-full p-2 rounded-lg border text-left transition-all ${
                  selectedAnalysis === analysis.id
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                    analysis.type === 'ui-to-code' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                    analysis.type === 'ocr' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                    analysis.type === 'visual-reasoning' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {analysis.type.split('-')[0]}
                  </span>
                  {analysis.status === 'analyzing' && (
                    <Loader className="w-3 h-3 text-purple-400 animate-spin" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500">
                  {new Date(analysis.timestamp).toLocaleTimeString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Analysis Result</h3>
              {selected.code && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selected.code!);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>COPY CODE</span>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <div className="space-y-4">
                {/* Image */}
                <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                  <img 
                    src={selected.imageUrl} 
                    alt="Analysis target"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Result */}
                {selected.status === 'analyzing' ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                    <p className="text-sm text-zinc-400">Analyzing image...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Interpretation</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{selected.result}</p>
                    </div>

                    {selected.code && (
                      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Generated Code</p>
                        <pre className="text-xs text-emerald-400 font-mono overflow-x-auto custom-scrollbar">
                          {selected.code}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-zinc-900/50 border border-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Eye className="w-8 h-8 text-zinc-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">No analysis selected</p>
                <p className="text-xs text-zinc-600 mt-1">Upload an image to begin</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedVisionPanel;
