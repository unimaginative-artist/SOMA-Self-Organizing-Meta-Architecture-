/**
 * Server Monitor Service
 * 
 * Monitors server processes, logs, and system health.
 * Automatically notifies Steve when interesting events occur.
 */

export interface ServerProcess {
  pid: number;
  name: string;
  port?: number;
  status: 'starting' | 'running' | 'stopping' | 'crashed' | 'healthy';
  uptime?: number;
  cpu?: number;
  memory?: number;
  lastLog?: string;
  errors?: string[];
}

export interface MonitorEvent {
  type: 'server_started' | 'server_crashed' | 'error_detected' | 'performance_issue' | 'log_message' | 'port_conflict' | 'health_check';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  message: string;
  process?: ServerProcess;
  details?: any;
  shouldNotify: boolean;
}

type EventCallback = (event: MonitorEvent) => void;

class ServerMonitorService {
  private monitoredProcesses = new Map<string, ServerProcess>();
  private eventCallbacks: Set<EventCallback> = new Set();
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private logBuffer: string[] = [];
  private readonly MAX_LOG_BUFFER = 100;

  // Known server patterns
  private readonly SERVER_PATTERNS = [
    { name: 'SOMA Backend', pattern: /soma-server\.js|soma-server\.cjs/, port: 3001 },
    { name: 'Vite Dev Server', pattern: /vite/, port: 5173 },
    { name: 'Electron', pattern: /electron/, port: null },
    { name: 'Node Server', pattern: /node.*server/, port: null },
    { name: 'React Dev', pattern: /react-scripts/, port: 3000 }
  ];

  /**
   * Start monitoring server processes
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[ServerMonitor] 🔍 Starting server monitoring...');

    // Check every 3 seconds
    this.checkInterval = setInterval(() => {
      this.checkProcesses();
    }, 3000);

    // Initial check
    this.checkProcesses();

    this.notifyEvent({
      type: 'health_check',
      severity: 'info',
      timestamp: Date.now(),
      message: 'Steve is now monitoring your servers 👀',
      shouldNotify: true
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('[ServerMonitor] Stopped monitoring');
  }

  /**
   * Subscribe to monitor events
   */
  onEvent(callback: EventCallback) {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Manually log a message (can be called from elsewhere)
   */
  logMessage(source: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    this.logBuffer.push(`[${source}] ${message}`);
    if (this.logBuffer.length > this.MAX_LOG_BUFFER) {
      this.logBuffer.shift();
    }

    // Detect important patterns
    const lowerMsg = message.toLowerCase();
    
    // Server started
    if (lowerMsg.includes('listening') || lowerMsg.includes('started on') || lowerMsg.includes('running on')) {
      const portMatch = message.match(/(?:port|:)\s*(\d+)/);
      this.notifyEvent({
        type: 'server_started',
        severity: 'info',
        timestamp: Date.now(),
        message: `✅ ${source} is up and running${portMatch ? ` on port ${portMatch[1]}` : ''}`,
        details: { port: portMatch ? parseInt(portMatch[1]) : null },
        shouldNotify: true
      });
    }

    // Errors (but filter out noise)
    if (lowerMsg.includes('error') || lowerMsg.includes('failed') || lowerMsg.includes('exception')) {
      // Skip benign errors
      const skipPatterns = [
        'previewanalysis',
        'failed to load resource',
        'cors',
        'net::err',
        'empty object',
        '{}'
      ];
      
      const shouldSkip = skipPatterns.some(pattern => lowerMsg.includes(pattern));
      
      if (!shouldSkip) {
        this.notifyEvent({
          type: 'error_detected',
          severity: level === 'error' ? 'error' : 'warning',
          timestamp: Date.now(),
          message: `⚠️ ${source}: ${message.slice(0, 100)}...`,
          details: { fullMessage: message },
          shouldNotify: true
        });
      }
    }

    // Port conflicts
    if (lowerMsg.includes('eaddrinuse') || lowerMsg.includes('port already in use')) {
      const portMatch = message.match(/\d+/);
      this.notifyEvent({
        type: 'port_conflict',
        severity: 'error',
        timestamp: Date.now(),
        message: `🚫 Port ${portMatch ? portMatch[0] : '???'} is already in use!`,
        details: { port: portMatch ? parseInt(portMatch[0]) : null },
        shouldNotify: true
      });
    }

    // Build/compile success
    if (lowerMsg.includes('compiled successfully') || lowerMsg.includes('build complete')) {
      this.notifyEvent({
        type: 'log_message',
        severity: 'info',
        timestamp: Date.now(),
        message: `✨ Build completed successfully`,
        shouldNotify: false // Don't pop up for this, it's frequent
      });
    }
  }

  /**
   * Check running processes (mock implementation - would use real process checking in production)
   */
  private async checkProcesses() {
    // In a real implementation, this would:
    // 1. Check actual running processes (using child_process or system calls)
    // 2. Parse netstat for port usage
    // 3. Read log files
    // 4. Check CPU/memory usage

    // For now, we'll monitor via events from the app
    // The real magic happens in logMessage() which gets called from various sources

    // Check for process health (mock)
    this.monitoredProcesses.forEach((process, name) => {
      if (process.status === 'running') {
        // Simulate health check
        if (Math.random() < 0.01) { // 1% chance of detecting an issue
          this.notifyEvent({
            type: 'performance_issue',
            severity: 'warning',
            timestamp: Date.now(),
            message: `⚡ ${name} seems slow (high CPU/memory usage)`,
            process,
            shouldNotify: false // Don't spam for perf issues
          });
        }
      }
    });
  }

  /**
   * Register a process for monitoring
   */
  registerProcess(name: string, process: Partial<ServerProcess>) {
    const fullProcess: ServerProcess = {
      pid: process.pid || 0,
      name: process.name || name,
      port: process.port,
      status: process.status || 'running',
      uptime: process.uptime || 0,
      cpu: process.cpu || 0,
      memory: process.memory || 0,
      lastLog: process.lastLog,
      errors: process.errors || []
    };

    this.monitoredProcesses.set(name, fullProcess);
  }

  /**
   * Update process status
   */
  updateProcessStatus(name: string, updates: Partial<ServerProcess>) {
    const existing = this.monitoredProcesses.get(name);
    if (existing) {
      Object.assign(existing, updates);

      // Notify on status changes
      if (updates.status === 'crashed') {
        this.notifyEvent({
          type: 'server_crashed',
          severity: 'critical',
          timestamp: Date.now(),
          message: `💥 ${name} has crashed!`,
          process: existing,
          shouldNotify: true
        });
      }
    }
  }

  /**
   * Get current process status
   */
  getProcessStatus(name: string): ServerProcess | undefined {
    return this.monitoredProcesses.get(name);
  }

  /**
   * Get all monitored processes
   */
  getAllProcesses(): ServerProcess[] {
    return Array.from(this.monitoredProcesses.values());
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 20): string[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Notify all subscribers of an event
   */
  private notifyEvent(event: MonitorEvent) {
    console.log(`[ServerMonitor] ${event.severity.toUpperCase()}: ${event.message}`);
    
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[ServerMonitor] Error in event callback:', error);
      }
    });
  }

  /**
   * Clear all data
   */
  reset() {
    this.monitoredProcesses.clear();
    this.logBuffer = [];
  }
}

export const serverMonitor = new ServerMonitorService();

// Auto-start monitoring when imported
if (typeof window !== 'undefined') {
  serverMonitor.startMonitoring();
}
