import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  ChevronRight,
  ChevronLeft,
  Zap,
  Settings,
  Shield,
  Search,
  Activity,
  Network,
  Layout,
  ExternalLink,
  RefreshCw,
  Code,
  Plus,
  PenTool,
  Cpu,
  MessageSquare,
  X,
  Loader2,
  Clipboard,
  Files
} from 'lucide-react';
import JSZip from 'jszip';
import {
  TerminalBlock, ProjectState, WorkspaceTab, ViewPlane, BackendService,
  SomaTask, CompletionSuggestion, TaskEnvelope, ObserverMessage, SearchStep, BlueprintFile
} from './types';
import {
  getTerminalAssistance,
  getSteveResponse,
  generateAgenticBlueprint
} from './services/geminiService';
import { repoExplainer } from './services/repoExplainer';
import Sidebar from './components/Sidebar';
import TerminalBlockView from './components/TerminalBlock';
import SteveAgentButton from './components/SteveAgentButton';
import SteveChat from './components/SteveChat';
import CommandPalette from './components/CommandPalette';
import SettingsModal from './components/SettingsModal';
import Autocomplete from './components/Autocomplete';
import PreviewPlane from './components/PreviewPlane';
import FileExplorer from './components/FileExplorer';
import EditorPlane from './components/EditorPlane';
import PlanningMode from './components/PlanningMode';
import FileOperationsPane from './components/FileOperationsPane';
import HealingReviewModal from './components/HealingReviewModal';
import SystemInstructions from './components/SystemInstructions';
import RunSettings from './components/RunSettings';
import PromptComposer from './components/PromptComposer';
import TerminalWindow from './components/TerminalWindow';
import { serverMonitor, MonitorEvent } from './services/serverMonitor';
import { contextSync } from './services/contextSync';
import broker from './core/MessageBroker';
import { pulseClient } from './services/PulseClient';

const INITIAL_STATE: ProjectState = {
  name: "Form",
  activeTab: 'web',
  currentPlane: 'code', // 'code' (Studio), 'shell' (Terminal), 'editor', 'preview', 'planning'
  currentPath: "~/projects/form-app",
  services: [
    {
      id: 'PrimeCore',
      name: 'Prime Core',
      port: 8000,
      status: 'online',
      role: 'prime',
      version: '3.6.1',
      logs: ['[AUTHORITY] Form Orchestrator online'],
      metrics: { cpu: [8, 10, 9], memory: [120, 122, 121] }
    }
  ],
  blocks: [
    {
      id: 'init-1',
      type: 'output',
      content: 'Form Studio initialized. Define project rules in System Instructions or use Live Terminal for direct execution.',
      timestamp: Date.now()
    }
  ],
  roadmap: [],
  activeBlueprint: [],
  securityScore: 100,
  preview: {
    url: 'form://local-preview',
    title: 'Form Surface',
    type: 'website',
    lastUpdated: Date.now()
  }
};

const COMMAND_DICTIONARY: CompletionSuggestion[] = [
  { text: 'soma', type: 'cmd', description: 'Run a development task' },
  { text: 'deploy', type: 'cmd', description: 'Push current blueprint to live plane' },
  { text: 'reset', type: 'cmd', description: 'Clear system state' },
  { text: 'status', type: 'cmd', description: 'Check cluster health' },
  { text: 'ls', type: 'cmd', description: 'List blueprint files' },
  { text: 'help', type: 'cmd', description: 'Show architectural guidance' }
];

interface AppProps {
  onClose?: () => void;
}

const App: React.FC<AppProps> = ({ onClose }) => {
  const [state, setState] = useState<ProjectState>(INITIAL_STATE);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSteveChatOpen, setIsSteveChatOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSteveThinking, setIsSteveThinking] = useState(false);
  const [isInputActionsOpen, setIsInputActionsOpen] = useState(false);
  const [healingProposal, setHealingProposal] = useState<any>(null);

  // Studio Settings State
  const [systemInstructions, setSystemInstructions] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);

  useEffect(() => {
    contextSync.initialize();
    return () => contextSync.shutdown();
  }, []);

  const [activeFile, setActiveFile] = useState<string | null>(null);

  useEffect(() => {
    contextSync.syncContext({
      currentPlane: state.currentPlane as any,
      activeFile,
      activeBlueprint: state.activeBlueprint?.map(f => ({ path: f.path, language: f.language })) || [],
      projectName: state.name,
      workingDirectory: state.currentPath,
      systemInstructions,
      modelSettings: { temperature, maxTokens, model }
    });
  }, [state.currentPlane, activeFile, state.activeBlueprint, state.name, state.currentPath, systemInstructions, temperature, maxTokens, model]);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [steveMessages, setSteveMessages] = useState<{ role: 'user' | 'steve', content: string, actions?: string[], updatedFiles?: BlueprintFile[] }[]>([
    { role: 'steve', content: "Define project rules in System Instructions or use Chat to build artifacts." }
  ]);

  const [stevePos, setStevePos] = useState({ x: window.innerWidth - 60, y: window.innerHeight - 60 });
  const [isDraggingSteve, setIsDraggingSteve] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; mouseStartX: number; mouseStartY: number } | null>(null);

  const handleSteveMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: stevePos.x, startY: stevePos.y, mouseStartX: e.clientX, mouseStartY: e.clientY };
    setIsDraggingSteve(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSteve || !dragRef.current) return;
      const deltaX = e.clientX - dragRef.current.mouseStartX;
      const deltaY = e.clientY - dragRef.current.mouseStartY;
      setStevePos({
        x: Math.max(30, Math.min(window.innerWidth - 30, dragRef.current.startX + deltaX)),
        y: Math.max(30, Math.min(window.innerHeight - 30, dragRef.current.startY + deltaY))
      });
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingSteve) return;
      if (dragRef.current) {
        const dist = Math.sqrt(Math.pow(e.clientX - dragRef.current.mouseStartX, 2) + Math.pow(e.clientY - dragRef.current.mouseStartY, 2));
        if (dist < 5) setIsSteveChatOpen(prev => !prev);
      }
      setIsDraggingSteve(false);
      dragRef.current = null;
    };
    if (isDraggingSteve) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDraggingSteve, stevePos]);

  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current && (state.currentPlane === 'code' || state.currentPlane === 'chat')) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.blocks, state.currentPlane]);

  useEffect(() => {
    const lastWord = inputValue.split(' ').pop() || '';
    if (lastWord.length > 0) {
      setSuggestions(COMMAND_DICTIONARY.filter(s => s.text.startsWith(lastWord)));
    } else {
      setSuggestions([]);
    }
  }, [inputValue]);

  useEffect(() => {
    broker.registerArbiter('PrimeCore', { role: 'prime', version: '3.6.1', instance: null });
    const healingListener = (event: CustomEvent) => setHealingProposal(event.detail);
    window.addEventListener('pulse:healing-proposal' as any, healingListener);
    const unsubscribeMonitor = serverMonitor.onEvent((event: MonitorEvent) => {
      if (event.shouldNotify) {
        setIsSteveChatOpen(true);
        setSteveMessages(prev => [...prev, { role: 'steve', content: event.message + (event.details ? `\n\n${JSON.stringify(event.details, null, 2)}` : '') }]);
      }
    });
    return () => { window.removeEventListener('pulse:healing-proposal' as any, healingListener); unsubscribeMonitor(); };
  }, []);

  const handleCommand = async (e?: React.FormEvent, directCmd?: string) => {
    if (e) e.preventDefault();
    const cmdText = (directCmd || inputValue).trim();
    if (!cmdText || isProcessing) return;
    setHistory(prev => [cmdText, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    const cmdBlockId = Date.now().toString();
    setState(prev => ({ ...prev, blocks: [...prev.blocks, { id: cmdBlockId, type: 'command', content: cmdText, timestamp: Date.now() }] }));
    setInputValue('');
    setSuggestions([]);
    setIsProcessing(true);
    try {
      if (cmdText.toLowerCase() === 'reset') { setState(INITIAL_STATE); setIsProcessing(false); return; }
      if (cmdText.toLowerCase().startsWith('make') || cmdText.toLowerCase().startsWith('create') || cmdText.toLowerCase().startsWith('build')) {
        const synthesis = await generateAgenticBlueprint(cmdText, state.activeBlueprint || [], { projectName: state.name, currentPlane: state.currentPlane, systemInstructions, temperature, maxTokens, model });
        let content = synthesis.explanation;
        if (synthesis.agenticMode && synthesis.arbitersUsed?.length > 0) content += `\n\n🤖 Agentic Synthesis: ${synthesis.arbitersUsed.join(' → ')}`;
        const newBlock: TerminalBlock = { id: Date.now().toString(), type: 'code-gen', content, timestamp: Date.now(), metadata: { blueprint: synthesis.files, arbitersUsed: synthesis.arbitersUsed, agenticMode: synthesis.agenticMode } };
        setState(prev => {
          const merged = [...(prev.activeBlueprint || [])];
          synthesis.files.forEach(f => {
            const idx = merged.findIndex(existing => existing.path === f.path);
            if (idx >= 0) merged[idx] = f; else merged.push(f);
          });
          return { ...prev, blocks: [...prev.blocks, newBlock], activeBlueprint: merged };
        });
      } else {
        const shellRes = await pulseClient.executeShell(cmdText, state.currentPath);
        const newBlock: TerminalBlock = { id: (Date.now() + 1).toString(), type: shellRes.success ? 'output' : 'error', content: shellRes.output || shellRes.error || 'No output', timestamp: Date.now() };
        setState(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, blocks: [...prev.blocks, { id: Date.now().toString(), type: 'error', content: "Command execution failed.", timestamp: Date.now() }] }));
    } finally { setIsProcessing(false); }
  };

  const handleSteveMessage = async (msg: string) => {
    setSteveMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsSteveThinking(true);
    try {
      const response = await getSteveResponse(msg, steveMessages, { projectName: state.name, currentPlane: state.currentPlane as any, activeBlueprint: state.activeBlueprint, systemInstructions, temperature, maxTokens, model });
      const steveMessage: any = { role: 'steve', content: response.response, actions: response.actions, updatedFiles: response.updatedFiles };
      if (response.arbitersConsulted && response.arbitersConsulted.length > 0) {
        steveMessage.arbitersConsulted = response.arbitersConsulted;
        steveMessage.agenticMode = response.agenticMode;
        if (response.agenticMode && response.arbitersConsulted.length > 1) {
          const arbiterList = response.arbitersConsulted.filter((a: string) => a !== 'SteveArbiter').join(', ');
          if (arbiterList) steveMessage.content += `\n\n_[I consulted with ${arbiterList} to provide this response]_`;
        }
      }
      setSteveMessages(prev => [...prev, steveMessage]);
      if (response.updatedFiles) applySteveEdits(response.updatedFiles);
      if (response.actions?.includes('generate')) handleCommand(undefined, msg);
    } catch (err) {
      setSteveMessages(prev => [...prev, { role: 'steve', content: "My cognitive link failed. Let's try that request again." }]);
    } finally { setIsSteveThinking(false); }
  };

  const applySteveEdits = async (files: BlueprintFile[]) => {
    try {
      await Promise.all(files.map(file => pulseClient.fsWrite(file.path, file.content)));
      setState(prev => {
        const newBlueprint = [...(prev.activeBlueprint || [])];
        files.forEach(updatedFile => {
          const existingIdx = newBlueprint.findIndex(f => f.path === updatedFile.path);
          if (existingIdx !== -1) newBlueprint[existingIdx] = updatedFile; else newBlueprint.push(updatedFile);
        });
        return { ...prev, activeBlueprint: newBlueprint };
      });
    } catch (error) { console.error("[Steve] Failed to persist edits to disk:", error); }
  };

  const handleSyncBlueprint = (files: BlueprintFile[]) => {
    setState(prev => ({ ...prev, activeBlueprint: files, currentPlane: 'preview' }));
  };

  const handleAddFile = async () => {
    const filename = prompt("Enter filename (e.g. index.css):");
    if (!filename) return;
    try {
      await pulseClient.fsWrite(filename, '// Source generated by Form Architect');
      const newFile: BlueprintFile = { path: filename, content: '// Source generated by Form Architect', language: filename.split('.').pop() || 'text' };
      setState(prev => ({ ...prev, activeBlueprint: [...(prev.activeBlueprint || []), newFile] }));
      setActiveFile(filename);
      setState(prev => ({ ...prev, currentPlane: 'editor' }));
    } catch (error) { console.error("Failed to create file:", error); }
  };

  const handleOpenFile = async (file: BlueprintFile) => {
    try {
      const res = await pulseClient.fsRead(file.path);
      if (res && res.success && res.content) {
        setState(prev => {
          const newBlueprint = [...(prev.activeBlueprint || [])];
          const idx = newBlueprint.findIndex(f => f.path === file.path);
          if (idx !== -1) newBlueprint[idx] = { ...newBlueprint[idx], content: res.content };
          return { ...prev, activeBlueprint: newBlueprint };
        });
      }
    } catch (e) { console.warn("Failed to read file from disk, using cached version:", e); }
    setActiveFile(file.path);
    setState(prev => ({ ...prev, currentPlane: 'editor' }));
  };

  const handleUpdateFile = async (path: string, content: string) => {
    try {
      await pulseClient.fsWrite(path, content);
      setState(prev => {
        const newBlueprint = [...(prev.activeBlueprint || [])];
        const idx = newBlueprint.findIndex(f => f.path === path);
        if (idx !== -1) newBlueprint[idx] = { ...newBlueprint[idx], content };
        return { ...prev, activeBlueprint: newBlueprint };
      });
    } catch (error) { console.error("Failed to save file:", error); }
  };

  const handleDeleteFile = (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    setState(prev => ({ ...prev, activeBlueprint: prev.activeBlueprint?.filter(f => f.path !== path) || [] }));
    if (activeFile === path) setActiveFile(null);
  };

  const downloadBlueprintAsZip = async () => {
    if (!state.activeBlueprint || state.activeBlueprint.length === 0) return;
    const zip = new JSZip();
    state.activeBlueprint.forEach(file => zip.file(file.path, file.content));
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.name.toLowerCase() || 'form-app'}-blueprint.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startSomaTaskLegacy = async (name: string) => {
    const taskId = `task_${Date.now()}`;
    const steps = ['Synthesizing Blueprint...', 'Transpiling Artifacts...', 'Optimizing Assets...', 'Linking Live Domains...'];
    setState(prev => ({ ...prev, blocks: [...prev.blocks, { id: `block_${Date.now()}`, type: 'soma-task', content: name, timestamp: Date.now(), metadata: { soma: { id: taskId, name, state: 'running', currentStep: 0, totalSteps: steps.length, stepLabel: 'Readying...', timestamp: Date.now(), assignedNodeId: 'ExecNode1' } } }] }));
    await broker.publish('task', { taskId, intent: 'exec', steps, ttl: 3600 });
  };

  return (
    <div className="flex h-screen bg-[#0d0d0e] text-zinc-300 font-sans overflow-hidden">
      {/* 1. Left Sidebar Column (Icon Bar + Optional File Explorer) */}
      <div className={`flex border-r border-zinc-800/50 bg-zinc-950 transition-all duration-300 ${isLeftSidebarCollapsed ? 'w-12' : 'w-72'}`}>
        {/* Fixed Width Icon Bar */}
        <div className="w-12 border-r border-zinc-900/50 h-full flex flex-col shrink-0">
          <Sidebar
            state={state}
            isCollapsed={true} 
            onToggle={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
            onTabChange={(tab) => {
              if (tab === 'planning' || tab === 'editor' || tab === 'code') setState(prev => ({ ...prev, currentPlane: tab as any }));
              else setState(prev => ({ ...prev, activeTab: tab }));
            }}
            onDownloadZip={downloadBlueprintAsZip}
          />
        </div>

        {/* Dynamic File Explorer Area */}
        {!isLeftSidebarCollapsed && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="p-3 border-b border-zinc-900 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-2">Project Files</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileExplorer
                files={state.activeBlueprint || []}
                onFileSelect={handleOpenFile}
                onFileCreate={handleAddFile}
                onFileDelete={handleDeleteFile}
                activeFile={activeFile}
              />
            </div>
          </div>
        )}
      </div>

      <main className="flex-1 flex flex-col min-w-0 relative bg-[#09090b]">
        <header className="h-12 border-b border-zinc-800/50 flex items-center px-4 justify-between bg-zinc-950/80 backdrop-blur-md z-20 shrink-0">
          <div className="flex bg-zinc-900/80 border border-zinc-800 rounded-lg p-1 shadow-lg shadow-black/40 ml-2">
            <button
              onClick={() => setState(prev => ({ ...prev, currentPlane: 'code' }))}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-widest ${state.currentPlane === 'code' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Studio Chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Chat</span>
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, currentPlane: 'shell' }))}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-widest ${state.currentPlane === 'shell' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Live Terminal"
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Terminal</span>
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, currentPlane: 'preview' }))}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-widest ${state.currentPlane === 'preview' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Live Preview"
            >
              <Layout className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Preview</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-1.5 rounded-lg border transition-colors ${isRightSidebarOpen ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
              title="Cognitive Parameters"
            >
              <Settings className="w-4 h-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="ml-2 p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {state.currentPlane === 'shell' ? (
            <TerminalWindow
              isOpen={true}
              onClose={() => setState(prev => ({ ...prev, currentPlane: 'code' }))}
              onExecute={async (cmd) => {
                const res = await pulseClient.executeShell(cmd, state.currentPath);
                return res.output || res.error || '';
              }}
              className="h-full"
            />
          ) : state.currentPlane === 'preview' ? (
            <PreviewPlane
              preview={state.preview} blueprint={state.activeBlueprint}
              onRefresh={() => setState(prev => ({ ...prev, preview: { ...prev.preview!, lastUpdated: Date.now() } }))}
              onAddFile={handleAddFile} onLaunch={() => startSomaTaskLegacy('Live Deployment')}
              onSteveAsk={(message, context) => { setIsSteveChatOpen(true); handleSteveMessage(message); }}
            />
          ) : state.currentPlane === 'planning' ? (
            <PlanningMode
              onPlanCreated={(plan) => setState(prev => ({ ...prev, blocks: [...prev.blocks, { id: `plan-${Date.now()}`, type: 'output', content: `📋 Plan created: "${plan.goal}"`, timestamp: Date.now() }] }))}
              onExecuteStep={async (step) => {
                const res = await pulseClient.executeArbiteriumStep(step, { projectName: state.name, currentPath: state.currentPath, activeFile });
                return res;
              }}
            />
          ) : state.currentPlane === 'editor' ? (
            <EditorPlane file={state.activeBlueprint?.find(f => f.path === activeFile) || null} onSave={handleUpdateFile} />
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative h-full">
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 scroll-smooth custom-scrollbar pt-6 pb-80">
                <SystemInstructions instructions={systemInstructions} setInstructions={setSystemInstructions} />
                <div className="px-4 md:px-6 space-y-10 max-w-5xl mx-auto w-full">
                  {state.blocks.map(block => (
                    <TerminalBlockView
                      key={block.id} block={block}
                      onExecute={(cmd) => handleCommand(undefined, cmd)}
                      onSyncBlueprint={handleSyncBlueprint}
                      onStopSoma={() => broker.publish(`stop.${block.metadata?.soma?.id}`, { taskId: block.metadata?.soma?.id })}
                    />
                  ))}
                  {isProcessing && (
                    <div className="flex items-center space-x-3 text-blue-400 animate-pulse font-mono text-[10px] pl-3 border-l border-blue-500/30 ml-2">
                      <Zap className="w-3 h-3" />
                      <span className="uppercase tracking-[0.2em]">Synthesizing Reality...</span>
                    </div>
                  )}
                </div>
              </div>
              <PromptComposer value={inputValue} onChange={setInputValue} onSubmit={handleCommand} isProcessing={isProcessing} onClear={() => setState(prev => ({ ...prev, blocks: [] }))} />
            </div>
          )}
        </div>
      </main>

      {isRightSidebarOpen && (
        <RunSettings
          temperature={temperature} setTemperature={setTemperature}
          maxTokens={maxTokens} setMaxTokens={setMaxTokens}
          model={model} setModel={setModel}
        />
      )}

      <SteveChat isOpen={isSteveChatOpen} onClose={() => setIsSteveChatOpen(false)} messages={steveMessages} onSendMessage={handleSteveMessage} isProcessing={isSteveThinking} onActionExecute={(cmd) => handleCommand(undefined, cmd)} onApplyEdits={applySteveEdits} buttonPosition={stevePos} />
      <SteveAgentButton isActive={isSteveChatOpen} position={stevePos} onMouseDown={handleSteveMouseDown} isDragging={isDraggingSteve} />
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} onAction={(cmd) => { setIsPaletteOpen(false); handleCommand(undefined, cmd); }} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} projectName={state.name} />
      
      {healingProposal && (
        <HealingReviewModal
          error={healingProposal.error}
          fixes={healingProposal.fixes}
          arbiters={healingProposal.arbiters}
          confidence={healingProposal.confidence}
          onApply={(editedFixes) => {
            editedFixes.forEach(fix => {
              handleUpdateFile(fix.file, fix.newContent);
            });
            setHealingProposal(null);
            window.dispatchEvent(new CustomEvent('pulse:healing-applied', { detail: { fixes: editedFixes } }));
          }}
          onReject={() => {
            setHealingProposal(null);
            window.dispatchEvent(new CustomEvent('pulse:healing-rejected'));
          }}
        />
      )}
    </div>
  );
};

export default App;
