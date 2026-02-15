import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PaymentConfig, FeeBreakdown } from '@/types/payment'

const COLLECTIONS = {
  FEE_CONFIGS: 'feeConfigs'
} as const

/**
 * Default Fee Configuration
 *
 * Simplified for TradeSafe escrow payments:
 * - Platform takes 10% commission from worker earnings (via TradeSafe agent fee)
 * - Employer pays exactly the gig amount (no additional fees)
 * - Worker receives 90% of gig amount
 */
export const DEFAULT_FEE_CONFIG: Omit<PaymentConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  // Platform commission - deducted from worker earnings via TradeSafe agent fee
  platformCommissionPercent: 10,

  // Gig amount limits
  minimumGigAmount: 100,    // R100 minimum
  maximumGigAmount: 100000, // R100,000 maximum

  // Escrow auto-release (worker protection)
  escrowAutoReleaseDays: 7, // Auto-release if employer doesn't respond in 7 days

  // Status
  isActive: true
}

export class FeeConfigService {
  /**
   * Get the active fee configuration
   */
  static async getActiveFeeConfig(): Promise<PaymentConfig> {
    try {
      const q = query(
        collection(db, COLLECTIONS.FEE_CONFIGS),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(1)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.warn('⚠️  No fee config found in database. Using default config.')
        return {
          id: 'default',
          ...DEFAULT_FEE_CONFIG,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        }
      }

      const docData = querySnapshot.docs[0]
      const data = docData.data()

      // Handle migration from old field names
      return {
        id: docData.id,
        platformCommissionPercent: data.platformCommissionPercent ?? data.workerCommissionPercentage ?? 10,
        minimumGigAmount: data.minimumGigAmount ?? 100,
        maximumGigAmount: data.maximumGigAmount ?? data.maximumPaymentAmount ?? 100000,
        escrowAutoReleaseDays: data.escrowAutoReleaseDays ?? Math.round((data.escrowReleaseDelayHours ?? 168) / 24),
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy || 'system'
      }
    } catch (error) {
      console.error('Error fetching active fee config:', error)
      return {
        id: 'default',
        ...DEFAULT_FEE_CONFIG,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    }
  }

  /**
   * Create new fee configuration
   */
  static async createFeeConfig(
    configData: Omit<PaymentConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    createdBy: string
  ): Promise<PaymentConfig> {
    try {
      if (configData.isActive) {
        await this.deactivateAllConfigs()
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.FEE_CONFIGS), {
        ...configData,
        createdBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      return {
        id: docRef.id,
        ...configData,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } catch (error) {
      console.error('Error creating fee config:', error)
      throw new Error('Failed to create fee configuration')
    }
  }

  /**
   * Update existing fee configuration
   */
  static async updateFeeConfig(
    configId: string,
    updates: Partial<Omit<PaymentConfig, 'id' | 'createdAt' | 'createdBy'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      if (updates.isActive) {
        await this.deactivateAllConfigs()
      }

      await updateDoc(doc(db, COLLECTIONS.FEE_CONFIGS, configId), {
        ...updates,
        updatedBy,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error updating fee config:', error)
      throw new Error('Failed to update fee configuration')
    }
  }

  /**
   * Get all fee configurations (for admin)
   */
  static async getAllFeeConfigs(): Promise<PaymentConfig[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.FEE_CONFIGS),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data()
        return {
          id: docSnapshot.id,
          platformCommissionPercent: data.platformCommissionPercent ?? data.workerCommissionPercentage ?? 10,
          minimumGigAmount: data.minimumGigAmount ?? 100,
          maximumGigAmount: data.maximumGigAmount ?? data.maximumPaymentAmount ?? 100000,
          escrowAutoReleaseDays: data.escrowAutoReleaseDays ?? 7,
          isActive: data.isActive ?? false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy || 'unknown'
        }
      })
    } catch (error) {
      console.error('Error fetching fee configs:', error)
      return []
    }
  }

  /**
   * Deactivate all configurations
   */
  private static async deactivateAllConfigs(): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.FEE_CONFIGS),
        where('isActive', '==', true)
      )

      const querySnapshot = await getDocs(q)
      const batch = writeBatch(db)

      querySnapshot.docs.forEach(docSnapshot => {
        batch.update(docSnapshot.ref, {
          isActive: false,
          updatedAt: Timestamp.now()
        })
      })
      await batch.commit()
    } catch (error) {
      console.error('Error deactivating fee configs:', error)
    }
  }

  /**
   * Calculate fee breakdown for a gig amount
   *
   * Simple calculation:
   * - Employer pays: gigAmount
   * - Platform takes: gigAmount * 10%
   * - Worker receives: gigAmount * 90%
   */
  static calculateFeeBreakdown(gigAmount: number, config: PaymentConfig): FeeBreakdown {
    const commission = config.platformCommissionPercent / 100
    const platformCommission = Math.round(gigAmount * commission * 100) / 100
    const workerEarnings = Math.round((gigAmount - platformCommission) * 100) / 100

    return {
      gigAmount,
      platformCommission,
      workerEarnings
    }
  }

  /**
   * Format currency for South African Rand
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Validate fee configuration
   */
  static validateFeeConfig(config: Partial<PaymentConfig>): string[] {
    const errors: string[] = []

    if (config.platformCommissionPercent !== undefined) {
      if (config.platformCommissionPercent < 0 || config.platformCommissionPercent > 50) {
        errors.push('Platform commission must be between 0% and 50%')
      }
    }

    if (config.minimumGigAmount !== undefined) {
      if (config.minimumGigAmount < 1 || config.minimumGigAmount > 10000) {
        errors.push('Minimum gig amount must be between R1 and R10,000')
      }
    }

    if (config.maximumGigAmount !== undefined) {
      if (config.maximumGigAmount < 1000 || config.maximumGigAmount > 1000000) {
        errors.push('Maximum gig amount must be between R1,000 and R1,000,000')
      }
    }

    if (config.escrowAutoReleaseDays !== undefined) {
      if (config.escrowAutoReleaseDays < 1 || config.escrowAutoReleaseDays > 30) {
        errors.push('Escrow auto-release must be between 1 and 30 days')
      }
    }

    return errors
  }
}
