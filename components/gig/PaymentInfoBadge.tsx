'use client'

import React from 'react'

interface PaymentInfoBadgeProps {
  variant?: 'info' | 'warning' | 'success'
  size?: 'sm' | 'md'
  className?: string
}

/**
 * PaymentInfoBadge - Informational badge about payment status
 *
 * Shows workers when payment will be secured (after selection).
 * Part of progressive trust model - inform without blocking.
 */
export default function PaymentInfoBadge({
  variant = 'info',
  size = 'sm',
  className = ''
}: PaymentInfoBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5'
  }

  const variantClasses = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    success: 'bg-green-50 text-green-700 border-green-200'
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title="Payment is secured in escrow after you're selected for the gig"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="font-medium">Payment after selection</span>
    </div>
  )
}
