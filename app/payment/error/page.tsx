'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

/**
 * Payment Error Page
 *
 * Handles redirect from TradeSafe after failed/cancelled payment
 * Query params from TradeSafe:
 * - action: 'failure' | 'success'
 * - method: Payment method used (card, eft, etc)
 * - reason: Error reason (canceled, declined, etc)
 * - transactionId: TradeSafe transaction ID
 * - reference: TradeSafe reference code
 */
function PaymentErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const transactionId = searchParams.get('transactionId')
  const reason = searchParams.get('reason')
  const method = searchParams.get('method')
  // Legacy params
  const status = searchParams.get('status')
  const errorMessage = searchParams.get('error')

  const isCancelled = reason === 'canceled' || status === 'cancelled' || status === 'CANCELLED'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="text-6xl mb-4">{isCancelled ? '🚫' : '❌'}</div>
          <CardTitle className="text-2xl text-red-600">
            {isCancelled ? 'Payment Cancelled' : 'Payment Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            {isCancelled
              ? 'You cancelled the payment. No funds have been deducted from your account.'
              : 'There was a problem processing your payment. Please try again.'}
          </p>

          {(errorMessage || reason) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-red-800 mb-1">Details</h4>
              <p className="text-sm text-red-700">{errorMessage || `Reason: ${reason}`}</p>
              {method && <p className="text-sm text-red-600 mt-1">Payment method: {method}</p>}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-gray-800 mb-2">What you can do:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Try the payment again</li>
              <li>• Use a different payment method</li>
              <li>• Check your bank account balance</li>
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>

          {transactionId && (
            <div className="text-sm text-gray-500">
              <p>Reference: {transactionId}</p>
            </div>
          )}

          <div className="pt-4 space-y-2">
            <Button
              onClick={() => router.push('/dashboard/manage-applications')}
              className="w-full"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PaymentErrorContent />
    </Suspense>
  )
}
