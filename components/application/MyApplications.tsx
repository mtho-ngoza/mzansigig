'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { GigApplication } from '@/types/gig'
import { QuickMessageButton } from '@/components/messaging/QuickMessageButton'
import { useMessaging } from '@/contexts/MessagingContext'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'

interface MyApplicationsProps {
  onBack?: () => void
  onBrowseGigs?: () => void
  onMessageConversationStart?: (conversationId: string) => void
  onMessagesClick?: () => void
}

interface ApplicationWithGig extends GigApplication {
  gigTitle?: string
  gigEmployer?: string
  gigEmployerId?: string
  gigBudget?: number
}

export default function MyApplications({ onBack, onBrowseGigs, onMessageConversationStart, onMessagesClick }: MyApplicationsProps) {
  const { user } = useAuth()
  const { totalUnreadCount } = useMessaging()
  const [applications, setApplications] = useState<ApplicationWithGig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          <div className="flex items-center justify-between mb-4">
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                ← Back to Dashboard
              </Button>
            )}
            {onMessagesClick && (
              <Button
                variant="ghost"
                onClick={onMessagesClick}
                className="relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                )}
              </Button>
            )}
          </div>

          <div className="text-center mb-8">
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
                No Applications Yet
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
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {applications.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Applications</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {applications.filter(app => app.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {applications.filter(app => app.status === 'accepted').length}
                  </div>
                  <div className="text-sm text-gray-600">Accepted</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {applications.filter(app => app.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </CardContent>
              </Card>
            </div>

            {/* Applications */}
            {applications.map((application) => (
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

                  <div className="mb-4">
                    <span className="text-sm text-gray-500 block mb-2">Cover Letter:</span>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {application.coverLetter}
                      </p>
                    </div>
                  </div>

                  {application.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-800 font-medium">
                            Congratulations! Your application has been accepted.
                          </span>
                        </div>
                        {application.gigEmployerId && (
                          <QuickMessageButton
                            recipientId={application.gigEmployerId}
                            recipientName={application.gigEmployer || 'Client'}
                            recipientType="employer"
                            gigId={application.gigId}
                            gigTitle={application.gigTitle}
                            size="sm"
                            onConversationStart={onMessageConversationStart}
                          >
                            Contact Client
                          </QuickMessageButton>
                        )}
                      </div>
                      <p className="text-green-700 text-sm">
                        You can now message the client to discuss project details and next steps.
                      </p>
                    </div>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}