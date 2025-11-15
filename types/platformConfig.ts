/**
 * Platform Configuration Types
 * Admin-configurable constants stored in Firestore for easy runtime editing
 */

export interface PlatformConfig {
  id: string

  // Distance & Location Settings
  distanceWarningThresholdKm: number // Default: 50 km

  // Application Limits
  maxActiveApplicationsPerWorker: number // Default: 20

  // Review Settings
  reviewDeadlineDays: number // Default: 30 days

  // Gig Lifecycle Timeouts
  gigExpiryTimeoutDays: number // Default: 7 days for unfunded gigs
  fundingTimeoutHours: number // Default: 48 hours for accepted applications

  // Escrow & Payment Settings
  escrowAutoReleaseDays: number // Default: 7 days

  // Safety Settings
  safetyCheckIntervalHours: number // Default: 2 hours

  // Metadata
  updatedAt: Date
  updatedBy: string // Admin user ID who last updated
}

/**
 * Default platform configuration values
 * Used when no custom config exists in Firestore
 */
export const DEFAULT_PLATFORM_CONFIG: Omit<PlatformConfig, 'id' | 'updatedAt' | 'updatedBy'> = {
  distanceWarningThresholdKm: 50,
  maxActiveApplicationsPerWorker: 20,
  reviewDeadlineDays: 30,
  gigExpiryTimeoutDays: 7,
  fundingTimeoutHours: 48,
  escrowAutoReleaseDays: 7,
  safetyCheckIntervalHours: 2,
}

/**
 * Configuration value constraints for validation
 */
export const CONFIG_CONSTRAINTS = {
  distanceWarningThresholdKm: { min: 1, max: 500 },
  maxActiveApplicationsPerWorker: { min: 1, max: 100 },
  reviewDeadlineDays: { min: 1, max: 365 },
  gigExpiryTimeoutDays: { min: 1, max: 90 },
  fundingTimeoutHours: { min: 1, max: 168 }, // Max 7 days
  escrowAutoReleaseDays: { min: 1, max: 90 },
  safetyCheckIntervalHours: { min: 0.5, max: 24 },
} as const

/**
 * Configuration field metadata for UI display
 */
export interface ConfigFieldMetadata {
  key: keyof Omit<PlatformConfig, 'id' | 'updatedAt' | 'updatedBy'>
  label: string
  description: string
  unit: string
  category: 'safety' | 'lifecycle' | 'applications' | 'payments' | 'reviews'
}

export const CONFIG_FIELDS_METADATA: ConfigFieldMetadata[] = [
  {
    key: 'distanceWarningThresholdKm',
    label: 'Distance Warning Threshold',
    description: 'Show warning to workers when applying to physical gigs beyond this distance',
    unit: 'km',
    category: 'safety',
  },
  {
    key: 'safetyCheckIntervalHours',
    label: 'Safety Check Interval',
    description: 'How often workers need to check-in during physical gigs',
    unit: 'hours',
    category: 'safety',
  },
  {
    key: 'maxActiveApplicationsPerWorker',
    label: 'Max Active Applications',
    description: 'Maximum number of pending/accepted applications a worker can have to prevent spam',
    unit: 'applications',
    category: 'applications',
  },
  {
    key: 'gigExpiryTimeoutDays',
    label: 'Unfunded Gig Expiry',
    description: 'Auto-cancel unfunded gigs after this many days',
    unit: 'days',
    category: 'lifecycle',
  },
  {
    key: 'fundingTimeoutHours',
    label: 'Funding Timeout',
    description: 'Auto-reject accepted applications not funded within this timeframe',
    unit: 'hours',
    category: 'lifecycle',
  },
  {
    key: 'escrowAutoReleaseDays',
    label: 'Escrow Auto-Release Period',
    description: 'Automatically release escrowed payment to worker if employer doesn\'t respond',
    unit: 'days',
    category: 'payments',
  },
  {
    key: 'reviewDeadlineDays',
    label: 'Review Deadline',
    description: 'How long users have to submit reviews after gig completion',
    unit: 'days',
    category: 'reviews',
  },
]
