// somaBackend.js - SOMA Backend Connection Manager
// Manages WebSocket connection to SOMA backend server

class SomaBackend {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isConnecting = false;
    this.connectionState = 'disconnected'; // disconnected, health_check, connecting, connected, error
    const httpProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const httpHost = import.meta.env?.VITE_HTTP_HOST || window.location.hostname || 'localhost';
    const httpPort = import.meta.env?.VITE_HTTP_PORT || '3001';
    const defaultHttpBase = `${httpProtocol}//${httpHost}:${httpPort}`;
    
    // In development, use relative paths to leverage Vite's proxy for both HTTP and WS
    // This avoids CORS issues and ensures consistency
    this.baseUrl = import.meta.env?.VITE_SOMA_HTTP || (import.meta.env?.DEV ? '' : defaultHttpBase);

    // WebSocket URL - relative to current host if possible
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    this.wsUrl = import.meta.env?.VITE_SOMA_WS || import.meta.env?.VITE_WS_URL || (import.meta.env?.DEV ? wsUrl : `${wsProtocol}//${httpHost}:${httpPort}/ws`);

    console.log('[SomaBackend] Initialized with WebSocket URL:', this.wsUrl);
  }

  // Connection state tracking
  _setConnectionState(state, details = null) {
    const oldState = this.connectionState;
    this.connectionState = state;
    console.log(`[SomaBackend] Connection state: ${oldState} -> ${state}`, details || '');
    this.emit('connectionStateChange', { state, oldState, details, timestamp: Date.now() });
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  // Connect to SOMA backend
  async connect() {
    // Allow reconnection if WebSocket is closed
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log('[SomaBackend] Already connecting...');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[SomaBackend] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[SomaBackend] Connection in progress...');
      return;
    }

    this.isConnecting = true;
    this._setConnectionState('health_check');
    console.log('[SomaBackend] 🚀 Connecting to SOMA server...');
    console.log('[SomaBackend] Base URL:', this.baseUrl);
    console.log('[SomaBackend] WebSocket URL:', this.wsUrl);

    try {
      // Try REST API first
      console.log('[SomaBackend] 🏥 Testing health endpoint:', `${this.baseUrl}/health`);
      const response = await fetch(`${this.baseUrl}/health`);
      console.log('[SomaBackend] 📡 Health response status:', response.status, response.statusText);

      if (!response.ok) {
        this._setConnectionState('error', `Health check failed: ${response.status}`);
        throw new Error(`Backend not available (status ${response.status})`);
      }

      const healthData = await response.json();
      if (healthData && healthData.status && healthData.status !== 'healthy') {
        console.warn('[SomaBackend] ⏳ Backend is still initializing - connecting anyway');
      }
      console.log('[SomaBackend] ✅ Health check passed:', healthData);

      // Connect WebSocket
      this._setConnectionState('connecting');
      console.log('[SomaBackend] 🔌 Creating WebSocket connection...');
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[SomaBackend] ✅ Connected to SOMA backend');
        this._setConnectionState('connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connect', { timestamp: Date.now() });
        this.startPolling();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SomaBackend] 📩 Received message:', data.type, data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[SomaBackend] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[SomaBackend] WebSocket error:', error);
        this._setConnectionState('error', 'WebSocket error');
        this.emit('error', { message: 'WebSocket error', error });
      };

      this.ws.onclose = (event) => {
        console.log('[SomaBackend] Disconnected from SOMA backend, code:', event.code);
        this._setConnectionState('disconnected', `Code: ${event.code}`);
        this.isConnecting = false;
        this.emit('disconnect', { timestamp: Date.now() });
        this.stopPolling();
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('[SomaBackend] Failed to connect:', error);
      this._setConnectionState('error', error.message);
      this.isConnecting = false;
      this.emit('error', { message: 'Connection failed', error: error.message });
      this.attemptReconnect();
    }
  }

  // Handle incoming WebSocket messages
  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'init':
        // Initial connection message with agents, brainStats, memory
        console.log('[SomaBackend] Processing init message:', data.data);
        this.emit('init', data.data || {});

        // Emit agents if present
        if (data.data?.agents && data.data.agents.length > 0) {
          console.log('[SomaBackend] Init contains agents:', data.data.agents.length);
          this.emit('agents', { arbiters: data.data.agents });
        }

        // Emit brainStats via metrics if present
        if (data.data?.brainStats) {
          console.log('[SomaBackend] Init contains brainStats');
          this.emit('metrics', { brainStats: data.data.brainStats });
        }

        // Emit memory if present
        if (data.data?.memory) {
          this.emit('memory', data.data.memory);
        }
        break;
      case 'metrics':
        this.emit('metrics', payload);
        break;
      case 'pulse':
        this.emit('pulse', payload);
        break;
      case 'agents':
        this.emit('agents', payload);
        break;
      case 'agent_spawned':
        // New agent spawned - refresh agents list
        this.fetchAgents();
        break;
      case 'agent_terminated':
        // Agent terminated - refresh agents list
        this.fetchAgents();
        break;
      case 'cache':
        this.emit('cache', payload);
        break;
      case 'status':
        this.emit('status', payload);
        break;
      case 'update':
        this.emit('update', payload);
        break;
      case 'chat_response':
        this.emit('chat_response', data.data);
        break;
      case 'log':
        this.emit('log', payload);
        break;
      case 'diagnostic_log':
        this.emit('diagnostic_log', payload);
        break;
      case 'diagnostic_result':
        this.emit('diagnostic_result', payload);
        break;
      case 'command_result':
        this.emit('command_result', payload);
        break;
      case 'agent_result':
        this.emit('agent_result', payload);
        break;
      case 'tool_result':
        this.emit('tool_result', payload);
        break;
      case 'trace':
        this.emit('trace', payload);
        break;
      default:
        console.log('[SomaBackend] Unknown message type:', type);
    }
  }

  async fetchAgents() {
    try {
      const data = await this.getArbiters();
      if (data && data.population) {
        this.emit('agents', { arbiters: data.population });
      }
    } catch (error) {
      console.error('[SomaBackend] Failed to fetch agents:', error);
    }
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SomaBackend] Max reconnect attempts reached');
      this.emit('error', { message: 'Max reconnect attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    console.log(`[SomaBackend] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  // Start polling REST API for updates (Fallback only)
  startPolling() {
    if (this.pollingInterval) return;

    // We only poll if the WebSocket is NOT open
    console.log('[SomaBackend] Initializing health polling fallback...');

    this.pollingInterval = setInterval(async () => {
      // If WebSocket is open, we don't need to poll
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return;
      }

      // Safety check: if WebSocket is closed for > 30 seconds, stop polling to save resources
      const timeSinceDisconnect = Date.now() - (this.lastDisconnectTime || 0);
      if (this.lastDisconnectTime && timeSinceDisconnect > 30000) {
        console.log('[SomaBackend] 🛑 Stopping polling due to persistent disconnection');
        this.stopPolling();
        return;
      }

      try {
        // Fallback status check
        const statusRes = await fetch(`${this.baseUrl}/api/status`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          // Only emit if still disconnected (to prevent race conditions)
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.emit('metrics', {
              uptime: status.uptime || 0,
              arbiters: status.arbiters || []
            });
          }
        }
      } catch (error) {
        // Silently fail
      }
    }, 5000); // Slower polling for fallback
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[SomaBackend] Polling stopped');
    }
  }

  // Disconnect from backend
  disconnect() {
    console.log('[SomaBackend] Disconnecting...');
    this.stopPolling();
    this.lastDisconnectTime = Date.now();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // DON'T prevent auto-reconnect in dev mode (for React Strict Mode)
    // this.reconnectAttempts = this.maxReconnectAttempts;
    this.isConnecting = false; // Reset connecting flag
    this.emit('disconnect', { timestamp: Date.now() });
  }

  // Send message to backend
  send(type, payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[SomaBackend] Cannot send message - not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    } catch (error) {
      console.error('[SomaBackend] Failed to send message:', error);
      return false;
    }
  }

  // REST API methods
  async fetch(endpoint, options = {}) {
    // Circuit breaker: fail fast if we know we are offline to save browser resources
    if (this.ws && this.ws.readyState === WebSocket.CLOSED) {
      // Allow /health and /api/status checks to pass through for reconnection attempts
      if (!endpoint.includes('/health') && !endpoint.includes('/status')) {
        throw new Error('Circuit Breaker: Backend is offline');
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[SomaBackend] Fetch error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Convenience methods
  async getStatus() {
    return this.fetch('/api/status');
  }

  async getMemoryStatus() {
    return this.fetch('/api/memory/status');
  }

  async getArbiters() {
    return this.fetch('/api/population');
  }

  async spawnArbiter(config) {
    return this.fetch('/api/arbiter/spawn', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async terminateArbiter(arbiterId) {
    return this.fetch('/api/arbiter/terminate', {
      method: 'POST',
      body: JSON.stringify({ arbiterId })
    });
  }

  async sendChat(message, context = {}) {
    return this.fetch('/api/soma/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...context })
    });
  }
}

// Create singleton instance
const somaBackend = new SomaBackend();

export default somaBackend;
