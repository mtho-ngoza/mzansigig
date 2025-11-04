/**
 * TransactionHistory Component Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TransactionHistory from '@/components/wallet/TransactionHistory'
import { PaymentService } from '@/lib/services/paymentService'
import { PaymentHistory } from '@/types/payment'
import { useAuth } from '@/contexts/AuthContext'

// Mock dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

jest.mock('@/lib/services/paymentService', () => ({
  PaymentService: {
    getUserPaymentHistory: jest.fn()
  }
}))

describe('TransactionHistory Component', () => {
  const mockJobSeeker = {
    id: 'user-123',
    email: 'worker@example.com',
    userType: 'job-seeker',
    firstName: 'John',
    lastName: 'Worker'
  }

  const mockEmployer = {
    id: 'employer-123',
    email: 'employer@example.com',
    userType: 'employer',
    firstName: 'Jane',
    lastName: 'Employer'
  }

  const mockTransactions: PaymentHistory[] = [
    {
      id: 'txn-1',
      userId: 'user-123',
      type: 'earnings',
      amount: 1000,
      currency: 'ZAR',
      status: 'completed',
      gigId: 'gig-1',
      description: 'Payment for Plumbing Job',
      createdAt: new Date('2024-01-15T10:00:00')
    },
    {
      id: 'txn-2',
      userId: 'user-123',
      type: 'payments',
      amount: -500,
      currency: 'ZAR',
      status: 'completed',
      description: 'Withdrawal to bank account',
      createdAt: new Date('2024-01-10T14:00:00')
    },
    {
      id: 'txn-3',
      userId: 'user-123',
      type: 'fees',
      amount: -50,
      currency: 'ZAR',
      status: 'completed',
      description: 'Platform commission',
      createdAt: new Date('2024-01-15T10:01:00')
    },
    {
      id: 'txn-4',
      userId: 'user-123',
      type: 'earnings',
      amount: 750,
      currency: 'ZAR',
      status: 'pending',
      gigId: 'gig-2',
      description: 'Payment for Garden Maintenance',
      createdAt: new Date('2024-01-20T09:00:00')
    },
    {
      id: 'txn-5',
      userId: 'user-123',
      type: 'refunds',
      amount: 200,
      currency: 'ZAR',
      status: 'completed',
      description: 'Refund for cancelled job',
      createdAt: new Date('2024-01-05T16:00:00')
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Access Control', () => {
    it('should show transaction history for job seekers', async () => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
      })
    })

    it('should show access denied for employers', () => {
      useAuth.mockReturnValue({ user: mockEmployer })

      render(<TransactionHistory />)

      expect(screen.getByText('Transaction History Not Available')).toBeInTheDocument()
      expect(screen.getByText('Transaction history is only available for job seekers.')).toBeInTheDocument()
    })

    it('should return null when no user is logged in', () => {
      useAuth.mockReturnValue({ user: null })

      const { container } = render(<TransactionHistory />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner while fetching transactions', () => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const { container } = render(<TransactionHistory />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should hide loading spinner after data loads', async () => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      const { container } = render(<TransactionHistory />)

      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })
  })

  describe('Transaction Display', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
    })

    it('should display all transactions', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
        expect(screen.getByText('Withdrawal to bank account')).toBeInTheDocument()
        expect(screen.getByText('Platform commission')).toBeInTheDocument()
        expect(screen.getByText('Payment for Garden Maintenance')).toBeInTheDocument()
        expect(screen.getByText('Refund for cancelled job')).toBeInTheDocument()
      })
    })

    it('should display transaction amounts correctly', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
      })

      // Check for specific amounts - the positive one is green and has a plus sign
      expect(screen.getByText(/\+R1000\.00/)).toBeInTheDocument()
      // Withdrawals and fees show as absolute values (without minus sign in display)
      // These amounts appear in both summary and transaction list, so use getAllByText
      const amounts500 = screen.getAllByText(/R500\.00/)
      expect(amounts500.length).toBeGreaterThan(0)

      const amounts50 = screen.getAllByText(/R50\.00/)
      expect(amounts50.length).toBeGreaterThan(0)
    })

    it('should display transaction status badges', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        const completedBadges = screen.getAllByText('completed')
        expect(completedBadges.length).toBe(4)

        const pendingBadge = screen.getByText('pending')
        expect(pendingBadge).toBeInTheDocument()
      })
    })

    it('should display transaction type badges', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        const earningsBadges = screen.getAllByText('earnings')
        expect(earningsBadges.length).toBe(2)

        expect(screen.getByText('payments')).toBeInTheDocument()
        expect(screen.getByText('fees')).toBeInTheDocument()
        expect(screen.getByText('refunds')).toBeInTheDocument()
      })
    })

    it('should show empty state when no transactions exist', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue([])

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('No transactions found')).toBeInTheDocument()
        expect(screen.getByText('Start applying for gigs to earn money!')).toBeInTheDocument()
      })
    })
  })

  describe('Summary Statistics', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
    })

    it('should calculate total earnings correctly', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Total Earnings')).toBeInTheDocument()
      })

      // Find the parent container that includes both label and amount
      const earningsLabel = screen.getByText('Total Earnings')
      const earningsCard = earningsLabel.closest('.bg-green-50')
      expect(earningsCard).toHaveTextContent('Total Earnings')
      expect(earningsCard).toHaveTextContent('R1000.00')
    })

    it('should calculate total withdrawals correctly', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Total Withdrawals')).toBeInTheDocument()
      })

      // Find the parent container that includes both label and amount
      const withdrawalsLabel = screen.getByText('Total Withdrawals')
      const withdrawalsCard = withdrawalsLabel.closest('.bg-blue-50')
      expect(withdrawalsCard).toHaveTextContent('Total Withdrawals')
      expect(withdrawalsCard).toHaveTextContent('R500.00')
    })

    it('should calculate total fees correctly', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Total Fees')).toBeInTheDocument()
      })

      // Find the parent container that includes both label and amount
      const feesLabel = screen.getByText('Total Fees')
      const feesCard = feesLabel.closest('.bg-orange-50')
      expect(feesCard).toHaveTextContent('Total Fees')
      expect(feesCard).toHaveTextContent('R50.00')
    })
  })

  describe('Filtering', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)
    })

    it('should filter transactions by type', async () => {
      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
      })

      const typeFilter = screen.getByLabelText('Transaction Type')
      fireEvent.change(typeFilter, { target: { value: 'earnings' } })

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
        expect(screen.getByText('Payment for Garden Maintenance')).toBeInTheDocument()
        expect(screen.queryByText('Withdrawal to bank account')).not.toBeInTheDocument()
      })
    })

    it('should filter transactions by status', async () => {
      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
      })

      const statusFilter = screen.getByLabelText('Status')
      fireEvent.change(statusFilter, { target: { value: 'pending' } })

      await waitFor(() => {
        expect(screen.getByText('Payment for Garden Maintenance')).toBeInTheDocument()
        expect(screen.queryByText('Payment for Plumbing Job')).not.toBeInTheDocument()
      })
    })

    it('should filter transactions by search term', async () => {
      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
      })

      const searchInput = screen.getByLabelText('Search Transactions')
      fireEvent.change(searchInput, { target: { value: 'plumbing' } })

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
        expect(screen.queryByText('Payment for Garden Maintenance')).not.toBeInTheDocument()
        expect(screen.queryByText('Withdrawal to bank account')).not.toBeInTheDocument()
      })
    })

    it('should clear all filters when clicking clear button', async () => {
      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
      })

      // Apply filters
      const typeFilter = screen.getByLabelText('Transaction Type')
      fireEvent.change(typeFilter, { target: { value: 'earnings' } })

      const statusFilter = screen.getByLabelText('Status')
      fireEvent.change(statusFilter, { target: { value: 'completed' } })

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 transaction/)).toBeInTheDocument()
      })

      // Clear filters
      const clearButton = screen.getByText('Clear filters')
      fireEvent.click(clearButton)

      await waitFor(() => {
        expect(screen.getByText(/Showing 5 transactions/)).toBeInTheDocument()
      })
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
    })

    it('should paginate transactions when there are more than 20', async () => {
      const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: `txn-${i}`,
        userId: 'user-123',
        type: 'earnings' as const,
        amount: 100,
        currency: 'ZAR' as const,
        status: 'completed' as const,
        description: `Transaction ${i}`,
        createdAt: new Date()
      }))

      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      })
    })

    it('should navigate to next page', async () => {
      const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: `txn-${i}`,
        userId: 'user-123',
        type: 'earnings' as const,
        amount: 100,
        currency: 'ZAR' as const,
        status: 'completed' as const,
        description: `Transaction ${i}`,
        createdAt: new Date()
      }))

      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      })

      const nextButton = screen.getByText('Next →')
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
      })
    })

    it('should disable previous button on first page', async () => {
      const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: `txn-${i}`,
        userId: 'user-123',
        type: 'earnings' as const,
        amount: 100,
        currency: 'ZAR' as const,
        status: 'completed' as const,
        description: `Transaction ${i}`,
        createdAt: new Date()
      }))

      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      render(<TransactionHistory />)

      await waitFor(() => {
        const prevButton = screen.getByText('← Previous')
        expect(prevButton).toBeDisabled()
      })
    })

    it('should disable next button on last page', async () => {
      const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: `txn-${i}`,
        userId: 'user-123',
        type: 'earnings' as const,
        amount: 100,
        currency: 'ZAR' as const,
        status: 'completed' as const,
        description: `Transaction ${i}`,
        createdAt: new Date()
      }))

      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      render(<TransactionHistory />)

      // Navigate to page 2
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      })

      const nextButton = screen.getByText('Next →')
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
      })

      // Check that next button is disabled
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
    })

    it('should display error message when loading fails', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load transaction history')).toBeInTheDocument()
      })
    })

    it('should still show component structure on error', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
        expect(screen.getByText('Failed to load transaction history')).toBeInTheDocument()
      })
    })
  })

  describe('Close Functionality', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: mockJobSeeker })
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)
    })

    it('should call onClose when close button is clicked', async () => {
      const onClose = jest.fn()
      render(<TransactionHistory onClose={onClose} />)

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
      })

      const closeButtons = screen.getAllByText('Close')
      fireEvent.click(closeButtons[0])

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not show close button when onClose is not provided', async () => {
      render(<TransactionHistory />)

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
      })

      expect(screen.queryByText('Close')).not.toBeInTheDocument()
    })
  })
})
