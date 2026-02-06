'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

/**
 * Payment Success Page
 *
 * Handles redirect from TradeSafe after successful payment
 * Query params from TradeSafe:
 * - status: Payment status
 * - method: Payment method used
 * - transactionId: TradeSafe transaction ID
 * - reference: External reference (gigId)
 */
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  const transactionId = searchParams.get('transactionId')
  const reference = searchParams.get('reference') // gigId
  const method = searchParams.get('method')

  // Auto-redirect after countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // Redirect to manage applications or dashboard
          router.push(reference
            ? `/dashboard/manage-applications?payment=success&gig=${reference}`
            : '/dashboard'
          )
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router, reference])

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
            <Button
              onClick={() => router.push(reference
                ? `/dashboard/manage-applications?payment=success&gig=${reference}`
                : '/dashboard'
              )}
              className="w-full"
            >
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
