'use client'

import { useEffect } from 'react'

/**
 * Development utilities loader
 * This component loads dev utils in development mode only
 */
export function DevUtilsLoader() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Dynamically import devUtils to make it available in browser console
      import('@/lib/services/devUtils').catch((err) => {
        console.warn('Failed to load devUtils:', err)
      })
    }
  }, [])

  // This component doesn't render anything
  return null
}
