/**
 * Performance Profiler
 * 
 * Monitors React app performance in preview iframe.
 * Detects slow renders, memory leaks, large bundles, etc.
 */

export interface PerformanceMetrics {
  // Load metrics
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  
  // Runtime metrics
  fps: number;
  renderCount: number;
  slowRenders: number;
  averageRenderTime: number;
  
  // Memory
  memoryUsed: number;
  memoryLimit: number;
  memoryPercent: number;
  
  // Network
  bundleSize: number;
  requestCount: number;
  
  // Issues
  issues: PerformanceIssue[];
}

export interface PerformanceIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'render' | 'memory' | 'network' | 'bundle';
  message: string;
  suggestion: string;
  component?: string;
  renderTime?: number;
}

class PerformanceProfilerService {
  private iframe: HTMLIFrameElement | null = null;
  private metricsCallbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private observer: PerformanceObserver | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  private renderTimes: number[] = [];
  private isMonitoring = false;

  /**
   * Inject profiler into iframe
   */
  injectProfiler(iframe: HTMLIFrameElement) {
    this.iframe = iframe;

    try {
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) return;

      // Inject performance monitoring script
      const script = iframeWindow.document.createElement('script');
      script.textContent = this.getInjectionScript();
      iframeWindow.document.head.appendChild(script);

      // Listen for performance messages
      window.addEventListener('message', this.handlePerformanceMessage);

      this.startMonitoring();
    } catch (error) {
      console.warn('[PerformanceProfiler] Cannot inject - CORS or iframe not ready:', error);
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Monitor FPS
    this.lastFrameTime = performance.now();
    this.monitorFPS();

    // Collect metrics every 2 seconds
    setInterval(() => this.collectMetrics(), 2000);
  }

  /**
   * Monitor FPS
   */
  private monitorFPS() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    
    if (delta > 0) {
      this.frameCount++;
    }

    this.lastFrameTime = now;
    requestAnimationFrame(() => this.monitorFPS());
  }

  /**
   * Collect all metrics
   */
  private async collectMetrics() {
    if (!this.iframe?.contentWindow) return;

    try {
      const iframeWindow = this.iframe.contentWindow;
      const performance = iframeWindow.performance;

      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      // FPS calculation
      const fps = this.frameCount / 2; // Over 2 second interval
      this.frameCount = 0;

      // Memory (if available)
      const memory = (performance as any).memory;

      // Render metrics
      const averageRenderTime = this.renderTimes.length > 0
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
        : 0;
      const slowRenders = this.renderTimes.filter(t => t > 16).length; // >16ms = <60fps

      // Bundle size
      const resources = performance.getEntriesByType('resource');
      const bundleSize = resources
        .filter((r: any) => r.initiatorType === 'script' || r.initiatorType === 'link')
        .reduce((total: number, r: any) => total + (r.transferSize || 0), 0);

      const metrics: PerformanceMetrics = {
        loadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart || 0,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        fps,
        renderCount: this.renderTimes.length,
        slowRenders,
        averageRenderTime,
        memoryUsed: memory?.usedJSHeapSize || 0,
        memoryLimit: memory?.jsHeapSizeLimit || 0,
        memoryPercent: memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0,
        bundleSize,
        requestCount: resources.length,
        issues: this.detectIssues(fps, slowRenders, averageRenderTime, bundleSize, memory)
      };

      // Reset render times
      if (this.renderTimes.length > 100) {
        this.renderTimes = this.renderTimes.slice(-50);
      }

      // Notify listeners
      this.metricsCallbacks.forEach(cb => cb(metrics));

    } catch (error) {
      console.warn('[PerformanceProfiler] Failed to collect metrics:', error);
    }
  }

  /**
   * Detect performance issues
   */
  private detectIssues(
    fps: number,
    slowRenders: number,
    avgRenderTime: number,
    bundleSize: number,
    memory: any
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Low FPS
    if (fps < 30) {
      issues.push({
        id: `fps-${Date.now()}`,
        severity: 'critical',
        category: 'render',
        message: `Low FPS: ${fps.toFixed(1)} (target: 60)`,
        suggestion: 'Check for expensive renders or infinite loops'
      });
    } else if (fps < 50) {
      issues.push({
        id: `fps-${Date.now()}`,
        severity: 'warning',
        category: 'render',
        message: `FPS below optimal: ${fps.toFixed(1)} (target: 60)`,
        suggestion: 'Consider using React.memo or useMemo for expensive components'
      });
    }

    // Slow renders
    if (slowRenders > 5) {
      issues.push({
        id: `slow-renders-${Date.now()}`,
        severity: 'warning',
        category: 'render',
        message: `${slowRenders} slow renders detected (>16ms)`,
        suggestion: 'Use React DevTools Profiler to identify slow components'
      });
    }

    // High average render time
    if (avgRenderTime > 16) {
      issues.push({
        id: `avg-render-${Date.now()}`,
        severity: 'warning',
        category: 'render',
        message: `Average render time: ${avgRenderTime.toFixed(1)}ms (target: <16ms)`,
        suggestion: 'Optimize component render logic or split into smaller components'
      });
    }

    // Large bundle
    if (bundleSize > 1024 * 1024) { // 1MB
      issues.push({
        id: `bundle-${Date.now()}`,
        severity: 'warning',
        category: 'bundle',
        message: `Large bundle size: ${(bundleSize / 1024 / 1024).toFixed(2)}MB`,
        suggestion: 'Use code splitting, tree shaking, or lazy loading'
      });
    }

    // Memory issues
    if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
      issues.push({
        id: `memory-${Date.now()}`,
        severity: 'critical',
        category: 'memory',
        message: 'Memory usage above 80%',
        suggestion: 'Check for memory leaks or unnecessary object retention'
      });
    } else if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.6) {
      issues.push({
        id: `memory-${Date.now()}`,
        severity: 'warning',
        category: 'memory',
        message: 'Memory usage above 60%',
        suggestion: 'Monitor memory growth over time'
      });
    }

    return issues;
  }

  /**
   * Handle performance messages from iframe
   */
  private handlePerformanceMessage = (event: MessageEvent) => {
    if (event.data?.type === 'pulse-performance') {
      const { renderTime, componentName } = event.data;
      this.renderTimes.push(renderTime);

      // Notify about slow component
      if (renderTime > 50) {
        console.warn(`[PerformanceProfiler] Slow render: ${componentName} took ${renderTime}ms`);
      }
    }
  };

  /**
   * Script to inject into iframe
   */
  private getInjectionScript(): string {
    return `
      (function() {
        // Override React's render methods to track performance
        if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
          const internals = window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
          const originalRender = internals.Scheduler.unstable_scheduleCallback;
          
          if (originalRender) {
            internals.Scheduler.unstable_scheduleCallback = function(...args) {
              const startTime = performance.now();
              const result = originalRender.apply(this, args);
              const endTime = performance.now();
              const renderTime = endTime - startTime;
              
              // Send to parent
              window.parent.postMessage({
                type: 'pulse-performance',
                renderTime,
                componentName: 'Unknown'
              }, '*');
              
              return result;
            };
          }
        }
        
        // Track long tasks
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                console.warn('[Pulse] Long task detected:', entry.duration + 'ms');
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        }
        
        console.log('[Pulse] Performance profiler injected');
      })();
    `;
  }

  /**
   * Subscribe to metrics
   */
  onMetrics(callback: (metrics: PerformanceMetrics) => void) {
    this.metricsCallbacks.add(callback);
    return () => this.metricsCallbacks.delete(callback);
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
    window.removeEventListener('message', this.handlePerformanceMessage);
    this.observer?.disconnect();
  }

  /**
   * Reset metrics
   */
  reset() {
    this.frameCount = 0;
    this.renderTimes = [];
  }
}

export const performanceProfiler = new PerformanceProfilerService();
