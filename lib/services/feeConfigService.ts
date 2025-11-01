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

// Default fee configuration for South African market
export const DEFAULT_FEE_CONFIG: Omit<PaymentConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  // Platform fees (paid by employer)
  platformFeePercentage: 5, // 5% platform service fee
  paymentProcessingFeePercentage: 2.9, // 2.9% payment processing
  fixedTransactionFee: 2.50, // R2.50 fixed fee per transaction

  // Worker commission (deducted from worker earnings)
  workerCommissionPercentage: 10, // 10% commission from worker earnings

  // Minimum amounts
  minimumGigAmount: 100, // R100 minimum gig value
  minimumWithdrawal: 50, // R50 minimum withdrawal
  minimumMilestone: 50, // R50 minimum milestone

  // Escrow settings
  escrowReleaseDelayHours: 72, // 3 days default hold
  autoReleaseEnabled: true,

  // Payment providers
  enabledProviders: ['payfast', 'ozow', 'yoco'],
  defaultProvider: 'payfast',

  // South African tax
  vatIncluded: true,
  vatPercentage: 15,

  // Status
  isActive: true
}

export class FeeConfigService {
  // Get the active fee configuration
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
        // Return default config if none exists in database
        // Run 'npm run seed:prod' or 'npm run seed:dev' to seed the database
        console.warn('⚠️  No fee config found in database. Using default config. Run seed script to persist.')
        return {
          id: 'default',
          ...DEFAULT_FEE_CONFIG,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        }
      }

      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as PaymentConfig
    } catch (error) {
      console.error('Error fetching active fee config:', error)
      // Return default config as fallback
      return {
        id: 'default',
        ...DEFAULT_FEE_CONFIG,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    }
  }

  // Create new fee configuration
  static async createFeeConfig(
    configData: Omit<PaymentConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    createdBy: string
  ): Promise<PaymentConfig> {
    try {
      // If this config is being set as active, deactivate all others
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

  // Update existing fee configuration
  static async updateFeeConfig(
    configId: string,
    updates: Partial<Omit<PaymentConfig, 'id' | 'createdAt' | 'createdBy'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      // If this config is being set as active, deactivate all others
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

  // Get all fee configurations (for admin)
  static async getAllFeeConfigs(): Promise<PaymentConfig[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.FEE_CONFIGS),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as PaymentConfig))
    } catch (error) {
      console.error('Error fetching fee configs:', error)
      return []
    }
  }

  // Deactivate all configurations (helper for setting new active config)
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

  // Calculate detailed fee breakdown
  static calculateFeeBreakdown(
    grossAmount: number,
    config: PaymentConfig
  ): FeeBreakdown {
    // Employer-side fees (added to the gross amount)
    const platformFee = Math.round((grossAmount * config.platformFeePercentage) / 100 * 100) / 100
    const processingFee = Math.round((grossAmount * config.paymentProcessingFeePercentage) / 100 * 100) / 100
    const fixedFee = config.fixedTransactionFee

    // Total employer fees
    const totalEmployerFees = platformFee + processingFee + fixedFee

    // Worker-side deductions (taken from the gross amount)
    const workerCommission = Math.round((grossAmount * config.workerCommissionPercentage) / 100 * 100) / 100
    const totalWorkerDeductions = workerCommission

    // Final amounts
    const netAmountToWorker = grossAmount - totalWorkerDeductions
    const totalEmployerCost = grossAmount + totalEmployerFees

    return {
      grossAmount,
      platformFee,
      processingFee,
      fixedFee,
      workerCommission,
      totalEmployerFees,
      totalWorkerDeductions,
      netAmountToWorker,
      totalEmployerCost
    }
  }

  // Format currency for South African market
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Validate fee configuration
  static validateFeeConfig(config: Partial<PaymentConfig>): string[] {
    const errors: string[] = []

    if (config.platformFeePercentage !== undefined) {
      if (config.platformFeePercentage < 0 || config.platformFeePercentage > 50) {
        errors.push('Platform fee percentage must be between 0% and 50%')
      }
    }

    if (config.paymentProcessingFeePercentage !== undefined) {
      if (config.paymentProcessingFeePercentage < 0 || config.paymentProcessingFeePercentage > 10) {
        errors.push('Payment processing fee percentage must be between 0% and 10%')
      }
    }

    if (config.workerCommissionPercentage !== undefined) {
      if (config.workerCommissionPercentage < 0 || config.workerCommissionPercentage > 30) {
        errors.push('Worker commission percentage must be between 0% and 30%')
      }
    }

    if (config.fixedTransactionFee !== undefined) {
      if (config.fixedTransactionFee < 0 || config.fixedTransactionFee > 100) {
        errors.push('Fixed transaction fee must be between R0 and R100')
      }
    }

    if (config.minimumGigAmount !== undefined) {
      if (config.minimumGigAmount < 10 || config.minimumGigAmount > 10000) {
        errors.push('Minimum gig amount must be between R10 and R10,000')
      }
    }

    return errors
  }
}