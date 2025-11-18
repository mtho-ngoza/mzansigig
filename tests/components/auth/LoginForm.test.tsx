import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

// Mock dependencies
jest.mock('@/contexts/AuthContext')

describe('LoginForm', () => {
  const mockLogin = jest.fn()
  const mockLoginWithGoogle = jest.fn()
  const mockIsLoading = false

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      isLoading: mockIsLoading
    })
  })

  describe('Form Rendering', () => {
    it('should render login form with all required fields', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
    })

    it('should render Google sign-in button', () => {
      render(<LoginForm />)

      const googleButton = screen.getByRole('button', { name: /Google/i })
      expect(googleButton).toBeInTheDocument()
    })
  })

  describe('Email Validation', () => {
    it('should validate required email field', async () => {
      render(<LoginForm />)

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument()
      })

      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should validate email format', async () => {
      render(<LoginForm />)

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'invalid-email' }
      })

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email/i)).toBeInTheDocument()
      })

      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should accept valid email format', async () => {
      mockLogin.mockResolvedValue({ success: true, message: 'Login successful' })

      render(<LoginForm />)

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'user@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'password123' }
      })

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123'
        }, true) // rememberMe defaults to true
      })
    })
  })

  describe('Password Validation', () => {
    it('should validate required password field', async () => {
      render(<LoginForm />)

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'user@example.com' }
      })

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
      })

      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('should successfully submit valid credentials', async () => {
      mockLogin.mockResolvedValue({ success: true, message: 'Login successful!' })

      render(<LoginForm />)

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'user@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'Password123!' }
      })

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'Password123!'
        }, true) // rememberMe defaults to true
      })

      await waitFor(() => {
        expect(screen.getByText(/Login successful!/i)).toBeInTheDocument()
      })
    })

    it('should display error message on login failure', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: 'Invalid email or password'
      })

      render(<LoginForm />)

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'user@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'wrongpassword' }
      })

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument()
      })
    })

    it('should disable submit button while loading', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        loginWithGoogle: mockLoginWithGoogle,
        isLoading: true
      })

      render(<LoginForm />)

      const buttons = screen.getAllByRole('button', { name: /Loading/i })
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Google Sign-In', () => {
    it('should handle successful Google sign-in', async () => {
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        message: 'Login successful!',
        needsProfileCompletion: false
      })

      render(<LoginForm />)

      const googleButton = screen.getByRole('button', { name: /Google/i })
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByText(/Login successful!/i)).toBeInTheDocument()
      })
    })

    it('should handle Google sign-in requiring profile completion', async () => {
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        message: 'Profile completion needed',
        needsProfileCompletion: true
      })

      render(<LoginForm />)

      const googleButton = screen.getByRole('button', { name: /Google/i })
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalled()
      })

      // Profile completion modal should be shown
      // Note: This would need the modal to be properly mocked/tested
    })

    it('should handle Google sign-in failure', async () => {
      mockLoginWithGoogle.mockResolvedValue({
        success: false,
        message: 'Google sign-in failed'
      })

      render(<LoginForm />)

      const googleButton = screen.getByRole('button', { name: /Google/i })
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(/Google sign-in failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Clearing', () => {
    it('should clear email error when user starts typing', async () => {
      render(<LoginForm />)

      // Submit to trigger validation errors
      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument()
      })

      // Start typing in email field
      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'u' }
      })

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Email is required/i)).not.toBeInTheDocument()
      })
    })

    it('should clear password error when user starts typing', async () => {
      render(<LoginForm />)

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'user@example.com' }
      })

      const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/Password/i), {
        target: { value: 'p' }
      })

      await waitFor(() => {
        expect(screen.queryByText(/Password is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper autocomplete attributes', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/Email Address/i)
      const passwordInput = screen.getByLabelText(/Password/i)

      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('should have proper input types', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/Email Address/i)
      const passwordInput = screen.getByLabelText(/Password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })
})
