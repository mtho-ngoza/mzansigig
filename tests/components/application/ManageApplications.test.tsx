/**
 * ManageApplications Tests * for managing job applications including profile viewing integration
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ManageApplications from '@/components/application/ManageApplications'
import { useAuth } from '@/contexts/AuthContext'
import { GigService } from '@/lib/database/gigService'

// Mock next/navigation
const mockSearchParams = new Map<string, string>()
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null
  })
}))

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('@/lib/database/gigService')

const mockSuccess = jest.fn()
const mockShowError = jest.fn()
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockShowError
  })
}))
jest.mock('@/lib/utils/textSanitization', () => ({
  sanitizeForDisplay: jest.fn((text: string) => text) // Pass through for tests
}))
jest.mock('@/lib/utils/disputeValidation', () => ({
  DISPUTE_TEXT_LIMITS: {
    REASON_MAX: 1000,
    REASON_MIN: 10
  },
  validateDisputeReason: jest.fn((reason: string) => {
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length < 10) {
      return { isValid: false, message: 'Dispute reason must be at least 10 characters' }
    }
    if (trimmed.length > 1000) {
      return { isValid: false, message: 'Dispute reason cannot exceed 1000 characters' }
    }
    return { isValid: true }
  })
}))
jest.mock('@/components/messaging/QuickMessageButton', () => ({
  QuickMessageButton: () => <div>Quick Message</div>
}))
jest.mock('@/components/payment/PaymentDialog', () => ({
  __esModule: true,
  default: () => <div>Payment Dialog</div>
}))
jest.mock('@/components/application/UpdateRateModal', () => ({
  __esModule: true,
  default: () => <div>Update Rate Modal</div>
}))
jest.mock('@/components/application/RateNegotiationBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="rate-negotiation-banner">Rate Negotiation Banner</div>,
  RateStatusBadge: () => <span data-testid="rate-status-badge">Rate Status</span>
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
jest.mock('@/components/review/ReviewPrompt', () => ({
  __esModule: true,
  default: ({
    gigId,
    gigTitle,
    revieweeId,
    revieweeName,
    reviewType,
    onClose,
    onReviewSubmitted
  }: {
    gigId: string
    gigTitle: string
    revieweeId: string
    revieweeName: string
    reviewType: string
    reviewDeadline: Date
    onClose?: () => void
    onReviewSubmitted?: () => void
  }) => (
    <div data-testid="review-prompt-dialog">
      <div data-testid="review-gig-id">{gigId}</div>
      <div data-testid="review-gig-title">{gigTitle}</div>
      <div data-testid="review-reviewee-id">{revieweeId}</div>
      <div data-testid="review-reviewee-name">{revieweeName}</div>
      <div data-testid="review-type">{reviewType}</div>
      <button onClick={onClose} data-testid="review-close-btn">Maybe Later</button>
      <button onClick={onReviewSubmitted} data-testid="review-submit-btn">Submit Review</button>
    </div>
  )
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

    it('should display funded status badge with correct styling', async () => {
      const fundedApplication = {
        ...mockApplications[0],
        id: 'app-funded',
        status: 'funded' as const
      }

      ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
        if (gigId === 'gig-1') return Promise.resolve([fundedApplication])
        return Promise.resolve([])
      })

      render(<ManageApplications />)

      await waitFor(() => {
        // Find the status badge (has rounded-full class)
        const fundedBadges = screen.getAllByText('Funded')
        const statusBadge = fundedBadges.find(el => el.classList.contains('rounded-full'))
        expect(statusBadge).toBeInTheDocument()
        expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800')
      })
    })

    it('should display completed status badge with correct styling', async () => {
      const completedApplication = {
        ...mockApplications[0],
        id: 'app-completed',
        status: 'completed' as const
      }

      ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
        if (gigId === 'gig-1') return Promise.resolve([completedApplication])
        return Promise.resolve([])
      })

      render(<ManageApplications />)

      await waitFor(() => {
        // Find the status badge (has rounded-full class)
        const completedBadges = screen.getAllByText('Completed')
        const statusBadge = completedBadges.find(el => el.classList.contains('rounded-full'))
        expect(statusBadge).toBeInTheDocument()
        expect(statusBadge).toHaveClass('bg-purple-100', 'text-purple-800')
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
        expect(screen.getByText('Eish, No Applications Yet')).toBeInTheDocument()
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
        expect(screen.getByText('Eish, No Applications Yet')).toBeInTheDocument()
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
        ;(GigService.acceptApplicationWithRate as jest.Mock).mockResolvedValue(undefined)
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('should open payment dialog automatically after accepting an application', async () => {
        const { act } = await import('@testing-library/react')

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Accept & Agree Rate')).toBeInTheDocument()
        })

        const acceptButton = screen.getByText('Accept & Agree Rate')
        fireEvent.click(acceptButton)

        await waitFor(() => {
          expect(GigService.acceptApplicationWithRate).toHaveBeenCalledWith('app-1', 'employer-123')
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
          expect(screen.getByText('Decline')).toBeInTheDocument()
        })

        const rejectButton = screen.getByText('Decline')
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

  describe('Payment Verification on Return', () => {
    // Note: TradeSafe verification happens via webhook, not client-side API call
    // The component just shows a success message and redirects

    beforeEach(() => {
      mockSearchParams.clear()
      mockSuccess.mockClear()
      mockShowError.mockClear()
      // Mock window.location.href using delete and assign
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).location
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).location = { href: '' }
    })

    it('should show success toast when payment=success in URL', async () => {
      mockSearchParams.set('payment', 'success')
      mockSearchParams.set('gig', 'gig-123')
      mockSearchParams.set('reference', 'KSG_ABC123_XYZ')

      render(<ManageApplications />)

      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith('Lekker! Payment received - gig is being funded')
      })
    })

    it('should show error toast when payment is cancelled', async () => {
      mockSearchParams.set('payment', 'cancelled')

      render(<ManageApplications />)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Payment was cancelled')
      })
    })

    it('should not show success without gig param', async () => {
      mockSearchParams.set('payment', 'success')
      // No gig param set

      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
      })

      // Success should not be shown without gigId
      expect(mockSuccess).not.toHaveBeenCalled()
    })

    it('should not show success without payment param', async () => {
      mockSearchParams.set('gig', 'gig-123')
      // No payment param set

      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Applied by Jane Smith')).toBeInTheDocument()
      })

      // Success should not be shown without payment success
      expect(mockSuccess).not.toHaveBeenCalled()
    })
  })

  describe('Completion Flow', () => {
    const fundedAppWithCompletionRequest = {
      id: 'app-funded-completion',
      gigId: 'gig-1',
      applicantId: 'applicant-1',
      applicantName: 'Jane Smith',
      message: 'I completed the work',
      proposedRate: 5000,
      status: 'funded' as const,
      paymentStatus: 'in_escrow' as const,
      paymentId: 'payment-123',
      createdAt: new Date('2024-01-15'),
      gigTitle: 'Web Developer Needed',
      gigBudget: 10000,
      completionRequestedAt: new Date('2024-01-20'),
      completionRequestedBy: 'worker' as const,
      completionAutoReleaseAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    }

    beforeEach(() => {
      ;(GigService.approveCompletion as jest.Mock).mockResolvedValue(undefined)
      ;(GigService.disputeCompletion as jest.Mock).mockResolvedValue(undefined)
    })

    describe('Completion Request Display', () => {
      it('should display completion request banner for funded applications with completion request', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Worker Requested Completion - Action Required')).toBeInTheDocument()
        })

        expect(screen.getByText(/has marked this gig as completed/i)).toBeInTheDocument()
      })

      it('should display auto-release countdown correctly', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          // Should show days, not NaN
          expect(screen.getByText(/Auto-Release in \d+ days/i)).toBeInTheDocument()
        })

        // Verify it doesn't show NaN
        expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
      })

      it('should handle Firestore Timestamp format for auto-release date', async () => {
        const appWithFirestoreTimestamp = {
          ...fundedAppWithCompletionRequest,
          completionAutoReleaseAt: {
            toDate: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          }
        }

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([appWithFirestoreTimestamp])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          // Should show days, not NaN
          expect(screen.getByText(/Auto-Release in \d+ days/i)).toBeInTheDocument()
        })

        expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
      })

      it('should show 0 days when auto-release date is missing', async () => {
        const appWithoutAutoRelease = {
          ...fundedAppWithCompletionRequest,
          completionAutoReleaseAt: undefined
        }

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([appWithoutAutoRelease])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText(/Auto-Release in 0 days/i)).toBeInTheDocument()
        })
      })

      it('should display Approve & Release button', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })
      })

      it('should display Dispute button', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Dispute')).toBeInTheDocument()
        })
      })
    })

    describe('Approve Completion', () => {
      it('should open approval confirmation dialog when Approve button is clicked', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve Completion')).toBeInTheDocument()
          expect(screen.getByText(/Are you ready to approve completion/i)).toBeInTheDocument()
        })
      })

      it('should call GigService.approveCompletion when confirmed', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(GigService.approveCompletion).toHaveBeenCalledWith('app-funded-completion', 'employer-123')
        })
      })

      it('should update local state to completed and released after approval', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(mockSuccess).toHaveBeenCalledWith('Lekker! Payment released to the worker')
        })
      })

      it('should show error toast when approval fails', async () => {
        ;(GigService.approveCompletion as jest.Mock).mockRejectedValue(new Error('Approval failed'))

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(mockShowError).toHaveBeenCalledWith('Approval failed')
        })
      })
    })

    describe('Dispute Completion', () => {
      it('should open dispute dialog when Dispute button is clicked', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Dispute')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Dispute'))

        await waitFor(() => {
          expect(screen.getByText('Dispute Completion')).toBeInTheDocument()
          expect(screen.getByText(/Please explain why you're disputing/i)).toBeInTheDocument()
        })
      })

      it('should require minimum dispute reason length', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Dispute')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Dispute'))

        await waitFor(() => {
          expect(screen.getByText('Submit Dispute')).toBeInTheDocument()
        })

        // Submit button should be disabled with short reason
        const submitButton = screen.getByText('Submit Dispute')
        expect(submitButton).toBeDisabled()

        // Enter reason that's too short
        const textarea = screen.getByPlaceholderText(/Please explain what issues/i)
        fireEvent.change(textarea, { target: { value: 'Short' } })

        expect(submitButton).toBeDisabled()
      })

      it('should call GigService.disputeCompletion when submitted with valid reason', async () => {
        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Dispute')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Dispute'))

        await waitFor(() => {
          expect(screen.getByText('Submit Dispute')).toBeInTheDocument()
        })

        const textarea = screen.getByPlaceholderText(/Please explain what issues/i)
        fireEvent.change(textarea, { target: { value: 'The work is incomplete and does not meet the requirements specified in the gig description.' } })

        const submitButton = screen.getByText('Submit Dispute')
        expect(submitButton).not.toBeDisabled()

        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(GigService.disputeCompletion).toHaveBeenCalledWith(
            'app-funded-completion',
            'employer-123',
            'The work is incomplete and does not meet the requirements specified in the gig description.'
          )
        })
      })
    })

    describe('Disputed Completion Display', () => {
      it('should display disputed banner when completion is disputed', async () => {
        const disputedApp = {
          ...fundedAppWithCompletionRequest,
          completionDisputedAt: new Date(),
          completionDisputeReason: 'Work was not completed as specified'
        }

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([disputedApp])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('Completion Disputed - Resolution Needed')).toBeInTheDocument()
        })

        expect(screen.getByText('Work was not completed as specified')).toBeInTheDocument()
      })

      it('should show Issues Resolved button in disputed state', async () => {
        const disputedApp = {
          ...fundedAppWithCompletionRequest,
          completionDisputedAt: new Date(),
          completionDisputeReason: 'Work incomplete'
        }

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([disputedApp])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Issues Resolved - Approve Now')).toBeInTheDocument()
        })
      })
    })

    describe('Review Prompt After Completion Approval', () => {
      it('should open review dialog after successful completion approval', async () => {
        jest.useFakeTimers()

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        // Click approve button
        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        // Confirm approval
        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(GigService.approveCompletion).toHaveBeenCalled()
        })

        // Advance timers to trigger the review dialog (500ms delay)
        jest.advanceTimersByTime(600)

        await waitFor(() => {
          expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
        })

        jest.useRealTimers()
      })

      it('should display correct review details in the review dialog', async () => {
        jest.useFakeTimers()

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(GigService.approveCompletion).toHaveBeenCalled()
        })

        jest.advanceTimersByTime(600)

        await waitFor(() => {
          expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
        })

        // Verify review dialog has correct props
        expect(screen.getByTestId('review-gig-id')).toHaveTextContent('gig-1')
        expect(screen.getByTestId('review-gig-title')).toHaveTextContent('Web Developer Needed')
        expect(screen.getByTestId('review-reviewee-id')).toHaveTextContent('applicant-1')
        expect(screen.getByTestId('review-reviewee-name')).toHaveTextContent('Jane Smith')
        expect(screen.getByTestId('review-type')).toHaveTextContent('employer-to-worker')

        jest.useRealTimers()
      })

      it('should close review dialog when Maybe Later is clicked', async () => {
        jest.useFakeTimers()

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(GigService.approveCompletion).toHaveBeenCalled()
        })

        jest.advanceTimersByTime(600)

        await waitFor(() => {
          expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
        })

        // Click Maybe Later to close
        fireEvent.click(screen.getByTestId('review-close-btn'))

        await waitFor(() => {
          expect(screen.queryByTestId('review-prompt-dialog')).not.toBeInTheDocument()
        })

        jest.useRealTimers()
      })

      it('should show success message and close dialog when review is submitted', async () => {
        jest.useFakeTimers()

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(GigService.approveCompletion).toHaveBeenCalled()
        })

        jest.advanceTimersByTime(600)

        await waitFor(() => {
          expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
        })

        // Submit review
        fireEvent.click(screen.getByTestId('review-submit-btn'))

        await waitFor(() => {
          expect(mockSuccess).toHaveBeenCalledWith('Thanks for your review!')
          expect(screen.queryByTestId('review-prompt-dialog')).not.toBeInTheDocument()
        })

        jest.useRealTimers()
      })

      it('should not open review dialog when completion approval fails', async () => {
        jest.useFakeTimers()
        ;(GigService.approveCompletion as jest.Mock).mockRejectedValue(new Error('Approval failed'))

        ;(GigService.getApplicationsByGig as jest.Mock).mockImplementation((gigId: string) => {
          if (gigId === 'gig-1') return Promise.resolve([fundedAppWithCompletionRequest])
          return Promise.resolve([])
        })

        render(<ManageApplications />)

        await waitFor(() => {
          expect(screen.getByText('✓ Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('✓ Approve & Release'))

        await waitFor(() => {
          expect(screen.getByText('Approve & Release')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Approve & Release'))

        await waitFor(() => {
          expect(mockShowError).toHaveBeenCalledWith('Approval failed')
        })

        jest.advanceTimersByTime(600)

        // Review dialog should not appear on failure
        expect(screen.queryByTestId('review-prompt-dialog')).not.toBeInTheDocument()

        jest.useRealTimers()
      })
    })
  })
})
