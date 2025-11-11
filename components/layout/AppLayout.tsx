'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { GlobalHeader } from './GlobalHeader'
import { PageHeader } from './PageHeader'
import AuthPage from '@/components/auth/AuthPage'
import Dashboard from '@/components/Dashboard'
import PublicGigBrowser from '@/components/PublicGigBrowser'
import ProfileManagement from '@/components/profile/ProfileManagement'
import PostGigPage from '@/components/gig/PostGigPage'

type PageView = 'browse' | 'auth' | 'dashboard' | 'profile' | 'post-gig' | 'messages'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [currentView, setCurrentView] = useState<PageView>('browse')
  const [messageConversationId, setMessageConversationId] = useState<string | undefined>(undefined)
  const [showPostGig, setShowPostGig] = useState(false)

  // Map URL paths to page views
  const pathToView: Record<string, PageView> = {
    '/': 'browse',
    '/auth': 'auth',
    '/dashboard': 'dashboard',
    '/profile': 'profile',
    '/post-gig': 'post-gig',
    '/messages': 'messages'
  }

  const viewToPath: Record<PageView, string> = {
    'browse': '/',
    'auth': '/auth',
    'dashboard': '/dashboard',
    'profile': '/profile',
    'post-gig': '/post-gig',
    'messages': '/messages'
  }

  // Determine if path is a dashboard sub-route
  const getDashboardView = () => {
    if (pathname.startsWith('/dashboard/')) {
      return pathname.replace('/dashboard/', '')
    }
    return null
  }

  // Initialize view from URL on mount
  useEffect(() => {
    // Check if it's a dashboard sub-route
    if (pathname.startsWith('/dashboard')) {
      if (currentView !== 'dashboard') {
        setCurrentView('dashboard')
      }
      return
    }

    const view = pathToView[pathname]
    if (view && view !== currentView) {
      setCurrentView(view)
    }
  }, [pathname]) // Only run when pathname changes

  // Handle authentication state changes
  useEffect(() => {
    if (user && currentView === 'auth') {
      // Redirect to dashboard after successful authentication
      setCurrentView('dashboard')
      router.push('/dashboard')
    }
  }, [user, currentView, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Routes that should use Next.js routing instead of state-based navigation
  const routedPages = ['/terms', '/privacy', '/popia']
  const isRoutedPage = routedPages.includes(pathname)

  // For routed pages (like legal pages), render children directly
  if (isRoutedPage && children) {
    return <>{children}</>
  }

  const handleNavigation = (page: PageView) => {
    setCurrentView(page)
    // Update URL to match the navigation
    const newPath = viewToPath[page]
    if (newPath && pathname !== newPath) {
      router.push(newPath)
    }
    if (page !== 'messages') {
      setMessageConversationId(undefined)
    }
    if (page !== 'post-gig') {
      setShowPostGig(false)
    }
  }

  const handleShowPostGig = () => {
    setShowPostGig(true)
    setCurrentView('post-gig')
    router.push('/post-gig')
  }

  const handleMessageConversationStart = (conversationId: string) => {
    setMessageConversationId(conversationId)
    setCurrentView('messages')
    router.push('/messages')
  }

  // Determine current page for header highlighting
  const getCurrentPage = (): 'browse' | 'dashboard' | 'messages' | 'profile' => {
    if (currentView === 'post-gig' || currentView === 'dashboard') return 'dashboard'
    if (currentView === 'messages') return 'messages'
    if (currentView === 'profile') return 'profile'
    return 'browse'
  }

  // Generate breadcrumbs based on current view
  const getBreadcrumbs = () => {
    const breadcrumbs: Array<{label: string; onClick?: () => void; isCurrentPage?: boolean}> = [
      {
        label: 'Home',
        onClick: () => handleNavigation('browse')
      }
    ]

    switch (currentView) {
      case 'dashboard':
        breadcrumbs.push({
          label: 'Dashboard',
          isCurrentPage: true
        })
        break
      case 'profile':
        breadcrumbs.push(
          {
            label: 'Dashboard',
            onClick: () => handleNavigation('dashboard')
          },
          {
            label: 'Profile & Settings',
            isCurrentPage: true
          }
        )
        break
      case 'post-gig':
        breadcrumbs.push(
          {
            label: 'Dashboard',
            onClick: () => handleNavigation('dashboard')
          },
          {
            label: 'Post New Gig',
            isCurrentPage: true
          }
        )
        break
      case 'messages':
        breadcrumbs.push(
          {
            label: 'Dashboard',
            onClick: () => handleNavigation('dashboard')
          },
          {
            label: 'Messages',
            isCurrentPage: true
          }
        )
        break
    }

    return breadcrumbs
  }

  // Special case for auth page - no header
  if (currentView === 'auth') {
    return (
      <AuthPage
        onBackClick={() => handleNavigation('browse')}
      />
    )
  }

  // Special case for post gig page - minimal header
  if (showPostGig || currentView === 'post-gig') {
    return (
      <>
        <GlobalHeader
          currentPage={getCurrentPage()}
          onNavigate={handleNavigation}
          onShowPostGig={handleShowPostGig}
          showAuthButtons={!user}
          onNavigateToDashboardView={(view: string) => {
            const path = view === 'dashboard' ? '/dashboard' : `/dashboard/${view}`
            router.push(path)
          }}
        />
        <PostGigPage onBack={() => {
          setShowPostGig(false)
          handleNavigation('dashboard')
        }} />
      </>
    )
  }

  return (
    <>
      <GlobalHeader
        currentPage={getCurrentPage()}
        onNavigate={handleNavigation}
        onShowPostGig={handleShowPostGig}
        showAuthButtons={!user}
        onNavigateToDashboardView={(view: string) => {
          const path = view === 'dashboard' ? '/dashboard' : `/dashboard/${view}`
          router.push(path)
        }}
      />
      <main className="min-h-screen bg-gray-50">
        {(() => {
          switch (currentView) {
            case 'dashboard':
            case 'messages':
              return (
                <Dashboard
                  onBrowseGigs={() => handleNavigation('browse')}
                  initialMessageConversationId={messageConversationId}
                  onMessageConversationStart={handleMessageConversationStart}
                  initialView={getDashboardView() || 'dashboard'}
                  onViewChange={(view: string) => {
                    const path = view === 'dashboard' ? '/dashboard' : `/dashboard/${view}`
                    if (pathname !== path) {
                      router.push(path)
                    }
                  }}
                />
              )

            case 'profile':
              return (
                <>
                  <PageHeader
                    title="Profile & Settings"
                    description="Manage your profile information, portfolio, and account settings"
                    breadcrumbs={getBreadcrumbs()}
                    backButton={{
                      label: 'Back to Dashboard',
                      onClick: () => handleNavigation('dashboard')
                    }}
                  />
                  <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                      <ProfileManagement />
                    </div>
                  </div>
                </>
              )

            case 'browse':
            default:
              return (
                <PublicGigBrowser
                  onSignUpClick={() => handleNavigation('auth')}
                  onLoginClick={() => handleNavigation('auth')}
                  showAuthButtons={!user}
                  onDashboardClick={user ? () => handleNavigation('dashboard') : undefined}
                  currentUser={user}
                  onMessageConversationStart={handleMessageConversationStart}
                  onMessagesClick={user ? () => handleNavigation('messages') : undefined}
                />
              )
          }
        })()}
      </main>
    </>
  )
}