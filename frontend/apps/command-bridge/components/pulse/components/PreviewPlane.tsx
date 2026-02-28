import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PreviewState, BlueprintFile } from '../types';
import PreviewInspector from './PreviewInspector';
import { previewAnalysisService, PreviewAnnotation } from '../services/previewAnalysisService';
// Temporarily disabled for debugging
// import { PerformanceOverlay } from './PerformanceOverlay';
// import { performanceProfiler } from '../services/performanceProfiler';
import {
  Globe,
  RefreshCw,
  RectangleHorizontal,
  RectangleVertical,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layout,
  Code,
  PanelRightClose,
  PanelRightOpen,
  Activity,
  Cpu,
  Sparkles,
  Info,
  Loader2,
  Plus,
  ChevronDown,
  Terminal,
  Zap,
  ChevronUp,
  AlertCircle,
  Rocket,
  Server,
  Cloud,
  Search,
  Eye,
  Settings2,
  Database,
  Package,
  Home,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

interface Props {
  preview?: PreviewState;
  blueprint?: BlueprintFile[];
  onRefresh: () => void;
  onAddFile?: () => void;
  onLaunch?: () => void;
  onSteveAsk?: (message: string, context?: any) => void;
}

type InspectorMode = 'blueprint' | 'styles' | 'context';
type SelectedElementContext = {
  selector: string;
  tagName: string;
  classes: string[];
  styles: Record<string, string>;
  content: string;
  boundingBox: DOMRect;
};

const ENV_CONFIG = {
  'Production Edge': { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  'Staging Cluster': { icon: Cloud, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Dev Sandbox': { icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'Local Node': { icon: Home, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

const PreviewPlane: React.FC<Props> = ({ preview, blueprint, onRefresh, onAddFile, onLaunch, onSteveAsk }) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [annotations, setAnnotations] = useState<PreviewAnnotation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [resolution, setResolution] = useState('1920x1080');
  const [targetEnv, setTargetEnv] = useState<keyof typeof ENV_CONFIG>('Staging Cluster');
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>('blueprint');

  const [isResDropdownOpen, setIsResDropdownOpen] = useState(false);
  const [isHealthDropdownOpen, setIsHealthDropdownOpen] = useState(false);
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
  const [isInspectorDropdownOpen, setIsInspectorDropdownOpen] = useState(false);
  const [isViewportDropdownOpen, setIsViewportDropdownOpen] = useState(false);
  const [showPerformance, setShowPerformance] = useState(true);
  const [selectedElementContext, setSelectedElementContext] = useState<SelectedElementContext | null>(null);

  const resolutions = ['1920x1080', '1440x900', '1280x720', '1024x768', '375x812'];

  const runtimeLogs = [
    { type: 'info', msg: 'Hydrating Form Live Runtime...', time: '0ms' },
    { type: 'success', msg: 'Blueprint synthesized successfully.', time: '+12ms' },
    { type: 'info', msg: 'Linking shadow assets...', time: '+45ms' },
    { type: 'warning', msg: 'Legacy CSS detected, applying polyfill.', time: '+102ms' },
    { type: 'success', msg: 'Surface ready for interaction.', time: '+140ms' }
  ];

  const handleDismissAnnotation = (annotationId: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
  };

  // Auto-analyze preview when blueprint changes
  // NOTE: Disabled due to CORS restrictions with iframe access
  // Re-enable when implementing postMessage-based communication
  useEffect(() => {
    if (!blueprint || blueprint.length === 0 || isLoading || isDeploying) return;

    const analyzePreviewContent = async () => {
      setIsAnalyzing(true);
      try {
        const htmlFile = blueprint.find(f => f.path.endsWith('.html'));
        const cssFile = blueprint.find(f => f.path.endsWith('.css'));
        const jsFile = blueprint.find(f => f.path.endsWith('.js') || f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

        const result = await previewAnalysisService.analyzePreview(
          htmlFile?.content || '',
          cssFile?.content || '',
          jsFile?.content || ''
          // Removed: iframeRef.current?.contentDocument (causes CORS error)
        );

        setAnnotations(result.annotations);
      } catch (error) {
        console.error('[PreviewPlane] Analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Delay analysis slightly to let iframe render
    const timer = setTimeout(analyzePreviewContent, 1500);
    return () => clearTimeout(timer);
  }, [blueprint, isLoading, isDeploying]);

  // Inject performance profiler when iframe loads
  // Temporarily disabled for debugging
  // useEffect(() => {
  //   if (iframeRef.current && showPerformance) {
  //     const handleLoad = () => {
  //       if (iframeRef.current) {
  //         performanceProfiler.injectProfiler(iframeRef.current);
  //       }
  //     };

  //     iframeRef.current.addEventListener('load', handleLoad);
  //     return () => {
  //       iframeRef.current?.removeEventListener('load', handleLoad);
  //     };
  //   }
  // }, [showPerformance]);

  const renderedContent = useMemo(() => {
    if (!blueprint || blueprint.length === 0) return null;

    const htmlFile = blueprint.find(f => f.path.endsWith('.html'));
    const cssFile = blueprint.find(f => f.path.endsWith('.css'));
    const jsFile = blueprint.find(f => f.path.endsWith('.js') || f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

    const runtimeInjections = `
      <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
    `;

    if (htmlFile) {
      let content = htmlFile.content;
      if (!content.includes('babel.min.js')) {
        content = content.replace('</head>', `${runtimeInjections}</head>`);
      }
      if (cssFile && !content.includes('<style>')) {
        content = content.replace('</head>', `<style>${cssFile.content}</style></head>`);
      }
      if (jsFile) {
        content = content.replace('</body>', `<script type="text/babel">${jsFile.content}</script></body>`);
      }
      return content;
    }

    if (jsFile) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            ${runtimeInjections}
            <style>
              body { margin: 0; padding: 0; font-family: sans-serif; background: #f4f4f5; color: #18181b; }
              #root { min-height: 100vh; }
              ${cssFile?.content || ''}
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/babel">
              ${jsFile.content}
              const rootElement = document.getElementById('root');
              if (rootElement && typeof App !== 'undefined') {
                const root = ReactDOM.createRoot(rootElement);
                root.render(<App />);
              }
            </script>
          </body>
        </html>
      `;
    }
    return null;
  }, [blueprint]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      onRefresh();
      setIsLoading(false);
    }, 800);
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    onLaunch?.();
    setTimeout(() => setIsDeploying(false), 3000);
  };

  const CurrentEnvIcon = ENV_CONFIG[targetEnv].icon;

  if (!blueprint || blueprint.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0d0d0e]">
        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
          <Layout className="w-8 h-8 text-zinc-700" />
        </div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">No Active Deployment</h2>
        <p className="text-xs text-zinc-600 max-w-xs text-center leading-relaxed">
          The Preview Plane is currently idle. Ask Steve to <code className="text-blue-500">synthesize a website</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d0d0e] animate-in fade-in zoom-in-95 duration-500 relative">
      {/* Header - Fixed: Removed overflow-hidden to allow dropdowns to show */}
      <div className="h-14 border-b border-zinc-800 flex items-center px-4 space-x-3 bg-zinc-950/50 z-[100] shrink-0">
        <div className="flex items-center space-x-1 shrink-0">
          <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Compact Dynamic Environment Selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              setIsEnvDropdownOpen(!isEnvDropdownOpen);
              setIsResDropdownOpen(false);
              setIsInspectorDropdownOpen(false);
            }}
            className={`flex items-center space-x-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all shadow-lg group ${isEnvDropdownOpen ? 'bg-zinc-800 ring-1 ring-zinc-700' : ''}`}
            title={`Deployment Target: ${targetEnv}`}
          >
            <CurrentEnvIcon className={`w-4 h-4 ${ENV_CONFIG[targetEnv].color}`} />
            <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${isEnvDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isEnvDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[110] p-1 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 text-[8px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 mb-1">Target Cluster</div>
              {(Object.keys(ENV_CONFIG) as Array<keyof typeof ENV_CONFIG>).map(env => {
                const Icon = ENV_CONFIG[env].icon;
                const isActive = targetEnv === env;
                return (
                  <button
                    key={env}
                    onClick={() => { setTargetEnv(env); setIsEnvDropdownOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'}`}
                  >
                    <div className={`p-1.5 rounded-md ${isActive ? ENV_CONFIG[env].bg : 'bg-zinc-950'}`}>
                      <Icon className={`w-3.5 h-3.5 ${ENV_CONFIG[env].color}`} />
                    </div>
                    <span>{env}</span>
                    {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,1)]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Universal URL Bar */}
        <div className="flex-1 flex items-center bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5 space-x-2 group focus-within:border-blue-500/50 transition-all relative min-w-0">
          <Globe className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0" />
          <span className="text-xs text-zinc-400 font-mono flex-1 truncate select-all">form-live-surface://{targetEnv.toLowerCase().replace(' ', '-')}.local</span>

          <button
            onClick={() => setIsHealthDropdownOpen(!isHealthDropdownOpen)}
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
            <ChevronDown className={`w-2.5 h-2.5 text-emerald-400 transition-transform ${isHealthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Health Dropdown Overlay */}
          {isHealthDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">Latency</span>
                  <div className="text-sm font-mono text-emerald-400">14ms</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">Uptime</span>
                  <div className="text-sm font-mono text-zinc-200">100%</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">Synthesis Link</span>
                  <div className="text-sm font-mono text-blue-400">Secure</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">Environment</span>
                  <div className="text-sm font-mono text-zinc-200">{targetEnv}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Controls Group */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Resolution Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsResDropdownOpen(!isResDropdownOpen);
                setIsEnvDropdownOpen(false);
                setIsInspectorDropdownOpen(false);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white transition-all shadow-lg"
            >
              <span>{resolution}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isResDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isResDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[110] p-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {resolutions.map(res => (
                  <button
                    key={res}
                    onClick={() => { setResolution(res); setIsResDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${resolution === res ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Viewport Toggle */}
          <div className="relative">
            <button
              onClick={() => {
                setIsViewportDropdownOpen(!isViewportDropdownOpen);
                setIsEnvDropdownOpen(false);
                setIsResDropdownOpen(false);
                setIsInspectorDropdownOpen(false);
              }}
              className="flex items-center space-x-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white transition-all shadow-lg group"
              title={`Viewport: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`}
            >
              {viewMode === 'desktop' && <Monitor className="w-3.5 h-3.5" />}
              {viewMode === 'tablet' && <Tablet className="w-3.5 h-3.5" />}
              {viewMode === 'mobile' && <Smartphone className="w-3.5 h-3.5" />}
              <ChevronDown className={`w-3 h-3 transition-transform ${isViewportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isViewportDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-36 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[110] p-1 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 text-[8px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 mb-1">Viewport</div>
                <button
                  onClick={() => { setViewMode('desktop'); setIsViewportDropdownOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                  {viewMode === 'desktop' && <div className="ml-auto w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,1)]" />}
                </button>
                <button
                  onClick={() => { setViewMode('tablet'); setIsViewportDropdownOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'tablet' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Tablet</span>
                  {viewMode === 'tablet' && <div className="ml-auto w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,1)]" />}
                </button>
                <button
                  onClick={() => { setViewMode('mobile'); setIsViewportDropdownOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                  {viewMode === 'mobile' && <div className="ml-auto w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,1)]" />}
                </button>
              </div>
            )}
          </div>

          {/* Annotation Count Badge */}
          {annotations.length > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                {annotations.length} {annotations.length === 1 ? 'Suggestion' : 'Suggestions'}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowPerformance(!showPerformance)}
            className={`p-2 rounded-lg transition-all ${
              showPerformance 
                ? 'text-green-400 bg-green-500/10' 
                : 'text-zinc-600 hover:text-zinc-300'
            }`}
            title="Toggle Performance Monitor"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button onClick={handleRefresh} className={`p-2 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-blue-400 transition-colors ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-800 mx-1" />

          {/* SHIP / LAUNCH BUTTON - This launches the SOMA deployment task */}
          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isDeploying ? 'bg-zinc-800 text-zinc-500' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/20'}`}
          >
            {isDeploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            <span>{isDeploying ? 'Shipping...' : 'Ship'}</span>
          </button>

          <div className="w-px h-6 bg-zinc-800 mx-1" />

          {/* Refined Inspector Dropdown (Icon First) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsInspectorDropdownOpen(!isInspectorDropdownOpen);
                setIsEnvDropdownOpen(false);
                setIsResDropdownOpen(false);
              }}
              className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isInspectorOpen ? 'bg-blue-600 text-white border border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'}`}
              title="Surgical Inspector"
            >
              <Search className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${isInspectorDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isInspectorDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[120] p-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 text-[8px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 mb-1">Inspector Mode</div>
                <button
                  onClick={() => { setInspectorMode('blueprint'); setIsInspectorOpen(true); setIsInspectorDropdownOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all ${inspectorMode === 'blueprint' && isInspectorOpen ? 'bg-blue-600 text-white shadow-xl' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Blueprint Assets</span>
                </button>
                <button
                  onClick={() => { setInspectorMode('styles'); setIsInspectorOpen(true); setIsInspectorDropdownOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all ${inspectorMode === 'styles' && isInspectorOpen ? 'bg-blue-600 text-white shadow-xl' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>Styles & Layout</span>
                </button>
                <button
                  onClick={() => { setInspectorMode('context'); setIsInspectorOpen(true); setIsInspectorDropdownOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold transition-all ${inspectorMode === 'context' && isInspectorOpen ? 'bg-blue-600 text-white shadow-xl' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Runtime Context</span>
                </button>
                <div className="border-t border-zinc-800 my-1" />
                <button
                  onClick={() => { setIsInspectorOpen(!isInspectorOpen); setIsInspectorDropdownOpen(false); }}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  {isInspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                  <span>{isInspectorOpen ? 'Close Panel' : 'Open Inspector'}</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className={`p-2 rounded-lg transition-all ${isConsoleOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600 hover:text-zinc-300'}`}
            title="Runtime Console"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Console Drawer - Positioned at bottom of entire PreviewPlane */}
        <div className={`absolute bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 transition-all duration-300 z-50 ${isConsoleOpen ? 'h-48' : 'h-0 overflow-hidden'}`}>
          <div className="h-8 border-b border-zinc-900 flex items-center px-4 justify-between bg-zinc-950">
            <div className="flex items-center space-x-2 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
              <Terminal className="w-3 h-3" />
              <span>Runtime Event Log</span>
            </div>
            <button onClick={() => setIsConsoleOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-40 font-mono text-[10px] space-y-1.5 custom-scrollbar">
            {runtimeLogs.map((log, i) => (
              <div key={i} className="flex items-start space-x-3 group">
                <span className="text-zinc-700 w-12 text-right">{log.time}</span>
                <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-zinc-400'}>
                  {log.msg}
                </span>
              </div>
            ))}
            <div className="flex items-center space-x-2 text-blue-400/50 italic py-1 animate-pulse">
              <Zap className="w-3 h-3" />
              <span>Monitoring live cluster traffic ({targetEnv})...</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center bg-zinc-950/30 overflow-auto relative">
          {/* HEX BACKGROUND PATTERN */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='56' height='100' viewBox='0 0 56 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%2327272a' stroke-width='1'/%3E%3Cpath d='M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34' fill='none' stroke='%2327272a' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: 'auto'
          }} />

          <div className={`bg-white rounded-xl shadow-2xl border border-zinc-800/50 transition-all duration-500 overflow-hidden relative ${
            viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 
            viewMode === 'tablet' ? 'w-[768px] h-[1024px]' : 
            'w-full h-full'
          }`}>
            {isLoading || isDeploying ? (
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {isDeploying ? 'Pushing to Global Edge' : 'Refreshing Runtime'}
                </span>
              </div>
            ) : renderedContent ? (
              <>
                <iframe
                  ref={iframeRef}
                  key={renderedContent.length}
                  title="Form Runtime Preview"
                  srcDoc={renderedContent}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
                />
                {/* Temporarily disabled for debugging */}
                {/* <PerformanceOverlay
                  visible={showPerformance}
                  onToggle={() => setShowPerformance(false)}
                /> */}
                <PreviewInspector
                  iframeRef={iframeRef}
                  annotations={annotations}
                  onDismissAnnotation={handleDismissAnnotation}
                  onElementSelected={(element) => {
                    setSelectedElementContext(element as SelectedElementContext);
                  }}
                  onAskSteve={(message, elementContext) => {
                    onSteveAsk?.(message, {
                      elementContext,
                      viewport: viewMode,
                      resolution,
                      targetEnv,
                      previewUrl: preview?.url || 'inline-render'
                    });
                  }}
                />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50">
                <Sparkles className="w-8 h-8 text-blue-500/20 mb-4" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Awaiting Synthesis</span>
              </div>
            )}
          </div>
          {selectedElementContext && (
            <div className="absolute left-6 bottom-6 z-30 px-3 py-2 rounded-lg bg-zinc-950/90 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono shadow-xl">
              Scoped: {selectedElementContext.selector}
            </div>
          )}
        </div>

        {/* Inspector Sidebar */}
        <div className={`border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden h-full ${isInspectorOpen ? 'w-80' : 'w-0'}`}>
          <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/20 shrink-0 min-w-[320px]">
            <div className="flex items-center space-x-3">
              {inspectorMode === 'blueprint' && <Code className="w-3.5 h-3.5 text-blue-400" />}
              {inspectorMode === 'styles' && <Layout className="w-3.5 h-3.5 text-emerald-400" />}
              {inspectorMode === 'context' && <Database className="w-3.5 h-3.5 text-amber-400" />}
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {inspectorMode === 'blueprint' ? 'Blueprint Assets' : inspectorMode === 'styles' ? 'Style Rules' : 'Runtime Context'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {inspectorMode === 'blueprint' && (
                <button onClick={onAddFile} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-emerald-400 transition-colors" title="Add File">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setIsInspectorOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-600">
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar min-w-[320px]">
            {inspectorMode === 'blueprint' ? (
              <div className="p-4 space-y-4">
                {blueprint.map((file, i) => (
                  <div key={i} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between group cursor-pointer hover:border-blue-500/30 transition-all">
                    <div className="flex items-center space-x-3 min-w-0">
                      <Code className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-[10px] font-mono text-zinc-300 truncate">{file.path}</span>
                    </div>
                    <div className="text-[8px] font-bold text-zinc-600 uppercase group-hover:text-zinc-400 transition-colors">{file.language}</div>
                  </div>
                ))}
              </div>
            ) : inspectorMode === 'styles' ? (
              <div className="p-4 space-y-6">
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Global Variables</div>
                  <div className="space-y-2">
                    {['--primary', '--secondary', '--accent'].map(v => (
                      <div key={v} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                        <span className="text-[9px] font-mono text-zinc-400">{v}</span>
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Active Media Queries</div>
                  <div className="flex items-center space-x-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-mono text-emerald-300">screen and (min-width: 1024px)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">React Version</span>
                    <span className="text-[10px] font-mono text-blue-400">18.2.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Hydration State</span>
                    <span className="text-[10px] font-mono text-emerald-400">Stable</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Shadow Link</span>
                    <span className="text-[10px] font-mono text-amber-400">Synchronized</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-xl">
                  <div className="flex items-center space-x-2 text-zinc-600 mb-2">
                    <Info className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Tip</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                    Context monitoring allows you to track variable mutation across shadow nodes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPlane;
