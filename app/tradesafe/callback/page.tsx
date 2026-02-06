'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

/**
 * TradeSafe Callback Handler
 *
 * Handles redirects from TradeSafe after payment completion.
 * Redirects to /payment/success or /payment/error based on action param.
 *
 * TradeSafe callback params:
 * - action: 'success' | 'failure'
 * - method: Payment method used (card, eft, etc)
 * - reason: Error reason (if failure)
 * - transactionId: TradeSafe transaction ID
 * - reference: TradeSafe reference code
 */

function CallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const action = searchParams.get('action')
    const params = searchParams.toString()

    if (action === 'success') {
      router.replace(`/payment/success?${params}`)
    } else {
      router.replace(`/payment/error?${params}`)
    }
  }, [searchParams, router])

  return null
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing payment result...</p>
      </div>
    </div>
  )
}

export default function TradeSafeCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoadingSpinner />
      <CallbackHandler />
    </Suspense>
  )
}
