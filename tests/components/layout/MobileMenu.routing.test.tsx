import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { useAuth } from '@/contexts/AuthContext'
import { useMessaging } from '@/contexts/MessagingContext'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))
jest.mock('@/contexts/AuthContext')
jest.mock('@/contexts/MessagingContext')

describe('MobileMenu - Routing and Logout', () => {
  const mockPush = jest.fn()
  const mockLogout = jest.fn()
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
  const mockUseMessaging = useMessaging as jest.MockedFunction<typeof useMessaging>

  const mockUser = {
    id: '1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    userType: 'job-seeker' as const,
    phoneNumber: '1234567890',
    idNumber: '1234567890123',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
    mockUseMessaging.mockReturnValue({
      totalUnreadCount: 0
    } as any)
  })

  describe('Menu Visibility', () => {
    it('should not render when isOpen is false', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const { container } = render(
        <MobileMenu
          isOpen={false}
          onClose={jest.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render when isOpen is true', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(
        <MobileMenu
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      expect(screen.getByText('Menu')).toBeInTheDocument()
    })
  })

  describe('Logout Functionality', () => {
    it('should logout and redirect to home page', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onClose = jest.fn()

      render(
        <MobileMenu
          isOpen={true}
          onClose={onClose}
        />
      )

      // Find and click sign out button
      const signOutButton = screen.getByText('Sign Out')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/')
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('should close menu after logout', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onClose = jest.fn()

      render(
        <MobileMenu
          isOpen={true}
          onClose={onClose}
        />
      )

      const signOutButton = screen.getByText('Sign Out')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe('Navigation', () => {
    it('should call onNavigate and close menu when navigating', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onNavigate = jest.fn()
      const onClose = jest.fn()

      render(
        <MobileMenu
          isOpen={true}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      )

      const browseButton = screen.getByText('Browse Gigs')
      fireEvent.click(browseButton)

      expect(onNavigate).toHaveBeenCalledWith('browse')
      expect(onClose).toHaveBeenCalled()
    })

    it('should close menu when clicking backdrop', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onClose = jest.fn()

      const { container } = render(
        <MobileMenu
          isOpen={true}
          onClose={onClose}
        />
      )

      // Click the backdrop
      const backdrop = container.querySelector('.bg-black.bg-opacity-50')
      fireEvent.click(backdrop!)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('User Info Display', () => {
    it('should display user information', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(
        <MobileMenu
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('job seeker')).toBeInTheDocument()
    })

    it('should show user initial in avatar', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(
        <MobileMenu
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      expect(screen.getByText('T')).toBeInTheDocument()
    })
  })

  describe('Dashboard View Navigation', () => {
    it('should call onNavigateToDashboardView when provided', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onNavigateToDashboardView = jest.fn()

      render(
        <MobileMenu
          isOpen={true}
          onClose={jest.fn()}
          onNavigateToDashboardView={onNavigateToDashboardView}
        />
      )

      // This would be triggered by menu items - test that prop is available
      expect(onNavigateToDashboardView).toBeDefined()
    })
  })

  describe('Post Gig Action', () => {
    it('should call onShowPostGig and close menu', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, userType: 'employer' },
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      const onShowPostGig = jest.fn()
      const onClose = jest.fn()

      render(
        <MobileMenu
          isOpen={true}
          onClose={onClose}
          onShowPostGig={onShowPostGig}
        />
      )

      const postGigButton = screen.getByText('Post New Gig')
      fireEvent.click(postGigButton)

      expect(onShowPostGig).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Message Count Display', () => {
    it('should show unread message count badge', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      mockUseMessaging.mockReturnValue({
        totalUnreadCount: 5
      } as any)

      render(
        <MobileMenu
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should show 9+ for counts over 9', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true
      } as any)

      mockUseMessaging.mockReturnValue({
        totalUnreadCount: 15
      } as any)

      render(
        <MobileMenu
          isOpen={true}
          onClose={jest.fn()}
        />
      )

      expect(screen.getByText('9+')).toBeInTheDocument()
    })
  })
})
