'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoginCredentials } from '@/types/auth'
import { GoogleSignInButton } from './GoogleSignInButton'
import { ProfileCompletionModal } from './ProfileCompletionModal'

interface LoginFormProps {
  onForgotPassword?: () => void
}

export function LoginForm({ onForgotPassword }: LoginFormProps = {}) {
  const { login, loginWithGoogle, isLoading } = useAuth()
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Track if a submission is in progress to prevent message clearing during re-renders
  const isSubmittingRef = useRef(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData(prev => {
      const previousValue = prev[name as keyof LoginCredentials]
      if (value === previousValue) return prev
      return { ...prev, [name]: value }
    })

    // Only clear messages if not currently submitting (prevents race conditions)
    if (!isSubmittingRef.current) {
      setErrors(prev => {
        if (prev[name as keyof LoginCredentials]) {
          return { ...prev, [name]: '' }
        }
        return prev
      })
      setMessage(null)
    }
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<LoginCredentials> = {}

    // Sanitize email by trimming whitespace
    const trimmedEmail = formData.email.trim()

    if (!trimmedEmail) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData.email, formData.password])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) {
      return
    }

    // Mark as submitting to prevent message clearing during re-renders
    isSubmittingRef.current = true

    // Sanitize credentials before submission
    const sanitizedCredentials: LoginCredentials = {
      email: formData.email.trim(),
      password: formData.password
    }

    try {
      const result = await login(sanitizedCredentials, rememberMe)

      // Set message after login completes
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      })
    } finally {
      // Reset submitting flag after a brief delay to allow message to render
      setTimeout(() => {
        isSubmittingRef.current = false
      }, 100)
    }
  }, [formData.email, formData.password, login, rememberMe, validateForm])

  const handleGoogleSignIn = async () => {
    setMessage(null)
    const result = await loginWithGoogle()

    if (result.success && result.needsProfileCompletion) {
      setShowProfileCompletion(true)
    } else {
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      })
    }
  }

  const handleProfileComplete = () => {
    setShowProfileCompletion(false)
    setMessage({
      type: 'success',
      text: 'Howzit! Welcome back to MzansiGig'
    })
  }

  return (
    <>
      <ProfileCompletionModal
        isOpen={showProfileCompletion}
        onComplete={handleProfileComplete}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
      <GoogleSignInButton onClick={handleGoogleSignIn} isLoading={isLoading} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>

      <Input
        label="Email Address"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700">Remember me</span>
        </label>

        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-orange-600 hover:text-orange-500 font-medium"
          >
            Forgot password?
          </button>
        )}
      </div>


      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
        disabled={isLoading}
      >
        Sign In
      </Button>
    </form>
    </>
  )
}