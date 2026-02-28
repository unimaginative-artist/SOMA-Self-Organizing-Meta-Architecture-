import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Maximize2, Minimize2, Volume2, VolumeX, Brain, Code, MessageCircle } from 'lucide-react';
import Orb from './Orb';
import orbVoiceService from './OrbVoiceService';
import ReasoningTree from './ReasoningTree';
import EmotionIndicator from './EmotionIndicator';
import '../styles/orb.css';

/**
 * OrbWidget - Beautiful floating orb widget with voice interaction
 * Features:
 * - Draggable positioning with localStorage persistence
 * - Expandable/collapsible states
 * - Voice recognition and TTS
 * - Real-time volume visualization
 * - Beautiful animations and effects
 */
const OrbWidget = () => {
  // Position and layout state
  const [orbExpanded, setOrbExpanded] = useState(false);
  const [orbPosition, setOrbPosition] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('orbPosition');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      x: window.innerWidth - 250,
      y: window.innerHeight - 250
    };
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [lastTranscript, setLastTranscript] = useState('');
  const [muted, setMuted] = useState(false);

  // UI state
  const [showError, setShowError] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle', 'listening', 'thinking', 'talking', 'error'
  
  // Response data for expanded view
  const [responseData, setResponseData] = useState(null); // { text, tree, mode, arbiters, confidence }
  
  // Conversation history
  const [conversationHistory, setConversationHistory] = useState([]);
  
  // Response cache for quick replies
  const responseCacheRef = useRef(new Map());

  // Refs
  const widgetRef = useRef(null);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('orbPosition', JSON.stringify(orbPosition));
  }, [orbPosition]);

  // Initialize voice service callbacks
  useEffect(() => {
    orbVoiceService.onVolumeChange = (vol) => {
      setVolume(vol);
    };

    orbVoiceService.onTranscript = handleTranscript;

    orbVoiceService.onError = (error) => {
      console.error('[OrbWidget] Voice error:', error);
      setShowError(error.message);
      setStatus('error');
      setIsListening(false);
      setIsThinking(false);
      setIsTalking(false);

      // Clear error after 5 seconds
      setTimeout(() => setShowError(null), 5000);
    };

    return () => {
      orbVoiceService.stopListening();
    };
  }, []);

  // Detect command type for smart routing
  const detectCommandType = (query) => {
    const lowerQuery = query.toLowerCase().trim();
    
    // Simple chat patterns (greetings, status checks, etc.)
    const simpleChatPatterns = [
      /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/,
      /^(how are you|what's up|sup|wassup)\b/,
      /^(who are you|what are you|tell me about yourself)\b/,
      /^(thanks|thank you|thx)\b/,
      /^(bye|goodbye|see you|later)\b/,
      /^(yes|no|ok|okay|sure)$/,
      /^(what can you do|help|what are your capabilities)\b/,
      /^(are you there|are you online|can you hear me)\b/,
      /^(test|testing)$/
    ];
    
    if (simpleChatPatterns.some(p => p.test(lowerQuery))) {
      return 'chat';
    }
    
    // Natural language coding patterns
    const codingPatterns = [
      /(write|create|make|build|generate|implement|add|develop).*?(function|class|component|method|module|api|endpoint|interface|type|hook|service)/,
      /(refactor|optimize|improve|fix|debug|update|modify|change).*?(code|function|class|component)/,
      /(test|unit test|integration test).*?(for|the)/,
      /^\/(code|analyze|test|refactor|explain|shell)\b/,
    ];
    
    if (codingPatterns.some(p => p.test(lowerQuery))) {
      return 'code';
    }
    
    // Complex reasoning (default)
    return 'reasoning';
  };
  
  // Parse @filename context injections
  const parseContextInjections = async (query) => {
    const filePattern = /@([\w\/.\-]+)/g;
    const matches = [...query.matchAll(filePattern)];
    
    if (matches.length === 0) {
      return { query, context: [] };
    }
    
    const context = [];
    for (const match of matches) {
      const filename = match[1];
      try {
        const response = await fetch('/api/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filename })
        });
        
        if (response.ok) {
          const data = await response.json();
          context.push({ file: filename, content: data.content });
        }
      } catch (error) {
        console.warn(`Failed to load file ${filename}:`, error);
      }
    }
    
    return { query, context };
  };
  
  // Simple chat handler (no multi-arbiter reasoning)
  const handleSimpleChat = async (query) => {
    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    if (responseCacheRef.current.has(cacheKey)) {
      console.log('[OrbWidget] Using cached response');
      return responseCacheRef.current.get(cacheKey);
    }
    
    const responses = {
      greeting: "Hello! I'm SOMA, your intelligent assistant. How can I help you today?",
      status: "I'm online and ready to assist you with reasoning, coding, and more!",
      identity: "I'm SOMA - a multi-arbiter AI system with advanced reasoning capabilities.",
      thanks: "You're welcome! Let me know if you need anything else.",
      goodbye: "Goodbye! Feel free to come back anytime.",
      capabilities: "I can help with complex reasoning, code generation, debugging, and natural conversations. Try asking me anything!",
      confirmation: "Got it!",
      test: "System operational. All arbiters online."
    };
    
    const lowerQuery = query.toLowerCase().trim();
    let response = responses.greeting;
    
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/.test(lowerQuery)) {
      response = responses.greeting;
    } else if (/^(how are you|what's up|sup|wassup)\b/.test(lowerQuery)) {
      response = responses.status;
    } else if (/^(who are you|what are you|tell me about yourself)\b/.test(lowerQuery)) {
      response = responses.identity;
    } else if (/^(thanks|thank you|thx)\b/.test(lowerQuery)) {
      response = responses.thanks;
    } else if (/^(bye|goodbye|see you|later)\b/.test(lowerQuery)) {
      response = responses.goodbye;
    } else if (/^(what can you do|help|what are your capabilities)\b/.test(lowerQuery)) {
      response = responses.capabilities;
    } else if (/^(are you there|are you online|can you hear me)\b/.test(lowerQuery)) {
      response = responses.status;
    } else if (/^(yes|no|ok|okay|sure)$/.test(lowerQuery)) {
      response = responses.confirmation;
    } else if (/^(test|testing)$/.test(lowerQuery)) {
      response = responses.test;
    }
    
    const result = { text: response, mode: 'chat' };
    
    // Cache the response
    responseCacheRef.current.set(cacheKey, result);
    
    return result;
  };
  
  // Reasoning handler (multi-arbiter)
  const handleReasoning = async (query, context) => {
    const response = await fetch('/api/reason', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context })
    });
    
    if (!response.ok) {
      throw new Error(`SOMA API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      text: data.response || data.text || 'Reasoning complete.',
      tree: data.tree,
      arbiters: data.arbiters,
      confidence: data.confidence,
      mode: 'reasoning'
    };
  };
  
  // Code task handler
  const handleCodeTask = async (query, context) => {
    const response = await fetch('/api/code/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: query, context })
    });
    
    if (!response.ok) {
      throw new Error(`SOMA API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      text: data.response || data.code || 'Code task complete.',
      code: data.code,
      tests: data.tests,
      explanation: data.explanation,
      mode: 'code'
    };
  };
  
  // Handle voice transcript with smart routing
  const handleTranscript = async (text, confidence) => {
    console.log('[OrbWidget] Transcript received:', text);
    setLastTranscript(text);
    setIsListening(false);
    setIsThinking(true);
    setStatus('thinking');

    try {
      // Parse context injections
      const { query, context } = await parseContextInjections(text);
      
      // Add conversation history to context
      const enhancedContext = {
        ...context,
        conversationHistory: conversationHistory.slice(-5) // Last 5 exchanges
      };
      
      // Detect command type
      const commandType = detectCommandType(query);
      console.log('[OrbWidget] Command type:', commandType);
      
      let result;
      
      // Route to appropriate handler
      if (commandType === 'chat') {
        result = await handleSimpleChat(query);
      } else if (commandType === 'code') {
        result = await handleCodeTask(query, enhancedContext);
      } else {
        result = await handleReasoning(query, enhancedContext);
      }
      
      // Store response data for expanded view
      setResponseData(result);
      
      // Add to conversation history
      setConversationHistory(prev => [...prev, {
        timestamp: Date.now(),
        user: text,
        assistant: result.text,
        mode: result.mode
      }]);
      
      const replyText = result.text || 'I received your message.';

      setIsThinking(false);
      setIsTalking(true);
      setStatus('talking');

      // Speak the response
      if (!muted) {
        await orbVoiceService.speak(replyText);
      }

      setIsTalking(false);
      setStatus('idle');

    } catch (error) {
      console.error('[OrbWidget] Query failed:', error);
      setShowError(`Failed to process query: ${error.message}`);
      setIsThinking(false);
      setStatus('error');

      // Speak error message
      if (!muted) {
        await orbVoiceService.speak('Sorry, I encountered an error processing your request.');
      }
    }
  };

  // Toggle listening
  const toggleListening = async () => {
    if (isListening) {
      orbVoiceService.stopListening();
      setIsListening(false);
      setStatus('idle');
    } else {
      try {
        await orbVoiceService.startListening();
        setIsListening(true);
        setStatus('listening');
        setShowError(null);
      } catch (error) {
        console.error('[OrbWidget] Failed to start listening:', error);
        setShowError('Failed to start voice recognition. Please check microphone permissions.');
        setStatus('error');
      }
    }
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.orb-controls')) return; // Don't drag when clicking controls
    if (orbExpanded) return; // Don't drag when expanded

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - orbPosition.x,
      y: e.clientY - orbPosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep within bounds
    const maxX = window.innerWidth - (orbExpanded ? 400 : 200);
    const maxY = window.innerHeight - (orbExpanded ? 600 : 200);

    setOrbPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Toggle expanded state
  const toggleExpanded = () => {
    if (!orbExpanded && !isDragging) {
      setOrbExpanded(true);
    }
  };

  const collapse = () => {
    setOrbExpanded(false);
  };

  // Get status label and color
  const getStatusInfo = () => {
    switch (status) {
      case 'listening':
        return { label: 'Listening...', color: 'text-blue-400' };
      case 'thinking':
        return { label: 'Thinking...', color: 'text-amber-400' };
      case 'talking':
        return { label: 'Speaking...', color: 'text-fuchsia-400' };
      case 'error':
        return { label: 'Error', color: 'text-red-400' };
      default:
        return { label: 'Idle', color: 'text-gray-400' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      ref={widgetRef}
      className={`orb-widget ${orbExpanded ? 'expanded' : ''}`}
      style={{
        left: orbPosition.x,
        top: orbPosition.y,
        width: orbExpanded ? '800px' : '200px', // Wider for split view
        height: orbExpanded ? '650px' : '200px',
        cursor: isDragging ? 'grabbing' : orbExpanded ? 'default' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onClick={!isDragging ? toggleExpanded : undefined}
    >
      {/* Main Orb Visualization */}
      <div className="relative flex items-center justify-center h-full pointer-events-none">
        <Orb
          volume={volume}
          isActive={status !== 'idle' && status !== 'error'}
          isTalking={isTalking}
          isListening={isListening}
          isThinking={isThinking}
        />

        {/* Status Indicator */}
        {!orbExpanded && status !== 'idle' && (
          <div className={`orb-indicator ${status}`}>
            {statusInfo.label}
          </div>
        )}
      </div>

      {/* Expanded Split View */}
      {orbExpanded && (
        <div className="absolute inset-0 flex pointer-events-auto bg-[#0a0a0f]/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {/* Left Side: Chat History Sidebar */}
          <div className="w-72 border-r border-white/10 flex flex-col bg-[#12121a]/50">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Conversation</h3>
              <p className="text-xs text-zinc-500 mt-1">{conversationHistory.length} messages</p>
            </div>
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {conversationHistory.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm mt-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation!</p>
                </div>
              ) : (
                conversationHistory.map((msg, idx) => (
                  <div key={idx} className="space-y-2">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-blue-600/20 border border-blue-500/30 rounded-lg rounded-tr-none px-3 py-2">
                        <p className="text-xs text-blue-300 font-medium mb-1">You</p>
                        <p className="text-sm text-zinc-200">{msg.user}</p>
                      </div>
                    </div>
                    
                    {/* Assistant Message */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-purple-600/20 border border-purple-500/30 rounded-lg rounded-tl-none px-3 py-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-xs text-purple-300 font-medium">SOMA</p>
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            msg.mode === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                            msg.mode === 'code' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-fuchsia-500/20 text-fuchsia-400'
                          }`}>{msg.mode}</span>
                        </div>
                        <p className="text-sm text-zinc-200">{msg.assistant.substring(0, 100)}{msg.assistant.length > 100 ? '...' : ''}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Clear History Button */}
            {conversationHistory.length > 0 && (
              <div className="p-3 border-t border-white/10">
                <button
                  onClick={() => setConversationHistory([])}
                  className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Clear History
                </button>
              </div>
            )}

            {/* Emotion Indicator - LIVE DATA! */}
            <div className="p-3 border-t border-white/10">
              <EmotionIndicator
                isTalking={isTalking}
                isThinking={isThinking}
                isConnected={true}
              />
            </div>
          </div>
          
          {/* Right Side: Main Interaction Area */}
          <div className="flex-1 flex flex-col">
            {/* Orb Visualization (Smaller) */}
            <div className="relative flex items-center justify-center h-48 pointer-events-none">
              <div style={{ transform: 'scale(0.5)' }}>
                <Orb
                  volume={volume}
                  isActive={status !== 'idle' && status !== 'error'}
                  isTalking={isTalking}
                  isListening={isListening}
                  isThinking={isThinking}
                />
              </div>
            </div>
            
            {/* Controls Area */}
            <div className="flex-1 overflow-y-auto p-5">
          {/* Status Display */}
          <div className="mb-4 text-center">
            <div className={`text-lg font-semibold ${statusInfo.color} mb-2`}>
              {statusInfo.label}
            </div>
            {lastTranscript && (
              <div className="text-sm text-gray-400 italic mb-2">
                "{lastTranscript}"
              </div>
            )}
            {showError && (
              <div className="mt-2 text-sm text-red-400 bg-red-900 bg-opacity-20 rounded-lg p-2 border border-red-500 border-opacity-30">
                {showError}
              </div>
            )}
          </div>
          
          {/* Response Display */}
          {responseData && status === 'idle' && (
            <div className="mb-4 max-h-64 overflow-y-auto">
              {/* Mode Badge */}
              <div className="flex items-center justify-center space-x-2 mb-3">
                {responseData.mode === 'chat' && (
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-semibold border border-blue-500/20">
                    <MessageCircle className="w-3 h-3" />
                    <span>CHAT</span>
                  </div>
                )}
                {responseData.mode === 'code' && (
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-semibold border border-purple-500/20">
                    <Code className="w-3 h-3" />
                    <span>CODE</span>
                  </div>
                )}
                {responseData.mode === 'reasoning' && (
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-full text-xs font-semibold border border-fuchsia-500/20">
                    <Brain className="w-3 h-3" />
                    <span>REASONING</span>
                  </div>
                )}
              </div>
              
              {/* Response Text */}
              <div className="text-sm text-gray-300 bg-gray-900 bg-opacity-30 rounded-lg p-3 border border-gray-700">
                {responseData.text}
              </div>
              
              {/* Reasoning Tree */}
              {responseData.tree && (
                <div className="mt-3 text-left">
                  <ReasoningTree tree={responseData.tree} />
                </div>
              )}
              
              {/* Code Display */}
              {responseData.code && (
                <div className="mt-3">
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Generated Code</div>
                  <pre className="text-xs bg-gray-900 bg-opacity-50 rounded-lg p-3 border border-gray-700 overflow-x-auto">
                    <code>{responseData.code}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Voice Controls */}
          <div className="space-y-3">
            {/* Mic Button */}
            <button
              onClick={toggleListening}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span>{isListening ? 'Stop Listening' : 'Start Voice'}</span>
            </button>

            {/* Mute Toggle */}
            <button
              onClick={() => setMuted(!muted)}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors flex items-center justify-center space-x-2"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{muted ? 'Unmute Voice' : 'Mute Voice'}</span>
            </button>

            {/* Browser Support Notice */}
            {!orbVoiceService.constructor.isRecognitionSupported() && (
              <div className="text-xs text-yellow-400 text-center bg-yellow-900 bg-opacity-20 rounded p-2">
                Voice recognition requires Chrome or Edge browser
              </div>
            )}
          </div>

            {/* Collapse Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                collapse();
              }}
              className="w-full mt-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Minimize</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Expand hint for collapsed state */}
      {!orbExpanded && !isDragging && status === 'idle' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 pointer-events-none">
          Click to expand
        </div>
      )}
    </div>
  );
};

export default OrbWidget;
