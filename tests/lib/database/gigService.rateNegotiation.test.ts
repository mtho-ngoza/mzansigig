/**
 * GigService Rate Negotiation Tests
 * Tests for rate negotiation methods
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { GigApplication } from '@/types/gig'

// Mock Firestore
jest.mock('@/lib/database/firestore')

describe('GigService - Rate Negotiation', () => {
  const mockApplicationId = 'app-123'
  const mockGigId = 'gig-456'
  const mockWorkerId = 'worker-789'
  const mockEmployerId = 'employer-012'

  const mockApplication: GigApplication = {
    id: mockApplicationId,
    gigId: mockGigId,
    applicantId: mockWorkerId,
    applicantName: 'Test Worker',
    employerId: mockEmployerId,
    proposedRate: 1000,
    status: 'pending',
    rateStatus: 'proposed',
    createdAt: new Date()
  }

  const mockGig = {
    id: mockGigId,
    title: 'Test Gig',
    employerId: mockEmployerId,
    budget: 1200,
    status: 'open',
    applicants: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateApplicationRate', () => {
    function hasUndefinedDeep(obj: any): boolean {
      if (obj === undefined) return true;
      if (obj === null) return false;
      if (Array.isArray(obj)) return obj.some(hasUndefinedDeep);
      if (typeof obj === 'object') {
        return Object.values(obj).some(hasUndefinedDeep);
      }
      return false;
    }
    it('should allow worker to update their proposed rate', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationRate(mockApplicationId, 1100, 'worker', mockWorkerId, 'After assessment')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          rateStatus: 'countered',
          lastRateUpdate: expect.objectContaining({
            amount: 1100,
            by: 'worker',
            note: 'After assessment'
          })
        })
      )
    })

    it('should allow employer to counter with a new rate', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        employerId: mockEmployerId
      })
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationRate(mockApplicationId, 900, 'employer', mockEmployerId, 'Budget constraints')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          rateStatus: 'countered',
          lastRateUpdate: expect.objectContaining({
            amount: 900,
            by: 'employer',
            note: 'Budget constraints'
          })
        })
      )
    })

    it('should throw error if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 1100, 'worker', mockWorkerId)
      ).rejects.toThrow('Application not found')
    })

    it('should throw error if worker tries to update someone elses application', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 1100, 'worker', 'other-worker')
      ).rejects.toThrow('Unauthorized: Only the applicant can update rate as worker')
    })

    it('should throw error if employer tries to update application for different gig', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 900, 'employer', 'other-employer')
      ).rejects.toThrow('Unauthorized: Only the employer can update rate as employer')
    })

    it('should throw error if rate is zero or negative', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 0, 'worker', mockWorkerId)
      ).rejects.toThrow('Rate must be greater than 0')
    })

    it('should throw error if rate exceeds maximum', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 200000, 'worker', mockWorkerId)
      ).rejects.toThrow('Rate cannot exceed R100,000')
    })

    it('should throw error if application is already funded', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        status: 'funded'
      })

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 1100, 'worker', mockWorkerId)
      ).rejects.toThrow('Cannot update rate on application with status: funded')
    })

    it('should throw error if application is completed', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        status: 'completed'
      })

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 1100, 'worker', mockWorkerId)
      ).rejects.toThrow('Cannot update rate on application with status: completed')
    })

    it('should throw error if application is rejected', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        status: 'rejected'
      })

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 1100, 'worker', mockWorkerId)
      ).rejects.toThrow('Cannot update rate on application with status: rejected')
    })

    it('should throw error if application is withdrawn', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        status: 'withdrawn'
      })

      await expect(
        GigService.updateApplicationRate(mockApplicationId, 1100, 'worker', mockWorkerId)
      ).rejects.toThrow('Cannot update rate on application with status: withdrawn')
    })

    it('omits lastRateUpdate.note and avoids undefineds when note is missing', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationRate(mockApplicationId, 1150, 'worker', mockWorkerId)

      expect(FirestoreService.update).toHaveBeenCalled()
      const call = (FirestoreService.update as jest.Mock).mock.calls[0]
      const payload = call[2]
      expect(payload.lastRateUpdate).not.toHaveProperty('note')
      expect(hasUndefinedDeep(payload)).toBe(false)
    })

    it('omits lastRateUpdate.note and avoids undefineds when note is whitespace', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationRate(mockApplicationId, 1200, 'worker', mockWorkerId, '   ')

      expect(FirestoreService.update).toHaveBeenCalled()
      const call = (FirestoreService.update as jest.Mock).mock.calls[0]
      const payload = call[2]
      expect(payload.lastRateUpdate).not.toHaveProperty('note')
      expect(hasUndefinedDeep(payload)).toBe(false)
    })
  })

  describe('confirmApplicationRate', () => {
    it('should allow worker to confirm employer counter-offer', async () => {
      const applicationWithCounter: GigApplication = {
        ...mockApplication,
        rateStatus: 'countered',
        lastRateUpdate: {
          amount: 950,
          by: 'employer',
          at: new Date()
        }
      }
      jest.mocked(FirestoreService.getById).mockResolvedValue(applicationWithCounter)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.confirmApplicationRate(mockApplicationId, 'worker', mockWorkerId)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          rateStatus: 'agreed',
          agreedRate: 950
        })
      )
    })

    it('should allow employer to confirm worker proposed rate', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        employerId: mockEmployerId
      })
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.confirmApplicationRate(mockApplicationId, 'employer', mockEmployerId)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          rateStatus: 'agreed',
          agreedRate: 1000
        })
      )
    })

    it('should throw error if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.confirmApplicationRate(mockApplicationId, 'worker', mockWorkerId)
      ).rejects.toThrow('Application not found')
    })

    it('should throw error if rate is already agreed', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        rateStatus: 'agreed',
        agreedRate: 1000
      })

      await expect(
        GigService.confirmApplicationRate(mockApplicationId, 'worker', mockWorkerId)
      ).rejects.toThrow('Rate is already agreed')
    })

    it('should throw error if confirming own proposal', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        rateStatus: 'countered',
        lastRateUpdate: {
          amount: 1100,
          by: 'worker',
          at: new Date()
        }
      })

      await expect(
        GigService.confirmApplicationRate(mockApplicationId, 'worker', mockWorkerId)
      ).rejects.toThrow('You cannot confirm your own rate proposal')
    })

    it('should throw error if worker is not the applicant', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.confirmApplicationRate(mockApplicationId, 'worker', 'other-worker')
      ).rejects.toThrow('Unauthorized: Only the applicant can confirm as worker')
    })

    it('should throw error if employer is not the gig owner', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.confirmApplicationRate(mockApplicationId, 'employer', 'other-employer')
      ).rejects.toThrow('Unauthorized: Only the employer can confirm as employer')
    })
  })

  describe('acceptApplicationWithRate', () => {
    it('should skip confirm and just accept when rate is already agreed', async () => {
      // Rate is already agreed, so it should skip confirm and just accept
      const agreedApplication = { ...mockApplication, rateStatus: 'agreed' as const, agreedRate: 1000, employerId: mockEmployerId }
      jest.mocked(FirestoreService.getById).mockResolvedValue(agreedApplication)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([agreedApplication])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.acceptApplicationWithRate(mockApplicationId, mockEmployerId)

      // Should have called update for accepting application
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          status: 'accepted'
        })
      )
    })

    it('should throw error if employer is not authorized', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.acceptApplicationWithRate(mockApplicationId, 'other-employer')
      ).rejects.toThrow()
    })
  })

  describe('getRateHistory', () => {
    it('should return rate history for an application', async () => {
      const rateHistory = [
        { amount: 1000, by: 'worker' as const, at: new Date(), note: 'Initial' },
        { amount: 900, by: 'employer' as const, at: new Date(), note: 'Counter' },
        { amount: 950, by: 'worker' as const, at: new Date(), note: 'Final' }
      ]
      jest.mocked(FirestoreService.getById).mockResolvedValue({
        ...mockApplication,
        rateHistory
      })

      const history = await GigService.getRateHistory(mockApplicationId)

      expect(history).toEqual(rateHistory)
    })

    it('should return empty array if no rate history', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      const history = await GigService.getRateHistory(mockApplicationId)

      expect(history).toEqual([])
    })

    it('should throw error if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.getRateHistory(mockApplicationId)
      ).rejects.toThrow('Application not found')
    })
  })

  describe('createApplication with rate negotiation', () => {
    it('should set initial rateStatus to proposed when creating application', async () => {
      // Mock getWhereCompound for checking existing applications (returns array)
      jest.mocked(FirestoreService.getWhereCompound).mockResolvedValue([])
      // Mock for getting gig
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)
      jest.mocked(FirestoreService.create).mockResolvedValue(mockApplicationId)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.createApplication({
        gigId: mockGigId,
        applicantId: mockWorkerId,
        applicantName: 'Test Worker',
        employerId: mockEmployerId,
        proposedRate: 1000,
        rateStatus: 'proposed'
      })

      expect(FirestoreService.create).toHaveBeenCalledWith(
        'applications',
        expect.objectContaining({
          rateStatus: 'proposed',
          gigBudget: 1200
        })
      )
    })
  })
})
