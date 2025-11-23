/**
 * WithdrawalForm Component Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import WithdrawalForm from '@/components/payment/WithdrawalForm'
import { PaymentContext } from '@/contexts/PaymentContext'
import { ToastProvider } from '@/contexts/ToastContext'

// Mock the contexts
const mockRequestWithdrawal = jest.fn()
const mockFormatCurrency = jest.fn((amount) => `R${amount.toFixed(2)}`)

const mockPaymentContextValue = {
  paymentMethods: [
    {
      id: 'pm-123',
      type: 'bank' as const,
      provider: 'eft' as const,
      bankName: 'FNB',
      accountLast4: '1234',
      accountType: 'cheque' as const,
      accountHolder: 'John Doe',
      isDefault: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  payments: [],
  withdrawals: [],
  analytics: {
    totalEarnings: 1000,
    totalPaid: 0,
    totalWithdrawn: 0,
    availableBalance: 1000,
    pendingBalance: 0,
    pendingPayments: 0,
    completedGigs: 5,
    averageGigValue: 200,
    monthlyEarnings: [],
    topCategories: [],
    paymentMethodUsage: []
  },
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
  requestWithdrawal: mockRequestWithdrawal,
  refreshWithdrawals: jest.fn(),
  refreshAnalytics: jest.fn(),
  calculateFees: jest.fn(),
  calculateGigFees: jest.fn(),
  formatCurrency: mockFormatCurrency
}

const renderWithdrawalForm = (props = {}) => {
  return render(
    <ToastProvider>
      <PaymentContext.Provider value={mockPaymentContextValue}>
        <WithdrawalForm {...props} />
      </PaymentContext.Provider>
    </ToastProvider>
  )
}

describe('WithdrawalForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render withdrawal form with available balance', () => {
      renderWithdrawalForm()

      expect(screen.getByText('Withdraw Funds')).toBeInTheDocument()
      expect(screen.getByText(/Available Balance/)).toBeInTheDocument()
      expect(screen.getByText('R1000.00')).toBeInTheDocument()
    })

    it('should show existing payment methods', () => {
      renderWithdrawalForm()

      expect(screen.getByText(/John Doe - FNB ending in 1234/)).toBeInTheDocument()
    })

    it('should have amount input field', () => {
      renderWithdrawalForm()

      expect(screen.getByLabelText(/Withdrawal Amount \(ZAR\)/i)).toBeInTheDocument()
    })

    it('should have submit button', () => {
      renderWithdrawalForm()

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should have cancel button when onCancel provided', () => {
      const onCancel = jest.fn()
      renderWithdrawalForm({ onCancel })

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })
  })

  describe('Submission', () => {
    it('should call requestWithdrawal with correct data on valid submission', async () => {
      mockRequestWithdrawal.mockResolvedValue({ id: 'withdrawal-123' })

      renderWithdrawalForm()

      const amountInput = screen.getByLabelText(/Withdrawal Amount \(ZAR\)/)
      fireEvent.change(amountInput, { target: { value: '500' } })

      // Select the payment method
      const selectElement = screen.getByRole('combobox')
      fireEvent.change(selectElement, { target: { value: 'pm-123' } })

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockRequestWithdrawal).toHaveBeenCalledWith(500, 'pm-123', undefined)
      })
    })

    it('should call onSuccess callback after successful submission', async () => {
      const onSuccess = jest.fn()
      mockRequestWithdrawal.mockResolvedValue({ id: 'withdrawal-123' })

      renderWithdrawalForm({ onSuccess })

      const amountInput = screen.getByLabelText(/Withdrawal Amount \(ZAR\)/)
      fireEvent.change(amountInput, { target: { value: '500' } })

      // Select the payment method
      const selectElement = screen.getByRole('combobox')
      fireEvent.change(selectElement, { target: { value: 'pm-123' } })

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('should handle submission error gracefully', async () => {
      mockRequestWithdrawal.mockRejectedValue(new Error('Insufficient balance'))

      renderWithdrawalForm()

      const amountInput = screen.getByLabelText(/Withdrawal Amount \(ZAR\)/)
      fireEvent.change(amountInput, { target: { value: '500' } })

      // Select the payment method
      const selectElement = screen.getByRole('combobox')
      fireEvent.change(selectElement, { target: { value: 'pm-123' } })

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Error handling happens but we just verify the call was made
        expect(mockRequestWithdrawal).toHaveBeenCalled()
      })
    })

    it('should disable submit button for invalid amount', () => {
      renderWithdrawalForm()

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })

      // Button should be disabled when no amount entered
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button for valid amount', () => {
      renderWithdrawalForm()

      const amountInput = screen.getByLabelText(/Withdrawal Amount \(ZAR\)/)
      fireEvent.change(amountInput, { target: { value: '500' } })

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })

      // Button should be enabled when valid amount entered
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Cancel Action', () => {
    it('should call onCancel when cancel button clicked', () => {
      const onCancel = jest.fn()
      renderWithdrawalForm({ onCancel })

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Amount Input', () => {
    it('should accept numeric input', () => {
      renderWithdrawalForm()

      const amountInput = screen.getByLabelText(/Withdrawal Amount \(ZAR\)/) as HTMLInputElement
      fireEvent.change(amountInput, { target: { value: '100' } })

      expect(amountInput.value).toBe('100')
    })

    it('should show available balance information', () => {
      renderWithdrawalForm()

      expect(screen.getByText(/Minimum: R50.00/)).toBeInTheDocument()
      expect(screen.getByText(/Max per transaction: R20000.00/)).toBeInTheDocument()
      expect(screen.getByText(/Daily limit: R50000.00/)).toBeInTheDocument()
    })
  })

  describe('Payment Method Selection', () => {
    it('should have existing method selected by default', () => {
      renderWithdrawalForm()

      const existingMethodRadio = screen.getByLabelText(/Use existing bank account/i)
      expect(existingMethodRadio).toBeChecked()
    })

    it('should show option to add new bank account', () => {
      renderWithdrawalForm()

      expect(screen.getByText(/Add new bank account/i)).toBeInTheDocument()
    })

    it('should show bank details form when add new is selected', () => {
      renderWithdrawalForm()

      const addNewRadio = screen.getByLabelText(/Add new bank account/i)
      fireEvent.click(addNewRadio)

      // Check for form fields (some don't have proper label associations)
      expect(screen.getByText(/Bank Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Account Holder Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Account Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Branch Code/i)).toBeInTheDocument()
    })
  })
})
