/**
 * PaymentInfoBadge Component Tests
 * Tests for payment information badge component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import PaymentInfoBadge from '@/components/gig/PaymentInfoBadge'

describe('PaymentInfoBadge', () => {
  describe('Rendering', () => {
    it('should render payment information text', () => {
      render(<PaymentInfoBadge />)

      expect(screen.getByText('Payment after selection')).toBeInTheDocument()
    })

    it('should render with info variant by default', () => {
      const { container } = render(<PaymentInfoBadge />)

      const badge = container.querySelector('.bg-blue-50')
      expect(badge).toBeInTheDocument()
    })

    it('should render with warning variant when specified', () => {
      const { container } = render(<PaymentInfoBadge variant="warning" />)

      const badge = container.querySelector('.bg-yellow-50')
      expect(badge).toBeInTheDocument()
    })

    it('should render with success variant when specified', () => {
      const { container } = render(<PaymentInfoBadge variant="success" />)

      const badge = container.querySelector('.bg-green-50')
      expect(badge).toBeInTheDocument()
    })

    it('should render with small size by default', () => {
      const { container } = render(<PaymentInfoBadge />)

      const badge = container.querySelector('.text-xs')
      expect(badge).toBeInTheDocument()
    })

    it('should render with medium size when specified', () => {
      const { container } = render(<PaymentInfoBadge size="md" />)

      const badge = container.querySelector('.text-sm')
      expect(badge).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = render(<PaymentInfoBadge className="custom-class" />)

      const badge = container.querySelector('.custom-class')
      expect(badge).toBeInTheDocument()
    })

    it('should have appropriate title/tooltip', () => {
      const { container } = render(<PaymentInfoBadge />)

      const badge = container.querySelector('[title]')
      expect(badge).toHaveAttribute('title', "Payment is secured in escrow after you're selected for the gig")
    })

    it('should render money icon', () => {
      const { container } = render(<PaymentInfoBadge />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('w-3.5', 'h-3.5')
    })
  })

  describe('Accessibility', () => {
    it('should provide tooltip information', () => {
      const { container } = render(<PaymentInfoBadge />)

      const badge = container.querySelector('[title]')
      expect(badge?.getAttribute('title')).toBeTruthy()
    })

    it('should use semantic HTML structure', () => {
      const { container } = render(<PaymentInfoBadge />)

      // Should be a div with proper structure
      const badge = container.firstChild
      expect(badge).toBeInTheDocument()
      expect(badge?.nodeName).toBe('DIV')
    })
  })
})
