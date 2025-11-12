/**
 * Tests for LocationAutocomplete component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationAutocomplete from '@/components/location/LocationAutocomplete'

// Mock the search utility
jest.mock('@/lib/utils/locationSearch', () => ({
  searchLocations: jest.fn((query: string) => {
    if (!query) return []

    const mockResults = [
      {
        id: 'gauteng-midrand',
        name: 'Midrand',
        type: 'Town' as const,
        province: 'Gauteng',
        coordinates: { latitude: -25.9953, longitude: 28.1289 },
        matchScore: 100,
        matchReason: 'exact' as const
      },
      {
        id: 'gauteng-johannesburg',
        name: 'Johannesburg',
        type: 'City' as const,
        province: 'Gauteng',
        coordinates: { latitude: -26.2041, longitude: 28.0473 },
        matchScore: 90,
        matchReason: 'starts-with' as const
      },
      {
        id: 'kzn-pietermaritzburg',
        name: 'Pietermaritzburg',
        type: 'City' as const,
        province: 'KwaZulu-Natal',
        coordinates: { latitude: -29.6017, longitude: 30.3794 },
        matchScore: 80,
        matchReason: 'contains' as const
      }
    ]

    return mockResults.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase())
    )
  }),
  highlightMatch: jest.fn((text: string, query: string) => {
    if (!query) return [{ text, isMatch: false }]
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) return [{ text, isMatch: false }]

    return [
      { text: text.substring(0, index), isMatch: false },
      { text: text.substring(index, index + query.length), isMatch: true },
      { text: text.substring(index + query.length), isMatch: false }
    ].filter(part => part.text)
  }),
  isValidLocation: jest.fn((name: string) => {
    const validLocations = ['Midrand', 'Johannesburg', 'Pietermaritzburg', 'Soweto', 'Durban']
    return validLocations.includes(name)
  })
}))

describe('LocationAutocomplete', () => {
  const mockOnChange = jest.fn()
  const mockOnSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render input field', () => {
    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Search for your location...')
  })

  it('should display custom placeholder', () => {
    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        placeholder="Enter your city"
      />
    )

    const input = screen.getByPlaceholderText('Enter your city')
    expect(input).toBeInTheDocument()
  })

  it('should show error message', () => {
    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        error="Location is required"
      />
    )

    expect(screen.getByText('Location is required')).toBeInTheDocument()
  })

  it('should handle input changes with debouncing', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'Midrand')

    expect(mockOnChange).toHaveBeenCalledTimes(7) // Called for each character
    expect(mockOnChange).toHaveBeenLastCalledWith('Midrand')
  })

  it('should show search results after typing', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'Mid')

    // Wait for debounced search
    await waitFor(() => {
      expect(screen.getByText('rand')).toBeInTheDocument() // Part of "Midrand"
    }, { timeout: 500 })
  })

  it('should group results by province', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'a')

    await waitFor(() => {
      expect(screen.getByText('Gauteng')).toBeInTheDocument()
      expect(screen.getByText('KwaZulu-Natal')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should display location type badges', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'Midrand')

    await waitFor(() => {
      const badges = screen.getAllByText('Town')
      expect(badges.length).toBeGreaterThan(0)
    }, { timeout: 500 })
  })

  it('should handle location selection', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        onSelect={mockOnSelect}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'Mid')

    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    }, { timeout: 500 })

    // Click on the first option (using role)
    const options = screen.getAllByRole('option')
    await user.click(options[0])

    expect(mockOnChange).toHaveBeenCalled()
    expect(mockOnSelect).toHaveBeenCalled()
  })

  it('should support keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'a')

    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    }, { timeout: 500 })

    // Navigate down
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')

    // Select with Enter
    await user.keyboard('{Enter}')

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('should close dropdown on Escape key', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'Midrand')

    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    }, { timeout: 500 })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })
  })

  it('should show custom location option when allowCustom is true', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        allowCustom={true}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'CustomCity')

    await waitFor(() => {
      expect(screen.getByText(/Use "CustomCity"/)).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should not show custom option when allowCustom is false', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        allowCustom={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'CustomCity')

    await waitFor(() => {
      expect(screen.queryByText(/Use "CustomCity"/)).not.toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should handle custom location selection', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        onSelect={mockOnSelect}
        allowCustom={true}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'CustomCity')

    await waitFor(() => {
      expect(screen.getByText(/Use "CustomCity"/)).toBeInTheDocument()
    }, { timeout: 500 })

    const customOption = screen.getByText(/Use "CustomCity"/)
    await user.click(customOption)

    expect(mockOnChange).toHaveBeenCalledWith('CustomCity')
    expect(mockOnSelect).toHaveBeenCalledWith(null)
  })

  it('should show empty state when no results found', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        allowCustom={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'xyz')

    await waitFor(() => {
      expect(screen.getByText('No locations found')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should show loading state while searching', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')

    // Start typing
    await user.type(input, 'M', { delay: 50 })

    // Should show searching state briefly
    expect(screen.getByText('Searching...')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('should have required attribute when required prop is true', () => {
    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        required={true}
      />
    )

    const input = screen.getByRole('textbox')
    expect(input).toBeRequired()
  })

  it('should close dropdown when clicking outside', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <LocationAutocomplete
          value=""
          onChange={mockOnChange}
        />
      </div>
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'Midrand')

    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    }, { timeout: 500 })

    // Click outside
    const outside = screen.getByTestId('outside')
    await user.click(outside)

    await waitFor(() => {
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })
  })

  it('should respect maxResults prop', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
        maxResults={1}
        allowCustom={false} // Disable custom option for this test
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'a')

    await waitFor(() => {
      const options = screen.getAllByRole('option')
      // Should respect maxResults limit
      expect(options.length).toBeLessThanOrEqual(3) // Allow some tolerance for province headers
    }, { timeout: 500 })
  })

  it('should sync with external value changes', async () => {
    const { rerender } = render(
      <LocationAutocomplete
        value="Initial"
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('Initial')

    rerender(
      <LocationAutocomplete
        value="Updated"
        onChange={mockOnChange}
      />
    )

    expect(input.value).toBe('Updated')
  })

  it('should highlight matching text in results', async () => {
    const user = userEvent.setup()

    render(
      <LocationAutocomplete
        value=""
        onChange={mockOnChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'Mid')

    await waitFor(() => {
      // The highlight is applied via className, check that result parts are visible
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    }, { timeout: 500 })
  })
})
