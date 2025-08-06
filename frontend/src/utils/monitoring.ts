/**
 * Production Monitoring and Analytics Setup
 * Provides comprehensive monitoring capabilities for the AJ-HCP-LE application
 */

import { errorLogger } from './errorHandling';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UserEvent {
  eventType: string;
  component: string;
  action: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private performanceObserver?: PerformanceObserver;
  private vitalsQueue: PerformanceMetric[] = [];
  private eventQueue: UserEvent[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize comprehensive monitoring
   */
  private initializeMonitoring(): void {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.setupPerformanceMonitoring();
      this.setupWebVitals();
      this.setupErrorTracking();
      this.setupUserAnalytics();
      this.startDataFlush();
    }
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackPerformanceMetric({
            name: entry.entryType,
            value: entry.duration || entry.startTime,
            timestamp: Date.now(),
            metadata: {
              entryName: entry.name,
              entryType: entry.entryType
            }
          });
        });
      });

      try {
        this.performanceObserver.observe({ 
          entryTypes: ['measure', 'navigation', 'resource', 'paint', 'largest-contentful-paint']
        });
      } catch (error) {
        console.warn('Performance monitoring not fully supported:', error);
      }
    }
  }

  /**
   * Set up Core Web Vitals monitoring
   */
  private setupWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.observeWebVital('largest-contentful-paint', (entry: any) => {
      this.trackPerformanceMetric({
        name: 'LCP',
        value: entry.startTime,
        timestamp: Date.now()
      });
    });

    // First Input Delay (FID)
    this.observeWebVital('first-input', (entry: any) => {
      this.trackPerformanceMetric({
        name: 'FID',
        value: entry.processingStart - entry.startTime,
        timestamp: Date.now()
      });
    });

    // Cumulative Layout Shift (CLS)
    this.observeWebVital('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        this.trackPerformanceMetric({
          name: 'CLS',
          value: entry.value,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Observe specific web vital metrics
   */
  private observeWebVital(entryType: string, callback: (entry: any) => void): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(callback);
        });
        observer.observe({ entryTypes: [entryType] });
      } catch (error) {
        console.warn(`${entryType} monitoring not supported:`, error);
      }
    }
  }

  /**
   * Set up error tracking integration
   */
  private setupErrorTracking(): void {
    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript-error'
      });
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        type: 'unhandled-promise-rejection'
      });
    });
  }

  /**
   * Set up user analytics and behavior tracking
   */
  private setupUserAnalytics(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackUserEvent({
        eventType: 'page-visibility',
        component: 'Global',
        action: document.hidden ? 'hidden' : 'visible',
        metadata: {
          timestamp: Date.now()
        }
      });
    });

    // Track user engagement time
    let engagementStart = Date.now();
    let isEngaged = true;

    const trackEngagement = () => {
      if (isEngaged) {
        const engagementTime = Date.now() - engagementStart;
        this.trackPerformanceMetric({
          name: 'engagement-time',
          value: engagementTime,
          timestamp: Date.now()
        });
        engagementStart = Date.now();
      }
    };

    // Track engagement on user interaction
    ['click', 'scroll', 'keypress'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (!isEngaged) {
          isEngaged = true;
          engagementStart = Date.now();
        }
      }, { passive: true });
    });

    // Stop engagement tracking on blur
    window.addEventListener('blur', () => {
      trackEngagement();
      isEngaged = false;
    });

    // Track engagement every 30 seconds
    setInterval(trackEngagement, 30000);
  }

  /**
   * Track performance metrics
   */
  public trackPerformanceMetric(metric: PerformanceMetric): void {
    this.vitalsQueue.push(metric);

    // Log concerning metrics immediately
    if (this.isPerformanceConcerning(metric)) {
      console.warn(`🚨 Performance concern: ${metric.name} = ${metric.value}ms`);
      
      errorLogger.handleError(new Error(`Performance concern: ${metric.name}`), {
        component: 'MonitoringService',
        action: 'Performance Tracking',
        userMessage: 'Application performance may be slower than expected'
      });
    }
  }

  /**
   * Track user events
   */
  public trackUserEvent(event: UserEvent): void {
    this.eventQueue.push({
      ...event,
      timestamp: Date.now()
    } as any);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 User Event: ${event.eventType} in ${event.component} - ${event.action}`);
    }
  }

  /**
   * Track errors with context
   */
  public trackError(error: Error, metadata?: Record<string, any>): void {
    errorLogger.handleError(error, {
      component: 'MonitoringService',
      action: 'Error Tracking',
      userMessage: 'An unexpected error occurred'
    });
  }

  /**
   * Check if performance metric is concerning
   */
  private isPerformanceConcerning(metric: PerformanceMetric): boolean {
    const thresholds: Record<string, number> = {
      LCP: 2500,    // Largest Contentful Paint should be < 2.5s
      FID: 100,     // First Input Delay should be < 100ms
      CLS: 0.1,     // Cumulative Layout Shift should be < 0.1
      'navigation': 3000,  // Navigation should complete < 3s
      'resource': 1000     // Resources should load < 1s
    };

    const threshold = thresholds[metric.name];
    return threshold !== undefined && metric.value > threshold;
  }

  /**
   * Start periodic data flush to external services
   */
  private startDataFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushData();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush queued data to external monitoring services
   */
  private flushData(): void {
    if (this.vitalsQueue.length > 0 || this.eventQueue.length > 0) {
      const payload = {
        vitals: this.vitalsQueue.splice(0),
        events: this.eventQueue.splice(0),
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Send to external monitoring service
      this.sendToMonitoringService(payload);
    }
  }

  /**
   * Send data to external monitoring service (e.g., DataDog, New Relic)
   */
  private async sendToMonitoringService(payload: any): Promise<void> {
    try {
      // Example implementation - replace with your monitoring service
      if (process.env.REACT_APP_MONITORING_ENDPOINT) {
        await fetch(process.env.REACT_APP_MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_MONITORING_KEY}`
          },
          body: JSON.stringify(payload)
        });
      }

      // Also send to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Monitoring Data:', payload);
      }
    } catch (error) {
      console.warn('Failed to send monitoring data:', error);
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('monitoringSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('monitoringSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Clean up monitoring on app shutdown
   */
  public cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush any remaining data
    this.flushData();
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export types for external use
export type { PerformanceMetric, UserEvent };

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    monitoringService.cleanup();
  });
}

export default monitoringService;