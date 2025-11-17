'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthState, LoginCredentials, RegisterData } from '@/types/auth'
import { FirebaseAuthService } from '@/lib/auth/firebase'

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>
  loginWithGoogle: () => Promise<{ success: boolean; message: string; needsProfileCompletion?: boolean }>
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state on mount and listen for auth changes
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((user) => {
      setUser(user)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)

    try {
      const user = await FirebaseAuthService.signIn(credentials)
      setUser(user)
      setIsLoading(false)
      return { success: true, message: 'Login successful!' }
    } catch (error: any) {
      setIsLoading(false)
      return { success: false, message: error.message || 'An error occurred during login' }
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

      if (data.password.length < 6) {
        setIsLoading(false)
        return { success: false, message: 'Password must be at least 6 characters long' }
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}