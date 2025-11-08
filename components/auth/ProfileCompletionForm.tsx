'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User } from '@/types/auth'

interface ProfileCompletionData {
  phone: string
  location: string
  userType: 'job-seeker' | 'employer'
  workSector?: 'professional' | 'informal'
  idNumber: string
}

interface ProfileCompletionFormProps {
  onComplete?: () => void
  onCancel?: () => void
}

export function ProfileCompletionForm({ onComplete, onCancel }: ProfileCompletionFormProps) {
  const { user, updateUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ProfileCompletionData>({
    phone: user?.phone || '',
    location: user?.location || '',
    userType: (user?.userType as 'job-seeker' | 'employer') || 'job-seeker',
    workSector: user?.workSector,
    idNumber: user?.idNumber || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (!formData.location) {
      newErrors.location = 'Location is required'
    }

    if (formData.userType === 'job-seeker' && !formData.workSector) {
      newErrors.workSector = 'Please select your work type'
    }

    // SA ID validation
    if (!formData.idNumber) {
      newErrors.idNumber = 'SA ID Number is required'
    } else if (!/^\d{13}$/.test(formData.idNumber.replace(/\s/g, ''))) {
      newErrors.idNumber = 'ID Number must be exactly 13 digits'
    } else {
      // SA ID number checksum validation
      const cleanId = formData.idNumber.replace(/\s/g, '')
      const digits = cleanId.substring(0, 12).split('').map(Number)
      const checkDigit = parseInt(cleanId.charAt(12))

      let sumOdd = 0
      for (let i = 0; i < 12; i += 2) {
        sumOdd += digits[i]
      }

      let evenDigits = ''
      for (let i = 1; i < 12; i += 2) {
        evenDigits += digits[i]
      }

      const evenNumber = parseInt(evenDigits) * 2
      let sumEvenProcessed = 0
      const evenStr = evenNumber.toString()
      for (let i = 0; i < evenStr.length; i++) {
        sumEvenProcessed += parseInt(evenStr.charAt(i))
      }

      const totalSum = sumOdd + sumEvenProcessed
      const calculatedCheckDigit = (10 - (totalSum % 10)) % 10

      if (calculatedCheckDigit !== checkDigit) {
        newErrors.idNumber = 'Invalid SA ID Number - please check the digits'
      } else {
        // Validate date in ID
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

    setIsSubmitting(true)

    try {
      const updates: Partial<User> = {
        phone: formData.phone,
        location: formData.location,
        userType: formData.userType,
        idNumber: formData.idNumber,
      }

      if (formData.workSector) {
        updates.workSector = formData.workSector
      }

      await updateUser(updates)

      setMessage({
        type: 'success',
        text: 'Profile completed successfully!'
      })

      setTimeout(() => {
        onComplete?.()
      }, 1000)
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        <p className="mt-2 text-sm text-gray-600">
          We need a few more details to set up your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Phone Number"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="+27123456789"
          required
        />

        <Input
          label="Location"
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          error={errors.location}
          placeholder="e.g., Johannesburg, South Africa"
          required
        />

        <div className="space-y-1">
          <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
            Account Type <span className="text-red-500">*</span>
          </label>
          <select
            id="userType"
            name="userType"
            value={formData.userType}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            <option value="job-seeker">Job Seeker</option>
            <option value="employer">Employer</option>
          </select>
          {errors.userType && (
            <p className="text-sm text-red-600">{errors.userType}</p>
          )}
          <p className="text-xs text-gray-500">
            This helps us customize your experience
          </p>
        </div>

        {formData.userType === 'job-seeker' && (
          <div className="space-y-1">
            <label htmlFor="workSector" className="block text-sm font-medium text-gray-700">
              Type of Work <span className="text-red-500">*</span>
            </label>
            <select
              id="workSector"
              name="workSector"
              value={formData.workSector || ''}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Select work type</option>
              <option value="professional">Professional (Office-based)</option>
              <option value="informal">Informal (Hands-on work)</option>
            </select>
            {errors.workSector && (
              <p className="text-sm text-red-600">{errors.workSector}</p>
            )}
          </div>
        )}

        <Input
          label="South African ID Number"
          type="text"
          name="idNumber"
          value={formData.idNumber}
          onChange={handleChange}
          error={errors.idNumber}
          placeholder="13-digit ID number"
          maxLength={13}
          required
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

        <div className="flex gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Complete Profile
          </Button>
        </div>
      </form>
    </div>
  )
}
