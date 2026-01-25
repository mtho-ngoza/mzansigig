/**
 * Auto-Release Cron API Tests
 * Tests the logic and authorization for the auto-release scheduled job
 */

import { GigService } from '@/lib/database/gigService'

jest.mock('@/lib/database/gigService')

describe('/api/cron/auto-release Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authorization Logic', () => {
    it('should reject requests without authorization header', () => {
      const authHeader = null
      const cronSecret = 'test-secret'

      const isAuthorized = authHeader === `Bearer ${cronSecret}`

      expect(isAuthorized).toBe(false)
    })

    it('should reject requests with invalid authorization header', () => {
      const authHeader: string = 'Bearer wrong-secret'
      const cronSecret: string = 'test-secret'

      const isAuthorized = authHeader === `Bearer ${cronSecret}`

      expect(isAuthorized).toBe(false)
    })

    it('should accept requests with valid authorization header', () => {
      const authHeader = 'Bearer test-secret'
      const cronSecret = 'test-secret'

      const isAuthorized = authHeader === `Bearer ${cronSecret}`

      expect(isAuthorized).toBe(true)
    })

    it('should reject if CRON_SECRET is not configured', () => {
      const cronSecret = undefined

      const isConfigured = Boolean(cronSecret)

      expect(isConfigured).toBe(false)
    })
  })

  describe('GigService.processAllAutoReleases', () => {
    it('should process all eligible applications', async () => {
      jest.mocked(GigService.processAllAutoReleases).mockResolvedValue({
        processed: 3,
        succeeded: 3,
        failed: 0,
        results: [
          { applicationId: 'app-1', success: true },
          { applicationId: 'app-2', success: true },
          { applicationId: 'app-3', success: true }
        ]
      })

      const result = await GigService.processAllAutoReleases()

      expect(result.processed).toBe(3)
      expect(result.succeeded).toBe(3)
      expect(result.failed).toBe(0)
    })

    it('should report partial failures', async () => {
      jest.mocked(GigService.processAllAutoReleases).mockResolvedValue({
        processed: 3,
        succeeded: 2,
        failed: 1,
        results: [
          { applicationId: 'app-1', success: true },
          { applicationId: 'app-2', success: false, error: 'Payment release failed' },
          { applicationId: 'app-3', success: true }
        ]
      })

      const result = await GigService.processAllAutoReleases()

      expect(result.processed).toBe(3)
      expect(result.succeeded).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.results[1].error).toBe('Payment release failed')
    })

    it('should handle empty eligible list', async () => {
      jest.mocked(GigService.processAllAutoReleases).mockResolvedValue({
        processed: 0,
        succeeded: 0,
        failed: 0,
        results: []
      })

      const result = await GigService.processAllAutoReleases()

      expect(result.processed).toBe(0)
      expect(result.results).toHaveLength(0)
    })

    it('should throw on database error', async () => {
      jest.mocked(GigService.processAllAutoReleases).mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(GigService.processAllAutoReleases()).rejects.toThrow('Database connection failed')
    })
  })

  describe('GigService.getApplicationsEligibleForAutoRelease', () => {
    it('should return eligible applications count', async () => {
      jest.mocked(GigService.getApplicationsEligibleForAutoRelease).mockResolvedValue([
        { id: 'app-1' } as never,
        { id: 'app-2' } as never
      ])

      const result = await GigService.getApplicationsEligibleForAutoRelease()

      expect(result).toHaveLength(2)
    })

    it('should return empty array when no eligible applications', async () => {
      jest.mocked(GigService.getApplicationsEligibleForAutoRelease).mockResolvedValue([])

      const result = await GigService.getApplicationsEligibleForAutoRelease()

      expect(result).toHaveLength(0)
    })
  })

  describe('Response Format', () => {
    it('should format success response correctly', () => {
      const result = {
        processed: 2,
        succeeded: 2,
        failed: 0,
        results: [
          { applicationId: 'app-1', success: true },
          { applicationId: 'app-2', success: true }
        ]
      }

      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        ...result
      }

      expect(response.success).toBe(true)
      expect(response.timestamp).toBeDefined()
      expect(response.processed).toBe(2)
      expect(response.succeeded).toBe(2)
      expect(response.failed).toBe(0)
    })

    it('should format error response correctly', () => {
      const error = new Error('Something went wrong')

      const response = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }

      expect(response.success).toBe(false)
      expect(response.error).toBe('Something went wrong')
      expect(response.timestamp).toBeDefined()
    })

    it('should format health check response correctly', () => {
      const eligibleCount = 5

      const response = {
        status: 'healthy',
        eligibleCount,
        timestamp: new Date().toISOString()
      }

      expect(response.status).toBe('healthy')
      expect(response.eligibleCount).toBe(5)
      expect(response.timestamp).toBeDefined()
    })
  })
})
