import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuth } from '@/contexts/AuthContext'

// Mock dependencies
jest.mock('@/contexts/AuthContext')

describe('RegisterForm', () => {
  const mockRegister = jest.fn()
  const mockIsLoading = false

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      isLoading: mockIsLoading
    })
  })

  const fillBasicFields = (accountType: 'job-seeker' | 'employer' = 'job-seeker') => {
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'john.doe@example.com' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '+27821234567' } })
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: 'Cape Town' } })

    const accountTypeSelect = screen.getByLabelText(/Account Type/i)
    fireEvent.change(accountTypeSelect, { target: { value: accountType } })

    // Valid SA ID Number (passes checksum validation)
    // Using a known valid test ID: 9001045289085
    fireEvent.change(screen.getByLabelText(/South African ID Number/i), { target: { value: '9001045289085' } })
  }

  describe('Job Seeker Registration', () => {
    it('should render register form for job seekers', () => {
      render(<RegisterForm />)

      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Account Type/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument()
    })

    it('should show Type of Work field for job seekers', () => {
      render(<RegisterForm />)

      const accountTypeSelect = screen.getByLabelText(/Account Type/i)
      fireEvent.change(accountTypeSelect, { target: { value: 'job-seeker' } })

      expect(screen.getByLabelText(/Type of Work/i)).toBeInTheDocument()
      expect(screen.getByText(/Professional Services/i)).toBeInTheDocument()
      expect(screen.getByText(/Hands-on Work/i)).toBeInTheDocument()
    })

    it('should not show Type of Work field for employers', () => {
      render(<RegisterForm />)

      const accountTypeSelect = screen.getByLabelText(/Account Type/i)
      fireEvent.change(accountTypeSelect, { target: { value: 'employer' } })

      expect(screen.queryByLabelText(/Type of Work/i)).not.toBeInTheDocument()
    })

    it('should successfully register job seeker with workSector selected', async () => {
      mockRegister.mockResolvedValue({ success: true, message: 'Registration successful!' })

      render(<RegisterForm />)

      fillBasicFields('job-seeker')

      // Select work sector
      const workSectorSelect = screen.getByLabelText(/Type of Work/i)
      fireEvent.change(workSectorSelect, { target: { value: 'professional' } })

      // Submit form
      const form = screen.getByRole('button', { name: /Create Account/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            userType: 'job-seeker',
            workSector: 'professional',
            idNumber: '9001045289085'
          })
        )
      })

      expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument()
    })

    it('should validate workSector is required for job seekers', async () => {
      render(<RegisterForm />)

      fillBasicFields('job-seeker')

      // Do NOT select work sector - it will default to empty string
      // Submit form
      const form = screen.getByRole('button', { name: /Create Account/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Please select your work type/i)).toBeInTheDocument()
      })

      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('should display error message when workSector validation fails', async () => {
      render(<RegisterForm />)

      fillBasicFields('job-seeker')

      // Submit without selecting workSector
      const form = screen.getByRole('button', { name: /Create Account/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        const errorMessage = screen.getByText(/Please select your work type/i)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveClass('text-red-600')
      })
    })

    it('should clear workSector error when user selects a value', async () => {
      render(<RegisterForm />)

      fillBasicFields('job-seeker')

      // Submit without selecting workSector to trigger error
      const form = screen.getByRole('button', { name: /Create Account/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Please select your work type/i)).toBeInTheDocument()
      })

      // Now select workSector
      const workSectorSelect = screen.getByLabelText(/Type of Work/i)
      fireEvent.change(workSectorSelect, { target: { value: 'informal' } })

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Please select your work type/i)).not.toBeInTheDocument()
      })
    })

    it('should successfully register informal worker', async () => {
      mockRegister.mockResolvedValue({ success: true, message: 'Registration successful!' })

      render(<RegisterForm />)

      fillBasicFields('job-seeker')

      // Select informal work sector
      const workSectorSelect = screen.getByLabelText(/Type of Work/i)
      fireEvent.change(workSectorSelect, { target: { value: 'informal' } })

      // Submit form
      const form = screen.getByRole('button', { name: /Create Account/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            workSector: 'informal'
          })
        )
      })
    })
  })

  describe('Employer Registration', () => {
    it('should successfully register employer without workSector', async () => {
      mockRegister.mockResolvedValue({ success: true, message: 'Registration successful!' })

      render(<RegisterForm />)

      fillBasicFields('employer')

      // Submit form (no workSector field shown for employers)
      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            userType: 'employer',
            workSector: undefined
          })
        )
      })

      expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument()
    })

    it('should not validate workSector for employers', async () => {
      mockRegister.mockResolvedValue({ success: true, message: 'Registration successful!' })

      render(<RegisterForm />)

      fillBasicFields('employer')

      // Submit form
      const form = screen.getByRole('button', { name: /Create Account/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })

      // Should not show workSector error
      expect(screen.queryByText(/Please select your work type/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate all required fields', async () => {
      render(<RegisterForm />)

      // Submit empty form
      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/First name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/Last name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
        expect(screen.getByText(/Phone number is required/i)).toBeInTheDocument()
        expect(screen.getByText(/Location is required/i)).toBeInTheDocument()
        expect(screen.getByText(/SA ID Number is required/i)).toBeInTheDocument()
      })

      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('should validate email format', async () => {
      render(<RegisterForm />)

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invalid-email' } })

      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('should validate password length', async () => {
      render(<RegisterForm />)

      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: '123' } })

      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation match', async () => {
      render(<RegisterForm />)

      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } })
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'different' } })

      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should validate SA ID Number format', async () => {
      render(<RegisterForm />)

      fillBasicFields('job-seeker')

      // Invalid ID (not 13 digits)
      fireEvent.change(screen.getByLabelText(/South African ID Number/i), { target: { value: '12345' } })

      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/ID Number must be exactly 13 digits/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message on registration failure', async () => {
      mockRegister.mockResolvedValue({ success: false, message: 'Email already exists' })

      render(<RegisterForm />)

      fillBasicFields('job-seeker')

      // Select work sector
      const workSectorSelect = screen.getByLabelText(/Type of Work/i)
      fireEvent.change(workSectorSelect, { target: { value: 'professional' } })

      // Submit form
      const form = screen.getByRole('button', { name: /Create Account/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Email already exists/i)).toBeInTheDocument()
      })
    })
  })

  describe('UI Behavior', () => {
    it('should show required asterisk for Type of Work field', () => {
      render(<RegisterForm />)

      const accountTypeSelect = screen.getByLabelText(/Account Type/i)
      fireEvent.change(accountTypeSelect, { target: { value: 'job-seeker' } })

      const workSectorLabel = screen.getByText(/Type of Work/)
      expect(workSectorLabel.textContent).toContain('*')
    })

    it('should show help text about customizing experience', () => {
      render(<RegisterForm />)

      const accountTypeSelect = screen.getByLabelText(/Account Type/i)
      fireEvent.change(accountTypeSelect, { target: { value: 'job-seeker' } })

      expect(screen.getByText(/This helps us customize your experience/i)).toBeInTheDocument()
    })

    it('should disable submit button while loading', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        register: mockRegister,
        isLoading: true
      })

      render(<RegisterForm />)

      const submitButton = screen.getByRole('button', { name: /Loading/i })
      expect(submitButton).toBeDisabled()
    })
  })
})
