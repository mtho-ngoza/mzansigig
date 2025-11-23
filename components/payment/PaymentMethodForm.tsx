'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { usePayment } from '@/contexts/PaymentContext'
import { useToast } from '@/contexts/ToastContext'
import { PaymentMethod, PaymentProvider } from '@/types/payment'
import {
  validateAccountHolder,
  validateBankName,
  validateAccountNumber,
  validateBranchCode,
  validateCardNumber
} from '@/lib/utils/paymentValidation'

interface PaymentMethodFormProps {
  onSuccess?: (paymentMethod: PaymentMethod) => void
  onCancel?: () => void
}

export default function PaymentMethodForm({ onSuccess, onCancel }: PaymentMethodFormProps) {
  const { addPaymentMethod, isLoading } = usePayment()
  const { success: showSuccess, error: showError } = useToast()

  const [formData, setFormData] = useState({
    type: 'card' as PaymentMethod['type'],
    provider: 'payfast' as PaymentProvider,
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    bankName: '',
    accountNumber: '',
    branchCode: '',
    accountType: 'cheque' as 'cheque' | 'savings',
    accountHolder: '',
    mobileProvider: 'vodacom' as 'vodacom' | 'mtn' | 'cell_c' | 'telkom',
    mobileNumber: '',
    isDefault: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.type === 'card') {
      const cardValidation = validateCardNumber(formData.cardNumber)
      if (!cardValidation.isValid) {
        newErrors.cardNumber = cardValidation.message || 'Invalid card number'
      }

      if (!formData.expiryMonth || !formData.expiryYear) {
        newErrors.expiry = 'Expiry date is required'
      } else {
        const month = parseInt(formData.expiryMonth)
        const year = parseInt(formData.expiryYear)
        if (month < 1 || month > 12) {
          newErrors.expiry = 'Invalid expiry month (must be 01-12)'
        } else {
          const now = new Date()
          const fullYear = year < 100 ? 2000 + year : year
          const expiryDate = new Date(fullYear, month)
          if (expiryDate < now) {
            newErrors.expiry = 'Card has expired'
          }
        }
      }

      if (!formData.cvv || !/^\d{3,4}$/.test(formData.cvv)) {
        newErrors.cvv = 'CVV must be 3-4 digits'
      }

      const cardholderValidation = validateAccountHolder(formData.cardholderName)
      if (!cardholderValidation.isValid) {
        newErrors.cardholderName = cardholderValidation.message || 'Invalid cardholder name'
      }
    } else if (formData.type === 'bank' || formData.type === 'eft') {
      const bankNameValidation = validateBankName(formData.bankName)
      if (!bankNameValidation.isValid) {
        newErrors.bankName = bankNameValidation.message || 'Invalid bank name'
      }

      const accountNumberValidation = validateAccountNumber(formData.accountNumber)
      if (!accountNumberValidation.isValid) {
        newErrors.accountNumber = accountNumberValidation.message || 'Invalid account number'
      }

      const branchCodeValidation = validateBranchCode(formData.branchCode)
      if (!branchCodeValidation.isValid) {
        newErrors.branchCode = branchCodeValidation.message || 'Invalid branch code'
      }

      const accountHolderValidation = validateAccountHolder(formData.accountHolder)
      if (!accountHolderValidation.isValid) {
        newErrors.accountHolder = accountHolderValidation.message || 'Invalid account holder name'
      }
    } else if (formData.type === 'mobile_money') {
      if (!formData.mobileNumber || !/^(\+27|0)[0-9]{9}$/.test(formData.mobileNumber)) {
        newErrors.mobileNumber = 'Invalid South African mobile number (must start with +27 or 0 and have 9 digits)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const getCardBrand = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, '')
    if (/^4/.test(number)) return 'Visa'
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'Mastercard'
    if (/^3[47]/.test(number)) return 'American Express'
    return 'Unknown'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const paymentMethodData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'> = {
        type: formData.type,
        provider: formData.provider,
        isDefault: formData.isDefault,
        isVerified: false
      }

      if (formData.type === 'card') {
        const cardNumber = formData.cardNumber.replace(/\s/g, '')
        // Only store last 4 digits - never store full card number
        paymentMethodData.cardLast4 = cardNumber.slice(-4)
        paymentMethodData.cardBrand = getCardBrand(cardNumber)
        paymentMethodData.cardType = 'debit' // Default to debit, could be detected
        paymentMethodData.expiryMonth = parseInt(formData.expiryMonth)
        paymentMethodData.expiryYear = parseInt(formData.expiryYear)
        // Validate and sanitize cardholder name
        const cardholderValidation = validateAccountHolder(formData.cardholderName)
        paymentMethodData.accountHolder = cardholderValidation.sanitized
      } else if (formData.type === 'bank' || formData.type === 'eft') {
        // Validate and sanitize bank details
        const bankNameValidation = validateBankName(formData.bankName)
        const accountHolderValidation = validateAccountHolder(formData.accountHolder)

        paymentMethodData.bankName = bankNameValidation.sanitized
        paymentMethodData.accountHolder = accountHolderValidation.sanitized
        paymentMethodData.accountType = formData.accountType
        paymentMethodData.accountLast4 = formData.accountNumber.slice(-4)
      } else if (formData.type === 'mobile_money') {
        paymentMethodData.mobileProvider = formData.mobileProvider
        paymentMethodData.mobileNumber = formData.mobileNumber
      }

      const newPaymentMethod = await addPaymentMethod(paymentMethodData)
      showSuccess('Payment method added successfully')
      onSuccess?.(newPaymentMethod)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add payment method. Please check your details and try again.'
      showError(errorMessage)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: 'card', label: 'Card', icon: '💳' },
                { value: 'bank', label: 'Bank', icon: '🏦' },
                { value: 'mobile_money', label: 'Mobile', icon: '📱' },
                { value: 'eft', label: 'EFT', icon: '💰' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('type', option.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    formData.type === option.value
                      ? 'border-secondary-500 bg-secondary-50 text-secondary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Provider
            </label>
            <select
              value={formData.provider}
              onChange={(e) => handleInputChange('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="payfast">PayFast (Recommended for SA)</option>
              <option value="ozow">Ozow</option>
              <option value="yoco">Yoco</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          {/* Card Details */}
          {formData.type === 'card' && (
            <div className="space-y-4">
              <div>
                <Input
                  label="Cardholder Name"
                  value={formData.cardholderName}
                  onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                  error={errors.cardholderName}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Input
                  label="Card Number"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                  error={errors.cardNumber}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
                {formData.cardNumber && (
                  <div className="mt-1 text-sm text-gray-600">
                    {getCardBrand(formData.cardNumber)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Input
                    label="Expiry Month"
                    value={formData.expiryMonth}
                    onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                    error={errors.expiry}
                    placeholder="MM"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Input
                    label="Expiry Year"
                    value={formData.expiryYear}
                    onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                    placeholder="YY"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Input
                    label="CVV"
                    value={formData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    error={errors.cvv}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Details */}
          {(formData.type === 'bank' || formData.type === 'eft') && (
            <div className="space-y-4">
              <div>
                <Input
                  label="Bank Name"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  error={errors.bankName}
                  placeholder="Standard Bank"
                />
              </div>

              <div>
                <Input
                  label="Account Holder Name"
                  value={formData.accountHolder}
                  onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                  error={errors.accountHolder}
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Account Number"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    error={errors.accountNumber}
                    placeholder="1234567890"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Input
                    label="Branch Code"
                    value={formData.branchCode}
                    onChange={(e) => handleInputChange('branchCode', e.target.value.replace(/\D/g, ''))}
                    error={errors.branchCode}
                    placeholder="051001"
                    maxLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => handleInputChange('accountType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="cheque">Cheque Account</option>
                  <option value="savings">Savings Account</option>
                </select>
              </div>
            </div>
          )}

          {/* Mobile Money Details */}
          {formData.type === 'mobile_money' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Provider
                </label>
                <select
                  value={formData.mobileProvider}
                  onChange={(e) => handleInputChange('mobileProvider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="vodacom">Vodacom</option>
                  <option value="mtn">MTN</option>
                  <option value="cell_c">Cell C</option>
                  <option value="telkom">Telkom</option>
                </select>
              </div>

              <div>
                <Input
                  label="Mobile Number"
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                  error={errors.mobileNumber}
                  placeholder="+27 82 123 4567"
                />
              </div>
            </div>
          )}

          {/* Default Payment Method */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="h-4 w-4 text-secondary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Set as default payment method
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Adding...' : 'Add Payment Method'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}