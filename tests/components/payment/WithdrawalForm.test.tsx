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

    it('should show bank details form', () => {
      renderWithdrawalForm()

      expect(screen.getByText(/Bank Account Details/)).toBeInTheDocument()
      expect(screen.getByText(/We never store your bank details/)).toBeInTheDocument()
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
    const fillBankDetails = () => {
      // Fill in amount
      const amountInput = screen.getByLabelText(/Withdrawal Amount \(ZAR\)/)
      fireEvent.change(amountInput, { target: { value: '500' } })

      // Select bank
      const bankSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(bankSelect, { target: { value: 'ABSA Bank' } })

      // Fill account holder
      const accountHolderInput = screen.getByLabelText(/Account Holder Name/i)
      fireEvent.change(accountHolderInput, { target: { value: 'John Doe' } })

      // Fill account number
      const accountNumberInput = screen.getByLabelText(/Account Number/i)
      fireEvent.change(accountNumberInput, { target: { value: '1234567890' } })

      // Fill branch code
      const branchCodeInput = screen.getByLabelText(/Branch Code/i)
      fireEvent.change(branchCodeInput, { target: { value: '632005' } })
    }

    it('should call requestWithdrawal with bank details on valid submission', async () => {
      mockRequestWithdrawal.mockResolvedValue({ id: 'withdrawal-123' })

      renderWithdrawalForm()
      fillBankDetails()

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockRequestWithdrawal).toHaveBeenCalledWith(
          500,
          expect.objectContaining({
            bankName: 'ABSA Bank',
            accountHolder: 'John Doe',
            accountNumber: '1234567890',
            branchCode: '632005',
            accountType: 'cheque'
          })
        )
      })
    })

    it('should call onSuccess callback after successful submission', async () => {
      const onSuccess = jest.fn()
      mockRequestWithdrawal.mockResolvedValue({ id: 'withdrawal-123' })

      renderWithdrawalForm({ onSuccess })
      fillBankDetails()

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('should handle submission error gracefully', async () => {
      mockRequestWithdrawal.mockRejectedValue(new Error('Insufficient balance'))

      renderWithdrawalForm()
      fillBankDetails()

      const submitButton = screen.getByRole('button', { name: /Request Withdrawal/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
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

  describe('Bank Details Form', () => {
    it('should show all bank details fields', () => {
      renderWithdrawalForm()

      expect(screen.getByText(/Bank Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Account Holder Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Account Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Branch Code/i)).toBeInTheDocument()
      expect(screen.getByText(/Account Type/i)).toBeInTheDocument()
    })

    it('should have bank selection dropdown with SA banks', () => {
      renderWithdrawalForm()

      const bankSelect = screen.getAllByRole('combobox')[0]
      expect(bankSelect).toBeInTheDocument()

      // Check that some major SA banks are listed
      fireEvent.click(bankSelect)
      expect(screen.getByText('ABSA Bank')).toBeInTheDocument()
      expect(screen.getByText('Standard Bank')).toBeInTheDocument()
      expect(screen.getByText('Capitec Bank')).toBeInTheDocument()
    })

    it('should allow selecting account type', () => {
      renderWithdrawalForm()

      const accountTypeSelect = screen.getAllByRole('combobox')[1]
      expect(accountTypeSelect).toBeInTheDocument()

      fireEvent.change(accountTypeSelect, { target: { value: 'savings' } })
      expect((accountTypeSelect as HTMLSelectElement).value).toBe('savings')
    })
  })
})
