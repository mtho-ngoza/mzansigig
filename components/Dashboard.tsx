'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useMessaging } from '@/contexts/MessagingContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import PostGigPage from './gig/PostGigPage'
import ManageGigs from './gig/ManageGigs'
import MyApplications from './application/MyApplications'
import ManageApplications from './application/ManageApplications'
import ProfileManagement from './profile/ProfileManagement'
import { MessagingHub } from '@/components/messaging'
import PaymentDashboard from './payment/PaymentDashboard'
import EmployerPaymentDashboard from './payment/EmployerPaymentDashboard'
import WithdrawalApprovalDashboard from './admin/WithdrawalApprovalDashboard'
import FeeConfigManager from './admin/FeeConfigManager'
import PendingDocumentReview from './admin/PendingDocumentReview'
import BrowseTalent from './BrowseTalent'
import { isAdmin } from '@/lib/utils/adminAuth'
import VerificationCenter from './safety/VerificationCenter'

type DashboardView = 'dashboard' | 'post-gig' | 'manage-gigs' | 'my-applications' | 'manage-applications' | 'profile' | 'messages' | 'payments' | 'admin-withdrawals' | 'admin-fees' | 'admin-documents' | 'browse-talent' | 'verification'

interface DashboardProps {
  onBrowseGigs?: () => void
  initialMessageConversationId?: string
  onMessageConversationStart?: (conversationId: string) => void
  initialView?: string
  onViewChange?: (view: string) => void
}

export default function Dashboard({
  onBrowseGigs,
  initialMessageConversationId,
  onMessageConversationStart,
  initialView,
  onViewChange
}: DashboardProps) {
  const { user } = useAuth()
  const { totalUnreadCount } = useMessaging()
  const [currentView, setCurrentView] = useState<DashboardView>((initialView as DashboardView) || 'dashboard')

  // Update URL when view changes
  const handleViewChange = (view: DashboardView) => {
    setCurrentView(view)
    if (onViewChange) {
      onViewChange(view)
    }
  }

  // Sync with initial view from URL
  useEffect(() => {
    if (initialView && initialView !== currentView) {
      setCurrentView(initialView as DashboardView)
    }
  }, [initialView])

  // Auto-navigate to messages if conversationId is provided
  useEffect(() => {
    if (initialMessageConversationId) {
      handleViewChange('messages')
    }
  }, [initialMessageConversationId])

  // Generate breadcrumbs for dashboard sub-pages
  const getDashboardBreadcrumbs = (currentPage: string) => {
    const breadcrumbs: Array<{label: string; onClick?: () => void; isCurrentPage?: boolean}> = [
      {
        label: 'Home',
        onClick: onBrowseGigs || (() => {})
      },
      {
        label: 'Dashboard',
        onClick: () => handleViewChange('dashboard')
      }
    ]

    switch (currentPage) {
      case 'my-applications':
        breadcrumbs.push({
          label: 'My Applications',
          isCurrentPage: true
        })
        break
      case 'manage-applications':
        breadcrumbs.push({
          label: 'Manage Applications',
          isCurrentPage: true
        })
        break
      case 'manage-gigs':
        breadcrumbs.push({
          label: 'Manage Gigs',
          isCurrentPage: true
        })
        break
      case 'messages':
        breadcrumbs.push({
          label: 'Messages',
          isCurrentPage: true
        })
        break
      case 'payments':
        breadcrumbs.push({
          label: 'Payments',
          isCurrentPage: true
        })
        break
      case 'browse-talent':
        breadcrumbs.push({
          label: 'Browse Talent',
          isCurrentPage: true
        })
        break
    }

    return breadcrumbs
  }

  // Show post gig page if user is on that view
  if (currentView === 'post-gig') {
    return <PostGigPage onBack={() => handleViewChange('dashboard')} />
  }

  // Show manage gigs page if user is on that view
  if (currentView === 'manage-gigs') {
    return <ManageGigs onBack={() => handleViewChange('dashboard')} />
  }

  // Show my applications page if user is on that view
  if (currentView === 'my-applications') {
    return (
      <>
        <PageHeader
          title="My Applications"
          description="Track your gig applications and their status"
          breadcrumbs={getDashboardBreadcrumbs('my-applications')}
          backButton={{
            label: 'Back to Dashboard',
            onClick: () => handleViewChange('dashboard')
          }}
          actions={onBrowseGigs ? [{
            label: 'Browse More Gigs',
            onClick: onBrowseGigs,
            variant: 'outline' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )
          }] : undefined}
        />
        <MyApplications
          onBack={() => handleViewChange('dashboard')}
          onBrowseGigs={onBrowseGigs}
          onMessageConversationStart={onMessageConversationStart}
        />
      </>
    )
  }

  // Show manage applications page if user is on that view
  if (currentView === 'manage-applications') {
    return (
      <>
        <PageHeader
          title="Manage Applications"
          description="Review and manage applications for your posted gigs"
          breadcrumbs={getDashboardBreadcrumbs('manage-applications')}
          backButton={{
            label: 'Back to Dashboard',
            onClick: () => handleViewChange('dashboard')
          }}
          actions={[{
            label: 'Post New Gig',
            onClick: () => handleViewChange('post-gig'),
            variant: 'primary' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )
          }]}
        />
        <ManageApplications
          onBack={() => handleViewChange('dashboard')}
          onMessageConversationStart={onMessageConversationStart}
        />
      </>
    )
  }

  // Show profile management page if user is on that view
  if (currentView === 'profile') {
    return <ProfileManagement onBack={() => handleViewChange('dashboard')} />
  }

  // Show verification center if user is on that view
  if (currentView === 'verification') {
    return <VerificationCenter onBack={() => handleViewChange('dashboard')} />
  }

  // Show messaging page if user is on that view
  if (currentView === 'messages') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="Messages"
          description="Communicate with employers and job seekers"
          breadcrumbs={getDashboardBreadcrumbs('messages')}
          backButton={{
            label: 'Back to Dashboard',
            onClick: () => handleViewChange('dashboard')
          }}
        />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <MessagingHub
              className="h-[600px]"
              initialConversationId={initialMessageConversationId}
            />
          </div>
        </main>
      </div>
    )
  }

  // Show payments page if user is on that view
  if (currentView === 'payments') {
    // Show employer-specific payment dashboard for employers
    if (user?.userType === 'employer') {
      return (
        <EmployerPaymentDashboard onBack={() => handleViewChange('dashboard')} />
      )
    }
    // Show worker payment dashboard for job seekers
    return (
      <PaymentDashboard onBack={() => handleViewChange('dashboard')} />
    )
  }

  // Show browse talent page if user is on that view
  if (currentView === 'browse-talent') {
    return (
      <BrowseTalent onBack={() => handleViewChange('dashboard')} />
    )
  }

  // Show admin withdrawal approvals page if user is on that view
  if (currentView === 'admin-withdrawals') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="Withdrawal Approvals"
          description="Review and approve worker withdrawal requests"
          breadcrumbs={[{
            label: 'Home',
            onClick: onBrowseGigs || (() => {})
          }, {
            label: 'Dashboard',
            onClick: () => handleViewChange('dashboard')
          }, {
            label: 'Withdrawal Approvals',
            isCurrentPage: true
          }]}
          backButton={{
            label: 'Back to Dashboard',
            onClick: () => handleViewChange('dashboard')
          }}
        />
        <WithdrawalApprovalDashboard />
      </div>
    )
  }

  // Show admin fee configuration page if user is on that view
  if (currentView === 'admin-fees') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="Fee Configuration"
          description="Manage platform fees and payment settings"
          breadcrumbs={[{
            label: 'Home',
            onClick: onBrowseGigs || (() => {})
          }, {
            label: 'Dashboard',
            onClick: () => handleViewChange('dashboard')
          }, {
            label: 'Fee Configuration',
            isCurrentPage: true
          }]}
          backButton={{
            label: 'Back to Dashboard',
            onClick: () => handleViewChange('dashboard')
          }}
        />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <FeeConfigManager />
          </div>
        </div>
      </div>
    )
  }

  // Show admin document verification page if user is on that view
  if (currentView === 'admin-documents') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="Document Verification Review"
          description="Review and approve user verification documents"
          breadcrumbs={[{
            label: 'Home',
            onClick: onBrowseGigs || (() => {})
          }, {
            label: 'Dashboard',
            onClick: () => handleViewChange('dashboard')
          }, {
            label: 'Document Review',
            isCurrentPage: true
          }]}
          backButton={{
            label: 'Back to Dashboard',
            onClick: () => handleViewChange('dashboard')
          }}
        />
        <PendingDocumentReview />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <PageHeader
        title={`Welcome back, ${user?.firstName}!`}
        description="Manage your gigs, applications, and communications"
        breadcrumbs={[{
          label: 'Home',
          onClick: onBrowseGigs || (() => {})
        }, {
          label: 'Dashboard',
          isCurrentPage: true
        }]}
        actions={[
          ...(user?.userType === 'employer' ? [{
            label: 'Post New Gig',
            onClick: () => handleViewChange('post-gig'),
            variant: 'primary' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )
          }] : []),
          ...(onBrowseGigs ? [{
            label: 'Browse Gigs',
            onClick: onBrowseGigs,
            variant: 'outline' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )
          }] : [])
        ]}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Welcome Card */}
            <Card className="sm:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Welcome to GigSA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  You&apos;re successfully logged in to South Africa&apos;s premier gig economy platform.
                </p>
                <div className="space-y-2">
                  <p><strong>Account Type:</strong> {user && isAdmin(user) ? 'Admin' : user?.userType === 'job-seeker' ? 'Job Seeker' : 'Employer'}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Location:</strong> {user?.location}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-medium">{user?.rating || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed Gigs:</span>
                    <span className="font-medium">{user?.completedGigs || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Skills:</span>
                    <span className="font-medium">{user?.skills?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="sm:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  {user && isAdmin(user) ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => handleViewChange('admin-withdrawals')}
                      >
                        Withdrawal Approvals
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('admin-documents')}
                      >
                        Document Review
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('admin-fees')}
                      >
                        Fee Configuration
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full relative"
                        onClick={() => handleViewChange('messages')}
                      >
                        Messages
                        {totalUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('profile')}
                      >
                        Profile
                      </Button>
                    </>
                  ) : user?.userType === 'job-seeker' ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={onBrowseGigs}
                      >
                        Browse Gigs
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('profile')}
                      >
                        Update Profile
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('my-applications')}
                      >
                        My Applications
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full relative"
                        onClick={() => handleViewChange('messages')}
                      >
                        Messages
                        {totalUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('payments')}
                      >
                        Payments
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => handleViewChange('post-gig')}
                      >
                        Post a Gig
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('manage-gigs')}
                      >
                        Manage Gigs
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('manage-applications')}
                      >
                        View Applications
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full relative"
                        onClick={() => handleViewChange('messages')}
                      >
                        Messages
                        {totalUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('browse-talent')}
                      >
                        Browse Talent
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewChange('payments')}
                      >
                        Payments
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-600">
                    Welcome to GigSA! Your Firebase integration is working perfectly.
                    Here&apos;s what you can do next:
                  </p>
                  <ul className="mt-4 space-y-2 text-gray-600">
                    <li>• Complete your profile to attract more opportunities</li>
                    <li>• {user?.userType === 'job-seeker' ? 'Browse available gigs in your area' : 'Post your first gig to find talented workers'}</li>
                    <li>• Connect with other professionals in your field</li>
                    <li>• Build your reputation through quality work</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}