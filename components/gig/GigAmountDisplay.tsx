'use client'

import React, { useState, useEffect } from 'react'
import { usePayment } from '@/contexts/PaymentContext'
import { FeeBreakdown } from '@/types/payment'

interface GigAmountDisplayProps {
  budget: number
  showBreakdown?: boolean
  variant?: 'compact' | 'detailed'
  className?: string
}

export default function GigAmountDisplay({
  budget,
  showBreakdown = false,
  variant = 'compact',
  className = ''
}: GigAmountDisplayProps) {
  const { calculateGigFees, formatCurrency } = usePayment()
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const loadFeeBreakdown = async () => {
      try {
        setLoading(true)
        const breakdown = await calculateGigFees(budget)
        setFeeBreakdown(breakdown)
      } catch (error) {
        console.error('Error calculating fees:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFeeBreakdown()
  }, [budget, calculateGigFees])

  if (loading) {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-16 mt-1"></div>
        </div>
      </div>
    )
  }

  if (!feeBreakdown) {
    return (
      <div className={className}>
        <span className="font-semibold text-green-600">
          {formatCurrency(budget)}
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">You&apos;ll earn:</span>
          <span className="font-semibold text-green-600">
            {formatCurrency(feeBreakdown.netAmountToWorker)}
          </span>
        </div>
        {showBreakdown && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              (from {formatCurrency(budget)} budget)
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-secondary-600 hover:text-secondary-800"
            >
              {showDetails ? 'Hide' : 'Show'} breakdown
            </button>
          </div>
        )}

        {showDetails && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-xs space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Project Budget:</span>
              <span>{formatCurrency(feeBreakdown.grossAmount)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Platform Commission ({Math.round((feeBreakdown.workerCommission / feeBreakdown.grossAmount) * 100)}%):</span>
              <span>-{formatCurrency(feeBreakdown.workerCommission)}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 flex justify-between font-medium text-green-600">
              <span>Your Earnings:</span>
              <span>{formatCurrency(feeBreakdown.netAmountToWorker)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Detailed variant
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="bg-gradient-to-r from-green-50 to-secondary-50 rounded-lg p-4 border border-green-200">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Worker Earnings</h4>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(feeBreakdown.netAmountToWorker)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Project Budget</p>
            <p className="text-sm font-medium text-gray-700">
              {formatCurrency(feeBreakdown.grossAmount)}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Project Budget:</span>
            <span>{formatCurrency(feeBreakdown.grossAmount)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Platform Commission ({Math.round((feeBreakdown.workerCommission / feeBreakdown.grossAmount) * 100)}%):</span>
            <span>-{formatCurrency(feeBreakdown.workerCommission)}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between font-medium text-green-600">
            <span>Your Net Earnings:</span>
            <span>{formatCurrency(feeBreakdown.netAmountToWorker)}</span>
          </div>
        </div>
      </div>

      <div className="bg-secondary-50 rounded-lg p-3 border border-secondary-200">
        <h4 className="text-sm font-medium text-secondary-800 mb-2">Cost Breakdown for Employer</h4>
        <div className="space-y-1 text-xs text-secondary-700">
          <div className="flex justify-between">
            <span>Project Payment:</span>
            <span>{formatCurrency(feeBreakdown.grossAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform Fee:</span>
            <span>{formatCurrency(feeBreakdown.platformFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Processing Fee:</span>
            <span>{formatCurrency(feeBreakdown.processingFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Transaction Fee:</span>
            <span>{formatCurrency(feeBreakdown.fixedFee)}</span>
          </div>
          <div className="border-t border-secondary-300 pt-1 flex justify-between font-medium">
            <span>Total Employer Cost:</span>
            <span>{formatCurrency(feeBreakdown.totalEmployerCost)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}