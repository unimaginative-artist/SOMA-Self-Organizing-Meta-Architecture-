/**
 * Context Sync Service
 * 
 * Syncs Pulse IDE state with SOMA's main chat so they share unified context.
 * Uses existing WebSocket infrastructure to broadcast state changes.
 */

import { pulseClient } from './pulseClient';

export interface PulseContext {
  // Current state
  currentPlane: 'code' | 'editor' | 'preview' | 'planning';
  activeFile: string | null;
  activeBlueprint: Array<{ path: string; language: string }>;
  
  // Editor state
  editorContent?: string;
  cursorPosition?: { line: number; column: number };
  
  // Session info
  projectName: string;
  workingDirectory: string;
  
  // Metadata
  timestamp: number;
  sessionId: string;
}

class ContextSyncService {
  private sessionId: string;
  private lastSync: number = 0;
  private syncInterval: number = 1000; // Sync max once per second
  private isConnected: boolean = false;

  constructor() {
    this.sessionId = `pulse-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Initialize context sync
   */
  async initialize() {
    try {
      await pulseClient.connectWebSocket();
      this.isConnected = true;
      
      // Listen for context requests from SOMA
      pulseClient.on('context:request', () => {
        console.log('[ContextSync] SOMA requested context');
        this.broadcastContext();
      });

      // Listen for file updates from SOMA
      pulseClient.on('file:updated', (data: any) => {
        console.log('[ContextSync] SOMA updated file:', data.path);
        window.dispatchEvent(new CustomEvent('soma:file-updated', {
          detail: data
        }));
      });

      console.log('[ContextSync] ✅ Context sync initialized');
    } catch (error) {
      console.error('[ContextSync] Failed to initialize:', error);
    }
  }

  /**
   * Shutdown context sync
   */
  shutdown() {
    if (this.isConnected) {
      pulseClient.disconnectWebSocket();
      this.isConnected = false;
    }
  }

  /**
   * Sync Pulse context to SOMA
   */
  syncContext(context: Partial<PulseContext>) {
    // Debounce: don't sync more than once per second
    const now = Date.now();
    if (now - this.lastSync < this.syncInterval) {
      return;
    }

    if (!this.isConnected) {
      console.warn('[ContextSync] Not connected, skipping sync');
      return;
    }

    const fullContext: PulseContext = {
      currentPlane: context.currentPlane || 'code',
      activeFile: context.activeFile || null,
      activeBlueprint: context.activeBlueprint || [],
      projectName: context.projectName || 'Pulse-App',
      workingDirectory: context.workingDirectory || '~/projects',
      timestamp: now,
      sessionId: this.sessionId,
      ...context
    };

    // Broadcast via WebSocket
    const success = pulseClient.sendWebSocketMessage('pulse:context', fullContext);
    
    if (success) {
      this.lastSync = now;
      console.log('[ContextSync] Synced context:', {
        plane: fullContext.currentPlane,
        file: fullContext.activeFile
      });
    }
  }

  /**
   * Broadcast current context (force sync)
   */
  broadcastContext() {
    // Force immediate broadcast
    this.lastSync = 0;
    
    // Get current context from window/global state if available
    const context = (window as any).__PULSE_CONTEXT__;
    if (context) {
      this.syncContext(context);
    }
  }

  /**
   * Notify SOMA that a file was opened in Pulse
   */
  notifyFileOpened(path: string, content: string, language: string) {
    pulseClient.sendWebSocketMessage('pulse:file-opened', {
      path,
      language,
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Notify SOMA that a file was saved in Pulse
   */
  notifyFileSaved(path: string, content: string) {
    pulseClient.sendWebSocketMessage('pulse:file-saved', {
      path,
      length: content.length,
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Notify SOMA about plane switch
   */
  notifyPlaneSwitch(newPlane: string) {
    pulseClient.sendWebSocketMessage('pulse:plane-switch', {
      plane: newPlane,
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Request context from SOMA (what's SOMA currently doing?)
   */
  requestSomaContext() {
    pulseClient.sendWebSocketMessage('context:request-soma', {
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }
}

// Singleton instance
export const contextSync = new ContextSyncService();
