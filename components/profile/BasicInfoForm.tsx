'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileService } from '@/lib/database/profileService'
import { useToast } from '@/contexts/ToastContext'
import { SA_LOCATIONS } from '@/types/location'

interface BasicInfoFormProps {
  onBack?: () => void
}

export default function BasicInfoForm({ onBack }: BasicInfoFormProps) {
  const { success, error: showError } = useToast()
  const { user, refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWorkSectorWarning, setShowWorkSectorWarning] = useState(false)
  const [pendingWorkSector, setPendingWorkSector] = useState<string>('')
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: user?.bio || '',
    workSector: user?.workSector || '',
    socialLinks: {
      linkedin: user?.socialLinks?.linkedin || '',
      website: user?.socialLinks?.website || '',
      github: user?.socialLinks?.github || ''
    }
  })

  if (!user) return null

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('socialLinks.')) {
      const socialField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialField]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleWorkSectorChange = (newValue: string) => {
    // If workSector is being changed and user has existing data, show warning
    if (user.workSector && user.workSector !== newValue) {
      setPendingWorkSector(newValue)
      setShowWorkSectorWarning(true)
    } else {
      // First time setting or no change
      setFormData(prev => ({ ...prev, workSector: newValue }))
    }
  }

  const confirmWorkSectorChange = () => {
    setFormData(prev => ({ ...prev, workSector: pendingWorkSector }))
    setShowWorkSectorWarning(false)
    setPendingWorkSector('')
  }

  const cancelWorkSectorChange = () => {
    setShowWorkSectorWarning(false)
    setPendingWorkSector('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Filter out empty social links
      const socialLinks = Object.fromEntries(
        Object.entries(formData.socialLinks).filter(([, value]) => value.trim() !== '')
      )

      const updateData: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        location: formData.location,
        bio: formData.bio.trim()
      }

      // Add workSector only for job-seekers
      if (user.userType === 'job-seeker' && formData.workSector) {
        updateData.workSector = formData.workSector

        // If workSector changed, clear old profile fields to prevent orphaned data
        if (user.workSector && user.workSector !== formData.workSector) {
          if (user.workSector === 'professional') {
            // Switching FROM professional TO informal - clear professional fields
            updateData.experience = ''
            updateData.education = ''
          } else if (user.workSector === 'informal') {
            // Switching FROM informal TO professional - clear informal fields
            updateData.experienceYears = ''
            updateData.equipmentOwnership = ''
          }
        }
      }

      // Only add socialLinks if there are any
      if (Object.keys(socialLinks).length > 0) {
        updateData.socialLinks = socialLinks
      }

      await ProfileService.updateProfile(user.id, updateData)
      await ProfileService.updateProfileCompleteness(user.id)
      await refreshUser()

      success('Profile updated successfully!')
      if (onBack) onBack()
    } catch (err) {
      console.error('Error updating profile:', err)
      showError('Failed to update profile. Please try again.')
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
              Basic Information
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Update your personal information and contact details.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              {/* Phone and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+27 82 123 4567"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <select
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select location</option>
                    {SA_LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Work Sector - Job Seekers Only */}
              {user.userType === 'job-seeker' && (
                <div>
                  <label htmlFor="workSector" className="block text-sm font-medium text-gray-700 mb-2">
                    Type of Work *
                  </label>
                  <select
                    id="workSector"
                    value={formData.workSector}
                    onChange={(e) => handleWorkSectorChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select your work type</option>
                    <option value="professional">Professional Services (IT, Design, Marketing, Writing)</option>
                    <option value="informal">Hands-on Work (Cleaning, Construction, Maintenance, Transport)</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    This determines which profile fields are shown to you
                  </p>
                </div>
              )}

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  About Me
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder={`Tell potential ${user.userType === 'job-seeker' ? 'employers' : 'freelancers'} about yourself, your experience, and what makes you unique...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Social Links (Optional)</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-2">
                      LinkedIn Profile
                    </label>
                    <Input
                      id="linkedin"
                      type="url"
                      value={formData.socialLinks.linkedin}
                      onChange={(e) => handleInputChange('socialLinks.linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                      Website/Portfolio
                    </label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.socialLinks.website}
                      onChange={(e) => handleInputChange('socialLinks.website', e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  {user.userType === 'job-seeker' && (
                    <div>
                      <label htmlFor="github" className="block text-sm font-medium text-gray-700 mb-2">
                        GitHub Profile
                      </label>
                      <Input
                        id="github"
                        type="url"
                        value={formData.socialLinks.github}
                        onChange={(e) => handleInputChange('socialLinks.github', e.target.value)}
                        placeholder="https://github.com/yourusername"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
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
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Work Sector Change Confirmation Modal */}
      {showWorkSectorWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ⚠️ Confirm Work Type Change
            </h3>
            <p className="text-gray-600 mb-4">
              Changing your work type from <strong>{user.workSector === 'professional' ? 'Professional' : 'Hands-on Work'}</strong> to <strong>{pendingWorkSector === 'professional' ? 'Professional' : 'Hands-on Work'}</strong> will reset your experience profile fields.
            </p>
            <p className="text-gray-600 mb-4">
              The following data will be cleared:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
              {user.workSector === 'professional' ? (
                <>
                  <li>Experience Level</li>
                  <li>Education</li>
                </>
              ) : (
                <>
                  <li>Years of Experience</li>
                  <li>Tools & Equipment</li>
                </>
              )}
            </ul>
            <p className="text-sm text-gray-500 mb-6">
              You can re-enter your information after saving this change.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelWorkSectorChange}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmWorkSectorChange}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirm Change
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}