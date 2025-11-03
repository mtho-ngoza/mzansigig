'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { GigApplication, Gig } from '@/types/gig'
import { QuickMessageButton } from '@/components/messaging/QuickMessageButton'
import { useToast } from '@/contexts/ToastContext'
import PaymentDialog from '@/components/payment/PaymentDialog'
import JobSeekerProfileDialog from '@/components/application/JobSeekerProfileDialog'

interface ManageApplicationsProps {
  onBack?: () => void
  onMessageConversationStart?: (conversationId: string) => void
}

interface ApplicationWithGig extends GigApplication {
  gigTitle?: string
  gigBudget?: number
}

export default function ManageApplications({ onBack, onMessageConversationStart }: ManageApplicationsProps) {
  const { success, error: showError } = useToast()
  const { user } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithGig[]>([])
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingApplications, setProcessingApplications] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<GigApplication['status'] | 'all'>('all')
  const [showPaymentDialog, setShowPaymentDialog] = useState<{
    isOpen: boolean
    application?: ApplicationWithGig
  }>({ isOpen: false })
  const [showProfileDialog, setShowProfileDialog] = useState<{
    isOpen: boolean
    userId?: string
  }>({ isOpen: false })

  useEffect(() => {
    const loadApplicationsAndGigs = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Get all gigs posted by this employer
        const employerGigs = await GigService.getGigsByEmployer(user.id)
        setGigs(employerGigs)

        // Get all applications for these gigs
        const allApplications: ApplicationWithGig[] = []

        for (const gig of employerGigs) {
          const gigApplications = await GigService.getApplicationsByGig(gig.id)
          const applicationsWithGigInfo = gigApplications.map(app => ({
            ...app,
            gigTitle: gig.title,
            gigBudget: gig.budget
          }))
          allApplications.push(...applicationsWithGigInfo)
        }

        // Sort by creation date (newest first)
        allApplications.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() :
                        (a.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() || 0
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() :
                        (b.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() || 0
          return dateB - dateA
        })

        setApplications(allApplications)
      } catch (error) {
        setError('Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    loadApplicationsAndGigs()
  }, [user])

  const handleApplicationAction = async (applicationId: string, status: 'accepted' | 'rejected') => {
    try {
      setProcessingApplications(prev => new Set(prev).add(applicationId))

      await GigService.updateApplicationStatus(applicationId, status)

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, status }
            : app
        )
      )

      // Show success message
      const actionText = status === 'accepted' ? 'accepted' : 'rejected'
      success(`Application ${actionText} successfully!`)

    } catch (error) {
      showError('Failed to update application status. Please try again.')
    } finally {
      setProcessingApplications(prev => {
        const newSet = new Set(prev)
        newSet.delete(applicationId)
        return newSet
      })
    }
  }

  const getStatusBadgeClass = (status: GigApplication['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (date: Date | unknown) => {
    try {
      let dateObj: Date;

      if (date && typeof date === 'object' && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
        dateObj = (date as { toDate: () => Date }).toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return 'N/A';
      }

      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }

      return dateObj.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back to Dashboard
            </Button>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Manage Applications
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Review and manage applications received for your posted gigs.
            </p>
          </div>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-1 1m0 0l-1 1m1-1v4a2 2 0 01-.883 1.664L18 14h-5a2 2 0 01-2-2V6a2 2 0 012-2h5.117c.53 0 1.03.21 1.414.586L21 6z" />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                No Applications Yet
              </h3>

              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You haven&apos;t received any applications yet. Make sure your gigs are visible and attractive to potential candidates!
              </p>

              <Button>
                Post a New Gig
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats - Clickable Filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-gray-900' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {applications.length}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending' ? 'ring-2 ring-yellow-600' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {applications.filter(app => app.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'accepted' ? 'ring-2 ring-green-600' : ''}`}
                onClick={() => setStatusFilter('accepted')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {applications.filter(app => app.status === 'accepted').length}
                  </div>
                  <div className="text-sm text-gray-600">Accepted</div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'funded' ? 'ring-2 ring-blue-600' : ''}`}
                onClick={() => setStatusFilter('funded')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {applications.filter(app => app.status === 'funded').length}
                  </div>
                  <div className="text-sm text-gray-600">Funded</div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'completed' ? 'ring-2 ring-purple-600' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {applications.filter(app => app.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'rejected' ? 'ring-2 ring-red-600' : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {applications.filter(app => app.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </CardContent>
              </Card>
            </div>

            {/* Applications */}
            {(statusFilter === 'all' ? applications : applications.filter(app => app.status === statusFilter)).length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-gray-600">
                    {statusFilter === 'all' ? 'No applications received yet.' : `No applications found with status: ${statusFilter}`}
                  </p>
                  {statusFilter !== 'all' && (
                    <Button variant="outline" onClick={() => setStatusFilter('all')} className="mt-4">
                      Show All Applications
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              (statusFilter === 'all' ? applications : applications.filter(app => app.status === statusFilter)).map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{application.gigTitle}</CardTitle>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-600">Applied by {application.applicantName}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowProfileDialog({ isOpen: true, userId: application.applicantId })}
                          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 h-auto py-1 px-2 text-xs"
                        >
                          👤 View Profile
                        </Button>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Applied:</span>
                      <div className="font-medium">{formatDate(application.createdAt)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Proposed Rate:</span>
                      <div className="font-medium">{formatCurrency(application.proposedRate)}</div>
                    </div>
                    {application.gigBudget && (
                      <div>
                        <span className="text-sm text-gray-500">Your Budget:</span>
                        <div className="font-medium">{formatCurrency(application.gigBudget)}</div>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <span className="text-sm text-gray-500 block mb-2">Cover Letter:</span>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">
                        {application.coverLetter}
                      </p>
                    </div>
                  </div>

                  {application.status === 'pending' && (
                    <div className="flex flex-wrap gap-3">
                      <QuickMessageButton
                        recipientId={application.applicantId}
                        recipientName={application.applicantName}
                        recipientType="job-seeker"
                        gigId={application.gigId}
                        gigTitle={application.gigTitle}
                        size="sm"
                        variant="outline"
                        onConversationStart={onMessageConversationStart}
                      />
                      <Button
                        onClick={() => handleApplicationAction(application.id, 'accepted')}
                        disabled={processingApplications.has(application.id)}
                        isLoading={processingApplications.has(application.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Accept Application
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleApplicationAction(application.id, 'rejected')}
                        disabled={processingApplications.has(application.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Reject Application
                      </Button>
                    </div>
                  )}

                  {(application.status === 'accepted' || application.status === 'funded') && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex flex-col">
                            <span className="text-green-800 font-medium">
                              {application.status === 'funded'
                                ? `✅ Project Funded - ${application.applicantName} can begin work`
                                : `Application accepted - Contact ${application.applicantName} to begin the project`}
                            </span>
                            {application.paymentStatus && application.paymentStatus !== 'unpaid' && (
                              <span className="text-sm text-green-700 mt-1">
                                Payment Status: {application.paymentStatus === 'in_escrow' ? '🔒 In Escrow' :
                                                application.paymentStatus === 'paid' ? '✅ Paid' :
                                                application.paymentStatus === 'released' ? '✅ Released' :
                                                application.paymentStatus === 'disputed' ? '⚠️ Disputed' :
                                                application.paymentStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {(!application.paymentStatus || application.paymentStatus === 'unpaid') ? (
                            <Button
                              size="sm"
                              onClick={() => setShowPaymentDialog({ isOpen: true, application })}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              💳 Make Payment
                            </Button>
                          ) : (
                            <span className="px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg font-medium">
                              Payment Completed
                            </span>
                          )}
                          <QuickMessageButton
                            recipientId={application.applicantId}
                            recipientName={application.applicantName}
                            recipientType="job-seeker"
                            gigId={application.gigId}
                            gigTitle={application.gigTitle}
                            size="sm"
                            onConversationStart={onMessageConversationStart}
                          >
                            Contact Worker
                          </QuickMessageButton>
                        </div>
                      </div>
                    </div>
                  )}

                  {application.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-800 font-medium">
                          Application rejected
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>
        )}

        {/* Payment Dialog */}
        {showPaymentDialog.isOpen && showPaymentDialog.application && (
          <PaymentDialog
            isOpen={showPaymentDialog.isOpen}
            gigId={showPaymentDialog.application.gigId}
            workerId={showPaymentDialog.application.applicantId}
            workerName={showPaymentDialog.application.applicantName}
            amount={showPaymentDialog.application.proposedRate}
            description={`Payment for "${showPaymentDialog.application.gigTitle}"`}
            onSuccess={async (payment) => {
              setShowPaymentDialog({ isOpen: false })
              success('Payment processed successfully!')

              // Update the application payment status and change status to funded
              if (showPaymentDialog.application) {
                try {
                  // Update payment status
                  await GigService.updateApplicationPaymentStatus(
                    showPaymentDialog.application.id,
                    'in_escrow',
                    payment.id
                  )

                  // Update application status to funded
                  await GigService.updateApplicationStatus(
                    showPaymentDialog.application.id,
                    'funded'
                  )

                  // Update local state to reflect both changes
                  setApplications(prev =>
                    prev.map(app =>
                      app.id === showPaymentDialog.application?.id
                        ? { ...app, status: 'funded' as const, paymentStatus: 'in_escrow' as const, paymentId: payment.id }
                        : app
                    )
                  )
                } catch (error) {
                  // Payment status update failed - payment was successful but status wasn't updated
                  // User can still proceed with the funded application
                }
              }
            }}
            onCancel={() => setShowPaymentDialog({ isOpen: false })}
          />
        )}

        {/* Profile Dialog */}
        {showProfileDialog.isOpen && showProfileDialog.userId && (
          <JobSeekerProfileDialog
            userId={showProfileDialog.userId}
            isOpen={showProfileDialog.isOpen}
            onClose={() => setShowProfileDialog({ isOpen: false })}
          />
        )}
      </div>
    </div>
  )
}