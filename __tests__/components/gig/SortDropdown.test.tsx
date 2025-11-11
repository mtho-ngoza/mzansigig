import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SortDropdown } from '@/components/gig/SortDropdown'

describe('SortDropdown', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with correct label', () => {
    render(<SortDropdown value="newest" onChange={mockOnChange} />)

    expect(screen.getByText('Sort by:')).toBeInTheDocument()
  })

  it('should display all sort options', () => {
    render(<SortDropdown value="newest" onChange={mockOnChange} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    expect(screen.getByText('Newest First')).toBeInTheDocument()
    expect(screen.getByText('Oldest First')).toBeInTheDocument()
    expect(screen.getByText('Highest Budget')).toBeInTheDocument()
    expect(screen.getByText('Lowest Budget')).toBeInTheDocument()
    expect(screen.getByText('Deadline Soon')).toBeInTheDocument()
    expect(screen.getByText('Most Competitive')).toBeInTheDocument()
    expect(screen.getByText('Best Chance')).toBeInTheDocument()
  })

  it('should show selected value', () => {
    render(<SortDropdown value="budget-high" onChange={mockOnChange} />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('budget-high')
  })

  it('should call onChange when option is selected', () => {
    render(<SortDropdown value="newest" onChange={mockOnChange} />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'budget-low' } })

    expect(mockOnChange).toHaveBeenCalledWith('budget-low')
  })

  it('should update when different sort option is selected', () => {
    const { rerender } = render(
      <SortDropdown value="newest" onChange={mockOnChange} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'deadline-soon' } })

    expect(mockOnChange).toHaveBeenCalledWith('deadline-soon')

    rerender(<SortDropdown value="deadline-soon" onChange={mockOnChange} />)

    const updatedSelect = screen.getByRole('combobox') as HTMLSelectElement
    expect(updatedSelect.value).toBe('deadline-soon')
  })

  it('should handle all sort option changes', () => {
    render(<SortDropdown value="newest" onChange={mockOnChange} />)

    const select = screen.getByRole('combobox')
    const options = [
      'oldest',
      'budget-high',
      'budget-low',
      'deadline-soon',
      'most-applications',
      'least-applications'
    ]

    options.forEach((option) => {
      fireEvent.change(select, { target: { value: option } })
      expect(mockOnChange).toHaveBeenCalledWith(option)
    })

    expect(mockOnChange).toHaveBeenCalledTimes(options.length)
  })
})
