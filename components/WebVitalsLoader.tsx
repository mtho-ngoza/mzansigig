'use client'

import { useEffect } from 'react'
import { initWebVitals } from '@/lib/utils/webVitals'

/**
 * Client component to initialize Web Vitals tracking
 * Measures performance metrics: CLS, LCP, FID, FCP, TTFB
 */
export function WebVitalsLoader() {
  useEffect(() => {
    // Initialize Web Vitals tracking on mount
    initWebVitals()
  }, [])

  // This component renders nothing
  return null
}
