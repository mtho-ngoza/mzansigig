'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import ReviewForm from './ReviewForm'

interface ReviewPromptProps {
  gigId: string
  gigTitle: string
  revieweeId: string
  revieweeName: string
  reviewType: 'employer-to-worker' | 'worker-to-employer'
  onClose?: () => void
  onReviewSubmitted?: () => void
}

export default function ReviewPrompt({
  gigId,
  gigTitle,
  revieweeId,
  revieweeName,
  reviewType,
  onClose,
  onReviewSubmitted,
}: ReviewPromptProps) {
  const [showForm, setShowForm] = useState(false)

  const handleReviewSuccess = () => {
    setShowForm(false)
    if (onReviewSubmitted) {
      onReviewSubmitted()
    }
  }

  const handleSkip = () => {
    if (onClose) {
      onClose()
    }
  }

  if (showForm) {
    return (
      <ReviewForm
        gigId={gigId}
        gigTitle={gigTitle}
        revieweeId={revieweeId}
        revieweeName={revieweeName}
        reviewType={reviewType}
        onSuccess={handleReviewSuccess}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Leave a Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Gig Completed Successfully!
            </h3>
            <p className="text-gray-600 mb-4">
              {`You've completed "${gigTitle}". Would you like to leave a review for ${revieweeName}?`}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Why reviews matter:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Help build trust in the KasiGig community</li>
                <li>• Guide others in making informed decisions</li>
                <li>• Recognize great work and professionalism</li>
                <li>• Only takes 2 minutes</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleSkip}>
            Maybe Later
          </Button>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Leave Review
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
