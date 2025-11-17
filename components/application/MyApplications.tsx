'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { GigApplication } from '@/types/gig'
import { QuickMessageButton } from '@/components/messaging/QuickMessageButton'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'

interface MyApplicationsProps {
  onBack?: () => void
  onBrowseGigs?: () => void
  onMessageConversationStart?: (conversationId: string) => void
}

interface ApplicationWithGig extends GigApplication {
  gigTitle?: string
  gigEmployer?: string
  gigEmployerId?: string
  gigBudget?: number
}

export default function MyApplications({ onBack, onBrowseGigs, onMessageConversationStart }: MyApplicationsProps) {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [applications, setApplications] = useState<ApplicationWithGig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<GigApplication['status'] | 'all'>('all')
  const [withdrawConfirmation, setWithdrawConfirmation] = useState<{ isOpen: boolean; applicationId: string; gigTitle: string }>({
    isOpen: false,
    applicationId: '',
    gigTitle: ''
  })
  const [withdrawing, setWithdrawing] = useState(false)
  const [completionRequestDialog, setCompletionRequestDialog] = useState<{ isOpen: boolean; applicationId: string; gigTitle: string }>({
    isOpen: false,
    applicationId: '',
    gigTitle: ''
  })
  const [requestingCompletion, setRequestingCompletion] = useState(false)

  useEffect(() => {
    const loadApplications = async () => {
      if (!user) return

      try {
        setLoading(true)
        const userApplications = await GigService.getApplicationsByApplicant(user.id)

        // Fetch gig details for each application
        const applicationsWithGigs = await Promise.all(
          userApplications.map(async (app) => {
            try {
              const gig = await GigService.getGigById(app.gigId)
              return {
                ...app,
                gigTitle: gig?.title || 'Unknown Gig',
                gigEmployer: gig?.employerName || 'Unknown Employer',
                gigEmployerId: gig?.employerId,
                gigBudget: gig?.budget
              }
            } catch (error) {
              console.error('Error fetching gig details:', error)
              return {
                ...app,
                gigTitle: 'Unknown Gig',
                gigEmployer: 'Unknown Employer'
              }
            }
          })
        )

        setApplications(applicationsWithGigs)
      } catch (error) {
        console.error('Error loading applications:', error)
        setError('Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [user])

  const getStatusBadgeClass = (status: GigApplication['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'funded':
        return 'bg-secondary-100 text-secondary-800 border-secondary-200'
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const handleWithdrawClick = (applicationId: string, gigTitle: string) => {
    setWithdrawConfirmation({
      isOpen: true,
      applicationId,
      gigTitle
    })
  }

  const handleWithdrawConfirm = async () => {
    try {
      setWithdrawing(true)
      await GigService.withdrawApplication(withdrawConfirmation.applicationId)

      // Update the local state to reflect the withdrawal
      setApplications(prevApps =>
        prevApps.map(app =>
          app.id === withdrawConfirmation.applicationId
            ? { ...app, status: 'withdrawn' as const }
            : app
        )
      )

      // Close the dialog
      setWithdrawConfirmation({ isOpen: false, applicationId: '', gigTitle: '' })
    } catch (error) {
      console.error('Error withdrawing application:', error)
      showError('Failed to withdraw application. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  const handleWithdrawCancel = () => {
    setWithdrawConfirmation({ isOpen: false, applicationId: '', gigTitle: '' })
  }

  const handleRequestCompletionClick = (applicationId: string, gigTitle: string) => {
    setCompletionRequestDialog({
      isOpen: true,
      applicationId,
      gigTitle
    })
  }

  const handleRequestCompletionConfirm = async () => {
    if (!user) return

    try {
      setRequestingCompletion(true)
      await GigService.requestCompletionByWorker(completionRequestDialog.applicationId, user.id)

      // Update the local state to reflect the completion request
      setApplications(prevApps =>
        prevApps.map(app =>
          app.id === completionRequestDialog.applicationId
            ? {
                ...app,
                completionRequestedAt: new Date(),
                completionRequestedBy: 'worker' as const,
                completionAutoReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
              }
            : app
        )
      )

      // Close the dialog
      setCompletionRequestDialog({ isOpen: false, applicationId: '', gigTitle: '' })

      // Show success message
      success('Lekker! Completion request sent. The employer has 7 days to respond')
    } catch (error) {
      console.error('Error requesting completion:', error)
      showError(error instanceof Error ? error.message : 'Failed to request completion. Please try again.')
    } finally {
      setRequestingCompletion(false)
    }
  }

  const handleRequestCompletionCancel = () => {
    setCompletionRequestDialog({ isOpen: false, applicationId: '', gigTitle: '' })
  }

  const calculateDaysUntilAutoRelease = (autoReleaseDate: Date | undefined): number => {
    if (!autoReleaseDate) return 0

    const date = autoReleaseDate instanceof Date ? autoReleaseDate : new Date(autoReleaseDate)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Filter applications based on selected status
  const filteredApplications = statusFilter === 'all'
    ? applications
    : applications.filter(app => app.status === statusFilter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">Loading your applications...</p>
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
          {/* Back Button */}
          {onBack && (
            <div className="mb-6">
              <Button variant="ghost" onClick={onBack}>
                ← Back to Dashboard
              </Button>
            </div>
          )}

          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Applications
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Track the status of your gig applications and stay updated on your progress.
            </p>
          </div>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Eish, No Applications Yet
              </h3>

              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You haven&apos;t applied to any gigs yet. Start browsing available opportunities and submit your first application!
              </p>

              <Button onClick={onBrowseGigs}>
                Browse Gigs
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
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'withdrawn' ? 'ring-2 ring-gray-600' : ''}`}
                onClick={() => setStatusFilter('withdrawn')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {applications.filter(app => app.status === 'withdrawn').length}
                  </div>
                  <div className="text-sm text-gray-600">Withdrawn</div>
                </CardContent>
              </Card>
            </div>

            {/* Applications */}
            {filteredApplications.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-gray-600">
                    Eish, no <strong>{statusFilter}</strong> applications right now
                  </p>
                  <Button variant="outline" onClick={() => setStatusFilter('all')} className="mt-4">
                    Show All Applications
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredApplications.map((application) => (
                <Card key={application.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{application.gigTitle}</CardTitle>
                      <p className="text-gray-600">by {application.gigEmployer}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Application Date */}
                  <div className="mb-4">
                    <span className="text-sm text-gray-500">Applied:</span>
                    <div className="font-medium">{formatDate(application.createdAt)}</div>
                  </div>

                  {/* Payment Information */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Details</h4>

                    {/* Client Budget Breakdown */}
                    {application.gigBudget && (
                      <div className="mb-3">
                        <GigAmountDisplay
                          budget={application.gigBudget}
                          showBreakdown={true}
                          variant="compact"
                        />
                      </div>
                    )}

                    {/* Your Proposed Rate */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Your Proposed Rate:</span>
                        <span className="font-semibold text-lg text-primary-600">{formatCurrency(application.proposedRate)}</span>
                      </div>
                    </div>
                  </div>

                  {application.message && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500 block mb-2">Application Message:</span>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {application.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Withdraw Application Button - Only for pending applications */}
                  {application.status === 'pending' && (
                    <div className="mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdrawClick(application.id, application.gigTitle || 'this gig')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                      >
                        Withdraw Application
                      </Button>
                    </div>
                  )}

                  {/* Message Employer - Available for all application statuses */}
                  {application.gigEmployerId && application.status !== 'rejected' && application.status !== 'withdrawn' && (
                    <div className="mb-4">
                      <QuickMessageButton
                        recipientId={application.gigEmployerId}
                        recipientName={application.gigEmployer || 'Employer'}
                        recipientType="employer"
                        gigId={application.gigId}
                        gigTitle={application.gigTitle}
                        size="sm"
                        variant="outline"
                        onConversationStart={onMessageConversationStart}
                      >
                        Message Employer
                      </QuickMessageButton>
                    </div>
                  )}

                  {application.status === 'accepted' && (
                    <>
                      {/* Payment Warning Banner - Unfunded Work */}
                      {application.paymentStatus !== 'paid' && application.paymentStatus !== 'in_escrow' && (
                        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <h3 className="text-base font-bold text-red-900">
                                ⚠️ PAYMENT NOT FUNDED - DO NOT START WORK
                              </h3>
                              <p className="mt-2 text-sm text-red-800 leading-relaxed">
                                Your application has been accepted, but <strong>the employer has not yet funded the payment</strong>.
                              </p>
                              <div className="mt-3 bg-red-100 rounded p-3 border border-red-300">
                                <p className="text-sm font-semibold text-red-900">
                                  🛡️ For your protection: Do not begin any work until payment status shows &quot;In Escrow&quot; or &quot;Funded&quot;
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-xs text-red-700">
                                <span className="font-medium">Current Payment Status:</span>
                                <span className="ml-2 px-2 py-1 bg-red-200 rounded">
                                  {application.paymentStatus || 'UNPAID'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Secured Banner - Work Can Begin */}
                      {(application.paymentStatus === 'paid' || application.paymentStatus === 'in_escrow') && (
                        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <h3 className="text-base font-bold text-green-900">
                                ✓ Payment Secured in Escrow - Safe to Start Work
                              </h3>
                              <p className="mt-2 text-sm text-green-800">
                                Great news! The payment for this gig is now held in secure escrow. You can safely begin work on this project.
                              </p>
                              <div className="mt-2 flex items-center text-xs text-green-700">
                                <span className="font-medium">Payment Status:</span>
                                <span className="ml-2 px-2 py-1 bg-green-200 rounded font-semibold">
                                  {application.paymentStatus === 'in_escrow' ? 'IN ESCROW' : 'PAID'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Acceptance Confirmation */}
                      <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-secondary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-secondary-800 font-medium">
                            Congratulations! Your application has been accepted.
                          </span>
                        </div>
                        <p className="text-secondary-700 text-sm mt-2">
                          Use the &quot;Message Employer&quot; button above to discuss project details and next steps.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Worker Completion Request - For Funded Applications */}
                  {application.status === 'funded' && (
                    <>
                      {/* Completion Disputed by Employer */}
                      {application.completionDisputedAt && (
                        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <h3 className="text-base font-bold text-red-900">
                                Completion Request Disputed
                              </h3>
                              <p className="mt-2 text-sm text-red-800">
                                The employer has disputed your completion request. Please review their concerns and work together to resolve them.
                              </p>
                              {application.completionDisputeReason && (
                                <div className="mt-3 bg-red-100 rounded p-3 border border-red-300">
                                  <p className="text-sm font-semibold text-red-900 mb-1">Dispute Reason:</p>
                                  <p className="text-sm text-red-800">{application.completionDisputeReason}</p>
                                </div>
                              )}
                              <p className="mt-3 text-xs text-red-700">
                                Use the &quot;Message Employer&quot; button to discuss and resolve this issue.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Completion Requested - Waiting for Employer Response */}
                      {application.completionRequestedAt && !application.completionDisputedAt && (
                        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <h3 className="text-base font-bold text-blue-900">
                                Completion Requested - Awaiting Employer Response
                              </h3>
                              <p className="mt-2 text-sm text-blue-800">
                                You&apos;ve requested completion for this gig. The employer has been notified and can now review and approve your work.
                              </p>
                              <div className="mt-3 bg-blue-100 rounded p-3 border border-blue-300">
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                  🛡️ Worker Protection: Auto-Release Escrow
                                </p>
                                <p className="text-sm text-blue-800">
                                  If the employer doesn&apos;t respond within <strong>{calculateDaysUntilAutoRelease(application.completionAutoReleaseAt)} days</strong>,
                                  payment will automatically be released to you from escrow.
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-xs text-blue-700">
                                <span className="font-medium">Requested:</span>
                                <span className="ml-2 px-2 py-1 bg-blue-200 rounded">
                                  {formatDate(application.completionRequestedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Request Completion Button - Only if not already requested */}
                      {!application.completionRequestedAt && (
                        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <h3 className="text-base font-bold text-purple-900">
                                Work Complete? Request Payment Release
                              </h3>
                              <p className="mt-2 text-sm text-purple-800">
                                When you&apos;ve finished the work, request completion to notify the employer for review.
                                If approved, payment will be released from escrow.
                              </p>
                              <div className="mt-3 bg-purple-100 rounded p-3 border border-purple-300">
                                <p className="text-sm font-semibold text-purple-900 mb-1">
                                  🛡️ Worker Protection Guarantee:
                                </p>
                                <p className="text-sm text-purple-800">
                                  If the employer doesn&apos;t respond within 7 days, payment will automatically release to you.
                                </p>
                              </div>
                              <div className="mt-4">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleRequestCompletionClick(application.id, application.gigTitle || 'this gig')}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  Request Completion
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
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
                          Application not selected this time.
                        </span>
                      </div>
                      <p className="text-red-700 text-sm mt-2">
                        Don&apos;t be discouraged! Keep applying to other opportunities that match your skills.
                      </p>
                    </div>
                  )}

                  {application.status === 'withdrawn' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-800 font-medium">
                          You withdrew this application.
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mt-2">
                        This application has been withdrawn and is no longer active. Feel free to apply to other opportunities.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>
        )}

        {/* Withdrawal Confirmation Dialog */}
        {withdrawConfirmation.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-lg">Confirm Withdrawal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to withdraw your application for <strong>{withdrawConfirmation.gigTitle}</strong>?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This action cannot be undone. You will need to reapply if you change your mind.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleWithdrawCancel}
                    disabled={withdrawing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleWithdrawConfirm}
                    disabled={withdrawing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Request Completion Confirmation Dialog */}
        {completionRequestDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-lg">Request Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Are you ready to request completion for <strong>{completionRequestDialog.gigTitle}</strong>?
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>This will notify the employer to:</strong>
                  </p>
                  <ul className="text-sm text-green-800 list-disc list-inside space-y-1 ml-2">
                    <li>Review your completed work</li>
                    <li>Approve and release payment from escrow</li>
                    <li>OR provide feedback if revisions are needed</li>
                  </ul>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-purple-800">
                    <strong>🛡️ Worker Protection:</strong> If the employer doesn&apos;t respond within 7 days, payment will automatically be released to you from escrow.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleRequestCompletionCancel}
                    disabled={requestingCompletion}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleRequestCompletionConfirm}
                    disabled={requestingCompletion}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {requestingCompletion ? 'Requesting...' : 'Yes, Request Completion'}
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