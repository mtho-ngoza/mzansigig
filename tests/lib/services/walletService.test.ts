/**
 * WalletService Tests
 */

import { WalletService } from '@/lib/services/walletService'
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
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
    it('should initialize wallet fields when they do not exist', async () => {
      const amount = 500
      const mockUserData = { id: mockUserId, email: 'test@example.com' }

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await WalletService.creditWallet(mockUserId, amount)

      expect(doc).toHaveBeenCalledWith(db, 'users', mockUserId)
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
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

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await WalletService.creditWallet(mockUserId, amount)

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          walletBalance: amount,
          totalEarnings: amount
        })
      )
    })

    it('should handle errors when user not found', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      })

      await expect(WalletService.creditWallet(mockUserId, 500)).rejects.toThrow('User not found')
    })

    it('should handle errors when crediting wallet fails', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ id: mockUserId, walletBalance: 100 })
      })
      ;(updateDoc as jest.Mock).mockRejectedValue(new Error('Database error'))

      await expect(WalletService.creditWallet(mockUserId, 500)).rejects.toThrow('Database error')
    })

    it('should credit wallet with decimal amounts', async () => {
      const amount = 123.45
      const mockUserData = {
        id: mockUserId,
        walletBalance: 500
      }

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await WalletService.creditWallet(mockUserId, amount)

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          walletBalance: amount,
          totalEarnings: amount
        })
      )
    })
  })

  describe('debitWallet', () => {
    it('should debit user wallet with specified amount', async () => {
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

      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await WalletService.debitWallet(mockUserId, amount)

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          walletBalance: -amount,
          totalWithdrawn: amount
        })
      )
    })

    it('should throw error if user not found', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      })

      await expect(WalletService.debitWallet(mockUserId, 200)).rejects.toThrow('User not found')
    })

    it('should throw error if insufficient balance', async () => {
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

      await expect(WalletService.debitWallet(mockUserId, 200)).rejects.toThrow('Insufficient balance')
    })

    it('should handle zero balance correctly', async () => {
      const mockUserData = {
        id: mockUserId,
        walletBalance: 0,
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

      await expect(WalletService.debitWallet(mockUserId, 50)).rejects.toThrow('Insufficient balance')
    })
  })

  describe('updatePendingBalance', () => {
    it('should update pending balance when payment goes into escrow', async () => {
      const amount = 1000
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await WalletService.updatePendingBalance(mockUserId, amount)

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          pendingBalance: amount
        })
      )
    })

    it('should handle errors when updating pending balance fails', async () => {
      ;(updateDoc as jest.Mock).mockRejectedValue(new Error('Database error'))

      await expect(WalletService.updatePendingBalance(mockUserId, 1000)).rejects.toThrow('Failed to update pending balance')
    })
  })

  describe('movePendingToWallet', () => {
    it('should move funds from pending to wallet when escrow is released', async () => {
      const amount = 800
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await WalletService.movePendingToWallet(mockUserId, amount)

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          pendingBalance: -amount,
          walletBalance: amount,
          totalEarnings: amount
        })
      )
    })

    it('should handle errors when moving pending to wallet fails', async () => {
      ;(updateDoc as jest.Mock).mockRejectedValue(new Error('Database error'))

      await expect(WalletService.movePendingToWallet(mockUserId, 800)).rejects.toThrow('Failed to move pending to wallet')
    })
  })

  describe('getWalletBalance', () => {
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
    })

    it('should return zero balances if user not found', async () => {
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
    })

    it('should return zero for undefined wallet fields', async () => {
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
    })

    it('should handle errors gracefully', async () => {
      ;(getDoc as jest.Mock).mockRejectedValue(new Error('Database error'))

      const balance = await WalletService.getWalletBalance(mockUserId)

      expect(balance).toEqual({
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      })
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
