/**
 * AI Code Reviewer
 * 
 * Analyzes code changes in real-time using SecurityCouncil + CodeObservationArbiter.
 * Provides inline warnings, security scans, and performance suggestions.
 */

import { pulseClient } from './pulseClient';

export interface ReviewIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'style';
  category: 'security' | 'performance' | 'best-practice' | 'bug' | 'style';
  message: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string;
  autoFixAvailable: boolean;
  arbiterSource: string;
}

export interface CodeReviewResult {
  issues: ReviewIssue[];
  score: number; // 0-100
  summary: string;
  canCommit: boolean;
  blockers: ReviewIssue[]; // Critical issues that must be fixed
  warnings: ReviewIssue[];
  suggestions: ReviewIssue[];
}

class CodeReviewerService {
  private reviewCache = new Map<string, CodeReviewResult>();
  private pendingReviews = new Map<string, Promise<CodeReviewResult>>();
  private isEnabled = true;
  private reviewCallbacks: Set<(result: CodeReviewResult) => void> = new Set();

  // Security patterns to check
  private readonly SECURITY_PATTERNS = [
    { pattern: /eval\(/g, message: 'Avoid eval() - it can execute arbitrary code', severity: 'critical' as const },
    { pattern: /dangerouslySetInnerHTML/g, message: 'XSS risk: Validate HTML content before rendering', severity: 'warning' as const },
    { pattern: /localStorage\.setItem.*password/gi, message: 'Never store passwords in localStorage', severity: 'critical' as const },
    { pattern: /http:\/\//g, message: 'Use HTTPS for all external requests', severity: 'warning' as const },
    { pattern: /\.innerHTML\s*=/g, message: 'Potential XSS: Use textContent or sanitize HTML', severity: 'warning' as const },
    { pattern: /process\.env\./g, message: 'Avoid exposing environment variables in frontend', severity: 'warning' as const },
  ];

  // Performance patterns
  private readonly PERFORMANCE_PATTERNS = [
    { pattern: /useEffect\(\(\)\s*=>\s*{[^}]*setState[^}]*}\s*\)/g, message: 'Infinite re-render risk: useEffect with setState needs dependencies', severity: 'critical' as const },
    { pattern: /map\([^)]*\.map\(/g, message: 'Nested maps: Consider flattening or using useMemo', severity: 'warning' as const },
    { pattern: /JSON\.parse\(JSON\.stringify/g, message: 'Expensive deep clone: Use structuredClone() or a library', severity: 'info' as const },
    { pattern: /console\.log/g, message: 'Remove console.log before committing', severity: 'style' as const },
  ];

  /**
   * Review code changes in real-time
   */
  async reviewCode(file: string, content: string, context?: any): Promise<CodeReviewResult> {
    const cacheKey = this.generateCacheKey(file, content);

    // Check cache
    if (this.reviewCache.has(cacheKey)) {
      return this.reviewCache.get(cacheKey)!;
    }

    // Check if review is already in progress
    if (this.pendingReviews.has(cacheKey)) {
      return this.pendingReviews.get(cacheKey)!;
    }

    // Start new review
    const reviewPromise = this.performReview(file, content, context);
    this.pendingReviews.set(cacheKey, reviewPromise);

    try {
      const result = await reviewPromise;
      this.reviewCache.set(cacheKey, result);
      
      // Notify listeners
      this.reviewCallbacks.forEach(cb => cb(result));
      
      return result;
    } finally {
      this.pendingReviews.delete(cacheKey);
    }
  }

  /**
   * Perform multi-arbiter code review
   */
  private async performReview(file: string, content: string, context?: any): Promise<CodeReviewResult> {
    const issues: ReviewIssue[] = [];

    // 1. Quick local pattern checks (instant)
    issues.push(...this.checkSecurityPatterns(file, content));
    issues.push(...this.checkPerformancePatterns(file, content));
    issues.push(...this.checkBestPractices(file, content));

    // 2. Deep analysis via arbiters (async)
    try {
      const arbiterIssues = await this.analyzeViaArbiters(file, content, context);
      issues.push(...arbiterIssues);
    } catch (error) {
      console.error('[CodeReviewer] Arbiter analysis failed:', error);
    }

    // Calculate score
    const score = this.calculateScore(issues);
    
    // Categorize issues
    const blockers = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');
    const suggestions = issues.filter(i => i.severity === 'info' || i.severity === 'style');

    // Generate summary
    const summary = this.generateSummary(issues, score);

    return {
      issues,
      score,
      summary,
      canCommit: blockers.length === 0,
      blockers,
      warnings,
      suggestions
    };
  }

  /**
   * Check security patterns
   */
  private checkSecurityPatterns(file: string, content: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    this.SECURITY_PATTERNS.forEach(({ pattern, message, severity }) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const line = this.getLineNumber(content, match.index || 0);
        issues.push({
          id: `sec-${Date.now()}-${Math.random()}`,
          severity,
          category: 'security',
          message,
          file,
          line,
          suggestion: this.getSuggestion(match[0]),
          autoFixAvailable: false,
          arbiterSource: 'LocalPatternMatcher'
        });
      }
    });

    return issues;
  }

  /**
   * Check performance patterns
   */
  private checkPerformancePatterns(file: string, content: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    this.PERFORMANCE_PATTERNS.forEach(({ pattern, message, severity }) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const line = this.getLineNumber(content, match.index || 0);
        issues.push({
          id: `perf-${Date.now()}-${Math.random()}`,
          severity,
          category: 'performance',
          message,
          file,
          line,
          suggestion: undefined,
          autoFixAvailable: false,
          arbiterSource: 'LocalPatternMatcher'
        });
      }
    });

    return issues;
  }

  /**
   * Check best practices
   */
  private checkBestPractices(file: string, content: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // React-specific checks
    if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      // Missing key in lists
      if (content.includes('.map(') && !content.includes('key=')) {
        issues.push({
          id: `bp-${Date.now()}-${Math.random()}`,
          severity: 'warning',
          category: 'best-practice',
          message: 'Missing key prop in list items',
          file,
          suggestion: 'Add unique key prop to each item: key={item.id}',
          autoFixAvailable: false,
          arbiterSource: 'LocalPatternMatcher'
        });
      }

      // Unhandled promises
      if (content.includes('async ') && !content.includes('try') && !content.includes('.catch(')) {
        issues.push({
          id: `bp-${Date.now()}-${Math.random()}`,
          severity: 'info',
          category: 'best-practice',
          message: 'Async function without error handling',
          file,
          suggestion: 'Wrap in try/catch or add .catch() handler',
          autoFixAvailable: false,
          arbiterSource: 'LocalPatternMatcher'
        });
      }
    }

    // TypeScript checks
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // @ts-ignore usage
      if (content.includes('@ts-ignore')) {
        issues.push({
          id: `bp-${Date.now()}-${Math.random()}`,
          severity: 'warning',
          category: 'best-practice',
          message: 'Avoid @ts-ignore - fix the type error instead',
          file,
          suggestion: 'Use @ts-expect-error with explanation, or fix the type',
          autoFixAvailable: false,
          arbiterSource: 'LocalPatternMatcher'
        });
      }

      // any usage
      const anyCount = (content.match(/:\s*any\b/g) || []).length;
      if (anyCount > 3) {
        issues.push({
          id: `bp-${Date.now()}-${Math.random()}`,
          severity: 'info',
          category: 'style',
          message: `${anyCount} uses of 'any' type - consider proper typing`,
          file,
          suggestion: 'Define proper interfaces or use unknown',
          autoFixAvailable: false,
          arbiterSource: 'LocalPatternMatcher'
        });
      }
    }

    return issues;
  }

  /**
   * Analyze via SOMA arbiters (deep analysis)
   */
  private async analyzeViaArbiters(file: string, content: string, context?: any): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    try {
      // Use CodeObservationArbiter for deep analysis
      const analysisResult = await pulseClient.analyzeCode(content, file, 'review');
      
      if (analysisResult.issues) {
        analysisResult.issues.forEach((issue: any) => {
          issues.push({
            id: `arbiter-${Date.now()}-${Math.random()}`,
            severity: issue.severity || 'info',
            category: issue.category || 'best-practice',
            message: issue.message,
            file,
            line: issue.line,
            column: issue.column,
            suggestion: issue.suggestion,
            autoFixAvailable: issue.autoFixAvailable || false,
            arbiterSource: 'CodeObservationArbiter'
          });
        });
      }
    } catch (error) {
      console.warn('[CodeReviewer] Arbiter analysis skipped:', error);
    }

    return issues;
  }

  /**
   * Calculate code quality score
   */
  private calculateScore(issues: ReviewIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'warning': score -= 10; break;
        case 'info': score -= 5; break;
        case 'style': score -= 2; break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate summary message
   */
  private generateSummary(issues: ReviewIssue[], score: number): string {
    if (issues.length === 0) {
      return '✨ Perfect! No issues found.';
    }

    const critical = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info' || i.severity === 'style').length;

    let summary = `Code Score: ${score}/100. `;
    
    if (critical > 0) {
      summary += `🚫 ${critical} critical issue${critical > 1 ? 's' : ''} must be fixed. `;
    }
    if (warnings > 0) {
      summary += `⚠️ ${warnings} warning${warnings > 1 ? 's' : ''}. `;
    }
    if (info > 0) {
      summary += `💡 ${info} suggestion${info > 1 ? 's' : ''}.`;
    }

    return summary.trim();
  }

  /**
   * Get suggestion for a matched pattern
   */
  private getSuggestion(match: string): string | undefined {
    if (match.includes('eval(')) return 'Use Function() constructor or refactor logic';
    if (match.includes('dangerouslySetInnerHTML')) return 'Use DOMPurify to sanitize HTML';
    if (match.includes('localStorage')) return 'Use secure session storage or encrypted cookies';
    return undefined;
  }

  /**
   * Get line number from content position
   */
  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(file: string, content: string): string {
    const contentHash = content.length + content.substring(0, 100);
    return `${file}-${contentHash}`;
  }

  /**
   * Subscribe to review results
   */
  onReview(callback: (result: CodeReviewResult) => void) {
    this.reviewCallbacks.add(callback);
    return () => this.reviewCallbacks.delete(callback);
  }

  /**
   * Enable/disable reviewer
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.reviewCache.clear();
  }
}

export const codeReviewer = new CodeReviewerService();
