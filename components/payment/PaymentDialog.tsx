'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { usePayment } from '@/contexts/PaymentContext'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { Payment } from '@/types/payment'
import { sanitizeForDisplay } from '@/lib/utils/textSanitization'
import { validatePaymentAmount, getPaymentLimits, PAYMENT_LIMITS, PaymentLimits } from '@/lib/utils/paymentValidation'
import { auth } from '@/lib/firebase'

// Available payment providers
// Note: PayFast and Paystack applications were rejected (marketplace/escrow flagged as high-risk)
// TradeSafe is purpose-built for marketplace escrow in South Africa
type PaymentProvider = 'tradesafe' | 'ozow' | 'yoco'

interface ProviderOption {
  id: PaymentProvider
  name: string
  description: string
  icon: string
  available: boolean
}

const PAYMENT_PROVIDERS: ProviderOption[] = [
  {
    id: 'tradesafe',
    name: 'TradeSafe Escrow',
    description: 'Secure escrow - EFT, Card, SnapScan, Ozow',
    icon: '🔒',
    available: true
  },
  {
    id: 'ozow',
    name: 'Ozow',
    description: 'Instant EFT payments',
    icon: '🏦',
    available: false // Available via TradeSafe
  },
  {
    id: 'yoco',
    name: 'Yoco',
    description: 'Card payments',
    icon: '📱',
    available: false // Not yet implemented
  }
]

interface PaymentDialogProps {
  gigId: string
  workerId: string
  workerName: string
  amount: number
  description?: string
  onSuccess?: (payment: Payment) => void
  onCancel?: () => void
  isOpen: boolean
}

export default function PaymentDialog({
  gigId,
  workerId,
  workerName,
  amount,
  description,
  onSuccess: _onSuccess,
  onCancel,
  isOpen
}: PaymentDialogProps) {
  const {
    calculateFees,
    formatCurrency,
    isLoading
  } = usePayment()
  const { success: _showSuccess, error: showError } = useToast()
  const { user } = useAuth()

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('tradesafe')
  // Payment type is always 'fixed' for full payment
  const paymentType = 'fixed'
  const [step, setStep] = useState<'amount' | 'provider' | 'confirm' | 'large-amount-confirm' | 'processing'>('amount')
  const [fees, setFees] = useState<{
    platformCommission: number
    workerEarnings: number
  } | null>(null)
  const [largeAmountConfirmed, setLargeAmountConfirmed] = useState(false)
  const [paymentLimits, setPaymentLimits] = useState<PaymentLimits>(PAYMENT_LIMITS)

  // Fetch payment limits from config on mount
  useEffect(() => {
    const loadPaymentLimits = async () => {
      try {
        const limits = await getPaymentLimits()
        setPaymentLimits(limits)
      } catch (error) {
        console.error('Failed to load payment limits:', error)
      }
    }
    loadPaymentLimits()
  }, [])


  // Calculate fees based on the fixed amount
  useEffect(() => {
    const loadFees = async () => {
      try {
        const calculatedFees = await calculateFees(amount)
        setFees(calculatedFees)
      } catch (error) {
        console.error('Error calculating fees:', error)
        setFees(null)
      }
    }

    if (amount > 0) {
      loadFees()
    }
  }, [amount, calculateFees])

  if (!isOpen) return null

  const handleNext = () => {
    if (step === 'amount') {
      const validation = validatePaymentAmount(amount, paymentLimits)
      if (!validation.isValid) {
        showError(validation.message || 'Invalid payment amount')
        return
      }
      if (validation.requiresConfirmation && !largeAmountConfirmed) {
        setStep('large-amount-confirm')
        return
      }
      setStep('provider')
    } else if (step === 'provider') {
      if (!selectedProvider) {
        showError('Please select a payment provider')
        return
      }
      setStep('confirm')
    } else if (step === 'large-amount-confirm') {
      setLargeAmountConfirmed(true)
      setStep('provider')
    }
  }

  const handlePayment = async () => {
    if (!selectedProvider) return

    try {
      setStep('processing')

      // Verify user is authenticated
      if (!user) {
        showError('Please sign in to continue with payment')
        setStep('confirm')
        return
      }

      // Get Firebase ID token for secure API authentication
      const firebaseUser = auth.currentUser
      if (!firebaseUser) {
        showError('Session expired. Please sign in again.')
        setStep('confirm')
        return
      }
      const idToken = await firebaseUser.getIdToken()

      // For TradeSafe provider (primary)
      if (selectedProvider === 'tradesafe') {
        const response = await fetch('/api/payments/tradesafe/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            gigId,
            amount: fees ? amount : amount,
            title: description || `Payment for gig work to ${workerName}`,
            description: `Funding gig ${gigId}`,
            workerId: workerId
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to initialize TradeSafe payment')
        }

        const data = await response.json()

        if (!data.success || !data.checkoutUrl) {
          throw new Error('Failed to get payment URL from TradeSafe')
        }

        // Redirect to TradeSafe checkout
        window.location.href = data.checkoutUrl
        return
      }

      // For other providers (Ozow, Yoco) - not yet implemented
      showError(`${selectedProvider.toUpperCase()} payments are coming soon!`)
      setStep('confirm')

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      showError(errorMessage)
      setStep('confirm')
    }
  }

  const getSelectedProviderDetails = () => {
    return PAYMENT_PROVIDERS.find(p => p.id === selectedProvider)
  }

  const renderStepContent = () => {
    switch (step) {
      case 'amount':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Payment Amount
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {sanitizeForDisplay(description) || `Payment for gig work to ${sanitizeForDisplay(workerName)}`}
              </p>
            </div>

            {/* Amount is fixed to the agreed gig rate - full payment required */}
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600">Agreed Amount</p>
                  <p className="text-2xl font-bold text-secondary-900">{formatCurrency(amount)}</p>
                </div>
                <div className="text-secondary-500 text-3xl">💰</div>
              </div>
              <p className="mt-2 text-xs text-secondary-600">
                Full payment is required to fund the gig. The worker will receive this amount upon completion.
              </p>
            </div>

            {/* Fee Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Fee Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Payment Amount:</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
                {fees ? (
                  <>
                    <div className="border-t border-gray-300 pt-2">
                      <div className="flex justify-between font-medium">
                        <span>You Pay:</span>
                        <span>{formatCurrency(amount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-sm mt-1">
                        <span>Platform Commission ({Math.round((fees.platformCommission / amount) * 100)}%):</span>
                        <span>-{formatCurrency(fees.platformCommission)}</span>
                      </div>
                      <div className="flex justify-between text-green-600 text-sm mt-1">
                        <span>Worker Receives:</span>
                        <span>{formatCurrency(fees.workerEarnings)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      No additional fees - TradeSafe escrow handles payment processing.
                    </p>
                  </>
                ) : (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'provider':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select Payment Provider
              </h3>
              <p className="text-sm text-gray-600">
                Choose how you&apos;d like to pay {fees ? formatCurrency(amount) : '...'}
              </p>
            </div>

            <div className="space-y-3">
              {PAYMENT_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => provider.available && setSelectedProvider(provider.id)}
                  disabled={!provider.available}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedProvider === provider.id && provider.available
                      ? 'border-secondary-500 bg-secondary-50'
                      : provider.available
                      ? 'border-gray-300 hover:border-gray-400'
                      : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{provider.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{provider.name}</span>
                        {!provider.available && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                    </div>
                    {selectedProvider === provider.id && provider.available && (
                      <div className="text-secondary-500 text-xl">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Trust Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-blue-500 text-xl mr-3">🔐</div>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Secure Payment
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    You&apos;ll be redirected to {getSelectedProviderDetails()?.name} to enter your payment details securely.
                    We never store your card or bank details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'large-amount-confirm':
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-6">
              <div className="flex items-start">
                <div className="text-4xl mr-4">⚠️</div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">
                    Large Payment Amount
                  </h3>
                  <p className="text-orange-800 mb-4">
                    You are about to make a payment of <span className="font-bold">{formatCurrency(amount)}</span>.
                    This exceeds our large payment threshold of {formatCurrency(paymentLimits.LARGE_AMOUNT_THRESHOLD)}.
                  </p>
                  <div className="bg-white rounded p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Please verify:</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>The payment amount is correct</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>The recipient is correct ({sanitizeForDisplay(workerName)})</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">✓</span>
                        <span>You have agreed on this amount with the worker</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-orange-700">
                    Once processed, this payment will be held in secure escrow until the work is completed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Payment
              </h3>
              <p className="text-sm text-gray-600">
                Please review your payment details
              </p>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Payment Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">{sanitizeForDisplay(workerName)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="capitalize">{paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-medium text-lg">{fees ? formatCurrency(amount) : '...'}</span>
                </div>
              </div>
            </div>

            {/* Selected Payment Provider */}
            {selectedProvider && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="font-medium text-secondary-900 mb-2">Payment Provider</h4>
                <div className="flex items-center space-x-3">
                  <div className="text-xl">
                    {getSelectedProviderDetails()?.icon}
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">
                      {getSelectedProviderDetails()?.name}
                    </p>
                    <p className="text-sm text-secondary-700">
                      {getSelectedProviderDetails()?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Escrow Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-yellow-400 text-xl mr-3">🔒</div>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Secure Escrow Payment
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your payment will be held in secure escrow and released to the worker
                    once the work is completed and approved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Redirecting to {getSelectedProviderDetails()?.name}
            </h3>
            <p className="text-gray-600">
              Please wait while we redirect you to complete your payment...
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {step === 'amount' ? 'Payment Amount' :
               step === 'provider' ? 'Payment Provider' :
               step === 'confirm' ? 'Confirm Payment' :
               step === 'large-amount-confirm' ? 'Confirm Large Payment' :
               'Processing Payment'}
            </CardTitle>
            {step !== 'processing' && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="flex space-x-2 mt-4">
            {['amount', 'provider', 'confirm'].map((s) => {
              const stepOrder = ['amount', 'provider', 'confirm']
              const currentStepIndex = stepOrder.indexOf(step === 'large-amount-confirm' ? 'amount' : step)
              const thisStepIndex = stepOrder.indexOf(s)

              return (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full ${
                    s === step || (step === 'large-amount-confirm' && s === 'amount') ? 'bg-secondary-500' :
                    currentStepIndex > thisStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )
            })}
          </div>
        </CardHeader>

        <CardContent>
          {renderStepContent()}

          {/* Actions */}
          {step !== 'processing' && (
            <div className="flex space-x-4 mt-6">
              {step === 'amount' ? (
                <>
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Next
                  </Button>
                </>
              ) : step === 'large-amount-confirm' ? (
                <>
                  <Button variant="outline" onClick={() => setStep('amount')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    Confirm & Continue
                  </Button>
                </>
              ) : step === 'provider' ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setLargeAmountConfirmed(false)
                    setStep('amount')
                  }} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!selectedProvider}
                    className="flex-1"
                  >
                    Next
                  </Button>
                </>
              ) : step === 'confirm' ? (
                <>
                  <Button variant="outline" onClick={() => setStep('provider')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={isLoading || !fees}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? 'Processing...' : fees ? `Pay ${formatCurrency(amount)}` : 'Calculating...'}
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
