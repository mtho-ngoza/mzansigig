/**
 * PaymentDialog Component Tests
 *
 * Tests for the payment dialog including:
 * - Paystack integration (amount with fees)
 * - Fee calculation and display
 * - Payment provider selection
 * - Large amount confirmation flow
 * - Error handling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import PaymentDialog from '@/components/payment/PaymentDialog'
import { PaymentContext } from '@/contexts/PaymentContext'
import { AuthContext } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock window.open
const mockWindowOpen = jest.fn()
window.open = mockWindowOpen

// Mock document.write
const mockDocumentWrite = jest.fn()
const mockDocumentClose = jest.fn()
document.write = mockDocumentWrite
document.close = mockDocumentClose

jest.mock('@/lib/utils/textSanitization', () => ({
  sanitizeForDisplay: jest.fn((text: string) => text)
}))

// Mock paymentValidation to avoid Firebase calls in tests
jest.mock('@/lib/utils/paymentValidation', () => {
  const actual = jest.requireActual('@/lib/utils/paymentValidation')
  return {
    ...actual,
    getPaymentLimits: jest.fn(() => Promise.resolve({
      MIN: 100,
      MAX_SINGLE: 100000,
      LARGE_AMOUNT_THRESHOLD: 10000
    }))
  }
})

// Test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  userType: 'employer' as const,
  phone: '+27123456789',
  location: 'Johannesburg',
  createdAt: new Date()
}

const mockFees = {
  platformFee: 50,
  processingFee: 25,
  fixedFee: 5,
  totalFees: 80,
  netAmount: 420
}

const mockFormatCurrency = (amount: number) => `R${amount.toFixed(2)}`

const createMockPaymentContext = (overrides = {}) => ({
  paymentMethods: [],
  payments: [],
  withdrawals: [],
  analytics: null,
  isLoading: false,
  error: null,
  addPaymentMethod: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
  deletePaymentMethod: jest.fn(),
  refreshPaymentMethods: jest.fn(),
  createPaymentIntent: jest.fn(),
  processPayment: jest.fn(),
  releaseEscrow: jest.fn(),
  createMilestone: jest.fn(),
  updateMilestoneStatus: jest.fn(),
  requestWithdrawal: jest.fn(),
  refreshWithdrawals: jest.fn(),
  refreshAnalytics: jest.fn(),
  calculateFees: jest.fn().mockResolvedValue(mockFees),
  calculateGigFees: jest.fn(),
  formatCurrency: mockFormatCurrency,
  ...overrides
})

const createMockAuthContext = (overrides = {}) => ({
  user: mockUser,
  updateUser: jest.fn(),
  refreshUser: jest.fn(),
  isLoading: false,
  isAuthenticated: true,
  error: null,
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordReset: jest.fn(),
  resetIdleTimer: jest.fn(),
  ...overrides
})

const renderPaymentDialog = (props = {}, contextOverrides = {}, authOverrides = {}) => {
  const defaultProps = {
    gigId: 'gig-123',
    workerId: 'worker-123',
    workerName: 'Jane Worker',
    amount: 500,
    description: 'Test gig payment',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
    isOpen: true
  }

  return render(
    <ToastProvider>
      <AuthContext.Provider value={createMockAuthContext(authOverrides)}>
        <PaymentContext.Provider value={createMockPaymentContext(contextOverrides)}>
          <PaymentDialog {...defaultProps} {...props} />
        </PaymentContext.Provider>
      </AuthContext.Provider>
    </ToastProvider>
  )
}

describe('PaymentDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockWindowOpen.mockReset()
    mockDocumentWrite.mockReset()
  })

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      renderPaymentDialog()
      expect(screen.getAllByText('Payment Amount').length).toBeGreaterThan(0)
    })

    it('should not render when isOpen is false', () => {
      renderPaymentDialog({ isOpen: false })
      expect(screen.queryByText('Payment Amount')).not.toBeInTheDocument()
    })

    it('should display the initial amount', () => {
      renderPaymentDialog({ amount: 500 })
      const input = screen.getByDisplayValue('500')
      expect(input).toBeInTheDocument()
    })

    it('should display worker name in description', () => {
      renderPaymentDialog({ workerName: 'Jane Worker', description: '' })
      expect(screen.getByText(/Jane Worker/)).toBeInTheDocument()
    })
  })

  describe('Fee Calculation and Display', () => {
    it('should calculate and display fees when amount changes', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(calculateFees).toHaveBeenCalledWith(500)
      })

      await waitFor(() => {
        expect(screen.getByText('R50.00')).toBeInTheDocument() // Platform fee
        expect(screen.getByText('R25.00')).toBeInTheDocument() // Processing fee
        expect(screen.getByText('R5.00')).toBeInTheDocument() // Fixed fee
        expect(screen.getByText('R580.00')).toBeInTheDocument() // Total (500 + 80)
      })
    })

    it('should show loading state while calculating fees', async () => {
      const calculateFees = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockFees), 100))
      )
      renderPaymentDialog({}, { calculateFees })

      expect(screen.getByText('Payment Amount:')).toBeInTheDocument()
    })

    it('should display worker receives amount', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('Worker Receives:')).toBeInTheDocument()
        expect(screen.getByText('R420.00')).toBeInTheDocument() // netAmount
      })
    })

    it('should update fees when custom amount is entered', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      const input = screen.getByDisplayValue('500')
      fireEvent.change(input, { target: { value: '1000' } })

      await waitFor(() => {
        expect(calculateFees).toHaveBeenCalledWith(1000)
      })
    })
  })

  describe('Paystack Payment - Amount with Fees (Critical Fix)', () => {
    it('should send total amount including fees to Paystack API', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)

      // Mock fetch to return success but we won't test the redirect
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          authorizationUrl: 'https://checkout.paystack.com/test',
          reference: 'KSG_TEST_123',
          accessCode: 'test_access_code'
        })
      })

      renderPaymentDialog({ amount: 500 }, { calculateFees })

      // Wait for fees to load
      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Navigate to provider selection
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Paystack should be selected by default, proceed to confirm
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Click pay button - this will trigger the API call
      // Note: The actual redirect (window.location.href) is not testable in jsdom
      const payButton = screen.getByRole('button', { name: /Pay R580\.00/i })
      await act(async () => {
        fireEvent.click(payButton)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/payments/paystack/initialize',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'x-user-id': 'user-123'
            }),
            body: expect.any(String)
          })
        )
      }, { timeout: 3000 })

      // Verify the amount sent includes fees (500 base + 80 fees = 580)
      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.amount).toBe(580) // Total amount including fees
      expect(requestBody.gigId).toBe('gig-123')
    })

    it('should navigate to provider selection', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)

      renderPaymentDialog({ amount: 500 }, { calculateFees })

      // Wait for fees to load
      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Navigate to provider selection
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      // The provider selection should be visible
      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
        expect(screen.getByText('Paystack')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Pay Button Disabled State', () => {
    it('should disable Pay button when fees are not loaded', async () => {
      // Never resolve fees
      const calculateFees = jest.fn().mockImplementation(() => new Promise(() => {}))

      renderPaymentDialog({}, { calculateFees })

      // Navigate to provider selection
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Navigate to confirm
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Pay button should show "Calculating..." and be disabled
      const payButton = screen.getByRole('button', { name: /Calculating/i })
      expect(payButton).toBeDisabled()
    })

    it('should enable Pay button when fees are loaded', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)

      renderPaymentDialog({}, { calculateFees })

      // Wait for fees
      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Navigate through steps
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Pay button should be enabled and show correct amount
      const payButton = screen.getByRole('button', { name: /Pay R580\.00/i })
      expect(payButton).not.toBeDisabled()
    })
  })

  describe('Payment Provider Selection', () => {
    it('should show available payment providers', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Paystack')).toBeInTheDocument()
        expect(screen.getByText('Ozow')).toBeInTheDocument()
        expect(screen.getByText('Yoco')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should mark unavailable providers as coming soon', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        const comingSoonBadges = screen.getAllByText('Coming Soon')
        expect(comingSoonBadges.length).toBe(2) // Ozow and Yoco
      }, { timeout: 3000 })
    })

    it('should default to Paystack provider', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        // Paystack should be selected (has checkmark)
        expect(screen.getByText('✓')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show payment provider in confirm step', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        // In confirm step, shows "Payment Provider" header with selected provider details
        expect(screen.getByText('Payment Provider')).toBeInTheDocument()
        expect(screen.getByText('Paystack')).toBeInTheDocument()
        expect(screen.getByText('Credit/Debit Card, Bank Transfer, EFT')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show trust message about secure payment', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Secure Payment')).toBeInTheDocument()
        expect(screen.getByText(/We never store your card or bank details/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Large Amount Confirmation', () => {
    it('should show large amount confirmation for amounts >= R10,000', async () => {
      const largeFees = { ...mockFees, totalFees: 800, netAmount: 9200 }
      const calculateFees = jest.fn().mockResolvedValue(largeFees)

      renderPaymentDialog({ amount: 10000 }, { calculateFees })

      await waitFor(() => {
        expect(calculateFees).toHaveBeenCalledWith(10000)
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Large Payment Amount')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should allow confirming large amount and proceeding', async () => {
      const largeFees = { ...mockFees, totalFees: 800, netAmount: 9200 }
      const calculateFees = jest.fn().mockResolvedValue(largeFees)

      renderPaymentDialog({ amount: 10000 }, { calculateFees })

      await waitFor(() => {
        expect(calculateFees).toHaveBeenCalledWith(10000)
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Large Payment Amount')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Confirm large amount
      await act(async () => {
        fireEvent.click(screen.getByText('Confirm & Continue'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should not show large amount confirmation for amounts < R10,000', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)

      renderPaymentDialog({ amount: 5000 }, { calculateFees })

      await waitFor(() => {
        expect(calculateFees).toHaveBeenCalledWith(5000)
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        // Should go directly to provider selection
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
        expect(screen.queryByText('Large Payment Amount')).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Payment Type Selection', () => {
    it('should allow selecting different payment types', async () => {
      renderPaymentDialog()

      const milestoneButton = screen.getByText('Milestone')
      fireEvent.click(milestoneButton)

      expect(milestoneButton.closest('button')).toHaveClass('border-secondary-500')
    })

    it('should default to fixed payment type', () => {
      renderPaymentDialog()

      const fixedButton = screen.getByText('Fixed Payment')
      expect(fixedButton.closest('button')).toHaveClass('border-secondary-500')
    })
  })

  describe('Error Handling', () => {
    it('should handle Paystack API error gracefully', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Payment creation failed' })
      })

      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Navigate to confirm
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })
      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Try to pay
      const payButton = screen.getByRole('button', { name: /Pay R580\.00/i })
      await act(async () => {
        fireEvent.click(payButton)
      })

      // Should return to confirm step after error
      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show error when user is not authenticated', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)

      renderPaymentDialog({}, { calculateFees }, { user: null })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Navigate to confirm
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })
      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Try to pay without auth
      const payButton = screen.getByRole('button', { name: /Pay R580\.00/i })
      await act(async () => {
        fireEvent.click(payButton)
      })

      // Should return to confirm step
      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Navigation', () => {
    it('should allow navigating back from provider selection', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Back'))
      })

      await waitFor(() => {
        expect(screen.getAllByText('Payment Amount').length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })

    it('should allow navigating back from confirm step', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Go to confirm
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })
      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Payment Summary')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Go back
      await act(async () => {
        fireEvent.click(screen.getByText('Back'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn()
      renderPaymentDialog({ onCancel })

      fireEvent.click(screen.getByText('Cancel'))

      expect(onCancel).toHaveBeenCalled()
    })

    it('should call onCancel when X button is clicked', () => {
      const onCancel = jest.fn()
      renderPaymentDialog({ onCancel })

      fireEvent.click(screen.getByText('×'))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Progress Indicator', () => {
    it('should show progress for amount step', () => {
      renderPaymentDialog()

      // First step should be highlighted
      const progressBars = document.querySelectorAll('.h-2.flex-1.rounded-full')
      expect(progressBars[0]).toHaveClass('bg-secondary-500')
    })

    it('should update progress as user advances', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Progress should show provider step
      const progressBars = document.querySelectorAll('.h-2.flex-1.rounded-full')
      expect(progressBars[0]).toHaveClass('bg-green-500') // Completed
      expect(progressBars[1]).toHaveClass('bg-secondary-500') // Current
    })
  })

  describe('Escrow Notice', () => {
    it('should display escrow protection notice on confirm step', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({}, { calculateFees })

      await waitFor(() => {
        expect(screen.getByText('R580.00')).toBeInTheDocument()
      }, { timeout: 3000 })

      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })
      await waitFor(() => {
        expect(screen.getByText('Select Payment Provider')).toBeInTheDocument()
      }, { timeout: 3000 })
      await act(async () => {
        fireEvent.click(screen.getByText('Next'))
      })

      await waitFor(() => {
        expect(screen.getByText('Secure Escrow Payment')).toBeInTheDocument()
        expect(screen.getByText(/held in secure escrow/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Custom Amount Input', () => {
    it('should allow entering a custom amount', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({ amount: 500 }, { calculateFees })

      const input = screen.getByDisplayValue('500')
      await act(async () => {
        fireEvent.change(input, { target: { value: '750' } })
      })

      expect(screen.getByDisplayValue('750')).toBeInTheDocument()
    })

    it('should recalculate fees when amount changes', async () => {
      const calculateFees = jest.fn().mockResolvedValue(mockFees)
      renderPaymentDialog({ amount: 500 }, { calculateFees })

      await waitFor(() => {
        expect(calculateFees).toHaveBeenCalledWith(500)
      }, { timeout: 3000 })

      const input = screen.getByDisplayValue('500')
      await act(async () => {
        fireEvent.change(input, { target: { value: '1000' } })
      })

      await waitFor(() => {
        expect(calculateFees).toHaveBeenCalledWith(1000)
      }, { timeout: 3000 })
    })
  })
})
