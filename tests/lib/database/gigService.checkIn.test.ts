import { GigService } from '@/lib/database/gigService'
import { Gig, GigApplication } from '@/types/gig'
import { Coordinates } from '@/types/location'

// Mock FirestoreService
jest.mock('@/lib/database/firestore', () => ({
  FirestoreService: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    getWhere: jest.fn()
  }
}))

const { FirestoreService } = require('@/lib/database/firestore')

describe('GigService - Check-In Functions', () => {
  const mockGig: Gig = {
    id: 'gig-1',
    title: 'Physical Gig',
    description: 'Physical work at location',
    category: 'Manual Labor',
    location: 'Johannesburg',
    budget: 500,
    duration: '1 day',
    skillsRequired: [],
    employerId: 'employer-1',
    employerName: 'Employer Name',
    status: 'in-progress',
    applicants: ['worker-1'],
    assignedTo: 'worker-1',
    workType: 'physical',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockApplication: GigApplication = {
    id: 'app-1',
    gigId: 'gig-1',
    applicantId: 'worker-1',
    applicantName: 'Worker Name',
    proposedRate: 500,
    status: 'funded',
    createdAt: new Date()
  }

  const mockLocation: Coordinates = {
    latitude: -26.2041,
    longitude: 28.0473
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock Date.now() for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-01-01T12:00:00Z').getTime())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('checkIn', () => {
    it('should successfully check in worker with location', async () => {
      FirestoreService.getById.mockResolvedValue(mockApplication)
      FirestoreService.update.mockResolvedValue(undefined)

      await GigService.checkIn('app-1', 'worker-1', mockLocation)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        'app-1',
        expect.objectContaining({
          checkInAt: expect.any(Date),
          checkInLocation: mockLocation,
          lastSafetyCheckAt: expect.any(Date),
          missedSafetyChecks: 0
        })
      )
    })

    it('should successfully check in worker without location', async () => {
      FirestoreService.getById.mockResolvedValue(mockApplication)
      FirestoreService.update.mockResolvedValue(undefined)

      await GigService.checkIn('app-1', 'worker-1')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        'app-1',
        expect.objectContaining({
          checkInAt: expect.any(Date),
          checkInLocation: undefined,
          lastSafetyCheckAt: expect.any(Date),
          missedSafetyChecks: 0
        })
      )
    })

    it('should throw error if application not found', async () => {
      FirestoreService.getById.mockResolvedValue(null)

      await expect(
        GigService.checkIn('app-1', 'worker-1')
      ).rejects.toThrow('Application not found')
    })

    it('should throw error if user is not the applicant', async () => {
      FirestoreService.getById.mockResolvedValue(mockApplication)

      await expect(
        GigService.checkIn('app-1', 'different-user')
      ).rejects.toThrow('Unauthorized: Only the assigned worker can check in')
    })

    it('should throw error if application is not funded', async () => {
      const unfundedApp = { ...mockApplication, status: 'accepted' as const }
      FirestoreService.getById.mockResolvedValue(unfundedApp)

      await expect(
        GigService.checkIn('app-1', 'worker-1')
      ).rejects.toThrow('Can only check in for funded gigs')
    })

    it('should throw error if already checked in', async () => {
      const checkedInApp = {
        ...mockApplication,
        checkInAt: new Date()
      }
      FirestoreService.getById.mockResolvedValue(checkedInApp)

      await expect(
        GigService.checkIn('app-1', 'worker-1')
      ).rejects.toThrow('Already checked in')
    })
  })

  describe('checkOut', () => {
    const checkedInApp: GigApplication = {
      ...mockApplication,
      checkInAt: new Date('2025-01-01T10:00:00Z')
    }

    it('should successfully check out worker with location', async () => {
      FirestoreService.getById.mockResolvedValue(checkedInApp)
      FirestoreService.update.mockResolvedValue(undefined)

      await GigService.checkOut('app-1', 'worker-1', mockLocation)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        'app-1',
        expect.objectContaining({
          checkOutAt: expect.any(Date),
          checkOutLocation: mockLocation
        })
      )
    })

    it('should successfully check out worker without location', async () => {
      FirestoreService.getById.mockResolvedValue(checkedInApp)
      FirestoreService.update.mockResolvedValue(undefined)

      await GigService.checkOut('app-1', 'worker-1')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        'app-1',
        expect.objectContaining({
          checkOutAt: expect.any(Date),
          checkOutLocation: undefined
        })
      )
    })

    it('should throw error if application not found', async () => {
      FirestoreService.getById.mockResolvedValue(null)

      await expect(
        GigService.checkOut('app-1', 'worker-1')
      ).rejects.toThrow('Application not found')
    })

    it('should throw error if user is not the applicant', async () => {
      FirestoreService.getById.mockResolvedValue(checkedInApp)

      await expect(
        GigService.checkOut('app-1', 'different-user')
      ).rejects.toThrow('Unauthorized: Only the assigned worker can check out')
    })

    it('should throw error if not checked in', async () => {
      FirestoreService.getById.mockResolvedValue(mockApplication)

      await expect(
        GigService.checkOut('app-1', 'worker-1')
      ).rejects.toThrow('Must check in before checking out')
    })

    it('should throw error if already checked out', async () => {
      const checkedOutApp = {
        ...checkedInApp,
        checkOutAt: new Date('2025-01-01T11:00:00Z')
      }
      FirestoreService.getById.mockResolvedValue(checkedOutApp)

      await expect(
        GigService.checkOut('app-1', 'worker-1')
      ).rejects.toThrow('Already checked out')
    })
  })

  describe('performSafetyCheck', () => {
    const checkedInApp: GigApplication = {
      ...mockApplication,
      checkInAt: new Date('2025-01-01T10:00:00Z'),
      lastSafetyCheckAt: new Date('2025-01-01T10:00:00Z')
    }

    it('should successfully perform safety check', async () => {
      FirestoreService.getById.mockResolvedValue(checkedInApp)
      FirestoreService.update.mockResolvedValue(undefined)

      await GigService.performSafetyCheck('app-1', 'worker-1')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        'app-1',
        expect.objectContaining({
          lastSafetyCheckAt: expect.any(Date),
          missedSafetyChecks: 0
        })
      )
    })

    it('should throw error if application not found', async () => {
      FirestoreService.getById.mockResolvedValue(null)

      await expect(
        GigService.performSafetyCheck('app-1', 'worker-1')
      ).rejects.toThrow('Application not found')
    })

    it('should throw error if user is not the applicant', async () => {
      FirestoreService.getById.mockResolvedValue(checkedInApp)

      await expect(
        GigService.performSafetyCheck('app-1', 'different-user')
      ).rejects.toThrow('Unauthorized')
    })

    it('should throw error if not checked in', async () => {
      FirestoreService.getById.mockResolvedValue(mockApplication)

      await expect(
        GigService.performSafetyCheck('app-1', 'worker-1')
      ).rejects.toThrow('Safety check only available during active work')
    })

    it('should throw error if already checked out', async () => {
      const checkedOutApp = {
        ...checkedInApp,
        checkOutAt: new Date('2025-01-01T11:00:00Z')
      }
      FirestoreService.getById.mockResolvedValue(checkedOutApp)

      await expect(
        GigService.performSafetyCheck('app-1', 'worker-1')
      ).rejects.toThrow('Safety check only available during active work')
    })
  })

  describe('getCheckInStatus', () => {
    it('should return correct status for non-checked-in application', async () => {
      FirestoreService.getById.mockResolvedValue(mockApplication)

      const status = await GigService.getCheckInStatus('app-1')

      expect(status).toEqual({
        isCheckedIn: false,
        checkInAt: undefined,
        checkOutAt: undefined,
        lastSafetyCheckAt: undefined,
        missedSafetyChecks: 0,
        needsSafetyCheck: false
      })
    })

    it('should return correct status for checked-in application', async () => {
      const checkInTime = new Date('2025-01-01T10:00:00Z')
      const checkedInApp: GigApplication = {
        ...mockApplication,
        checkInAt: checkInTime,
        lastSafetyCheckAt: checkInTime,
        missedSafetyChecks: 0
      }
      FirestoreService.getById.mockResolvedValue(checkedInApp)

      const status = await GigService.getCheckInStatus('app-1')

      expect(status).toEqual({
        isCheckedIn: true,
        checkInAt: checkInTime,
        checkOutAt: undefined,
        lastSafetyCheckAt: checkInTime,
        missedSafetyChecks: 0,
        needsSafetyCheck: true // 2+ hours since last check (mocked time is 12:00, last check was 10:00)
      })
    })

    it('should return correct status for checked-out application', async () => {
      const checkInTime = new Date('2025-01-01T10:00:00Z')
      const checkOutTime = new Date('2025-01-01T11:00:00Z')
      const checkedOutApp: GigApplication = {
        ...mockApplication,
        checkInAt: checkInTime,
        checkOutAt: checkOutTime,
        lastSafetyCheckAt: checkInTime
      }
      FirestoreService.getById.mockResolvedValue(checkedOutApp)

      const status = await GigService.getCheckInStatus('app-1')

      expect(status).toEqual({
        isCheckedIn: false,
        checkInAt: checkInTime,
        checkOutAt: checkOutTime,
        lastSafetyCheckAt: checkInTime,
        missedSafetyChecks: 0,
        needsSafetyCheck: false
      })
    })

    it('should detect need for safety check when 2+ hours passed', async () => {
      const twoHoursAgo = new Date('2025-01-01T10:00:00Z')
      const checkedInApp: GigApplication = {
        ...mockApplication,
        checkInAt: twoHoursAgo,
        lastSafetyCheckAt: twoHoursAgo
      }
      FirestoreService.getById.mockResolvedValue(checkedInApp)

      const status = await GigService.getCheckInStatus('app-1')

      expect(status.needsSafetyCheck).toBe(true)
    })

    it('should not need safety check when less than 2 hours passed', async () => {
      const oneHourAgo = new Date('2025-01-01T11:00:00Z')
      const checkedInApp: GigApplication = {
        ...mockApplication,
        checkInAt: oneHourAgo,
        lastSafetyCheckAt: oneHourAgo
      }
      FirestoreService.getById.mockResolvedValue(checkedInApp)

      const status = await GigService.getCheckInStatus('app-1')

      expect(status.needsSafetyCheck).toBe(false)
    })

    it('should throw error if application not found', async () => {
      FirestoreService.getById.mockResolvedValue(null)

      await expect(
        GigService.getCheckInStatus('app-1')
      ).rejects.toThrow('Application not found')
    })
  })
})
