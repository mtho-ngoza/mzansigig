'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { GigApplication, Gig } from '@/types/gig'
import { QuickMessageButton } from '@/components/messaging/QuickMessageButton'
import { useToast } from '@/contexts/ToastContext'

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
        console.error('Error loading applications:', error)
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
      console.error('Error updating application status:', error)
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
                  <div className="text-sm text-gray-600">Pending Review</div>
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
                  <div className="text-2xl font-bold text-blue-600">
                    {gigs.length}
                  </div>
                  <div className="text-sm text-gray-600">Active Gigs</div>
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
                      <p className="text-gray-600">Applied by {application.applicantName}</p>
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

                  {application.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-800 font-medium">
                            Application accepted - Contact {application.applicantName} to begin the project.
                          </span>
                        </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}