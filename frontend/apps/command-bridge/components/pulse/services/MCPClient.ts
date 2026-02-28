/**
 * MCPClient - Model Context Protocol client for SOMA Dream Arbiter
 * Connects to mcp-server-soma-dreams.js for AI-generated insights
 */

export interface DreamReport {
  path: string;
  timestamp: string;
  summary: {
    id: string;
    fragments_count: number;
    proposals_count: number;
    applied_count: number;
    queued_count: number;
    dream_quality: number;
    elapsed_seconds: number;
  };
}

export interface DreamCycleResult {
  success: boolean;
  dream_id: string;
  fragments_analyzed: number;
  proposals_generated: number;
  proposals_applied: number;
  proposals_queued: number;
  dream_quality: number;
  elapsed_seconds: number;
  error: string | null;
}

export interface DreamStatus {
  name: string;
  state: string;
  running: boolean;
  dream_count: number;
  metrics: {
    tasks_completed: number;
    avg_duration_ms: number;
    success_rate: string;
  };
}

export class MCPClient {
  private baseUrl: string;
  private timeoutMs: number;
  private messageId = 0;

  constructor(baseUrl = '', timeoutMs = 30000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  private async call<T = any>(method: string, params: any = {}): Promise<T> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++this.messageId,
          method,
          params
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'MCP error');
      
      return data.result as T;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Run a dream cycle to analyze recent project activity
   * Returns insights, patterns, and improvement suggestions
   */
  async runDreamCycle(sinceHours = 24, humanReview = true): Promise<DreamCycleResult> {
    return this.call('tools/call', {
      name: 'run_dream_cycle',
      arguments: { since_hours: sinceHours, human_review: humanReview }
    });
  }

  /**
   * Get recent dream reports with AI insights
   */
  async getDreamReports(count = 5): Promise<{ count: number; reports: DreamReport[] }> {
    return this.call('tools/call', {
      name: 'get_dream_reports',
      arguments: { count }
    });
  }

  /**
   * Get current status of dream engine
   */
  async getDreamStatus(): Promise<DreamStatus> {
    return this.call('tools/call', {
      name: 'dream_status',
      arguments: {}
    });
  }

  /**
   * Start automated background dream cycles
   */
  async startBackgroundDreams(intervalHours = 24): Promise<{ status: string; interval_hours: number; message: string }> {
    return this.call('tools/call', {
      name: 'start_background_dreams',
      arguments: { interval_hours: intervalHours }
    });
  }

  /**
   * Stop automated background dream cycles
   */
  async stopBackgroundDreams(): Promise<{ status: string; message: string }> {
    return this.call('tools/call', {
      name: 'stop_background_dreams',
      arguments: {}
    });
  }

  /**
   * Review and apply belief update proposal
   */
  async queueBeliefUpdate(proposalId: string, action: 'approve' | 'reject' | 'revise', confidenceThreshold = 0.8) {
    return this.call('tools/call', {
      name: 'queue_belief_update',
      arguments: { proposal_id: proposalId, action, confidence_threshold: confidenceThreshold }
    });
  }
}
