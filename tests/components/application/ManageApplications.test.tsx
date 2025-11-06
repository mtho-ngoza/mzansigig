/**
 * ManageApplications Tests * for managing job applications including profile viewing integration
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ManageApplications from '@/components/application/ManageApplications'
import { useAuth } from '@/contexts/AuthContext'
import { GigService } from '@/lib/database/gigService'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('@/lib/database/gigService')
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn()
  })
}))
jest.mock('@/components/messaging/QuickMessageButton', () => ({
  QuickMessageButton: () => <div>Quick Message</div>
}))
jest.mock('@/components/payment/PaymentDialog', () => ({
  __esModule: true,
  default: () => <div>Payment Dialog</div>
}))
jest.mock('@/components/application/JobSeekerProfileDialog', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string }) =>
    isOpen ? (
      <div data-testid="job-seeker-profile-dialog">
        <button onClick={onClose}>Close Dialog</button>
        <div>Viewing profile for user: {userId}</div>
      </div>
    ) : null
}))

describe('ManageApplications', () => {
  const mockUser = {
    id: 'employer-123',
    email: 'employer@example.com',
    firstName: 'John',
    lastName: 'Employer',
    userType: 'employer' as const,
    phone: '+27123456789',
    location: 'Cape Town',
    createdAt: new Date()
  }

  const mockGigs = [
    {
      id: 'gig-1',
      title: 'Web Developer Needed',
      budget: 10000,
      employerId: 'employer-123',
      createdAt: new Date()
    },
    {
      id: 'gig-2',
      title: 'Graphic Designer',
      budget: 8000,
      employerId: 'employer-123',
      createdAt: new Date()
    }
  ]

  const mockApplications = [
    {
      id: 'app-1',
      gigId: 'gig-1',
      applicantId: 'applicant-1',
      applicantName: 'Jane Smith',
      message: 'I am very interested in this position and have 5 years of experience.',
      proposedRate: 5000,
      status: 'pending' as const,
      createdAt: new Date('2024-01-15'),
      gigTitle: 'Web Developer Needed',
      gigBudget: 10000
    }
  ]

  const mockApplications2 = [
    {
      id: 'app-2',
      gigId: 'gig-2',
      applicantId: 'applicant-2',
      applicantName: 'Bob Johnson',
      message: 'I have extensive experience in graphic design.',
      proposedRate: 4500,
      status: 'accepted' as const,
      createdAt: new Date('2024-01-10'),
      gigTitle: 'Graphic Designer',
      gigBudget: 8000
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false
    })
    ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue(mockGigs)
    ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
      if (gigId === 'gig-1') return Promise.resolve(mockApplications)
      if (gigId === 'gig-2') return Promise.resolve(mockApplications2)
      return Promise.resolve([])
    })
  })

  describe('View Profile Button', () => {
    it('should display View Profile button next to applicant name', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
      })

      const viewProfileButtons = screen.getAllByText('👤 View Profile')
      expect(viewProfileButtons).toHaveLength(2) // One for each application
    })

    it('should open profile dialog when View Profile button is clicked', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
      })

      const viewProfileButtons = screen.getAllByText('👤 View Profile')
      fireEvent.click(viewProfileButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('job-seeker-profile-dialog')).toBeInTheDocument()
        expect(screen.getByText('Viewing profile for user: applicant-1')).toBeInTheDocument()
      })
    })

    it('should close profile dialog when Close button is clicked', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
      })

      // Open dialog
      const viewProfileButtons = screen.getAllByText('👤 View Profile')
      fireEvent.click(viewProfileButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('job-seeker-profile-dialog')).toBeInTheDocument()
      })

      // Close dialog
      const closeButton = screen.getByText('Close Dialog')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('job-seeker-profile-dialog')).not.toBeInTheDocument()
      })
    })

    it('should open correct profile when viewing different applicants', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Bob Johnson')).toBeInTheDocument()
      })

      // Click on second applicant's View Profile button
      const viewProfileButtons = screen.getAllByText('👤 View Profile')
      fireEvent.click(viewProfileButtons[1])

      await waitFor(() => {
        expect(screen.getByTestId('job-seeker-profile-dialog')).toBeInTheDocument()
        expect(screen.getByText('Viewing profile for user: applicant-2')).toBeInTheDocument()
      })
    })
  })

  describe('Application Display', () => {
    it('should display all applications for employer', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Applied by Bob Johnson')).toBeInTheDocument()
      })

      expect(screen.getByText('Web Developer Needed')).toBeInTheDocument()
      expect(screen.getByText('Graphic Designer')).toBeInTheDocument()
    })

    it('should display applicant name', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
      })
    })

    it('should display cover letter', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText(/I am very interested in this position/i)).toBeInTheDocument()
      })
    })

    it('should display proposed rate', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        // Check that "Proposed Rate:" labels are displayed (2 applications)
        const proposedRateLabels = screen.getAllByText('Proposed Rate:')
        expect(proposedRateLabels.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should display application status badge', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        // Status appears in both summary stats and status badges
        const pendingElements = screen.getAllByText('Pending')
        expect(pendingElements.length).toBeGreaterThanOrEqual(1)

        const acceptedElements = screen.getAllByText('Accepted')
        expect(acceptedElements.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([])
      ;(GigService.getApplicationsByGig as jest.Mock).mockResolvedValue([])
    })

    it('should display empty state message when no applications exist', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('No Applications Yet')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should display loading state while fetching applications', () => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<ManageApplications />)

      expect(screen.getByText(/Loading applications/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      ;(GigService.getGigsByEmployer as jest.Mock).mockRejectedValue(
        new Error('Failed to load applications')
      )
    })

    it('should display error message when loading fails', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load applications/i)).toBeInTheDocument()
      })
    })
  })

  describe('Unauthorized Access', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false
      })
    })

    it('should show loading state when no user', () => {
      render(<ManageApplications />)

      // When no user is logged in, useEffect returns early without setting loading to false
      // Component stays in loading state
      expect(screen.getByText('Loading applications...')).toBeInTheDocument()
    })
  })

  describe('Job Seeker Access', () => {
    beforeEach(() => {
      const jobSeekerUser = {
        ...mockUser,
        userType: 'job-seeker' as const
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: jobSeekerUser,
        loading: false
      })
      ;(GigService.getGigsByEmployer as jest.Mock).mockResolvedValue([])
    })

    it('should show empty state for job seekers (no gigs as employer)', async () => {
      render(<ManageApplications />)

      // Job seekers won't have employer gigs, so empty state shows after loading completes
      await waitFor(() => {
        expect(screen.getByText('No Applications Yet')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Button Styling and Positioning', () => {
    it('should have View Profile button next to applicant name in header', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
      })

      // Check that View Profile button is in the same container as applicant name
      const applicantNameElements = screen.getAllByText(/Applied by/)
      expect(applicantNameElements).toHaveLength(2)

      const viewProfileButtons = screen.getAllByText('👤 View Profile')
      expect(viewProfileButtons).toHaveLength(2)

      // Button should have appropriate styling classes
      const firstButton = viewProfileButtons[0]
      expect(firstButton).toHaveClass('text-primary-600')
      expect(firstButton).toHaveClass('hover:text-primary-700')
    })
  })

  describe('Payment Flow Improvements', () => {
    describe('Payment Obligations Dashboard', () => {
      it('should display payment obligations dashboard when there are accepted unfunded applications', async () => {
        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('💳 Payment Obligations Dashboard')).toBeInTheDocument()
        })

        expect(screen.getByText(/You have 1 accepted application awaiting payment/i)).toBeInTheDocument()
        expect(screen.getByText('Applications Awaiting Payment')).toBeInTheDocument()
        expect(screen.getByText('Total Payment Obligations')).toBeInTheDocument()
      })

      it('should not display payment dashboard when no accepted unfunded applications', async () => {
        const allFundedApplications = [
          {
            ...mockApplications[0],
            status: 'funded' as const,
            paymentStatus: 'in_escrow' as const
          }
        ]

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve(allFundedApplications)
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          const elements = screen.getAllByText(/Applied by/i)
          expect(elements.length).toBeGreaterThan(0)
        })

        expect(screen.queryByText('💳 Payment Obligations Dashboard')).not.toBeInTheDocument()
      })

      it('should show correct count of unfunded applications in dashboard', async () => {
        const multipleUnfundedApps = [
          mockApplications2[0], // accepted, unfunded
          {
            ...mockApplications[0],
            id: 'app-3',
            status: 'accepted' as const,
            paymentStatus: 'unpaid' as const
          }
        ]

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([multipleUnfundedApps[1]])
          if (gigId === 'gig-2') return Promise.resolve([multipleUnfundedApps[0]])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText(/You have 2 accepted applications awaiting payment/i)).toBeInTheDocument()
        })
      })

      it('should filter to accepted applications when View Unfunded Applications is clicked', async () => {
        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('View Unfunded Applications →')).toBeInTheDocument()
        })

        const viewButton = screen.getByText('View Unfunded Applications →')
        fireEvent.click(viewButton)

        // Should apply accepted filter
        await waitFor(() => {
          // The accepted filter card should be highlighted
          const acceptedCards = screen.getAllByText('Accepted')
          expect(acceptedCards.length).toBeGreaterThan(0)
        })
      })
    })

    describe('Payment Warning Banner for Employers', () => {
      it('should display payment warning banner for accepted unfunded applications', async () => {
        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('⚠️ Payment Required - Please Fund This Project')).toBeInTheDocument()
        })

        expect(screen.getByText(/You've accepted/i)).toBeInTheDocument()
        expect(screen.getByText(/but payment hasn't been funded yet/i)).toBeInTheDocument()
      })

      it('should not display payment warning for funded applications', async () => {
        const fundedApplications = [
          {
            ...mockApplications2[0],
            status: 'funded' as const,
            paymentStatus: 'in_escrow' as const
          }
        ]

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-2') return Promise.resolve(fundedApplications)
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          const elements = screen.getAllByText(/Applied by/i)
          expect(elements.length).toBeGreaterThan(0)
        })

        expect(screen.queryByText('⚠️ Payment Required - Please Fund This Project')).not.toBeInTheDocument()
      })

      it('should show Fund Payment Now button in warning banner', async () => {
        render(<ManageApplications />)

        await waitFor(() => {
          const fundButtons = screen.getAllByText(/💳 Fund Payment Now/i)
          expect(fundButtons.length).toBeGreaterThan(0)
        })
      })

      it('should display payment secured message for funded applications', async () => {
        const fundedApplications = [
          {
            ...mockApplications2[0],
            status: 'funded' as const,
            paymentStatus: 'in_escrow' as const
          }
        ]

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-2') return Promise.resolve(fundedApplications)
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Payment Secured')).toBeInTheDocument()
        })
      })
    })

    describe('Auto Payment Prompt After Acceptance', () => {
      beforeEach(() => {
        jest.useFakeTimers()
        ;(GigService.updateApplicationStatus as jest.Mock).mockResolvedValue(undefined)
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('should open payment dialog automatically after accepting an application', async () => {
        const { act } = await import('@testing-library/react')

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Accept Application')).toBeInTheDocument()
        })

        const acceptButton = screen.getByText('Accept Application')
        fireEvent.click(acceptButton)

        await waitFor(() => {
          expect(GigService.updateApplicationStatus).toHaveBeenCalledWith('app-1', 'accepted')
        })

        // Fast-forward the setTimeout with act()
        await act(async () => {
          jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
          expect(screen.getByText('Payment Dialog')).toBeInTheDocument()
        })
      })

      it('should not open payment dialog when rejecting an application', async () => {
        const { act } = await import('@testing-library/react')

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Reject Application')).toBeInTheDocument()
        })

        const rejectButton = screen.getByText('Reject Application')
        fireEvent.click(rejectButton)

        await waitFor(() => {
          expect(GigService.updateApplicationStatus).toHaveBeenCalledWith('app-1', 'rejected')
        })

        await act(async () => {
          jest.advanceTimersByTime(500)
        })

        // Payment dialog should not appear
        expect(screen.queryByText('Payment Dialog')).not.toBeInTheDocument()
      })
    })
  })
})
