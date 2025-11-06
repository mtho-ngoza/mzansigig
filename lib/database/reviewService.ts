import { Review, Gig } from '@/types/gig'
import { FirestoreService } from './firestore'
import { GigService } from './gigService'

/**
 * ReviewService - Handles all review and rating operations
 * Manages review creation, retrieval, and user rating calculations
 */
export class ReviewService {
  private static readonly COLLECTION = 'reviews'
  private static readonly USERS_COLLECTION = 'users'

  /**
   * Create a new review for a completed gig
   */
  static async createReview(
    reviewData: Omit<Review, 'id' | 'createdAt'>
  ): Promise<string> {
    // Validate rating is between 1 and 5
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    // Verify gig exists and is completed
    const gig = await GigService.getGigById(reviewData.gigId)
    if (!gig) {
      throw new Error('Gig not found')
    }

    if (gig.status !== 'completed') {
      throw new Error('Can only review completed gigs')
    }

    // Verify reviewer was involved in the gig
    const isEmployer = gig.employerId === reviewData.reviewerId
    const isWorker = gig.assignedTo === reviewData.reviewerId

    if (!isEmployer && !isWorker) {
      throw new Error('You can only review gigs you were involved in')
    }

    // Validate review type matches the reviewer's role
    if (isEmployer && reviewData.type !== 'employer-to-worker') {
      throw new Error('Invalid review type for employer')
    }

    if (isWorker && reviewData.type !== 'worker-to-employer') {
      throw new Error('Invalid review type for worker')
    }

    // Verify reviewee was the other party in the gig
    const expectedRevieweeId = isEmployer ? gig.assignedTo : gig.employerId
    if (reviewData.revieweeId !== expectedRevieweeId) {
      throw new Error('Can only review the other party involved in this gig')
    }

    // Check if review already exists for this gig and reviewer combination
    const existingReviews = await FirestoreService.getWhere<Review>(
      this.COLLECTION,
      'gigId',
      '==',
      reviewData.gigId
    )

    const alreadyReviewed = existingReviews.some(
      (review) =>
        review.reviewerId === reviewData.reviewerId &&
        review.revieweeId === reviewData.revieweeId
    )

    if (alreadyReviewed) {
      throw new Error('You have already reviewed this user for this gig')
    }

    const review: Omit<Review, 'id'> = {
      ...reviewData,
      createdAt: new Date(),
    }

    // Create the review
    const reviewId = await FirestoreService.create(this.COLLECTION, review)

    // Update the reviewee's rating
    await this.updateUserRating(reviewData.revieweeId)

    return reviewId
  }

  /**
   * Get all reviews for a specific user
   */
  static async getUserReviews(userId: string): Promise<Review[]> {
    const reviews = await FirestoreService.getWhere<Review>(
      this.COLLECTION,
      'revieweeId',
      '==',
      userId,
      'createdAt'
    )

    return reviews
  }

  /**
   * Get reviews for a specific gig
   */
  static async getGigReviews(gigId: string): Promise<Review[]> {
    const reviews = await FirestoreService.getWhere<Review>(
      this.COLLECTION,
      'gigId',
      '==',
      gigId,
      'createdAt'
    )

    return reviews
  }

  /**
   * Get reviews written by a specific user
   */
  static async getReviewsByReviewer(reviewerId: string): Promise<Review[]> {
    const reviews = await FirestoreService.getWhere<Review>(
      this.COLLECTION,
      'reviewerId',
      '==',
      reviewerId,
      'createdAt'
    )

    return reviews
  }

  /**
   * Get a single review by ID
   */
  static async getReviewById(reviewId: string): Promise<Review | null> {
    return await FirestoreService.getById<Review>(this.COLLECTION, reviewId)
  }

  /**
   * Update a review
   */
  static async updateReview(
    reviewId: string,
    updates: Partial<Omit<Review, 'id' | 'createdAt'>>
  ): Promise<void> {
    // Validate rating if being updated
    if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
      throw new Error('Rating must be between 1 and 5')
    }

    const review = await this.getReviewById(reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    await FirestoreService.update(this.COLLECTION, reviewId, updates)

    // Update user rating if rating changed
    if (updates.rating !== undefined) {
      await this.updateUserRating(review.revieweeId)
    }
  }

  /**
   * Delete a review
   */
  static async deleteReview(reviewId: string): Promise<void> {
    const review = await this.getReviewById(reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    await FirestoreService.delete(this.COLLECTION, reviewId)

    // Update user rating after deletion
    await this.updateUserRating(review.revieweeId)
  }

  /**
   * Calculate and update a user's average rating
   */
  private static async updateUserRating(userId: string): Promise<void> {
    const reviews = await this.getUserReviews(userId)

    if (reviews.length === 0) {
      // No reviews, set rating to undefined
      await FirestoreService.update(this.USERS_COLLECTION, userId, {
        rating: undefined,
        reviewCount: 0,
      })
      return
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / reviews.length

    // Round to 1 decimal place
    const roundedRating = Math.round(averageRating * 10) / 10

    await FirestoreService.update(this.USERS_COLLECTION, userId, {
      rating: roundedRating,
      reviewCount: reviews.length,
    })
  }

  /**
   * Get average rating for a user
   */
  static async getUserRating(userId: string): Promise<{
    rating: number | null
    reviewCount: number
  }> {
    const reviews = await this.getUserReviews(userId)

    if (reviews.length === 0) {
      return { rating: null, reviewCount: 0 }
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10

    return {
      rating: averageRating,
      reviewCount: reviews.length,
    }
  }

  /**
   * Check if a user can review another user for a specific gig
   */
  static async canReview(
    reviewerId: string,
    revieweeId: string,
    gigId: string
  ): Promise<boolean> {
    // Check if review already exists
    const reviews = await this.getGigReviews(gigId)

    const alreadyReviewed = reviews.some(
      (review) =>
        review.reviewerId === reviewerId && review.revieweeId === revieweeId
    )

    return !alreadyReviewed
  }

  /**
   * Get review statistics for a user
   */
  static async getUserReviewStats(userId: string): Promise<{
    averageRating: number | null
    totalReviews: number
    ratingDistribution: { [key: number]: number }
  }> {
    const reviews = await this.getUserReviews(userId)

    if (reviews.length === 0) {
      return {
        averageRating: null,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    }

    // Calculate average
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10

    // Calculate distribution
    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((review) => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1
    })

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
    }
  }
}

export default ReviewService
