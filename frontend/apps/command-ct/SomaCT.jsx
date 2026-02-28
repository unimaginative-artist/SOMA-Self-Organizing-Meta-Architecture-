import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Clock, ChevronLeft, ChevronRight, Zap, Activity, Code, Cpu, Globe, Server, Shield, Ghost, Bot, Download, Edit3, X, CheckCircle } from 'lucide-react';
import Terminal from './components/Terminal';
import { SomaServiceBridge } from './services/SomaServiceBridge';
import { ApprovalQueue } from './components/ApprovalQueue';
import { AnimatedBrain } from './components/AnimatedBrain';
import PulseInterface from '../command-bridge/components/PulseInterface';
import io from 'socket.io-client';
import './styles/terminal.css';

const Header = ({ isAgentConnected, isProcessing, onPulseClick }) => (
  <header className="w-full p-6 flex items-center justify-between relative z-10 select-none">
    <div className="flex items-center space-x-3">
      <AnimatedBrain isActive={isProcessing} showText={true} />
    </div>

    <div className="flex items-center space-x-3">
      {/* Pulse Button */}
      {onPulseClick && (
        <button
          onClick={onPulseClick}
          className="flex items-center space-x-2 px-3 py-1 rounded-full border transition-all duration-500 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-400/40"
          title="Open Neural Pulse Interface"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animation: 'heartbeat 2s ease-in-out infinite' }}></div>
          <span className="text-[10px] font-medium tracking-wide uppercase text-cyan-400">
            Pulse
          </span>
        </button>
      )}

      {/* Neural Link Indicator */}
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all duration-500 bg-emerald-500/10 border-emerald-500/20`}>
        <div className="h-1.5 w-1.5 rounded-full transition-colors duration-500 bg-emerald-400"></div>
        <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-400">
          Neural Link
        </span>
      </div>
    </div>
  </header>
);

const SOMA_EMOJIS = [
  '/emoji/111624-sappypleading.gif',
  '/emoji/1728-chickclap.gif',
  '/emoji/20177-ghost-cry.gif',
  '/emoji/2266-pepetwirl.gif',
  '/emoji/408583-dancing-penguin-goomy.gif',
  '/emoji/41920-catlick.gif',
  '/emoji/44406-mochabunnies.gif',
  '/emoji/49632-frogdance.gif',
  '/emoji/60811-foxnomapples.gif',
  '/emoji/713213-milk-mad.gif',
  '/emoji/767230-peach-dance.gif',
  '/emoji/84304-milklaughing.gif'
];

const getChatIcon = (conv) => {
  let icon = conv?.icon;
  // Migration: Convert old absolute URLs to relative paths
  if (icon && typeof icon === 'string' && icon.includes('localhost:3001/emoji/')) {
    icon = '/emoji/' + icon.split('/emoji/')[1];
  }
  if (icon) return icon;
  
  const id = conv?.id || 'default';
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % SOMA_EMOJIS.length;
  return SOMA_EMOJIS[index];
};

const IconPickerModal = ({ isOpen, onClose, onSelect, currentIcon }) => {
  const [customUrl, setCustomUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const searchEmojiGG = async () => {
    if (!searchQuery) return;
    try {
      // emoji.gg API search
      const res = await fetch(`https://emoji.gg/api/`);
      const allEmojis = await res.json();
      const filtered = allEmojis.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20);
      setSearchResults(filtered);
    } catch (e) {
      console.error("Search failed", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#151518] border border-white/10 rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            Customize Chat Avatar
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {/* Default SOMA Emojis */}
          <section className="mb-8">
            <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">SOMA Originals</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {SOMA_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(emoji)}
                  className={`relative p-2 rounded-2xl border-2 transition-all duration-300 ${currentIcon === emoji ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent bg-white/5 hover:bg-white/10 hover:scale-105'}`}
                >
                  <img src={emoji} alt="emoji" className="w-full h-auto aspect-square object-contain" />
                  {currentIcon === emoji && <div className="absolute -top-1 -right-1 bg-cyan-500 rounded-full p-0.5"><CheckCircle className="w-3 h-3 text-white" /></div>}
                </button>
              ))}
            </div>
          </section>

          {/* emoji.gg Integration */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Emoji.gg Library</h4>
              <a href="https://emoji.gg" target="_blank" rel="noreferrer" className="text-[10px] text-cyan-500 hover:underline flex items-center gap-1">
                Browse Website <Globe className="w-3 h-3" />
              </a>
            </div>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Search emoji.gg (e.g. 'coding', 'cat')..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchEmojiGG()}
              />
              <button 
                onClick={searchEmojiGG}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
              >
                Search
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {searchResults.map((emoji) => (
                <button
                  key={emoji.id}
                  onClick={() => onSelect(emoji.url)}
                  className="p-2 rounded-2xl border-2 border-transparent bg-white/5 hover:bg-white/10 hover:scale-105 transition-all"
                >
                  <img src={emoji.url} alt={emoji.title} className="w-full h-auto aspect-square object-contain" />
                </button>
              ))}
            </div>
          </section>

          {/* Custom URL */}
          <section>
            <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">Custom URL</h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Paste image/gif URL here..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button 
                onClick={() => onSelect(customUrl)}
                className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-colors"
              >
                Apply
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const SomaCT = ({ hidePulse = false }) => {
  const somaService = useRef(null);
  const socketRef = useRef(null);

  // Conversation Management
  const [conversations, setConversations] = useState(() => {
    const stored = localStorage.getItem('soma_conversations');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [activeConversationId, setActiveConversationId] = useState(() => {
    return localStorage.getItem('soma_active_conversation');
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [iconTargetId, setIconTargetId] = useState(null);

  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('~');
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const [inputValue, setInputValue] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [somaResponseText, setSomaResponseText] = useState('');
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [showPulse, setShowPulse] = useState(false);
  const [showPulseConfirm, setShowPulseConfirm] = useState(false);

  // Save conversation when history changes
  useEffect(() => {
    if (activeConversationId && history.length > 0) {
      saveCurrentConversation();
    }
  }, [history]);

  const saveCurrentConversation = () => {
    if (!activeConversationId) return;

    const updatedConversations = conversations.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          messages: history,
          updatedAt: Date.now(),
          title: conv.title || (history.length > 0 ? (typeof history[0].content === 'string' ? history[0].content.substring(0, 50) + '...' : 'New Chat') : 'New Chat')
        };
      }
      return conv;
    });

    // If conversation doesn't exist, create it
    if (!conversations.find(c => c.id === activeConversationId)) {
      const newConv = {
        id: activeConversationId,
        title: history.length > 0 ? (typeof history[0].content === 'string' ? history[0].content.substring(0, 50) + '...' : 'New Chat') : 'New Chat',
        messages: history,
        icon: SOMA_EMOJIS[Math.floor(Math.random() * SOMA_EMOJIS.length)],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      updatedConversations.push(newConv);
    }

    setConversations(updatedConversations);
    localStorage.setItem('soma_conversations', JSON.stringify(updatedConversations));
  };

  const handleNewChat = (shouldSave = true) => {
    if (conversations.length >= 25) { // Increased limit
      alert('Conversation limit reached (Max 25). Please delete an old chat first.');
      return;
    }
    if (shouldSave && activeConversationId) {
      saveCurrentConversation();
    }
    const newId = 'conv_' + Date.now();
    setActiveConversationId(newId);
    setHistory([]);
    localStorage.setItem('soma_active_conversation', newId);
    if (somaService.current) {
      somaService.current.conversationHistory = [];
    }
  };

  const handleSelectChat = (id) => {
    if (history.length > 0) {
      saveCurrentConversation();
    }

    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setActiveConversationId(id);
      setHistory(conv.messages || []);
      localStorage.setItem('soma_active_conversation', id);
      if (somaService.current) {
        somaService.current.conversationHistory = [];
        (conv.messages || []).forEach(msg => {
          if (msg.type === 'command') {
            somaService.current.conversationHistory.push({ role: 'user', content: msg.content });
          } else if (msg.type === 'response') {
            somaService.current.conversationHistory.push({ role: 'assistant', content: msg.content });
          }
        });
      }
    }
  };

  const handleUpdateIcon = (iconUrl) => {
    if (!iconTargetId) return;
    const updated = conversations.map(c => c.id === iconTargetId ? { ...c, icon: iconUrl } : c);
    setConversations(updated);
    localStorage.setItem('soma_conversations', JSON.stringify(updated));
    setIsIconModalOpen(false);
    setIconTargetId(null);
  };

  // Export conversation as JSON or Markdown
  const handleExportChat = (format = 'json') => {
    if (!activeConversationId || history.length === 0) {
      alert('No conversation to export');
      return;
    }

    const conv = conversations.find(c => c.id === activeConversationId);
    const title = conv?.title || 'SOMA Conversation';
    const timestamp = new Date().toISOString().split('T')[0];
    
    let content, filename, mimeType;
    
    if (format === 'markdown') {
      // Convert to Markdown
      const lines = [
        `# ${title}`,
        `*Exported: ${new Date().toLocaleString()}*`,
        '',
        '---',
        ''
      ];
      
      history.forEach(item => {
        if (item.type === 'command') {
          lines.push(`**You:** ${typeof item.content === 'string' ? item.content : '[Complex input]'}`);
          lines.push('');
        } else if (item.type === 'response') {
          lines.push(`**SOMA:** ${item.content}`);
          lines.push('');
        } else if (item.type === 'error') {
          lines.push(`> ⚠️ Error: ${item.content}`);
          lines.push('');
        }
      });
      
      content = lines.join('\n');
      filename = `soma-chat-${timestamp}.md`;
      mimeType = 'text/markdown';
    } else {
      // JSON format
      const exportData = {
        title,
        exportedAt: new Date().toISOString(),
        conversationId: activeConversationId,
        messageCount: history.length,
        messages: history.map(item => ({
          type: item.type,
          content: typeof item.content === 'string' ? item.content : '[Complex content]',
          timestamp: item.timestamp || null
        }))
      };
      
      content = JSON.stringify(exportData, null, 2);
      filename = `soma-chat-${timestamp}.json`;
      mimeType = 'application/json';
    }
    
    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteChat = (id, e) => {
    e.stopPropagation();
    // Removed confirmation as requested
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    localStorage.setItem('soma_conversations', JSON.stringify(updated));

    if (id === activeConversationId) {
      handleNewChat(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  useEffect(() => {
    try {
      const service = new SomaServiceBridge((path) => setCurrentPath(path));
      somaService.current = service;
      service.initialize();

      // Initialize first conversation if none exists
      if (!activeConversationId) {
        handleNewChat();
      }

      // Initialize Socket.IO connection for approval system
      // In dev mode, use relative URL to go through Vite proxy; in prod, connect directly
      const socketUrl = import.meta.env?.DEV
        ? undefined  // Socket.IO defaults to window.location when undefined
        : `${window.location.protocol}//${window.location.hostname}:${import.meta.env?.VITE_BACKEND_PORT || '3001'}`;
      console.log('[SomaCT] Connecting Socket.IO to:', socketUrl || '(relative - via Vite proxy)');

      const socket = io(socketUrl, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 5000,
        timeout: 20000
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[SomaCT] Socket.IO connected to server');
        setIsAgentConnected(true);
      });

      socket.on('disconnect', (reason) => {
        // Approval socket disconnected — doesn't affect HTTP chat
      });

      socket.on('connect_error', (error) => {
        // Suppress non-critical socket errors to keep console clean
      });

      // Handle approval requests from server
      socket.on('approval_required', (request) => {
        console.log('[WebSocket] Approval required:', request);
        setApprovalQueue(prev => [...prev, request]);
      });

      socket.on('trace', (payload) => {
        if (!payload) return;
        const phase = payload.phase || 'trace';
        const tool = payload.tool ? ` ${payload.tool}` : '';
        const count = payload.count != null ? ` (${payload.count})` : '';
        const msg = payload.preview ? ` — ${payload.preview}` : '';
        addHistory([{ id: Date.now() + Math.random(), type: 'search', content: `[${phase}]${tool}${count}${msg}` }]);
      });

      setIsInitialized(true);

      // Verify actual HTTP connectivity to backend — this is the real "SOMA online" check
      const checkBackend = async () => {
        try {
          const r = await fetch('/health', { signal: AbortSignal.timeout(5000) });
          setIsAgentConnected(r.ok);
        } catch {
          setIsAgentConnected(false);
        }
      };
      checkBackend();
      // Re-check every 30s so the status dot stays accurate
      const healthInterval = setInterval(checkBackend, 30000);
      return () => {
        socket.disconnect();
        clearInterval(healthInterval);
      };
    } catch (error) {
      console.error("Initialization Error:", error);
      setHistory(prev => [...prev, { id: Date.now(), type: 'error', content: `Initialization Failed: ${error.message || 'Unknown error'}` }]);
      setIsInitialized(true);
    }
  }, []);

  // Dispatch-like helpers
  const addHistory = (items) => setHistory(prev => [...prev, ...items]);
  const updateHistory = (id, content) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, content } : item));
  };

  const [directive, setDirective] = useState(null);

  const executeCommand = useCallback(async (commandOrPayload) => {
    // Check if it's a simple string or an object payload
    const isString = typeof commandOrPayload === 'string';
    const commandText = isString ? commandOrPayload : commandOrPayload.query;

    if (!commandText?.trim() && !commandOrPayload.file) return; // Allow empty text if file exists

    if (isString && commandText.trim().toLowerCase() === 'clear') {
      setHistory([]);
      setInputValue('');
      return;
    }

    if (isString && (commandText.trim().toLowerCase() === 'pulse' || commandText.trim().toLowerCase() === 'ide')) {
      setShowPulseConfirm(true);
      setInputValue('');
      return;
    }

    setIsLoading(true);
    setSuggestions([]);
    setDirective(null); // Clear previous directives

    // Confirmation Logic
    if (awaitingConfirmation) {
      const confirmationCommand = commandText.toLowerCase() === 'y' || commandText.toLowerCase() === 'yes' ? 'y' : 'n';
      addHistory([{ id: Date.now(), type: 'command', content: confirmationCommand }]);
      somaService.current?.confirmRun(confirmationCommand === 'y');
      setAwaitingConfirmation(null);
    } else {
      // Display in history
      if (!isString && commandOrPayload.type === 'vision') {
        addHistory([{
          id: Date.now(),
          type: 'command',
          content: (
            <div className="flex flex-col">
              <span>{commandText}</span>
              <span className="text-xs text-zinc-500 mt-1 flex items-center">
                <span className="mr-2">📎</span> {commandOrPayload.file.name}
              </span>
            </div>
          )
        }]);
      } else {
        addHistory([{ id: Date.now(), type: 'command', content: commandText }]);
      }
    }

    setInputValue('');

    try {
      const commandStream = somaService.current.processCommand(commandOrPayload);
      let finalSuggestion = '';

      for await (const output of commandStream) {
        if (output.directive) {
          // Found a directive (e.g. camera request)
          setDirective(output.directive);
        }
        
        // Handle replaceId - removes old item and adds new one
        if (output.replaceId) {
          setHistory(prev => {
            const filtered = prev.filter(item => item.id !== output.replaceId);
            if (output.historyItems && output.historyItems.length > 0) {
              return [...filtered, ...output.historyItems];
            }
            return filtered;
          });
          // Update response text if applicable
          if (output.historyItems?.[0]?.type === 'response' || output.historyItems?.[0]?.type === 'thinking') {
            const content = output.historyItems[0].streamedText || output.historyItems[0].content;
            if (content) setSomaResponseText(content);
          }
        } else if (output.updateId && output.historyItems.length > 0) {
          // Update existing item by ID
          setHistory(prev => prev.map(item => 
            item.id === output.updateId ? output.historyItems[0] : item
          ));
          if (output.historyItems[0].type === 'response') {
            setSomaResponseText(output.historyItems[0].content);
          }
        } else if (output.historyItems && output.historyItems.length > 0) {
          // Smart Replace Logic: If we are adding a response and the last item was a 'think', replace it
          const newItem = output.historyItems[0];
          if (newItem.type === 'response') {
            setHistory(prev => {
              const last = prev[prev.length - 1];
              if (last && last.type === 'think') {
                // Text-based replacement for "fading" effect logic could go here, 
                // but React state replacement is cleaner. 
                // We replace the last 'think' with this 'response'
                return [...prev.slice(0, -1), newItem];
              }
              return [...prev, newItem];
            });
            setSomaResponseText(newItem.content);
          } else {
            addHistory(output.historyItems);
          }
        }
        if (output.suggestion) { finalSuggestion = output.suggestion; }
        if (output.suggestions) { setSuggestions(output.suggestions); }
        if (output.requiresConfirmation) { setAwaitingConfirmation(output.requiresConfirmation); }
      }

      setInputValue(finalSuggestion);
      setIsAgentConnected(somaService.current.isAgentConnected());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      addHistory([{ id: Date.now() + 1, type: 'error', content: `Error: ${errorMessage}` }]);
    }

    setIsLoading(false);
  }, [awaitingConfirmation]);

  const onSuggestionClick = useCallback((suggestion) => {
    setInputValue(suggestion);
    setTimeout(() => executeCommand(suggestion), 0);
  }, [executeCommand]);

  const handleAutocompleteResult = useCallback((completions) => {
    if (completions.length > 10) {
      const content = `> Too many possibilities (${completions.length}). Please be more specific.`;
      addHistory([{ id: Date.now(), type: 'info', content }]);
      return;
    }
    const content = `${completions.join('\t')}`;
    addHistory([{ id: Date.now(), type: 'info', content }]);
  }, []);

  return (
    <div className="h-screen ct-background text-zinc-200 flex flex-col items-center relative overflow-hidden font-sans selection:bg-white/20">
      {/* Approval Queue (floats on top) */}
      <ApprovalQueue
        socket={socketRef.current}
      />

      {/* Icon Picker Modal */}
      <IconPickerModal 
        isOpen={isIconModalOpen} 
        onClose={() => setIsIconModalOpen(false)} 
        onSelect={handleUpdateIcon}
        currentIcon={conversations.find(c => c.id === iconTargetId)?.icon}
      />

      {/* Pulse Confirmation Modal */}
      {showPulseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#151518] border border-cyan-500/30 rounded-2xl p-6 max-w-md shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-xl font-bold text-cyan-400">Launch Neural Pulse?</h3>
            </div>
            <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
              This will open the Pulse Synthesis Engine for design and creation workflows. Continue?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPulseConfirm(false);
                  setShowPulse(true);
                }}
                className="flex-1 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 rounded-lg font-semibold text-sm transition-all duration-200"
              >
                Launch Pulse
              </button>
              <button
                onClick={() => setShowPulseConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 rounded-lg font-semibold text-sm transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pulse Interface Modal */}
      {showPulse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <PulseInterface onClose={() => setShowPulse(false)} />
        </div>
      )}

      <div className="w-full mx-auto flex flex-col h-full relative z-10">
        <Header isAgentConnected={isAgentConnected} isProcessing={isLoading} onPulseClick={hidePulse ? undefined : () => setShowPulseConfirm(true)} />
        {isInitialized && (
          <div className="flex flex-1 overflow-hidden h-full">
            {/* Chat History Sidebar */}
            <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[#151518]/80 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300 overflow-hidden`}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                {!sidebarCollapsed && <h2 className="text-sm font-bold text-white uppercase tracking-wider">Chats</h2>}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"
                >
                  {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-col flex-1 overflow-hidden p-2">
                {/* New Chat Button */}
                <button
                  onClick={() => handleNewChat(true)}
                  className="btn mb-4 w-full"
                  title="New Chat"
                >
                  {sidebarCollapsed ? (
                    <Plus className="w-5 h-5" />
                  ) : (
                    "New Chat"
                  )}
                </button>

                {/* Export Buttons */}
                {!sidebarCollapsed && history.length > 0 && (
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => handleExportChat('json')}
                      className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-400/40 rounded-lg transition-all duration-200"
                      title="Export as JSON"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-semibold text-emerald-400">JSON</span>
                    </button>
                    <button
                      onClick={() => handleExportChat('markdown')}
                      className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-200"
                      title="Export as Markdown"
                    >
                      <Download className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] font-semibold text-purple-400">MD</span>
                    </button>
                  </div>
                )}
                {sidebarCollapsed && history.length > 0 && (
                  <button
                    onClick={() => handleExportChat('json')}
                    className="w-10 h-10 flex items-center justify-center mx-auto mb-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all duration-200"
                    title="Export Chat"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                  </button>
                )}

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                  {conversations.length === 0 ? (
                    <div className="text-center text-zinc-600 text-xs py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {!sidebarCollapsed && <p>No conversations yet</p>}
                    </div>
                  ) : (
                    conversations.map(conv => {
                      const chatIconUrl = getChatIcon(conv);
                      return (
                        <div
                          key={conv.id}
                          onClick={() => handleSelectChat(conv.id)}
                          className={`group relative ${sidebarCollapsed ? 'p-2 flex justify-center' : 'p-3'} rounded-lg cursor-pointer transition-all duration-200 ${conv.id === activeConversationId
                            ? 'bg-white/10 border border-white/10 shadow-lg'
                            : 'hover:bg-white/5 border border-transparent'
                            }`}
                          title={conv.title}
                        >
                          {sidebarCollapsed ? (
                            <div className="relative group/icon">
                              <img
                                src={chatIconUrl}
                                alt="icon"
                                className={`w-10 h-10 object-contain transition-all duration-300 ${conv.id === activeConversationId ? 'brightness-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] scale-110' : 'opacity-90 hover:opacity-100 hover:scale-105'
                                  }`}
                              />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIconTargetId(conv.id);
                                  setIsIconModalOpen(true);
                                }}
                                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/icon:opacity-100 rounded-lg transition-opacity"
                              >
                                <Edit3 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center space-x-2 overflow-hidden">
                                  <div className="relative group/icon">
                                    <img
                                      src={chatIconUrl}
                                      alt="icon"
                                      className={`w-8 h-8 object-contain flex-shrink-0 transition-all ${conv.id === activeConversationId ? 'drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]' : 'opacity-90 hover:opacity-100'
                                        }`}
                                    />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIconTargetId(conv.id);
                                        setIsIconModalOpen(true);
                                      }}
                                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/icon:opacity-100 rounded-lg transition-opacity"
                                    >
                                      <Edit3 className="w-3 h-3 text-white" />
                                    </button>
                                  </div>
                                  <h4 className={`text-sm font-medium line-clamp-1 ${conv.id === activeConversationId ? 'text-white' : 'text-zinc-300'
                                    }`}>
                                    {conv.title || 'Untitled Chat'}
                                  </h4>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteChat(conv.id, e)}
                                  className="Btn opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 scale-75 origin-right"
                                  title="Delete"
                                >
                                  <div className="sign">
                                    <Trash2 className="w-4 h-4" />
                                  </div>
                                  <div className="text">Delete</div>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Terminal Content */}
            <div className="flex-1">
              <Terminal
                history={history}
                isLoading={isLoading}
                onCommand={executeCommand}
                inputValue={inputValue}
                onInputChange={setInputValue}
                currentPath={currentPath}
                isAgentConnected={isAgentConnected}
                awaitingConfirmation={awaitingConfirmation}
                suggestions={suggestions}
                onSuggestionClick={onSuggestionClick}
                somaService={somaService.current}
                onAutocompleteResult={handleAutocompleteResult}
                somaResponseText={somaResponseText}
                activeDirective={directive}
                onPulseClick={hidePulse ? undefined : () => setShowPulseConfirm(true)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SomaCT;
