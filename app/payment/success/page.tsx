'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

/**
 * Payment Success Page
 *
 * Handles redirect from TradeSafe after successful payment.
 *
 * Note: The webhook already updates the database, so verification here is optional.
 * We try to verify to get the gigId for a better redirect, but redirect regardless.
 */
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)
  const [gigId, setGigId] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

  const transactionId = searchParams.get('transactionId') || searchParams.get('id')
  const method = searchParams.get('method')

  // Log what params we received from TradeSafe
  useEffect(() => {
    console.log('=== SUCCESS PAGE: Loaded ===')
    console.log('All URL params:', Object.fromEntries(searchParams.entries()))
    console.log('transactionId:', transactionId)
    console.log('method:', method)
  }, [searchParams, transactionId, method])

  // Try to verify payment and get gigId (optional - webhook already updated DB)
  const verifyPayment = useCallback(async () => {
    if (!transactionId) {
      console.log('=== SUCCESS PAGE: No transactionId, skipping verify ===')
      setVerified(true)
      return
    }

    console.log('=== SUCCESS PAGE: Verifying payment ===')
    try {
      const response = await fetch('/api/payments/tradesafe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      })

      const data = await response.json()
      console.log('=== SUCCESS PAGE: Verify response ===', data)

      if (response.ok && data.success && data.gigId) {
        setGigId(data.gigId)
        console.log('Got gigId:', data.gigId)
      }
    } catch (err) {
      console.error('Verify error (non-fatal):', err)
    } finally {
      setVerified(true)
    }
  }, [transactionId])

  // Verify on mount
  useEffect(() => {
    verifyPayment()
  }, [verifyPayment])

  // Auto-redirect after countdown
  useEffect(() => {
    if (!verified) return

    console.log('=== SUCCESS PAGE: Starting countdown, gigId:', gigId, '===')

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          const redirectUrl = gigId
            ? `/dashboard/manage-applications?payment=success&gig=${gigId}`
            : '/dashboard/manage-applications?payment=success'
          console.log('=== SUCCESS PAGE: Redirecting to:', redirectUrl, '===')
          router.push(redirectUrl)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router, gigId, verified])

  const handleGoToDashboard = () => {
    const redirectUrl = gigId
      ? `/dashboard/manage-applications?payment=success&gig=${gigId}`
      : '/dashboard/manage-applications?payment=success'
    console.log('=== SUCCESS PAGE: Manual redirect to:', redirectUrl, '===')
    router.push(redirectUrl)
  }

  // Show loading only briefly while verifying
  if (!verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <CardTitle className="text-xl text-gray-600">
              Confirming Payment...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Please wait a moment.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="text-6xl mb-4">✅</div>
          <CardTitle className="text-2xl text-green-600">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your payment has been processed and the funds are now held in secure escrow.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-green-800 mb-2">What happens next?</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• The worker will be notified to start the gig</li>
              <li>• Funds are held securely until work is completed</li>
              <li>• You&apos;ll approve the work when satisfied</li>
              <li>• Payment releases to the worker automatically</li>
            </ul>
          </div>

          {transactionId && (
            <div className="text-sm text-gray-500">
              <p>Transaction ID: {transactionId}</p>
              {method && <p>Payment Method: {method}</p>}
            </div>
          )}

          <div className="pt-4">
            <p className="text-sm text-gray-500 mb-2">
              Redirecting in {countdown} seconds...
            </p>
            <Button onClick={handleGoToDashboard} className="w-full">
              Go to Dashboard Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
