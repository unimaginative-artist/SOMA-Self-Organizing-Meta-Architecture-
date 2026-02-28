
export type WorkspaceTab = 'web' | 'backend' | 'fleet' | 'security' | 'docs' | 'files';
export type ViewPlane = 'code' | 'preview' | 'editor' | 'planning';
export type BlockType =
  | 'command'
  | 'ai-suggestion'
  | 'output'
  | 'error'
  | 'code-gen'
  | 'blueprint'
  | 'log-stream'
  | 'roadmap'
  | 'diagnostic'
  | 'documentation'
  | 'security-audit'
  | 'context-shift'
  | 'soma-task'
  | 'search-process';

export type TaskState = 'idle' | 'running' | 'stopping' | 'stopped' | 'completed';
export type FleetRole = 'prime' | 'execution' | 'observer' | 'archive';

export interface TaskEnvelope {
  taskId: string;
  intent: string;
  steps: string[];
  constraints?: { timeoutMs?: number; maxMemoryMb?: number };
  ttl: number;
}

export interface ObserverMessage {
  taskId: string;
  type: 'progress' | 'complete' | 'halted' | 'error';
  from: string;
  payload?: any;
}

export interface SearchStep {
  path: string;
  status: 'scanning' | 'found' | 'skipped' | 'matched';
  relevance?: number;
}

export interface SomaTask {
  id: string;
  name: string;
  state: TaskState;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  timestamp: number;
  assignedNodeId?: string;
  observerNodeId?: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  description: string;
  command?: string;
}

export interface BackendService {
  id: string;
  name: string;
  port: number;
  status: 'online' | 'offline' | 'starting' | 'unresponsive';
  role: FleetRole;
  version?: string;
  lastHeartbeat?: number;
  logs: string[];
  metrics: {
    cpu: number[];
    memory: number[];
  };
}

export interface BlueprintFile {
  path: string;
  content: string;
  language: string;
}

export interface CompletionSuggestion {
  type: 'cmd' | 'flag' | 'path' | 'ai';
  text: string;
  description: string;
}

export interface PreviewState {
  url: string;
  title: string;
  type: 'website' | 'app' | 'api';
  lastUpdated: number;
}

export interface ProjectState {
  name: string;
  activeTab: WorkspaceTab;
  currentPlane: ViewPlane;
  currentPath: string;
  services: BackendService[];
  blocks: TerminalBlock[];
  activeBlueprint?: BlueprintFile[];
  roadmap?: ProjectTask[];
  securityScore?: number;
  preview?: PreviewState;
}

export interface TerminalBlock {
  id: string;
  type: BlockType;
  content: string;
  command?: string;
  timestamp: number;
  status?: 'running' | 'completed' | 'failed';
  progress?: number;
  metadata?: {
    language?: string;
    path?: string;
    suggestions?: string[];
    blueprint?: BlueprintFile[];
    steps?: string[];
    tasks?: ProjectTask[];
    analysis?: string;
    severity?: 'info' | 'warning' | 'critical';
    score?: number;
    sections?: { title: string; content: string }[];
    vulnerabilities?: { name: string; impact: string; fix: string }[];
    tabTitle?: string;
    soma?: SomaTask;
    searchSteps?: SearchStep[];
    searchQuery?: string;
  };
}
