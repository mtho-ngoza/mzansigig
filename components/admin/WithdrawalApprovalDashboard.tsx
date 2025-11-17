'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PaymentService } from '@/lib/services/paymentService'
import { WithdrawalRequest } from '@/types/payment'
import { User } from '@/types/auth'
import { isAdmin } from '@/lib/utils/adminAuth'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

export default function WithdrawalApprovalDashboard() {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [workerDetails, setWorkerDetails] = useState<Record<string, User>>({})

  useEffect(() => {
    if (user && !isAdmin(user)) {
      showError('Admin access required')
      return
    }
    loadWithdrawals()
  }, [user])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredWithdrawals(withdrawals)
    } else {
      setFilteredWithdrawals(withdrawals.filter(w => w.status === filter))
    }
  }, [filter, withdrawals])

  const loadWithdrawals = async () => {
    try {
      setLoading(true)
      const data = await PaymentService.getWithdrawalRequests()
      setWithdrawals(data)

      // Load worker details for each withdrawal
      const workerIds = [...new Set(data.map(w => w.userId))]
      const details: Record<string, User> = {}

      await Promise.all(
        workerIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId))
            if (userDoc.exists()) {
              details[userId] = { id: userDoc.id, ...userDoc.data() } as User
            }
          } catch (error) {
            console.debug('Error loading worker details:', error)
          }
        })
      )

      setWorkerDetails(details)
    } catch (error) {
      showError('Failed to load withdrawal requests')
      console.error('Error loading withdrawals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    if (!user) return

    const confirmed = window.confirm(
      `Approve withdrawal of R${withdrawal.amount.toFixed(2)} for ${workerDetails[withdrawal.userId]?.firstName || 'worker'}?`
    )

    if (!confirmed) return

    try {
      setProcessingId(withdrawal.id)
      await PaymentService.approveWithdrawal(withdrawal.id, user.id)
      showSuccess('✅ Withdrawal approved - funds marked as deposited')
      await loadWithdrawals()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to approve withdrawal')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectClick = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!user || !selectedWithdrawal || !rejectionReason.trim()) {
      showError('Please provide a rejection reason')
      return
    }

    try {
      setProcessingId(selectedWithdrawal.id)
      await PaymentService.rejectWithdrawal(selectedWithdrawal.id, user.id, rejectionReason)
      showSuccess('❌ Withdrawal rejected - funds refunded to worker')
      setRejectModalOpen(false)
      setSelectedWithdrawal(null)
      setRejectionReason('')
      await loadWithdrawals()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to reject withdrawal')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: WithdrawalRequest['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-secondary-100 text-secondary-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (!user || !isAdmin(user)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">Admin access required to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Withdrawal Approvals</h1>
        <p className="text-gray-600">Review and approve worker withdrawal requests</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex overflow-x-auto">
          {(['all', 'pending', 'processing', 'completed', 'failed'] as FilterStatus[]).map((status) => {
            const count = status === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === status).length
            const isActive = filter === status

            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary-600 text-secondary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-secondary-100 text-secondary-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Withdrawals List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading withdrawal requests...</p>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No {filter !== 'all' && `${filter} `}withdrawals</h3>
          <p className="text-gray-600">There are no withdrawal requests to display.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWithdrawals.map((withdrawal) => {
            const worker = workerDetails[withdrawal.userId]
            const isProcessing = processingId === withdrawal.id

            return (
              <div key={withdrawal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left side - Withdrawal Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl font-bold text-gray-900">
                        R{withdrawal.amount.toFixed(2)}
                      </h3>
                      {getStatusBadge(withdrawal.status)}
                      <span className="text-sm text-gray-500">
                        ⏰ {getTimeAgo(withdrawal.requestedAt)}
                      </span>
                    </div>

                    {worker && (
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Worker:</span>{' '}
                          <span className="text-gray-900">
                            {worker.firstName} {worker.lastName}
                          </span>
                          {' '}
                          <span className="text-gray-500">({worker.email})</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Trust Score:</span>{' '}
                          <span className="text-gray-900">{worker.trustScore || 50}</span>
                          {' | '}
                          <span className="font-medium text-gray-700">Verified:</span>{' '}
                          <span className={worker.isVerified ? 'text-green-600' : 'text-gray-500'}>
                            {worker.isVerified ? '✓ Yes' : '✗ No'}
                          </span>
                        </div>
                        {withdrawal.bankDetails && (
                          <div>
                            <span className="font-medium text-gray-700">Bank:</span>{' '}
                            <span className="text-gray-900">
                              {withdrawal.bankDetails.bankName} ****{withdrawal.bankDetails.accountNumber.slice(-4)}
                            </span>
                            {' '}
                            <span className="text-gray-600">({withdrawal.bankDetails.accountType})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side - Actions */}
                  {withdrawal.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(withdrawal)}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {isProcessing ? 'Processing...' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => handleRejectClick(withdrawal)}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {withdrawal.status === 'completed' && withdrawal.completedAt && (
                    <div className="text-sm text-gray-600">
                      Completed: {new Date(withdrawal.completedAt).toLocaleDateString()}
                    </div>
                  )}

                  {withdrawal.status === 'failed' && withdrawal.failureReason && (
                    <div className="text-sm text-red-600">
                      Reason: {withdrawal.failureReason}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Withdrawal</h3>
            <p className="text-gray-600 mb-4">
              Rejecting withdrawal of R{selectedWithdrawal.amount.toFixed(2)} for{' '}
              {workerDetails[selectedWithdrawal.userId]?.firstName || 'worker'}.
            </p>
            <p className="text-gray-600 mb-4">
              The funds will be refunded to the worker&apos;s wallet.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="e.g., Insufficient documentation, incorrect bank details"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim() || processingId === selectedWithdrawal.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {processingId === selectedWithdrawal.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setRejectModalOpen(false)
                  setSelectedWithdrawal(null)
                  setRejectionReason('')
                }}
                disabled={processingId === selectedWithdrawal.id}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
