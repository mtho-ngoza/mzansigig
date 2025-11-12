/**
 * Web Vitals tracking for performance monitoring
 * Tracks CLS, LCP, FID, FCP, and TTFB metrics
 */

import { onCLS, onFID, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

interface VitalsReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
};

/**
 * Get rating based on metric value and thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report vitals to console (can be extended to send to analytics)
 */
function reportVital(metric: Metric): void {
  const report: VitalsReport = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const emoji = report.rating === 'good' ? '✅' : report.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(
      `${emoji} [Web Vitals] ${report.name}:`,
      `${Math.round(report.value)}${report.name === 'CLS' ? '' : 'ms'}`,
      `(${report.rating})`
    );
  }

  // TODO: Send to analytics service in production
  // Example: sendToAnalytics(report);
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals(): void {
  try {
    // Core Web Vitals
    onCLS(reportVital);   // Cumulative Layout Shift
    onFID(reportVital);   // First Input Delay
    onLCP(reportVital);   // Largest Contentful Paint

    // Additional metrics
    onFCP(reportVital);   // First Contentful Paint
    onTTFB(reportVital);  // Time to First Byte
  } catch (error) {
    console.warn('Failed to initialize Web Vitals:', error);
  }
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(): {
  networkType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
} {
  if (typeof navigator === 'undefined') return {};

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  if (!connection) return {};

  return {
    networkType: connection.type,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt
  };
}
