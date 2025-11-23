'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ReviewService } from '@/lib/database/reviewService'
import { Review } from '@/types/gig'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/contexts/ToastContext'
import { sanitizeForDisplay } from '@/lib/utils/textSanitization'

interface ReviewListProps {
  userId: string
  title?: string
  showLoadMore?: boolean
  maxInitialReviews?: number
}

export default function ReviewList({
  userId,
  title = 'Reviews',
  showLoadMore = true,
  maxInitialReviews = 5,
}: ReviewListProps) {
  const { error: showError } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [displayCount, setDisplayCount] = useState(maxInitialReviews)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReviews()
  }, [userId])

  const loadReviews = async () => {
    setIsLoading(true)
    try {
      const data = await ReviewService.getUserReviews(userId)
      setReviews(data)
    } catch (error) {
      console.error('Error loading reviews:', error)
      showError('Failed to load reviews')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 5)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300 fill-current'
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    )
  }

  const formatDate = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <p className="mt-4 text-gray-500">No reviews yet</p>
            <p className="mt-2 text-sm text-gray-400">
              Reviews from completed gigs will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayedReviews = reviews.slice(0, displayCount)
  const hasMore = reviews.length > displayCount

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <span className="text-sm text-gray-500">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {displayedReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {review.type === 'employer-to-worker'
                      ? 'Review from employer'
                      : 'Review from worker'}
                  </p>
                </div>
              </div>

              {/* Review Comment */}
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {sanitizeForDisplay(review.comment)}
              </p>

              {/* Review Footer - Optional metadata */}
              <div className="mt-3 flex items-center text-xs text-gray-400">
                <span className="inline-flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Verified review from completed gig
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {showLoadMore && hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Load more reviews
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
