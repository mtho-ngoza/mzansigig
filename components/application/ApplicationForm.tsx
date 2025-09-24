'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { Gig } from '@/types/gig'
import { useToast } from '@/contexts/ToastContext'

interface ApplicationFormProps {
  gig: Gig
  onSuccess?: () => void
  onCancel?: () => void
}

interface ApplicationFormData {
  coverLetter: string
  proposedRate: string
  experience: string
  availability: string
  equipment: string
}

export default function ApplicationForm({ gig, onSuccess, onCancel }: ApplicationFormProps) {
  const { success, error: showError } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<ApplicationFormData>>({})
  const [formData, setFormData] = useState<ApplicationFormData>({
    coverLetter: '',
    proposedRate: gig.budget.toString(),
    experience: '',
    availability: '',
    equipment: ''
  })

  // Determine if this is a physical/informal work category
  const isPhysicalWork = ['Construction', 'Transportation', 'Cleaning', 'Healthcare'].includes(gig.category)

  // Get appropriate field labels and prompts
  const getFieldConfig = () => {
    if (isPhysicalWork) {
      return {
        mainFieldLabel: 'Tell us about yourself',
        mainFieldPlaceholder: `Why are you the right person for this ${gig.category.toLowerCase()} job? For example:\n• How long have you been doing this work?\n• What tools or equipment do you have?\n• When are you available to start?\n• Any special experience with similar jobs?`,
        showExperience: true,
        showAvailability: true,
        showEquipment: gig.category === 'Construction' || gig.category === 'Cleaning'
      }
    } else {
      return {
        mainFieldLabel: 'Cover Letter',
        mainFieldPlaceholder: 'Tell the employer why you&apos;re the right person for this job. Mention your relevant experience, skills, and what you can deliver...',
        showExperience: false,
        showAvailability: false,
        showEquipment: false
      }
    }
  }

  const fieldConfig = getFieldConfig()

  const handleInputChange = (field: keyof ApplicationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ApplicationFormData> = {}

    if (!formData.coverLetter.trim()) {
      newErrors.coverLetter = isPhysicalWork ? 'Please tell us about yourself' : 'Cover letter is required'
    } else if (formData.coverLetter.length < (isPhysicalWork ? 20 : 50)) {
      newErrors.coverLetter = isPhysicalWork ?
        'Please provide at least 20 characters about yourself' :
        'Cover letter must be at least 50 characters'
    }

    if (!formData.proposedRate.trim()) {
      newErrors.proposedRate = 'Proposed rate is required'
    } else {
      const rate = parseFloat(formData.proposedRate)
      if (isNaN(rate) || rate <= 0) {
        newErrors.proposedRate = 'Proposed rate must be a valid positive number'
      } else if (rate < 100) {
        newErrors.proposedRate = 'Proposed rate must be at least R100'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showError('You must be logged in to apply for a gig')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Combine all responses into cover letter for storage
      let combinedMessage = formData.coverLetter.trim()

      if (isPhysicalWork) {
        const additionalInfo = []
        if (formData.experience) {
          const expText = formData.experience.replace('-', ' to ').replace('plus', '+')
          additionalInfo.push(`Experience: ${expText}`)
        }
        if (formData.availability) {
          const availText = formData.availability.replace('-', ' ').replace('within-', 'within ')
          additionalInfo.push(`Availability: ${availText}`)
        }
        if (formData.equipment) {
          const equipText = formData.equipment.replace('-', ' ').replace('fully-equipped', 'fully equipped').replace('partially-equipped', 'partially equipped').replace('no-equipment', 'no equipment needed - can be provided')
          additionalInfo.push(`Tools/Equipment: ${equipText}`)
        }

        if (additionalInfo.length > 0) {
          combinedMessage += '\n\n' + additionalInfo.join('\n')
        }
      }

      const applicationData = {
        gigId: gig.id,
        applicantId: user.id,
        applicantName: `${user.firstName} ${user.lastName}`,
        coverLetter: combinedMessage,
        proposedRate: parseFloat(formData.proposedRate)
      }

      await GigService.createApplication(applicationData)

      if (onSuccess) {
        onSuccess()
      } else {
        success('Application submitted successfully!')
        setFormData({
          coverLetter: '',
          proposedRate: gig.budget.toString(),
          experience: '',
          availability: '',
          equipment: ''
        })
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      showError('Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Apply for: {gig.title}</CardTitle>
          <p className="text-gray-600">
            Submit your application to {gig.employerName} for this opportunity.
          </p>
        </CardHeader>

        <CardContent>
          {/* Gig Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Gig Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Budget:</span>
                <span className="ml-2 font-medium">R{gig.budget.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2">{gig.duration}</span>
              </div>
              <div>
                <span className="text-gray-600">Location:</span>
                <span className="ml-2">{gig.location}</span>
              </div>
              <div>
                <span className="text-gray-600">Category:</span>
                <span className="ml-2">{gig.category}</span>
              </div>
            </div>
            {gig.skillsRequired.length > 0 && (
              <div className="mt-3">
                <span className="text-gray-600 text-sm">Required Skills:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {gig.skillsRequired.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Application Field */}
            <div>
              <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
                {fieldConfig.mainFieldLabel} *
              </label>
              <textarea
                id="coverLetter"
                rows={isPhysicalWork ? 6 : 8}
                placeholder={fieldConfig.mainFieldPlaceholder}
                value={formData.coverLetter}
                onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.coverLetter ? 'border-red-500' : ''
                }`}
              />
              {errors.coverLetter && (
                <p className="mt-1 text-sm text-red-600">{errors.coverLetter}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.coverLetter.length}/{isPhysicalWork ? 500 : 1000} characters (minimum {isPhysicalWork ? 20 : 50})
              </p>
            </div>

            {/* Quick Questions for Physical Work */}
            {isPhysicalWork && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Experience */}
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  <select
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select experience</option>
                    <option value="less-than-1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10-plus">10+ years</option>
                  </select>
                </div>

                {/* Availability */}
                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
                    When can you start?
                  </label>
                  <select
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => handleInputChange('availability', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select availability</option>
                    <option value="immediately">Immediately</option>
                    <option value="within-week">Within a week</option>
                    <option value="within-month">Within a month</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                {/* Equipment (for Construction/Cleaning) */}
                {fieldConfig.showEquipment && (
                  <div className="md:col-span-2">
                    <label htmlFor="equipment" className="block text-sm font-medium text-gray-700 mb-2">
                      Do you have your own tools/equipment?
                    </label>
                    <select
                      id="equipment"
                      value={formData.equipment}
                      onChange={(e) => handleInputChange('equipment', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select option</option>
                      <option value="fully-equipped">Yes, I have all necessary tools</option>
                      <option value="partially-equipped">I have some tools</option>
                      <option value="no-equipment">No, I need tools provided</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Proposed Rate */}
            <div>
              <label htmlFor="proposedRate" className="block text-sm font-medium text-gray-700 mb-2">
                Your Proposed Rate (ZAR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R</span>
                <Input
                  id="proposedRate"
                  type="number"
                  placeholder="5000"
                  value={formData.proposedRate}
                  onChange={(e) => handleInputChange('proposedRate', e.target.value)}
                  className={`pl-8 ${errors.proposedRate ? 'border-red-500' : ''}`}
                  min="100"
                  step="100"
                />
              </div>
              {errors.proposedRate && (
                <p className="mt-1 text-sm text-red-600">{errors.proposedRate}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                The employer&apos;s budget is R{gig.budget.toLocaleString()}. You can propose a different rate.
              </p>
            </div>

            {/* Application Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-800 mb-2">💡 Application Tips</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                {isPhysicalWork ? (
                  <>
                    <li>• Mention how many years you&apos;ve been doing this work</li>
                    <li>• Tell them what tools or equipment you have</li>
                    <li>• Share when you can start the job</li>
                    <li>• Mention any similar jobs you&apos;ve done before</li>
                  </>
                ) : (
                  <>
                    <li>• Be specific about your relevant experience</li>
                    <li>• Mention any portfolio work or examples</li>
                    <li>• Explain your approach to the project</li>
                    <li>• Be professional and enthusiastic</li>
                  </>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
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
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}