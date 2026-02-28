import React, { useState, useCallback, useEffect } from 'react';
import {
  Files, Search, Upload, Database, Folder, FileText,
  HardDrive, AlertCircle, CheckCircle, Loader2, FolderOpen
} from 'lucide-react';
import {
  queryStorage,
  ingestFiles,
  getStorageStats,
  checkBackendHealth
} from '../../FileIntelligence/services/somaStorageClient';
import {
  loadIndexedFiles,
  saveIndexedFiles,
  getPersistedStats,
  clearPersistedData
} from '../../FileIntelligence/services/persistenceService';
import { readDirectory, flattenNodes, processFileList } from '../../FileIntelligence/services/fileSystem';
import FileViewer from '../../FileIntelligence/components/FileViewer';
import KnowledgeGraph from '../../FileIntelligence/components/KnowledgeGraph';
import { pulseClient } from '../services/pulseClient';

interface FileNode {
  id: string;
  name: string;
  kind: 'file' | 'directory';
  path: string;
  parentId?: string;
  isIndexed: boolean;
  metadata?: any;
  content?: string;
  children?: FileNode[];
}

interface SearchResult {
  id: string;
  name: string;
  path: string;
  score: number;
  metadata?: any;
  preview?: string;
}

interface FileOperationsPaneProps {
  onClose?: () => void;
  onFileSelect?: (file: { path: string; content: string; language: string }) => void;
}

type ViewMode = 'standard' | 'heatmap' | 'temporal' | 'integrity' | 'lifecycle';

const FileOperationsPane: React.FC<FileOperationsPaneProps> = ({ onClose, onFileSelect }) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'graph'>('browse');
  const [allNodes, setAllNodes] = useState<FileNode[]>([]);
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [localStats, setLocalStats] = useState({ files: 0, size: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [graphViewMode, setGraphViewMode] = useState<ViewMode>('standard');
  const [relevantNodeIds, setRelevantNodeIds] = useState<string[]>([]);

  // Check SOMA backend on mount
  useEffect(() => {
    const checkBackend = async () => {
      const isAvailable = await checkBackendHealth();
      setBackendConnected(isAvailable);
      if (isAvailable) {
        const statsResult = await getStorageStats();
        if (statsResult.success) {
          setStats(statsResult.stats);
        }
      }
    };
    checkBackend();
    
    // Load persisted files
    loadPersisted();
  }, []);

  const loadPersisted = async () => {
    const result = await loadIndexedFiles();
    if (result.success && result.nodes.length > 0) {
      setAllNodes(result.nodes);
      if (result.rootNodes && result.rootNodes.length > 0) {
        const root: FileNode = {
          id: 'root',
          name: result.meta?.rootName || 'Restored Session',
          kind: 'directory',
          path: '/',
          children: result.rootNodes,
          isIndexed: true
        };
        setRootNode(root);
      }
      const files = result.nodes.filter(n => n.kind === 'file');
      const totalSize = result.nodes.reduce((sum, n) => sum + (n.metadata?.size || 0), 0);
      setLocalStats({ files: files.length, size: totalSize });
    }
  };

  // Handle folder selection
  const handleSelectFolder = async () => {
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker();
      const nodes = await readDirectory(dirHandle, null, '', null);
      
      const root: FileNode = {
        id: 'root',
        name: dirHandle.name,
        kind: 'directory',
        path: '/',
        children: nodes,
        isIndexed: false
      };
      
      setRootNode(root);
      const flat = flattenNodes(nodes);
      setAllNodes([root, ...flat]);
      
      const files = flat.filter((n: FileNode) => n.kind === 'file');
      const totalSize = flat.reduce((sum: number, n: FileNode) => sum + (n.metadata?.size || 0), 0);
      setLocalStats({ files: files.length, size: totalSize });
      
      // Save to persistence
      await saveIndexedFiles([root, ...flat], root);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Folder selection error:', err);
      }
    }
  };

  // Handle file drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];
    
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    
    if (files.length > 0) {
      const nodes = await processFileList(files);
      const root: FileNode = {
        id: 'upload-root',
        name: 'Upload',
        kind: 'directory',
        path: '/',
        children: nodes,
        isIndexed: false
      };
      
      setRootNode(root);
      const flat = flattenNodes(nodes);
      setAllNodes([root, ...flat]);
      
      const fileNodes = flat.filter((n: FileNode) => n.kind === 'file');
      const totalSize = flat.reduce((sum: number, n: FileNode) => sum + (n.metadata?.size || 0), 0);
      setLocalStats({ files: fileNodes.length, size: totalSize });
      
      await saveIndexedFiles([root, ...flat], root);
    }
  };

  // Index files to SOMA backend
  const handleIndexFiles = async () => {
    if (!backendConnected) {
      alert('SOMA backend not connected. Start the backend server first.');
      return;
    }
    
    if (allNodes.length === 0) {
      alert('No files to index. Select a folder first.');
      return;
    }
    
    setIsIndexing(true);
    
    const filesToIndex = allNodes.filter(n => n.kind === 'file' && n.content);
    
    try {
      const result = await ingestFiles(
        filesToIndex.map(node => ({
          id: node.id,
          name: node.name,
          path: node.path,
          content: node.content || '',
          size: node.metadata?.size || 0,
          metadata: node.metadata
        })),
        { universe: 'pulse-workspace' }
      );
      
      if (result.success) {
        // Mark nodes as indexed
        filesToIndex.forEach(node => { node.isIndexed = true; });
        setAllNodes([...allNodes]);
        await saveIndexedFiles(allNodes, rootNode);
        
        // Refresh stats
        const statsResult = await getStorageStats();
        if (statsResult.success) {
          setStats(statsResult.stats);
        }
      }
    } catch (err) {
      console.error('Indexing error:', err);
    } finally {
      setIsIndexing(false);
    }
  };

  // Semantic search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!backendConnected) {
      alert('SOMA backend not connected.');
      return;
    }
    
    setIsSearching(true);
    
    try {
      const result = await queryStorage(searchQuery, {
        filters: { universe: 'pulse-workspace' },
        topK: 20
      });
      
      if (result.success) {
        const results: SearchResult[] = result.results.map((r: any) => ({
          id: r.id,
          name: r.metadata?.name || r.id,
          path: r.metadata?.path || r.id,
          score: r.finalScore * 100,
          metadata: r.metadata,
          preview: r.content?.substring(0, 200)
        }));
        setSearchResults(results);
        setRelevantNodeIds(results.map(r => r.id));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle directory expansion
  const toggleDir = (id: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDirs(newExpanded);
  };

  // Render tree node
  const renderTreeNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    
    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-all ${
            isSelected ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-zinc-800/50 text-zinc-400'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.kind === 'directory') {
              toggleDir(node.id);
            } else {
              setSelectedNode(node);
            }
          }}
          onDoubleClick={() => {
            if (node.kind === 'file' && onFileSelect) {
              // Open file in Editor
              const extension = node.name.split('.').pop() || 'txt';
              onFileSelect({
                path: node.path,
                content: node.content || '',
                language: extension
              });
            }
          }}
        >
          {node.kind === 'directory' ? (
            <FolderOpen className="w-4 h-4 text-yellow-500 shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          <span className="text-xs font-mono truncate flex-1">{node.name}</span>
          {node.isIndexed && (
            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
          )}
        </div>
        {node.kind === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Files className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">File Operations</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Smart File Intelligence & Search
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
            backendConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {backendConnected ? 'SOMA Connected' : 'Backend Offline'}
          </div>
          
          {stats && (
            <div className="text-xs text-zinc-500">
              {stats.totalDocuments || 0} indexed
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-800/50 bg-zinc-900/20">
        {[
          { id: 'browse', label: 'Browse', icon: Folder },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'graph', label: 'Graph', icon: Database }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <>
            {/* File Tree */}
            <div className="w-80 border-r border-zinc-800/50 flex flex-col bg-zinc-900/20">
              <div className="p-4 border-b border-zinc-800/50 space-y-2">
                <button
                  onClick={handleSelectFolder}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all text-xs font-medium"
                >
                  <FolderOpen className="w-4 h-4" />
                  Select Folder
                </button>
                
                <button
                  onClick={handleIndexFiles}
                  disabled={!backendConnected || isIndexing || allNodes.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isIndexing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Index to SOMA
                    </>
                  )}
                </button>
                
                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2">
                  <span>{localStats.files} files</span>
                  <span>{formatBytes(localStats.size)}</span>
                </div>
              </div>
              
              {/* Drag/Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`flex-1 overflow-y-auto custom-scrollbar p-2 ${
                  isDragging ? 'bg-blue-500/10 border-2 border-dashed border-blue-500' : ''
                }`}
              >
                {rootNode ? (
                  renderTreeNode(rootNode)
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Upload className="w-12 h-12 text-zinc-700 mb-4" />
                    <p className="text-xs text-zinc-500 mb-2">No folder selected</p>
                    <p className="text-[10px] text-zinc-600">
                      Select a folder or drag & drop files
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* File Viewer */}
            <div className="flex-1 relative">
              {selectedNode ? (
                <FileViewer
                  node={selectedNode}
                  highlightedChunk={undefined}
                  onClose={() => setSelectedNode(null)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="w-16 h-16 text-zinc-800 mb-4" />
                  <p className="text-sm text-zinc-500">No file selected</p>
                  <p className="text-xs text-zinc-600 mt-2">
                    Select a file from the tree to view its contents
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col p-6">
            {/* Search Bar */}
            <div className="flex gap-2 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Semantic search across indexed files..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!backendConnected || isSearching || !searchQuery.trim()}
                className="px-6 py-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-blue-500/30 transition-all cursor-pointer"
                    onClick={() => {
                      const node = allNodes.find(n => n.id === result.id);
                      if (node) {
                        setSelectedNode(node);
                        setActiveTab('browse');
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-zinc-100">{result.name}</span>
                      </div>
                      <span className="text-xs text-blue-400 font-mono">
                        {result.score.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono mb-2">{result.path}</p>
                    {result.preview && (
                      <p className="text-xs text-zinc-600 line-clamp-2">{result.preview}</p>
                    )}
                  </div>
                ))
              ) : searchQuery && !isSearching ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AlertCircle className="w-12 h-12 text-zinc-700 mb-4" />
                  <p className="text-sm text-zinc-500">No results found</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Search className="w-12 h-12 text-zinc-700 mb-4" />
                  <p className="text-sm text-zinc-500">Enter a query to search</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Graph Tab */}
        {activeTab === 'graph' && (
          <div className="flex-1 relative">
            {allNodes.length > 0 ? (
              <>
                {/* View Mode Selector */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  {['standard', 'heatmap', 'temporal', 'integrity', 'lifecycle'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGraphViewMode(mode as ViewMode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        graphViewMode === mode
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                
                <KnowledgeGraph
                  nodes={allNodes}
                  relevantNodeIds={relevantNodeIds}
                  onNodeClick={(node: FileNode) => setSelectedNode(node)}
                  viewMode={graphViewMode}
                  onContextMenu={(e: any, node: FileNode) => {
                    e.preventDefault();
                    setSelectedNode(node);
                  }}
                  timeSliderValue={100}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Database className="w-16 h-16 text-zinc-800 mb-4" />
                <p className="text-sm text-zinc-500">No files to visualize</p>
                <p className="text-xs text-zinc-600 mt-2">
                  Select a folder to see the knowledge graph
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileOperationsPane;
