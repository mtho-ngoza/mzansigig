'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { PaymentService } from '@/lib/services/paymentService'
import { PaymentHistory } from '@/types/payment'

interface TransactionHistoryProps {
  onClose?: () => void
}

type FilterType = 'all' | 'earnings' | 'payments' | 'refunds' | 'fees'
type FilterStatus = 'all' | 'completed' | 'pending' | 'failed'

export default function TransactionHistory({ onClose }: TransactionHistoryProps) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<PaymentHistory[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<PaymentHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    if (!user) return

    // If the user isn't a job-seeker, don't fetch payment history.
    // This avoids unnecessary async updates (and test warnings about act(...)).
    if (user.userType !== 'job-seeker') {
      setIsLoading(false)
      setTransactions([])
      setFilteredTransactions([])
      return
    }

    const loadTransactions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const history = await PaymentService.getUserPaymentHistory(user.id, 500)
        setTransactions(history)
        setFilteredTransactions(history)
      } catch (error) {
        // Intentionally don't log here to avoid noisy console output during tests/CI.
        setError('Failed to load transaction history')
      } finally {
        setIsLoading(false)
      }
    }

    loadTransactions()
  }, [user])

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions]

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType)
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus)
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(lowerSearch) ||
        t.id.toLowerCase().includes(lowerSearch)
      )
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }, [transactions, filterType, filterStatus, searchTerm])

  if (!user) return null

  if (user.userType !== 'job-seeker') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Transaction history is only available for job seekers.</p>
          {onClose && (
            <Button onClick={onClose} variant="outline" className="mt-4">
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  // Summary calculations
  const totalEarnings = transactions
    .filter(t => t.type === 'earnings' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = transactions
    .filter(t => t.type === 'payments' && t.status === 'completed')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalFees = transactions
    .filter(t => t.type === 'fees' && t.status === 'completed')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Transaction History</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              All your earnings, withdrawals, and payments
            </p>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              ✕
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 font-medium">Total Earnings</div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              R{totalEarnings.toFixed(2)}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 font-medium">Total Withdrawals</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              R{totalWithdrawals.toFixed(2)}
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-700 font-medium">Total Fees</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">
              R{totalFees.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Type Filter */}
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="earnings">Earnings</option>
                <option value="payments">Payments/Withdrawals</option>
                <option value="refunds">Refunds</option>
                <option value="fees">Fees</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Transactions
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setFilterType('all')
                setFilterStatus('all')
                setSearchTerm('')
              }}
              className="ml-2 text-primary-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">No transactions found</p>
            <p className="text-sm mt-1">
              {transactions.length === 0
                ? 'Start applying for gigs to earn money!'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {currentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{transaction.description}</span>
                      {/* Type Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          transaction.type === 'earnings'
                            ? 'bg-green-100 text-green-700'
                            : transaction.type === 'payments'
                            ? 'bg-blue-100 text-blue-700'
                            : transaction.type === 'refunds'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {transaction.createdAt.toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-xs text-gray-400">ID: {transaction.id.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Status Badge */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.status}
                    </span>

                    {/* Amount */}
                    <div
                      className={`text-lg font-bold min-w-[100px] text-right ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}R{Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    ← Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Close Button */}
        {onClose && (
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
