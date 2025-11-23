'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ReviewService } from '@/lib/database/reviewService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Review } from '@/types/gig'
import {
  validateReviewSubmission,
  sanitizeReviewComment,
  REVIEW_TEXT_LIMITS
} from '@/lib/utils/reviewValidation'

interface ReviewFormProps {
  gigId: string
  gigTitle: string
  revieweeId: string
  revieweeName: string
  reviewType: 'employer-to-worker' | 'worker-to-employer'
  reviewDeadline: Date
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ReviewForm({
  gigId,
  gigTitle,
  revieweeId,
  revieweeName,
  reviewType,
  reviewDeadline,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const { success, error: showError } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({})

  const validateForm = (): boolean => {
    const validation = validateReviewSubmission(rating, comment, reviewDeadline)

    const newErrors: { rating?: string; comment?: string } = {}

    if (validation.errors.rating) {
      newErrors.rating = validation.errors.rating
    }

    if (validation.errors.comment) {
      newErrors.comment = validation.errors.comment
    }

    if (validation.errors.deadline) {
      newErrors.comment = validation.errors.deadline
    }

    if (validation.errors.spam) {
      newErrors.comment = validation.errors.spam
    }

    if (validation.errors.profanity) {
      newErrors.comment = validation.errors.profanity
    }

    setErrors(newErrors)
    return validation.isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showError('You must be logged in to submit a review')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Sanitize comment before submission
      const sanitizedComment = sanitizeReviewComment(comment, REVIEW_TEXT_LIMITS.COMMENT_MAX)

      const reviewData: Omit<Review, 'id' | 'createdAt' | 'isRevealed' | 'reviewDeadline' | 'counterReviewId'> = {
        gigId,
        reviewerId: user.id,
        revieweeId,
        rating,
        comment: sanitizedComment,
        type: reviewType
      }

      await ReviewService.createReview(reviewData)

      success('Lekker! Your review has been submitted')

      if (onSuccess) {
        onSuccess()
      } else {
        // Reset form
        setRating(0)
        setComment('')
        setErrors({})
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      if (error instanceof Error) {
        showError(error.message)
      } else {
        showError('Failed to submit review. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingClick = (value: number) => {
    setRating(value)
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: undefined }))
    }
  }

  const handleCommentChange = (value: string) => {
    setComment(value)
    if (errors.comment) {
      setErrors((prev) => ({ ...prev, comment: undefined }))
    }
  }

  const getRatingLabel = (value: number): string => {
    switch (value) {
      case 1:
        return 'Poor'
      case 2:
        return 'Fair'
      case 3:
        return 'Good'
      case 4:
        return 'Very Good'
      case 5:
        return 'Excellent'
      default:
        return 'Select a rating'
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Review {reviewType === 'employer-to-worker' ? 'Worker' : 'Employer'}: {revieweeName}
          </CardTitle>
          <p className="text-gray-600">
            Share your experience working on: {gigTitle}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overall Rating *
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRatingClick(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                    aria-label={`Rate ${value} stars`}
                  >
                    <svg
                      className={`w-10 h-10 transition-colors ${
                        value <= (hoveredRating || rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300 fill-current'
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {getRatingLabel(hoveredRating || rating)}
              </p>
              {errors.rating && (
                <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
              )}
            </div>

            {/* Comment Section */}
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Your Review *
              </label>
              <textarea
                id="comment"
                rows={6}
                placeholder={`Share your experience working with ${revieweeName}. What went well? What could be improved?`}
                value={comment}
                onChange={(e) => handleCommentChange(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.comment ? 'border-red-500' : ''
                }`}
                maxLength={1000}
              />
              {errors.comment && (
                <p className="mt-1 text-sm text-red-600">{errors.comment}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {comment.length}/{REVIEW_TEXT_LIMITS.COMMENT_MAX} characters (minimum {REVIEW_TEXT_LIMITS.COMMENT_MIN})
              </p>
            </div>

            {/* Review Guidelines */}
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
              <h5 className="font-semibold text-secondary-800 mb-2">Review Guidelines</h5>
              <ul className="text-sm text-secondary-700 space-y-1">
                <li>• Be honest and constructive in your feedback</li>
                <li>• Focus on your experience with this specific gig</li>
                <li>• Mention communication, professionalism, and quality of work</li>
                <li>• Avoid personal attacks or inappropriate language</li>
                <li>• Your review will help others make informed decisions</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
