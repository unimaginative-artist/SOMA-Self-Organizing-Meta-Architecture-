/**
 * QuadBrainClient - Access SOMA's 4-hemisphere reasoning system
 * LOGOS (Analytical), AURORA (Creative), PROMETHEUS (Strategic), THALAMUS (Guardian)
 */

export type Hemisphere = 'LOGOS' | 'AURORA' | 'PROMETHEUS' | 'THALAMUS';

export interface HemisphereConfig {
  name: Hemisphere;
  description: string;
  color: string;
  icon: string;
  temperature: number;
  specialty: string;
}

export const HEMISPHERES: Record<Hemisphere, HemisphereConfig> = {
  LOGOS: {
    name: 'LOGOS',
    description: 'Analytical & Precise',
    color: 'blue',
    icon: '🔬',
    temperature: 0.2,
    specialty: 'Bug detection, code analysis, debugging'
  },
  AURORA: {
    name: 'AURORA',
    description: 'Creative & Innovative',
    color: 'purple',
    icon: '✨',
    temperature: 0.9,
    specialty: 'Novel solutions, architecture ideas, refactoring'
  },
  PROMETHEUS: {
    name: 'PROMETHEUS',
    description: 'Strategic & Long-term',
    color: 'orange',
    icon: '🎯',
    temperature: 0.3,
    specialty: 'Scalability, planning, system design'
  },
  THALAMUS: {
    name: 'THALAMUS',
    description: 'Guardian & Validator',
    color: 'red',
    icon: '🛡️',
    temperature: 0.0,
    specialty: 'Security, safety, validation, best practices'
  }
};

export interface HemisphereResponse {
  hemisphere: Hemisphere;
  response: string;
  confidence: number;
  timestamp: number;
}

export interface MultiPerspectiveResponse {
  unified?: string;
  perspectives: HemisphereResponse[];
  consensus?: string;
  conflicts?: string[];
}

export class QuadBrainClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl = '/api/quadbrain', timeoutMs = 30000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  private async call<T = any>(endpoint: string, body: any): Promise<T> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as T;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Query a single hemisphere
   */
  async queryHemisphere(hemisphere: Hemisphere, message: string, context?: any): Promise<HemisphereResponse> {
    return this.call('/query', {
      hemisphere,
      message,
      context,
      temperature: HEMISPHERES[hemisphere].temperature
    });
  }

  /**
   * Query all 4 hemispheres in parallel for multi-perspective analysis
   */
  async queryAllHemispheres(message: string, context?: any): Promise<MultiPerspectiveResponse> {
    try {
      const perspectives = await Promise.all(
        Object.keys(HEMISPHERES).map(h => 
          this.queryHemisphere(h as Hemisphere, message, context)
        )
      );

      return {
        perspectives,
        unified: undefined, // Will be populated by backend if available
        consensus: this.extractConsensus(perspectives),
        conflicts: this.detectConflicts(perspectives)
      };
    } catch (error) {
      console.error('Quad-Brain query failed:', error);
      throw error;
    }
  }

  /**
   * Get code review from all 4 perspectives
   */
  async getMultiPerspectiveReview(code: string): Promise<MultiPerspectiveResponse> {
    const context = { type: 'code_review', code };
    
    const [analytical, creative, strategic, security] = await Promise.all([
      this.queryHemisphere('LOGOS', `Analyze this code for bugs and issues:\n${code}`, context),
      this.queryHemisphere('AURORA', `Suggest creative improvements and refactoring:\n${code}`, context),
      this.queryHemisphere('PROMETHEUS', `Evaluate scalability and long-term maintainability:\n${code}`, context),
      this.queryHemisphere('THALAMUS', `Security audit and validation:\n${code}`, context)
    ]);

    return {
      perspectives: [analytical, creative, strategic, security],
      consensus: this.extractConsensus([analytical, creative, strategic, security]),
      conflicts: this.detectConflicts([analytical, creative, strategic, security])
    };
  }

  /**
   * Extract common themes across hemispheres
   */
  private extractConsensus(perspectives: HemisphereResponse[]): string {
    // Simple consensus: find common words/themes
    // In production, this would use more sophisticated NLP
    const commonThemes = perspectives
      .map(p => p.response.toLowerCase())
      .join(' ')
      .split(/\W+/)
      .filter(word => word.length > 5);

    const frequency: Record<string, number> = {};
    commonThemes.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    const consensusWords = Object.entries(frequency)
      .filter(([_, count]) => count >= 2)
      .map(([word]) => word);

    return consensusWords.length > 0
      ? `Common themes: ${consensusWords.slice(0, 5).join(', ')}`
      : 'No strong consensus detected';
  }

  /**
   * Detect conflicting recommendations
   */
  private detectConflicts(perspectives: HemisphereResponse[]): string[] {
    const conflicts: string[] = [];
    
    // Check if AURORA (creative) conflicts with THALAMUS (guardian)
    const creative = perspectives.find(p => p.hemisphere === 'AURORA');
    const guardian = perspectives.find(p => p.hemisphere === 'THALAMUS');
    
    if (creative && guardian) {
      // Simple heuristic: if guardian mentions "risk" or "unsafe" and creative suggests changes
      if (guardian.response.toLowerCase().includes('risk') || 
          guardian.response.toLowerCase().includes('unsafe')) {
        conflicts.push('Security concerns may limit creative suggestions');
      }
    }

    return conflicts;
  }

  /**
   * Get best hemisphere for a specific task type
   */
  getBestHemisphere(taskType: 'debug' | 'design' | 'plan' | 'secure'): Hemisphere {
    const mapping = {
      debug: 'LOGOS',
      design: 'AURORA',
      plan: 'PROMETHEUS',
      secure: 'THALAMUS'
    };
    return mapping[taskType] as Hemisphere;
  }
}
