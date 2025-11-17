'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoginCredentials } from '@/types/auth'
import { GoogleSignInButton } from './GoogleSignInButton'
import { ProfileCompletionModal } from './ProfileCompletionModal'

export function LoginForm() {
  const { login, loginWithGoogle, isLoading } = useAuth()
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof LoginCredentials]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) return

    const result = await login(formData)
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    })
  }

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