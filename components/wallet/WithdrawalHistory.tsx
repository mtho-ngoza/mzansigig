'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PaymentService } from '@/lib/services/paymentService'
import { WithdrawalRequest } from '@/types/payment'

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

export default function WithdrawalHistory() {
  const { user } = useAuth()
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    if (user) {
      loadWithdrawals()
    }
  }, [user])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredWithdrawals(withdrawals)
    } else {
      setFilteredWithdrawals(withdrawals.filter(w => w.status === filter))
    }
  }, [filter, withdrawals])

  const loadWithdrawals = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      console.log('Loading withdrawals for user:', user.id)
      const data = await PaymentService.getUserWithdrawals(user.id)
      console.log('Withdrawal data loaded:', data.length, 'items')
      setWithdrawals(data)
    } catch (error) {
      console.error('Error loading withdrawal history:', error)
      setError(error instanceof Error ? error.message : 'Failed to load withdrawal history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: WithdrawalRequest['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    }

    const icons = {
      pending: '⏳',
      processing: '⚙️',
      completed: '✓',
      failed: '✗'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <span>{icons[status]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading withdrawal history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-8 text-center">
        <div className="text-red-400 mb-3">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-900 mb-1">Failed to Load Withdrawals</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => loadWithdrawals()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal History</h2>
        <p className="text-gray-600">Track the status of your withdrawal requests</p>
      </div>

      {/* Filter Tabs */}
      {withdrawals.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'pending', 'completed', 'failed'] as FilterStatus[]).map((status) => {
            const count = status === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === status).length
            const isActive = filter === status

            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {count > 0 && (
                  <span className={`ml-2 ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                    ({count})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Withdrawals List */}
      {filteredWithdrawals.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-3">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No {filter !== 'all' && `${filter} `}withdrawals
          </h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "You haven't made any withdrawal requests yet."
              : `You don't have any ${filter} withdrawal requests.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWithdrawals.map((withdrawal) => (
            <div
              key={withdrawal.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-gray-900">
                    R{withdrawal.amount.toFixed(2)}
                  </h3>
                  {getStatusBadge(withdrawal.status)}
                </div>
                <div className="text-sm text-gray-500">
                  Requested: {formatDate(withdrawal.requestedAt)}
                </div>
              </div>

              {/* Bank Details */}
              {withdrawal.bankDetails && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Bank Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Bank:</span>{' '}
                      <span className="text-gray-900 font-medium">{withdrawal.bankDetails.bankName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Account:</span>{' '}
                      <span className="text-gray-900 font-medium">
                        ****{withdrawal.bankDetails.accountNumber.slice(-4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>{' '}
                      <span className="text-gray-900 font-medium capitalize">
                        {withdrawal.bankDetails.accountType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Holder:</span>{' '}
                      <span className="text-gray-900 font-medium">
                        {withdrawal.bankDetails.accountHolder}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Details */}
              <div className="space-y-2 text-sm">
                {withdrawal.status === 'pending' && (
                  <div className="flex items-start gap-2 text-yellow-800 bg-yellow-50 rounded p-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium">Awaiting Admin Approval</p>
                      <p className="text-yellow-700 mt-1">
                        Your withdrawal is being reviewed. This usually takes 1-2 business days.
                      </p>
                    </div>
                  </div>
                )}

                {withdrawal.status === 'processing' && withdrawal.processedAt && (
                  <div className="flex items-start gap-2 text-blue-800 bg-blue-50 rounded p-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div>
                      <p className="font-medium">Processing Transfer</p>
                      <p className="text-blue-700 mt-1">
                        Started: {formatDate(withdrawal.processedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {withdrawal.status === 'completed' && withdrawal.completedAt && (
                  <div className="flex items-start gap-2 text-green-800 bg-green-50 rounded p-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium">Withdrawal Completed</p>
                      <p className="text-green-700 mt-1">
                        Completed: {formatDate(withdrawal.completedAt)}
                      </p>
                      {withdrawal.adminNotes && (
                        <p className="text-green-700 text-xs mt-1 italic">
                          Note: {withdrawal.adminNotes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {withdrawal.status === 'failed' && (
                  <div className="flex items-start gap-2 text-red-800 bg-red-50 rounded p-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium">Withdrawal Failed</p>
                      {withdrawal.failureReason && (
                        <p className="text-red-700 mt-1">
                          Reason: {withdrawal.failureReason}
                        </p>
                      )}
                      <p className="text-red-700 mt-1 text-xs">
                        The amount has been refunded to your wallet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
