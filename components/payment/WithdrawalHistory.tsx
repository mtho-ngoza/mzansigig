'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { usePayment } from '@/contexts/PaymentContext'

interface WithdrawalHistoryProps {
  limit?: number
}

export default function WithdrawalHistory({ limit }: WithdrawalHistoryProps) {
  const { withdrawals, formatCurrency } = usePayment()

  const displayedWithdrawals = limit ? withdrawals.slice(0, limit) : withdrawals

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'processing':
        return '🔄'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '•'
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (displayedWithdrawals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <p className="text-4xl mb-4">💸</p>
          <p className="text-lg font-medium">No withdrawals yet</p>
          <p className="text-sm mt-2">Your withdrawal history will appear here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedWithdrawals.map((withdrawal) => (
            <div
              key={withdrawal.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{getStatusIcon(withdrawal.status)}</span>
                    <div>
                      <p className="font-semibold text-lg text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(withdrawal.requestedAt)}
                      </p>
                    </div>
                  </div>

                  {withdrawal.bankDetails && (
                    <div className="ml-11 text-sm text-gray-600">
                      <p>
                        {withdrawal.bankDetails.accountHolder} • {withdrawal.bankDetails.bankName}
                      </p>
                      <p>Account ending in {withdrawal.bankDetails.accountNumber.slice(-4)}</p>
                    </div>
                  )}

                  {withdrawal.failureReason && (
                    <div className="ml-11 mt-2">
                      <p className="text-sm text-red-600">
                        <strong>Reason:</strong> {withdrawal.failureReason}
                      </p>
                    </div>
                  )}

                  {withdrawal.adminNotes && (
                    <div className="ml-11 mt-2">
                      <p className="text-sm text-gray-600">
                        <strong>Admin notes:</strong> {withdrawal.adminNotes}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                      withdrawal.status
                    )}`}
                  >
                    {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                  </span>

                  {withdrawal.status === 'pending' && (
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Awaiting review
                    </p>
                  )}
                  {withdrawal.status === 'processing' && withdrawal.processedAt && (
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Processing since {formatDate(withdrawal.processedAt)}
                    </p>
                  )}
                  {withdrawal.status === 'completed' && withdrawal.completedAt && (
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Completed {formatDate(withdrawal.completedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {limit && withdrawals.length > limit && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Showing {limit} of {withdrawals.length} withdrawals
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
