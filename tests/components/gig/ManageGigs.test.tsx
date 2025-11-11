import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ManageGigs from '@/components/gig/ManageGigs'
import { GigService } from '@/lib/database/gigService'
import { PaymentService } from '@/lib/services/paymentService'
import { useAuth } from '@/contexts/AuthContext'
import { Gig, GigApplication } from '@/types/gig'

// Mock dependencies
jest.mock('@/lib/database/gigService')
jest.mock('@/lib/services/paymentService')
jest.mock('@/contexts/AuthContext')
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  })
}))
jest.mock('@/components/gig/PostGigForm', () => ({
  __esModule: true,
  default: ({ editGig, onSuccess, onCancel }: any) => (
    <div data-testid="post-gig-form">
      <div>Edit Gig Form: {editGig?.title}</div>
      <button onClick={onSuccess}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}))

describe('ManageGigs', () => {
  const mockUser = {
    id: 'employer-123',
    email: 'employer@test.com',
    firstName: 'Test',
    lastName: 'Employer',
    userType: 'employer' as const,
    phone: '+27123456789',
    location: 'Johannesburg',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockGig: Gig = {
    id: 'gig-1',
    title: 'Web Development Project',
    description: 'Build a website',
    category: 'technology',
    location: 'Johannesburg',
    budget: 5000,
    duration: '2 weeks',
    skillsRequired: ['React', 'TypeScript'],
    employerId: 'employer-123',
    employerName: 'Test Employer',
    status: 'open',
    applicants: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockInProgressGig: Gig = {
    ...mockGig,
    id: 'gig-2',
    title: 'Cleaning Service',
    status: 'in-progress',
    assignedTo: 'worker-123'
  }

  const mockCompletedGig: Gig = {
    ...mockGig,
    id: 'gig-3',
    title: 'Design Project',
    status: 'completed'
  }

  const mockApplication: GigApplication = {
    id: 'app-1',
    gigId: 'gig-2',
    applicantId: 'worker-123',
    applicantName: 'Test Worker',
    message: 'I am interested',
    proposedRate: 4500,
    status: 'accepted',
    paymentId: 'payment-123',
    createdAt: new Date()
  }

  const mockOnBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockReturnValue(new Promise(() => {}))

      render(<ManageGigs onBack={mockOnBack} />)

      // Check for loading spinner by class name since it doesn't have role="status"
      const loadingSpinner = document.querySelector('.animate-spin')
      expect(loadingSpinner).toBeInTheDocument()
    })

    it('should render header with back button', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('Manage Your Gigs')).toBeInTheDocument()
        expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument()
      })
    })

    it('should render empty state when no gigs exist', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText("You haven't posted any gigs yet.")).toBeInTheDocument()
        expect(screen.getByText('Post Your First Gig')).toBeInTheDocument()
      })
    })
  })

  describe('Gig List Display', () => {
    it('should fetch and display employer gigs', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('Web Development Project')).toBeInTheDocument()
        expect(screen.getByText('Build a website')).toBeInTheDocument()
        expect(screen.getByText('📍 Johannesburg')).toBeInTheDocument()
        // Currency is formatted with spaces: "R 5 000"
        expect(screen.getByText(/💰 R 5 000/)).toBeInTheDocument()
        expect(screen.getByText('⏱️ 2 weeks')).toBeInTheDocument()
      })
    })

    it('should display application count for each gig', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([
        mockApplication,
        { ...mockApplication, id: 'app-2', status: 'pending' }
      ])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('📝 2 applications')).toBeInTheDocument()
      })
    })

    it('should display singular "application" for one application', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('📝 1 application')).toBeInTheDocument()
      })
    })

    it('should show assigned worker for gigs in progress', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('✓ Worker assigned: Test Worker')).toBeInTheDocument()
      })
    })
  })

  describe('Status Badges', () => {
    it('should display "Open" badge for open gigs', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument()
        expect(screen.getByText('Open')).toHaveClass('bg-green-100', 'text-green-800')
      })
    })

    it('should display "In Progress" badge for in-progress gigs', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument()
        expect(screen.getByText('In Progress')).toHaveClass('bg-secondary-100', 'text-secondary-800')
      })
    })

    it('should display "Completed" badge for completed gigs', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockCompletedGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toHaveClass('bg-gray-100', 'text-gray-800')
      })
    })
  })

  describe('Action Buttons', () => {
    it('should show Edit and Cancel buttons for open gigs', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Edit')).toBeInTheDocument()
        expect(screen.getByText('❌ Cancel')).toBeInTheDocument()
      })
    })

    it('should show Mark as Complete button for in-progress gigs with assigned worker', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('✓ Mark as Complete')).toBeInTheDocument()
      })
    })

    it('should show completion message for completed gigs', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockCompletedGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('✓ This gig has been completed')).toBeInTheDocument()
      })
    })
  })

  describe('Gig Completion', () => {
    it('should not show mark as complete button when no worker is assigned', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        // Button should not appear when there's no accepted application
        expect(screen.queryByText('✓ Mark as Complete')).not.toBeInTheDocument()
        // Should show in-progress badge
        expect(screen.getByText('In Progress')).toBeInTheDocument()
      })
    })

    it('should show confirmation dialog when marking gig as complete', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const completeButton = screen.getByText('✓ Mark as Complete')
        fireEvent.click(completeButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Mark Gig as Complete?')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to mark/)).toBeInTheDocument()
        expect(screen.getByText(/This will release the payment/)).toBeInTheDocument()
      })
    })

    it('should cancel confirmation dialog', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const completeButton = screen.getByText('✓ Mark as Complete')
        fireEvent.click(completeButton)
      })

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /Cancel/i })
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.queryByText('Mark Gig as Complete?')).not.toBeInTheDocument()
      })
    })

    it('should complete gig and release payment on confirmation', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])
      ;(GigService.updateGig as jest.Mock).mockResolvedValue(undefined)
      ;(GigService.updateApplicationStatus as jest.Mock).mockResolvedValue(undefined)
      ;(PaymentService.releaseEscrow as jest.Mock).mockResolvedValue(undefined)

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const completeButton = screen.getByText('✓ Mark as Complete')
        fireEvent.click(completeButton)
      })

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Confirm/i })
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(GigService.updateGig).toHaveBeenCalledWith('gig-2', {
          status: 'completed'
        })
        expect(GigService.updateApplicationStatus).toHaveBeenCalledWith('app-1', 'completed')
        expect(PaymentService.releaseEscrow).toHaveBeenCalledWith('payment-123')
        // Toast notification is called instead of alert
      })
    })

    it('should handle error when completing gig fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockInProgressGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([mockApplication])
      ;(GigService.updateGig as jest.Mock).mockRejectedValue(new Error('Update failed'))

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const completeButton = screen.getByText('✓ Mark as Complete')
        fireEvent.click(completeButton)
      })

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Confirm/i })
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        // Toast error notification is called instead of alert
        expect(consoleErrorSpy).toHaveBeenCalled()
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Cancel Gig', () => {
    it('should show confirmation dialog when cancelling gig', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const cancelButton = screen.getByText('❌ Cancel')
        fireEvent.click(cancelButton)
      })

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to cancel this gig? This action cannot be undone.'
      )

      confirmSpy.mockRestore()
    })

    it('should cancel gig when confirmed', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])
      ;(GigService.updateGig as jest.Mock).mockResolvedValue(undefined)

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const cancelButton = screen.getByText('❌ Cancel')
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(GigService.updateGig).toHaveBeenCalledWith('gig-1', {
          status: 'cancelled'
        })
        // Toast notification is called instead of alert
      })

      confirmSpy.mockRestore()
    })

    it('should not cancel gig when not confirmed', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])
      ;(GigService.updateGig as jest.Mock).mockResolvedValue(undefined)

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const cancelButton = screen.getByText('❌ Cancel')
        fireEvent.click(cancelButton)
      })

      expect(GigService.updateGig).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  describe('Edit Gig', () => {
    it('should show edit form when edit button is clicked', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([mockGig])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const editButton = screen.getByText('✏️ Edit')
        fireEvent.click(editButton)
      })

      await waitFor(() => {
        expect(GigService.getGigById).toHaveBeenCalledWith('gig-1')
        expect(screen.getByTestId('post-gig-form')).toBeInTheDocument()
        expect(screen.getByText(`Edit Gig Form: ${mockGig.title}`)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetching gigs fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      ;(GigService.getGigsByEmployer as jest.Mock).mockRejectedValue(new Error('Fetch failed'))

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load your gigs. Please try again.')).toBeInTheDocument()
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Navigation', () => {
    it('should call onBack when back button is clicked', async () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])

      render(<ManageGigs onBack={mockOnBack} />)

      await waitFor(() => {
        const backButton = screen.getByText('← Back to Dashboard')
        fireEvent.click(backButton)
      })

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })
  })
})
