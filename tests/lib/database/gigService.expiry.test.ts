import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { Gig, GigApplication } from '@/types/gig'

// Mock FirestoreService
jest.mock('@/lib/database/firestore')

describe('GigService Expiry Functions', () => {
  const mockGig: Gig = {
    id: 'gig-1',
    title: 'Test Gig',
    description: 'Test description',
    category: 'Technology',
    location: 'Johannesburg',
    budget: 1000,
    duration: '1 week',
    skillsRequired: ['JavaScript'],
    employerId: 'employer-1',
    employerName: 'Employer Name',
    status: 'open',
    applicants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }

  const mockApplication: Partial<GigApplication> = {
    id: 'app-1',
    gigId: 'gig-1',
    applicantId: 'worker-1',
    applicantName: 'Worker Name',
    status: 'pending',
    proposedRate: 1000,
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods to reduce noise in test output
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('expireOldGigs', () => {
    it('should expire unfunded gigs older than 7 days', async () => {
      const oldGig = {
        ...mockGig,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        status: 'open' as const
      }

      ;(FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([oldGig]) // open gigs
        .mockResolvedValueOnce([]) // in-progress gigs
        .mockResolvedValue([]) // applications

      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.expireOldGigs()

      expect(result).toEqual({
        unfundedExpired: 1,
        overdueExpired: 0,
        total: 1
      })
      expect(FirestoreService.update).toHaveBeenCalledWith('gigs', 'gig-1', {
        status: 'cancelled',
        updatedAt: expect.any(Date)
      })
    })

    it('should not expire funded gigs older than 7 days', async () => {
      const oldGig = {
        ...mockGig,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        status: 'open' as const
      }
      const fundedApp = { ...mockApplication, status: 'funded' as const }

      ;(FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([oldGig]) // open gigs
        .mockResolvedValueOnce([]) // in-progress gigs
        .mockResolvedValueOnce([fundedApp]) // funded application

      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.expireOldGigs()

      expect(result).toEqual({
        unfundedExpired: 0,
        overdueExpired: 0,
        total: 0
      })
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should expire gigs past their deadline', async () => {
      const overdueGig = {
        ...mockGig,
        status: 'in-progress' as const,
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago (not old enough to be unfunded)
      }

      ;(FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([]) // open gigs
        .mockResolvedValueOnce([overdueGig]) // in-progress gigs

      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.expireOldGigs()

      expect(result).toEqual({
        unfundedExpired: 0,
        overdueExpired: 1,
        total: 1
      })
      expect(FirestoreService.update).toHaveBeenCalledWith('gigs', 'gig-1', {
        status: 'cancelled',
        updatedAt: expect.any(Date)
      })
    })

    it('should not expire gigs before their deadline', async () => {
      const futureGig = {
        ...mockGig,
        status: 'open' as const,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }

      ;(FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([futureGig]) // open gigs
        .mockResolvedValueOnce([]) // in-progress gigs

      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.expireOldGigs()

      expect(result).toEqual({
        unfundedExpired: 0,
        overdueExpired: 0,
        total: 0
      })
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should expire both unfunded and overdue gigs in one run', async () => {
      const unfundedOldGig = {
        ...mockGig,
        id: 'gig-unfunded',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        status: 'open' as const,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // future deadline
      }

      const overdueGig = {
        ...mockGig,
        id: 'gig-overdue',
        status: 'in-progress' as const,
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }

      ;(FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([unfundedOldGig]) // open gigs
        .mockResolvedValueOnce([overdueGig]) // in-progress gigs
        .mockResolvedValueOnce([]) // no applications for unfunded gig

      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.expireOldGigs()

      expect(result).toEqual({
        unfundedExpired: 1,
        overdueExpired: 1,
        total: 2
      })
      expect(FirestoreService.update).toHaveBeenCalledTimes(2)
    })

    it('should handle errors gracefully and continue processing', async () => {
      const gig1 = {
        ...mockGig,
        id: 'gig-1',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: 'open' as const
      }
      const gig2 = {
        ...mockGig,
        id: 'gig-2',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: 'open' as const
      }

      ;(FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([gig1, gig2]) // open gigs
        .mockResolvedValueOnce([]) // in-progress gigs
        .mockResolvedValueOnce([]) // applications for gig-1
        .mockRejectedValueOnce(new Error('Network error')) // error getting applications for gig-2

      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.expireOldGigs()

      // Should still expire gig-1 despite error on gig-2
      expect(result.unfundedExpired).toBe(1)
      expect(console.error).toHaveBeenCalledWith(
        'Error expiring gig gig-2:',
        expect.any(Error)
      )
    })

    it('should not expire completed or cancelled gigs', async () => {
      ;(FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([]) // open gigs
        .mockResolvedValueOnce([]) // in-progress gigs

      const result = await GigService.expireOldGigs()

      expect(result).toEqual({
        unfundedExpired: 0,
        overdueExpired: 0,
        total: 0
      })
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })
  })

  describe('checkAndExpireGig', () => {
    it('should expire an unfunded gig older than 7 days', async () => {
      const oldGig = {
        ...mockGig,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        status: 'open' as const
      }

      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(oldGig)
      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue([]) // no applications
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.checkAndExpireGig('gig-1')

      expect(result).toBe(true)
      expect(FirestoreService.update).toHaveBeenCalledWith('gigs', 'gig-1', {
        status: 'cancelled',
        updatedAt: expect.any(Date)
      })
    })

    it('should expire a gig past its deadline', async () => {
      const overdueGig = {
        ...mockGig,
        status: 'open' as const,
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }

      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(overdueGig)
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.checkAndExpireGig('gig-1')

      expect(result).toBe(true)
      expect(FirestoreService.update).toHaveBeenCalledWith('gigs', 'gig-1', {
        status: 'cancelled',
        updatedAt: expect.any(Date)
      })
    })

    it('should not expire a funded gig', async () => {
      const oldGig = {
        ...mockGig,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        status: 'open' as const
      }
      const fundedApp = { ...mockApplication, status: 'funded' as const }

      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(oldGig)
      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue([fundedApp])
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const result = await GigService.checkAndExpireGig('gig-1')

      expect(result).toBe(false)
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should return false for non-existent gig', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(null)

      const result = await GigService.checkAndExpireGig('non-existent')

      expect(result).toBe(false)
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should not expire completed or cancelled gigs', async () => {
      const completedGig = { ...mockGig, status: 'completed' as const }

      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(completedGig)

      const result = await GigService.checkAndExpireGig('gig-1')

      expect(result).toBe(false)
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should not expire recent gigs without deadline', async () => {
      const recentGig = {
        ...mockGig,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        deadline: undefined,
        status: 'open' as const
      }

      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(recentGig)

      const result = await GigService.checkAndExpireGig('gig-1')

      expect(result).toBe(false)
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })
  })
})
