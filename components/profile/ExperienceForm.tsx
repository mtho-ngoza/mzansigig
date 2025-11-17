'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileService } from '@/lib/database/profileService'
import { useToast } from '@/contexts/ToastContext'
import { isInformalWorker } from '@/lib/utils/userProfile'

interface ExperienceFormProps {
  onBack?: () => void
}

const EXPERIENCE_LEVELS = [
  'Entry Level (0-1 years)',
  'Junior (1-3 years)',
  'Mid-level (3-5 years)',
  'Senior (5-10 years)',
  'Expert (10+ years)'
]

const AVAILABILITY_OPTIONS = [
  'Full-time',
  'Part-time',
  'Weekends only',
  'Evenings only',
  'Flexible',
  'Project-based',
  'On-demand'
]

const EDUCATION_LEVELS = [
  'High School',
  'Certificate/Diploma',
  'Bachelor&apos;s Degree',
  'Master&apos;s Degree',
  'PhD/Doctorate',
  'Other'
]

const EXPERIENCE_YEARS_OPTIONS = [
  { value: 'less-than-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10-plus', label: '10+ years' }
]

const EQUIPMENT_OPTIONS = [
  { value: 'fully-equipped', label: 'Yes, I have all necessary tools' },
  { value: 'partially-equipped', label: 'I have some tools' },
  { value: 'no-equipment', label: 'No, I need tools provided' }
]

export default function ExperienceForm({ onBack }: ExperienceFormProps) {
  const { success, error: showError } = useToast()
  const { user, refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    experience: user?.experience || '',
    hourlyRate: user?.hourlyRate?.toString() || '',
    availability: user?.availability || '',
    education: user?.education || '',
    experienceYears: user?.experienceYears || '',
    equipmentOwnership: user?.equipmentOwnership || ''
  })

  if (!user) return null

  const isInformal = isInformalWorker(user)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updateData: Record<string, unknown> = {}

      // For professional workers, save experience field
      // For informal workers, save experienceYears field (not both)
      if (!isInformal && formData.experience) {
        updateData.experience = formData.experience
      }

      if (isInformal && formData.experienceYears) {
        updateData.experienceYears = formData.experienceYears
      }

      if (isInformal && formData.equipmentOwnership) {
        updateData.equipmentOwnership = formData.equipmentOwnership
      }

      if (formData.availability) {
        updateData.availability = formData.availability
      }

      if (formData.education) {
        updateData.education = formData.education
      }

      // Only include hourlyRate if it's provided and valid
      if (formData.hourlyRate && formData.hourlyRate.trim()) {
        const rate = parseFloat(formData.hourlyRate)
        if (!isNaN(rate) && rate > 0) {
          updateData.hourlyRate = rate
        }
      }

      await ProfileService.updateProfile(user.id, updateData)
      await ProfileService.updateProfileCompleteness(user.id)
      await refreshUser()

      success('Lekker! Experience updated')
      if (onBack) onBack()
    } catch (err) {
      console.error('Error updating experience:', err)
      showError('Failed to update experience. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back to Profile
            </Button>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Experience & Rates
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Add your experience level, rates, and availability to help clients understand your expertise.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Experience Level - Professional Workers Only */}
          {!isInformal && (
            <Card>
              <CardHeader>
                <CardTitle>Experience Level</CardTitle>
                <p className="text-gray-600">How much experience do you have in your field?</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {EXPERIENCE_LEVELS.map(level => (
                    <label
                      key={level}
                      className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="experience"
                        value={level}
                        checked={formData.experience === level}
                        onChange={(e) => handleInputChange('experience', e.target.value)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-900">{level}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hourly Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Rate (Optional)</CardTitle>
              <p className="text-gray-600">
                Set your hourly rate to help clients understand your pricing.
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-2">
                  Rate per Hour (ZAR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">R</span>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                    placeholder="500"
                    className="pl-8"
                    min="50"
                    step="50"
                  />
                </div>
                <div className="mt-3 text-sm text-gray-500 space-y-1">
                  <p>💡 <strong>Rate Guidelines:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Entry Level: R50-150/hour</li>
                    <li>Junior: R150-300/hour</li>
                    <li>Mid-level: R300-500/hour</li>
                    <li>Senior: R500-800/hour</li>
                    <li>Expert: R800+/hour</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <p className="text-gray-600">When are you available to work?</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABILITY_OPTIONS.map(option => (
                  <label
                    key={option}
                    className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="availability"
                      value={option}
                      checked={formData.availability === option}
                      onChange={(e) => handleInputChange('availability', e.target.value)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900">{option}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle>Education Level</CardTitle>
              <p className="text-gray-600">What&apos;s your highest level of education?</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {EDUCATION_LEVELS.map(level => (
                  <label
                    key={level}
                    className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="education"
                      value={level}
                      checked={formData.education === level}
                      onChange={(e) => handleInputChange('education', e.target.value)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900">{level}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Informal Worker Specific Fields */}
          {isInformal && (
            <>
              {/* Years of Experience */}
              <Card>
                <CardHeader>
                  <CardTitle>Years of Experience</CardTitle>
                  <p className="text-gray-600">How long have you been doing this type of work?</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {EXPERIENCE_YEARS_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="experienceYears"
                          value={option.value}
                          checked={formData.experienceYears === option.value}
                          onChange={(e) => handleInputChange('experienceYears', e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Equipment/Tools */}
              <Card>
                <CardHeader>
                  <CardTitle>Tools & Equipment</CardTitle>
                  <p className="text-gray-600">Do you have your own tools or equipment for work?</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {EQUIPMENT_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="equipmentOwnership"
                          value={option.value}
                          checked={formData.equipmentOwnership === option.value}
                          onChange={(e) => handleInputChange('equipmentOwnership', e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-600 bg-secondary-50 p-3 rounded-lg border border-secondary-200">
                    <p className="font-medium text-secondary-900 mb-1">💡 Why this helps:</p>
                    <p className="text-secondary-700">Letting clients know about your tools helps them plan better and shows you&apos;re ready to work.</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Professional Tips */}
          <Card>
            <CardContent className="p-6">
              <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
                <h4 className="font-semibold text-secondary-800 mb-2">💡 Profile Tips</h4>
                <ul className="text-sm text-secondary-700 space-y-2">
                  <li>• Be honest about your experience level - clients appreciate transparency</li>
                  <li>• Research market rates in your area before setting your hourly rate</li>
                  <li>• Consider starting with competitive rates to build your reputation</li>
                  <li>• You can always update your rates as you gain more experience</li>
                  <li>• Clear availability helps clients know when they can work with you</li>
                  {isInformal && (
                    <>
                      <li>• Filling out your experience years helps you apply faster to jobs</li>
                      <li>• Showing you have tools makes you more attractive to employers</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Experience'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}