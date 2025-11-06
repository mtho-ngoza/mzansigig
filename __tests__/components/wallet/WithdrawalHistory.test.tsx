/**
 * Tests for WithdrawalHistory Component
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import WithdrawalHistory from '@/components/wallet/WithdrawalHistory'
import { PaymentService } from '@/lib/services/paymentService'
import { WithdrawalRequest } from '@/types/payment'

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'worker@test.com',
      firstName: 'Test',
      lastName: 'Worker',
      userType: 'job-seeker'
    }
  })
}))

// Mock PaymentService
jest.mock('@/lib/services/paymentService')

describe('WithdrawalHistory Component', () => {
  const mockWithdrawals: WithdrawalRequest[] = [
    {
      id: 'w1',
      userId: 'test-user-123',
      amount: 500,
      currency: 'ZAR',
      status: 'completed',
      paymentMethodId: 'pm1',
      requestedAt: new Date('2024-01-15T09:00:00Z'),
      completedAt: new Date('2024-01-15T10:00:00Z'),
      adminNotes: 'Approved by admin - virtual deposit (Phase 1)',
      bankDetails: {
        bankName: 'FNB',
        accountNumber: '1234567890',
        accountType: 'cheque',
        accountHolder: 'Test Worker',
        branchCode: '250655'
      }
    },
    {
      id: 'w2',
      userId: 'test-user-123',
      amount: 1000,
      currency: 'ZAR',
      status: 'pending',
      paymentMethodId: 'pm1',
      requestedAt: new Date('2024-01-16T09:00:00Z'),
      bankDetails: {
        bankName: 'Standard Bank',
        accountNumber: '9876543210',
        accountType: 'savings',
        accountHolder: 'Test Worker',
        branchCode: '051001'
      }
    },
    {
      id: 'w3',
      userId: 'test-user-123',
      amount: 750,
      currency: 'ZAR',
      status: 'failed',
      paymentMethodId: 'pm1',
      requestedAt: new Date('2024-01-14T09:00:00Z'),
      completedAt: new Date('2024-01-14T10:00:00Z'),
      failureReason: 'Admin rejected: Incorrect bank details',
      bankDetails: {
        bankName: 'ABSA',
        accountNumber: '5555555555',
        accountType: 'cheque',
        accountHolder: 'Test Worker',
        branchCode: '632005'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Successful Data Loading', () => {
    it('should display withdrawal history when data is loaded', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue(mockWithdrawals)

      render(<WithdrawalHistory />)

      // Should show loading state initially
      expect(screen.getByText('Loading withdrawal history...')).toBeInTheDocument()

      // Wait for data to load - wait for one of the amounts to appear
      await waitFor(() => {
        expect(screen.getByText('R500.00')).toBeInTheDocument()
      })

      // Should display all withdrawal amounts
      expect(screen.getByText('R500.00')).toBeInTheDocument()
      expect(screen.getByText('R1000.00')).toBeInTheDocument()
      expect(screen.getByText('R750.00')).toBeInTheDocument()
    })

    it('should display completed withdrawal with admin notes', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue([mockWithdrawals[0]])

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(screen.getByText('Withdrawal Completed')).toBeInTheDocument()
      })

      // Should show admin notes
      expect(screen.getByText(/Approved by admin - virtual deposit/i)).toBeInTheDocument()
    })

    it('should display pending withdrawal with awaiting message', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue([mockWithdrawals[1]])

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(screen.getByText('Awaiting Admin Approval')).toBeInTheDocument()
      })

      expect(screen.getByText(/This usually takes 1-2 business days/i)).toBeInTheDocument()
    })

    it('should display failed withdrawal with reason', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue([mockWithdrawals[2]])

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(screen.getByText('Withdrawal Failed')).toBeInTheDocument()
      })

      expect(screen.getByText(/Incorrect bank details/i)).toBeInTheDocument()
      expect(screen.getByText(/The amount has been refunded to your wallet/i)).toBeInTheDocument()
    })

    it('should display bank details correctly', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue([mockWithdrawals[0]])

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(screen.getByText('FNB')).toBeInTheDocument()
      })

      // Should show masked account number
      expect(screen.getByText(/\*\*\*\*7890/)).toBeInTheDocument()
      expect(screen.getByText('Test Worker')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no withdrawals exist', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue([])

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(screen.getByText('No withdrawals')).toBeInTheDocument()
      })

      expect(screen.getByText(/You haven't made any withdrawal requests yet/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch withdrawal history'
      ;(PaymentService.getUserWithdrawals as jest.Mock).mockRejectedValue(new Error(errorMessage))

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Withdrawals')).toBeInTheDocument()
      })

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('should display helpful error for Firestore index issues', async () => {
      const indexError = new Error('Database index required. Please contact support or check browser console for index creation link.')
      ;(PaymentService.getUserWithdrawals as jest.Mock).mockRejectedValue(indexError)

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(screen.getByText(/Database index required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Service Integration', () => {
    it('should call getUserWithdrawals with correct user ID', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue([])

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(PaymentService.getUserWithdrawals).toHaveBeenCalledWith('test-user-123')
      })
    })

    it('should call getUserWithdrawals on mount', async () => {
      (PaymentService.getUserWithdrawals as jest.Mock).mockResolvedValue([])

      render(<WithdrawalHistory />)

      await waitFor(() => {
        expect(PaymentService.getUserWithdrawals).toHaveBeenCalled()
      })
    })
  })
})
