'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useMessaging } from '@/contexts/MessagingContext'
import { Button } from '@/components/ui/Button'
import { MessagingHub } from '@/components/messaging/MessagingHub'
import { MobileMenu } from './MobileMenu'

interface GlobalHeaderProps {
  currentPage?: 'browse' | 'dashboard' | 'messages' | 'profile'
  onNavigate?: (page: 'browse' | 'dashboard' | 'messages' | 'profile' | 'auth') => void
  onShowPostGig?: () => void
  showAuthButtons?: boolean
  className?: string
  onNavigateToDashboardView?: (view: string) => void
}

export function GlobalHeader({
  currentPage = 'browse',
  onNavigate,
  onShowPostGig,
  showAuthButtons = false,
  className = '',
  onNavigateToDashboardView
}: GlobalHeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { totalUnreadCount } = useMessaging()
  const [showMessages, setShowMessages] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const handleMessagesClick = () => {
    if (currentPage === 'messages') {
      onNavigate?.('dashboard')
    } else {
      setShowMessages(!showMessages)
    }
  }

  const handleProfileDropdownToggle = () => {
    setShowProfileDropdown(!showProfileDropdown)
  }

  const handleLogout = async () => {
    setShowProfileDropdown(false)
    await logout()
    // Redirect to home page after logout
    router.push('/')
  }

  return (
    <>
      <header className={`bg-white shadow-sm border-b sticky top-0 z-50 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and main navigation */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center cursor-pointer" onClick={() => onNavigate?.('browse')}>
                <img
                  src="/logo-full.png"
                  alt="KasiGig - From kasi to career"
                  className="h-15 w-auto"
                />
              </div>

              {/* Main Navigation - Hidden on mobile */}
              {user && (
                <nav className="hidden lg:flex space-x-4">
                  <Button
                    variant={currentPage === 'browse' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => onNavigate?.('browse')}
                  >
                    Browse Gigs
                  </Button>
                  <Button
                    variant={currentPage === 'dashboard' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => onNavigate?.('dashboard')}
                  >
                    Dashboard
                  </Button>
                </nav>
              )}
            </div>

            {/* Right side - Actions and user menu */}
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(true)}
                className="lg:hidden p-3 touch-manipulation active:bg-gray-100"
                title="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              {user ? (
                <>
                  {/* Quick Post Gig Button - Only for employers - Desktop only */}
                  {user.userType === 'employer' && onShowPostGig && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onShowPostGig}
                      className="hidden lg:flex"
                    >
                      + Post Gig
                    </Button>
                  )}

                  {/* Messages Button - Desktop only */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMessagesClick}
                    className="relative p-2 hidden lg:flex"
                    title="Messages"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {totalUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                      </span>
                    )}
                  </Button>

                  {/* Profile Dropdown - Desktop only */}
                  <div className="relative hidden lg:block">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleProfileDropdownToggle}
                      className="flex items-center space-x-2 p-2"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {user.firstName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:block text-sm text-gray-700">
                        {user.firstName}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>

                    {/* Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border z-50">
                        <div className="px-4 py-2 text-sm text-gray-500 border-b">
                          <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs">{user.email}</p>
                          <p className="text-xs capitalize">{user.userType.replace('-', ' ')}</p>
                        </div>

                        <button
                          onClick={() => {
                            setShowProfileDropdown(false)
                            onNavigate?.('profile')
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Profile & Settings</span>
                          </div>
                        </button>

                        {user.userType === 'job-seeker' && (
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false)
                              if (onNavigateToDashboardView) {
                                onNavigateToDashboardView('verification')
                              } else {
                                router.push('/dashboard/verification')
                              }
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span>Get Verified</span>
                            </div>
                          </button>
                        )}

                        {user.userType === 'job-seeker' && (
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false)
                              if (onNavigateToDashboardView) {
                                onNavigateToDashboardView('my-applications')
                              } else {
                                router.push('/dashboard/my-applications')
                              }
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span>My Applications</span>
                            </div>
                          </button>
                        )}

                        {user.userType === 'employer' && (
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false)
                              if (onNavigateToDashboardView) {
                                onNavigateToDashboardView('manage-gigs')
                              } else {
                                router.push('/dashboard/manage-gigs')
                              }
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8z" />
                              </svg>
                              <span>Manage Gigs</span>
                            </div>
                          </button>
                        )}

                        <div className="border-t mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              <span>Sign Out</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : showAuthButtons ? (
                <>
                  <Button variant="outline" onClick={() => onNavigate?.('auth')}>
                    Log In
                  </Button>
                  <Button onClick={() => onNavigate?.('auth')}>
                    Sign Up
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Overlay */}
      {showMessages && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMessages(false)}>
          <div className="fixed top-16 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
            <MessagingHub
              className="h-full"
              onClose={() => setShowMessages(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onShowPostGig={onShowPostGig}
        onNavigateToDashboardView={onNavigateToDashboardView}
      />

      {/* Click outside handler for dropdowns */}
      {(showProfileDropdown) && (
        <div className="fixed inset-0 z-30" onClick={() => {
          setShowProfileDropdown(false)
        }} />
      )}
    </>
  )
}