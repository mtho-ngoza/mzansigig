import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPresets, FILTER_PRESETS } from '@/components/gig/FilterPresets'

describe('FilterPresets', () => {
  const mockOnApplyPreset = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all filter presets', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    expect(screen.getByText('Quick Filters')).toBeInTheDocument()
    expect(screen.getByText('Quick Work')).toBeInTheDocument()
    expect(screen.getByText('High Value')).toBeInTheDocument()
    expect(screen.getByText('Remote Only')).toBeInTheDocument()
    expect(screen.getByText('Best Chance')).toBeInTheDocument()
  })

  it('should display preset descriptions', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    expect(screen.getByText('Urgent gigs nearby')).toBeInTheDocument()
    expect(screen.getByText('Budget over R5,000')).toBeInTheDocument()
    expect(screen.getByText('Work from anywhere')).toBeInTheDocument()
    expect(screen.getByText('Fewer applicants')).toBeInTheDocument()
  })

  it('should display preset icons', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    expect(screen.getByText('⚡')).toBeInTheDocument()
    expect(screen.getByText('💎')).toBeInTheDocument()
    expect(screen.getByText('🏠')).toBeInTheDocument()
    expect(screen.getByText('🎯')).toBeInTheDocument()
  })

  it('should call onApplyPreset when Quick Work preset is clicked', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    const quickWorkButton = screen.getByText('Quick Work').closest('button')
    fireEvent.click(quickWorkButton!)

    expect(mockOnApplyPreset).toHaveBeenCalledWith({
      urgency: 'urgent',
      durations: ['1-3 days'],
      showNearbyOnly: true
    })
  })

  it('should call onApplyPreset when High Value preset is clicked', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    const highValueButton = screen.getByText('High Value').closest('button')
    fireEvent.click(highValueButton!)

    expect(mockOnApplyPreset).toHaveBeenCalledWith({
      budgetMin: 5000,
      budgetMax: undefined
    })
  })

  it('should call onApplyPreset when Remote Only preset is clicked', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    const remoteButton = screen.getByText('Remote Only').closest('button')
    fireEvent.click(remoteButton!)

    expect(mockOnApplyPreset).toHaveBeenCalledWith({
      workType: 'remote'
    })
  })

  it('should call onApplyPreset when Best Chance preset is clicked', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    const bestChanceButton = screen.getByText('Best Chance').closest('button')
    fireEvent.click(bestChanceButton!)

    expect(mockOnApplyPreset).toHaveBeenCalledWith({})
  })

  it('should render presets in a grid layout', () => {
    const { container } = render(
      <FilterPresets onApplyPreset={mockOnApplyPreset} />
    )

    const gridContainer = container.querySelector('.grid.grid-cols-2')
    expect(gridContainer).toBeInTheDocument()
  })

  it('should have correct number of presets', () => {
    render(<FilterPresets onApplyPreset={mockOnApplyPreset} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(FILTER_PRESETS.length)
  })

  it('should apply hover styles to preset buttons', () => {
    const { container } = render(
      <FilterPresets onApplyPreset={mockOnApplyPreset} />
    )

    const firstButton = container.querySelector('button')
    expect(firstButton).toHaveClass('hover:border-primary-500')
    expect(firstButton).toHaveClass('hover:bg-primary-50')
  })
})
