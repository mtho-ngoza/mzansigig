import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveFilters } from '@/components/gig/ActiveFilters'
import { DEFAULT_FILTERS } from '@/types/filters'

describe('ActiveFilters', () => {
  const mockOnRemoveFilter = jest.fn()
  const mockOnClearAll = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when no active filters', () => {
    const { container } = render(
      <ActiveFilters
        filters={DEFAULT_FILTERS}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should display budget filter chip', () => {
    const filtersWithBudget = {
      ...DEFAULT_FILTERS,
      budgetMin: 500,
      budgetMax: 1000
    }

    render(
      <ActiveFilters
        filters={filtersWithBudget}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText(/Budget: R500 - R1000/)).toBeInTheDocument()
  })

  it('should display budget filter with open-ended range', () => {
    const filtersWithBudget = {
      ...DEFAULT_FILTERS,
      budgetMin: 5000,
      budgetMax: undefined
    }

    render(
      <ActiveFilters
        filters={filtersWithBudget}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText(/Budget: R5000\+/)).toBeInTheDocument()
  })

  it('should display duration filter chips', () => {
    const filtersWithDurations = {
      ...DEFAULT_FILTERS,
      durations: ['1 week', '1 month']
    }

    render(
      <ActiveFilters
        filters={filtersWithDurations}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText('Duration: 1 week')).toBeInTheDocument()
    expect(screen.getByText('Duration: 1 month')).toBeInTheDocument()
  })

  it('should display work type filter chip', () => {
    const filtersWithWorkType = {
      ...DEFAULT_FILTERS,
      workType: 'remote' as const
    }

    render(
      <ActiveFilters
        filters={filtersWithWorkType}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText('Remote Only')).toBeInTheDocument()
  })

  it('should display physical work type filter chip', () => {
    const filtersWithWorkType = {
      ...DEFAULT_FILTERS,
      workType: 'physical' as const
    }

    render(
      <ActiveFilters
        filters={filtersWithWorkType}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText('Physical Only')).toBeInTheDocument()
  })

  it('should display urgency filter chips', () => {
    const filtersWithUrgency = {
      ...DEFAULT_FILTERS,
      urgency: 'urgent' as const
    }

    render(
      <ActiveFilters
        filters={filtersWithUrgency}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText('Urgent (3 days)')).toBeInTheDocument()
  })

  it('should display nearby filter chip', () => {
    const filtersWithNearby = {
      ...DEFAULT_FILTERS,
      showNearbyOnly: true,
      radiusKm: 25
    }

    render(
      <ActiveFilters
        filters={filtersWithNearby}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText('Within 25km')).toBeInTheDocument()
  })

  it('should call onRemoveFilter when filter chip is clicked', () => {
    const filtersWithBudget = {
      ...DEFAULT_FILTERS,
      budgetMin: 500,
      budgetMax: 1000
    }

    render(
      <ActiveFilters
        filters={filtersWithBudget}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    const budgetChip = screen.getByText(/Budget: R500 - R1000/)
    fireEvent.click(budgetChip)

    expect(mockOnRemoveFilter).toHaveBeenCalledWith('budgetMin', undefined)
  })

  it('should call onRemoveFilter with value for duration chip', () => {
    const filtersWithDurations = {
      ...DEFAULT_FILTERS,
      durations: ['1 week', '1 month']
    }

    render(
      <ActiveFilters
        filters={filtersWithDurations}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    const weekChip = screen.getByText('Duration: 1 week')
    fireEvent.click(weekChip)

    expect(mockOnRemoveFilter).toHaveBeenCalledWith('durations', '1 week')
  })

  it('should call onClearAll when clear all button is clicked', () => {
    const filtersWithMultiple = {
      ...DEFAULT_FILTERS,
      budgetMin: 500,
      budgetMax: 1000,
      workType: 'remote' as const,
      urgency: 'urgent' as const
    }

    render(
      <ActiveFilters
        filters={filtersWithMultiple}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    const clearAllButton = screen.getByText('Clear All')
    fireEvent.click(clearAllButton)

    expect(mockOnClearAll).toHaveBeenCalledTimes(1)
  })

  it('should display multiple active filters', () => {
    const filtersWithMultiple = {
      ...DEFAULT_FILTERS,
      budgetMin: 1000,
      budgetMax: 5000,
      durations: ['1 week', '1 month'],
      workType: 'remote' as const,
      urgency: 'week' as const
    }

    render(
      <ActiveFilters
        filters={filtersWithMultiple}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    )

    expect(screen.getByText(/Budget: R1000 - R5000/)).toBeInTheDocument()
    expect(screen.getByText('Duration: 1 week')).toBeInTheDocument()
    expect(screen.getByText('Duration: 1 month')).toBeInTheDocument()
    expect(screen.getByText('Remote Only')).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
  })
})
