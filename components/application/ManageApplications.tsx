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
  const [approveCompletionDialog, setApproveCompletionDialog] = useState<{
    isOpen: boolean
    applicationId: string
    gigTitle: string
  }>({ isOpen: false, applicationId: '', gigTitle: '' })
  const [disputeCompletionDialog, setDisputeCompletionDialog] = useState<{
    isOpen: boolean
    applicationId: string
    gigTitle: string
  }>({ isOpen: false, applicationId: '', gigTitle: '' })
  const [disputeReason, setDisputeReason] = useState('')
  const [processingCompletion, setProcessingCompletion] = useState(false)

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

      // If accepted, immediately prompt for payment
      if (status === 'accepted') {
        const acceptedApp = applications.find(app => app.id === applicationId)
        if (acceptedApp) {
          // Small delay to let the success message show
          setTimeout(() => {
            setShowPaymentDialog({ isOpen: true, application: { ...acceptedApp, status: 'accepted' } })
          }, 500)
        }
      }

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

  const handleApproveCompletionClick = (applicationId: string, gigTitle: string) => {
    setApproveCompletionDialog({ isOpen: true, applicationId, gigTitle })
  }

  const handleApproveCompletionConfirm = async () => {
    if (!user) return

    try {
      setProcessingCompletion(true)
      await GigService.approveCompletion(approveCompletionDialog.applicationId, user.id)

      // Update local state to mark as completed
      setApplications(prevApps =>
        prevApps.map(app =>
          app.id === approveCompletionDialog.applicationId
            ? { ...app, status: 'completed' as const }
            : app
        )
      )

      setApproveCompletionDialog({ isOpen: false, applicationId: '', gigTitle: '' })
      success('Completion approved! Payment has been released to the worker.')
    } catch (error) {
      console.error('Error approving completion:', error)
      showError(error instanceof Error ? error.message : 'Failed to approve completion. Please try again.')
    } finally {
      setProcessingCompletion(false)
    }
  }

  const handleDisputeCompletionClick = (applicationId: string, gigTitle: string) => {
    setDisputeCompletionDialog({ isOpen: true, applicationId, gigTitle })
    setDisputeReason('')
  }

  const handleDisputeCompletionConfirm = async () => {
    if (!user) return

    if (!disputeReason || disputeReason.trim().length < 10) {
      showError('Please provide a detailed reason for the dispute (minimum 10 characters).')
      return
    }

    try {
      setProcessingCompletion(true)
      await GigService.disputeCompletion(
        disputeCompletionDialog.applicationId,
        user.id,
        disputeReason
      )

      // Update local state to reflect the dispute
      setApplications(prevApps =>
        prevApps.map(app =>
          app.id === disputeCompletionDialog.applicationId
            ? {
                ...app,
                completionDisputedAt: new Date(),
                completionDisputeReason: disputeReason,
                completionAutoReleaseAt: undefined
              }
            : app
        )
      )

      setDisputeCompletionDialog({ isOpen: false, applicationId: '', gigTitle: '' })
      setDisputeReason('')
      success('Completion disputed. Please work with the worker to resolve the issues.')
    } catch (error) {
      console.error('Error disputing completion:', error)
      showError(error instanceof Error ? error.message : 'Failed to dispute completion. Please try again.')
    } finally {
      setProcessingCompletion(false)
    }
  }

  const calculateDaysUntilAutoRelease = (autoReleaseDate: Date | undefined): number => {
    if (!autoReleaseDate) return 0

    const date = autoReleaseDate instanceof Date ? autoReleaseDate : new Date(autoReleaseDate)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
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

          {/* Payment Obligations Dashboard */}
          {(() => {
            const acceptedUnfunded = applications.filter(
              app => app.status === 'accepted' && (!app.paymentStatus || app.paymentStatus === 'unpaid')
            )
            const totalOwed = acceptedUnfunded.reduce((sum, app) => sum + app.proposedRate, 0)

            return acceptedUnfunded.length > 0 && (
              <Card className="mb-6 border-2 border-orange-300 bg-orange-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-lg text-orange-900">
                          💳 Payment Obligations Dashboard
                        </CardTitle>
                        <p className="text-sm text-orange-700 mt-1">
                          You have {acceptedUnfunded.length} accepted {acceptedUnfunded.length === 1 ? 'application' : 'applications'} awaiting payment
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setStatusFilter('accepted')}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      View Unfunded Applications →
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <div className="text-sm text-gray-600 mb-1">Applications Awaiting Payment</div>
                      <div className="text-2xl font-bold text-orange-900">{acceptedUnfunded.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <div className="text-sm text-gray-600 mb-1">Total Payment Obligations</div>
                      <div className="text-2xl font-bold text-orange-900">{formatCurrency(totalOwed)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <div className="text-sm text-gray-600 mb-1">Payment Protection</div>
                      <div className="text-sm font-medium text-green-700 mt-2">
                        🔒 All payments held in secure escrow until work completion
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-orange-100 border border-orange-300 rounded-lg p-3">
                    <p className="text-sm text-orange-900">
                      <strong>Action Required:</strong> Fund these accepted applications to allow workers to begin. Workers are instructed not to start work until payment is secured.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
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
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'funded' ? 'ring-2 ring-primary-600' : ''}`}
                onClick={() => setStatusFilter('funded')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-secondary-600">
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

                  {application.message && (
                    <div className="mb-6">
                      <span className="text-sm text-gray-500 block mb-2">Application Message:</span>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          {application.message}
                        </p>
                      </div>
                    </div>
                  )}

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
                    <>
                      {/* Payment Warning - Unfunded Application */}
                      {application.status === 'accepted' && (!application.paymentStatus || application.paymentStatus === 'unpaid') && (
                        <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <h3 className="text-base font-bold text-orange-900">
                                ⚠️ Payment Required - Please Fund This Project
                              </h3>
                              <p className="mt-2 text-sm text-orange-800">
                                You&apos;ve accepted <strong>{application.applicantName}</strong>&apos;s application, but payment hasn&apos;t been funded yet.
                              </p>
                              <div className="mt-3 bg-orange-100 rounded p-3 border border-orange-300">
                                <p className="text-sm font-semibold text-orange-900">
                                  💡 Secure the worker and ensure project success by funding payment now. The funds will be held safely in escrow until work is completed.
                                </p>
                              </div>
                              <div className="mt-4">
                                <Button
                                  size="sm"
                                  onClick={() => setShowPaymentDialog({ isOpen: true, application })}
                                  className="bg-orange-600 hover:bg-orange-700 font-semibold"
                                >
                                  💳 Fund Payment Now ({formatCurrency(application.proposedRate)})
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status Banner */}
                      <div className={`border rounded-lg p-4 ${
                        application.status === 'funded' ? 'bg-green-50 border-green-200' : 'bg-secondary-50 border-secondary-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className={`w-5 h-5 mr-2 ${
                              application.status === 'funded' ? 'text-green-600' : 'text-secondary-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex flex-col">
                              <span className={`font-medium ${
                                application.status === 'funded' ? 'text-green-800' : 'text-secondary-800'
                              }`}>
                                {application.status === 'funded'
                                  ? `✅ Project Funded - ${application.applicantName} can begin work`
                                  : `Application accepted - Contact ${application.applicantName} to begin the project`}
                              </span>
                              {application.paymentStatus && application.paymentStatus !== 'unpaid' && (
                                <span className={`text-sm mt-1 ${
                                  application.status === 'funded' ? 'text-green-700' : 'text-secondary-700'
                                }`}>
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
                                className="bg-primary-600 hover:bg-primary-700"
                              >
                                💳 Make Payment
                              </Button>
                            ) : (
                              <span className="px-3 py-2 bg-green-100 text-green-800 text-sm rounded-lg font-medium">
                                ✓ Payment Secured
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

                      {/* Employer Completion Review - For Funded Applications */}
                      {application.status === 'funded' && application.completionRequestedAt && (
                        <>
                          {/* Worker Requested Completion - Employer Action Required */}
                          {!application.completionDisputedAt && (
                            <div className="bg-purple-50 border-2 border-purple-400 rounded-lg p-4 mt-4">
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                  <h3 className="text-base font-bold text-purple-900">
                                    Worker Requested Completion - Action Required
                                  </h3>
                                  <p className="mt-2 text-sm text-purple-800">
                                    <strong>{application.applicantName}</strong> has marked this gig as completed and is requesting payment release from escrow.
                                  </p>
                                  <div className="mt-3 bg-purple-100 rounded p-3 border border-purple-300">
                                    <p className="text-sm font-semibold text-purple-900 mb-2">
                                      ⏰ Auto-Release in {calculateDaysUntilAutoRelease(application.completionAutoReleaseAt)} days
                                    </p>
                                    <p className="text-sm text-purple-800">
                                      If you don&apos;t respond, payment will automatically be released to the worker.
                                      Please review the work and either approve or dispute the completion.
                                    </p>
                                  </div>
                                  <div className="mt-2 flex items-center text-xs text-purple-700">
                                    <span className="font-medium">Requested:</span>
                                    <span className="ml-2 px-2 py-1 bg-purple-200 rounded">
                                      {formatDate(application.completionRequestedAt)}
                                    </span>
                                  </div>
                                  <div className="mt-4 flex space-x-3">
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleApproveCompletionClick(application.id, application.gigTitle || 'this gig')}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      ✓ Approve & Release Payment
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDisputeCompletionClick(application.id, application.gigTitle || 'this gig')}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                                    >
                                      Dispute Completion
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Completion Disputed - Awaiting Resolution */}
                          {application.completionDisputedAt && (
                            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mt-4">
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                  <h3 className="text-base font-bold text-yellow-900">
                                    Completion Disputed - Resolution Needed
                                  </h3>
                                  <p className="mt-2 text-sm text-yellow-800">
                                    You disputed the completion request from <strong>{application.applicantName}</strong>.
                                    Auto-release has been paused. Please work together to resolve the issues.
                                  </p>
                                  {application.completionDisputeReason && (
                                    <div className="mt-3 bg-yellow-100 rounded p-3 border border-yellow-300">
                                      <p className="text-sm font-semibold text-yellow-900 mb-1">Your Dispute Reason:</p>
                                      <p className="text-sm text-yellow-800">{application.completionDisputeReason}</p>
                                    </div>
                                  )}
                                  <div className="mt-3 text-sm text-yellow-800">
                                    <p className="font-medium">Next Steps:</p>
                                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                                      <li>Use &quot;Contact Worker&quot; to discuss the issues</li>
                                      <li>Once resolved, approve the completion to release payment</li>
                                      <li>If issues persist, contact MzansiGig support for mediation</li>
                                    </ul>
                                  </div>
                                  <div className="mt-4">
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleApproveCompletionClick(application.id, application.gigTitle || 'this gig')}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      ✓ Issues Resolved - Approve Now
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
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

        {/* Approve Completion Confirmation Dialog */}
        {approveCompletionDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-lg">Approve Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Are you ready to approve completion for <strong>{approveCompletionDialog.gigTitle}</strong> and release payment to the worker?
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>This will:</strong>
                  </p>
                  <ul className="text-sm text-green-800 list-disc list-inside space-y-1 ml-2">
                    <li>Mark the gig as completed</li>
                    <li>Release payment from escrow to the worker</li>
                    <li>Enable you to leave a review</li>
                  </ul>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setApproveCompletionDialog({ isOpen: false, applicationId: '', gigTitle: '' })}
                    disabled={processingCompletion}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApproveCompletionConfirm}
                    disabled={processingCompletion}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingCompletion ? 'Approving...' : 'Yes, Approve & Release Payment'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dispute Completion Dialog */}
        {disputeCompletionDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-lg">Dispute Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Please explain why you&apos;re disputing the completion of <strong>{disputeCompletionDialog.gigTitle}</strong>.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Disputing will pause the auto-release timer. Be specific about what needs to be fixed so the worker can address your concerns.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Dispute (minimum 10 characters)
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                    placeholder="Please explain what issues need to be resolved..."
                    disabled={processingCompletion}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {disputeReason.length} / 10 characters minimum
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDisputeCompletionDialog({ isOpen: false, applicationId: '', gigTitle: '' })
                      setDisputeReason('')
                    }}
                    disabled={processingCompletion}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleDisputeCompletionConfirm}
                    disabled={processingCompletion || disputeReason.trim().length < 10}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {processingCompletion ? 'Disputing...' : 'Submit Dispute'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}