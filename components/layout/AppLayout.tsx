'use client'

import React, { useState, useEffect } from 'react'
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

export function AppLayout({ }: AppLayoutProps) {
  const { user, isLoading } = useAuth()
  const [currentView, setCurrentView] = useState<PageView>('browse')
  const [messageConversationId, setMessageConversationId] = useState<string | undefined>(undefined)
  const [showPostGig, setShowPostGig] = useState(false)

  // Handle initial page determination
  useEffect(() => {
    if (user && currentView === 'browse') {
      // Don't auto-redirect authenticated users, let them stay on browse
    }
  }, [user, currentView])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const handleNavigation = (page: PageView) => {
    setCurrentView(page)
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
  }

  const handleMessageConversationStart = (conversationId: string) => {
    setMessageConversationId(conversationId)
    setCurrentView('messages')
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
        onClick: () => setCurrentView('browse')
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
            onClick: () => setCurrentView('dashboard')
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
            onClick: () => setCurrentView('dashboard')
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
            onClick: () => setCurrentView('dashboard')
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
        onBackClick={() => setCurrentView('browse')}
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
        />
        <PostGigPage onBack={() => {
          setShowPostGig(false)
          setCurrentView('dashboard')
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
      />
      <main className="min-h-screen bg-gray-50">
        {(() => {
          switch (currentView) {
            case 'dashboard':
            case 'messages':
              return (
                <Dashboard
                  onBrowseGigs={() => setCurrentView('browse')}
                  initialMessageConversationId={messageConversationId}
                  onMessageConversationStart={handleMessageConversationStart}
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
                      onClick: () => setCurrentView('dashboard')
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
                  onSignUpClick={() => setCurrentView('auth')}
                  onLoginClick={() => setCurrentView('auth')}
                  showAuthButtons={!user}
                  onDashboardClick={user ? () => setCurrentView('dashboard') : undefined}
                  currentUser={user}
                  onMessageConversationStart={handleMessageConversationStart}
                  onMessagesClick={user ? () => setCurrentView('messages') : undefined}
                />
              )
          }
        })()}
      </main>
    </>
  )
}