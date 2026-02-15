/**
 * WalletService Tests
 */

import { WalletService } from '@/lib/services/walletService'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  increment: jest.fn((amount) => amount),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() }))
  }
}))

describe('WalletService', () => {
  const mockUserId = 'user-123'
  const mockDocRef = { id: mockUserId }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(doc as jest.Mock).mockReturnValue(mockDocRef)
  })

  describe('creditWallet', () => {
    const { runTransaction } = require('firebase/firestore')

    it('should initialize wallet fields when they do not exist', async () => {
      const amount = 500
      const mockUserData = { id: mockUserId, email: 'test@example.com' }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.creditWallet(mockUserId, amount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          walletBalance: amount,
          pendingBalance: 0,
          totalEarnings: amount,
          totalWithdrawn: 0
        })
      )
    })

    it('should use increment when wallet fields already exist', async () => {
      const amount = 500
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        walletBalance: 1000,
        pendingBalance: 200,
        totalEarnings: 1000,
        totalWithdrawn: 0
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.creditWallet(mockUserId, amount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          walletBalance: amount,
          totalEarnings: amount
        })
      )
    })

    it('should handle errors when user not found', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => false
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await expect(WalletService.creditWallet(mockUserId, 500)).rejects.toThrow('User not found')
    })

    it('should handle errors when crediting wallet fails', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ id: mockUserId, walletBalance: 100 })
        }),
        update: jest.fn().mockImplementation(() => {
          throw new Error('Database error')
        })
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        try {
          return await callback(mockTransaction)
        } catch (error) {
          throw error
        }
      })

      await expect(WalletService.creditWallet(mockUserId, 500)).rejects.toThrow('Database error')
    })

    it('should credit wallet with decimal amounts', async () => {
      const amount = 123.45
      const mockUserData = {
        id: mockUserId,
        walletBalance: 500
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.creditWallet(mockUserId, amount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          walletBalance: amount,
          totalEarnings: amount
        })
      )
    })
  })

  describe('debitWalletAtomic', () => {
    const { runTransaction } = require('firebase/firestore')

    it('should atomically check balance and debit wallet in single transaction', async () => {
      const amount = 200
      const mockUserData = {
        id: mockUserId,
        walletBalance: 500,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.debitWalletAtomic(mockUserId, amount)

      expect(runTransaction).toHaveBeenCalledWith(db, expect.any(Function))
      expect(mockTransaction.get).toHaveBeenCalled()
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          walletBalance: -amount,
          totalWithdrawn: amount
        })
      )
    })

    it('should reject if insufficient balance (atomic check within transaction)', async () => {
      const mockUserData = {
        id: mockUserId,
        walletBalance: 100,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await expect(WalletService.debitWalletAtomic(mockUserId, 200)).rejects.toThrow('Insufficient balance')
      expect(mockTransaction.update).not.toHaveBeenCalled()
    })

    it('should prevent race condition with concurrent withdrawals', async () => {
      // Simulate two concurrent requests trying to withdraw R600 each from R1000 balance
      const mockUserData = {
        id: mockUserId,
        walletBalance: 1000,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      let transactionCount = 0
      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        transactionCount++

        if (transactionCount === 1) {
          // First transaction: balance is 1000, withdraw 600 succeeds
          const mockTransaction = {
            get: jest.fn().mockResolvedValue({
              exists: () => true,
              data: () => mockUserData
            }),
            update: jest.fn()
          }
          return await callback(mockTransaction)
        } else {
          // Second transaction: balance is now 400 (after first withdrawal), withdraw 600 fails
          const mockTransaction = {
            get: jest.fn().mockResolvedValue({
              exists: () => true,
              data: () => ({ ...mockUserData, walletBalance: 400 })
            }),
            update: jest.fn()
          }
          return await callback(mockTransaction)
        }
      })

      // First withdrawal succeeds
      await expect(WalletService.debitWalletAtomic(mockUserId, 600)).resolves.toBeUndefined()

      // Second concurrent withdrawal fails (insufficient balance after first)
      await expect(WalletService.debitWalletAtomic(mockUserId, 600)).rejects.toThrow('Insufficient balance')
    })

    it('should throw error if user not found', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => false
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await expect(WalletService.debitWalletAtomic(mockUserId, 200)).rejects.toThrow('User not found')
    })
  })

  describe('updatePendingBalance', () => {
    const { runTransaction } = require('firebase/firestore')

    it('should initialize wallet fields when they do not exist', async () => {
      const amount = 1000
      const mockUserData = { id: mockUserId, email: 'test@example.com' }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.updatePendingBalance(mockUserId, amount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          walletBalance: 0,
          pendingBalance: amount,
          totalEarnings: 0,
          totalWithdrawn: 0
        })
      )
    })

    it('should use increment when wallet fields already exist', async () => {
      const amount = 1000
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        walletBalance: 500,
        pendingBalance: 200,
        totalEarnings: 1000,
        totalWithdrawn: 0
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.updatePendingBalance(mockUserId, amount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pendingBalance: amount
        })
      )
    })

    it('should handle errors when user not found', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => false
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await expect(WalletService.updatePendingBalance(mockUserId, 1000)).rejects.toThrow('User not found')
    })

    it('should handle errors when updating pending balance fails', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ id: mockUserId, pendingBalance: 100 })
        }),
        update: jest.fn().mockImplementation(() => {
          throw new Error('Database error')
        })
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        try {
          return await callback(mockTransaction)
        } catch (error) {
          throw error
        }
      })

      await expect(WalletService.updatePendingBalance(mockUserId, 1000)).rejects.toThrow('Database error')
    })
  })

  describe('movePendingToWallet', () => {
    const { runTransaction } = require('firebase/firestore')

    it('should initialize wallet fields when they do not exist', async () => {
      const amount = 800
      // Include pendingBalance in the mockUserData to have sufficient balance to move
      const mockUserData = { id: mockUserId, email: 'test@example.com', pendingBalance: 800 }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.movePendingToWallet(mockUserId, amount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          walletBalance: amount,
          pendingBalance: 0,
          totalEarnings: amount,
          totalWithdrawn: 0
        })
      )
    })

    it('should use increment when wallet fields already exist', async () => {
      const amount = 800
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        walletBalance: 500,
        pendingBalance: 800,
        totalEarnings: 1000,
        totalWithdrawn: 0
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.movePendingToWallet(mockUserId, amount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pendingBalance: -amount,
          walletBalance: amount,
          totalEarnings: amount
        })
      )
    })

    it('should handle errors when user not found', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => false
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await expect(WalletService.movePendingToWallet(mockUserId, 800)).rejects.toThrow('User not found')
    })

    it('should handle errors when moving pending to wallet fails', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ id: mockUserId, walletBalance: 100, pendingBalance: 800 })
        }),
        update: jest.fn().mockImplementation(() => {
          throw new Error('Database error')
        })
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        try {
          return await callback(mockTransaction)
        } catch (error) {
          throw error
        }
      })

      await expect(WalletService.movePendingToWallet(mockUserId, 800)).rejects.toThrow('Database error')
    })
  })

  describe('releaseEscrowWithCommission', () => {
    const { runTransaction } = require('firebase/firestore')

    it('should deduct gross from pending and credit net to wallet', async () => {
      const grossAmount = 1000
      const netAmount = 900 // After 10% commission
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        walletBalance: 500,
        pendingBalance: 1000,
        totalEarnings: 500,
        totalWithdrawn: 0
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.releaseEscrowWithCommission(mockUserId, grossAmount, netAmount)

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pendingBalance: -grossAmount,
          walletBalance: netAmount,
          totalEarnings: netAmount
        })
      )
    })

    it('should throw error if insufficient pending balance', async () => {
      const grossAmount = 1000
      const netAmount = 900
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        walletBalance: 500,
        pendingBalance: 500, // Less than grossAmount
        totalEarnings: 500,
        totalWithdrawn: 0
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await expect(
        WalletService.releaseEscrowWithCommission(mockUserId, grossAmount, netAmount)
      ).rejects.toThrow('Insufficient pending balance')
    })

    it('should throw error if user not found', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => false
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await expect(
        WalletService.releaseEscrowWithCommission(mockUserId, 1000, 900)
      ).rejects.toThrow('User not found')
    })

    it('should handle commission correctly - platform keeps the difference', async () => {
      const grossAmount = 294
      const netAmount = 288.12 // After 2% commission (5.88)
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        walletBalance: 0,
        pendingBalance: 294,
        totalEarnings: 0,
        totalWithdrawn: 0
      }

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        }),
        update: jest.fn()
      }

      ;(runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      await WalletService.releaseEscrowWithCommission(mockUserId, grossAmount, netAmount)

      // Verify gross removed from pending, net added to wallet
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pendingBalance: -grossAmount,
          walletBalance: netAmount,
          totalEarnings: netAmount
        })
      )
    })
  })

  describe('getWalletBalance', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      // Create a fresh spy for each test
      consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})
    })

    afterEach(() => {
      // Clean up the spy
      consoleSpy.mockRestore()
      jest.clearAllMocks()
    })

    it('should return wallet balance for user', async () => {
      const mockUserData = {
        id: mockUserId,
        walletBalance: 1500,
        pendingBalance: 500,
        totalEarnings: 5000,
        totalWithdrawn: 3000,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })

      const balance = await WalletService.getWalletBalance(mockUserId)

      expect(balance).toEqual({
        walletBalance: 1500,
        pendingBalance: 500,
        totalEarnings: 5000,
        totalWithdrawn: 3000
      })
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should return zero balances and log debug message if user not found', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      })

      const balance = await WalletService.getWalletBalance(mockUserId)

      expect(balance).toEqual({
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      })
      expect(consoleSpy).toHaveBeenCalledWith('Error getting wallet balance:', new Error('User not found'))
    })

    it('should return zero for undefined wallet fields and not log debug', async () => {
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })

      const balance = await WalletService.getWalletBalance(mockUserId)

      expect(balance).toEqual({
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      })
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully and log debug message', async () => {
      ;(getDoc as jest.Mock).mockRejectedValue(new Error('Database error'))

      const balance = await WalletService.getWalletBalance(mockUserId)

      expect(balance).toEqual({
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      })
      expect(consoleSpy).toHaveBeenCalledWith('Error getting wallet balance:', new Error('Database error'))
    })
  })

  describe('initializeWallet', () => {
    it('should initialize wallet fields for user without wallet', async () => {
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await WalletService.initializeWallet(mockUserId)

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          walletBalance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0
        })
      )
    })

    it('should not initialize if wallet already exists', async () => {
      const mockUserData = {
        id: mockUserId,
        walletBalance: 100,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })

      await WalletService.initializeWallet(mockUserId)

      expect(updateDoc).not.toHaveBeenCalled()
    })

    it('should throw error if user not found', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      })

      await expect(WalletService.initializeWallet(mockUserId)).rejects.toThrow('User not found')
    })

    it('should handle errors when initializing wallet fails', async () => {
      const mockUserData = {
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Cape Town',
        userType: 'job-seeker' as const,
        createdAt: new Date()
      }

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })
      ;(updateDoc as jest.Mock).mockRejectedValue(new Error('Database error'))

      await expect(WalletService.initializeWallet(mockUserId)).rejects.toThrow('Database error')
    })
  })
})
