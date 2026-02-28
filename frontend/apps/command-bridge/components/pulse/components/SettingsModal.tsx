import React, { useState, useEffect } from 'react';
import {
  X, Settings, Shield, Cpu, Zap, Globe, Save,
  Monitor, RefreshCw, Volume2, Sparkles, BrainCircuit,
  Terminal, Code2, Eye, Moon, Sun, Keyboard, Activity,
  Layout, Target, AlertTriangle, Wrench
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

type SettingsTab = 'general' | 'editor' | 'ai' | 'appearance' | 'preview' | 'system' | 'advanced';

interface UserSettings {
  // General
  projectName: string;
  autoSave: boolean;
  soundEffects: boolean;

  // Editor
  fontSize: number;
  minimap: boolean;
  wordWrap: boolean;
  vimMode: boolean;
  lineNumbers: boolean;

  // AI
  steveCreativity: number; // 0-100
  steveVerbosity: 'concise' | 'balanced' | 'detailed';
  autoSynthesis: boolean;

  // Appearance
  theme: 'midnight' | 'nebula' | 'matrix';
  neonIntensity: number; // 0-100
  glassmorphism: boolean;
  particleEffects: boolean;

  // Preview & Intelligence
  enablePreviewInspector: boolean;
  enableSteveAnnotations: boolean;
  autoAnalyzePreview: boolean;
  previewAnnotationDelay: number; // seconds
  enableSelfHealing: boolean;
  autoApplyLowRiskFixes: boolean;
  healingConfidenceThreshold: number; // 0-100

  // Advanced (Power User)
  showArbiterActivity: boolean;
  showArbiterStats: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  projectName: '',
  autoSave: true,
  soundEffects: true,
  fontSize: 14,
  minimap: true,
  wordWrap: true,
  vimMode: false,
  lineNumbers: true,
  steveCreativity: 75,
  steveVerbosity: 'balanced',
  autoSynthesis: false,
  theme: 'midnight',
  neonIntensity: 60,
  glassmorphism: true,
  particleEffects: true,
  enablePreviewInspector: true,
  enableSteveAnnotations: true,
  autoAnalyzePreview: true,
  previewAnnotationDelay: 1.5,
  enableSelfHealing: true,
  autoApplyLowRiskFixes: false,
  healingConfidenceThreshold: 80,
  showArbiterActivity: false,
  showArbiterStats: false,
};

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, projectName }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS, projectName });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(prev => ({ ...prev, projectName }));
    }
  }, [isOpen, projectName]);

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  if (!isOpen) return null;

  const TabButton = ({ id, icon, label }: { id: SettingsTab, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === id
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
        }`}
    >
      <div className={`transition-transform duration-300 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      {activeTab === id && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[700px] bg-[#09090b] border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative">

        {/* Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />
        <div className="absolute -top-[200px] -left-[200px] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-[200px] -right-[200px] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-[#09090b]/50 z-10">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center shadow-inner">
              <Settings className="w-5 h-5 text-zinc-400 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Form Configuration</h2>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">System Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0 z-10">

          {/* Sidebar */}
          <div className="w-64 bg-zinc-950/50 border-r border-zinc-900 p-4 space-y-2 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="pl-4 pb-4 pt-2 text-[10px] font-black text-zinc-700 uppercase tracking-widest">Global Preferences</div>
            <TabButton id="general" icon={<Globe className="w-4 h-4" />} label="General" />
            <TabButton id="editor" icon={<Code2 className="w-4 h-4" />} label="Editor Engine" />
            <TabButton id="ai" icon={<BrainCircuit className="w-4 h-4" />} label="Neural Link" />

            <div className="my-4 h-px bg-zinc-900" />

            <div className="pl-4 pb-2 pt-2 text-[10px] font-black text-zinc-700 uppercase tracking-widest">System</div>
            <TabButton id="appearance" icon={<Sparkles className="w-4 h-4" />} label="Appearance" />
            <TabButton id="preview" icon={<Layout className="w-4 h-4" />} label="Preview & Intelligence" />
            <TabButton id="system" icon={<Cpu className="w-4 h-4" />} label="Performance" />
            <TabButton id="advanced" icon={<Activity className="w-4 h-4" />} label="Advanced" />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 border-b border-zinc-900 pb-2">Workspace Identity</h3>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase">Project Identifier</label>
                      <input
                        value={settings.projectName}
                        onChange={(e) => handleChange('projectName', e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-200 outline-none focus:border-blue-500/50 transition-all focus:ring-1 focus:ring-blue-500/20"
                      />
                      <p className="text-[10px] text-zinc-600">Unique namespace for this synthesis cluster.</p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-zinc-900 rounded-lg"><Save className="w-4 h-4 text-zinc-400" /></div>
                        <div>
                          <div className="text-sm font-bold text-zinc-300">Auto-Save Blueprint</div>
                          <div className="text-[11px] text-zinc-600">Automatically persist state on change</div>
                        </div>
                      </div>
                      <Toggle checked={settings.autoSave} onChange={(v) => handleChange('autoSave', v)} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-zinc-900 rounded-lg"><Volume2 className="w-4 h-4 text-zinc-400" /></div>
                        <div>
                          <div className="text-sm font-bold text-zinc-300">Interface Acoustics</div>
                          <div className="text-[11px] text-zinc-600">Haptic audio feedback for interactions</div>
                        </div>
                      </div>
                      <Toggle checked={settings.soundEffects} onChange={(v) => handleChange('soundEffects', v)} />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 border-b border-zinc-900 pb-2">Code Engine Configuration</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-300">Font Size</span>
                        <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{settings.fontSize}px</span>
                      </div>
                      <input
                        type="range" min="10" max="24" step="1"
                        value={settings.fontSize}
                        onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                        className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Eye className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-300">Minimap</span>
                      </div>
                      <Toggle checked={settings.minimap} onChange={(v) => handleChange('minimap', v)} />
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Keyboard className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-300">VIM Mode</span>
                      </div>
                      <Toggle checked={settings.vimMode} onChange={(v) => handleChange('vimMode', v)} />
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Terminal className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-300">Word Wrap</span>
                      </div>
                      <Toggle checked={settings.wordWrap} onChange={(v) => handleChange('wordWrap', v)} />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 border-b border-zinc-900 pb-2">Architect Personality</h3>

                  <div className="p-6 bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800 rounded-2xl space-y-6 relative overflow-hidden group">
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-500" />

                    <div className="relative z-10 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-white flex items-center space-x-2">
                            <BrainCircuit className="w-4 h-4 text-emerald-400" />
                            <span>Creativity Index</span>
                          </span>
                          <span className="text-xs font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded">{settings.steveCreativity}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100"
                          value={settings.steveCreativity}
                          onChange={(e) => handleChange('steveCreativity', parseInt(e.target.value))}
                          className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                          <span>Conservative</span>
                          <span>Balanced</span>
                          <span>Wild</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-sm font-bold text-white flex items-center space-x-2">
                          <Monitor className="w-4 h-4 text-blue-400" />
                          <span>Verbosity Protocol</span>
                        </span>
                        <div className="grid grid-cols-3 gap-3">
                          {['concise', 'balanced', 'detailed'].map((v) => (
                            <button
                              key={v}
                              onClick={() => handleChange('steveVerbosity', v as any)}
                              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${settings.steveVerbosity === v
                                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                  : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:text-zinc-400'
                                }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 border-b border-zinc-900 pb-2">Visual Experience</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Theme Cards */}
                    {['midnight', 'nebula', 'matrix'].map(theme => (
                      <div
                        key={theme}
                        onClick={() => handleChange('theme', theme as any)}
                        className={`p-4 rounded-xl border cursor-pointer relative overflow-hidden group transition-all duration-300 ${settings.theme === theme
                            ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/30'
                            : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <div className="capitalize text-sm font-bold text-zinc-200">{theme}</div>
                          <div className={`w-3 h-3 rounded-full ${settings.theme === theme ? 'bg-blue-500' : 'bg-zinc-800'}`} />
                        </div>
                        <div className="h-16 w-full bg-zinc-950 rounded border border-zinc-800/50 opacity-50 flex items-center justify-center">
                          <span className="text-[9px] text-zinc-700 uppercase font-black">Preview</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-zinc-200">Glassmorphism</div>
                        <div className="text-[10px] text-zinc-500">Enable translucent blur effects</div>
                      </div>
                      <Toggle checked={settings.glassmorphism} onChange={(v) => handleChange('glassmorphism', v)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-zinc-200">Particle Effects</div>
                        <div className="text-[10px] text-zinc-500">ambient background motion</div>
                      </div>
                      <Toggle checked={settings.particleEffects} onChange={(v) => handleChange('particleEffects', v)} />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-zinc-800/50">
                      <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase">
                        <span>Neon Glow Intensity</span>
                        <span>{settings.neonIntensity}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100"
                        value={settings.neonIntensity}
                        onChange={(e) => handleChange('neonIntensity', parseInt(e.target.value))}
                        className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 border-b border-zinc-900 pb-2">Interactive Preview Controls</h3>
                  
                  {/* Element Inspector */}
                  <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-zinc-200 mb-1">Element Inspector</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                          Click elements in the preview to select them and ask Steve contextual questions.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
                      <div>
                        <div className="text-xs font-bold text-zinc-300">Enable Inspector</div>
                        <div className="text-[10px] text-zinc-600">Click-to-select elements</div>
                      </div>
                      <Toggle checked={settings.enablePreviewInspector} onChange={(v) => handleChange('enablePreviewInspector', v)} />
                    </div>
                  </div>

                  {/* Steve Annotations */}
                  <div className="p-5 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-zinc-200 mb-1">Steve's Proactive Annotations</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                          Steve automatically analyzes your preview and highlights potential issues, accessibility concerns, and optimization opportunities.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
                        <div>
                          <div className="text-xs font-bold text-zinc-300">Enable Annotations</div>
                          <div className="text-[10px] text-zinc-600">Show suggestions in preview</div>
                        </div>
                        <Toggle checked={settings.enableSteveAnnotations} onChange={(v) => handleChange('enableSteveAnnotations', v)} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
                        <div>
                          <div className="text-xs font-bold text-zinc-300">Auto-Analyze</div>
                          <div className="text-[10px] text-zinc-600">Run analysis on blueprint changes</div>
                        </div>
                        <Toggle checked={settings.autoAnalyzePreview} onChange={(v) => handleChange('autoAnalyzePreview', v)} />
                      </div>
                      <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-800 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-zinc-400">
                          <span>Analysis Delay</span>
                          <span>{settings.previewAnnotationDelay}s</span>
                        </div>
                        <input
                          type="range" min="0.5" max="5" step="0.5"
                          value={settings.previewAnnotationDelay}
                          onChange={(e) => handleChange('previewAnnotationDelay', parseFloat(e.target.value))}
                          className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-[10px] text-zinc-600">Time to wait after changes before analyzing</div>
                      </div>
                    </div>
                  </div>

                  {/* Self-Healing */}
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <Wrench className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-zinc-200 mb-1">Self-Healing Engine</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                          Autonomous error detection and recovery using multi-arbiter intelligence.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
                        <div>
                          <div className="text-xs font-bold text-zinc-300">Enable Self-Healing</div>
                          <div className="text-[10px] text-zinc-600">Auto-detect & propose fixes</div>
                        </div>
                        <Toggle checked={settings.enableSelfHealing} onChange={(v) => handleChange('enableSelfHealing', v)} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
                        <div>
                          <div className="text-xs font-bold text-zinc-300">Auto-Apply Low Risk</div>
                          <div className="text-[10px] text-zinc-600">Automatically apply simple fixes</div>
                        </div>
                        <Toggle checked={settings.autoApplyLowRiskFixes} onChange={(v) => handleChange('autoApplyLowRiskFixes', v)} />
                      </div>
                      <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-800 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-zinc-400">
                          <span>Confidence Threshold</span>
                          <span className={`${
                            settings.healingConfidenceThreshold >= 80 ? 'text-emerald-400' :
                            settings.healingConfidenceThreshold >= 60 ? 'text-yellow-400' :
                            'text-orange-400'
                          }`}>{settings.healingConfidenceThreshold}%</span>
                        </div>
                        <input
                          type="range" min="50" max="95" step="5"
                          value={settings.healingConfidenceThreshold}
                          onChange={(e) => handleChange('healingConfidenceThreshold', parseInt(e.target.value))}
                          className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-[10px] text-zinc-600">Minimum confidence to show fix suggestions</div>
                      </div>
                      <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-500">
                          <strong className="text-zinc-400">Note:</strong> All fixes are reviewed before applying.
                          Uses ReasoningChamber → EngineeringSwarm → CodeObserver arbiters.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative">
                  <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-20" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">System Optimal</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-2">
                    Form cluster is running at peak efficiency. All arbiters operational. No maintenance required.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full max-w-md mt-6">
                  <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">Memory</div>
                    <div className="text-emerald-400 font-mono text-sm">342 MB</div>
                  </div>
                  <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">Latency</div>
                    <div className="text-blue-400 font-mono text-sm">12 ms</div>
                  </div>
                  <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">Uptime</div>
                    <div className="text-purple-400 font-mono text-sm">99.9%</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 border-b border-zinc-900 pb-2">Power User Features</h3>
                  
                  <div className="space-y-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <div className="flex items-start gap-3 mb-4">
                      <Activity className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-zinc-200 mb-1">Arbiter Visualization</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Advanced tools for monitoring and debugging SOMA's cognitive architecture in real-time.
                          These panels show live arbiter communication and performance metrics.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-zinc-900 rounded-lg"><Eye className="w-4 h-4 text-blue-400" /></div>
                        <div>
                          <div className="text-sm font-bold text-zinc-300">Activity Feed</div>
                          <div className="text-[11px] text-zinc-600">Show real-time arbiter communication log</div>
                        </div>
                      </div>
                      <Toggle checked={settings.showArbiterActivity} onChange={(v) => handleChange('showArbiterActivity', v)} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-zinc-900 rounded-lg"><BrainCircuit className="w-4 h-4 text-purple-400" /></div>
                        <div>
                          <div className="text-sm font-bold text-zinc-300">Stats Panel</div>
                          <div className="text-[11px] text-zinc-600">Display arbiter load, response times & capabilities</div>
                        </div>
                      </div>
                      <Toggle checked={settings.showArbiterStats} onChange={(v) => handleChange('showArbiterStats', v)} />
                    </div>

                    <div className="mt-4 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                      <div className="flex items-start gap-2 text-xs text-zinc-500">
                        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                          <strong className="text-zinc-400">Note:</strong> These panels are for debugging and monitoring.
                          They appear in the left sidebar when enabled. Not recommended for typical usage.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-950/80 backdrop-blur border-t border-zinc-900/50 flex items-center justify-between z-20">
          <button
            onClick={() => setSettings({ ...DEFAULT_SETTINGS, projectName })}
            className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-4">
            {isDirty && <span className="text-[10px] text-zinc-500 italic animate-pulse">Unsaved changes...</span>}
            <button
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper Components
const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${checked ? 'bg-blue-500' : 'bg-zinc-800'}`}
  >
    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${checked ? 'left-6' : 'left-1'}`} />
  </button>
);

export default SettingsModal;
