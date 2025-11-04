'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { WalletService } from '@/lib/services/walletService'
import { PaymentService } from '@/lib/services/paymentService'
import { PaymentHistory } from '@/types/payment'
import TransactionHistory from './TransactionHistory'

interface WalletBalance {
  walletBalance: number
  pendingBalance: number
  totalEarnings: number
  totalWithdrawn: number
}

interface WorkerEarningsDashboardProps {
  onWithdrawalRequest?: () => void
}

export default function WorkerEarningsDashboard({ onWithdrawalRequest }: WorkerEarningsDashboardProps) {
  const { user } = useAuth()
  const [balance, setBalance] = useState<WalletBalance>({
    walletBalance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    totalWithdrawn: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<PaymentHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullHistory, setShowFullHistory] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadWalletData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load wallet balance
        const walletBalance = await WalletService.getWalletBalance(user.id)
        setBalance(walletBalance)

        // Load recent transactions
        const history = await PaymentService.getUserPaymentHistory(user.id, 5)
        setRecentTransactions(history)
      } catch (err) {
        console.error('Error loading wallet data:', err)
        setError('Failed to load wallet data')
      } finally {
        setIsLoading(false)
      }
    }

    loadWalletData()
  }, [user])

  if (!user) {
    return null
  }

  if (user.userType !== 'job-seeker') {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">Earnings dashboard is only available for job seekers.</p>
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

  // Show full transaction history if requested
  if (showFullHistory) {
    return <TransactionHistory onClose={() => setShowFullHistory(false)} />
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">My Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Available Balance */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-700 font-medium mb-1">Available Balance</div>
              <div className="text-2xl font-bold text-green-900">
                R{balance.walletBalance.toFixed(2)}
              </div>
              <div className="text-xs text-green-600 mt-1">Ready to withdraw</div>
            </div>

            {/* Pending */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-700 font-medium mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-900">
                R{balance.pendingBalance.toFixed(2)}
              </div>
              <div className="text-xs text-yellow-600 mt-1">In escrow</div>
            </div>

            {/* Total Earnings */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700 font-medium mb-1">Total Earnings</div>
              <div className="text-2xl font-bold text-blue-900">
                R{balance.totalEarnings.toFixed(2)}
              </div>
              <div className="text-xs text-blue-600 mt-1">Lifetime</div>
            </div>

            {/* Total Withdrawn */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-700 font-medium mb-1">Withdrawn</div>
              <div className="text-2xl font-bold text-purple-900">
                R{balance.totalWithdrawn.toFixed(2)}
              </div>
              <div className="text-xs text-purple-600 mt-1">All time</div>
            </div>
          </div>

          {/* Withdrawal Button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={onWithdrawalRequest}
              disabled={balance.walletBalance <= 0}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              💰 Request Withdrawal
            </Button>
          </div>

          {balance.walletBalance <= 0 && (
            <div className="mt-2 text-sm text-gray-500 text-right">
              Minimum balance of R1 required to withdraw
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Start applying for gigs to earn money!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{transaction.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {transaction.createdAt.toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
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
                      className={`text-lg font-bold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}R{Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullHistory(true)}
                >
                  View All Transactions →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
