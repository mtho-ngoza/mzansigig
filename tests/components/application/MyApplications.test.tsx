/**
 * MyApplications Tests
 * Tests for worker applications including review flow after completion
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MyApplications from '@/components/application/MyApplications'
import { useAuth } from '@/contexts/AuthContext'
import { GigService } from '@/lib/database/gigService'

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
  sanitizeForDisplay: jest.fn((text: string) => text)
}))
jest.mock('@/components/messaging/QuickMessageButton', () => ({
  QuickMessageButton: ({ children }: { children?: React.ReactNode }) => (
    <button data-testid="quick-message-btn">{children || 'Quick Message'}</button>
  )
}))
jest.mock('@/components/gig/GigAmountDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="gig-amount-display">Amount Display</div>
}))
jest.mock('@/components/application/UpdateRateModal', () => ({
  __esModule: true,
  default: () => <div data-testid="update-rate-modal">Update Rate Modal</div>
}))
jest.mock('@/components/application/RateNegotiationBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="rate-negotiation-banner">Rate Negotiation Banner</div>,
  RateStatusBadge: () => <span data-testid="rate-status-badge">Rate Status</span>
}))
jest.mock('@/components/application/RateNegotiationQuickMessages', () => ({
  __esModule: true,
  default: () => <div data-testid="rate-negotiation-quick-messages">Rate Quick Messages</div>
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

describe('MyApplications', () => {
  const mockWorker = {
    id: 'worker-123',
    email: 'worker@example.com',
    firstName: 'Jane',
    lastName: 'Worker',
    userType: 'job-seeker' as const,
    phone: '+27123456789',
    location: 'Johannesburg',
    createdAt: new Date()
  }

  const pendingApplication = {
    id: 'app-pending',
    gigId: 'gig-1',
    applicantId: 'worker-123',
    applicantName: 'Jane Worker',
    message: 'I am interested in this gig.',
    proposedRate: 5000,
    status: 'pending' as const,
    createdAt: new Date('2024-01-15'),
    gigTitle: 'Web Developer Needed',
    gigEmployer: 'John Employer',
    gigEmployerId: 'employer-123',
    gigBudget: 10000
  }

  const acceptedApplication = {
    id: 'app-accepted',
    gigId: 'gig-2',
    applicantId: 'worker-123',
    applicantName: 'Jane Worker',
    message: 'I have experience in this field.',
    proposedRate: 4500,
    status: 'accepted' as const,
    paymentStatus: 'unpaid' as const,
    createdAt: new Date('2024-01-10'),
    gigTitle: 'Graphic Design Project',
    gigEmployer: 'Bob Client',
    gigEmployerId: 'employer-456',
    gigBudget: 8000
  }

  const fundedApplication = {
    id: 'app-funded',
    gigId: 'gig-3',
    applicantId: 'worker-123',
    applicantName: 'Jane Worker',
    message: 'Ready to work on this.',
    proposedRate: 6000,
    status: 'funded' as const,
    paymentStatus: 'in_escrow' as const,
    createdAt: new Date('2024-01-05'),
    gigTitle: 'App Development',
    gigEmployer: 'Tech Corp',
    gigEmployerId: 'employer-789',
    gigBudget: 12000
  }

  const completedApplication = {
    id: 'app-completed',
    gigId: 'gig-4',
    applicantId: 'worker-123',
    applicantName: 'Jane Worker',
    message: 'Completed this successfully.',
    proposedRate: 7000,
    agreedRate: 7000,
    status: 'completed' as const,
    paymentStatus: 'released' as const,
    createdAt: new Date('2024-01-01'),
    gigTitle: 'Website Redesign',
    gigEmployer: 'Design Agency',
    gigEmployerId: 'employer-completed',
    gigBudget: 15000
  }

  const mockGigs = {
    'gig-1': {
      id: 'gig-1',
      title: 'Web Developer Needed',
      budget: 10000,
      employerId: 'employer-123',
      employerName: 'John Employer'
    },
    'gig-2': {
      id: 'gig-2',
      title: 'Graphic Design Project',
      budget: 8000,
      employerId: 'employer-456',
      employerName: 'Bob Client'
    },
    'gig-3': {
      id: 'gig-3',
      title: 'App Development',
      budget: 12000,
      employerId: 'employer-789',
      employerName: 'Tech Corp'
    },
    'gig-4': {
      id: 'gig-4',
      title: 'Website Redesign',
      budget: 15000,
      employerId: 'employer-completed',
      employerName: 'Design Agency'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockWorker,
      loading: false
    })
    ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([])
    ;(GigService.getGigById as jest.Mock).mockImplementation((gigId: string) => {
      return Promise.resolve(mockGigs[gigId as keyof typeof mockGigs] || null)
    })
  })

  describe('Basic Rendering', () => {
    it('should render loading state initially', () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading
      )

      render(<MyApplications />)

      expect(screen.getByText('Loading your applications...')).toBeInTheDocument()
    })

    it('should render empty state when no applications', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Eish, No Applications Yet')).toBeInTheDocument()
      })
    })

    it('should render applications list when applications exist', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([pendingApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Web Developer Needed')).toBeInTheDocument()
      })
    })
  })

  describe('Application Status Display', () => {
    it('should display pending application with withdraw button', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([pendingApplication])

      render(<MyApplications />)

      await waitFor(() => {
        // Use getAllByText since 'Pending' appears in both filter card and status badge
        const pendingElements = screen.getAllByText('Pending')
        expect(pendingElements.length).toBeGreaterThan(0)
        expect(screen.getByText('Withdraw Application')).toBeInTheDocument()
      })
    })

    it('should display accepted application with payment warning when unfunded', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([acceptedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        // Use getAllByText since 'Accepted' appears in both filter card and status badge
        const acceptedElements = screen.getAllByText('Accepted')
        expect(acceptedElements.length).toBeGreaterThan(0)
        expect(screen.getByText(/PAYMENT NOT FUNDED/i)).toBeInTheDocument()
      })
    })

    it('should display funded application with completion request option', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([fundedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        // Use getAllByText since 'Funded' appears in both filter card and status badge
        const fundedElements = screen.getAllByText('Funded')
        expect(fundedElements.length).toBeGreaterThan(0)
        expect(screen.getByText('Request Completion')).toBeInTheDocument()
      })
    })

    it('should display completed application with payment released message', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([completedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        // Use getAllByText since 'Completed' appears in both filter card and status badge
        const completedElements = screen.getAllByText('Completed')
        expect(completedElements.length).toBeGreaterThan(0)
        expect(screen.getByText('Gig Completed - Payment Released')).toBeInTheDocument()
      })
    })
  })

  describe('Review Flow for Completed Applications', () => {
    it('should display Leave Review button for completed applications', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([completedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Gig Completed - Payment Released')).toBeInTheDocument()
      })

      expect(screen.getByText(/Leave Review for Employer/i)).toBeInTheDocument()
    })

    it('should open review dialog when Leave Review button is clicked', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([completedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText(/Leave Review for Employer/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/Leave Review for Employer/i))

      await waitFor(() => {
        expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
      })
    })

    it('should display correct review details in the review dialog', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([completedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText(/Leave Review for Employer/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/Leave Review for Employer/i))

      await waitFor(() => {
        expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
      })

      // Verify review dialog has correct props
      expect(screen.getByTestId('review-gig-id')).toHaveTextContent('gig-4')
      expect(screen.getByTestId('review-gig-title')).toHaveTextContent('Website Redesign')
      expect(screen.getByTestId('review-reviewee-id')).toHaveTextContent('employer-completed')
      expect(screen.getByTestId('review-reviewee-name')).toHaveTextContent('Design Agency')
      expect(screen.getByTestId('review-type')).toHaveTextContent('worker-to-employer')
    })

    it('should close review dialog when Maybe Later is clicked', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([completedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText(/Leave Review for Employer/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/Leave Review for Employer/i))

      await waitFor(() => {
        expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('review-close-btn'))

      await waitFor(() => {
        expect(screen.queryByTestId('review-prompt-dialog')).not.toBeInTheDocument()
      })
    })

    it('should show success message and close dialog when review is submitted', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([completedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText(/Leave Review for Employer/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/Leave Review for Employer/i))

      await waitFor(() => {
        expect(screen.getByTestId('review-prompt-dialog')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('review-submit-btn'))

      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith('Thanks for your review!')
        expect(screen.queryByTestId('review-prompt-dialog')).not.toBeInTheDocument()
      })
    })

    it('should not show Leave Review button for applications without employer ID', async () => {
      const completedWithoutEmployerId = {
        ...completedApplication,
        gigId: 'gig-no-employer'
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([completedWithoutEmployerId])
      // Mock gig without employer ID
      ;(GigService.getGigById as jest.Mock).mockImplementation((gigId: string) => {
        if (gigId === 'gig-no-employer') {
          return Promise.resolve({
            id: 'gig-no-employer',
            title: 'Gig Without Employer',
            budget: 5000,
            employerId: undefined, // No employer ID
            employerName: undefined
          })
        }
        return Promise.resolve(mockGigs[gigId as keyof typeof mockGigs] || null)
      })

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Gig Completed - Payment Released')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Leave Review for Employer/i)).not.toBeInTheDocument()
    })

    it('should not show Leave Review button for non-completed applications', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([fundedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        // Use getAllByText since 'Funded' appears in both filter card and status badge
        const fundedElements = screen.getAllByText('Funded')
        expect(fundedElements.length).toBeGreaterThan(0)
      })

      expect(screen.queryByText(/Leave Review for Employer/i)).not.toBeInTheDocument()
    })
  })

  describe('Completion Request Flow', () => {
    it('should open completion request dialog when Request Completion is clicked', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([fundedApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Request Completion')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Request Completion'))

      await waitFor(() => {
        expect(screen.getByText(/Are you ready to request completion/i)).toBeInTheDocument()
      })
    })

    it('should call GigService.requestCompletionByWorker when confirmed', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([fundedApplication])
      ;(GigService.requestCompletionByWorker as jest.Mock).mockResolvedValue(undefined)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Request Completion')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Request Completion'))

      await waitFor(() => {
        expect(screen.getByText('Yes, Request Completion')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Yes, Request Completion'))

      await waitFor(() => {
        expect(GigService.requestCompletionByWorker).toHaveBeenCalledWith('app-funded', 'worker-123')
      })
    })

    it('should show success message after completion request', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([fundedApplication])
      ;(GigService.requestCompletionByWorker as jest.Mock).mockResolvedValue(undefined)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Request Completion')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Request Completion'))

      await waitFor(() => {
        expect(screen.getByText('Yes, Request Completion')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Yes, Request Completion'))

      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith('Lekker! Completion request sent. The employer has 7 days to respond')
      })
    })

    it('should display completion requested banner after request is made', async () => {
      const fundedWithCompletionRequest = {
        ...fundedApplication,
        completionRequestedAt: new Date(),
        completionAutoReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([fundedWithCompletionRequest])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Completion Requested - Awaiting Employer Response')).toBeInTheDocument()
      })

      expect(screen.getByText(/Auto-Release Escrow/i)).toBeInTheDocument()
    })
  })

  describe('Withdraw Application', () => {
    it('should open withdraw confirmation dialog when Withdraw is clicked', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([pendingApplication])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Withdraw Application')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Withdraw Application'))

      await waitFor(() => {
        expect(screen.getByText('Confirm Withdrawal')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to withdraw/i)).toBeInTheDocument()
      })
    })

    it('should call GigService.withdrawApplication when confirmed', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([pendingApplication])
      ;(GigService.withdrawApplication as jest.Mock).mockResolvedValue(undefined)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Withdraw Application')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Withdraw Application'))

      await waitFor(() => {
        expect(screen.getByText('Yes, Withdraw')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Yes, Withdraw'))

      await waitFor(() => {
        expect(GigService.withdrawApplication).toHaveBeenCalledWith('app-pending')
      })
    })
  })

  describe('Status Filters', () => {
    it('should display status filter cards with correct counts', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([
        pendingApplication,
        acceptedApplication,
        fundedApplication,
        completedApplication
      ])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Total')).toBeInTheDocument()
      })

      // Check filter counts
      const totalCard = screen.getByText('Total').closest('div')
      expect(totalCard?.parentElement).toHaveTextContent('4')
    })

    it('should filter applications when filter card is clicked', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([
        pendingApplication,
        completedApplication
      ])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Web Developer Needed')).toBeInTheDocument()
        expect(screen.getByText('Website Redesign')).toBeInTheDocument()
      })

      // Click on Completed filter card - use getAllByText and find the filter card
      const completedElements = screen.getAllByText('Completed')
      // The first one should be in the filter card (before the application cards)
      const filterCard = completedElements[0].closest('div[class*="cursor-pointer"]')
      if (filterCard) {
        fireEvent.click(filterCard)
      }

      await waitFor(() => {
        expect(screen.getByText('Website Redesign')).toBeInTheDocument()
        expect(screen.queryByText('Web Developer Needed')).not.toBeInTheDocument()
      })
    })
  })
})
