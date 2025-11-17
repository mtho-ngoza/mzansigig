/**
 * Development Utilities
 * FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION
 *
 * These utilities help reset test data during local development.
 */

import { collection, query, where, getDocs, writeBatch, Query, DocumentData } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { WalletService } from './walletService'

const COLLECTIONS = {
  PAYMENT_HISTORY: 'payment_history',
  WITHDRAWALS: 'withdrawal_requests',
  PAYMENTS: 'payments',
  ESCROW_ACCOUNTS: 'escrow_accounts'
}

export class DevUtils {
  /**
   * Reset all wallet and payment data for a user
   * This includes:
   * - Wallet balances (walletBalance, pendingBalance, totalEarnings, totalWithdrawn)
   * - Payment history records
   * - Withdrawal requests
   * - Payment records
   * - Escrow accounts
   */
  static async resetUserWalletData(userId: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DevUtils cannot be used in production')
    }

    console.log(`🧹 Starting wallet data reset for user: ${userId}`)

    try {
      // 1. Reset wallet balances in user document
      console.log('  → Resetting wallet balances...')
      await WalletService.resetWallet(userId)

      // 2. Delete payment history
      console.log('  → Deleting payment history...')
      await this.deleteCollectionForUser(COLLECTIONS.PAYMENT_HISTORY, userId)

      // 3. Delete withdrawal requests
      console.log('  → Deleting withdrawal requests...')
      await this.deleteCollectionForUser(COLLECTIONS.WITHDRAWALS, userId)

      // 4. Delete payment records (as worker)
      console.log('  → Deleting payment records (as worker)...')
      await this.deleteCollectionWhere(COLLECTIONS.PAYMENTS, 'workerId', userId)

      // 5. Delete payment records (as employer)
      console.log('  → Deleting payment records (as employer)...')
      await this.deleteCollectionWhere(COLLECTIONS.PAYMENTS, 'employerId', userId)

      // 6. Delete escrow accounts (as worker)
      console.log('  → Deleting escrow accounts (as worker)...')
      await this.deleteCollectionWhere(COLLECTIONS.ESCROW_ACCOUNTS, 'workerId', userId)

      // 7. Delete escrow accounts (as employer)
      console.log('  → Deleting escrow accounts (as employer)...')
      await this.deleteCollectionWhere(COLLECTIONS.ESCROW_ACCOUNTS, 'employerId', userId)

      console.log('✅ Wallet data reset complete!')
      console.log('   Please refresh the page to see updated data.')
    } catch (error) {
      console.error('❌ Error resetting wallet data:', error)
      throw error
    }
  }

  /**
   * Delete all documents in a collection where userId matches
   */
  private static async deleteCollectionForUser(collectionName: string, userId: string): Promise<void> {
    const q = query(collection(db, collectionName), where('userId', '==', userId))
    await this.deleteQueryResults(q)
  }

  /**
   * Delete all documents in a collection where a field matches a value
   */
  private static async deleteCollectionWhere(collectionName: string, fieldName: string, value: string): Promise<void> {
    const q = query(collection(db, collectionName), where(fieldName, '==', value))
    await this.deleteQueryResults(q)
  }

  /**
   * Execute a query and delete all matching documents
   */
  private static async deleteQueryResults(q: Query<DocumentData>): Promise<void> {
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return
    }

    // Use batched writes for better performance
    const batch = writeBatch(db)
    let batchCount = 0

    for (const docSnapshot of querySnapshot.docs) {
      batch.delete(docSnapshot.ref)
      batchCount++

      // Firestore has a limit of 500 operations per batch
      if (batchCount >= 500) {
        await batch.commit()
        batchCount = 0
      }
    }

    if (batchCount > 0) {
      await batch.commit()
    }

    console.log(`    Deleted ${querySnapshot.size} documents`)
  }

  /**
   * Quick check to see current wallet balances
   */
  static async checkWalletBalance(userId: string): Promise<void> {
    const balance = await WalletService.getWalletBalance(userId)
    console.log('💰 Current Wallet Balances:')
    console.log(`   Available Balance: R${balance.walletBalance.toFixed(2)}`)
    console.log(`   Pending (Escrow): R${balance.pendingBalance.toFixed(2)}`)
    console.log(`   Total Earnings: R${balance.totalEarnings.toFixed(2)}`)
    console.log(`   Total Withdrawn: R${balance.totalWithdrawn.toFixed(2)}`)
  }
}

// Make available in browser console for development
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  interface WindowWithDevUtils extends Window {
    devUtils: typeof DevUtils;
  }
  (window as unknown as WindowWithDevUtils).devUtils = DevUtils
  console.log('💡 DevUtils loaded! Available commands:')
  console.log('   devUtils.resetUserWalletData("user-id") - Reset all wallet data')
  console.log('   devUtils.checkWalletBalance("user-id") - Check current balances')
}
