import { ConfigService } from '@/lib/database/configService'
import { FirestoreService } from '@/lib/database/firestore'
import { DEFAULT_PLATFORM_CONFIG } from '@/types/platformConfig'

// Mock FirestoreService
jest.mock('@/lib/database/firestore')

describe('ConfigService', () => {
  const mockAdminUserId = 'admin-123'
  const mockConfig = {
    id: 'main',
    ...DEFAULT_PLATFORM_CONFIG,
    updatedAt: new Date(),
    updatedBy: 'system',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ConfigService.clearCache()
  })

  describe('getConfig', () => {
    it('should return config from Firestore when not cached', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)

      const result = await ConfigService.getConfig()

      expect(FirestoreService.getById).toHaveBeenCalledWith(
        'platformConfig',
        'main'
      )
      expect(result).toEqual(mockConfig)
    })

    it('should return cached config when available and fresh', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)

      // First call - fetches from Firestore
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(1)

      // Second call - returns from cache
      const result = await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(1) // Still 1
      expect(result).toEqual(mockConfig)
    })

    it('should create default config if none exists', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(null)
      ;(FirestoreService.setDocument as jest.Mock).mockResolvedValue(undefined)

      const result = await ConfigService.getConfig()

      expect(FirestoreService.setDocument).toHaveBeenCalledWith(
        'platformConfig',
        'main',
        expect.objectContaining({
          ...DEFAULT_PLATFORM_CONFIG,
          updatedBy: 'system',
        })
      )
      expect(result).toMatchObject({
        id: 'main',
        ...DEFAULT_PLATFORM_CONFIG,
        updatedBy: 'system',
      })
    })

    it('should return default config on error', async () => {
      ;(FirestoreService.getById as jest.Mock).mockRejectedValue(
        new Error('Firestore error')
      )

      const result = await ConfigService.getConfig()

      expect(result).toMatchObject({
        id: 'main',
        ...DEFAULT_PLATFORM_CONFIG,
        updatedBy: 'system',
      })
    })
  })

  describe('getValue', () => {
    it('should return specific config value', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)

      const result = await ConfigService.getValue('distanceWarningThresholdKm')

      expect(result).toBe(DEFAULT_PLATFORM_CONFIG.distanceWarningThresholdKm)
    })

    it('should return correct values for all config keys', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)

      const distanceThreshold = await ConfigService.getValue(
        'distanceWarningThresholdKm'
      )
      const maxApplications = await ConfigService.getValue(
        'maxActiveApplicationsPerWorker'
      )
      const reviewDeadline = await ConfigService.getValue('reviewDeadlineDays')

      expect(distanceThreshold).toBe(50)
      expect(maxApplications).toBe(20)
      expect(reviewDeadline).toBe(30)
    })
  })

  describe('updateConfig', () => {
    beforeEach(() => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)
    })

    it('should update config with valid values', async () => {
      const updates = {
        distanceWarningThresholdKm: 75,
        maxActiveApplicationsPerWorker: 30,
      }

      await ConfigService.updateConfig(updates, mockAdminUserId)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'platformConfig',
        'main',
        expect.objectContaining({
          ...updates,
          updatedBy: mockAdminUserId,
        })
      )
    })

    it('should invalidate cache after update', async () => {
      // First call to populate cache
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(1)

      // Update config
      await ConfigService.updateConfig(
        { distanceWarningThresholdKm: 75 },
        mockAdminUserId
      )

      // Next call should fetch from Firestore again
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(2)
    })

    it('should reject values below minimum constraint', async () => {
      const invalidUpdates = {
        distanceWarningThresholdKm: 0, // Min is 1
      }

      await expect(
        ConfigService.updateConfig(invalidUpdates, mockAdminUserId)
      ).rejects.toThrow('distanceWarningThresholdKm must be between 1 and 500')
    })

    it('should reject values above maximum constraint', async () => {
      const invalidUpdates = {
        maxActiveApplicationsPerWorker: 150, // Max is 100
      }

      await expect(
        ConfigService.updateConfig(invalidUpdates, mockAdminUserId)
      ).rejects.toThrow(
        'maxActiveApplicationsPerWorker must be between 1 and 100'
      )
    })

    it('should validate all constraint fields', async () => {
      const invalidUpdates = {
        reviewDeadlineDays: 400, // Max is 365
      }

      await expect(
        ConfigService.updateConfig(invalidUpdates, mockAdminUserId)
      ).rejects.toThrow('reviewDeadlineDays must be between 1 and 365')
    })

    it('should allow updates within valid range', async () => {
      const validUpdates = {
        distanceWarningThresholdKm: 100,
        maxActiveApplicationsPerWorker: 50,
        reviewDeadlineDays: 60,
        gigExpiryTimeoutDays: 14,
        fundingTimeoutHours: 72,
        escrowAutoReleaseDays: 10,
        safetyCheckIntervalHours: 3,
      }

      await expect(
        ConfigService.updateConfig(validUpdates, mockAdminUserId)
      ).resolves.not.toThrow()
    })
  })

  describe('resetToDefaults', () => {
    it('should reset all config values to defaults', async () => {
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      await ConfigService.resetToDefaults(mockAdminUserId)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'platformConfig',
        'main',
        expect.objectContaining({
          ...DEFAULT_PLATFORM_CONFIG,
          updatedBy: mockAdminUserId,
        })
      )
    })

    it('should invalidate cache after reset', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      // Populate cache
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(1)

      // Reset
      await ConfigService.resetToDefaults(mockAdminUserId)

      // Should fetch from Firestore again
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(2)
    })
  })

  describe('refreshCache', () => {
    it('should force refresh from Firestore', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)

      // First call
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(1)

      // Refresh cache
      await ConfigService.refreshCache()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(2)

      // Next getConfig should use fresh cache
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(2)
    })
  })

  describe('cache expiry', () => {
    it('should refetch after cache TTL expires', async () => {
      ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConfig)

      // First call
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(1)

      // Mock time passing (6 minutes, cache TTL is 5 minutes)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000)

      // Should refetch
      await ConfigService.getConfig()
      expect(FirestoreService.getById).toHaveBeenCalledTimes(2)

      jest.restoreAllMocks()
    })
  })

  describe('edge cases', () => {
    it('should handle partial updates', async () => {
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const partialUpdate = {
        distanceWarningThresholdKm: 60,
      }

      await expect(
        ConfigService.updateConfig(partialUpdate, mockAdminUserId)
      ).resolves.not.toThrow()

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'platformConfig',
        'main',
        expect.objectContaining({
          distanceWarningThresholdKm: 60,
          updatedBy: mockAdminUserId,
        })
      )
    })

    it('should handle decimal values for safetyCheckIntervalHours', async () => {
      ;(FirestoreService.update as jest.Mock).mockResolvedValue(undefined)

      const updates = {
        safetyCheckIntervalHours: 1.5,
      }

      await expect(
        ConfigService.updateConfig(updates, mockAdminUserId)
      ).resolves.not.toThrow()
    })

    it('should reject invalid decimal values for safetyCheckIntervalHours', async () => {
      const invalidUpdates = {
        safetyCheckIntervalHours: 0.3, // Min is 0.5
      }

      await expect(
        ConfigService.updateConfig(invalidUpdates, mockAdminUserId)
      ).rejects.toThrow('safetyCheckIntervalHours must be between 0.5 and 24')
    })
  })
})
