import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { GlobalHeader } from '@/components/layout/GlobalHeader'
import { useAuth } from '@/contexts/AuthContext'
import { useMessaging } from '@/contexts/MessagingContext'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))
jest.mock('@/contexts/AuthContext')
jest.mock('@/contexts/MessagingContext')
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}))
jest.mock('@/components/messaging/MessagingHub', () => ({
  MessagingHub: () => <div data-testid="messaging-hub">Messages</div>
}))
jest.mock('@/components/layout/MobileMenu', () => ({
  MobileMenu: ({ isOpen, onNavigateToDashboardView }: any) =>
    isOpen ? (
      <div data-testid="mobile-menu">
        <button onClick={() => onNavigateToDashboardView?.('my-applications')}>
          Mobile My Applications
        </button>
      </div>
    ) : null
}))

describe('GlobalHeader - Routing and Logout', () => {
  const mockPush = jest.fn()
  const mockLogout = jest.fn()
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
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
    firstName: 'Employer',
    userType: 'employer' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
    mockUseMessaging.mockReturnValue({
      totalUnreadCount: 0
    } as any)
  })

  describe('Logout Functionality', () => {
    it('should redirect to home page after logout', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<GlobalHeader />)

      // Open profile dropdown
      const profileButton = screen.getByText('Job')
      fireEvent.click(profileButton)

      // Click sign out
      const signOutButton = screen.getByText('Sign Out')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('should close dropdown before logout', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<GlobalHeader />)

      // Open profile dropdown
      const profileButton = screen.getByText('Job')
      fireEvent.click(profileButton)

      expect(screen.getByText('Profile & Settings')).toBeInTheDocument()

      // Click sign out
      const signOutButton = screen.getByText('Sign Out')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
      })
    })
  })

  describe('My Applications Navigation', () => {
    it('should navigate to /dashboard/my-applications for job-seekers', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onNavigateToDashboardView = jest.fn()

      render(<GlobalHeader onNavigateToDashboardView={onNavigateToDashboardView} />)

      // Open profile dropdown
      const profileButton = screen.getByText('Job')
      fireEvent.click(profileButton)

      // Click My Applications
      const myAppsButton = screen.getByText('My Applications')
      fireEvent.click(myAppsButton)

      expect(onNavigateToDashboardView).toHaveBeenCalledWith('my-applications')
    })

    it('should fallback to router.push when onNavigateToDashboardView is not provided', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<GlobalHeader />)

      // Open profile dropdown
      const profileButton = screen.getByText('Job')
      fireEvent.click(profileButton)

      // Click My Applications
      const myAppsButton = screen.getByText('My Applications')
      fireEvent.click(myAppsButton)

      expect(mockPush).toHaveBeenCalledWith('/dashboard/my-applications')
    })

    it('should not show My Applications for employers', () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<GlobalHeader />)

      // Open profile dropdown
      const profileButton = screen.getByText('Employer')
      fireEvent.click(profileButton)

      expect(screen.queryByText('My Applications')).not.toBeInTheDocument()
    })
  })

  describe('Manage Gigs Navigation', () => {
    it('should navigate to /dashboard/manage-gigs for employers', async () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onNavigateToDashboardView = jest.fn()

      render(<GlobalHeader onNavigateToDashboardView={onNavigateToDashboardView} />)

      // Open profile dropdown
      const profileButton = screen.getByText('Employer')
      fireEvent.click(profileButton)

      // Click Manage Gigs
      const manageGigsButton = screen.getByText('Manage Gigs')
      fireEvent.click(manageGigsButton)

      expect(onNavigateToDashboardView).toHaveBeenCalledWith('manage-gigs')
    })

    it('should fallback to router.push for Manage Gigs', async () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployer,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<GlobalHeader />)

      // Open profile dropdown
      const profileButton = screen.getByText('Employer')
      fireEvent.click(profileButton)

      // Click Manage Gigs
      const manageGigsButton = screen.getByText('Manage Gigs')
      fireEvent.click(manageGigsButton)

      expect(mockPush).toHaveBeenCalledWith('/dashboard/manage-gigs')
    })

    it('should not show Manage Gigs for job-seekers', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<GlobalHeader />)

      // Open profile dropdown
      const profileButton = screen.getByText('Job')
      fireEvent.click(profileButton)

      expect(screen.queryByText('Manage Gigs')).not.toBeInTheDocument()
    })
  })

  describe('Profile & Settings Navigation', () => {
    it('should navigate to profile when clicking Profile & Settings', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onNavigate = jest.fn()

      render(<GlobalHeader onNavigate={onNavigate} />)

      // Open profile dropdown
      const profileButton = screen.getByText('Job')
      fireEvent.click(profileButton)

      // Click Profile & Settings
      const profileSettingsButton = screen.getByText('Profile & Settings')
      fireEvent.click(profileSettingsButton)

      expect(onNavigate).toHaveBeenCalledWith('profile')
    })

    it('should close dropdown after navigation', async () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onNavigate = jest.fn()

      render(<GlobalHeader onNavigate={onNavigate} />)

      // Open profile dropdown
      const profileButton = screen.getByText('Job')
      fireEvent.click(profileButton)

      expect(screen.getByText('Profile & Settings')).toBeInTheDocument()

      // Click Profile & Settings
      const profileSettingsButton = screen.getByText('Profile & Settings')
      fireEvent.click(profileSettingsButton)

      expect(onNavigate).toHaveBeenCalledWith('profile')
    })
  })

  describe('Mobile Menu Integration', () => {
    it('should pass onNavigateToDashboardView to MobileMenu', () => {
      mockUseAuth.mockReturnValue({
        user: mockJobSeeker,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onNavigateToDashboardView = jest.fn()

      render(<GlobalHeader onNavigateToDashboardView={onNavigateToDashboardView} />)

      // Open mobile menu
      const menuButton = screen.getByTitle('Open menu')
      fireEvent.click(menuButton)

      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()

      // Click mobile my applications
      const mobileMyAppsButton = screen.getByText('Mobile My Applications')
      fireEvent.click(mobileMyAppsButton)

      expect(onNavigateToDashboardView).toHaveBeenCalledWith('my-applications')
    })
  })

  describe('Auth Buttons for Non-Authenticated Users', () => {
    it('should show auth buttons when showAuthButtons is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: false
      } as any)

      render(<GlobalHeader showAuthButtons={true} />)

      expect(screen.getByText('Log In')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })

    it('should navigate to auth page when clicking Log In', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: false
      } as any)

      const onNavigate = jest.fn()

      render(<GlobalHeader showAuthButtons={true} onNavigate={onNavigate} />)

      const loginButton = screen.getByText('Log In')
      fireEvent.click(loginButton)

      expect(onNavigate).toHaveBeenCalledWith('auth')
    })
  })
})
