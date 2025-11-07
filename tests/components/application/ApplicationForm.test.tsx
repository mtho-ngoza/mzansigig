import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ApplicationForm from '@/components/application/ApplicationForm'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { usePayment } from '@/contexts/PaymentContext'
import { Gig } from '@/types/gig'

// Mock dependencies
jest.mock('@/lib/database/gigService')
jest.mock('@/contexts/AuthContext')
jest.mock('@/contexts/ToastContext')
jest.mock('@/contexts/PaymentContext')

// Mock GigAmountDisplay component to avoid PaymentContext complexity
jest.mock('@/components/gig/GigAmountDisplay', () => {
  return function MockGigAmountDisplay() {
    return <div>Mocked Gig Amount Display</div>
  }
})

describe('ApplicationForm - Duplicate Application Prevention', () => {
  const mockUser = {
    id: 'user-123',
    email: 'jobseeker@test.com',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'job-seeker' as const,
    phone: '+27123456789',
    location: 'Cape Town',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockGig: Gig = {
    id: 'gig-123',
    title: 'Web Development Project',
    description: 'Build a modern website',
    category: 'Technology',
    location: 'Cape Town',
    budget: 5000,
    duration: '2 weeks',
    skillsRequired: ['React', 'TypeScript'],
    employerId: 'employer-123',
    employerName: 'Test Company',
    status: 'open',
    applicants: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockSuccess = jest.fn()
  const mockError = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockCalculateGigFees = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(useToast as jest.Mock).mockReturnValue({
      success: mockSuccess,
      error: mockError
    })
    ;(usePayment as jest.Mock).mockReturnValue({
      calculateGigFees: mockCalculateGigFees
    })

    mockCalculateGigFees.mockResolvedValue({
      netAmountToWorker: 4500,
      platformFee: 500,
      totalBudget: 5000
    })
  })

  describe('Duplicate Application Check', () => {
    it('should prevent submission if user has already applied', async () => {
      // Mock that user has already applied
      ;(GigService.hasUserApplied as jest.Mock).mockResolvedValue(true)

      render(<ApplicationForm gig={mockGig} onSuccess={mockOnSuccess} />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Message \(Optional\)/i)).toBeInTheDocument()
      })

      // Fill in form (message is now optional, but we'll provide one for this test)
      const messageInput = screen.getByLabelText(/Message \(Optional\)/i)
      const proposedRateInput = screen.getByLabelText(/Proposed Rate/i)

      fireEvent.change(messageInput, {
        target: { value: 'I am very interested in this opportunity' }
      })
      fireEvent.change(proposedRateInput, { target: { value: '4500' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Submit Application/i })
      fireEvent.click(submitButton)

      // Wait for the duplicate check to complete
      await waitFor(() => {
        expect(GigService.hasUserApplied).toHaveBeenCalledWith('gig-123', 'user-123')
      })

      // Should show error message
      expect(mockError).toHaveBeenCalledWith('You have already applied to this gig')

      // Should NOT create application
      expect(GigService.createApplication).not.toHaveBeenCalled()

      // Should NOT call onSuccess
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should allow submission if user has not applied', async () => {
      // Mock that user has NOT applied
      ;(GigService.hasUserApplied as jest.Mock).mockResolvedValue(false)
      ;(GigService.createApplication as jest.Mock).mockResolvedValue('app-456')

      render(<ApplicationForm gig={mockGig} onSuccess={mockOnSuccess} />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Message \(Optional\)/i)).toBeInTheDocument()
      })

      // Fill in form (message is optional, but we'll provide one)
      const messageInput = screen.getByLabelText(/Message \(Optional\)/i)
      const proposedRateInput = screen.getByLabelText(/Proposed Rate/i)

      fireEvent.change(messageInput, {
        target: { value: 'I am very interested in this opportunity' }
      })
      fireEvent.change(proposedRateInput, { target: { value: '4500' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Submit Application/i })
      fireEvent.click(submitButton)

      // Wait for the duplicate check to complete
      await waitFor(() => {
        expect(GigService.hasUserApplied).toHaveBeenCalledWith('gig-123', 'user-123')
      })

      // Should NOT show error
      expect(mockError).not.toHaveBeenCalledWith('You have already applied to this gig')

      // Should create application with message field
      await waitFor(() => {
        expect(GigService.createApplication).toHaveBeenCalledWith({
          gigId: 'gig-123',
          applicantId: 'user-123',
          applicantName: 'John Doe',
          message: 'I am very interested in this opportunity',
          proposedRate: 4500
        })
      })

      // Should call onSuccess
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    it('should check for duplicate before creating application', async () => {
      ;(GigService.hasUserApplied as jest.Mock).mockResolvedValue(false)
      ;(GigService.createApplication as jest.Mock).mockResolvedValue('app-789')

      render(<ApplicationForm gig={mockGig} onSuccess={mockOnSuccess} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Message \(Optional\)/i)).toBeInTheDocument()
      })

      const messageInput = screen.getByLabelText(/Message \(Optional\)/i)
      const proposedRateInput = screen.getByLabelText(/Proposed Rate/i)

      fireEvent.change(messageInput, {
        target: { value: 'I have experience in web development' }
      })
      fireEvent.change(proposedRateInput, { target: { value: '5000' } })

      const submitButton = screen.getByRole('button', { name: /Submit Application/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(GigService.hasUserApplied).toHaveBeenCalled()
      })

      // hasUserApplied should be called BEFORE createApplication
      const hasUserAppliedCall = (GigService.hasUserApplied as jest.Mock).mock.invocationCallOrder[0]
      const createApplicationCall = (GigService.createApplication as jest.Mock).mock.invocationCallOrder[0]

      expect(hasUserAppliedCall).toBeLessThan(createApplicationCall)
    })
  })

  describe('Physical Work Category - Duplicate Check', () => {
    const mockPhysicalGig: Gig = {
      ...mockGig,
      category: 'Cleaning',
      title: 'Weekly House Cleaning',
      description: 'Need reliable cleaner for weekly house cleaning'
    }

    it('should prevent duplicate application for physical work gigs', async () => {
      ;(GigService.hasUserApplied as jest.Mock).mockResolvedValue(true)

      render(<ApplicationForm gig={mockPhysicalGig} onSuccess={mockOnSuccess} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Brief Message \(Optional\)/i)).toBeInTheDocument()
      })

      // Fill in simplified form for physical work (message is optional)
      const messageInput = screen.getByLabelText(/Brief Message \(Optional\)/i)
      const proposedRateInput = screen.getByLabelText(/Proposed Rate/i)

      fireEvent.change(messageInput, {
        target: { value: 'I have 3 years cleaning experience' }
      })
      fireEvent.change(proposedRateInput, { target: { value: '500' } })

      const submitButton = screen.getByRole('button', { name: /Submit Application/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(GigService.hasUserApplied).toHaveBeenCalledWith(mockPhysicalGig.id, 'user-123')
      })

      expect(mockError).toHaveBeenCalledWith('You have already applied to this gig')
      expect(GigService.createApplication).not.toHaveBeenCalled()
    })
  })
})
