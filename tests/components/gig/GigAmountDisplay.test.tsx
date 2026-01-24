/**
 * GigAmountDisplay Tests
 *
 * Tests for the GigAmountDisplay component that shows worker earnings after fees.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'
import { PaymentProvider } from '@/contexts/PaymentContext'

// Mock the PaymentContext
const mockCalculateGigFees = jest.fn()
const mockFormatCurrency = jest.fn((amount: number) => `R${amount.toFixed(2)}`)

jest.mock('@/contexts/PaymentContext', () => ({
  ...jest.requireActual('@/contexts/PaymentContext'),
  usePayment: () => ({
    calculateGigFees: mockCalculateGigFees,
    formatCurrency: mockFormatCurrency
  })
}))

describe('GigAmountDisplay', () => {
  const mockFeeBreakdown = {
    grossAmount: 294,
    platformFee: 2.94,
    processingFee: 2.94,
    fixedFee: 2.48,
    workerCommission: 5.88,
    totalEmployerFees: 8.36,
    totalWorkerDeductions: 5.88,
    netAmountToWorker: 288.12,
    totalEmployerCost: 302.36
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCalculateGigFees.mockResolvedValue(mockFeeBreakdown)
  })

  describe('compact variant', () => {
    it('should display net earnings amount', async () => {
      render(<GigAmountDisplay budget={294} variant="compact" />)

      await waitFor(() => {
        expect(screen.getByText("You'll earn:")).toBeInTheDocument()
        expect(screen.getByText('R288.12')).toBeInTheDocument()
      })
    })

    it('should show breakdown toggle when showBreakdown is true', async () => {
      render(<GigAmountDisplay budget={294} variant="compact" showBreakdown={true} />)

      await waitFor(() => {
        expect(screen.getByText('(from R294.00 budget)')).toBeInTheDocument()
        expect(screen.getByText('Show breakdown')).toBeInTheDocument()
      })
    })

    it('should toggle breakdown details when clicked', async () => {
      render(<GigAmountDisplay budget={294} variant="compact" showBreakdown={true} />)

      await waitFor(() => {
        expect(screen.getByText('Show breakdown')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Show breakdown'))

      await waitFor(() => {
        expect(screen.getByText('Project Budget:')).toBeInTheDocument()
        expect(screen.getByText('Service Fee (2%):')).toBeInTheDocument()
        expect(screen.getByText('Your Earnings:')).toBeInTheDocument()
        expect(screen.getByText('Hide breakdown')).toBeInTheDocument()
      })
    })

    it('should display correct service fee percentage', async () => {
      render(<GigAmountDisplay budget={294} variant="compact" showBreakdown={true} />)

      await waitFor(() => {
        expect(screen.getByText('Show breakdown')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Show breakdown'))

      await waitFor(() => {
        // 5.88 / 294 * 100 = 2%
        expect(screen.getByText('Service Fee (2%):')).toBeInTheDocument()
        expect(screen.getByText('-R5.88')).toBeInTheDocument()
      })
    })

    it('should not show breakdown toggle when showBreakdown is false', async () => {
      render(<GigAmountDisplay budget={294} variant="compact" showBreakdown={false} />)

      await waitFor(() => {
        expect(screen.getByText('R288.12')).toBeInTheDocument()
      })

      expect(screen.queryByText('Show breakdown')).not.toBeInTheDocument()
    })
  })

  describe('detailed variant', () => {
    it('should display worker earnings section', async () => {
      render(<GigAmountDisplay budget={294} variant="detailed" />)

      await waitFor(() => {
        expect(screen.getByText('Worker Earnings')).toBeInTheDocument()
        // Multiple R288.12 values exist in detailed view
        const earningsValues = screen.getAllByText('R288.12')
        expect(earningsValues.length).toBeGreaterThan(0)
      })
    })

    it('should display project budget', async () => {
      render(<GigAmountDisplay budget={294} variant="detailed" />)

      await waitFor(() => {
        expect(screen.getByText('Project Budget')).toBeInTheDocument()
      })
    })

    it('should display employer cost breakdown', async () => {
      render(<GigAmountDisplay budget={294} variant="detailed" />)

      await waitFor(() => {
        expect(screen.getByText('Cost Breakdown for Employer')).toBeInTheDocument()
        expect(screen.getByText('Platform Fee:')).toBeInTheDocument()
        expect(screen.getByText('Processing Fee:')).toBeInTheDocument()
        expect(screen.getByText('Transaction Fee:')).toBeInTheDocument()
        expect(screen.getByText('Total Employer Cost:')).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('should show loading skeleton while fetching fees', async () => {
      // Make the mock take longer to resolve
      mockCalculateGigFees.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(mockFeeBreakdown), 100)
      }))

      render(<GigAmountDisplay budget={294} variant="compact" />)

      // Should show loading skeleton initially
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should fallback to budget display when fee calculation fails', async () => {
      mockCalculateGigFees.mockRejectedValue(new Error('Failed to calculate fees'))

      render(<GigAmountDisplay budget={294} variant="compact" />)

      await waitFor(() => {
        // Should show the raw budget as fallback
        expect(screen.getByText('R294.00')).toBeInTheDocument()
      })
    })
  })

  describe('different commission rates', () => {
    it('should display correct earnings for 10% commission', async () => {
      const tenPercentFees = {
        ...mockFeeBreakdown,
        workerCommission: 29.4,
        totalWorkerDeductions: 29.4,
        netAmountToWorker: 264.6
      }
      mockCalculateGigFees.mockResolvedValue(tenPercentFees)

      render(<GigAmountDisplay budget={294} variant="compact" showBreakdown={true} />)

      await waitFor(() => {
        expect(screen.getByText('R264.60')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Show breakdown'))

      await waitFor(() => {
        expect(screen.getByText('Service Fee (10%):')).toBeInTheDocument()
      })
    })
  })
})
