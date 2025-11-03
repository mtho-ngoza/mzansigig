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
      coverLetter: 'I am very interested in this position and have 5 years of experience.',
      proposedRate: 5000,
      status: 'pending' as const,
      createdAt: new Date('2024-01-15')
    }
  ]

  const mockApplications2 = [
    {
      id: 'app-2',
      gigId: 'gig-2',
      applicantId: 'applicant-2',
      applicantName: 'Bob Johnson',
      coverLetter: 'I have extensive experience in graphic design.',
      proposedRate: 4500,
      status: 'accepted' as const,
      createdAt: new Date('2024-01-10')
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
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      const viewProfileButtons = screen.getAllByText('👤 View Profile')
      expect(viewProfileButtons).toHaveLength(2) // One for each application
    })

    it('should open profile dialog when View Profile button is clicked', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
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
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
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
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
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
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      })

      expect(screen.getByText('Web Developer Needed')).toBeInTheDocument()
      expect(screen.getByText('Graphic Designer')).toBeInTheDocument()
    })

    it('should display applicant contact information', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('jane@example.com')).toBeInTheDocument()
        expect(screen.getByText('+27987654321')).toBeInTheDocument()
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
        expect(screen.getByText(/R5,000/i)).toBeInTheDocument()
      })
    })

    it('should display application status badge', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('Accepted')).toBeInTheDocument()
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
        expect(screen.getByText(/No applications yet/i)).toBeInTheDocument()
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

    it('should display unauthorized message when user is not logged in', () => {
      render(<ManageApplications />)

      expect(screen.getByText(/Please log in to view applications/i)).toBeInTheDocument()
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
    })

    it('should display unauthorized message for job seekers', () => {
      render(<ManageApplications />)

      expect(screen.getByText(/Only employers can view this page/i)).toBeInTheDocument()
    })
  })

  describe('Button Styling and Positioning', () => {
    it('should have View Profile button next to applicant name in header', async () => {
      render(<ManageApplications />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
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
})
