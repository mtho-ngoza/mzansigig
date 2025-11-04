import { doc, updateDoc, getDoc, increment, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from '@/types/auth'

export class WalletService {
  /**
   * Credit worker's wallet when escrow is released
   */
  static async creditWallet(userId: string, amount: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)

      // First check if user exists and has wallet fields
      const userDoc = await getDoc(userRef)
      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data()

      // Initialize wallet if fields don't exist
      if (userData.walletBalance === undefined) {
        await updateDoc(userRef, {
          walletBalance: amount,
          pendingBalance: 0,
          totalEarnings: amount,
          totalWithdrawn: 0,
          updatedAt: Timestamp.now()
        })
      } else {
        await updateDoc(userRef, {
          walletBalance: increment(amount),
          totalEarnings: increment(amount),
          updatedAt: Timestamp.now()
        })
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to credit wallet')
    }
  }

  /**
   * Debit worker's wallet when withdrawal is processed
   */
  static async debitWallet(userId: string, amount: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data() as User
      const currentBalance = userData.walletBalance || 0

      if (currentBalance < amount) {
        throw new Error('Insufficient balance')
      }

      await updateDoc(userRef, {
        walletBalance: increment(-amount),
        totalWithdrawn: increment(amount),
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to debit wallet')
    }
  }

  /**
   * Update pending balance when payment goes into escrow
   */
  static async updatePendingBalance(userId: string, amount: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)

      // First check if user exists and has wallet fields
      const userDoc = await getDoc(userRef)
      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data()

      // Initialize wallet if fields don't exist
      if (userData.pendingBalance === undefined) {
        await updateDoc(userRef, {
          walletBalance: 0,
          pendingBalance: amount,
          totalEarnings: 0,
          totalWithdrawn: 0,
          updatedAt: Timestamp.now()
        })
      } else {
        await updateDoc(userRef, {
          pendingBalance: increment(amount),
          updatedAt: Timestamp.now()
        })
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update pending balance')
    }
  }

  /**
   * Transfer from pending to wallet when escrow is released
   */
  static async movePendingToWallet(userId: string, amount: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)

      // First check if user exists and has wallet fields
      const userDoc = await getDoc(userRef)
      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data()

      // Initialize wallet if fields don't exist
      if (userData.walletBalance === undefined || userData.pendingBalance === undefined) {
        await updateDoc(userRef, {
          walletBalance: amount,
          pendingBalance: 0,
          totalEarnings: amount,
          totalWithdrawn: 0,
          updatedAt: Timestamp.now()
        })
      } else {
        await updateDoc(userRef, {
          pendingBalance: increment(-amount),
          walletBalance: increment(amount),
          totalEarnings: increment(amount),
          updatedAt: Timestamp.now()
        })
      }
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
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('User not found')
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
      return {
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      }
    }
  }

  /**
   * Initialize wallet fields for existing users (migration helper)
   */
  static async initializeWallet(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

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
      console.debug('Error initializing wallet:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to initialize wallet')
    }
  }
}
