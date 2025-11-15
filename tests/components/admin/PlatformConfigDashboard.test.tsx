import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PlatformConfigDashboard from '@/components/admin/PlatformConfigDashboard'
import { ConfigService } from '@/lib/database/configService'
import { DEFAULT_PLATFORM_CONFIG } from '@/types/platformConfig'

// Mock dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'admin-123',
      firstName: 'John',
      lastName: 'Admin',
      email: 'admin@test.com',
      userType: 'admin',
    },
  })),
}))

jest.mock('@/contexts/ToastContext', () => ({
  useToast: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
  })),
}))

jest.mock('@/lib/database/configService')

describe('PlatformConfigDashboard', () => {
  const mockConfig = {
    id: 'main',
    ...DEFAULT_PLATFORM_CONFIG,
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    updatedBy: 'admin-123',
  }

  // Mock Firestore Timestamp
  const mockFirestoreTimestamp = {
    toDate: () => new Date('2024-01-15T10:30:00Z'),
    seconds: Math.floor(new Date('2024-01-15T10:30:00Z').getTime() / 1000),
    nanoseconds: 0,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Date Display', () => {
    it('should display valid date when config has JavaScript Date', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        const dateText = screen.getByText(/Last updated:/i)
        expect(dateText).toBeInTheDocument()
        expect(dateText.textContent).not.toContain('Invalid Date')
        expect(dateText.textContent).toContain('2024')
      })
    })

    it('should handle Firestore Timestamp objects correctly', async () => {
      const configWithTimestamp = {
        ...mockConfig,
        updatedAt: mockFirestoreTimestamp as any,
      }
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(configWithTimestamp)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        const dateText = screen.getByText(/Last updated:/i)
        expect(dateText).toBeInTheDocument()
        expect(dateText.textContent).not.toContain('Invalid Date')
        expect(dateText.textContent).toContain('2024')
      })
    })

    it('should display "by System" for system-created config', async () => {
      const systemConfig = {
        ...mockConfig,
        updatedBy: 'system',
      }
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(systemConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/by System/i)).toBeInTheDocument()
      })
    })

    it('should display admin first name when updated by admin', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/by John/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      ;(ConfigService.getConfig as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<PlatformConfigDashboard />)

      expect(screen.getByText(/Loading configuration/i)).toBeInTheDocument()
    })

    it('should hide loading state after data loads', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.queryByText(/Loading configuration/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Configuration Display', () => {
    it('should display all configuration fields', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
        expect(screen.getByText(/Safety Check Interval/i)).toBeInTheDocument()
        expect(screen.getByText(/Max Active Applications/i)).toBeInTheDocument()
        expect(screen.getByText(/Unfunded Gig Expiry/i)).toBeInTheDocument()
        expect(screen.getByText(/Funding Timeout/i)).toBeInTheDocument()
        expect(screen.getByText(/Escrow Auto-Release Period/i)).toBeInTheDocument()
        expect(screen.getByText(/Review Deadline/i)).toBeInTheDocument()
      })
    })

    it('should display default values correctly', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        // Check that inputs have the default values
        const inputs = screen.getAllByRole('spinbutton')
        expect(inputs).toHaveLength(7) // 7 config fields

        // Distance threshold should be 50
        const distanceInput = inputs.find(
          (input) => (input as HTMLInputElement).value === '50'
        )
        expect(distanceInput).toBeInTheDocument()

        // Max applications should be 20
        const maxAppsInput = inputs.find(
          (input) => (input as HTMLInputElement).value === '20'
        )
        expect(maxAppsInput).toBeInTheDocument()
      })
    })
  })

  describe('Value Updates', () => {
    it('should enable save button when values are changed', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      const distanceInput = inputs[0]

      // Initially, save button should be disabled
      const saveButton = screen.getByText(/Save Changes/i)
      expect(saveButton).toBeDisabled()

      // Change a value
      fireEvent.change(distanceInput, { target: { value: '75' } })

      // Save button should now be enabled
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('should show "Modified" label for changed fields', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      const distanceInput = inputs[0]

      // Change a value
      fireEvent.change(distanceInput, { target: { value: '75' } })

      // Should show (Modified) label
      await waitFor(() => {
        expect(screen.getByText(/\(Modified\)/i)).toBeInTheDocument()
      })
    })

    it('should validate min/max constraints', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      const distanceInput = inputs[0]

      // Try to set value below minimum (1)
      fireEvent.change(distanceInput, { target: { value: '0' } })

      await waitFor(() => {
        expect(screen.getByText(/Value must be between/i)).toBeInTheDocument()
      })
    })
  })

  describe('Save Functionality', () => {
    it('should call ConfigService.updateConfig when saving', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)
      ;(ConfigService.updateConfig as jest.Mock).mockResolvedValue(undefined)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      const distanceInput = inputs[0]

      // Change a value
      fireEvent.change(distanceInput, { target: { value: '75' } })

      // Click save
      const saveButton = screen.getByText(/Save Changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(ConfigService.updateConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            distanceWarningThresholdKm: 75,
          }),
          'admin-123'
        )
      })
    })

    it('should reload config after successful save', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)
      ;(ConfigService.updateConfig as jest.Mock).mockResolvedValue(undefined)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      const distanceInput = inputs[0]

      // Change a value
      fireEvent.change(distanceInput, { target: { value: '75' } })

      // Click save
      const saveButton = screen.getByText(/Save Changes/i)
      fireEvent.click(saveButton)

      // Should call getConfig again after save
      await waitFor(() => {
        expect(ConfigService.getConfig).toHaveBeenCalledTimes(2) // Initial load + reload after save
      })
    })
  })

  describe('Reset Functionality', () => {
    it('should show confirmation dialog when resetting', async () => {
      global.confirm = jest.fn(() => false)
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Reset to Defaults/i)).toBeInTheDocument()
      })

      const resetButton = screen.getByText(/Reset to Defaults/i)
      fireEvent.click(resetButton)

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('reset all settings to defaults')
      )
    })

    it('should call resetToDefaults when confirmed', async () => {
      global.confirm = jest.fn(() => true)
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)
      ;(ConfigService.resetToDefaults as jest.Mock).mockResolvedValue(undefined)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Reset to Defaults/i)).toBeInTheDocument()
      })

      const resetButton = screen.getByText(/Reset to Defaults/i)
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(ConfigService.resetToDefaults).toHaveBeenCalledWith('admin-123')
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh cache when refresh button clicked', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)
      ;(ConfigService.refreshCache as jest.Mock).mockResolvedValue(undefined)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Refresh/i)).toBeInTheDocument()
      })

      const refreshButton = screen.getByText(/Refresh/i)
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(ConfigService.refreshCache).toHaveBeenCalled()
      })
    })
  })

  describe('Discard Functionality', () => {
    it('should show discard button when changes exist', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
      })

      // No discard button initially
      expect(screen.queryByText(/^Discard$/i)).not.toBeInTheDocument()

      const inputs = screen.getAllByRole('spinbutton')
      const distanceInput = inputs[0]

      // Change a value
      fireEvent.change(distanceInput, { target: { value: '75' } })

      // Discard button should appear
      await waitFor(() => {
        expect(screen.getByText(/^Discard$/i)).toBeInTheDocument()
      })
    })

    it('should reset changes when discard clicked', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Distance Warning Threshold/i)).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      const distanceInput = inputs[0]

      // Change a value
      fireEvent.change(distanceInput, { target: { value: '75' } })

      await waitFor(() => {
        expect((distanceInput as HTMLInputElement).value).toBe('75')
      })

      // Click discard
      const discardButton = screen.getByText(/^Discard$/i)
      fireEvent.click(discardButton)

      // Value should revert to original
      await waitFor(() => {
        expect((distanceInput as HTMLInputElement).value).toBe('50')
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error state when config fails to load', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockRejectedValue(
        new Error('Failed to load')
      )

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load configuration/i)).toBeInTheDocument()
      })
    })
  })

  describe('Categories', () => {
    it('should group fields by category', async () => {
      ;(ConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig)

      render(<PlatformConfigDashboard />)

      await waitFor(() => {
        // Check for category headings (using getAllByText since text may appear multiple times)
        expect(screen.getAllByText(/safety/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/applications/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/lifecycle/i)).toBeInTheDocument()
        expect(screen.getByText(/payments/i)).toBeInTheDocument()
        expect(screen.getAllByText(/reviews/i).length).toBeGreaterThan(0)
      })
    })
  })
})
