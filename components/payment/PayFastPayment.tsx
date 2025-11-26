'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface PayFastPaymentProps {
  gigId: string
  amount: number
  gigTitle: string
  gigDescription?: string
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * PayFast Payment Component
 *
 * Handles gig funding through PayFast payment gateway
 *
 * Flow:
 * 1. User clicks "Fund Gig"
 * 2. Creates payment request to /api/payments/payfast/create
 * 3. Receives HTML form that auto-submits to PayFast
 * 4. User completes payment on PayFast
 * 5. PayFast sends ITN to /api/payments/payfast/itn
 * 6. User is redirected back based on payment result
 */
export default function PayFastPayment({
  gigId,
  amount,
  gigTitle,
  gigDescription,
  onSuccess,
  onCancel
}: PayFastPaymentProps) {
  const { user } = useAuth()
  const { error: showError } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async () => {
    if (!user) {
      showError('Please sign in to fund this gig')
      return
    }

    setIsProcessing(true)

    try {
      // Create payment with PayFast
      const response = await fetch('/api/payments/payfast/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          gigId,
          amount,
          itemName: gigTitle,
          itemDescription: gigDescription || `Funding for gig: ${gigTitle}`,
          customerEmail: user.email,
          customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create payment')
      }

      // Get the HTML form that will redirect to PayFast
      const html = await response.text()

      // Open payment in new window or redirect current window
      // For better UX, we'll open in current window
      const paymentWindow = window.open('', '_self')
      if (paymentWindow) {
        paymentWindow.document.write(html)
        paymentWindow.document.close()
      } else {
        // Fallback: write to current document
        document.write(html)
        document.close()
      }

      onSuccess?.()
    } catch (error) {
      console.error('Payment error:', error)
      showError(error instanceof Error ? error.message : 'Failed to initiate payment')
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fund Gig with PayFast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Gig:</span>
                <span className="font-medium text-gray-900">{gigTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium text-gray-900">R {amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Total to Pay:</span>
                <span className="text-lg font-bold text-primary-600">R {amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* PayFast Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Secure Payment with PayFast</p>
                <p>
                  You&apos;ll be redirected to PayFast&apos;s secure payment page.
                  PayFast is South Africa&apos;s leading payment gateway, trusted by over 80,000 businesses.
                </p>
              </div>
            </div>
          </div>

          {/* Escrow Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Protected by Escrow</p>
                <p>
                  Your payment will be held in escrow until the work is completed and approved.
                  This protects both you and the worker.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              isLoading={isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `Pay R ${amount.toFixed(2)}`}
            </Button>
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            By clicking Pay, you agree to our{' '}
            <a href="/terms" className="text-primary-600 hover:text-primary-700 underline">
              Terms of Service
            </a>{' '}
            and authorize the payment.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
