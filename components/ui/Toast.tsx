'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Toast as ToastType } from '@/types/toast'

interface ToastProps {
  toast: ToastType
  onRemove: (id: string) => void
}

export function Toast({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // Match animation duration
  }, [onRemove, toast.id])

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)

    // Auto-dismiss after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      const dismissTimer = setTimeout(() => {
        handleDismiss()
      }, duration)

      return () => {
        clearTimeout(timer)
        clearTimeout(dismissTimer)
      }
    }

    return () => clearTimeout(timer)
  }, [toast.duration, handleDismiss])

  const getToastStyles = () => {
    const baseStyles = 'relative flex items-start space-x-3 p-4 rounded-lg shadow-lg border-l-4 backdrop-blur-sm'

    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-900`
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-900`
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-900`
      case 'info':
        return `${baseStyles} bg-secondary-50 border-secondary-500 text-secondary-900`
      default:
        return `${baseStyles} bg-gray-50 border-gray-500 text-gray-900`
    }
  }

  const getIcon = () => {
    const iconClasses = 'w-5 h-5 flex-shrink-0'

    switch (toast.type) {
      case 'success':
        return (
          <svg className={`${iconClasses} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className={`${iconClasses} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={`${iconClasses} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className={`${iconClasses} text-secondary-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out transform
        ${isVisible && !isExiting ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
        ${isExiting ? 'opacity-0 translate-x-full' : ''}
      `}
    >
      <div className={getToastStyles()}>
        {getIcon()}

        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-medium">{toast.title}</p>
          )}
          <p className={`text-sm ${toast.title ? 'mt-1' : ''}`}>
            {toast.message}
          </p>

          {toast.action && (
            <div className="mt-2">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium underline hover:no-underline focus:outline-none"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        {toast.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}