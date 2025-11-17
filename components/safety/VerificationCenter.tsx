'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { SecurityService } from '@/lib/services/securityService'
import { DocumentStorageService } from '@/lib/services/documentStorageService'
import { TrustScoreBadge, VerificationBadge } from './TrustScoreBadge'
import { VerificationDocument } from '@/types/auth'
import DocumentVerificationFlow from './DocumentVerificationFlow'

interface VerificationCenterProps {
  onBack?: () => void
}

export default function VerificationCenter({ onBack }: VerificationCenterProps) {
  const { user, refreshUser } = useAuth()
  const [trustScore, setTrustScore] = useState<number>(50)
  const [isLoading, setIsLoading] = useState(true)
  const [showDocumentFlow, setShowDocumentFlow] = useState<'basic' | 'enhanced' | 'premium' | null>(null)
  const [pendingDocuments, setPendingDocuments] = useState<VerificationDocument[]>([])
  const [rejectedDocuments, setRejectedDocuments] = useState<VerificationDocument[]>([])

  useEffect(() => {
    loadTrustScore()
    loadUserDocuments()
  }, [user])

  const loadTrustScore = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const score = await SecurityService.calculateTrustScore(user.id)
      setTrustScore(score)
    } catch (error) {
      console.error('Error loading trust score:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserDocuments = async () => {
    if (!user) return

    try {
      const documents = await DocumentStorageService.getUserDocuments(user.id)

      const pending = documents.filter(doc => doc.status === 'pending')
      const rejected = documents.filter(doc => doc.status === 'rejected')

      setPendingDocuments(pending)
      setRejectedDocuments(rejected)
    } catch (error) {
      // Silently handle - no documents is a valid state
      // Only log if it's an actual error (not permissions on empty collection)
      if (error instanceof Error && !error.message.includes('permissions')) {
        console.error('Error loading user documents:', error)
      }
    }
  }

  const handleVerificationStep = async (level: 'basic' | 'enhanced' | 'premium') => {
    // Show document upload flow instead of instant verification
    setShowDocumentFlow(level)
  }

  const handleDocumentVerificationComplete = async () => {
    // This will be called when user completes document upload
    setShowDocumentFlow(null)
    await refreshUser()
    await loadTrustScore()

    // Small delay to ensure Firestore has time to propagate
    await new Promise(resolve => setTimeout(resolve, 500))
    await loadUserDocuments()
  }

  const getVerificationLevel = (): 'basic' | 'enhanced' | 'premium' | 'none' => {
    if (user?.verificationLevel) return user.verificationLevel
    if (user?.isVerified) return 'basic'
    return 'none'
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Show document verification flow if selected
  if (showDocumentFlow) {
    return (
      <DocumentVerificationFlow
        verificationLevel={showDocumentFlow}
        onBack={() => setShowDocumentFlow(null)}
        onComplete={handleDocumentVerificationComplete}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Center</h1>
          <p className="text-gray-600 mt-1">
            Build trust with employers and workers through verified credentials
          </p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            ← Back to Safety
          </Button>
        )}
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Your Trust Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Trust Score</h3>
              <TrustScoreBadge score={trustScore} size="lg" />
              <p className="text-xs text-gray-600 mt-2">
                Based on verifications, reviews, and activity
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Verification Status</h3>
              <VerificationBadge level={getVerificationLevel()} size="lg" />
              <p className="text-xs text-gray-600 mt-2">
                Your current verification level
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Documents Notice */}
      {pendingDocuments.length > 0 && (
        <Card className="border-secondary-200 bg-secondary-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  Verification In Progress
                </h3>
                <p className="text-secondary-800 mb-3">
                  {pendingDocuments.length} document{pendingDocuments.length > 1 ? 's are' : ' is'} currently under review by our verification team.
                </p>
                <div className="bg-secondary-100 rounded-lg p-4 space-y-2">
                  {pendingDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-secondary-900 font-medium">
                          {doc.type === 'sa_id' ? 'SA ID Document' :
                           doc.type === 'passport' ? 'Passport' :
                           doc.type === 'drivers_license' ? "Driver's License" : doc.type}
                        </span>
                      </div>
                      <span className="text-secondary-700">
                        Submitted {new Date(doc.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start space-x-2">
                  <svg className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-secondary-800">
                    <p className="font-medium">What happens next?</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>Our team will review your documents within 24-48 hours</li>
                      <li>You&apos;ll receive an email notification once review is complete</li>
                      <li>Your trust score will be updated upon approval</li>
                      <li>No further action is required from you at this time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Documents Notice */}
      {rejectedDocuments.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Action Required: Documents Rejected
                </h3>
                <p className="text-red-800 mb-3">
                  {rejectedDocuments.length} document{rejectedDocuments.length > 1 ? 's were' : ' was'} rejected. Please review the feedback and re-upload.
                </p>
                <div className="bg-red-100 rounded-lg p-4 space-y-3">
                  {rejectedDocuments.map((doc) => (
                    <div key={doc.id} className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-red-900 font-medium">
                          {doc.type === 'sa_id' ? 'SA ID Document' :
                           doc.type === 'passport' ? 'Passport' :
                           doc.type === 'drivers_license' ? "Driver's License" : doc.type}
                        </span>
                      </div>
                      {doc.notes && (
                        <p className="text-sm text-red-700 ml-6">
                          Reason: {doc.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    onClick={() => handleVerificationStep('basic')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Re-upload Documents
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Levels */}
      <div className="grid gap-6">
        {/* Basic Verification */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Basic Verification</h3>
                  {getVerificationLevel() === 'basic' && (
                    <VerificationBadge level="basic" size="sm" />
                  )}
                </div>
                <p className="text-gray-600 mb-4">
                  Verify your identity with SA ID and phone number. Quick and free for all users.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ South African ID verification</li>
                  <li>✓ Phone number confirmation</li>
                  <li>✓ Email verification</li>
                  <li>✓ +15 Trust Score points</li>
                </ul>
              </div>
              <div className="ml-6">
                {getVerificationLevel() === 'none' ? (
                  pendingDocuments.length > 0 ? (
                    <div className="text-center">
                      <div className="text-secondary-600 font-medium mb-2">Under Review</div>
                      <Button disabled variant="outline">
                        Awaiting Approval
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleVerificationStep('basic')}
                    >
                      Start Verification
                    </Button>
                  )
                ) : getVerificationLevel() === 'basic' ? (
                  <div className="text-center">
                    <div className="text-green-600 font-medium">✓ Completed</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-green-600 font-medium">✓ Completed</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Verification - Coming Soon */}
        <Card className="opacity-75">
          <CardContent className="p-6 relative">
            <div className="absolute top-4 right-4">
              <span className="bg-secondary-100 text-secondary-800 text-xs font-medium px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Enhanced Verification</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Background check and address verification. Subsidized for informal workers.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Criminal background check</li>
                  <li>• Address verification</li>
                  <li>• Identity document validation</li>
                  <li>• +25 Trust Score points</li>
                </ul>
                <div className="mt-3 text-sm">
                  <span className="text-secondary-600 font-medium">
                    Launching Q2 2025 - {user?.workSector === 'informal' ? 'Free for informal workers' : 'R150 (subsidized: R50)'}
                  </span>
                </div>
              </div>
              <div className="ml-6">
                <div className="text-center">
                  <div className="text-secondary-600 font-medium mb-2">Coming Soon</div>
                  <Button disabled variant="outline" className="opacity-50">
                    Notify Me
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Verification - Coming Soon */}
        <Card className="opacity-75">
          <CardContent className="p-6 relative">
            <div className="absolute top-4 right-4">
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                Coming Later
              </span>
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Premium Verification</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Comprehensive verification with references and employment history.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Enhanced background check</li>
                  <li>• Employment history verification</li>
                  <li>• Professional references check</li>
                  <li>• Skills assessment (optional)</li>
                  <li>• +40 Trust Score points</li>
                </ul>
                <div className="mt-3 text-sm">
                  <span className="text-purple-600 font-medium">
                    Launching Q3 2025 - {user?.workSector === 'informal' ? 'R200 (subsidized)' : 'R400'}
                  </span>
                </div>
              </div>
              <div className="ml-6">
                <div className="text-center">
                  <div className="text-purple-600 font-medium mb-2">Coming Later</div>
                  <Button disabled variant="outline" className="opacity-50">
                    Notify Me
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benefits of Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Why Get Verified?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">More Opportunities</h4>
              <p className="text-sm text-gray-600">
                Verified users get priority in job applications
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-secondary-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Enhanced Trust</h4>
              <p className="text-sm text-gray-600">
                Build confidence with employers and workers
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Higher Rates</h4>
              <p className="text-sm text-gray-600">
                Verified workers can charge premium rates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}