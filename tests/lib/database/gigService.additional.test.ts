import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { Gig, GigApplication, Review } from '@/types/gig'
import * as locationUtils from '@/lib/utils/locationUtils'

// Mock FirestoreService and locationUtils
jest.mock('@/lib/database/firestore')
jest.mock('@/lib/utils/locationUtils')

const mockFirestore = jest.mocked(FirestoreService)
const mockLocationUtils = jest.mocked(locationUtils)

describe('GigService - Additional Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createGig with coordinates', () => {
    it('should add coordinates if location provided and coordinates missing', async () => {
      const mockCoords = { latitude: -26.2041, longitude: 28.0473 }
      mockLocationUtils.getCityCoordinates.mockReturnValue(mockCoords)
      mockFirestore.create.mockResolvedValue('gig-123')

      const gigData: Omit<Gig, 'id' | 'createdAt' | 'updatedAt'> = {
        title: 'Test Gig',
        description: 'Test Description',
        category: 'technology',
        location: 'Johannesburg',
        budget: 1000,
        duration: '1 week',
        skillsRequired: ['JavaScript'],
        employerId: 'emp-123',
        employerName: 'Test Employer',
        status: 'open',
        applicants: [],
        deadline: new Date('2025-12-31'),
        workType: 'remote'
      }

      await GigService.createGig(gigData)

      expect(mockLocationUtils.getCityCoordinates).toHaveBeenCalledWith('Johannesburg')
      expect(mockFirestore.create).toHaveBeenCalledWith('gigs', expect.objectContaining({
        coordinates: mockCoords
      }))
    })

    it('should not add coordinates if getCityCoordinates returns null', async () => {
      mockLocationUtils.getCityCoordinates.mockReturnValue(null)
      mockFirestore.create.mockResolvedValue('gig-123')

      const gigData: Omit<Gig, 'id' | 'createdAt' | 'updatedAt'> = {
        title: 'Test Gig',
        description: 'Test Description',
        category: 'technology',
        location: 'UnknownCity',
        budget: 1000,
        duration: '1 week',
        skillsRequired: ['JavaScript'],
        employerId: 'emp-123',
        employerName: 'Test Employer',
        status: 'open',
        applicants: [],
        deadline: new Date('2025-12-31'),
        workType: 'remote'
      }

      await GigService.createGig(gigData)

      expect(mockFirestore.create).toHaveBeenCalledWith('gigs', expect.not.objectContaining({
        coordinates: expect.anything()
      }))
    })
  })

  describe('searchGigs', () => {
    it('should filter by category when category is provided', async () => {
      const mockGigs: Gig[] = [
        {
          id: 'gig-1',
          title: 'Tech Job',
          description: 'A tech job',
          category: 'technology',
          location: 'Johannesburg',
          budget: 1000,
          duration: '1 week',
          skillsRequired: ['JavaScript'],
          employerId: 'emp-1',
          employerName: 'Employer 1',
          status: 'open',
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deadline: new Date('2025-12-31'),
          workType: 'remote'
        }
      ]

      mockFirestore.getWhere.mockResolvedValue(mockGigs)

      const results = await GigService.searchGigs('tech', 'technology')

      expect(mockFirestore.getWhere).toHaveBeenCalledWith('gigs', 'category', '==', 'technology', 'createdAt', 'desc', undefined)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('gig-1')
    })
  })

  describe('searchGigsWithLocation', () => {
    const mockGig: Gig = {
      id: 'gig-1',
      title: 'Test Gig',
      description: 'A test gig',
      category: 'technology',
      location: 'Johannesburg',
      budget: 1000,
      duration: '1 week',
      skillsRequired: ['JavaScript'],
      employerId: 'emp-1',
      employerName: 'Employer 1',
      status: 'open',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline: new Date('2025-12-31'),
      coordinates: { latitude: -26.2041, longitude: 28.0473 },
      workType: 'remote'
    }

    it('should filter by city when city option is provided', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])

      const results = await GigService.searchGigsWithLocation('', { city: 'Johannesburg' })

      expect(mockFirestore.getWhere).toHaveBeenCalledWith('gigs', 'location', '==', 'Johannesburg', 'createdAt')
      expect(results).toHaveLength(1)
    })

    it('should apply text search filter when search term provided', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])

      const results = await GigService.searchGigsWithLocation('javascript', {})

      expect(results).toHaveLength(1)
      expect(results[0].skillsRequired).toContain('JavaScript')
    })

    it('should add coordinates to gigs without coordinates', async () => {
      const gigWithoutCoords: Gig = { ...mockGig, coordinates: undefined }
      const mockCoords = { latitude: -26.2041, longitude: 28.0473 }

      mockFirestore.getWhere.mockResolvedValue([gigWithoutCoords])
      mockLocationUtils.getCityCoordinates.mockReturnValue(mockCoords)
      mockFirestore.update.mockResolvedValue()

      const results = await GigService.searchGigsWithLocation('', { city: 'Johannesburg' })

      expect(mockLocationUtils.getCityCoordinates).toHaveBeenCalledWith('Johannesburg')
      expect(mockFirestore.update).toHaveBeenCalledWith('gigs', 'gig-1', expect.objectContaining({
        coordinates: mockCoords
      }))
    })

    it('should filter by radius when coordinates and radius provided', async () => {
      const userCoords = { latitude: -26.2041, longitude: 28.0473 }
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.filterByRadius.mockReturnValue([mockGig])

      const results = await GigService.searchGigsWithLocation('', {
        coordinates: userCoords,
        radius: 25
      })

      expect(mockLocationUtils.filterByRadius).toHaveBeenCalled()
    })

    it('should sort by distance when sortByDistance option is true', async () => {
      const userCoords = { latitude: -26.2041, longitude: 28.0473 }
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.sortByDistance.mockReturnValue([mockGig] as any)

      const results = await GigService.searchGigsWithLocation('', {
        coordinates: userCoords,
        sortByDistance: true
      })

      expect(mockLocationUtils.sortByDistance).toHaveBeenCalled()
    })

    it('should apply maxResults limit', async () => {
      const mockGigs = [mockGig, { ...mockGig, id: 'gig-2' }, { ...mockGig, id: 'gig-3' }]
      mockFirestore.getWhere.mockResolvedValue(mockGigs)
      mockLocationUtils.sortByDistance.mockReturnValue(mockGigs as any)

      const results = await GigService.searchGigsWithLocation('', {
        coordinates: { latitude: -26.2041, longitude: 28.0473 },
        sortByDistance: true,
        maxResults: 2
      })

      expect(results).toHaveLength(2)
    })

    it('should not filter by radius when radius is 500 (Anywhere in SA)', async () => {
      const userCoords = { latitude: -26.2041, longitude: 28.0473 }
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.filterByRadius.mockReturnValue([mockGig])

      await GigService.searchGigsWithLocation('', {
        coordinates: userCoords,
        radius: 500
      })

      expect(mockLocationUtils.filterByRadius).not.toHaveBeenCalled()
    })
  })

  describe('getGigsNearLocation', () => {
    const mockCoords = { latitude: -26.2041, longitude: 28.0473 }
    const mockGig: Gig = {
      id: 'gig-1',
      title: 'Test Gig',
      description: 'Test',
      category: 'technology',
      location: 'Johannesburg',
      budget: 1000,
      duration: '1 week',
      skillsRequired: ['JavaScript'],
      employerId: 'emp-1',
      employerName: 'Employer 1',
      status: 'open',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline: new Date('2025-12-31'),
      coordinates: mockCoords,
      workType: 'remote'
    }

    it('should filter by category when provided', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.calculateDistance.mockReturnValue(10)

      await GigService.getGigsNearLocation(mockCoords, 25, 'technology')

      expect(mockFirestore.getWhere).toHaveBeenCalledWith('gigs', 'category', '==', 'technology', 'createdAt')
    })

    it('should calculate distance and add distanceInfo', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.calculateDistance.mockReturnValue(10)

      const results = await GigService.getGigsNearLocation(mockCoords, 25)

      expect(mockLocationUtils.calculateDistance).toHaveBeenCalledWith(mockCoords, mockCoords)
      expect(results[0].distanceInfo).toEqual({
        distance: 10,
        unit: 'km',
        travelTime: expect.any(Number)
      })
    })

    it('should filter out gigs beyond radius', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.calculateDistance.mockReturnValue(30)

      const results = await GigService.getGigsNearLocation(mockCoords, 25)

      expect(results).toHaveLength(0)
    })

    it('should skip gigs without coordinates', async () => {
      const gigWithoutCoords = { ...mockGig, coordinates: undefined }
      mockFirestore.getWhere.mockResolvedValue([gigWithoutCoords])
      mockLocationUtils.getCityCoordinates.mockReturnValue(null)

      const results = await GigService.getGigsNearLocation(mockCoords, 25)

      expect(results).toHaveLength(0)
    })
  })

  describe('getRecommendedGigs', () => {
    const mockCoords = { latitude: -26.2041, longitude: 28.0473 }
    const mockGig: Gig = {
      id: 'gig-1',
      title: 'Test Gig',
      description: 'Test',
      category: 'technology',
      location: 'Johannesburg',
      budget: 1000,
      duration: '1 week',
      skillsRequired: ['JavaScript', 'React'],
      employerId: 'emp-1',
      employerName: 'Employer 1',
      status: 'open',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline: new Date('2025-12-31'),
      coordinates: mockCoords,
      workType: 'remote'
    }

    it('should calculate relevance score based on skills and distance', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.calculateDistance.mockReturnValue(10)

      const results = await GigService.getRecommendedGigs(mockCoords, ['JavaScript'], 50)

      expect(results[0].relevanceScore).toBeGreaterThan(0)
      expect(results[0].distanceInfo).toBeDefined()
    })

    it('should filter out gigs beyond maxDistance', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.calculateDistance.mockReturnValue(60)

      const results = await GigService.getRecommendedGigs(mockCoords, ['JavaScript'], 50)

      expect(results).toHaveLength(0)
    })

    it('should sort by relevance score (highest first)', async () => {
      const gig1 = { ...mockGig, id: 'gig-1', skillsRequired: ['JavaScript'] }
      const gig2 = { ...mockGig, id: 'gig-2', skillsRequired: ['JavaScript', 'React'] }

      mockFirestore.getWhere.mockResolvedValue([gig1, gig2])
      mockLocationUtils.calculateDistance.mockReturnValue(10)

      const results = await GigService.getRecommendedGigs(mockCoords, ['JavaScript', 'React'], 50)

      expect(results).toHaveLength(2)
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(results[1].relevanceScore)
    })

    it('should handle empty userSkills array', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockGig])
      mockLocationUtils.calculateDistance.mockReturnValue(10)

      const results = await GigService.getRecommendedGigs(mockCoords, [], 50)

      expect(results).toHaveLength(1)
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('updateApplicationPaymentStatus', () => {
    it('should update payment status without paymentId', async () => {
      mockFirestore.update.mockResolvedValue()

      await GigService.updateApplicationPaymentStatus('app-123', 'unpaid')

      expect(mockFirestore.update).toHaveBeenCalledWith('applications', 'app-123', {
        paymentStatus: 'unpaid'
      })
    })

    it('should update payment status with paymentId', async () => {
      mockFirestore.update.mockResolvedValue()

      await GigService.updateApplicationPaymentStatus('app-123', 'released', 'payment-456')

      expect(mockFirestore.update).toHaveBeenCalledWith('applications', 'app-123', {
        paymentStatus: 'released',
        paymentId: 'payment-456'
      })
    })
  })

  describe('withdrawApplication', () => {
    it('should allow withdrawal of pending application', async () => {
      const mockApplication: GigApplication = {
        id: 'app-123',
        gigId: 'gig-123',
        applicantId: 'user-123',
        applicantName: 'Test User',
        proposedRate: 500,
        status: 'pending',
        createdAt: new Date()
      }

      mockFirestore.getById.mockResolvedValue(mockApplication)
      mockFirestore.update.mockResolvedValue()

      await GigService.withdrawApplication('app-123')

      expect(mockFirestore.update).toHaveBeenCalledWith('applications', 'app-123', { status: 'withdrawn' })
    })

    it('should throw error when application not found', async () => {
      mockFirestore.getById.mockResolvedValue(null)

      await expect(GigService.withdrawApplication('app-123')).rejects.toThrow('Application not found')
    })

    it('should throw error when withdrawing non-pending application', async () => {
      const mockApplication: GigApplication = {
        id: 'app-123',
        gigId: 'gig-123',
        applicantId: 'user-123',
        applicantName: 'Test User',
        proposedRate: 500,
        status: 'accepted',
        createdAt: new Date()
      }

      mockFirestore.getById.mockResolvedValue(mockApplication)

      await expect(GigService.withdrawApplication('app-123'))
        .rejects.toThrow('Cannot withdraw application with status: accepted')
    })
  })

  describe('createReview', () => {
    it('should create review with createdAt timestamp', async () => {
      const reviewData: Omit<Review, 'id' | 'createdAt'> = {
        gigId: 'gig-123',
        reviewerId: 'user-123',
        revieweeId: 'user-456',
        rating: 5,
        comment: 'Great work!',
        type: 'employer-to-worker',
        isRevealed: true,
        reviewDeadline: new Date('2025-12-31')
      }

      mockFirestore.create.mockResolvedValue('review-123')

      const reviewId = await GigService.createReview(reviewData)

      expect(reviewId).toBe('review-123')
      expect(mockFirestore.create).toHaveBeenCalledWith('reviews', expect.objectContaining({
        ...reviewData,
        createdAt: expect.any(Date)
      }))
    })
  })

  describe('getReviewsByUser', () => {
    const mockReview: Review = {
      id: 'review-1',
      gigId: 'gig-1',
      reviewerId: 'user-123',
      revieweeId: 'user-456',
      rating: 5,
      comment: 'Great!',
      type: 'employer-to-worker',
      createdAt: new Date(),
      isRevealed: true,
      reviewDeadline: new Date('2025-12-31')
    }

    it('should get reviews as reviewee when type is employer-to-worker', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockReview])

      const reviews = await GigService.getReviewsByUser('user-456', 'employer-to-worker')

      expect(mockFirestore.getWhere).toHaveBeenCalledWith('reviews', 'revieweeId', '==', 'user-456', 'createdAt')
      expect(reviews).toHaveLength(1)
    })

    it('should get reviews as reviewer when type is worker-to-employer', async () => {
      mockFirestore.getWhere.mockResolvedValue([mockReview])

      const reviews = await GigService.getReviewsByUser('user-123', 'worker-to-employer')

      expect(mockFirestore.getWhere).toHaveBeenCalledWith('reviews', 'reviewerId', '==', 'user-123', 'createdAt')
      expect(reviews).toHaveLength(1)
    })

    it('should get all reviews when type is not specified', async () => {
      const asReviewer = [mockReview]
      const asReviewee = [{ ...mockReview, id: 'review-2' }]

      mockFirestore.getWhere
        .mockResolvedValueOnce(asReviewer)
        .mockResolvedValueOnce(asReviewee)

      const reviews = await GigService.getReviewsByUser('user-123')

      expect(reviews).toHaveLength(2)
    })
  })

  describe('getReviewsByGig', () => {
    it('should get all reviews for a gig', async () => {
      const mockReviews: Review[] = [{
        id: 'review-1',
        gigId: 'gig-123',
        reviewerId: 'user-123',
        revieweeId: 'user-456',
        rating: 5,
        comment: 'Great!',
        type: 'employer-to-worker',
        createdAt: new Date(),
        isRevealed: true,
        reviewDeadline: new Date('2025-12-31')
      }]

      mockFirestore.getWhere.mockResolvedValue(mockReviews)

      const reviews = await GigService.getReviewsByGig('gig-123')

      expect(mockFirestore.getWhere).toHaveBeenCalledWith('reviews', 'gigId', '==', 'gig-123', 'createdAt')
      expect(reviews).toHaveLength(1)
    })
  })

  describe('calculateUserRating', () => {
    it('should calculate average rating', async () => {
      const mockReviews: Review[] = [
        {
          id: 'review-1',
          gigId: 'gig-1',
          reviewerId: 'user-1',
          revieweeId: 'user-456',
          rating: 5,
          comment: 'Great!',
          type: 'employer-to-worker',
          createdAt: new Date(),
          isRevealed: true,
          reviewDeadline: new Date('2025-12-31')
        },
        {
          id: 'review-2',
          gigId: 'gig-2',
          reviewerId: 'user-2',
          revieweeId: 'user-456',
          rating: 3,
          comment: 'Good',
          type: 'employer-to-worker',
          createdAt: new Date(),
          isRevealed: true,
          reviewDeadline: new Date('2025-12-31')
        }
      ]

      mockFirestore.getWhere.mockResolvedValue(mockReviews)

      const rating = await GigService.calculateUserRating('user-456')

      expect(rating).toBe(4.0)
    })

    it('should return 0 when no reviews exist', async () => {
      mockFirestore.getWhere.mockResolvedValue([])

      const rating = await GigService.calculateUserRating('user-456')

      expect(rating).toBe(0)
    })
  })
})
