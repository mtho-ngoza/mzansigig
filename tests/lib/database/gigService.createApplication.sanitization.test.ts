/**
 * Tests for GigService.createApplication sanitization and safe getters
 */
import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { ConfigService } from '@/lib/database/configService'
import { Gig, GigApplication } from '@/types/gig'

jest.mock('@/lib/database/firestore')
jest.mock('@/lib/database/configService')

const mockGig: Gig = {
  id: 'gig-1',
  title: 'Test Gig',
  employerId: 'emp-1',
  employerName: 'Emp',
  category: 'Construction',
  budget: 1200,
  duration: '1 week',
  location: 'Cape Town',
  status: 'open',
  applicants: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  skillsRequired: [],
}

describe('GigService.createApplication - sanitization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: allow many active applications
    jest.mocked(ConfigService.getValue).mockResolvedValue(99 as any)
    // No duplicate applications
    jest.mocked(FirestoreService.getWhereCompound).mockResolvedValue([] as any)
    // Count queries default to empty
    jest.mocked(FirestoreService.getWhere).mockResolvedValue([] as any)
    // Gig exists
    jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig as any)
    jest.mocked(FirestoreService.create).mockResolvedValue('new-app-id')
    jest.mocked(FirestoreService.update).mockResolvedValue()
  })

  it('omits message and rateHistory[0].note when message is empty/undefined', async () => {
    const data = {
      gigId: mockGig.id,
      applicantId: 'worker-1',
      applicantName: 'Worker One',
      employerId: mockGig.employerId,
      proposedRate: 1000,
      message: undefined as unknown as string,
    }

    await GigService.createApplication(data as any)

    expect(FirestoreService.create).toHaveBeenCalledWith(
      'applications',
      expect.not.objectContaining({ message: expect.anything() })
    )

    // Ensure initial rate history entry has no note field when message omitted
    const payload = (jest.mocked(FirestoreService.create).mock.calls[0][1]) as any
    expect(payload.rateHistory).toBeDefined()
    expect(Array.isArray(payload.rateHistory)).toBe(true)
    expect(payload.rateHistory[0].note).toBeUndefined()
    // Still contains required negotiation fields
    expect(payload.rateStatus).toBe('proposed')
    expect(payload.gigBudget).toBe(1200)
  })

  it('includes sanitized message and sets rateHistory[0].note when message provided', async () => {
    const data = {
      gigId: mockGig.id,
      applicantId: 'worker-1',
      applicantName: 'Worker One',
      employerId: mockGig.employerId,
      proposedRate: 1000,
      message: 'Hello, I\'m keen!',
    }

    await GigService.createApplication(data as any)

    const payload = (jest.mocked(FirestoreService.create).mock.calls[0][1]) as any
    expect(payload.message).toBeDefined()
    expect(typeof payload.message).toBe('string')
    // Note should mirror sanitized message for initial history entry
    expect(payload.rateHistory?.[0]?.note).toBe(payload.message)
    expect(payload.rateStatus).toBe('proposed')
    expect(payload.gigBudget).toBe(1200)
  })
})

describe('GigService getters - safe defaults for undefined results', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('getApplicationsByGig returns [] when Firestore returns undefined', async () => {
    jest.mocked(FirestoreService.getWhere).mockResolvedValue(undefined as any)
    const results = await GigService.getApplicationsByGig('gig-x')
    expect(results).toEqual([])
  })

  it('getApplicationCountByGig returns 0 when Firestore returns undefined', async () => {
    jest.mocked(FirestoreService.getWhere).mockResolvedValue(undefined as any)
    const count = await GigService.getApplicationCountByGig('gig-x')
    expect(count).toBe(0)
  })

  it('getApplicationsByApplicant returns [] when Firestore returns undefined', async () => {
    jest.mocked(FirestoreService.getWhere).mockResolvedValue(undefined as any)
    const results = await GigService.getApplicationsByApplicant('worker-x')
    expect(results).toEqual([])
  })
})
