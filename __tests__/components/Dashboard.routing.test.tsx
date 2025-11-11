import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dashboard from '@/components/Dashboard'
import { useAuth } from '@/contexts/AuthContext'
import { useMessaging } from '@/contexts/MessagingContext'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('@/contexts/MessagingContext')
jest.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, backButton }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {backButton && <button onClick={backButton.onClick}>Back</button>}
    </div>
  )
}))
jest.mock('@/components/gig/PostGigPage', () => ({
  __esModule: true,
  default: ({ onBack }: any) => (
    <div data-testid="post-gig-page">
      <button onClick={onBack}>Back</button>
    </div>
  )
}))
jest.mock('@/components/gig/ManageGigs', () => ({
  __esModule: true,
  default: () => <div data-testid="manage-gigs">Manage Gigs</div>
}))
jest.mock('@/components/application/MyApplications', () => ({
  __esModule: true,
  default: () => <div data-testid="my-applications">My Applications</div>
}))
jest.mock('@/components/application/ManageApplications', () => ({
  __esModule: true,
  default: () => <div data-testid="manage-applications">Manage Applications</div>
}))
jest.mock('@/components/profile/ProfileManagement', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-management">Profile</div>
}))
jest.mock('@/components/messaging/MessagingHub', () => ({
  MessagingHub: () => <div data-testid="messaging-hub">Messages</div>
}))
jest.mock('@/components/payment/PaymentDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="payment-dashboard">Payments</div>
}))
jest.mock('@/components/payment/EmployerPaymentDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="employer-payment-dashboard">Employer Payments</div>
}))
jest.mock('@/components/BrowseTalent', () => ({
  __esModule: true,
  default: () => <div data-testid="browse-talent">Browse Talent</div>
}))

describe('Dashboard - Routing and URL Synchronization', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
  const mockUseMessaging = useMessaging as jest.MockedFunction<typeof useMessaging>

  const mockJobSeeker = {
    id: '1',
    email: 'jobseeker@test.com',
    firstName: 'Job',
    lastName: 'Seeker',
    userType: 'job-seeker' as const,
    phoneNumber: '1234567890',
    idNumber: '1234567890123',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockEmployer = {
    ...mockJobSeeker,
    userType: 'employer' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMessaging.mockReturnValue({
      totalUnreadCount: 0
    } as any)
  })

  describe('Initial View Loading', () => {
    it('should render dashboard view by default', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard />)

      // Dashboard main view shows action buttons and welcome message
      expect(screen.getByText(/Get Started/i)).toBeInTheDocument()
    })

    it('should load my-applications view when initialView is provided', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard initialView="my-applications" />)

      expect(screen.getByTestId('my-applications')).toBeInTheDocument()
    })

    it('should load payments view when initialView is payments', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard initialView="payments" />)

      expect(screen.getByTestId('payment-dashboard')).toBeInTheDocument()
    })

    it('should load manage-gigs view when initialView is provided', () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard initialView="manage-gigs" />)

      expect(screen.getByTestId('manage-gigs')).toBeInTheDocument()
    })
  })

  describe('View Change Callback', () => {
    it('should call onViewChange when view changes', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onViewChange = jest.fn()

      render(<Dashboard onViewChange={onViewChange} />)

      // Find and click the "My Applications" button in the dashboard
      const myAppsButton = screen.getAllByText(/my applications/i)[0]
      fireEvent.click(myAppsButton)

      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('my-applications')
      })
    })

    it('should call onViewChange when navigating to profile', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onViewChange = jest.fn()

      render(<Dashboard onViewChange={onViewChange} />)

      // Find and click profile button
      const profileButton = screen.getAllByText(/profile/i)[0]
      fireEvent.click(profileButton)

      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('profile')
      })
    })

    it('should call onViewChange when employer navigates to manage-gigs', async () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onViewChange = jest.fn()

      render(<Dashboard onViewChange={onViewChange} />)

      const manageGigsButton = screen.getAllByText(/manage gigs/i)[0]
      fireEvent.click(manageGigsButton)

      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('manage-gigs')
      })
    })
  })

  describe('View Synchronization', () => {
    it('should update view when initialView prop changes', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const { rerender } = render(<Dashboard initialView="dashboard" />)

      expect(screen.getByText(/Get Started/i)).toBeInTheDocument()

      // Update initialView
      rerender(<Dashboard initialView="my-applications" />)

      expect(screen.getByTestId('my-applications')).toBeInTheDocument()
    })

    it('should maintain view state when initialView does not change', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const { rerender } = render(<Dashboard initialView="payments" />)

      expect(screen.getByTestId('payment-dashboard')).toBeInTheDocument()

      // Rerender with same initialView
      rerender(<Dashboard initialView="payments" />)

      expect(screen.getByTestId('payment-dashboard')).toBeInTheDocument()
    })
  })

  describe('Back Navigation', () => {
    it('should call onViewChange with dashboard when navigating back from my-applications', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onViewChange = jest.fn()

      render(<Dashboard initialView="my-applications" onViewChange={onViewChange} />)

      const backButton = screen.getByText('Back')
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('dashboard')
      })
    })

    it('should call onViewChange with dashboard when navigating back from post-gig', async () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onViewChange = jest.fn()

      render(<Dashboard initialView="post-gig" onViewChange={onViewChange} />)

      const backButton = screen.getByText('Back')
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('dashboard')
      })
    })
  })

  describe('Message Conversation Handling', () => {
    it('should navigate to messages view when conversation ID is provided', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard initialMessageConversationId="conv-123" />)

      expect(screen.getByTestId('messaging-hub')).toBeInTheDocument()
    })

    it('should update to messages view when conversation starts', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onViewChange = jest.fn()

      const { rerender } = render(<Dashboard onViewChange={onViewChange} />)

      rerender(<Dashboard initialMessageConversationId="conv-456" onViewChange={onViewChange} />)

      // Should call onViewChange with messages
      expect(onViewChange).toHaveBeenCalledWith('messages')
    })
  })

  describe('User Type Specific Views', () => {
    it('should show employer-specific payment dashboard for employers', () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard initialView="payments" />)

      expect(screen.getByTestId('employer-payment-dashboard')).toBeInTheDocument()
    })

    it('should show job-seeker payment dashboard for job-seekers', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard initialView="payments" />)

      expect(screen.getByTestId('payment-dashboard')).toBeInTheDocument()
    })

    it('should show browse-talent for employers', () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<Dashboard initialView="browse-talent" />)

      expect(screen.getByTestId('browse-talent')).toBeInTheDocument()
    })
  })
})
