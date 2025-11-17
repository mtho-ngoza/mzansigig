'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { GigService } from '@/lib/database/gigService'
import { PaymentService } from '@/lib/services/paymentService'
import { Gig, GigApplication } from '@/types/gig'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { ReviewPrompt } from '@/components/review'
import PostGigForm from './PostGigForm'

interface ManageGigsProps {
  onBack: () => void
  onViewGig?: (gigId: string) => void
}

interface GigWithApplications extends Gig {
  applicationCount: number
  applications?: GigApplication[]
  acceptedApplication?: GigApplication
}

export default function ManageGigs({ onBack, onViewGig }: ManageGigsProps) {
  const { user } = useAuth()
  const { success, error: showError, warning } = useToast()
  const [gigs, setGigs] = useState<GigWithApplications[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedGig, setSelectedGig] = useState<GigWithApplications | null>(null)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [completedGig, setCompletedGig] = useState<GigWithApplications | null>(null)
  const [editingGig, setEditingGig] = useState<Gig | null>(null)

  useEffect(() => {
    if (user) {
      fetchGigs()
    }
  }, [user])

  const fetchGigs = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Get all gigs by this employer
      const employerGigs = await GigService.getGigsByEmployer(user.id)

      // Get application count for each gig
      const gigsWithCounts = await Promise.all(
        employerGigs.map(async (gig) => {
          const applications = await GigService.getApplicationsByGig(gig.id)
          // Find the accepted/assigned application (could be accepted, funded, or completed status)
          const acceptedApplication = applications.find(app =>
            app.status === 'accepted' || app.status === 'funded' || app.status === 'completed'
          )

          return {
            ...gig,
            applicationCount: applications.length,
            applications,
            acceptedApplication
          }
        })
      )

      // Sort by most recent first
      gigsWithCounts.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() :
                      (a.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() || 0
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() :
                      (b.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() || 0
        return dateB - dateA
      })

      setGigs(gigsWithCounts)
    } catch (err) {
      console.error('Error fetching gigs:', err)
      setError('Failed to load your gigs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkComplete = async (gig: GigWithApplications) => {
    if (!gig.acceptedApplication) {
      warning('No worker has been assigned to this gig yet. Please accept an application first.')
      return
    }

    setSelectedGig(gig)
    setShowCompletionDialog(true)
  }

  const confirmMarkComplete = async () => {
    if (!selectedGig) return

    setActionLoading(selectedGig.id)
    setShowCompletionDialog(false)

    try {
      // Update gig status to completed
      await GigService.updateGig(selectedGig.id, {
        status: 'completed'
      })

      // Update application status to completed
      if (selectedGig.acceptedApplication?.id) {
        await GigService.updateApplicationStatus(selectedGig.acceptedApplication.id, 'completed')
      }

      // Release escrow if there's a payment
      if (selectedGig.acceptedApplication?.paymentId) {
        await PaymentService.releaseEscrow(selectedGig.acceptedApplication.paymentId)
      }

      // Refresh gigs list
      await fetchGigs()

      // Show review prompt
      setCompletedGig(selectedGig)
      setShowReviewPrompt(true)

      success('Lekker! Gig completed and payment released to the worker')
    } catch (err) {
      console.error('Error completing gig:', err)
      showError('Failed to mark gig as completed. Please try again.')
    } finally {
      setActionLoading(null)
      setSelectedGig(null)
    }
  }

  const handleReviewSubmitted = () => {
    setShowReviewPrompt(false)
    setCompletedGig(null)
  }

  const handleCloseReviewPrompt = () => {
    setShowReviewPrompt(false)
    setCompletedGig(null)
  }

  const handleCancelGig = async (gigId: string) => {
    if (!confirm('Are you sure you want to cancel this gig? This action cannot be undone.')) {
      return
    }

    setActionLoading(gigId)

    try {
      await GigService.updateGig(gigId, {
        status: 'cancelled'
      })

      await fetchGigs()
      success('Gig has been cancelled.')
    } catch (err) {
      console.error('Error cancelling gig:', err)
      showError('Failed to cancel gig. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditGig = async (gigId: string) => {
    try {
      const gig = await GigService.getGigById(gigId)
      if (gig) {
        setEditingGig(gig)
      }
    } catch (error) {
      console.error('Error fetching gig for edit:', error)
      showError('Failed to load gig details. Please try again.')
    }
  }

  const handleEditSuccess = async () => {
    setEditingGig(null)
    await fetchGigs()
  }

  const handleEditCancel = () => {
    setEditingGig(null)
  }

  const getStatusBadge = (status: Gig['status']) => {
    const badges = {
      'open': { label: 'Open', className: 'bg-green-100 text-green-800' },
      'in-progress': { label: 'In Progress', className: 'bg-secondary-100 text-secondary-800' },
      'completed': { label: 'Completed', className: 'bg-gray-100 text-gray-800' },
      'cancelled': { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
      'reviewing': { label: 'Reviewing', className: 'bg-yellow-100 text-yellow-800' }
    }

    const badge = badges[status]

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    // Deterministic ZAR formatting for tests and CI: always "R 5 000" style
    // Avoid Intl differences across environments
    const isNegative = amount < 0
    const abs = Math.round(Math.abs(amount))
    const formatted = abs
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${isNegative ? '-' : ''}R ${formatted}`
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

  // Show edit form if editing
  if (editingGig) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PostGigForm
          editGig={editingGig}
          onSuccess={handleEditSuccess}
          onCancel={handleEditCancel}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Manage Your Gigs</h1>
        <p className="mt-2 text-gray-600">
          View and manage all your posted gigs
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Gigs List */}
      {gigs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">You haven&#39;t posted any gigs yet.</p>
            <Button onClick={onBack}>Post Your First Gig</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig) => (
            <Card key={gig.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{gig.title}</h3>
                      {getStatusBadge(gig.status)}
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">{gig.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>📅 Posted {formatDate(gig.createdAt)}</span>
                      <span>📍 {gig.location}</span>
                      <span>💰 {formatCurrency(gig.budget)}</span>
                      <span>⏱️ {gig.duration}</span>
                      <span>📝 {gig.applicationCount} {gig.applicationCount === 1 ? 'application' : 'applications'}</span>
                    </div>
                    {gig.acceptedApplication && (
                      <div className="mt-2 text-sm text-secondary-600">
                        ✓ Worker assigned: {gig.acceptedApplication.applicantName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {gig.status === 'open' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditGig(gig.id)}
                        disabled={actionLoading === gig.id}
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelGig(gig.id)}
                        disabled={actionLoading === gig.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        ❌ Cancel
                      </Button>
                    </>
                  )}

                  {gig.status === 'in-progress' && gig.acceptedApplication && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleMarkComplete(gig)}
                      disabled={actionLoading === gig.id}
                    >
                      {actionLoading === gig.id ? 'Processing...' : '✓ Mark as Complete'}
                    </Button>
                  )}

                  {gig.status === 'completed' && (
                    <span className="text-sm text-gray-500">
                      ✓ This gig has been completed
                    </span>
                  )}

                  {gig.status === 'cancelled' && (
                    <span className="text-sm text-gray-500">
                      This gig has been cancelled
                    </span>
                  )}

                  {onViewGig && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewGig(gig.id)}
                      className="ml-auto"
                    >
                      View Details →
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completion Confirmation Dialog */}
      {showCompletionDialog && selectedGig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Mark Gig as Complete?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to mark &#34;{selectedGig.title}&#34; as complete?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This will release the payment from escrow to {selectedGig.acceptedApplication?.applicantName}.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCompletionDialog(false)
                    setSelectedGig(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmMarkComplete}
                  className="flex-1"
                >
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Prompt Modal */}
      {showReviewPrompt && completedGig && completedGig.acceptedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="my-8">
            <ReviewPrompt
              gigId={completedGig.id}
              gigTitle={completedGig.title}
              revieweeId={completedGig.assignedTo || completedGig.acceptedApplication.applicantId}
              revieweeName={completedGig.acceptedApplication.applicantName}
              reviewType="employer-to-worker"
              onClose={handleCloseReviewPrompt}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>
        </div>
      )}
    </div>
  )
}
