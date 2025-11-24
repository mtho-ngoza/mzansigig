import { doc, updateDoc, getDoc, increment, Timestamp, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from '@/types/auth'

export class WalletService {
  /**
   * Atomically check balance and debit wallet (prevents race conditions)
   * This is the SAFE way to handle withdrawals with concurrent requests
   */
  static async debitWalletAtomic(userId: string, amount: number): Promise<void> {
    const userRef = doc(db, 'users', userId)

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef)

        if (!userDoc.exists()) {
          throw new Error('User not found')
        }

        const userData = userDoc.data() as User
        const currentBalance = userData.walletBalance || 0

        if (currentBalance < amount) {
          throw new Error('Insufficient balance')
        }

        // Atomic update - balance check and debit happen together
        transaction.update(userRef, {
          walletBalance: increment(-amount),
          totalWithdrawn: increment(amount),
          updatedAt: Timestamp.now()
        })
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to debit wallet')
    }
  }

  /**
   * Credit worker's wallet when escrow is released
   * Uses transaction to prevent race conditions
   */
  static async creditWallet(userId: string, amount: number): Promise<void> {
    const userRef = doc(db, 'users', userId)

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef)

        if (!userDoc.exists()) {
          throw new Error('User not found')
        }

        const userData = userDoc.data()

        // Initialize wallet if fields don't exist
        if (userData.walletBalance === undefined) {
          transaction.update(userRef, {
            walletBalance: amount,
            pendingBalance: 0,
            totalEarnings: amount,
            totalWithdrawn: 0,
            updatedAt: Timestamp.now()
          })
        } else {
          transaction.update(userRef, {
            walletBalance: increment(amount),
            totalEarnings: increment(amount),
            updatedAt: Timestamp.now()
          })
        }
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to credit wallet')
    }
  }

  /**
   * Debit worker's wallet when withdrawal is processed
   * @deprecated Use debitWalletAtomic instead to prevent race conditions
   */
  static async debitWallet(userId: string, amount: number): Promise<void> {
    // Redirect to atomic version to prevent race conditions
    return this.debitWalletAtomic(userId, amount)
  }

  /**
   * Update pending balance when payment goes into escrow
   * Uses transaction to prevent race conditions
   */
  static async updatePendingBalance(userId: string, amount: number): Promise<void> {
    const userRef = doc(db, 'users', userId)

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef)

        if (!userDoc.exists()) {
          throw new Error('User not found')
        }

        const userData = userDoc.data()

        // Initialize wallet if fields don't exist
        if (userData.pendingBalance === undefined) {
          transaction.update(userRef, {
            walletBalance: 0,
            pendingBalance: amount,
            totalEarnings: 0,
            totalWithdrawn: 0,
            updatedAt: Timestamp.now()
          })
        } else {
          transaction.update(userRef, {
            pendingBalance: increment(amount),
            updatedAt: Timestamp.now()
          })
        }
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update pending balance')
    }
  }

  /**
   * Transfer from pending to wallet when escrow is released
   * Uses transaction to prevent race conditions and ensure atomicity
   */
  static async movePendingToWallet(userId: string, amount: number): Promise<void> {
    const userRef = doc(db, 'users', userId)

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef)

        if (!userDoc.exists()) {
          throw new Error('User not found')
        }

        const userData = userDoc.data()
        const currentPending = userData.pendingBalance || 0

        // Validate sufficient pending balance
        if (currentPending < amount) {
          throw new Error(`Insufficient pending balance. Tried to release ${amount} but only ${currentPending} available`)
        }

        // Initialize wallet if fields don't exist
        if (userData.walletBalance === undefined || userData.pendingBalance === undefined) {
          transaction.update(userRef, {
            walletBalance: amount,
            pendingBalance: 0,
            totalEarnings: amount,
            totalWithdrawn: 0,
            updatedAt: Timestamp.now()
          })
        } else {
          transaction.update(userRef, {
            pendingBalance: increment(-amount),
            walletBalance: increment(amount),
            totalEarnings: increment(amount),
            updatedAt: Timestamp.now()
          })
        }
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to move pending to wallet')
    }
  }

  /**
   * Get user's wallet balance
   */
  static async getWalletBalance(userId: string): Promise<{
    walletBalance: number
    pendingBalance: number
    totalEarnings: number
    totalWithdrawn: number
  }> {
    const defaultBalance = {
      walletBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      totalWithdrawn: 0
    }

    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        console.debug('Error getting wallet balance:', new Error('User not found'))
        return defaultBalance
      }

      const userData = userDoc.data() as User

      return {
        walletBalance: userData.walletBalance || 0,
        pendingBalance: userData.pendingBalance || 0,
        totalEarnings: userData.totalEarnings || 0,
        totalWithdrawn: userData.totalWithdrawn || 0
      }
    } catch (error) {
      console.debug('Error getting wallet balance:', error)
      return defaultBalance
    }
  }

  /**
   * Initialize wallet fields for existing users (migration helper)
   */
  static async initializeWallet(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      throw new Error('User not found')
    }

    try {
      const userData = userDoc.data() as User

      // Only initialize if not already set
      if (userData.walletBalance === undefined) {
        await updateDoc(userRef, {
          walletBalance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0,
          updatedAt: Timestamp.now()
        })
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to initialize wallet')
    }
  }

  /**
   * Reset wallet balances to zero (FOR DEVELOPMENT/TESTING ONLY)
   * Use this to clear old test data from user wallet
   */
  static async resetWallet(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      throw new Error('User not found')
    }

    try {
      await updateDoc(userRef, {
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        updatedAt: Timestamp.now()
      })
      console.log(`Wallet reset to zero for user: ${userId}`)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reset wallet')
    }
  }
}
