'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { usePayment } from '@/contexts/PaymentContext'
import PaymentMethodList from './PaymentMethodList'
import PaymentMethodForm from './PaymentMethodForm'
import EarningsAnalytics from './EarningsAnalytics'
import WithdrawalForm from './WithdrawalForm'
import WithdrawalHistory from '../wallet/WithdrawalHistory'
import PaymentHistory from './PaymentHistory'

interface PaymentDashboardProps {
  onBack?: () => void
}

export default function PaymentDashboard({ onBack }: PaymentDashboardProps) {
  const { user } = useAuth()
  const { analytics, formatCurrency, refreshAnalytics } = usePayment()
  const [currentView, setCurrentView] = useState<'overview' | 'methods' | 'add-method' | 'withdraw' | 'withdrawals' | 'history' | 'analytics'>('overview')

  const renderViewContent = () => {
    switch (currentView) {
      case 'add-method':
        return (
          <PaymentMethodForm
            onSuccess={() => {
              setCurrentView('methods')
            }}
            onCancel={() => setCurrentView('methods')}
          />
        )

      case 'methods':
        return (
          <PaymentMethodList
            onAddNew={() => setCurrentView('add-method')}
          />
        )

      case 'withdraw':
        return (
          <WithdrawalForm
            onSuccess={async () => {
              await refreshAnalytics()
              setCurrentView('overview')
            }}
            onCancel={() => setCurrentView('overview')}
          />
        )

      case 'withdrawals':
        return <WithdrawalHistory />

      case 'history':
        return <PaymentHistory />

      case 'analytics':
        return <EarningsAnalytics />

      case 'overview':
      default:
        return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available Balance</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(analytics?.availableBalance || 0)}
                      </p>
                    </div>
                    <div className="text-3xl">💰</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending (Escrow)</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(analytics?.pendingBalance || 0)}
                      </p>
                    </div>
                    <div className="text-3xl">⏳</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(
                          analytics?.monthlyEarnings
                            .find(m => m.month === new Date().toISOString().slice(0, 7))
                            ?.amount || 0
                        )}
                      </p>
                    </div>
                    <div className="text-3xl">📈</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Gigs</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {analytics?.completedGigs || 0}
                      </p>
                    </div>
                    <div className="text-3xl">✅</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setCurrentView('withdraw')}
                  >
                    <span className="text-2xl">💸</span>
                    <span>Withdraw Funds</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setCurrentView('withdrawals')}
                  >
                    <span className="text-2xl">💰</span>
                    <span>My Withdrawals</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setCurrentView('methods')}
                  >
                    <span className="text-2xl">💳</span>
                    <span>Payment Methods</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setCurrentView('history')}
                  >
                    <span className="text-2xl">📋</span>
                    <span>Transaction History</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setCurrentView('analytics')}
                  >
                    <span className="text-2xl">📊</span>
                    <span>Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentHistory limit={5} />
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('history')}
                  >
                    View All Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Help</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Payment Processing</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Payments are held in secure escrow</li>
                      <li>• Funds released after work completion</li>
                      <li>• Processing takes 1-3 business days</li>
                      <li>• All major SA banks supported</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Withdrawal Options</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Direct bank transfer (EFT)</li>
                      <li>• Minimum withdrawal: R50</li>
                      <li>• No withdrawal fees</li>
                      <li>• Same-day processing Mon-Fri</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  const getPageTitle = () => {
    switch (currentView) {
      case 'methods': return 'Payment Methods'
      case 'add-method': return 'Add Payment Method'
      case 'withdraw': return 'Withdraw Funds'
      case 'withdrawals': return 'My Withdrawals'
      case 'history': return 'Payment History'
      case 'analytics': return 'Earnings Analytics'
      default: return 'Payment Dashboard'
    }
  }

  const getPageDescription = () => {
    switch (currentView) {
      case 'methods': return 'Manage your payment methods and preferences'
      case 'add-method': return 'Add a new payment method to your account'
      case 'withdraw': return 'Withdraw your earnings to your bank account'
      case 'withdrawals': return 'View your pending and completed withdrawal requests'
      case 'history': return 'View all your payment and earning transactions'
      case 'analytics': return 'Detailed insights into your earnings and performance'
      default: return 'Manage payments, earnings, and withdrawals'
    }
  }

  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { label: 'Dashboard', onClick: onBack, isCurrentPage: false },
      { label: 'Payments', onClick: () => setCurrentView('overview'), isCurrentPage: false }
    ]

    if (currentView !== 'overview') {
      breadcrumbs.push({
        label: getPageTitle(),
        onClick: undefined,
        isCurrentPage: true
      })
    } else {
      breadcrumbs[breadcrumbs.length - 1].isCurrentPage = true
    }

    return breadcrumbs
  }

  const getActions = () => {
    const actions = []

    if (currentView === 'overview') {
      if (user?.userType === 'job-seeker') {
        actions.push({
          label: 'Withdraw Funds',
          onClick: () => setCurrentView('withdraw'),
          variant: 'primary' as const,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          )
        })
      }

      actions.push({
        label: 'Payment Methods',
        onClick: () => setCurrentView('methods'),
        variant: 'outline' as const,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      })
    }

    return actions
  }

  const getBackButton = () => {
    if (currentView === 'overview') {
      return onBack ? {
        label: 'Back to Dashboard',
        onClick: onBack
      } : undefined
    }

    return {
      label: 'Back to Overview',
      onClick: () => setCurrentView('overview')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={getPageTitle()}
        description={getPageDescription()}
        breadcrumbs={getBreadcrumbs()}
        backButton={getBackButton()}
        actions={getActions()}
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderViewContent()}
        </div>
      </main>
    </div>
  )
}