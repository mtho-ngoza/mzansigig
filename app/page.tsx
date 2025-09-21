'use client'

import { useAuth } from '@/contexts/AuthContext'
import AuthPage from '@/components/auth/AuthPage'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return <Dashboard />
}