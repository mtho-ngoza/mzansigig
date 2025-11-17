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
    acceptTerms: false,
    acceptPrivacy: false,
    acceptPopia: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Name validation with sanitization
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()

    if (!firstName) {
      newErrors.firstName = 'First name is required'
    } else if (!/^[a-zA-Z\s\-']+$/.test(firstName)) {
      newErrors.firstName = 'Name can only contain letters, spaces, hyphens, and apostrophes'
    } else if (firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    if (!lastName) {
      newErrors.lastName = 'Last name is required'
    } else if (!/^[a-zA-Z\s\-']+$/.test(lastName)) {
      newErrors.lastName = 'Name can only contain letters, spaces, hyphens, and apostrophes'
    } else if (lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    // Strong password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter'
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter'
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number'
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character'
    } else if (/\s/.test(formData.password)) {
      newErrors.password = 'Password cannot contain spaces'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Phone number validation (South African format)
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required'
    } else {
      // Remove spaces and special characters for validation
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, '')

      // Check if it's all digits (optionally with + at start)
      if (!/^[\+]?\d+$/.test(cleanPhone)) {
        newErrors.phone = 'Phone number must contain only digits'
      } else {
        // Check SA phone number format
        // Valid formats: +27XXXXXXXXX (12 digits) or 0XXXXXXXXX (10 digits)
        const isInternational = cleanPhone.startsWith('+27') && cleanPhone.length === 12
        const isLocal = cleanPhone.startsWith('0') && cleanPhone.length === 10

        if (!isInternational && !isLocal) {
          newErrors.phone = 'Please enter a valid SA number (e.g., +27821234567 or 0821234567)'
        }

        // Additional validation: check if it's a mobile number (starts with +276/7/8 or 06/7/8)
        if (isInternational) {
          const mobilePrefix = cleanPhone.substring(3, 4) // Get digit after +27
          if (!['6', '7', '8'].includes(mobilePrefix)) {
            newErrors.phone = 'Please enter a valid SA mobile number (06x, 07x, or 08x)'
          }
        } else if (isLocal) {
          const mobilePrefix = cleanPhone.substring(1, 2) // Get digit after 0
          if (!['6', '7', '8'].includes(mobilePrefix)) {
            newErrors.phone = 'Please enter a valid SA mobile number (06x, 07x, or 08x)'
          }
        }
      }
    }

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

    // Legal consent validation (POPIA compliance)
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the Terms of Service to continue'
    }
    if (!formData.acceptPrivacy) {
      newErrors.acceptPrivacy = 'You must accept the Privacy Policy to continue'
    }
    if (!formData.acceptPopia) {
      newErrors.acceptPopia = 'You must consent to POPIA data processing to continue'
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
      text: 'Howzit! Welcome to MzansiGig - Work Starts Here'
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

      <div>
        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          required
        />
        <p className="text-xs text-gray-600 mt-1">
          Must be 8+ characters with uppercase, lowercase, number, and special character
        </p>
      </div>

      <Input
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
      />

      <div>
        <Input
          label="Phone Number"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="+27821234567 or 0821234567"
          required
        />
        <p className="text-xs text-gray-600 mt-1">
          SA mobile number (must start with 06, 07, or 08)
        </p>
      </div>

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

      {/* Legal Consents (POPIA Compliance) */}
      <div className="space-y-3 pt-2 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Legal Agreements</h3>

        {/* Terms of Service */}
        <div className="space-y-1">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${
                errors.acceptTerms ? 'border-red-500' : ''
              }`}
            />
            <span className="text-sm text-gray-700">
              I accept the{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Terms of Service
              </a>
              {' '}*
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-xs text-red-600 ml-7">{errors.acceptTerms}</p>
          )}
        </div>

        {/* Privacy Policy */}
        <div className="space-y-1">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="acceptPrivacy"
              checked={formData.acceptPrivacy}
              onChange={handleChange}
              className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${
                errors.acceptPrivacy ? 'border-red-500' : ''
              }`}
            />
            <span className="text-sm text-gray-700">
              I accept the{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Privacy Policy
              </a>
              {' '}*
            </span>
          </label>
          {errors.acceptPrivacy && (
            <p className="text-xs text-red-600 ml-7">{errors.acceptPrivacy}</p>
          )}
        </div>

        {/* POPIA Consent */}
        <div className="space-y-1">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              name="acceptPopia"
              checked={formData.acceptPopia}
              onChange={handleChange}
              className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${
                errors.acceptPopia ? 'border-red-500' : ''
              }`}
            />
            <span className="text-sm text-gray-700">
              I consent to the processing of my personal information in accordance with the{' '}
              <a
                href="/popia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Protection of Personal Information Act (POPIA)
              </a>
              {' '}*
            </span>
          </label>
          {errors.acceptPopia && (
            <p className="text-xs text-red-600 ml-7">{errors.acceptPopia}</p>
          )}
        </div>

        <p className="text-xs text-gray-500 italic">
          * Required for account creation
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