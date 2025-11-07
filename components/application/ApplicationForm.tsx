'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { Gig } from '@/types/gig'
import { useToast } from '@/contexts/ToastContext'
import { usePayment } from '@/contexts/PaymentContext'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'

interface ApplicationFormProps {
  gig: Gig
  onSuccess?: () => void
  onCancel?: () => void
}

interface ApplicationFormData {
  message: string
  proposedRate: string
  experience: string
  availability: string
  equipment: string
}

export default function ApplicationForm({ gig, onSuccess, onCancel }: ApplicationFormProps) {
  const { success, error: showError } = useToast()
  const { user } = useAuth()
  const { calculateGigFees } = usePayment()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<ApplicationFormData>>({})
  const [workerEarnings, setWorkerEarnings] = useState<number>(gig.budget)
  const [formData, setFormData] = useState<ApplicationFormData>({
    message: '',
    proposedRate: gig.budget.toString(),
    experience: '',
    availability: '',
    equipment: ''
  })

  // Calculate worker's net earnings on mount
  useEffect(() => {
    const loadWorkerEarnings = async () => {
      try {
        const breakdown = await calculateGigFees(gig.budget)
        setWorkerEarnings(breakdown.netAmountToWorker)
        // Update default proposed rate to worker's net amount
        setFormData(prev => ({
          ...prev,
          proposedRate: breakdown.netAmountToWorker.toString()
        }))
      } catch (error) {
        console.error('Error calculating worker earnings:', error)
      }
    }
    loadWorkerEarnings()
  }, [gig.budget, calculateGigFees])

  // Pre-fill experience, availability, and equipment from user profile
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        experience: user.experienceYears || prev.experience,
        availability: user.availability || prev.availability,
        equipment: user.equipmentOwnership || prev.equipment
      }))
    }
  }, [user])

  // Determine if this is a physical/informal work category
  const isPhysicalWork = ['Construction', 'Transportation', 'Cleaning', 'Healthcare'].includes(gig.category)

  // Get appropriate field labels and prompts
  const getFieldConfig = () => {
    if (isPhysicalWork) {
      return {
        mainFieldLabel: 'Brief Message (Optional)',
        mainFieldPlaceholder: `Add a quick note if you'd like (optional).\nFor example: "I'm available this week and have my own tools."`,
        showExperience: true,
        showAvailability: true,
        showEquipment: gig.category === 'Construction' || gig.category === 'Cleaning'
      }
    } else {
      return {
        mainFieldLabel: 'Message (Optional)',
        mainFieldPlaceholder: 'Add a brief message if you have something specific to mention (optional)...',
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

    // Message is optional, but if provided must be at least 10 characters
    if (formData.message.trim() && formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters if provided'
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
      // Check if user has already applied
      const hasApplied = await GigService.hasUserApplied(gig.id, user.id)
      if (hasApplied) {
        showError('You have already applied to this gig')
        setIsSubmitting(false)
        return
      }
      // Combine all responses into message for storage
      let combinedMessage = formData.message.trim()

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
          if (combinedMessage) {
            combinedMessage += '\n\n' + additionalInfo.join('\n')
          } else {
            combinedMessage = additionalInfo.join('\n')
          }
        }
      }

      const applicationData = {
        gigId: gig.id,
        applicantId: user.id,
        applicantName: `${user.firstName} ${user.lastName}`,
        message: combinedMessage || undefined, // Only include if not empty
        proposedRate: parseFloat(formData.proposedRate)
      }

      await GigService.createApplication(applicationData)

      if (onSuccess) {
        onSuccess()
      } else {
        success('Application submitted successfully!')
        setFormData({
          message: '',
          proposedRate: workerEarnings.toString(),
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
            <h4 className="font-semibold mb-3">Gig Details</h4>

            {/* Payment Breakdown */}
            <div className="mb-4">
              <GigAmountDisplay budget={gig.budget} showBreakdown={true} variant="compact" />
            </div>

            {/* Other Details */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-gray-200">
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2">{gig.duration}</span>
              </div>
              <div>
                <span className="text-gray-600">Location:</span>
                <span className="ml-2">{gig.location}</span>
              </div>
              <div className="col-span-2">
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
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                {fieldConfig.mainFieldLabel}
              </label>
              <textarea
                id="message"
                rows={4}
                placeholder={fieldConfig.mainFieldPlaceholder}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.message ? 'border-red-500' : ''
                }`}
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Your profile shows your skills, experience, and reviews. Add a brief message only if needed.
              </p>
            </div>

            {/* Quick Questions for Physical Work */}
            {isPhysicalWork && (
              <>
                {(user?.experienceYears || user?.availability || user?.equipmentOwnership) && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      💡 <strong>Great news!</strong> We&apos;ve pre-filled some information from your profile to save you time. You can update these if needed for this specific gig.
                    </p>
                  </div>
                )}
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
                  {user?.experienceYears && formData.experience === user.experienceYears && (
                    <p className="mt-1 text-xs text-green-600">✓ Pre-filled from your profile</p>
                  )}
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
                  {user?.availability && formData.availability === user.availability && (
                    <p className="mt-1 text-xs text-green-600">✓ Pre-filled from your profile</p>
                  )}
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
                    {user?.equipmentOwnership && formData.equipment === user.equipmentOwnership && (
                      <p className="mt-1 text-xs text-green-600">✓ Pre-filled from your profile</p>
                    )}
                  </div>
                )}
                </div>
              </>
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
                  min="50"
                  step="0.01"
                />
              </div>
              {errors.proposedRate && (
                <p className="mt-1 text-sm text-red-600">{errors.proposedRate}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Based on the client&apos;s budget of R{gig.budget.toLocaleString()}, you&apos;ll earn R{workerEarnings.toLocaleString()} after platform fees. You can propose a different rate.
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