'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { usePayment } from '@/contexts/PaymentContext'
import { useToast } from '@/contexts/ToastContext'
import { PaymentMethod } from '@/types/payment'
import { isCardExpiringSoon, isCardExpired } from '@/lib/utils/paymentValidation'

interface PaymentMethodListProps {
  onAddNew?: () => void
  onSelectMethod?: (method: PaymentMethod) => void
  selectable?: boolean
  selectedMethodId?: string
}

export default function PaymentMethodList({
  onAddNew,
  onSelectMethod,
  selectable = false,
  selectedMethodId
}: PaymentMethodListProps) {
  const { paymentMethods, setDefaultPaymentMethod, deletePaymentMethod, isLoading } = usePayment()
  const { success: showSuccess, error: showError } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return '💳'
      case 'bank':
        return '🏦'
      case 'mobile_money':
        return '📱'
      case 'eft':
        return '💰'
      default:
        return '💳'
    }
  }

  const getPaymentMethodTitle = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return `${method.cardBrand || 'Card'} ending in ${method.cardLast4}`
      case 'bank':
        return `${method.bankName} ending in ${method.accountLast4}`
      case 'mobile_money':
        return `${method.mobileProvider?.toUpperCase()} ${method.mobileNumber}`
      case 'eft':
        return `EFT - ${method.bankName} ending in ${method.accountLast4}`
      default:
        return 'Payment Method'
    }
  }

  const getPaymentMethodSubtitle = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return `Expires ${String(method.expiryMonth).padStart(2, '0')}/${method.expiryYear} • ${method.cardType?.charAt(0).toUpperCase()}${method.cardType?.slice(1)}`
      case 'bank':
        return `${method.accountType?.charAt(0).toUpperCase()}${method.accountType?.slice(1)} Account`
      case 'mobile_money':
        return 'Mobile Money'
      case 'eft':
        return `${method.accountType?.charAt(0).toUpperCase()}${method.accountType?.slice(1)} Account`
      default:
        return method.provider?.toUpperCase()
    }
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      await setDefaultPaymentMethod(methodId)
      showSuccess('Default payment method updated')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update default payment method'
      showError(errorMessage)
    }
  }

  const handleDelete = async (methodId: string, methodTitle: string) => {
    if (!confirm(`Are you sure you want to delete ${methodTitle}? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingId(methodId)
      await deletePaymentMethod(methodId)
      showSuccess('Payment method deleted successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete payment method'
      showError(errorMessage)
    } finally {
      setDeletingId(null)
    }
  }

  const getVerificationStatus = (method: PaymentMethod) => {
    // Check for card expiry warnings
    if (method.type === 'card' && method.expiryMonth && method.expiryYear) {
      if (isCardExpired(method.expiryMonth, method.expiryYear)) {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ⚠️ Expired
          </span>
        )
      }
      if (isCardExpiringSoon(method.expiryMonth, method.expiryYear)) {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            ⚠️ Expiring Soon
          </span>
        )
      }
    }

    if (method.isVerified) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Verified
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        ⏳ Pending
      </span>
    )
  }

  if (paymentMethods.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Payment Methods
          </h3>
          <p className="text-gray-600 mb-6">
            Add a payment method to start making payments and receiving earnings.
          </p>
          {onAddNew && (
            <Button onClick={onAddNew}>
              Add Payment Method
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
        {onAddNew && (
          <Button variant="outline" onClick={onAddNew}>
            Add New
          </Button>
        )}
      </div>

      {/* Payment Methods List */}
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`transition-all ${
              selectable
                ? 'cursor-pointer hover:shadow-md'
                : ''
            }`}
            onClick={() => selectable && onSelectMethod?.(method)}
          >
            <Card
              className={`${
                selectedMethodId === method.id
                  ? 'ring-2 ring-secondary-500 bg-secondary-50'
                  : ''
              }`}
            >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getPaymentMethodIcon(method)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {getPaymentMethodTitle(method)}
                      </h3>
                      {method.isDefault && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-600">
                        {getPaymentMethodSubtitle(method)}
                      </p>
                      <div className="text-xs text-gray-500">
                        via {method.provider?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getVerificationStatus(method)}

                  {!selectable && (
                    <div className="flex space-x-2">
                      {!method.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                          disabled={isLoading || deletingId === method.id}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(method.id, getPaymentMethodTitle(method))}
                        disabled={isLoading || deletingId === method.id}
                        className="text-red-600 hover:bg-red-50 border-red-300"
                      >
                        {deletingId === method.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Added {method.createdAt.toLocaleDateString()}</span>
                  {method.updatedAt && method.updatedAt.getTime() !== method.createdAt.getTime() && (
                    <span>Updated {method.updatedAt.toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <div className="text-secondary-400 text-xl">ℹ️</div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-secondary-800">
              Payment Method Security
            </h3>
            <div className="mt-2 text-sm text-secondary-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Your payment information is encrypted and secure</li>
                <li>We never store your full card details</li>
                <li>Bank details are verified before first use</li>
                <li>You can update or remove methods anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}