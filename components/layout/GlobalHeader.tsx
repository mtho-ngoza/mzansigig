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
  onNavigate?: (page: 'browse' | 'dashboard' | 'messages' | 'profile' | 'auth', authMode?: 'login' | 'register') => void
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
                  alt="MzansiGig - Mzansi's Gig Connection: Work Starts Here"
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
                  {user.userType === 'employer' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onShowPostGig}
                    >
                      Post a Gig
                    </Button>
                  )}
                </nav>
              )}
            </div>

            {/* Right side - Actions and user menu */}
            <div className="flex items-center space-x-3">
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

                  {/* Messages Button - Show on both mobile and desktop */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMessagesClick}
                    className="relative p-2"
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

                  {/* Mobile menu button - Show on mobile only for authenticated users */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileMenu(true)}
                    className="lg:hidden p-3 touch-manipulation active:bg-gray-100"
                    title="Open menu"
                  >
                    <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
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
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 border z-50">
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false)
                              onNavigate?.('profile')
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <div className="flex items-center space-x-3">
                              {/* User Icon */}
                              <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                              <span>Profile & Settings</span>
                            </div>
                          </button>

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
                              <div className="flex items-center space-x-3">
                                {/* Document Text Icon */}
                                <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
                              <div className="flex items-center space-x-3">
                                {/* Briefcase Icon */}
                                <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.075c0 1.313-.943 2.5-2.206 2.5H6.206C4.943 20.725 4 19.538 4 18.225V14.15M16 7.5V5.15a2.25 2.25 0 00-2.25-2.25h-3.5A2.25 2.25 0 008 5.15v2.35m8 0h-8" />
                                </svg>
                                <span>Manage Gigs</span>
                              </div>
                            </button>
                          )}

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
                              <div className="flex items-center space-x-3">
                                {/* Badge Check Icon */}
                                <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.4-1.683 3.034M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9c0 .234-.027.465-.08.686" />
                                </svg>
                                <span>Get Verified</span>
                              </div>
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              handleMessagesClick();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <div className="flex items-center space-x-3">
                              {/* Mail Icon */}
                              <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                              <span>Messages</span>
                            </div>
                          </button>
                        </div>

                        <div className="border-t mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <div className="flex items-center space-x-3">
                              {/* Logout Icon */}
                              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                              </svg>
                              <span>Sign Out</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Mobile menu button - Show for non-authenticated users */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileMenu(true)}
                    className="lg:hidden p-3 touch-manipulation active:bg-gray-100"
                    title="Open menu"
                  >
                    <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </Button>

                  {showAuthButtons && (
                    <div className="hidden lg:flex lg:items-center lg:space-x-3">
                      {/* Auth buttons - Only visible on desktop for PWA-friendly mobile experience */}
                      <Button
                        variant="outline"
                        onClick={() => onNavigate?.('auth', 'login')}
                      >
                        Log In
                      </Button>
                      <Button
                        onClick={() => onNavigate?.('auth', 'register')}
                      >
                        Get Started
                      </Button>
                    </div>
                  )}
                </>
              )}
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