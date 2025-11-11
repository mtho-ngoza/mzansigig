'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useMessaging } from '@/contexts/MessagingContext'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  currentPage?: 'browse' | 'dashboard' | 'messages' | 'profile'
  onNavigate?: (page: 'browse' | 'dashboard' | 'messages' | 'profile' | 'auth') => void
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

  const handleNavigate = (page: 'browse' | 'dashboard' | 'messages' | 'profile' | 'auth') => {
    onNavigate?.(page)
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
                  <button
                    onClick={() => handleNavigate('dashboard')}
                    className={`w-full text-left px-4 py-4 text-base font-medium transition-colors touch-manipulation active:bg-gray-100 ${
                      currentPage === 'dashboard'
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z" />
                      </svg>
                      <span>Dashboard</span>
                    </div>
                  </button>

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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile & Settings</span>
                    </div>
                  </button>
                </>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 my-4" />

              {/* Quick Actions */}
              {user?.userType === 'employer' && onShowPostGig && (
                <button
                  onClick={handlePostGig}
                  className="w-full text-left px-4 py-4 text-base font-medium text-primary-700 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Post New Gig</span>
                  </div>
                </button>
              )}

              {/* Auth Actions */}
              {!user ? (
                <button
                  onClick={() => handleNavigate('auth')}
                  className="w-full text-left px-4 py-4 text-base font-medium text-primary-700 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign In</span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-4 text-base font-medium text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              GigSA - South Africa&apos;s Premier Gig Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}