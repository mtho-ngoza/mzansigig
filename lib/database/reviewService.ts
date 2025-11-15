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
    reviewData: Omit<Review, 'id' | 'createdAt' | 'isRevealed' | 'reviewDeadline' | 'counterReviewId'>
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

    // Calculate review deadline (30 days from gig completion)
    const reviewDeadline = new Date()
    reviewDeadline.setDate(reviewDeadline.getDate() + 30)

    const review: Omit<Review, 'id'> = {
      ...reviewData,
      createdAt: new Date(),
      isRevealed: false, // Reviews start hidden (mutual reveal)
      reviewDeadline,
    }

    // Create the review
    const reviewId = await FirestoreService.create(this.COLLECTION, review)

    // Check for counter-review and reveal both if it exists
    await this.checkAndRevealMutualReviews(reviewData.gigId, reviewId)

    // Update the reviewee's rating only if review is revealed
    // (We'll update it when both reviews are revealed)
    const createdReview = await this.getReviewById(reviewId)
    if (createdReview?.isRevealed) {
      await this.updateUserRating(reviewData.revieweeId)
    }

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
   * Only counts revealed reviews (mutual review reveal requirement)
   */
  private static async updateUserRating(userId: string): Promise<void> {
    const allReviews = await this.getUserReviews(userId)

    // Only count revealed reviews for rating calculation
    const reviews = allReviews.filter((review) => review.isRevealed)

    if (reviews.length === 0) {
      // No revealed reviews, set rating to undefined
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

  /**
   * Check for counter-review and reveal both reviews if both parties have submitted
   * This implements mutual review reveal - reviews are only visible after both submit
   */
  private static async checkAndRevealMutualReviews(
    gigId: string,
    newReviewId: string
  ): Promise<void> {
    // Get all reviews for this gig
    const gigReviews = await this.getGigReviews(gigId)

    if (gigReviews.length < 2) {
      // Only one review exists, can't reveal yet
      return
    }

    // Find the two reviews (employer and worker)
    const employerReview = gigReviews.find((r) => r.type === 'employer-to-worker')
    const workerReview = gigReviews.find((r) => r.type === 'worker-to-employer')

    if (!employerReview || !workerReview) {
      // Both reviews don't exist yet
      return
    }

    // Both reviews exist! Reveal them mutually
    await FirestoreService.update(this.COLLECTION, employerReview.id, {
      isRevealed: true,
      counterReviewId: workerReview.id,
    })

    await FirestoreService.update(this.COLLECTION, workerReview.id, {
      isRevealed: true,
      counterReviewId: employerReview.id,
    })

    // Update both users' ratings now that reviews are revealed
    await this.updateUserRating(employerReview.revieweeId)
    await this.updateUserRating(workerReview.revieweeId)
  }

  /**
   * Get pending review opportunities for a user
   * Returns completed gigs where user hasn't submitted a review yet
   */
  static async getPendingReviewOpportunities(userId: string): Promise<
    Array<{
      gigId: string
      gig: Gig
      revieweeId: string
      revieweeName: string
      reviewType: 'employer-to-worker' | 'worker-to-employer'
      deadline: Date
      daysRemaining: number
      isOverdue: boolean
    }>
  > {
    // Get reviews by this user
    const userReviews = await this.getReviewsByReviewer(userId)
    const reviewedGigIds = new Set(userReviews.map((r) => r.gigId))

    // Get completed gigs where user was involved
    const completedGigs = await GigService.getCompletedGigsByUser(userId)

    const opportunities = []

    for (const gig of completedGigs) {
      // Skip if already reviewed
      if (reviewedGigIds.has(gig.id)) {
        continue
      }

      const isEmployer = gig.employerId === userId
      const revieweeId = isEmployer ? gig.assignedTo! : gig.employerId
      const reviewType: 'employer-to-worker' | 'worker-to-employer' = isEmployer ? 'employer-to-worker' : 'worker-to-employer'

      // Calculate deadline (30 days from completion)
      const deadline = new Date(gig.updatedAt)
      deadline.setDate(deadline.getDate() + 30)

      const now = new Date()
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isOverdue = daysRemaining < 0

      // Get reviewee name (simplified - in real app would fetch from users collection)
      const revieweeName = isEmployer ? 'Worker' : gig.employerName

      opportunities.push({
        gigId: gig.id,
        gig,
        revieweeId,
        revieweeName,
        reviewType,
        deadline,
        daysRemaining,
        isOverdue,
      })
    }

    // Sort by deadline (soonest first)
    return opportunities.sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
  }

  /**
   * Get revealed reviews for a user (only reviews that have been mutually revealed)
   */
  static async getRevealedUserReviews(userId: string): Promise<Review[]> {
    const reviews = await this.getUserReviews(userId)
    return reviews.filter((review) => review.isRevealed)
  }

  /**
   * Check review status for a gig
   * Returns whether both parties have reviewed and if reviews are revealed
   */
  static async getGigReviewStatus(gigId: string): Promise<{
    employerReviewed: boolean
    workerReviewed: boolean
    bothReviewed: boolean
    areRevealed: boolean
    employerReview?: Review
    workerReview?: Review
  }> {
    const reviews = await this.getGigReviews(gigId)

    const employerReview = reviews.find((r) => r.type === 'employer-to-worker')
    const workerReview = reviews.find((r) => r.type === 'worker-to-employer')

    return {
      employerReviewed: !!employerReview,
      workerReviewed: !!workerReview,
      bothReviewed: !!employerReview && !!workerReview,
      areRevealed: employerReview?.isRevealed || workerReview?.isRevealed || false,
      employerReview,
      workerReview,
    }
  }
}

export default ReviewService
