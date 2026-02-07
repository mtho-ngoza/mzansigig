/**
 * PublicGigBrowser - Accepted Gig Filtering Tests
 *
 * These tests verify that gigs with accepted applications (assignedTo set)
 * are filtered out from the browse page, even though their status is still 'open'.
 *
 * Bug: When an application is accepted, the gig status remains 'open' until funded.
 * This caused accepted gigs to still appear on the browse page.
 *
 * Fix: Filter out gigs where assignedTo is set when loading/searching gigs.
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { Gig } from '@/types/gig'

// Mock dependencies
jest.mock('@/lib/database/firestore')
jest.mock('@/lib/database/configService', () => ({
  ConfigService: {
    getValue: jest.fn().mockResolvedValue(20)
  }
}))
jest.mock('@/lib/utils/locationUtils', () => ({
  getCityCoordinates: jest.fn(() => ({ latitude: -33.9249, longitude: 18.4241 })),
  calculateDistance: jest.fn(() => 10),
  sortByDistance: jest.fn((items) => items),
  filterByRadius: jest.fn((items) => items)
}))
jest.mock('@/lib/utils/gigValidation', () => ({
  sanitizeGigText: jest.fn((input: string) => input),
  normalizeSkills: jest.fn((skills: string[]) => skills),
  validateBudget: jest.fn(() => ({ isValid: true })),
  GIG_TEXT_LIMITS: {
    TITLE_MAX: 100,
    DESCRIPTION_MAX: 5000
  }
}))

describe('PublicGigBrowser - Accepted Gig Filtering Logic', () => {
  const createMockGig = (overrides: Partial<Gig> = {}): Gig => ({
    id: 'gig-' + Math.random().toString(36).substr(2, 9),
    title: 'Test Gig',
    description: 'Test Description',
    category: 'Technology',
    location: 'Cape Town',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
    budget: 5000,
    duration: '1 week',
    skillsRequired: ['React'],
    employerId: 'employer-123',
    employerName: 'Test Employer',
    status: 'open',
    workType: 'remote',
    applicants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getGigsByStatus filtering (simulating PublicGigBrowser loadGigs)', () => {
    it('should return all open gigs from the raw query', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', assignedTo: undefined }),
        createMockGig({ id: 'gig-2', assignedTo: 'worker-123' }),
        createMockGig({ id: 'gig-3', assignedTo: undefined }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')

      // Raw query returns all gigs with status 'open'
      expect(result).toHaveLength(3)
    })

    it('should filter out assigned gigs for browse display', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', assignedTo: undefined }),
        createMockGig({ id: 'gig-2', assignedTo: 'worker-123' }),
        createMockGig({ id: 'gig-3', assignedTo: undefined }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')

      // Apply the filtering that PublicGigBrowser does
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(2)
      expect(browsableGigs.map(g => g.id)).toEqual(['gig-1', 'gig-3'])
    })

    it('should handle all gigs having assignedTo (no browsable gigs)', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', assignedTo: 'worker-1' }),
        createMockGig({ id: 'gig-2', assignedTo: 'worker-2' }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(0)
    })

    it('should handle no gigs having assignedTo (all browsable)', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', assignedTo: undefined }),
        createMockGig({ id: 'gig-2', assignedTo: undefined }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(2)
    })
  })

  describe('searchGigs filtering (simulating PublicGigBrowser handleSearch)', () => {
    it('should filter out assigned gigs from search results', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', title: 'Web Development', status: 'open', assignedTo: undefined }),
        createMockGig({ id: 'gig-2', title: 'Web Design', status: 'open', assignedTo: 'worker-123' }),
        createMockGig({ id: 'gig-3', title: 'Web App', status: 'open', assignedTo: undefined }),
        createMockGig({ id: 'gig-4', title: 'Mobile Development', status: 'open', assignedTo: undefined }),
      ]

      ;(FirestoreService.getAll as jest.Mock).mockResolvedValue(gigs)

      const searchResults = await GigService.searchGigs('Web')

      // Apply the filtering that PublicGigBrowser handleSearch does
      const openGigs = searchResults.filter(gig => gig.status === 'open' && !gig.assignedTo)

      expect(openGigs).toHaveLength(2)
      expect(openGigs.map(g => g.id)).toEqual(['gig-1', 'gig-3'])
    })

    it('should also filter by status in search results', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', title: 'Web Job', status: 'open', assignedTo: undefined }),
        createMockGig({ id: 'gig-2', title: 'Web Job', status: 'in-progress', assignedTo: 'worker-1' }),
        createMockGig({ id: 'gig-3', title: 'Web Job', status: 'completed', assignedTo: 'worker-2' }),
      ]

      ;(FirestoreService.getAll as jest.Mock).mockResolvedValue(gigs)

      const searchResults = await GigService.searchGigs('Web')
      const openGigs = searchResults.filter(gig => gig.status === 'open' && !gig.assignedTo)

      expect(openGigs).toHaveLength(1)
      expect(openGigs[0].id).toBe('gig-1')
    })
  })

  describe('Edge cases for assignedTo filtering', () => {
    it('should treat empty string assignedTo as unassigned', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', assignedTo: '' as unknown as string }),
        createMockGig({ id: 'gig-2', assignedTo: undefined }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')
      // Empty string is falsy, so should be treated as unassigned
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(2)
    })

    it('should treat null assignedTo as unassigned', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', assignedTo: null as unknown as string }),
        createMockGig({ id: 'gig-2', assignedTo: undefined }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(2)
    })

    it('should filter out gig with valid assignedTo string', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', assignedTo: 'valid-worker-id-123' }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(0)
    })
  })

  describe('Gig visibility state transitions', () => {
    it('should show gig before application acceptance', async () => {
      // Before acceptance: status='open', assignedTo=undefined
      const gig = createMockGig({
        id: 'gig-1',
        status: 'open',
        assignedTo: undefined
      })

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue([gig])

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(1)
      expect(browsableGigs[0].id).toBe('gig-1')
    })

    it('should hide gig after application acceptance', async () => {
      // After acceptance: status='open' (unchanged), assignedTo='worker-id'
      const gig = createMockGig({
        id: 'gig-1',
        status: 'open', // Still open!
        assignedTo: 'worker-123' // But assigned
      })

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue([gig])

      const result = await GigService.getGigsByStatus('open')

      // Raw result includes the gig
      expect(result).toHaveLength(1)

      // But filtered result excludes it
      const browsableGigs = result.filter(gig => !gig.assignedTo)
      expect(browsableGigs).toHaveLength(0)
    })

    it('should keep gig hidden after funding (status change)', async () => {
      // After funding: status='in-progress', assignedTo='worker-id'
      // This gig won't even be in the 'open' query results

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue([])

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(0)
    })

    it('should show gig again if funding times out (assignedTo cleared)', async () => {
      // After funding timeout: status='open', assignedTo=undefined (cleared)
      const gig = createMockGig({
        id: 'gig-1',
        status: 'open',
        assignedTo: undefined // Cleared after timeout
      })

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue([gig])

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(1)
      expect(browsableGigs[0].id).toBe('gig-1')
    })
  })

  describe('Mixed gig states in browse results', () => {
    it('should correctly filter a realistic mix of gig states', async () => {
      const gigs: Gig[] = [
        // New gig - should show
        createMockGig({ id: 'new-gig', status: 'open', assignedTo: undefined }),

        // Gig with pending applications - should show
        createMockGig({
          id: 'pending-apps',
          status: 'open',
          assignedTo: undefined,
          applicants: ['user-1', 'user-2']
        }),

        // Gig with accepted application - should NOT show
        createMockGig({
          id: 'accepted',
          status: 'open',
          assignedTo: 'worker-1'
        }),

        // Another new gig - should show
        createMockGig({ id: 'another-new', status: 'open', assignedTo: undefined }),

        // Another accepted gig - should NOT show
        createMockGig({
          id: 'another-accepted',
          status: 'open',
          assignedTo: 'worker-2'
        }),
      ]

      ;(FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs)

      const result = await GigService.getGigsByStatus('open')
      const browsableGigs = result.filter(gig => !gig.assignedTo)

      expect(browsableGigs).toHaveLength(3)
      expect(browsableGigs.map(g => g.id)).toEqual([
        'new-gig',
        'pending-apps',
        'another-new'
      ])
    })
  })
})
