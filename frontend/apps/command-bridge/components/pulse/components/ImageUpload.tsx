import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Sparkles, Loader2, Eye } from 'lucide-react';
import SomaThinking from './SomaThinking';

interface ImageUploadProps {
  onImageAnalyzed?: (result: any) => void;
  onClose?: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageAnalyzed, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      
      // Convert to base64 without data URI prefix for API
      const base64 = result.split(',')[1];
      setImageData(base64);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageData || !onImageAnalyzed) return;

    setAnalyzing(true);
    try {
      // Call vision analysis API
      const response = await fetch('/api/pulse/arbiter/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          mimeType,
          analysisType: 'ui_mockup'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        onImageAnalyzed(result);
      } else {
        console.error('[ImageUpload] Analysis failed:', result.error);
      }
    } catch (error) {
      console.error('[ImageUpload] Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setImageData(null);
    setMimeType('');
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Vision Blueprint</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {!preview ? (
          <>
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all
                ${isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/30'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-purple-500/20' : 'bg-zinc-800'
                }`}>
                  <Upload className={`w-6 h-6 ${isDragging ? 'text-purple-400' : 'text-zinc-500'}`} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-300">
                    Drop your UI mockup or wireframe here
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    or click to browse
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-[9px] text-zinc-600">
                  <ImageIcon className="w-3 h-3" />
                  <span>PNG, JPG, WEBP supported</span>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Info */}
            <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded">
              <div className="text-[9px] text-purple-300 leading-relaxed">
                <div className="font-bold mb-1">💡 Vision-Powered Generation</div>
                Upload a UI mockup, wireframe, or design screenshot. The VisionProcessingArbiter
                will analyze it and generate a complete blueprint with HTML, CSS, and JavaScript.
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Preview */}
            <div className="relative">
              <img
                src={preview}
                alt="Upload preview"
                className="w-full h-auto rounded border border-zinc-700"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded text-zinc-400 hover:text-red-400 hover:border-red-500/50 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Analyze Button / Thinking State */}
            {analyzing ? (
              <div className="w-full bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/30 rounded">
                <SomaThinking 
                  message="Analyzing Vision..."
                  subtext="VisionProcessingArbiter extracting UI elements"
                />
              </div>
            ) : (
              <button
                onClick={handleAnalyze}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded text-xs font-bold text-purple-300 transition-all"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Blueprint from Image</span>
              </button>
            )}

            {/* Analysis Info */}
            <div className="text-[9px] text-zinc-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Type:</span>
                <span className="font-mono text-zinc-400">{mimeType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Analysis:</span>
                <span className="text-purple-400 font-bold">UI Mockup Detection</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
