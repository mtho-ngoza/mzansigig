'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { usePayment } from '@/contexts/PaymentContext'
import { useToast } from '@/contexts/ToastContext'
import { BankAccount } from '@/types/payment'
import {
  validateAccountHolder,
  validateBankName,
  validateAccountNumber,
  validateBranchCode,
  validateWithdrawalAmount,
  WITHDRAWAL_LIMITS
} from '@/lib/utils/paymentValidation'

interface WithdrawalFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function WithdrawalForm({ onSuccess, onCancel }: WithdrawalFormProps) {
  const { requestWithdrawal, paymentMethods, analytics, formatCurrency, isLoading } = usePayment()
  const { success: showSuccess, error: showError } = useToast()

  const [amount, setAmount] = useState('')
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [bankDetails, setBankDetails] = useState<BankAccount>({
    bankName: '',
    accountNumber: '',
    branchCode: '',
    accountHolder: '',
    accountType: 'cheque',
    isVerified: false
  })
  const [useExistingMethod, setUseExistingMethod] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const availableBalance = analytics?.availableBalance || 0
  const minWithdrawal = WITHDRAWAL_LIMITS.MIN

  const bankOptions = [
    'ABSA Bank', 'Standard Bank', 'FirstNational Bank (FNB)', 'Nedbank',
    'Capitec Bank', 'Discovery Bank', 'TymeBank', 'Bank Zero',
    'African Bank', 'Bidvest Bank', 'Investec Bank', 'Mercantile Bank',
    'Sasfin Bank', 'The South African Bank of Athens'
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    const withdrawalAmount = parseFloat(amount)
    const validation = validateWithdrawalAmount(withdrawalAmount, availableBalance, 0)
    if (!validation.isValid) {
      newErrors.amount = validation.message || 'Invalid withdrawal amount'
    }

    if (useExistingMethod) {
      if (!selectedMethodId) {
        newErrors.method = 'Please select a payment method'
      }
    } else {
      const bankNameValidation = validateBankName(bankDetails.bankName)
      if (!bankNameValidation.isValid) {
        newErrors.bankName = bankNameValidation.message || 'Invalid bank name'
      }

      const accountHolderValidation = validateAccountHolder(bankDetails.accountHolder)
      if (!accountHolderValidation.isValid) {
        newErrors.accountHolder = accountHolderValidation.message || 'Invalid account holder name'
      }

      const accountNumberValidation = validateAccountNumber(bankDetails.accountNumber)
      if (!accountNumberValidation.isValid) {
        newErrors.accountNumber = accountNumberValidation.message || 'Invalid account number'
      }

      const branchCodeValidation = validateBranchCode(bankDetails.branchCode)
      if (!branchCodeValidation.isValid) {
        newErrors.branchCode = branchCodeValidation.message || 'Invalid branch code'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const withdrawalAmount = parseFloat(amount)
      const methodId = useExistingMethod ? selectedMethodId : 'new'

      // Sanitize bank details if adding new account
      let bankData = undefined
      if (!useExistingMethod) {
        const bankNameValidation = validateBankName(bankDetails.bankName)
        const accountHolderValidation = validateAccountHolder(bankDetails.accountHolder)

        bankData = {
          ...bankDetails,
          bankName: bankNameValidation.sanitized,
          accountHolder: accountHolderValidation.sanitized
        }
      }

      await requestWithdrawal(withdrawalAmount, methodId, bankData)

      showSuccess(`Withdrawal request for ${formatCurrency(withdrawalAmount)} submitted successfully`)
      onSuccess?.()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit withdrawal request. Please check your details and try again.'
      showError(errorMessage)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'amount') {
      setAmount(value)
    } else if (field === 'selectedMethodId') {
      setSelectedMethodId(value)
    } else {
      setBankDetails(prev => ({ ...prev, [field]: value }))
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const eligibleMethods = paymentMethods.filter(method =>
    method.type === 'bank' || method.type === 'eft'
  )

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Balance Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Available Balance</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(availableBalance)}
              </p>
            </div>
            <div className="text-4xl text-green-600">💰</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Withdrawal Amount */}
          <div>
            <Input
              label="Withdrawal Amount (ZAR)"
              type="number"
              value={amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              error={errors.amount}
              placeholder="50.00"
              min={minWithdrawal}
              max={availableBalance}
              step="0.01"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Minimum: {formatCurrency(minWithdrawal)}</span>
              <span>Max per transaction: {formatCurrency(WITHDRAWAL_LIMITS.MAX_SINGLE)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Daily limit: {formatCurrency(WITHDRAWAL_LIMITS.MAX_DAILY)}
            </p>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Withdrawal Method
            </label>

            <div className="space-y-3">
              {/* Use Existing Method */}
              {eligibleMethods.length > 0 && (
                <div>
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="withdrawalMethod"
                      checked={useExistingMethod}
                      onChange={(e) => setUseExistingMethod(e.target.checked)}
                      className="h-4 w-4 text-secondary-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Use existing bank account</div>
                      <div className="text-sm text-gray-600">Select from your saved payment methods</div>
                    </div>
                  </label>

                  {useExistingMethod && (
                    <div className="mt-3 ml-7">
                      <select
                        value={selectedMethodId}
                        onChange={(e) => handleInputChange('selectedMethodId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select a bank account</option>
                        {eligibleMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.accountHolder ? `${method.accountHolder} - ` : ''}{method.bankName} ending in {method.accountLast4} ({method.accountType})
                          </option>
                        ))}
                      </select>
                      {errors.method && (
                        <p className="mt-1 text-sm text-red-600">{errors.method}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Add New Bank Account */}
              <div>
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="withdrawalMethod"
                    checked={!useExistingMethod}
                    onChange={(e) => setUseExistingMethod(!e.target.checked)}
                    className="h-4 w-4 text-secondary-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Add new bank account</div>
                    <div className="text-sm text-gray-600">Your bank details will be saved securely for future withdrawals</div>
                  </div>
                </label>

                {!useExistingMethod && (
                  <div className="mt-3 ml-7 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <select
                        value={bankDetails.bankName}
                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select your bank</option>
                        {bankOptions.map((bank) => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                      {errors.bankName && (
                        <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
                      )}
                    </div>

                    <div>
                      <Input
                        label="Account Holder Name"
                        value={bankDetails.accountHolder}
                        onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                        error={errors.accountHolder}
                        placeholder="Full name as on bank account"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Account Number"
                          value={bankDetails.accountNumber}
                          onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                          error={errors.accountNumber}
                          placeholder="1234567890"
                          maxLength={11}
                        />
                      </div>
                      <div>
                        <Input
                          label="Branch Code"
                          value={bankDetails.branchCode}
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
                        value={bankDetails.accountType}
                        onChange={(e) => handleInputChange('accountType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="cheque">Cheque Account</option>
                        <option value="savings">Savings Account</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Processing Info */}
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
            <h4 className="font-medium text-secondary-900 mb-2">Withdrawal Information</h4>
            <ul className="text-sm text-secondary-800 space-y-1">
              <li>• Processing time: 1-3 business days</li>
              <li>• No withdrawal fees</li>
              <li>• Withdrawals processed Monday to Friday</li>
              <li>• You&apos;ll receive an email confirmation</li>
            </ul>
          </div>

          {/* Summary */}
          {amount && parseFloat(amount) >= minWithdrawal && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Withdrawal Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Withdrawal Amount:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Fee:</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>You&apos;ll Receive:</span>
                    <span>{formatCurrency(parseFloat(amount))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={isLoading || !amount || parseFloat(amount) < minWithdrawal}
              className="flex-1"
            >
              {isLoading ? 'Processing...' : 'Request Withdrawal'}
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