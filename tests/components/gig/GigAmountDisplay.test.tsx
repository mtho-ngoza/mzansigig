/**
 * GigAmountDisplay Tests
 *
 * Tests for the GigAmountDisplay component that shows worker earnings after fees.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'

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
  // Simplified TradeSafe fee model: 10% commission
  const mockFeeBreakdown = {
    gigAmount: 294,
    platformCommission: 29.4,  // 10% of 294
    workerEarnings: 264.6      // 90% of 294
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
        expect(screen.getByText('R264.60')).toBeInTheDocument()
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
        expect(screen.getByText('Service Fee (10%):')).toBeInTheDocument()
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
        expect(screen.getByText('Service Fee (10%):')).toBeInTheDocument()
        expect(screen.getByText('-R29.40')).toBeInTheDocument()
      })
    })

    it('should not show breakdown toggle when showBreakdown is false', async () => {
      render(<GigAmountDisplay budget={294} variant="compact" showBreakdown={false} />)

      await waitFor(() => {
        expect(screen.getByText('R264.60')).toBeInTheDocument()
      })

      expect(screen.queryByText('Show breakdown')).not.toBeInTheDocument()
    })
  })

  describe('detailed variant', () => {
    it('should display worker earnings section', async () => {
      render(<GigAmountDisplay budget={294} variant="detailed" />)

      await waitFor(() => {
        expect(screen.getByText('Worker Earnings')).toBeInTheDocument()
        const earningsValues = screen.getAllByText('R264.60')
        expect(earningsValues.length).toBeGreaterThan(0)
      })
    })

    it('should display project budget', async () => {
      render(<GigAmountDisplay budget={294} variant="detailed" />)

      await waitFor(() => {
        expect(screen.getByText('Project Budget')).toBeInTheDocument()
      })
    })

    it('should display employer payment section with TradeSafe message', async () => {
      render(<GigAmountDisplay budget={294} variant="detailed" />)

      await waitFor(() => {
        expect(screen.getByText('Employer Payment')).toBeInTheDocument()
        expect(screen.getByText('Total Payment:')).toBeInTheDocument()
        expect(screen.getByText(/No additional fees.*TradeSafe/)).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('should show loading skeleton while fetching fees', async () => {
      mockCalculateGigFees.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(mockFeeBreakdown), 100)
      }))

      render(<GigAmountDisplay budget={294} variant="compact" />)

      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should fallback to budget display when fee calculation fails', async () => {
      mockCalculateGigFees.mockRejectedValue(new Error('Failed to calculate fees'))

      render(<GigAmountDisplay budget={294} variant="compact" />)

      await waitFor(() => {
        expect(screen.getByText('R294.00')).toBeInTheDocument()
      })
    })
  })

  describe('different commission rates', () => {
    it('should display correct earnings for 15% commission', async () => {
      const fifteenPercentFees = {
        gigAmount: 294,
        platformCommission: 44.1,  // 15%
        workerEarnings: 249.9      // 85%
      }
      mockCalculateGigFees.mockResolvedValue(fifteenPercentFees)

      render(<GigAmountDisplay budget={294} variant="compact" showBreakdown={true} />)

      await waitFor(() => {
        expect(screen.getByText('R249.90')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Show breakdown'))

      await waitFor(() => {
        expect(screen.getByText('Service Fee (15%):')).toBeInTheDocument()
      })
    })
  })
})
