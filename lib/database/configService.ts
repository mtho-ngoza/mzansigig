import { FirestoreService } from './firestore'
import {
  PlatformConfig,
  DEFAULT_PLATFORM_CONFIG,
  CONFIG_CONSTRAINTS,
} from '@/types/platformConfig'

/**
 * ConfigService - Manages platform configuration stored in Firestore
 * Provides in-memory caching for performance with auto-refresh
 */
export class ConfigService {
  private static readonly COLLECTION = 'platformConfig'
  private static readonly CONFIG_DOC_ID = 'main'
  private static cache: PlatformConfig | null = null
  private static cacheTimestamp: number = 0
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Get the current platform configuration
   * Returns cached value if available and fresh, otherwise fetches from Firestore
   */
  static async getConfig(): Promise<PlatformConfig> {
    // Return cache if valid
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cache
    }

    // Fetch from Firestore
    try {
      const config = await FirestoreService.getById<PlatformConfig>(
        this.COLLECTION,
        this.CONFIG_DOC_ID
      )

      if (config) {
        this.cache = config
        this.cacheTimestamp = Date.now()
        return config
      }

      // No config exists, create default
      return await this.createDefaultConfig()
    } catch {
      // Silently fall back to defaults if there's a permission or access error
      // This is expected on first load when the collection doesn't exist yet
      return {
        id: this.CONFIG_DOC_ID,
        ...DEFAULT_PLATFORM_CONFIG,
        updatedAt: new Date(),
        updatedBy: 'system',
      }
    }
  }

  /**
   * Get a specific configuration value
   */
  static async getValue<K extends keyof PlatformConfig>(
    key: K
  ): Promise<PlatformConfig[K]> {
    const config = await this.getConfig()
    return config[key]
  }

  /**
   * Update platform configuration (admin only)
   * Validates values against constraints before saving
   */
  static async updateConfig(
    updates: Partial<Omit<PlatformConfig, 'id' | 'updatedAt' | 'updatedBy'>>,
    adminUserId: string
  ): Promise<void> {
    // Validate all updates against constraints
    for (const [key, value] of Object.entries(updates)) {
      if (key in CONFIG_CONSTRAINTS) {
        const constraints =
          CONFIG_CONSTRAINTS[key as keyof typeof CONFIG_CONSTRAINTS]
        if (typeof value === 'number') {
          if (value < constraints.min || value > constraints.max) {
            throw new Error(
              `${key} must be between ${constraints.min} and ${constraints.max}`
            )
          }
        }
      }
    }

    const updateData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: adminUserId,
    }

    await FirestoreService.update(this.COLLECTION, this.CONFIG_DOC_ID, updateData)

    // Invalidate cache
    this.cache = null
    this.cacheTimestamp = 0
  }

  /**
   * Create default configuration in Firestore
   */
  private static async createDefaultConfig(): Promise<PlatformConfig> {
    const defaultConfig: Omit<PlatformConfig, 'id'> = {
      ...DEFAULT_PLATFORM_CONFIG,
      updatedAt: new Date(),
      updatedBy: 'system',
    }

    try {
      await FirestoreService.setDocument(
        this.COLLECTION,
        this.CONFIG_DOC_ID,
        defaultConfig
      )

      const config: PlatformConfig = {
        id: this.CONFIG_DOC_ID,
        ...defaultConfig,
      }

      this.cache = config
      this.cacheTimestamp = Date.now()

      return config
    } catch (error) {
      // If we can't create the default config (e.g., permissions issue),
      // the caller will get the fallback defaults from getConfig()
      throw error
    }
  }

  /**
   * Force refresh the cache from Firestore
   */
  static async refreshCache(): Promise<void> {
    this.cache = null
    this.cacheTimestamp = 0
    await this.getConfig()
  }

  /**
   * Reset configuration to defaults (admin only)
   */
  static async resetToDefaults(adminUserId: string): Promise<void> {
    await this.updateConfig(DEFAULT_PLATFORM_CONFIG, adminUserId)
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.cache = null
    this.cacheTimestamp = 0
  }
}
