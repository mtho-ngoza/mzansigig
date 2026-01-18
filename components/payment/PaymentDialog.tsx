'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { usePayment } from '@/contexts/PaymentContext'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { PaymentMethod, Payment } from '@/types/payment'
import PaymentMethodList from './PaymentMethodList'
import PaymentMethodForm from './PaymentMethodForm'
import { sanitizeForDisplay } from '@/lib/utils/textSanitization'
import { validatePaymentAmount, PAYMENT_LIMITS } from '@/lib/utils/paymentValidation'

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
  onSuccess,
  onCancel,
  isOpen
}: PaymentDialogProps) {
  const {
    paymentMethods,
    createPaymentIntent,
    processPayment,
    calculateFees,
    formatCurrency,
    isLoading
  } = usePayment()
  const { success: showSuccess, error: showError } = useToast()
  const { user } = useAuth()

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [customAmount, setCustomAmount] = useState(amount.toString())
  const [paymentType, setPaymentType] = useState<'fixed' | 'milestone' | 'bonus'>('fixed')
  const [step, setStep] = useState<'amount' | 'method' | 'add-method' | 'confirm' | 'large-amount-confirm' | 'processing'>('amount')
  const [fees, setFees] = useState<{
    platformFee: number
    processingFee: number
    fixedFee: number
    totalFees: number
    netAmount: number
  } | null>(null)
  const [largeAmountConfirmed, setLargeAmountConfirmed] = useState(false)

  useEffect(() => {
    if (paymentMethods.length > 0) {
      const defaultMethod = paymentMethods.find(m => m.isDefault) || paymentMethods[0]
      setSelectedMethod(defaultMethod)
    }
  }, [paymentMethods])

  useEffect(() => {
    setCustomAmount(amount.toString())
  }, [amount])

  // Calculate fees when amount changes
  useEffect(() => {
    const loadFees = async () => {
      try {
        const finalAmount = parseFloat(customAmount) || amount
        const calculatedFees = await calculateFees(finalAmount)
        setFees(calculatedFees)
      } catch (error) {
        console.error('Error calculating fees:', error)
        setFees(null)
      }
    }

    const finalAmount = parseFloat(customAmount) || amount
    if (finalAmount > 0) {
      loadFees()
    }
  }, [customAmount, amount, calculateFees])

  if (!isOpen) return null

  const finalAmount = parseFloat(customAmount) || amount

  const handleNext = () => {
    if (step === 'amount') {
      const validation = validatePaymentAmount(finalAmount)
      if (!validation.isValid) {
        showError(validation.message || 'Invalid payment amount')
        return
      }
      // Check if large amount confirmation is required
      if (validation.requiresConfirmation && !largeAmountConfirmed) {
        setStep('large-amount-confirm')
        return
      }
      setStep('method')
    } else if (step === 'method') {
      if (!selectedMethod) {
        showError('Please select a payment method')
        return
      }
      setStep('confirm')
    } else if (step === 'large-amount-confirm') {
      setLargeAmountConfirmed(true)
      setStep('method')
    }
  }

  const handlePayment = async () => {
    if (!selectedMethod) return

    try {
      setStep('processing')

      // For PayFast provider, redirect to PayFast payment page
      if (selectedMethod.provider === 'payfast') {
        // Verify user is authenticated
        if (!user) {
          showError('Please sign in to continue with payment')
          setStep('confirm')
          return
        }

        // Create PayFast payment
        const response = await fetch('/api/payments/payfast/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify({
            gigId,
            amount: finalAmount,
            itemName: description || `Payment for gig work to ${workerName}`,
            itemDescription: `Funding gig ${gigId}`,
            customerEmail: user.email,
            customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to create PayFast payment')
        }

        // Get the HTML form that will redirect to PayFast
        const html = await response.text()

        // Open payment in current window (user will be redirected to PayFast)
        const paymentWindow = window.open('', '_self')
        if (paymentWindow) {
          paymentWindow.document.write(html)
          paymentWindow.document.close()
        } else {
          // Fallback: write to current document
          document.write(html)
          document.close()
        }

        return
      }

      // For other providers, use the old flow (will need backend API routes)
      // Create payment intent
      const intent = await createPaymentIntent(
        gigId,
        workerId,
        finalAmount,
        selectedMethod.id,
        paymentType
      )

      // Process payment
      const payment = await processPayment(intent.id)

      showSuccess('Payment processed successfully!')
      onSuccess?.(payment)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      showError(errorMessage)
      setStep('confirm')
    }
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

            <div>
              <Input
                label="Amount (ZAR)"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="100.00"
                min="100"
                step="0.01"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum payment: R100
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'fixed', label: 'Fixed Payment', desc: 'One-time payment' },
                  { value: 'milestone', label: 'Milestone', desc: 'Project milestone' },
                  { value: 'bonus', label: 'Bonus', desc: 'Additional reward' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentType(option.value as 'fixed' | 'milestone' | 'bonus')}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      paymentType === option.value
                        ? 'border-secondary-500 bg-secondary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Fee Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Payment Amount:</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
{fees ? (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform Fee:</span>
                    <span>{formatCurrency(fees.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Processing Fee:</span>
                    <span>{formatCurrency(fees.processingFee)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Transaction Fee:</span>
                    <span>{formatCurrency(fees.fixedFee)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total Cost:</span>
                      <span>{formatCurrency(finalAmount + fees.totalFees)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 text-xs mt-1">
                      <span>Worker Receives:</span>
                      <span>{formatCurrency(fees.netAmount)}</span>
                    </div>
                  </div>
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

      case 'method':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select Payment Method
              </h3>
              <p className="text-sm text-gray-600">
                Choose how you&apos;d like to pay {fees ? formatCurrency(finalAmount + fees.totalFees) : '...'}
              </p>
            </div>

            <PaymentMethodList
              selectable
              selectedMethodId={selectedMethod?.id}
              onSelectMethod={setSelectedMethod}
            />

            {paymentMethods.length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">
                  You need to add a payment method first
                </p>
                <Button onClick={() => setStep('add-method')}>
                  Add Payment Method
                </Button>
              </div>
            )}
          </div>
        )

      case 'add-method':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add Payment Method
              </h3>
              <p className="text-sm text-gray-600">
                Add a new payment method to continue with payment
              </p>
            </div>

            <PaymentMethodForm
              onSuccess={(newMethod) => {
                setSelectedMethod(newMethod)
                setStep('confirm')
                showSuccess('Payment method added successfully!')
              }}
              onCancel={() => setStep('method')}
            />
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
                    You are about to make a payment of <span className="font-bold">{formatCurrency(finalAmount)}</span>.
                    This exceeds our large payment threshold of {formatCurrency(PAYMENT_LIMITS.LARGE_AMOUNT_THRESHOLD)}.
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
                  <span className="font-medium">{formatCurrency(finalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="capitalize">{paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-medium text-lg">{fees ? formatCurrency(finalAmount + fees.totalFees) : '...'}</span>
                </div>
              </div>
            </div>

            {/* Selected Payment Method */}
            {selectedMethod && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="font-medium text-secondary-900 mb-2">Payment Method</h4>
                <div className="flex items-center space-x-3">
                  <div className="text-xl">
                    {selectedMethod.type === 'card' ? '💳' :
                     selectedMethod.type === 'bank' ? '🏦' :
                     selectedMethod.type === 'mobile_money' ? '📱' : '💰'}
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">
                      {selectedMethod.type === 'card'
                        ? `${selectedMethod.cardBrand} ending in ${selectedMethod.cardLast4}`
                        : selectedMethod.type === 'bank'
                        ? `${selectedMethod.bankName} ending in ${selectedMethod.accountLast4}`
                        : `${selectedMethod.mobileProvider} ${selectedMethod.mobileNumber}`}
                    </p>
                    <p className="text-sm text-secondary-700">
                      via {selectedMethod.provider?.toUpperCase()}
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
              Processing Payment
            </h3>
            <p className="text-gray-600">
              Please wait while we process your payment...
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
               step === 'method' ? 'Payment Method' :
               step === 'add-method' ? 'Add Payment Method' :
               step === 'confirm' ? 'Confirm Payment' :
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
            {['amount', 'method', 'confirm'].map((s) => {
              const stepOrder = ['amount', 'method', 'add-method', 'confirm']
              const currentStepIndex = stepOrder.indexOf(step)
              const thisStepIndex = stepOrder.indexOf(s)

              return (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full ${
                    s === step || (step === 'add-method' && s === 'method') ? 'bg-secondary-500' :
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
          {step !== 'processing' && step !== 'add-method' && (
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
              ) : step === 'method' ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setLargeAmountConfirmed(false)
                    setStep('amount')
                  }} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!selectedMethod}
                    className="flex-1"
                  >
                    Next
                  </Button>
                </>
              ) : step === 'confirm' ? (
                <>
                  <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? 'Processing...' : fees ? `Pay ${formatCurrency(finalAmount + fees.totalFees)}` : 'Calculating...'}
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