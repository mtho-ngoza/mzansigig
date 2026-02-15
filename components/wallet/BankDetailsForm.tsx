'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { auth } from '@/lib/firebase'

const SUPPORTED_BANKS = [
  'ABSA',
  'FNB',
  'Nedbank',
  'Standard Bank',
  'Capitec',
  'African Bank',
  'TymeBank',
  'Discovery Bank',
  'Investec'
]

interface BankDetails {
  bankName: string
  accountNumber: string
  accountType: 'CHEQUE' | 'SAVINGS'
  accountHolder: string
  addedAt?: Date
}

interface BankDetailsFormProps {
  onSuccess?: () => void
}

export default function BankDetailsForm({ onSuccess }: BankDetailsFormProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [existingDetails, setExistingDetails] = useState<BankDetails | null>(null)

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountType: 'SAVINGS' as 'CHEQUE' | 'SAVINGS',
    accountHolder: ''
  })

  useEffect(() => {
    loadExistingDetails()
  }, [user])

  const loadExistingDetails = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const firebaseUser = auth.currentUser
      if (!firebaseUser) return
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/user/bank-details', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.hasBankDetails) {
          setExistingDetails(data.bankDetails)
        }
      }
    } catch (err) {
      console.error('Error loading bank details:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate
    if (!formData.bankName || !formData.accountNumber || !formData.accountHolder) {
      setError('Please fill in all required fields')
      return
    }

    if (!/^\d{10,11}$/.test(formData.accountNumber)) {
      setError('Account number must be 10-11 digits')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const firebaseUser = auth.currentUser
      if (!firebaseUser) {
        setError('Session expired. Please sign in again.')
        return
      }
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/user/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save bank details')
      }

      setSuccess(data.message)
      setExistingDetails(data.bankDetails)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bank details')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (existingDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Bank Account Linked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 mb-3">
              Your bank account is linked. Payments will be sent directly to your account.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Bank:</span>
                <span className="font-medium">{existingDetails.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account:</span>
                <span className="font-medium">{existingDetails.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{existingDetails.accountType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Holder:</span>
                <span className="font-medium">{existingDetails.accountHolder}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Bank Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            Add your bank details to receive payments directly to your account when gigs are completed.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name *
            </label>
            <select
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your bank</option>
              {SUPPORTED_BANKS.map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={formData.accountHolder}
              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
              placeholder="Name as it appears on your account"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number *
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
              placeholder="10-11 digit account number"
              maxLength={11}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accountType"
                  value="SAVINGS"
                  checked={formData.accountType === 'SAVINGS'}
                  onChange={() => setFormData({ ...formData, accountType: 'SAVINGS' })}
                  className="mr-2"
                />
                Savings
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accountType"
                  value="CHEQUE"
                  checked={formData.accountType === 'CHEQUE'}
                  onChange={() => setFormData({ ...formData, accountType: 'CHEQUE' })}
                  className="mr-2"
                />
                Cheque
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Save Bank Details'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
