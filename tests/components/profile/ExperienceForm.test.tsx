import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ExperienceForm from '@/components/profile/ExperienceForm'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ProfileService } from '@/lib/database/profileService'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('@/contexts/ToastContext')
jest.mock('@/lib/database/profileService')

describe('ExperienceForm', () => {
  const mockSuccess = jest.fn()
  const mockError = jest.fn()
  const mockRefreshUser = jest.fn()
  const mockOnBack = jest.fn()

  const mockProfessionalUser = {
    id: 'user-123',
    email: 'user@test.com',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'job-seeker' as const,
    workSector: 'professional' as const,
    phone: '+27123456789',
    location: 'Cape Town',
    createdAt: new Date()
  }

  const mockInformalUser = {
    ...mockProfessionalUser,
    workSector: 'informal' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()

    ;(useToast as jest.Mock).mockReturnValue({
      success: mockSuccess,
      error: mockError
    })

    ;(ProfileService.updateProfile as jest.Mock).mockResolvedValue(undefined)
    ;(ProfileService.updateProfileCompleteness as jest.Mock).mockResolvedValue(undefined)
  })

  describe('Professional Users', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockProfessionalUser,
        refreshUser: mockRefreshUser
      })
    })

    it('should render experience form for professional users', () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      expect(screen.getByText(/Experience & Rates/i)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Experience Level/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Hourly Rate/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Availability/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Education Level/i })).toBeInTheDocument()
    })

    it('should not show informal worker specific fields for professional users', () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      // Should not show "Years of Experience" section (informal worker field)
      expect(screen.queryByText(/How long have you been doing this type of work/i)).not.toBeInTheDocument()

      // Should not show "Tools & Equipment" section
      expect(screen.queryByText(/Do you have your own tools or equipment for work/i)).not.toBeInTheDocument()
    })

    it('should submit professional user data', async () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      // Select experience level
      const experienceOptions = screen.getAllByRole('radio', { name: /years/i })
      fireEvent.click(experienceOptions[2]) // Mid-level (3-5 years)

      // Fill hourly rate
      const hourlyRateInput = screen.getByPlaceholderText('500')
      fireEvent.change(hourlyRateInput, { target: { value: '750' } })

      // Select availability
      const availabilityOptions = screen.getAllByRole('radio')
      const flexibleOption = availabilityOptions.find(
        option => (option as HTMLInputElement).value === 'Flexible'
      )
      if (flexibleOption) fireEvent.click(flexibleOption)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Save Experience/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(ProfileService.updateProfile).toHaveBeenCalledWith('user-123', expect.objectContaining({
          experience: 'Mid-level (3-5 years)',
          hourlyRate: 750,
          availability: 'Flexible'
        }))
      })

      expect(ProfileService.updateProfileCompleteness).toHaveBeenCalledWith('user-123')
      expect(mockRefreshUser).toHaveBeenCalled()
      expect(mockSuccess).toHaveBeenCalledWith('Lekker! Experience updated')
      expect(mockOnBack).toHaveBeenCalled()
    })
  })

  describe('Informal Workers', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockInformalUser,
        refreshUser: mockRefreshUser
      })
    })

    it('should render informal worker specific fields', () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      // Should show "Years of Experience" section
      expect(screen.getByText(/How long have you been doing this type of work/i)).toBeInTheDocument()

      // Should show "Tools & Equipment" section
      expect(screen.getByText(/Do you have your own tools or equipment for work/i)).toBeInTheDocument()

      // Should show all experience years options (using getAllByText for duplicates)
      expect(screen.getAllByText(/Less than 1 year/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/1-3 years/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/3-5 years/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/5-10 years/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/10\+ years/i).length).toBeGreaterThan(0)

      // Should show all equipment options
      expect(screen.getByText(/Yes, I have all necessary tools/i)).toBeInTheDocument()
      expect(screen.getByText(/I have some tools/i)).toBeInTheDocument()
      expect(screen.getByText(/No, I need tools provided/i)).toBeInTheDocument()
    })

    it('should submit informal worker specific data', async () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      // Select experience years - find radio by its associated label text
      const allRadios = screen.getAllByRole('radio')
      const experienceYearsRadio = allRadios.find(radio =>
        (radio as HTMLInputElement).name === 'experienceYears' &&
        (radio as HTMLInputElement).value === '1-3'
      )
      if (experienceYearsRadio) fireEvent.click(experienceYearsRadio)

      // Select equipment
      const equipmentRadio = allRadios.find(radio =>
        (radio as HTMLInputElement).name === 'equipmentOwnership' &&
        (radio as HTMLInputElement).value === 'fully-equipped'
      )
      if (equipmentRadio) fireEvent.click(equipmentRadio)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Save Experience/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(ProfileService.updateProfile).toHaveBeenCalledWith('user-123', expect.objectContaining({
          experienceYears: '1-3',
          equipmentOwnership: 'fully-equipped'
        }))
      })

      expect(mockSuccess).toHaveBeenCalledWith('Lekker! Experience updated')
      expect(mockOnBack).toHaveBeenCalled()
    })

    it('should show helpful tips for informal workers', () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      expect(screen.getByText(/Filling out your experience years helps you apply faster to jobs/i)).toBeInTheDocument()
      expect(screen.getByText(/Showing you have tools makes you more attractive to employers/i)).toBeInTheDocument()
      expect(screen.getByText(/Why this helps:/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation and Edge Cases', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockProfessionalUser,
        refreshUser: mockRefreshUser
      })
    })

    it('should handle optional hourly rate field', async () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      // Select experience level without entering hourly rate
      const experienceOptions = screen.getAllByRole('radio', { name: /years/i })
      fireEvent.click(experienceOptions[0])

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Save Experience/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(ProfileService.updateProfile).toHaveBeenCalled()
      })

      // Check that hourlyRate was not included
      const callArgs = (ProfileService.updateProfile as jest.Mock).mock.calls[0][1]
      expect(callArgs.hourlyRate).toBeUndefined()
    })

    it('should handle invalid hourly rate', async () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      // Enter invalid hourly rate
      const hourlyRateInput = screen.getByPlaceholderText('500')
      fireEvent.change(hourlyRateInput, { target: { value: 'invalid' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Save Experience/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(ProfileService.updateProfile).toHaveBeenCalled()
      })

      // Check that invalid hourlyRate was not included
      const callArgs = (ProfileService.updateProfile as jest.Mock).mock.calls[0][1]
      expect(callArgs.hourlyRate).toBeUndefined()
    })

    it('should handle form submission error', async () => {
      ;(ProfileService.updateProfile as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<ExperienceForm onBack={mockOnBack} />)

      const submitButton = screen.getByRole('button', { name: /Save Experience/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith('Failed to update experience. Please try again.')
      })

      // Should not call onBack on error
      expect(mockOnBack).not.toHaveBeenCalled()
    })

    it('should pre-fill form with existing user data', () => {
      const mockUserWithData = {
        ...mockInformalUser,
        experience: 'Senior (5-10 years)',
        hourlyRate: 800,
        availability: 'Full-time',
        education: 'High School',
        experienceYears: '5-10' as const,
        equipmentOwnership: 'partially-equipped' as const
      }

      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUserWithData,
        refreshUser: mockRefreshUser
      })

      render(<ExperienceForm onBack={mockOnBack} />)

      // Check hourly rate is pre-filled
      const hourlyRateInput = screen.getByPlaceholderText('500') as HTMLInputElement
      expect(hourlyRateInput.value).toBe('800')
    })

    it('should handle cancel action', () => {
      render(<ExperienceForm onBack={mockOnBack} />)

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnBack).toHaveBeenCalled()
      expect(ProfileService.updateProfile).not.toHaveBeenCalled()
    })

    it('should disable button during submission', async () => {
      ;(ProfileService.updateProfile as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<ExperienceForm onBack={mockOnBack} />)

      const submitButton = screen.getByRole('button', { name: /Save Experience/i })
      fireEvent.click(submitButton)

      // Button should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalled()
      }, { timeout: 200 })
    })
  })

  describe('No User State', () => {
    it('should return null when no user is logged in', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        refreshUser: mockRefreshUser
      })

      const { container } = render(<ExperienceForm onBack={mockOnBack} />)

      expect(container.firstChild).toBeNull()
    })
  })
})
