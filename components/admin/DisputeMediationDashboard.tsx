'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { GigApplication } from '@/types/gig'

interface ApplicationWithDetails extends GigApplication {
  gigTitle?: string
  workerName?: string
  employerName?: string
}

export default function DisputeMediationDashboard() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [disputes, setDisputes] = useState<ApplicationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState<ApplicationWithDetails | null>(null)
  const [showResolutionDialog, setShowResolutionDialog] = useState(false)
  const [resolutionType, setResolutionType] = useState<'worker' | 'employer'>('worker')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    loadDisputes()
  }, [])

  const loadDisputes = async () => {
    try {
      setLoading(true)
      const disputedApplications = await GigService.getAllDisputedApplications()

      // Enrich with gig and user details
      const enrichedDisputes: ApplicationWithDetails[] = await Promise.all(
        disputedApplications.map(async (app) => {
          try {
            const gig = await GigService.getGigById(app.gigId)
            return {
              ...app,
              gigTitle: gig?.title,
              workerName: app.applicantName,
              employerName: gig?.employerName
            }
          } catch {
            return {
              ...app,
              workerName: app.applicantName
            }
          }
        })
      )

      setDisputes(enrichedDisputes)
    } catch (error) {
      console.error('Error loading disputes:', error)
      showError('Failed to load disputes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = (dispute: ApplicationWithDetails, type: 'worker' | 'employer') => {
    setSelectedDispute(dispute)
    setResolutionType(type)
    setResolutionNotes('')
    setShowResolutionDialog(true)
  }

  const confirmResolution = async () => {
    if (!user || !selectedDispute) return

    if (!resolutionNotes || resolutionNotes.trim().length < 20) {
      showError('Please provide a detailed explanation (minimum 20 characters)')
      return
    }

    try {
      setResolving(true)

      if (resolutionType === 'worker') {
        await GigService.resolveDisputeInFavorOfWorker(
          selectedDispute.id,
          user.id,
          resolutionNotes
        )
        success('Dispute resolved in favor of worker. Payment has been released.')
      } else {
        await GigService.resolveDisputeInFavorOfEmployer(
          selectedDispute.id,
          user.id,
          resolutionNotes
        )
        success('Dispute resolved in favor of employer. Worker must continue/redo work.')
      }

      // Refresh disputes list
      await loadDisputes()
      setShowResolutionDialog(false)
      setSelectedDispute(null)
    } catch (error) {
      console.error('Error resolving dispute:', error)
      showError(error instanceof Error ? error.message : 'Failed to resolve dispute')
    } finally {
      setResolving(false)
    }
  }

  const formatDate = (date: Date | unknown) => {
    try {
      let dateObj: Date

      if (date && typeof date === 'object' && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
        dateObj = (date as { toDate: () => Date }).toDate()
      } else if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date)
      } else {
        return 'N/A'
      }

      if (isNaN(dateObj.getTime())) {
        return 'N/A'
      }

      return dateObj.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'N/A'
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
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">Loading disputes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dispute Mediation Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Resolve completion disputes between workers and employers
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{disputes.length}</p>
                <p className="text-sm text-gray-600 mt-1">Active Disputes</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(disputes.reduce((sum, d) => sum + d.proposedRate, 0))}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Value in Dispute</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {disputes.filter(d => {
                    const disputed = d.completionDisputedAt
                    if (!disputed) return false
                    const date = disputed instanceof Date ? disputed : new Date(disputed)
                    const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
                    return daysSince > 3
                  }).length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Disputes Over 3 Days Old</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="text-green-600 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Active Disputes
                </h3>
                <p className="text-gray-600">
                  All completion disputes have been resolved. Great work!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <Card key={dispute.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {dispute.gigTitle || 'Gig Title Unavailable'}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Amount: {formatCurrency(dispute.proposedRate)} | Application ID: {dispute.id.slice(0, 8)}...
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium">
                      Disputed
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Worker Side */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Worker Position
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-blue-700 font-medium">Name:</p>
                          <p className="text-blue-900">{dispute.workerName || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-blue-700 font-medium">Completion Requested:</p>
                          <p className="text-blue-900">{formatDate(dispute.completionRequestedAt)}</p>
                        </div>
                        <div className="bg-blue-100 border border-blue-300 rounded p-2 mt-3">
                          <p className="text-blue-900 text-xs">
                            Worker believes they have completed the work as agreed and is requesting payment release from escrow.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Employer Side */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Employer Position
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-orange-700 font-medium">Name:</p>
                          <p className="text-orange-900">{dispute.employerName || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-orange-700 font-medium">Disputed:</p>
                          <p className="text-orange-900">{formatDate(dispute.completionDisputedAt)}</p>
                        </div>
                        <div>
                          <p className="text-orange-700 font-medium mb-1">Dispute Reason:</p>
                          <div className="bg-orange-100 border border-orange-300 rounded p-2">
                            <p className="text-orange-900 text-sm">
                              {dispute.completionDisputeReason || 'No reason provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-700 mb-4">
                      <strong>Your Decision:</strong> Review both sides carefully and choose which party&apos;s position is more justified.
                    </p>
                    <div className="flex space-x-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResolve(dispute, 'worker')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        ✓ Approve Worker - Release Payment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(dispute, 'employer')}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300"
                      >
                        Support Employer - Continue Work
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resolution Dialog */}
        {showResolutionDialog && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-lg">
                  {resolutionType === 'worker' ? 'Resolve in Favor of Worker' : 'Resolve in Favor of Employer'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${resolutionType === 'worker' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4 mb-4`}>
                  <p className="text-sm font-semibold mb-2">
                    {resolutionType === 'worker' ? 'This will:' : 'This will:'}
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    {resolutionType === 'worker' ? (
                      <>
                        <li>Mark the gig as completed</li>
                        <li>Release {formatCurrency(selectedDispute.proposedRate)} from escrow to the worker</li>
                        <li>Close the dispute permanently</li>
                      </>
                    ) : (
                      <>
                        <li>Clear the completion request</li>
                        <li>Keep the escrow locked</li>
                        <li>Require the worker to continue/redo the work</li>
                        <li>Allow the worker to request completion again after fixes</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Explanation (Required - Minimum 20 characters)
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Explain your decision to both parties. Be specific about what evidence led you to this conclusion.
                  </p>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px]"
                    placeholder="Example: After reviewing both sides, I determined that the worker has completed the agreed-upon work. The employer's concerns about minor styling issues do not justify withholding payment, as they were not part of the original requirements..."
                    disabled={resolving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {resolutionNotes.length} / 20 characters minimum
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResolutionDialog(false)
                      setSelectedDispute(null)
                      setResolutionNotes('')
                    }}
                    disabled={resolving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmResolution}
                    disabled={resolving || resolutionNotes.trim().length < 20}
                    className={resolutionType === 'worker' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}
                  >
                    {resolving ? 'Resolving...' : 'Confirm Resolution'}
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
