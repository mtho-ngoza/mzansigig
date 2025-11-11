import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPanel } from '@/components/gig/FilterPanel'
import { DEFAULT_FILTERS } from '@/types/filters'

describe('FilterPanel', () => {
  const mockOnFiltersChange = jest.fn()
  const mockOnClearFilters = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render filter panel with all sections', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Budget Range')).toBeInTheDocument()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('Work Type')).toBeInTheDocument()
    expect(screen.getByText('Urgency')).toBeInTheDocument()
  })

  it('should display result count when provided', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        resultCount={42}
      />
    )

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText(/gigs found/)).toBeInTheDocument()
  })

  it('should show clear all button when filters are active', () => {
    const filtersWithBudget = {
      ...DEFAULT_FILTERS,
      budgetMin: 500,
      budgetMax: 1000
    }

    render(
      <FilterPanel
        filters={filtersWithBudget}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    const clearButton = screen.getByText('Clear All')
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)
    expect(mockOnClearFilters).toHaveBeenCalledTimes(1)
  })

  it('should call onFiltersChange when budget range is selected', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    const budgetOption = screen.getByLabelText('R500 - R1,000')
    fireEvent.click(budgetOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      budgetMin: 500,
      budgetMax: 1000
    })
  })

  it('should call onFiltersChange when duration is toggled', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    const durationOption = screen.getByLabelText('1 week')
    fireEvent.click(durationOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      durations: ['1 week']
    })
  })

  it('should call onFiltersChange when work type is selected', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    const remoteOption = screen.getByLabelText(/Remote Only/)
    fireEvent.click(remoteOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      workType: 'remote'
    })
  })

  it('should call onFiltersChange when urgency is selected', () => {
    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    const urgentOption = screen.getByLabelText(/Urgent/)
    fireEvent.click(urgentOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      urgency: 'urgent'
    })
  })

  it('should be closeable on mobile when onClose is provided', () => {
    const mockOnClose = jest.fn()

    render(
      <FilterPanel
        filters={DEFAULT_FILTERS}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        onClose={mockOnClose}
      />
    )

    const closeButton = screen.getByRole('button', { name: '' })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple duration selections', () => {
    const filtersWithDurations = {
      ...DEFAULT_FILTERS,
      durations: ['1 week']
    }

    const { rerender } = render(
      <FilterPanel
        filters={filtersWithDurations}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Add another duration
    const monthOption = screen.getByLabelText('1 month')
    fireEvent.click(monthOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      durations: ['1 week', '1 month']
    })

    // Update filters
    rerender(
      <FilterPanel
        filters={{
          ...filtersWithDurations,
          durations: ['1 week', '1 month']
        }}
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    )

    // Remove a duration
    const weekOption = screen.getByLabelText('1 week')
    fireEvent.click(weekOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      durations: ['1 month']
    })
  })
})
