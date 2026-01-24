'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface UpdateRateModalProps {
  isOpen: boolean
  currentRate: number
  gigBudget?: number
  updatedBy: 'worker' | 'employer'
  onSubmit: (newRate: number, note?: string) => Promise<void>
  onCancel: () => void
}

export default function UpdateRateModal({
  isOpen,
  currentRate,
  gigBudget,
  updatedBy,
  onSubmit,
  onCancel
}: UpdateRateModalProps) {
  const [newRate, setNewRate] = useState(currentRate.toString())
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    const rateValue = parseFloat(newRate)

    // Validation
    if (isNaN(rateValue) || rateValue <= 0) {
      setError('Please enter a valid rate greater than R0')
      return
    }
    if (rateValue > 100000) {
      setError('Rate cannot exceed R100,000')
      return
    }
    if (rateValue === currentRate) {
      setError('New rate must be different from current rate')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await onSubmit(rateValue, note.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-lg">
            {updatedBy === 'employer' ? 'Counter Offer' : 'Update Your Rate'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Rate Display */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Proposed Rate:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(currentRate)}</span>
              </div>
              {gigBudget && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Original Gig Budget:</span>
                  <span className="font-medium text-gray-700">{formatCurrency(gigBudget)}</span>
                </div>
              )}
            </div>

            {/* New Rate Input */}
            <div>
              <label htmlFor="newRate" className="block text-sm font-medium text-gray-700 mb-2">
                New Rate (ZAR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                <input
                  type="number"
                  id="newRate"
                  value={newRate}
                  onChange={(e) => {
                    setNewRate(e.target.value)
                    setError(null)
                  }}
                  min="1"
                  max="100000"
                  step="1"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter new rate"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                Note (optional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                placeholder={updatedBy === 'employer'
                  ? "Explain your counter offer..."
                  : "Explain why you're updating the rate..."}
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                {note.length}/200 characters
              </p>
            </div>

            {/* Tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Use the message feature to discuss the rate before proposing changes.
                This helps reach an agreement faster.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Propose New Rate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
