'use client'

import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface AuthPageProps {
  onBackClick?: () => void
  initialView?: 'login' | 'register' | 'forgot-password'
}

export default function AuthPage({ onBackClick, initialView = 'login' }: AuthPageProps) {
  const [activeView, setActiveView] = useState<'login' | 'register' | 'forgot-password'>(initialView)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back button */}
        {onBackClick && (
          <div className="text-left">
            <Button variant="ghost" onClick={onBackClick} className="text-sm">
              ← Back to Browse Gigs
            </Button>
          </div>
        )}

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Howzit! Welcome to MzansiGig
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Mzansi&apos;s Gig Connection: Work Starts Here - secure opportunities for all South Africans
          </p>
        </div>

        <Card>
          {activeView !== 'forgot-password' && (
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => setActiveView('login')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveView('register')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'register'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          <CardContent>
            {activeView === 'login' && <LoginForm onForgotPassword={() => setActiveView('forgot-password')} />}
            {activeView === 'register' && <RegisterForm />}
            {activeView === 'forgot-password' && <ForgotPasswordForm onBackToLogin={() => setActiveView('login')} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}