import { pulseClient } from './PulseClient';

export interface PreviewAnnotation {
  id: string;
  type: 'warning' | 'info' | 'suggestion' | 'success';
  message: string;
  selector: string;
  position: { x: number; y: number };
  confidence: number;
  arbiter?: string;
  fix?: {
    action: 'modify_style' | 'modify_content' | 'add_element' | 'remove_element';
    target: string;
    changes: Record<string, any>;
  };
}

export interface AnalysisResult {
  annotations: PreviewAnnotation[];
  overallScore: number;
  issues: {
    accessibility: number;
    performance: number;
    consistency: number;
    bestPractices: number;
  };
}

class PreviewAnalysisService {
  private analysisCache = new Map<string, AnalysisResult>();
  private lastAnalysisTime = 0;
  private readonly THROTTLE_MS = 5000; // Only analyze every 5 seconds

  /**
   * Analyze the preview HTML/CSS/JS and generate annotations
   */
  async analyzePreview(
    html: string,
    css: string,
    js: string,
    iframeDocument?: Document
  ): Promise<AnalysisResult> {
    const cacheKey = this.generateCacheKey(html, css, js);
    
    // Check cache
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    // Throttle analysis
    const now = Date.now();
    if (now - this.lastAnalysisTime < this.THROTTLE_MS) {
      return { annotations: [], overallScore: 100, issues: { accessibility: 0, performance: 0, consistency: 0, bestPractices: 0 } };
    }
    this.lastAnalysisTime = now;

    try {
      // Route through PulseArbiter to analyze preview
      const response = await pulseClient.analyzePreview({
        html,
        css,
        js,
        includeAccessibility: true,
        includePerformance: true,
        includeConsistency: true
      });

      const annotations = this.processAnalysisResponse(response, iframeDocument);
      const result: AnalysisResult = {
        annotations,
        overallScore: response.score || 100,
        issues: response.issues || { accessibility: 0, performance: 0, consistency: 0, bestPractices: 0 }
      };

      // Cache result
      this.analysisCache.set(cacheKey, result);
      
      // Clear old cache entries
      if (this.analysisCache.size > 10) {
        const firstKey = this.analysisCache.keys().next().value;
        this.analysisCache.delete(firstKey);
      }

      return result;
    } catch (error) {
      console.error('[PreviewAnalysis] Error:', error);
      return {
        annotations: [],
        overallScore: 100,
        issues: { accessibility: 0, performance: 0, consistency: 0, bestPractices: 0 }
      };
    }
  }

  /**
   * Analyze specific element context for Steve's contextual responses
   */
  async analyzeElementContext(element: {
    selector: string;
    tagName: string;
    classes: string[];
    styles: Record<string, string>;
    content: string;
  }): Promise<{
    suggestions: string[];
    relatedElements: string[];
    possibleIssues: string[];
  }> {
    try {
      const response = await pulseClient.analyzeElement({
        selector: element.selector,
        tagName: element.tagName,
        classes: element.classes,
        styles: element.styles,
        content: element.content
      });

      return {
        suggestions: response.suggestions || [],
        relatedElements: response.relatedElements || [],
        possibleIssues: response.possibleIssues || []
      };
    } catch (error) {
      console.error('[ElementAnalysis] Error:', error);
      return {
        suggestions: [],
        relatedElements: [],
        possibleIssues: []
      };
    }
  }

  /**
   * Process raw analysis response and convert to annotations
   */
  private processAnalysisResponse(response: any, iframeDocument?: Document): PreviewAnnotation[] {
    const annotations: PreviewAnnotation[] = [];

    // Process accessibility issues
    if (response.accessibility && Array.isArray(response.accessibility)) {
      response.accessibility.forEach((issue: any) => {
        annotations.push({
          id: `a11y-${Date.now()}-${Math.random()}`,
          type: issue.severity === 'critical' ? 'warning' : 'info',
          message: issue.message,
          selector: issue.selector || 'body',
          position: this.getElementPosition(issue.selector, iframeDocument),
          confidence: issue.confidence || 85,
          arbiter: 'CodeObservationArbiter',
          fix: issue.fix
        });
      });
    }

    // Process consistency issues
    if (response.consistency && Array.isArray(response.consistency)) {
      response.consistency.forEach((issue: any) => {
        annotations.push({
          id: `consistency-${Date.now()}-${Math.random()}`,
          type: 'suggestion',
          message: issue.message,
          selector: issue.selector || 'body',
          position: this.getElementPosition(issue.selector, iframeDocument),
          confidence: issue.confidence || 75,
          arbiter: 'ReasoningChamber',
          fix: issue.fix
        });
      });
    }

    // Process performance issues
    if (response.performance && Array.isArray(response.performance)) {
      response.performance.forEach((issue: any) => {
        annotations.push({
          id: `perf-${Date.now()}-${Math.random()}`,
          type: issue.severity === 'high' ? 'warning' : 'info',
          message: issue.message,
          selector: issue.selector || 'body',
          position: this.getElementPosition(issue.selector, iframeDocument),
          confidence: issue.confidence || 80,
          arbiter: 'AdaptiveLearningRouter',
          fix: issue.fix
        });
      });
    }

    // Process best practice suggestions
    if (response.suggestions && Array.isArray(response.suggestions)) {
      response.suggestions.forEach((suggestion: any) => {
        annotations.push({
          id: `suggestion-${Date.now()}-${Math.random()}`,
          type: 'suggestion',
          message: suggestion.message,
          selector: suggestion.selector || 'body',
          position: this.getElementPosition(suggestion.selector, iframeDocument),
          confidence: suggestion.confidence || 70,
          arbiter: 'SteveArbiter',
          fix: suggestion.fix
        });
      });
    }

    return annotations;
  }

  /**
   * Get position of element in iframe
   */
  private getElementPosition(selector: string, iframeDocument?: Document): { x: number; y: number } {
    if (!selector || !iframeDocument) return { x: 0, y: 0 };

    try {
      const element = iframeDocument.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    } catch (e) {
      // Invalid selector
    }

    return { x: 0, y: 0 };
  }

  /**
   * Generate cache key from content
   */
  private generateCacheKey(html: string, css: string, js: string): string {
    // Simple hash function
    const content = `${html}${css}${js}`;
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1000); i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `analysis-${hash}`;
  }

  /**
   * Clear all cached analyses
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}

export const previewAnalysisService = new PreviewAnalysisService();
