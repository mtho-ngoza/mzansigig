'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthState, LoginCredentials, RegisterData } from '@/types/auth'
import { FirebaseAuthService } from '@/lib/auth/firebase'

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>
  loginWithGoogle: () => Promise<{ success: boolean; message: string; needsProfileCompletion?: boolean }>
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>
  resetIdleTimer: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null)

  // Reset idle timer when user is active
  const resetIdleTimer = () => {
    // Only track activity if user is logged in
    if (!user) return

    // Clear existing timer
    if (idleTimer) {
      clearTimeout(idleTimer)
    }

    // Set new timer
    const newTimer = setTimeout(() => {
      // Auto-logout after idle timeout
      logout()
    }, IDLE_TIMEOUT)

    setIdleTimer(newTimer)
  }

  // Initialize auth state on mount and listen for auth changes
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((user) => {
      setUser(user)
      setIsLoading(false)

      // Start idle timer when user logs in
      if (user) {
        resetIdleTimer()
      }
    })

    return () => unsubscribe()
  }, [])

  // Track user activity to reset idle timer
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      resetIdleTimer()
    }

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Cleanup event listeners
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (idleTimer) {
        clearTimeout(idleTimer)
      }
    }
  }, [user, idleTimer])

  const login = async (credentials: LoginCredentials, rememberMe: boolean = true): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)

    try {
      const user = await FirebaseAuthService.signIn(credentials, rememberMe)
      setUser(user)
      setIsLoading(false)
      resetIdleTimer() // Start idle timer on successful login
      return { success: true, message: 'Login successful!' }
    } catch (error: any) {
      setIsLoading(false)
      // Ensure we always return a meaningful error message
      const errorMessage = error?.message || error?.toString() || 'An error occurred during login. Please try again.'
      return { success: false, message: errorMessage }
    }
  }

  const loginWithGoogle = async (): Promise<{ success: boolean; message: string; needsProfileCompletion?: boolean }> => {
    setIsLoading(true)

    try {
      const { user, needsProfileCompletion } = await FirebaseAuthService.signInWithGoogle()
      setUser(user)
      setIsLoading(false)

      if (needsProfileCompletion) {
        return {
          success: true,
          message: "Howzit! Welcome to MzansiGig. Let's set up your profile",
          needsProfileCompletion: true
        }
      }

      return { success: true, message: 'Login successful!', needsProfileCompletion: false }
    } catch (error: any) {
      setIsLoading(false)
      return { success: false, message: error.message || 'An error occurred during Google sign-in' }
    }
  }

  const register = async (data: RegisterData): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)

    try {
      // Validation
      if (data.password !== data.confirmPassword) {
        setIsLoading(false)
        return { success: false, message: 'Passwords do not match' }
      }

      if (data.password.length < 8) {
        setIsLoading(false)
        return { success: false, message: 'Password must be at least 8 characters long' }
      }

      const user = await FirebaseAuthService.signUp(data)
      setUser(user)
      setIsLoading(false)
      return { success: true, message: 'Account created successfully!' }
    } catch (error: any) {
      setIsLoading(false)
      return { success: false, message: error.message || 'An error occurred during registration' }
    }
  }

  const logout = async () => {
    try {
      // Clear idle timer on logout
      if (idleTimer) {
        clearTimeout(idleTimer)
        setIdleTimer(null)
      }

      await FirebaseAuthService.signOut()
      setUser(null)
    } catch (error) {
      console.debug('Error signing out:', error)
    }
  }

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      try {
        await FirebaseAuthService.updateUserProfile(user.id, userData)
        const updatedUser = { ...user, ...userData }
        setUser(updatedUser)
      } catch (error) {
        console.debug('Error updating user profile:', error)
      }
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await FirebaseAuthService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.debug('Error refreshing user data:', error)
    }
  }

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      await FirebaseAuthService.sendPasswordResetEmail(email)
      return {
        success: true,
        message: 'Password reset email sent! Check your inbox for instructions.'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Failed to send password reset email. Please try again.'
      }
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    refreshUser,
    sendPasswordReset,
    resetIdleTimer
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}