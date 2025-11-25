'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useMessaging } from '@/contexts/MessagingContext'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  currentPage?: 'browse' | 'dashboard' | 'messages' | 'profile'
  onNavigate?: (page: 'browse' | 'dashboard' | 'messages' | 'profile' | 'auth', authMode?: 'login' | 'register') => void
  onShowPostGig?: () => void
  onNavigateToDashboardView?: (view: string) => void
}

export function MobileMenu({
  isOpen,
  onClose,
  currentPage = 'browse',
  onNavigate,
  onShowPostGig,
  onNavigateToDashboardView
}: MobileMenuProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { totalUnreadCount } = useMessaging()

  if (!isOpen) return null

  const handleNavigate = (page: 'browse' | 'dashboard' | 'messages' | 'profile' | 'auth', authMode?: 'login' | 'register') => {
    onNavigate?.(page, authMode)
    onClose()
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
    onClose()
  }

  const handlePostGig = () => {
    onShowPostGig?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl transform transition-transform ease-out duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-primary-600">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-3 text-white hover:bg-primary-700 active:bg-primary-800 rounded-md transition-colors touch-manipulation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {user.firstName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.userType.replace('-', ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <div className="flex-1 py-4">
            <nav className="space-y-1">
              {/* Main Navigation */}
              <button
                onClick={() => handleNavigate('browse')}
                className={`w-full text-left px-4 py-4 text-base font-medium transition-colors touch-manipulation active:bg-gray-100 ${
                  currentPage === 'browse'
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Browse Gigs</span>
                </div>
              </button>

              {user && (
                <>
                  {user.userType === 'employer' && onShowPostGig && (
                    <button
                      onClick={handlePostGig}
                      className="w-full text-left px-4 py-4 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Post New Gig</span>
                      </div>
                    </button>
                  )}

                  {user.userType === 'job-seeker' && (
                    <button
                      onClick={() => {
                        if (onNavigateToDashboardView) {
                          onNavigateToDashboardView('my-applications')
                        } else {
                          router.push('/dashboard/my-applications')
                        }
                        onClose()
                      }}
                      className="w-full text-left px-4 py-4 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span>My Applications</span>
                      </div>
                    </button>
                  )}

                  {user.userType === 'employer' && (
                    <button
                      onClick={() => {
                        if (onNavigateToDashboardView) {
                          onNavigateToDashboardView('manage-gigs')
                        } else {
                          router.push('/dashboard/manage-gigs')
                        }
                        onClose()
                      }}
                      className="w-full text-left px-4 py-4 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.075c0 1.313-.943 2.5-2.206 2.5H6.206C4.943 20.725 4 19.538 4 18.225V14.15M16 7.5V5.15a2.25 2.25 0 00-2.25-2.25h-3.5A2.25 2.25 0 008 5.15v2.35m8 0h-8" />
                        </svg>
                        <span>Manage Gigs</span>
                      </div>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleNavigate('messages')}
                    className={`w-full text-left px-4 py-4 text-base font-medium transition-colors touch-manipulation active:bg-gray-100 ${
                      currentPage === 'messages'
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <span>Messages</span>
                      </div>
                      {totalUnreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] text-center">
                          {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('profile')}
                    className={`w-full text-left px-4 py-4 text-base font-medium transition-colors touch-manipulation active:bg-gray-100 ${
                      currentPage === 'profile'
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span>Profile & Settings</span>
                    </div>
                  </button>

                  {user?.userType === 'job-seeker' && (
                    <button
                      onClick={() => {
                        if (onNavigateToDashboardView) {
                          onNavigateToDashboardView('verification')
                        }
                        onClose()
                      }}
                      className="w-full text-left px-4 py-4 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.4-1.683 3.034M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9c0 .234-.027.465-.08.686" />
                        </svg>
                        <span>Get Verified</span>
                      </div>
                    </button>
                  )}
                </>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 my-4" />

              {/* Auth Actions */}
              {!user ? (
                <>
                  <button
                    onClick={() => handleNavigate('auth', 'login')}
                    className="w-full text-left px-4 py-4 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Login Icon */}
                      <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 9V7.5a2.25 2.25 0 012.25-2.25h4.05c1.019 0 1.916.448 2.373 1.144L19.5 9m-4.05-4.75a2.25 2.25 0 00-2.25 2.25V7.5m0 0h-2.75" />
                      </svg>
                      <span>Log In</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavigate('auth', 'register')}
                    className="w-full text-left px-4 py-4 text-base font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 active:bg-primary-200 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Rocket/Start Icon */}
                      <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      </svg>
                      <span>Get Started</span>
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-4 text-base font-medium text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
                >
                  <div className="flex items-center space-x-3">
                    {/* Logout Icon */}
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <span>Sign Out</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              MzansiGig - South Africa&apos;s Premier Gig Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}