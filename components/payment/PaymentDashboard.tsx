'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePayment } from '@/contexts/PaymentContext'
import EarningsAnalytics from './EarningsAnalytics'
import PaymentHistory from './PaymentHistory'
import BankDetailsForm from '../wallet/BankDetailsForm'

interface PaymentDashboardProps {
  onBack?: () => void
}

export default function PaymentDashboard({ onBack }: PaymentDashboardProps) {
  const { analytics, formatCurrency, refreshAnalytics } = usePayment()
  const [currentView, setCurrentView] = useState<'overview' | 'bank-details' | 'history' | 'analytics'>('overview')

  // Auto-refresh data when component mounts
  useEffect(() => {
    refreshAnalytics()
  }, [refreshAnalytics])

  const renderViewContent = () => {
    switch (currentView) {
      case 'bank-details':
        return (
          <div className="max-w-md mx-auto">
            <BankDetailsForm onSuccess={() => setCurrentView('overview')} />
          </div>
        )

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
                      <p className="text-sm font-medium text-gray-600">Total Received</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(analytics?.totalEarnings || 0)}
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
                      <p className="text-2xl font-bold text-secondary-600">
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

            {/* Bank Details Card */}
            <BankDetailsForm />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setCurrentView('bank-details')}
                  >
                    <span className="text-2xl">🏦</span>
                    <span>Bank Details</span>
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
                <CardTitle>How Payments Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Escrow Protection</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Employer funds are held securely in escrow</li>
                      <li>• Funds released when work is approved</li>
                      <li>• Both parties protected by TradeSafe</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Direct Payments</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Payments sent directly to your bank</li>
                      <li>• Add your bank details to receive payments</li>
                      <li>• All major SA banks supported</li>
                      <li>• 10% platform fee on completed gigs</li>
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
      case 'bank-details': return 'Bank Details'
      case 'history': return 'Payment History'
      case 'analytics': return 'Earnings Analytics'
      default: return 'Payment Dashboard'
    }
  }

  const getPageDescription = () => {
    switch (currentView) {
      case 'bank-details': return 'Manage your bank account for receiving payments'
      case 'history': return 'View all your payment and earning transactions'
      case 'analytics': return 'Detailed insights into your earnings and performance'
      default: return 'Track your earnings and payment history'
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
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderViewContent()}
        </div>
      </main>
    </div>
  )
}
