import React, { useState, useEffect, useRef } from 'react';
import { 
  MousePointer2, 
  AlertCircle, 
  Info, 
  Lightbulb, 
  CheckCircle2,
  X,
  MessageSquare,
  Sparkles,
  Eye,
  EyeOff,
  Target
} from 'lucide-react';

interface PreviewAnnotation {
  id: string;
  type: 'warning' | 'info' | 'suggestion' | 'success';
  message: string;
  selector: string; // CSS selector for the element
  position: { x: number; y: number }; // Position in preview
  confidence: number;
  arbiter?: string;
}

interface SelectedElement {
  selector: string;
  tagName: string;
  classes: string[];
  styles: Record<string, string>;
  content: string;
  boundingBox: DOMRect;
}

interface Props {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onElementSelected: (element: SelectedElement) => void;
  onAskSteve: (message: string, context: SelectedElement) => void;
  annotations?: PreviewAnnotation[];
  onDismissAnnotation?: (id: string) => void;
}

const PreviewInspector: React.FC<Props> = ({
  iframeRef,
  onElementSelected,
  onAskSteve,
  annotations = [],
  onDismissAnnotation
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [quickMessage, setQuickMessage] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Inject inspection scripts into iframe
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Inject hover highlighting CSS
    const style = iframeDoc.createElement('style');
    style.textContent = `
      .__pulse-inspector-hover {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px !important;
        cursor: crosshair !important;
        transition: outline 0.15s ease !important;
      }
      .__pulse-inspector-selected {
        outline: 3px solid #10b981 !important;
        outline-offset: 2px !important;
        background: rgba(16, 185, 129, 0.05) !important;
      }
      .__pulse-annotation-target {
        outline: 2px dashed #f59e0b !important;
        outline-offset: 2px !important;
        animation: __pulse-annotation-pulse 2s ease-in-out infinite !important;
      }
      @keyframes __pulse-annotation-pulse {
        0%, 100% { outline-color: #f59e0b; }
        50% { outline-color: #ef4444; }
      }
    `;
    iframeDoc.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [iframeRef]);

  // Handle element hover
  useEffect(() => {
    if (!isSelectionMode || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target && target !== iframeDoc.body && target !== iframeDoc.documentElement) {
        // Remove previous hover
        iframeDoc.querySelectorAll('.__pulse-inspector-hover').forEach(el => {
          el.classList.remove('__pulse-inspector-hover');
        });
        target.classList.add('__pulse-inspector-hover');
        setHoveredElement(target);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target) {
        target.classList.remove('__pulse-inspector-hover');
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as Element;
      if (!target || target === iframeDoc.body) return;

      // Remove previous selection
      iframeDoc.querySelectorAll('.__pulse-inspector-selected').forEach(el => {
        el.classList.remove('__pulse-inspector-selected');
      });
      
      // Add selection class
      target.classList.add('__pulse-inspector-selected');

      // Extract element info
      const computedStyles = iframe.contentWindow?.getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      
      const elementInfo: SelectedElement = {
        selector: generateSelector(target),
        tagName: target.tagName.toLowerCase(),
        classes: Array.from(target.classList).filter(c => !c.startsWith('__pulse-')),
        styles: computedStyles ? {
          color: computedStyles.color,
          backgroundColor: computedStyles.backgroundColor,
          fontSize: computedStyles.fontSize,
          fontFamily: computedStyles.fontFamily,
          padding: computedStyles.padding,
          margin: computedStyles.margin,
          display: computedStyles.display,
          width: computedStyles.width,
          height: computedStyles.height
        } : {},
        content: target.textContent?.slice(0, 100) || '',
        boundingBox: rect
      };

      setSelectedElement(elementInfo);
      onElementSelected(elementInfo);
      setIsSelectionMode(false);
    };

    iframeDoc.addEventListener('mouseover', handleMouseOver);
    iframeDoc.addEventListener('mouseout', handleMouseOut);
    iframeDoc.addEventListener('click', handleClick, true);

    return () => {
      iframeDoc.removeEventListener('mouseover', handleMouseOver);
      iframeDoc.removeEventListener('mouseout', handleMouseOut);
      iframeDoc.removeEventListener('click', handleClick, true);
    };
  }, [isSelectionMode, iframeRef, onElementSelected]);

  // Highlight annotation targets
  useEffect(() => {
    if (!iframeRef.current || !showAnnotations) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Remove all existing annotation highlights
    iframeDoc.querySelectorAll('.__pulse-annotation-target').forEach(el => {
      el.classList.remove('__pulse-annotation-target');
    });

    // Add highlights for current annotations
    annotations.forEach(annotation => {
      try {
        const element = iframeDoc.querySelector(annotation.selector);
        if (element) {
          element.classList.add('__pulse-annotation-target');
        }
      } catch (e) {
        console.warn('Invalid selector:', annotation.selector);
      }
    });

    return () => {
      iframeDoc.querySelectorAll('.__pulse-annotation-target').forEach(el => {
        el.classList.remove('__pulse-annotation-target');
      });
    };
  }, [annotations, showAnnotations, iframeRef]);

  const generateSelector = (element: Element): string => {
    if (element.id) return `#${element.id}`;
    
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ')
          .filter(c => c && !c.startsWith('__pulse-'))
          .slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      if (path.length > 3) break;
    }
    
    return path.join(' > ');
  };

  const handleQuickAsk = () => {
    if (!selectedElement || !quickMessage.trim()) return;
    onAskSteve(quickMessage, selectedElement);
    setQuickMessage('');
    setSelectedElement(null);
  };

  const getAnnotationIcon = (type: PreviewAnnotation['type']) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4" />;
      case 'success': return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getAnnotationColor = (type: PreviewAnnotation['type']) => {
    switch (type) {
      case 'warning': return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
      case 'info': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'suggestion': return 'border-purple-500/50 bg-purple-500/10 text-purple-400';
      case 'success': return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
    }
  };

  return (
    <>
      {/* Inspector Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        {/* Selection Mode Toggle */}
        <button
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            if (isSelectionMode) setSelectedElement(null);
          }}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-lg ${
            isSelectionMode
              ? 'bg-blue-600 text-white border-2 border-blue-400 shadow-blue-500/50'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700'
          }`}
          title={isSelectionMode ? 'Click element to select' : 'Enable element selection'}
        >
          <Target className="w-4 h-4" />
          <span>{isSelectionMode ? 'Click to Select' : 'Inspect'}</span>
        </button>

        {/* Annotations Toggle */}
        <button
          onClick={() => setShowAnnotations(!showAnnotations)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-lg ${
            showAnnotations
              ? 'bg-purple-600 text-white border border-purple-500'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
          title={showAnnotations ? 'Hide Steve\'s suggestions' : 'Show Steve\'s suggestions'}
        >
          {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>{annotations.length}</span>
        </button>
      </div>

      {/* Steve's Annotations Overlay */}
      {showAnnotations && annotations.length > 0 && (
        <div className="absolute top-20 right-4 z-40 flex flex-col gap-2 max-w-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
          {annotations.map(annotation => (
            <div
              key={annotation.id}
              className={`flex flex-col gap-2 p-3 rounded-lg border backdrop-blur-md shadow-xl animate-in slide-in-from-right ${getAnnotationColor(annotation.type)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  {getAnnotationIcon(annotation.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">{annotation.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-[9px] font-mono text-zinc-500 truncate max-w-[150px]" title={annotation.selector}>
                        {annotation.selector}
                      </code>
                      {annotation.confidence && (
                        <span className="text-[9px] font-bold text-zinc-500">
                          {Math.round(annotation.confidence)}%
                        </span>
                      )}
                    </div>
                    {annotation.arbiter && (
                      <div className="flex items-center gap-1 mt-1">
                        <Sparkles className="w-2.5 h-2.5 text-zinc-600" />
                        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">
                          {annotation.arbiter}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDismissAnnotation?.(annotation.id)}
                  className="p-1 hover:bg-zinc-800/50 rounded transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Element Info Panel */}
      {selectedElement && (
        <div className="absolute bottom-4 left-4 right-4 z-50 bg-zinc-900/95 backdrop-blur-md border border-emerald-500/50 rounded-xl shadow-2xl shadow-emerald-500/20 p-4 animate-in slide-in-from-bottom">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <MousePointer2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Element Selected</h3>
                <code className="text-[10px] font-mono text-zinc-400">{selectedElement.selector}</code>
              </div>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Tag</span>
              <div className="text-xs text-zinc-300 font-mono">&lt;{selectedElement.tagName}&gt;</div>
            </div>
            {selectedElement.classes.length > 0 && (
              <div>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Classes</span>
                <div className="text-xs text-zinc-300 font-mono truncate">{selectedElement.classes.join(' ')}</div>
              </div>
            )}
            {selectedElement.content && (
              <div className="col-span-2">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Content</span>
                <div className="text-xs text-zinc-300 truncate">{selectedElement.content}</div>
              </div>
            )}
          </div>

          {/* Quick Ask Steve */}
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-zinc-800 rounded-lg">
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAsk()}
              placeholder="Ask Steve about this element..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-300 placeholder-zinc-600"
              autoFocus
            />
            <button
              onClick={handleQuickAsk}
              disabled={!quickMessage.trim()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-all"
            >
              Ask
            </button>
          </div>
        </div>
      )}

      {/* Selection Mode Overlay Cursor */}
      {isSelectionMode && (
        <div className="absolute inset-0 z-30 cursor-crosshair bg-blue-500/5" />
      )}
    </>
  );
};

export default PreviewInspector;
