'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { usePayment } from '@/contexts/PaymentContext'
import { GigService } from '@/lib/database/gigService'
import { GigApplication } from '@/types/gig'
import PaymentMethodList from './PaymentMethodList'
import PaymentMethodForm from './PaymentMethodForm'
import PaymentHistory from './PaymentHistory'

interface EmployerPaymentDashboardProps {
  onBack?: () => void
}

interface PendingObligation {
  application: GigApplication
  gigTitle: string
  workerName: string
  amount: number
}

export default function EmployerPaymentDashboard({ onBack }: EmployerPaymentDashboardProps) {
  const { user } = useAuth()
  const { analytics, formatCurrency, refreshAnalytics } = usePayment()
  const [currentView, setCurrentView] = useState<'overview' | 'methods' | 'add-method' | 'history' | 'obligations'>('overview')
  const [pendingObligations, setPendingObligations] = useState<PendingObligation[]>([])
  const [isLoadingObligations, setIsLoadingObligations] = useState(false)

  // Load pending payment obligations
  useEffect(() => {
    const loadPendingObligations = async () => {
      if (!user?.id || user.userType !== 'employer') return

      setIsLoadingObligations(true)
      try {
        // Get all gigs posted by this employer
        const gigs = await GigService.getGigsByEmployer(user.id)

        // Get applications for all employer's gigs
        const allApplicationsPromises = gigs.map(gig =>
          GigService.getApplicationsByGig(gig.id)
        )
        const allApplicationsArrays = await Promise.all(allApplicationsPromises)
        const applications = allApplicationsArrays.flat()

        // Find accepted applications that haven't been paid
        const unpaidApplications = applications.filter(
          app => app.status === 'accepted' && !app.paymentId
        )

        // Get details for each unpaid application
        const obligations: PendingObligation[] = []
        for (const app of unpaidApplications) {
          try {
            const gig = await GigService.getGigById(app.gigId)
            // Get worker details
            const workerName = app.applicantName || 'Worker'

            obligations.push({
              application: app,
              gigTitle: gig?.title || 'Unknown Gig',
              workerName,
              amount: app.proposedRate || gig?.budget || 0
            })
          } catch (error) {
            console.error('Error loading obligation details:', error)
          }
        }

        setPendingObligations(obligations)
      } catch (error) {
        console.error('Error loading pending obligations:', error)
      } finally {
        setIsLoadingObligations(false)
      }
    }

    if (currentView === 'overview' || currentView === 'obligations') {
      loadPendingObligations()
    }
  }, [user, currentView])

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

      case 'history':
        return <PaymentHistory />

      case 'obligations':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Pending Payment Obligations</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingObligations ? (
                <div className="text-center py-8 text-gray-500">
                  Loading payment obligations...
                </div>
              ) : pendingObligations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-2">✅ No pending payment obligations</p>
                  <p className="text-sm">All accepted applications have been funded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Warning Banner */}
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 text-2xl mr-3">⚠️</div>
                      <div>
                        <h3 className="text-sm font-medium text-orange-800">Payment Required</h3>
                        <p className="mt-1 text-sm text-orange-700">
                          You have {pendingObligations.length} accepted application{pendingObligations.length !== 1 ? 's' : ''} waiting for payment.
                          Workers should not start work until payment is secured in escrow.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Obligations List */}
                  <div className="divide-y divide-gray-200">
                    {pendingObligations.map((obligation) => (
                      <div key={obligation.application.id} className="py-4 hover:bg-gray-50 px-4 rounded-lg transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{obligation.gigTitle}</h4>
                            <p className="text-sm text-gray-600 mt-1">Worker: {obligation.workerName}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Accepted on: {new Date(obligation.application.createdAt).toLocaleDateString('en-ZA')}
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Payment Required
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end">
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(obligation.amount)}
                            </p>
                            <Button
                              variant="primary"
                              className="mt-3"
                              onClick={() => {
                                // TODO: Open payment dialog for this application
                                window.location.href = `/application/${obligation.application.id}`
                              }}
                            >
                              Pay Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Obligations:</span>
                      <span className="text-orange-600">
                        {formatCurrency(pendingObligations.reduce((sum, o) => sum + o.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'overview':
      default:
        const pendingObligationsAmount = pendingObligations.reduce((sum, o) => sum + o.amount, 0)
        const thisMonthSpending = analytics?.monthlyEarnings
          .find(m => m.month === new Date().toISOString().slice(0, 7))
          ?.amount || 0

        return (
          <div className="space-y-6">
            {/* Warning Banner if there are pending obligations */}
            {pendingObligations.length > 0 && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-2xl mr-3">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-orange-800">Pending Payment Obligations</h3>
                    <p className="mt-1 text-sm text-orange-700">
                      You have {pendingObligations.length} accepted application{pendingObligations.length !== 1 ? 's' : ''} waiting for payment totaling{' '}
                      <span className="font-bold">{formatCurrency(pendingObligationsAmount)}</span>
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 text-orange-700 border-orange-300 hover:bg-orange-100"
                      onClick={() => setCurrentView('obligations')}
                    >
                      View & Pay Now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Paid</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(analytics?.totalPaid || 0)}
                      </p>
                    </div>
                    <div className="text-3xl">💳</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Obligations</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(pendingObligationsAmount)}
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
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(thisMonthSpending)}
                      </p>
                    </div>
                    <div className="text-3xl">📊</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Escrow</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(analytics?.pendingPayments || 0)}
                      </p>
                    </div>
                    <div className="text-3xl">🔒</div>
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
                    onClick={() => setCurrentView('obligations')}
                  >
                    <span className="text-2xl">⚠️</span>
                    <span>Pending Payments</span>
                    {pendingObligations.length > 0 && (
                      <span className="text-xs text-orange-600 font-medium">
                        ({pendingObligations.length})
                      </span>
                    )}
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
                    <span>Payment History</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => window.location.href = '/gigs/manage'}
                  >
                    <span className="text-2xl">📝</span>
                    <span>Manage Gigs</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentHistory limit={5} />
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('history')}
                  >
                    View All Payments
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
                    <h4 className="font-medium text-gray-900 mb-2">Escrow Protection</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Payments held securely in escrow</li>
                      <li>• Released when work is completed</li>
                      <li>• Dispute resolution available</li>
                      <li>• Full transaction history</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Payment Best Practices</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Fund escrow before work starts</li>
                      <li>• Review work before releasing payment</li>
                      <li>• Communicate clearly with workers</li>
                      <li>• Keep payment methods up to date</li>
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
      case 'history': return 'Payment History'
      case 'obligations': return 'Pending Payments'
      default: return 'Payment Dashboard'
    }
  }

  const getPageDescription = () => {
    switch (currentView) {
      case 'methods': return 'Manage your payment methods and preferences'
      case 'add-method': return 'Add a new payment method to your account'
      case 'history': return 'View all your payment transactions'
      case 'obligations': return 'Applications waiting for payment'
      default: return 'Manage payments, track spending, and view obligations'
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
      if (pendingObligations.length > 0) {
        actions.push({
          label: `Pay Now (${pendingObligations.length})`,
          onClick: () => setCurrentView('obligations'),
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
