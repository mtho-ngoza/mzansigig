'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { SimpleIdVerification } from '@/lib/services/simpleIdVerification'

interface VerificationSummaryProps {
  className?: string
}

export default function VerificationSummary({ className = '' }: VerificationSummaryProps) {
  const { user } = useAuth()
  const [summary, setSummary] = useState<{
    totalDocuments: number
    verified: number
    pending: number
    rejected: number
    verificationLevel?: 'basic' | 'enhanced' | 'premium'
    nextSteps: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadVerificationSummary()
    }
  }, [user])

  const loadVerificationSummary = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const summaryData = await SimpleIdVerification.getUserVerificationSummary(user.id)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading verification summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-gray-500">Unable to load verification status</p>
        </CardContent>
      </Card>
    )
  }

  const getVerificationStatusColor = () => {
    if (summary.verified > 0) return 'text-green-600 bg-green-100'
    if (summary.pending > 0) return 'text-yellow-600 bg-yellow-100'
    if (summary.rejected > 0) return 'text-red-600 bg-red-100'
    return 'text-gray-600 bg-gray-100'
  }

  const getVerificationStatusText = () => {
    if (summary.verified > 0) return '✓ Partially Verified'
    if (summary.pending > 0) return '⏳ Under Review'
    if (summary.rejected > 0) return '⚠️ Action Required'
    return '📝 Not Started'
  }

  const getOverallProgress = () => {
    if (summary.totalDocuments === 0) return 0
    return Math.round((summary.verified / summary.totalDocuments) * 100)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">ID Verification Status</CardTitle>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getVerificationStatusColor()}`}>
            {getVerificationStatusText()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {summary.totalDocuments > 0 && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Verification Progress</span>
              <span>{getOverallProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getOverallProgress()}%` }}
              />
            </div>
          </div>
        )}

        {/* Document Status Summary */}
        {summary.totalDocuments > 0 ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{summary.verified}</div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{summary.rejected}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-gray-600">No documents uploaded yet</p>
            <p className="text-sm text-gray-500">Upload your ID document to start verification</p>
          </div>
        )}

        {/* Verification Level */}
        {summary.verificationLevel && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Current Level:</span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              summary.verificationLevel === 'premium' ? 'bg-purple-100 text-purple-800' :
              summary.verificationLevel === 'enhanced' ? 'bg-secondary-100 text-secondary-800' :
              'bg-green-100 text-green-800'
            }`}>
              {summary.verificationLevel.charAt(0).toUpperCase() + summary.verificationLevel.slice(1)}
            </span>
          </div>
        )}

        {/* Next Steps */}
        {summary.nextSteps.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Next Steps:</h4>
            <ul className="space-y-1">
              {summary.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm">
                  <span className="text-secondary-500 mt-0.5">•</span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500">
            Verification helps build trust and gives you access to more opportunities on the platform.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}