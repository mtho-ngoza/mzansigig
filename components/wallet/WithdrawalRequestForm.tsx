'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PaymentService } from '@/lib/services/paymentService'
import { WalletService } from '@/lib/services/walletService'
import { PaymentMethod, BankAccount } from '@/types/payment'

interface WithdrawalRequestFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function WithdrawalRequestForm({ onSuccess, onCancel }: WithdrawalRequestFormProps) {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: '',
    bankName: '',
    accountNumber: '',
    branchCode: '',
    accountHolder: '',
    accountType: 'cheque' as 'cheque' | 'savings'
  })

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        // Load wallet balance
        const balance = await WalletService.getWalletBalance(user.id)
        setAvailableBalance(balance.walletBalance)

        // Load payment methods
        const methods = await PaymentService.getUserPaymentMethods(user.id)
        setPaymentMethods(methods)

        // Set default payment method if exists
        const defaultMethod = methods.find(m => m.isDefault)
        if (defaultMethod) {
          setFormData(prev => ({ ...prev, paymentMethod: defaultMethod.id }))
        }
      } catch (err) {
        console.error('Error loading withdrawal data:', err)
      }
    }

    loadData()
  }, [user])

  if (!user) return null

  if (user.userType !== 'job-seeker') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Withdrawal requests are only available for job seekers.</p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const amount = parseFloat(formData.amount)

      // Validation
      if (isNaN(amount) || amount <= 0) {
        showError('Please enter a valid amount')
        setIsSubmitting(false)
        return
      }

      if (amount > availableBalance) {
        showError('Insufficient balance')
        setIsSubmitting(false)
        return
      }

      if (amount < 50) {
        showError('Minimum withdrawal amount is R50')
        setIsSubmitting(false)
        return
      }

      // Bank details
      const bankDetails: BankAccount = {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        branchCode: formData.branchCode,
        accountHolder: formData.accountHolder,
        accountType: formData.accountType,
        isVerified: false
      }

      // Request withdrawal
      await PaymentService.requestWithdrawal(
        user.id,
        amount,
        formData.paymentMethod || 'manual',
        bankDetails
      )

      showSuccess(`Withdrawal request of R${amount.toFixed(2)} submitted successfully!`)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Error submitting withdrawal request:', err)
      showError('Failed to submit withdrawal request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Withdrawal</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Withdraw funds from your wallet to your bank account
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Available Balance Display */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-700 font-medium">Available Balance</div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              R{availableBalance.toFixed(2)}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount (R) *
            </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="50"
              max={availableBalance}
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount (min R50)"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Minimum withdrawal: R50 | Maximum: R{availableBalance.toFixed(2)}
            </p>
          </div>

          {/* Bank Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Details</h3>

            <div className="space-y-4">
              {/* Account Holder */}
              <div>
                <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <Input
                  id="accountHolder"
                  type="text"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountHolder: e.target.value }))}
                  placeholder="Full name as per bank records"
                  required
                />
              </div>

              {/* Bank Name */}
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <select
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select bank</option>
                  <option value="ABSA">ABSA</option>
                  <option value="Standard Bank">Standard Bank</option>
                  <option value="FNB">FNB</option>
                  <option value="Nedbank">Nedbank</option>
                  <option value="Capitec">Capitec</option>
                  <option value="Discovery Bank">Discovery Bank</option>
                  <option value="TymeBank">TymeBank</option>
                  <option value="African Bank">African Bank</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Account Number & Branch Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number *
                  </label>
                  <Input
                    id="accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Account number"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="branchCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Code *
                  </label>
                  <Input
                    id="branchCode"
                    type="text"
                    value={formData.branchCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, branchCode: e.target.value }))}
                    placeholder="Branch code"
                    required
                  />
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type *
                </label>
                <select
                  id="accountType"
                  value={formData.accountType}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value as 'cheque' | 'savings' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="cheque">Cheque/Current</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-blue-600 text-lg mr-2">ℹ️</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Processing Time</p>
                <p>Withdrawal requests are processed within 1-3 business days. You will be notified once your withdrawal has been processed.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || availableBalance <= 0}
              isLoading={isSubmitting}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
