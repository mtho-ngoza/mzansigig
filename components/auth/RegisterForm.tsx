'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RegisterData } from '@/types/auth'
import { GoogleSignInButton } from './GoogleSignInButton'
import { ProfileCompletionModal } from './ProfileCompletionModal'
import LocationAutocomplete from '@/components/location/LocationAutocomplete'

export function RegisterForm() {
  const { register, loginWithGoogle, isLoading } = useAuth()
  const [formData, setFormData] = useState<RegisterData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    userType: 'job-seeker',
    workSector: undefined,
    idNumber: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName) newErrors.firstName = 'First name is required'
    if (!formData.lastName) newErrors.lastName = 'Last name is required'
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.phone) newErrors.phone = 'Phone number is required'
    if (!formData.location) newErrors.location = 'Location is required'

    // Work Sector validation for job-seekers
    if (formData.userType === 'job-seeker' && !formData.workSector) {
      newErrors.workSector = 'Please select your work type'
    }

    // ID Number validation
    if (!formData.idNumber) {
      newErrors.idNumber = 'SA ID Number is required'
    } else if (!/^\d{13}$/.test(formData.idNumber.replace(/\s/g, ''))) {
      newErrors.idNumber = 'ID Number must be exactly 13 digits'
    } else {
      // SA ID number checksum validation (South African algorithm)
      const cleanId = formData.idNumber.replace(/\s/g, '')
      const digits = cleanId.substring(0, 12).split('').map(Number)
      const checkDigit = parseInt(cleanId.charAt(12))

      // Sum digits at odd positions (1st, 3rd, 5th, etc.)
      let sumOdd = 0
      for (let i = 0; i < 12; i += 2) {
        sumOdd += digits[i]
      }

      // Concatenate digits at even positions (2nd, 4th, 6th, etc.)
      let evenDigits = ''
      for (let i = 1; i < 12; i += 2) {
        evenDigits += digits[i]
      }

      // Multiply concatenated even digits by 2
      const evenNumber = parseInt(evenDigits) * 2

      // Sum the digits of the result
      let sumEvenProcessed = 0
      const evenStr = evenNumber.toString()
      for (let i = 0; i < evenStr.length; i++) {
        sumEvenProcessed += parseInt(evenStr.charAt(i))
      }

      // Calculate check digit
      const totalSum = sumOdd + sumEvenProcessed
      const calculatedCheckDigit = (10 - (totalSum % 10)) % 10

      if (calculatedCheckDigit !== checkDigit) {
        newErrors.idNumber = 'Invalid SA ID Number - please check the digits'
      } else {
        // Check if date is valid
        const year = parseInt(cleanId.substring(0, 2))
        const month = parseInt(cleanId.substring(2, 4))
        const day = parseInt(cleanId.substring(4, 6))
        const currentYear = new Date().getFullYear()
        const fullYear = year + (year <= (currentYear % 100) ? 2000 : 1900)
        const dateOfBirth = new Date(fullYear, month - 1, day)

        if (dateOfBirth.getFullYear() !== fullYear ||
            dateOfBirth.getMonth() !== month - 1 ||
            dateOfBirth.getDate() !== day ||
            dateOfBirth > new Date()) {
          newErrors.idNumber = 'Invalid date in ID Number'
        }

        // Check minimum age (16 years)
        const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        if (age < 16) {
          newErrors.idNumber = 'You must be at least 16 years old to register'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) return

    const result = await register(formData)
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
      text: 'Welcome to MzansiGig!'
    })
  }

  return (
    <>
      <ProfileCompletionModal
        isOpen={showProfileCompletion}
        onComplete={handleProfileComplete}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
      <GoogleSignInButton onClick={handleGoogleSignIn} isLoading={isLoading} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or register with email</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          error={errors.firstName}
          required
        />
        <Input
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          error={errors.lastName}
          required
        />
      </div>

      <Input
        label="Email Address"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
      />

      <Input
        label="Password"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required
      />

      <Input
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
      />

      <Input
        label="Phone Number"
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        error={errors.phone}
        required
      />

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
          Location *
        </label>
        <LocationAutocomplete
          id="location"
          value={formData.location}
          onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
          placeholder="Search for city, township, or suburb..."
          error={errors.location}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
          Account Type
        </label>
        <select
          id="userType"
          name="userType"
          value={formData.userType}
          onChange={handleChange}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        >
          <option value="job-seeker">Job Seeker</option>
          <option value="employer">Employer</option>
        </select>
      </div>

      {formData.userType === 'job-seeker' && (
        <div className="space-y-1">
          <label htmlFor="workSector" className="block text-sm font-medium text-gray-700">
            Type of Work *
          </label>
          <select
            id="workSector"
            name="workSector"
            value={formData.workSector || ''}
            onChange={handleChange}
            className={`flex h-10 w-full rounded-md border ${errors.workSector ? 'border-red-500' : 'border-gray-300'} bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
            required
          >
            <option value="">Choose your work type</option>
            <option value="professional">Professional Services (IT, Design, Marketing, Writing)</option>
            <option value="informal">Hands-on Work (Cleaning, Construction, Maintenance, Transport)</option>
          </select>
          {errors.workSector && (
            <p className="text-xs text-red-600 mt-1">{errors.workSector}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            This helps us customize your experience and show you the right profile fields.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <Input
          label="South African ID Number"
          name="idNumber"
          value={formData.idNumber}
          onChange={handleChange}
          error={errors.idNumber}
          placeholder="13-digit SA ID Number (e.g., 8001015009082)"
          required
        />
        <p className="text-xs text-gray-600">
          Required for identity verification and trust building on the platform.
          Your ID number is encrypted and stored securely.
        </p>
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
        Create Account
      </Button>
    </form>
    </>
  )
}