/**
 * MnemonicClient - Access SOMA's Hybrid Memory System
 * Hot/Warm/Cold tiered memory for project persistence and recall
 */

export interface MemoryItem {
  id: string;
  type: string;
  key: string;
  data: any;
  tier: 'hot' | 'warm' | 'cold';
  metadata: {
    created: number;
    lastAccessed: number;
    accessCount: number;
    tags?: string[];
  };
}

export interface ProjectSnapshot {
  projectName: string;
  blueprint: any[];
  timestamp: number;
  metadata: {
    filesCount: number;
    linesOfCode: number;
    description?: string;
  };
}

export interface SimilarCodeResult {
  code: string;
  similarity: number;
  context: string;
  timestamp: number;
}

export interface MemoryStats {
  hot: { count: number; sizeBytes: number };
  warm: { count: number; sizeBytes: number };
  cold: { count: number; sizeBytes: number };
  total: { count: number; sizeBytes: number };
}

export class MnemonicClient {
  private baseUrl: string;
  private timeoutMs: number;
  private autoSaveInterval: number | null = null;

  constructor(baseUrl = '/api/memory', timeoutMs = 15000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  private async call<T = any>(endpoint: string, body?: any): Promise<T> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        ...(body && { body: JSON.stringify(body) })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as T;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Store project snapshot in memory
   */
  async saveProject(snapshot: ProjectSnapshot): Promise<{ id: string; tier: string }> {
    return this.call('/store', {
      type: 'pulse_project',
      key: snapshot.projectName,
      data: snapshot,
      tier: 'warm',
      metadata: {
        created: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        tags: ['pulse', 'project', snapshot.projectName]
      }
    });
  }

  /**
   * Restore project from memory
   */
  async loadProject(projectName: string): Promise<ProjectSnapshot | null> {
    try {
      const result = await this.call<MemoryItem>('/recall', {
        type: 'pulse_project',
        key: projectName
      });
      return result?.data || null;
    } catch (error) {
      console.warn('Failed to load project from memory:', error);
      return null;
    }
  }

  /**
   * Find similar code snippets from past projects
   */
  async findSimilarCode(code: string, topK = 5): Promise<SimilarCodeResult[]> {
    try {
      return this.call('/search', {
        query: code,
        type: 'pulse_code',
        topK,
        threshold: 0.6
      });
    } catch (error) {
      console.warn('Failed to search similar code:', error);
      return [];
    }
  }

  /**
   * Store code snippet for future reference
   */
  async rememberCode(code: string, context: string, tags: string[] = []): Promise<{ id: string }> {
    return this.call('/store', {
      type: 'pulse_code',
      key: `code_${Date.now()}`,
      data: { code, context },
      tier: 'warm',
      metadata: {
        created: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        tags: ['pulse', 'code', ...tags]
      }
    });
  }

  /**
   * Get project history (all saved snapshots)
   */
  async getProjectHistory(projectName: string, limit = 10): Promise<ProjectSnapshot[]> {
    try {
      const results = await this.call<MemoryItem[]>('/query', {
        type: 'pulse_project',
        filter: { key: projectName },
        limit,
        sortBy: 'created',
        sortOrder: 'desc'
      });
      return results.map(r => r.data);
    } catch (error) {
      console.warn('Failed to get project history:', error);
      return [];
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    try {
      return this.call('/stats');
    } catch (error) {
      console.warn('Failed to get memory stats:', error);
      return {
        hot: { count: 0, sizeBytes: 0 },
        warm: { count: 0, sizeBytes: 0 },
        cold: { count: 0, sizeBytes: 0 },
        total: { count: 0, sizeBytes: 0 }
      };
    }
  }

  /**
   * Get learned patterns for a project
   */
  async getLearnedPatterns(projectName: string): Promise<Array<{ pattern: string; frequency: number; context: string }>> {
    try {
      return this.call('/patterns', {
        domain: projectName,
        type: 'pulse_project'
      });
    } catch (error) {
      console.warn('Failed to get learned patterns:', error);
      return [];
    }
  }

  /**
   * Enable auto-save for a project
   */
  startAutoSave(projectName: string, getSnapshot: () => ProjectSnapshot, intervalMs = 60000) {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = window.setInterval(async () => {
      try {
        const snapshot = getSnapshot();
        await this.saveProject(snapshot);
        console.log(`[Memory] Auto-saved project: ${projectName}`);
      } catch (error) {
        console.error('[Memory] Auto-save failed:', error);
      }
    }, intervalMs);

    console.log(`[Memory] Auto-save enabled for ${projectName} (interval: ${intervalMs}ms)`);
  }

  /**
   * Disable auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('[Memory] Auto-save disabled');
    }
  }

  /**
   * Clear all project memory (use with caution)
   */
  async clearProjectMemory(projectName: string): Promise<{ deleted: number }> {
    return this.call('/delete', {
      type: 'pulse_project',
      key: projectName
    });
  }
}
