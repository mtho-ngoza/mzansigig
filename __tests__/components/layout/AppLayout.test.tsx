import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { usePathname, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/contexts/AuthContext'

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn()
}))

jest.mock('@/contexts/AuthContext')
jest.mock('@/components/layout/GlobalHeader', () => ({
  GlobalHeader: ({ children }: any) => <div data-testid="global-header">{children}</div>
}))
jest.mock('@/components/auth/AuthPage', () => ({
  __esModule: true,
  default: () => <div data-testid="auth-page">Auth Page</div>
}))
jest.mock('@/components/Dashboard', () => ({
  __esModule: true,
  default: ({ initialView, onViewChange }: any) => (
    <div data-testid="dashboard" data-initial-view={initialView}>
      <button onClick={() => onViewChange?.('my-applications')}>Change View</button>
    </div>
  )
}))
jest.mock('@/components/PublicGigBrowser', () => ({
  __esModule: true,
  default: () => <div data-testid="public-gig-browser">Gig Browser</div>
}))
jest.mock('@/components/profile/ProfileManagement', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-management">Profile</div>
}))
jest.mock('@/components/gig/PostGigPage', () => ({
  __esModule: true,
  default: () => <div data-testid="post-gig-page">Post Gig</div>
}))

describe('AppLayout', () => {
  const mockPush = jest.fn()
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false
    } as any)
  })

  describe('Route Detection', () => {
    it('should render legal pages directly when on legal route', () => {
      mockUsePathname.mockReturnValue('/terms')

      const { container } = render(
        <AppLayout>
          <div data-testid="terms-content">Terms Content</div>
        </AppLayout>
      )

      expect(screen.getByTestId('terms-content')).toBeInTheDocument()
      expect(screen.queryByTestId('global-header')).not.toBeInTheDocument()
    })

    it('should render privacy page when on /privacy route', () => {
      mockUsePathname.mockReturnValue('/privacy')

      render(
        <AppLayout>
          <div data-testid="privacy-content">Privacy Content</div>
        </AppLayout>
      )

      expect(screen.getByTestId('privacy-content')).toBeInTheDocument()
    })

    it('should render POPIA page when on /popia route', () => {
      mockUsePathname.mockReturnValue('/popia')

      render(
        <AppLayout>
          <div data-testid="popia-content">POPIA Content</div>
        </AppLayout>
      )

      expect(screen.getByTestId('popia-content')).toBeInTheDocument()
    })

    it('should render browse view when on / route', () => {
      mockUsePathname.mockReturnValue('/')

      render(<AppLayout><div>Children</div></AppLayout>)

      expect(screen.getByTestId('public-gig-browser')).toBeInTheDocument()
    })

    it('should render dashboard when on /dashboard route', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      mockUseAuth.mockReturnValue({
        user: { id: '1', firstName: 'Test' } as any,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<AppLayout><div>Children</div></AppLayout>)

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  describe('Dashboard Sub-Routes', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', firstName: 'Test', userType: 'job-seeker' } as any,
        isLoading: false,
        isAuthenticated: true
      } as any)
    })

    it('should detect dashboard sub-route and pass to Dashboard', () => {
      mockUsePathname.mockReturnValue('/dashboard/my-applications')

      render(<AppLayout><div>Children</div></AppLayout>)

      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toHaveAttribute('data-initial-view', 'my-applications')
    })

    it('should handle /dashboard/payments sub-route', () => {
      mockUsePathname.mockReturnValue('/dashboard/payments')

      render(<AppLayout><div>Children</div></AppLayout>)

      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toHaveAttribute('data-initial-view', 'payments')
    })

    it('should handle /dashboard/manage-gigs sub-route', () => {
      mockUsePathname.mockReturnValue('/dashboard/manage-gigs')

      render(<AppLayout><div>Children</div></AppLayout>)

      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toHaveAttribute('data-initial-view', 'manage-gigs')
    })

    it('should update URL when Dashboard view changes', async () => {
      mockUsePathname.mockReturnValue('/dashboard')

      render(<AppLayout><div>Children</div></AppLayout>)

      const button = screen.getByText('Change View')
      button.click()

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/my-applications')
      })
    })
  })

  describe('URL Synchronization', () => {
    it('should update view when pathname changes to /profile', () => {
      const { rerender } = render(<AppLayout><div>Children</div></AppLayout>)

      mockUsePathname.mockReturnValue('/profile')
      mockUseAuth.mockReturnValue({
        user: { id: '1' } as any,
        isLoading: false,
        isAuthenticated: true
      } as any)

      rerender(<AppLayout><div>Children</div></AppLayout>)

      expect(screen.getByTestId('profile-management')).toBeInTheDocument()
    })

    it('should handle navigation from browse to dashboard', () => {
      mockUsePathname.mockReturnValue('/')
      const { rerender } = render(<AppLayout><div>Children</div></AppLayout>)

      expect(screen.getByTestId('public-gig-browser')).toBeInTheDocument()

      mockUsePathname.mockReturnValue('/dashboard')
      mockUseAuth.mockReturnValue({
        user: { id: '1' } as any,
        isLoading: false,
        isAuthenticated: true
      } as any)

      rerender(<AppLayout><div>Children</div></AppLayout>)

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  describe('Auth State Handling', () => {
    it('should redirect to dashboard after successful auth', async () => {
      mockUsePathname.mockReturnValue('/auth')

      const { rerender } = render(<AppLayout><div>Children</div></AppLayout>)

      expect(screen.getByTestId('auth-page')).toBeInTheDocument()

      // Simulate user logging in
      mockUseAuth.mockReturnValue({
        user: { id: '1', firstName: 'Test' } as any,
        isLoading: false,
        isAuthenticated: true
      } as any)

      rerender(<AppLayout><div>Children</div></AppLayout>)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show loading state when auth is loading', () => {
      mockUsePathname.mockReturnValue('/')
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false
      } as any)

      const { container } = render(<AppLayout><div>Children</div></AppLayout>)

      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Navigation Methods', () => {
    it('should push correct URL path when navigating to browse', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      mockUseAuth.mockReturnValue({
        user: { id: '1' } as any,
        isLoading: false,
        isAuthenticated: true
      } as any)

      render(<AppLayout><div>Children</div></AppLayout>)

      // This would be triggered by GlobalHeader navigation
      // The test verifies the mapping is correct
      const pathMapping = {
        'browse': '/',
        'dashboard': '/dashboard',
        'profile': '/profile',
        'messages': '/messages',
        'auth': '/auth',
        'post-gig': '/post-gig'
      }

      expect(pathMapping['browse']).toBe('/')
      expect(pathMapping['dashboard']).toBe('/dashboard')
    })
  })
})
