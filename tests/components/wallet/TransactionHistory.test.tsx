/**
 * TransactionHistory Component Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import TransactionHistory from '@/components/wallet/TransactionHistory'
import { PaymentService } from '@/lib/services/paymentService'
import { PaymentHistory } from '@/types/payment'
import { useAuth } from '@/contexts/AuthContext'
import type { AuthContextType } from '@/contexts/AuthContext'
import type { User } from '@/types/auth'

// Mock dependencies
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

jest.mock('@/lib/services/paymentService', () => ({
  PaymentService: {
    getUserPaymentHistory: jest.fn()
  }
}))

// Helper function to create mock auth context
const createMockAuthContext = (user: User | null = null): AuthContextType => ({
  user,
  isLoading: false,
  isAuthenticated: !!user,
  login: jest.fn().mockResolvedValue({ success: true, message: 'Success' }),
  register: jest.fn().mockResolvedValue({ success: true, message: 'Success' }),
  logout: jest.fn().mockResolvedValue(undefined),
  updateUser: jest.fn().mockResolvedValue(undefined),
  refreshUser: jest.fn().mockResolvedValue(undefined)
})

describe('TransactionHistory Component', () => {
  const mockJobSeeker: User = {
    id: 'user-123',
    email: 'worker@example.com',
    userType: 'job-seeker' as const,
    firstName: 'John',
    lastName: 'Worker',
    phone: '+27123456789',
    location: 'Cape Town',
    createdAt: new Date('2025-01-01') // Updated to a date in the past relative to current context
  }

  const mockEmployer: User = {
    id: 'employer-123',
    email: 'employer@example.com',
    userType: 'employer' as const,
    firstName: 'Jane',
    lastName: 'Employer',
    phone: '+27987654321',
    location: 'Johannesburg',
    createdAt: new Date('2025-01-01') // Updated to a date in the past relative to current context
  }

  const mockTransactions: PaymentHistory[] = [
    {
      id: 'txn-1',
      userId: 'user-123',
      type: 'earnings' as const,
      amount: 1000,
      currency: 'ZAR' as const,
      status: 'completed' as const,
      gigId: 'gig-1',
      description: 'Payment for Plumbing Job',
      createdAt: new Date('2025-10-15T10:00:00') // Updated to recent past
    },
    {
      id: 'txn-2',
      userId: 'user-123',
      type: 'payments' as const,
      amount: -500,
      currency: 'ZAR' as const,
      status: 'completed' as const,
      description: 'Withdrawal to bank account',
      createdAt: new Date('2025-10-10T14:00:00') // Updated to recent past
    },
    {
      id: 'txn-3',
      userId: 'user-123',
      type: 'fees' as const,
      amount: -50,
      currency: 'ZAR' as const,
      status: 'completed' as const,
      description: 'Platform commission',
      createdAt: new Date('2025-10-15T10:01:00') // Updated to recent past
    },
    {
      id: 'txn-4',
      userId: 'user-123',
      type: 'earnings' as const,
      amount: 750,
      currency: 'ZAR' as const,
      status: 'pending' as const,
      gigId: 'gig-2',
      description: 'Payment for Garden Maintenance',
      createdAt: new Date('2025-10-20T09:00:00') // Updated to recent past
    },
    {
      id: 'txn-5',
      userId: 'user-123',
      type: 'refunds' as const,
      amount: 200,
      currency: 'ZAR' as const,
      status: 'completed' as const,
      description: 'Refund for cancelled job',
      createdAt: new Date('2025-10-05T16:00:00') // Updated to recent past
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    // Set up default mock implementation
    mockUseAuth.mockReturnValue(createMockAuthContext(null))
  })

  describe('Access Control', () => {
    it('should show transaction history for job seekers', async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
      })
    })

    it('should show access denied for employers', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockEmployer))

      render(<TransactionHistory />)

      expect(screen.getByText('Transaction History Not Available')).toBeInTheDocument()
      expect(screen.getByText('Transaction history is only available for job seekers.')).toBeInTheDocument()
    })

    it('should return null when no user is logged in', () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null))

      const { container } = render(<TransactionHistory />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
    })

    it('should show loading spinner while fetching transactions', () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const { container } = render(<TransactionHistory />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should hide loading spinner after data loads', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      let container: HTMLElement
      await act(async () => {
        const rendered = render(<TransactionHistory />)
        container = rendered.container
      })

      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })
  })

  describe('Transaction Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
    })

    it('should display all transactions', async () => {
      (PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })
         expect(screen.getByText('Payment for Plumbing Job')).toBeInTheDocument()
         expect(screen.getByText('Withdrawal to bank account')).toBeInTheDocument()
         expect(screen.getByText('Platform commission')).toBeInTheDocument()
         expect(screen.getByText('Payment for Garden Maintenance')).toBeInTheDocument()
         expect(screen.getByText('Refund for cancelled job')).toBeInTheDocument()
       })

    it('should display transaction amounts correctly', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

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

      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        const completedBadges = screen.getAllByText('completed')
        expect(completedBadges.length).toBe(4)

        const pendingBadge = screen.getByText('pending')
        expect(pendingBadge).toBeInTheDocument()
      })
    })

    it('should display transaction type badges', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

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

      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        expect(screen.getByText('No transactions found')).toBeInTheDocument()
        expect(screen.getByText('Start applying for gigs to earn money!')).toBeInTheDocument()
      })
    })
  })

  describe('Summary Statistics', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
    })

    it('should calculate total earnings correctly', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

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

      await act(async () => {
        render(<TransactionHistory />)
      })

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

      await act(async () => {
        render(<TransactionHistory />)
      })

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
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)
    })

    it('should filter transactions by type', async () => {
      await act(async () => {
        render(<TransactionHistory />)
      })

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
      await act(async () => {
        render(<TransactionHistory />)
      })

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
      await act(async () => {
        render(<TransactionHistory />)
      })

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
      await act(async () => {
        render(<TransactionHistory />)
      })

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
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
    })

    const generateMockTransactions = (count: number) => Array.from({ length: count }, (_, i) => ({
      id: `txn-${i}`,
      userId: 'user-123',
      type: 'earnings' as const,
      amount: 100,
      currency: 'ZAR' as const,
      status: 'completed' as const,
      description: `Transaction ${i}`,
      // Generate dates from most recent to oldest
      createdAt: new Date(2025, 9, 30 - i) // October 30 going backwards
    }))

    it('should paginate transactions when there are more than 20', async () => {
      const manyTransactions = generateMockTransactions(25)
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      })
    })

    it('should navigate to next page', async () => {
      const manyTransactions = generateMockTransactions(25)
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

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
      const manyTransactions = generateMockTransactions(25)
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        const prevButton = screen.getByText('← Previous')
        expect(prevButton).toBeDisabled()
      })
    })

    it('should disable next button on last page', async () => {
      const manyTransactions = generateMockTransactions(25)
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(manyTransactions)

      await act(async () => {
        render(<TransactionHistory />)
      })

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
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
      // Suppress console.error output for expected error tests (CI may treat console.error as test failure)
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should display error message when loading fails', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        expect(screen.getByText('Failed to load transaction history')).toBeInTheDocument()
      })
    })

    it('should still show component structure on error', async () => {
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
        expect(screen.getByText('Failed to load transaction history')).toBeInTheDocument()
      })
    })
  })

  describe('Close Functionality', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockJobSeeker))
      ;(PaymentService.getUserPaymentHistory as jest.Mock).mockResolvedValue(mockTransactions)
    })

    it('should call onClose when close button is clicked', async () => {
      const onClose = jest.fn()
      await act(async () => {
        render(<TransactionHistory onClose={onClose} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
      })

      const closeButtons = screen.getAllByText('Close')
      fireEvent.click(closeButtons[0])

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not show close button when onClose is not provided', async () => {
      await act(async () => {
        render(<TransactionHistory />)
      })

      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
      })

      expect(screen.queryByText('Close')).not.toBeInTheDocument()
    })
  })
})
